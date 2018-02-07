const Promise = require('bluebird');
const common = require('./common.js');
const {validateUser, validateUserForRead, validateUserForWrite, validateGlobalAdmin} = require('./rights.js');
const authorize = require('./authorizer.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const log = require('./log.js')('core:api');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateUserForRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;

const countlyApi = {
    data: {
        usage: require('../parts/data/usage.js'),
        fetch: require('../parts/data/fetch.js'),
        events: require('../parts/data/events.js'),
        exports: require('../parts/data/exports.js')
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
        apps: require('../parts/mgmt/apps.js')
    }
};


/**
 * Process Bulk Request
 * @param i
 * @param requests
 * @param params
 * @param req
 */
const processBulkRequest = (i, requests, params, req) => {
    const appKey = params.qstring.app_key;
    if (i === requests.length) {
        common.unblockResponses(params);
        if (plugins.getConfig("api").safe && !params.res.finished) {
            return common.returnMessage(params, 200, 'Success');
        }
        return;
    }

    if (!requests[i].app_key && !appKey) {
        return processBulkRequest(i + 1);
    }

    params.req.body = JSON.stringify(requests[i]);

    const tmpParams = {
        'app_id': '',
        'app_cc': '',
        'ip_address': requests[i].ip_address || common.getIpAddress(req),
        'user': {
            'country': requests[i].country_code || 'Unknown',
            'city': requests[i].city || 'Unknown'
        },
        'qstring': requests[i],
        'href': "/i",
        'res': params.res,
        'req': params.req,
        'promises': [],
        'bulk': true
    };

    tmpParams["qstring"]['app_key'] = requests[i].app_key || appKey;

    if (!tmpParams.qstring.device_id) {
        return processBulkRequest(i + 1);
    } else {
        //make sure device_id is string
        tmpParams.qstring.device_id += "";
        tmpParams.app_user_id = common.crypto.createHash('sha1')
        .update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "")
        .digest('hex');
    }

    return validateAppForWriteAPI(tmpParams, () => {
        function resolver() {
            plugins.dispatch("/sdk/end", {params: tmpParams}, () => {
                processBulkRequest(i + 1);
            });
        }

        Promise.all(tmpParams.promises)
        .then(resolver)
        .catch((error) => {
            console.log(error);
            resolver();
        });
    });
};

/**
 * Validate App for Write API
 * Checks app_key from the http request against "apps" collection.
 * This is the first step of every write request to API.
 * @param params
 * @param done
 * @returns {boolean}
 */
const validateAppForWriteAPI = (params, done) => {
    //ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 400, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        return done ? done() : false;
    }
    common.db.collection('apps').findOne({'key': params.qstring.app_key}, (err, app) => {
        if (!app) {
            if (plugins.getConfig("api").safe) {
                common.returnMessage(params, 400, 'App does not exist');
            }

            return done ? done() : false;
        }

        params.app_id = app['_id'];
        params.app_cc = app['country'];
        params.app_name = app['name'];
        params.appTimezone = app['timezone'];
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
        if (params.app.checksum_salt && params.app.checksum_salt.length) {
            const payloads = [];
            payloads.push(params.href.substr(3));
            if (params.req.method.toLowerCase() === 'post') {
                payloads.push(params.req.body);
            }
            if (typeof params.qstring.checksum !== "undefined") {
                for (let i = 0; i < payloads.length; i++) {
                    payloads[i] = payloads[i].replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                    payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
                }
                if (payloads.indexOf((params.qstring.checksum + "").toUpperCase()) === -1) {
                    console.log("Checksum did not match", params.href, params.req.body, payloads);
                    if (plugins.getConfig("api").safe) {
                        common.returnMessage(params, 400, 'Request does not match checksum');
                    }
                    return done ? done() : false;
                }
            }
            else if (typeof params.qstring.checksum256 !== "undefined") {
                for (let i = 0; i < payloads.length; i++) {
                    payloads[i] = payloads[i].replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                    payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
                }
                if (payloads.indexOf((params.qstring.checksum256 + "").toUpperCase()) === -1) {
                    console.log("Checksum did not match", params.href, params.req.body, payloads);
                    if (plugins.getConfig("api").safe) {
                        common.returnMessage(params, 400, 'Request does not match checksum');
                    }
                    return done ? done() : false;
                }
            }
            else {
                console.log("Request does not have checksum", params.href, params.req.body);
                if (plugins.getConfig("api").safe) {
                    common.returnMessage(params, 400, 'Request does not have checksum');
                }
                return done ? done() : false;
            }
        }

        if (typeof params.qstring.tz !== 'undefined' && !isNaN(parseInt(params.qstring.tz))) {
            params.user.tz = parseInt(params.qstring.tz);
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err, user) => {
            params.app_user = user || {};

            if (plugins.getConfig("api").prevent_duplicate_requests) {
                //check unique millisecond timestamp, if it is the same as the last request had,
                //then we are having duplicate request, due to sudden connection termination
                let payload = params.href.substr(3) || "";
                if (params.req.method.toLowerCase() === 'post') {
                    payload += params.req.body;
                }
                params.request_hash = common.crypto.createHash('sha512').update(payload).digest('hex') + (params.qstring.timestamp || params.time.mstimestamp);
                if (params.app_user.last_req === params.request_hash) {
                    params.cancelRequest = "Duplicate request";
                }
            }

            if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
                try {
                    params.qstring.metrics = JSON.parse(params.qstring.metrics);
                } catch (SyntaxError) {
                    console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                }
            }

            plugins.dispatch("/sdk", {params: params, app: app}, () => {

                if (params.qstring.metrics) {
                    common.processCarrier(params.qstring.metrics);

                    if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
                        if (common.os_mapping[params.qstring.metrics["_os"].toLowerCase()])
                            params.qstring.metrics["_os_version"] = common.os_mapping[params.qstring.metrics["_os"].toLowerCase()] + params.qstring.metrics["_os_version"];
                        else
                            params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
                    }
                }

                if (!params.cancelRequest) {
                    //check if device id was changed
                    if (params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
                        const old_id = common.crypto.createHash('sha1')
                        .update(params.qstring.app_key + params.qstring.old_device_id + "")
                        .digest('hex');

                        //checking if there is an old user
                        common.db.collection('app_users' + params.app_id).findOne({'_id': old_id}, (err, oldAppUser) => {
                            if (!err && oldAppUser) {
                                //checking if there is a new user
                                const newAppUser = params.app_user;
                                if (Object.keys(newAppUser).length) {
                                    if (newAppUser.ls && newAppUser.ls > oldAppUser.ls) {
                                        mergeUserData(newAppUser, oldAppUser);
                                    }
                                    else {
                                        //switching user identidy
                                        let temp = oldAppUser._id;
                                        oldAppUser._id = newAppUser._id;
                                        newAppUser._id = temp;

                                        temp = oldAppUser.did;
                                        oldAppUser.did = newAppUser.did;
                                        newAppUser.did = temp;

                                        temp = oldAppUser.uid;
                                        oldAppUser.uid = newAppUser.uid;
                                        newAppUser.uid = temp;

                                        mergeUserData(oldAppUser, newAppUser);
                                    }
                                }
                                else {
                                    //simply copy user document with old uid
                                    //no harm is done
                                    oldAppUser.did = params.qstring.device_id + "";
                                    oldAppUser._id = params.app_user_id;
                                    common.db.collection('app_users' + params.app_id).insert(oldAppUser, () => {
                                        common.db.collection('app_users' + params.app_id).remove({_id: old_id}, () => {
                                            restartRequest(params);
                                        });
                                    });
                                }
                            }
                            else {
                                //process request
                                restartRequest(params);
                            }
                        });

                        //do not proceed with request
                        return false;
                    }
                    else if (!params.app_user.uid) {
                        common.db.collection('apps').findAndModify(
                            {_id: common.db.ObjectID(params.app_id)},
                            {},
                            {$inc: {seq: 1}},
                            {
                                new: true,
                                upsert: true
                            },
                            (err, result) => {
                                result = result && result.ok ? result.value : null;
                                if (result && result.seq) {
                                    params.app_user.uid = common.parseSequence(result.seq);
                                    common.updateAppUser(params, {$set: {uid: params.app_user.uid}});
                                    processRequestData(params, app);
                                }
                            });
                    }
                    else {
                        processRequestData(params, app);
                    }
                } else {
                    if (plugins.getConfig("api").safe && !params.res.finished) {
                        common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                    }
                    common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                    return done ? done() : false;
                }
            });
        });
    });
};

/**
 * Merge User Data
 * @param newAppUser
 * @param oldAppUser
 */
const mergeUserData = (newAppUser, oldAppUser) => {
    //allow plugins to deal with user merging properties
    plugins.dispatch("/i/user_merge", {
        params: params,
        newAppUser: newAppUser,
        oldAppUser: oldAppUser
    });
    //merge user data
    for (const i in oldAppUser) {
        // sum up session count and total session duration
        if (i === "sc" || i === "tsd") {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = 0;
            newAppUser[i] += oldAppUser[i];
        }
        //check if old user has been seen before new one
        else if (i === "fs") {
            if (!newAppUser.fs || oldAppUser.fs < newAppUser.fs)
                newAppUser.fs = oldAppUser.fs;
        }
        //check if old user has been seen before new one
        else if (i === "fac") {
            if (!newAppUser.fac || oldAppUser.fac < newAppUser.fac)
                newAppUser.fac = oldAppUser.fac;
        }
        //check if old user has been the last to be seen
        else if (i === "ls") {
            if (!newAppUser.ls || oldAppUser.ls > newAppUser.ls) {
                newAppUser.ls = oldAppUser.ls;
                //then also overwrite last session data
                if (oldAppUser.lsid)
                    newAppUser.lsid = oldAppUser.lsid;
                if (oldAppUser.sd)
                    newAppUser.sd = oldAppUser.sd;
            }
        }
        //check if old user has been the last to be seen
        else if (i === "lac") {
            if (!newAppUser.lac || oldAppUser.lac > newAppUser.lac) {
                newAppUser.lac = oldAppUser.lac;
            }
        }
        else if (i === "lest") {
            if (!newAppUser.lest || oldAppUser.lest > newAppUser.lest) {
                newAppUser.lest = oldAppUser.lest;
            }
        }
        else if (i === "lbst") {
            if (!newAppUser.lbst || oldAppUser.lbst > newAppUser.lbst) {
                newAppUser.lbst = oldAppUser.lbst;
            }
        }
        //merge custom user data
        else if (typeof oldAppUser[i] === "object" && oldAppUser[i]) {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = {};
            for (const j in oldAppUser[i]) {
                //set properties that new user does not have
                if (typeof newAppUser[i][j] === "undefined")
                    newAppUser[i][j] = oldAppUser[i][j];
            }
        }
        //set other properties that new user does not have
        else if (i !== "_id" && i !== "did" && typeof newAppUser[i] === "undefined") {
            newAppUser[i] = oldAppUser[i];
        }
    }
    //update new user
    common.updateAppUser(params, {'$set': newAppUser}, () => {
        //delete old user
        common.db.collection('app_users' + params.app_id).remove({_id: old_id}, () => {
            //let plugins know they need to merge user data
            common.db.collection("metric_changes" + params.app_id).update(
                {uid: oldAppUser.uid},
                {'$set': {uid: newAppUser.uid}},
                {multi: true},
                (err, res) => {
                });
            plugins.dispatch("/i/device_id", {
                params: params,
                app: app,
                oldUser: oldAppUser,
                newUser: newAppUser
            });
            restartRequest(params);
        });
    });
};

/**
 * Restart Request
 * @param params
 */
const restartRequest = (params) => {
    //remove old device ID and retry request
    params.qstring.old_device_id = null;
    //retry request
    validateAppForWriteAPI(params, done);
};

