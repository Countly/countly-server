/**
* Module for processing data passed to Countly
* @module api/utils/requestProcessor
*/

/**
 * @typedef {import('../../types/requestProcessor').Params} Params
 * @typedef {import('../../types/common').TimeObject} TimeObject
 * @typedef {import('../../types/taskmanager').TaskManagerStatic} TaskManagerStatic
 * @typedef {import('../../types/authorizer').Authorizer} Authorizer
 * @typedef {import('../parts/data/geoData').GeoData} GeoData
 */

const Promise = require('bluebird');
const url = require('url');
const common = require('./common.js');
const countlyCommon = require('../lib/countly.common.js');
const { validateAppAdmin, validateUser, validateRead, validateUserForRead, validateUserForWrite, validateGlobalAdmin, dbUserHasAccessToCollection, validateUpdate, validateDelete, validateCreate, getBaseAppFilter } = require('./rights.js');
/** @type {Authorizer} */
const authorize = require('./authorizer.js');
/** @type {TaskManagerStatic} */
const taskmanager = require('./taskmanager.js');
const calculatedDataManager = require('./calculatedDataManager.js');
const plugins = require('../../plugins/pluginManager.ts');
const versionInfo = require('../../frontend/express/version.info');
const packageJson = require('./../../package.json');
const log = require('./log.js')('core:api');
const fs = require('fs');
var countlyFs = require('./countlyFs.js');
var path = require('path');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;
const request = require('countly-request')(plugins.getConfig("security"));
const render = require('../../api/utils/render.js');

var loaded_configs_time = 0;

// Kafka events meta cache (30s TTL) with in-flight dedup
var _kafkaMetaCache = null;
var _kafkaMetaCacheTs = 0;
var _kafkaMetaCachePromise = null;
const KAFKA_META_CACHE_TTL = 30000;

const countlyApi = {
    data: {
        usage: require('../parts/data/usage.js'),
        fetch: require('../parts/data/fetch.js'),
        events: require('../parts/data/events.js'),
        exports: require('../parts/data/exports.js'),
        geoData: require('../parts/data/geoData.ts').default
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
        apps: require('../parts/mgmt/apps.js'),
        appUsers: require('../parts/mgmt/app_users.js'),
        eventGroups: require('../parts/mgmt/event_groups.js'),
        cms: require('../parts/mgmt/cms.js'),
        datePresets: require('../parts/mgmt/date_presets.js'),
    }
};

const reloadConfig = function() {
    return new Promise(function(resolve) {
        var my_time = Date.now();
        var reload_configs_after = common.config.reloadConfigAfter || 10000;
        //once in minute
        if (loaded_configs_time === 0 || (my_time - loaded_configs_time) >= reload_configs_after) {
            plugins.loadConfigs(common.db, () => {
                loaded_configs_time = my_time;
                resolve();
            }, true);
        }
        else {
            resolve();
        }
    });
};

/**
 * Default request processing handler, which requires request context to operate. Check tcp_example.js
 * @static
 * @param {Params} params - for request context. Minimum needed properties listed
 * @param {object} params.req - Request object, should not be empty and should contain listed params
 * @param {string} params.req.url - Endpoint URL that you are calling. May contain query string.
 * @param {object} params.req.body - Parsed JSON object with data (same name params will overwrite query string if anything provided there)
 * @param {APICallback} params.APICallback - API output handler. Which should handle API response
 * @returns {void} void
 * @example
 * //creating request context
 * var params = {
 *     //providing data in request object
 *     'req':{"url":"/i", "body":{"device_id":"test","app_key":"APP_KEY","begin_session":1,"metrics":{}}},
 *     //adding custom processing for API responses
 *     'APICallback': function(err, data, headers, returnCode, params){
 *          //handling api response, like sending to client or verifying
 *          if(err){
 *              //there was problem processing request
 *              console.log(data, returnCode);
 *          }
 *          else{
 *              //request was processed, let's handle response data
 *              handle(data);
 *          }
 *     }
 * };
 *
 * //processing request
 * processRequest(params);
 */
const processRequest = (params) => {
    if (!params.req || !params.req.url) {
        return common.returnMessage(params, 400, "Please provide request data");
    }

    // When called via the Express legacy bridge, URL parsing and qstring
    // merging were already done by the params middleware. Skip re-parsing
    // to avoid duplicating query/body params. Programmatic callers (e.g.
    // star-rating, taskmanager) do not set _expressParsed, so they still
    // go through the original parsing path.
    if (!params._expressParsed) {
        const urlParts = url.parse(params.req.url, true),
            queryString = urlParts.query,
            paths = urlParts.pathname.split("/");
        params.href = urlParts.href;
        params.qstring = params.qstring || {};
        params.res = params.res || {};
        params.urlParts = urlParts;
        params.paths = paths;

        //request object fillers
        params.req.method = params.req.method || "custom";
        params.req.headers = params.req.headers || {};
        params.req.socket = params.req.socket || {};
        params.req.connection = params.req.connection || {};

        //copying query string data as qstring param
        if (queryString) {
            for (let i in queryString) {
                params.qstring[i] = queryString[i];
            }
        }

        //copying body as qstring param
        if (params.req.body && typeof params.req.body === "object") {
            for (let i in params.req.body) {
                params.qstring[i] = params.req.body[i];
            }
        }

        if (params.qstring.app_id && params.qstring.app_id.length !== 24) {
            common.returnMessage(params, 400, 'Invalid parameter "app_id"');
            return false;
        }

        if (params.qstring.user_id && params.qstring.user_id.length !== 24) {
            common.returnMessage(params, 400, 'Invalid parameter "user_id"');
            return false;
        }

        //remove countly path
        if (common.config.path === "/" + params.paths[1]) {
            params.paths.splice(1, 1);
        }

        let apiPath = '';

        for (let i = 1; i < params.paths.length; i++) {
            if (i > 2) {
                break;
            }

            apiPath += "/" + params.paths[i];
        }

        params.apiPath = apiPath;
        params.fullPath = params.paths.join("/");
    }

    const paths = params.paths;
    const apiPath = params.apiPath;
    const urlParts = params.urlParts;

    reloadConfig().then(function() {
        plugins.dispatch("/", {
            params: params,
            apiPath: apiPath,
            validateAppForWriteAPI: validateAppForWriteAPI,
            validateUserForDataReadAPI: validateUserForDataReadAPI,
            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
            validateUserForGlobalAdmin: validateUserForGlobalAdmin,
            paths: paths,
            urlParts: urlParts
        });

        if (!params.cancelRequest) {
            console.log("Processing", apiPath);
            switch (apiPath) {
            // '/i/users' has been migrated to core/api/routes/users.js (Express route)
            // '/i/notes' has been migrated to core/api/routes/notes.js (Express route)
            // '/o/render' has been migrated to core/api/routes/render.js (Express route)
            // '/i/app_users' has been migrated to core/api/routes/app_users.js (Express route)
            // '/i/apps' has been migrated to core/api/routes/apps.js (Express route)
            // '/i/event_groups' has been migrated to core/api/routes/event_groups.js (Express route)
            // '/i/tasks' has been migrated to core/api/routes/tasks.js (Express route)
            // '/i/events' has been migrated to core/api/routes/events.js (Express route)
            // '/o/users' has been migrated to core/api/routes/users.js (Express route)
            // '/o/app_users' has been migrated to core/api/routes/app_users.js (Express route)
            // '/o/apps' has been migrated to core/api/routes/apps.js (Express route)
            // '/o/tasks' has been migrated to core/api/routes/tasks.js (Express route)
            // '/o/system' has been migrated to core/api/routes/system.js (Express route)
            // '/o/export' has been migrated to core/api/routes/export.js (Express route)
            // '/o/ping' has been migrated to core/api/routes/ping.js (Express route)
            // '/o/jwt' and '/i/jwt' have been migrated to core/api/routes/jwt.js (Express routes)
            // '/i/token' has been migrated to core/api/routes/token.js (Express route)
            // '/o/token' has been migrated to core/api/routes/token.js (Express route)
            // '/o' has been migrated to core/api/routes/data.js (Express route)
            // '/o/analytics' has been migrated to core/api/routes/analytics.js (Express route)
            // '/o/aggregate' has been migrated to core/api/routes/analytics.js (Express route)
            // '/o/countly_version' has been migrated to core/api/routes/version.js (Express route)
            // '/o/sdk' has been migrated to core/api/routes/sdk.js (Express route)
            // '/i/sdk' has been migrated to core/api/routes/sdk.js (Express route)
            // '/o/notes' has been migrated to core/api/routes/notes.js (Express route)
            // '/o/cms' has been migrated to core/api/routes/cms.js (Express route)
            // '/i/cms' has been migrated to core/api/routes/cms.js (Express route)
            // '/o/date_presets' has been migrated to core/api/routes/date_presets.js (Express route)
            // '/i/date_presets' has been migrated to core/api/routes/date_presets.js (Express route)
            default:
                if (!plugins.dispatch(apiPath, {
                    params: params,
                    validateUserForDataReadAPI: validateUserForDataReadAPI,
                    validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                    validateUserForWriteAPI: validateUserForWriteAPI,
                    paths: paths,
                    validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                    validateUserForGlobalAdmin: validateUserForGlobalAdmin
                })) {
                    if (!plugins.dispatch(params.fullPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        validateUserForWriteAPI: validateUserForWriteAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                }
            }
        }
        else {
            if (!params.res.finished) {
                common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
            }
            common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
        }
    },
    function() {});
};

/**
 * Process Request Data
 * @param {Params} params - params object
 * @param {object} app - app document
 * @param {function} done - callbck when processing done
 */
const processRequestData = (params, app, done) => {

    //preserve time for user's previous session
    params.previous_session = params.app_user.lsid;
    params.previous_session_start = params.app_user.ls;
    params.request_id = params.request_hash + "_" + params.app_user.uid + "_" + params.time.mstimestamp;

    var ob = {params: params, app: app, updates: []};
    plugins.dispatch("/sdk/user_properties", ob, function() {
        var update = {};
        //check if we already processed app users for this request
        if (params.app_user.last_req !== params.request_hash && ob.updates.length) {
            for (let i = 0; i < ob.updates.length; i++) {
                update = common.mergeQuery(update, ob.updates[i]);
            }
        }
        var newUser = params.app_user.fs ? false : true;
        common.updateAppUser(params, update, function() {
            if (params.qstring.begin_session) {
                plugins.dispatch("/session/retention", {
                    params: params,
                    user: params.app_user,
                    isNewUser: newUser
                });
            }
            if (params.qstring.events) {
                if (params.promises) {
                    params.promises.push(countlyApi.data.events.processEvents(params));
                }
                else {
                    countlyApi.data.events.processEvents(params);
                }
            }
            //process the rest of the plugins as usual
            plugins.dispatch("/i", {
                params: params,
                app: app
            });
            plugins.dispatch("/sdk/data_ingestion", {params: params}, function(result) {
                var retry = false;
                if (result && result.length) {
                    for (let index = 0; index < result.length; index++) {
                        if (result[index].status === "rejected") {
                            retry = true;
                            break;
                        }
                    }
                }
                if (!params.res.finished) {
                    if (retry) {
                        common.returnMessage(params, 400, 'Could not ingest data');
                    }
                    else {
                        common.returnMessage(params, 200, 'Success');
                    }
                }
                if (done) {
                    done();
                }
            });
        });
    });
};

/**
 * Process fetch request from sdk
 * @param  {object} params - params object
 * @param  {object} app - app document
 * @param  {function} done - callback when processing done
 */
const processFetchRequest = (params, app, done) => {
    if (params.qstring.metrics) {
        try {
            countlyApi.data.usage.returnAllProcessedMetrics(params);
        }
        catch (ex) {
            console.log("Could not process metrics");
        }
    }

    plugins.dispatch("/o/sdk", {
        params: params,
        app: app
    }, () => {
        if (!params.res.finished) {
            common.returnMessage(params, 400, 'Invalid method');
        }

        //LOGGING THE REQUEST AFTER THE RESPONSE HAS BEEN SENT
        plugins.dispatch("/o/sdk/log", {
            params: params,
            app: params.app
        }, () => { });

        return done ? done() : false;
    });
};


/**
 * @param  {object} params - params object
 * @param  {String} type - source type
 * @param  {Function} done - done callback
 * @returns {Function} - done or boolean value
 */
const checksumSaltVerification = (params) => {
    params.app.checksum_salt = params.app.salt || params.app.checksum_salt;//checksum_salt - old UI, .salt    - new UI.
    if (params.app.checksum_salt && params.app.checksum_salt.length && !params.no_checksum) {
        const payloads = [];
        payloads.push(params.href.substr(params.fullPath.length + 1));

        if (params.req.method.toLowerCase() === 'post') {
            // Check if we have 'multipart/form-data'
            if (params.formDataUrl) {
                payloads.push(params.formDataUrl);
            }
            else {
                payloads.push(params.req.body);
            }
        }
        if (typeof params.qstring.checksum !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha1';
                plugins.dispatch("/sdk/cancel", {params: params});
                return false;
            }
        }
        else if (typeof params.qstring.checksum256 !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum256 + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha256';
                plugins.dispatch("/sdk/cancel", {params: params});
                return false;
            }
        }
        else {
            common.returnMessage(params, 200, 'Request does not have checksum');
            console.log("Request does not have checksum", params.href, params.req.body);
            params.cancelRequest = "Request does not have checksum";
            plugins.dispatch("/sdk/cancel", {params: params});
            return false;
        }
    }

    return true;
};


//Function check if there is app redirect set
//In that case redirect data and sets up params to know that request is getting redirected
/**
 * @param  {object} ob - params object
 * @returns {Boolean} - false if redirected
 */
function validateRedirect(ob) {
    var params = ob.params,
        app = ob.app;
    if (!params.cancelRequest && app.redirect_url && app.redirect_url !== '') {
        var newPath = params.urlParts.path;

        //check if we have query part
        if (newPath.indexOf('?') === -1) {
            newPath += "?";
        }

        var opts = {
            uri: app.redirect_url + newPath + '&ip_address=' + params.ip_address,
            method: 'GET'
        };

        //should we send post request
        if (params.req.method.toLowerCase() === 'post') {
            opts.method = "POST";
            //check if we have body from post method
            if (params.req.body) {
                opts.json = true;
                opts.body = params.req.body;
            }
        }

        request(opts, function(error, response, body) {
            var code = 400;
            var message = "Redirect error. Tried to redirect to:" + app.redirect_url;

            if (response && response.statusCode) {
                code = response.statusCode;
            }


            if (response && response.body) {
                try {
                    var resp = JSON.parse(response.body);
                    message = resp.result || resp;
                }
                catch (e) {
                    if (response.result) {
                        message = response.result;
                    }
                    else {
                        message = response.body;
                    }
                }
            }
            if (error) { //error
                log.e("Redirect error", error, body, opts, app, params);
            }

            if (plugins.getConfig("api", params.app && params.app.plugins, true).safe || params.qstring?.safe_api_response) {
                common.returnMessage(params, code, message);
            }
        });
        params.cancelRequest = "Redirected: " + app.redirect_url;
        params.waitForResponse = false;
        if (plugins.getConfig("api", params.app && params.app.plugins, true).safe || params.qstring?.safe_api_response) {
            params.waitForResponse = true;
        }
        return false;
    }
    else {
        return true;
    }
}


/**
 * Validate App for Write API
 * Checks app_key from the http request against "apps" collection.
 * This is the first step of every write request to API.
 * @param {Params} params - params object
 * @param {function} done - callback when processing done
 * @param {number} try_times - how many times request was retried
 * @returns {void} void
 */
const validateAppForWriteAPI = (params, done, try_times) => {
    if (ignorePossibleDevices(params)) {
        return done ? done() : false;
    }

    common.readBatcher.getOne("apps", {'key': params.qstring.app_key + ""}, (err, app) => {
        if (!app) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            return done ? done() : false;
        }

        if (app.paused) {
            common.returnMessage(params, 400, 'App is currently not accepting data');
            params.cancelRequest = "App is currently not accepting data";
            plugins.dispatch("/sdk/cancel", {params: params});
            return done ? done() : false;
        }

        if ((params.populator || params.qstring.populator) && app.locked) {
            common.returnMessage(params, 403, "App is locked");
            params.cancelRequest = "App is locked";
            plugins.dispatch("/sdk/cancel", {params: params});
            return false;
        }

        params.app_id = app._id;
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);


        var time = Date.now().valueOf();
        time = Math.round((time || 0) / 1000);
        if (params.app && (!params.app.last_data || params.app.last_data < time - 60 * 60 * 24) && !params.populator && !params.qstring.populator) { //update if more than day passed
            //set new value
            common.db.collection("apps").update({"_id": common.db.ObjectID(params.app._id)}, {"$set": {"last_data": time}}, function(err1) {
                if (err1) {
                    console.log("Failed to update apps collection " + err1);
                }
                common.readBatcher.invalidate("apps", {"key": params.app.key}, {}, false); //because we load app by key  on incoming requests. so invalidate also by key
            });
        }

        if (!checksumSaltVerification(params)) {
            return done ? done() : false;
        }

        if (typeof params.qstring.tz !== 'undefined' && !isNaN(parseInt(params.qstring.tz))) {
            params.user.tz = parseInt(params.qstring.tz);
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err2, user) => {
            if (err2) {
                common.returnMessage(params, 400, 'Cannot get app user');
                params.cancelRequest = "Cannot get app user or no Database connection";
                return done ? done() : false;
            }
            params.app_user = user || {};

            let payload = params.href.substr(3) || "";
            if (params.req.method.toLowerCase() === 'post') {
                payload += "&" + params.req.body;
            }
            //remove dynamic parameters
            payload = payload.replace(new RegExp("[?&]?(rr=[^&\n]+)", "gm"), "");
            payload = payload.replace(new RegExp("[?&]?(checksum=[^&\n]+)", "gm"), "");
            payload = payload.replace(new RegExp("[?&]?(checksum256=[^&\n]+)", "gm"), "");
            params.request_hash = common.crypto.createHash('sha1').update(payload).digest('hex') + (params.qstring.timestamp || params.time.mstimestamp);
            if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests) {
                //check unique millisecond timestamp, if it is the same as the last request had,
                //then we are having duplicate request, due to sudden connection termination
                if (params.app_user.last_req === params.request_hash) {
                    params.cancelRequest = "Duplicate request";
                }
            }

            if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
                try {
                    params.qstring.metrics = JSON.parse(params.qstring.metrics);
                }
                catch (SyntaxError) {
                    console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                }
            }
            plugins.dispatch("/sdk/pre", {
                params: params,
                app: app
            }, () => {
                var processMe = validateRedirect({params: params, app: app});
                /*
					Keeping option open to add some request cancelation on /sdk for different cases than redirect.
					(That is why duplicate code)
				*/
                if (!processMe) {
                    plugins.dispatch("/sdk/log", {params: params});
                    //params.cancelRequest is true
                    if (!params.res.finished && !params.waitForResponse) {
                        common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                        //common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                    }
                    common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                    return done ? done() : false;
                }
                else {
                    plugins.dispatch("/sdk", {
                        params: params,
                        app: app
                    }, () => {
                        plugins.dispatch("/sdk/log", {params: params});
                        if (!params.cancelRequest) {
                            processUser(params, validateAppForWriteAPI, done, try_times).then((userErr) => {
                                if (userErr) {
                                    if (!params.res.finished) {
                                        common.returnMessage(params, 400, userErr);
                                    }
                                }
                                else {
                                    processRequestData(params, app, done);
                                }
                            });
                        }
                        else {
                            if (!params.res.finished && !params.waitForResponse) {
                                common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                                //common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                            }
                            common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                            return done ? done() : false;
                        }
                    });
                }
            });
        });
    });
};

/**
 * Validate app for fetch API from sdk
 * @param  {object} params - params object
 * @param  {function} done - callback when processing done
 * @param  {number} try_times - how many times request was retried
 * @returns {function} done - done callback
 */
const validateAppForFetchAPI = (params, done, try_times) => {
    if (ignorePossibleDevices(params)) {
        return done ? done() : false;
    }
    common.readBatcher.getOne("apps", {'key': params.qstring.app_key}, (err, app) => {
        if (!app) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            return done ? done() : false;
        }

        params.app_id = app._id;
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

        if (!checksumSaltVerification(params)) {
            return done ? done() : false;
        }

        if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
            try {
                params.qstring.metrics = JSON.parse(params.qstring.metrics);
            }
            catch (SyntaxError) {
                console.log('Parse metrics JSON failed for sdk fetch request', params.qstring.metrics, params.req.url, params.req.body);
            }
        }

        var parallelTasks = [countlyApi.data.usage.setLocation(params)];

        var processThisUser = true;

        if (app.paused) {
            log.d("App is currently not accepting data");
            processThisUser = false;
        }

        if ((params.populator || params.qstring.populator) && app.locked) {
            log.d("App is locked");
            processThisUser = false;
        }

        if (!processThisUser) {
            parallelTasks.push(fetchAppUser(params));
        }
        else {
            parallelTasks.push(fetchAppUser(params).then(() => {
                return processUser(params, validateAppForFetchAPI, done, try_times);
            }));
        }

        Promise.all(
            parallelTasks
        )
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                processFetchRequest(params, app, done);
            });
    });
};

/**
 * Restart Request
 * @param {Params} params - params object
 * @param {function} initiator - function which initiated request
 * @param {function} done - callback when processing done
 * @param {number} try_times - how many times request was retried
 * @param {function} fail - callback when restart limit reached
 * @returns {void} void
 */
const restartRequest = (params, initiator, done, try_times, fail) => {
    if (!try_times) {
        try_times = 1;
    }
    else {
        try_times++;
    }
    if (try_times > 5) {
        console.log("Too many retries", try_times);
        if (typeof fail === "function") {
            fail("Cannot process request. Too many retries");
        }
        return;
    }
    params.retry_request = true;
    //retry request
    initiator(params, done, try_times);
};

/**
 * @param  {object} params - params object
 * @param  {function} initiator - function which initiated request
 * @param  {function} done - callback when processing done
 * @param  {number} try_times - how many times request was retried
 * @returns {Promise} - resolved
 */
function processUser(params, initiator, done, try_times) {
    return new Promise((resolve) => {
        if (params && params.app_user && !params.app_user.uid) {
            //first time we see this user, we need to id him with uid
            countlyApi.mgmt.appUsers.getUid(params.app_id, function(err, uid) {
                plugins.dispatch("/i/app_users/create", {
                    app_id: params.app_id,
                    user: {uid: uid, did: params.qstring.device_id, _id: params.app_user_id },
                    res: {uid: uid, did: params.qstring.device_id, _id: params.app_user_id },
                    params: params
                });
                if (uid) {
                    params.app_user.uid = uid;
                    if (!params.app_user._id) {
                        //if document was not yet created
                        //we try to insert one with uid
                        //even if paralel request already inserted uid
                        //this insert will fail
                        //but we will retry again and fetch new inserted document
                        var doc = {
                            _id: params.app_user_id,
                            uid: uid,
                            did: params.qstring.device_id
                        };
                        if (params && params.href) {
                            doc.first_req_get = (params.href + "") || "";
                        }
                        else {
                            doc.first_req_get = "";
                        }
                        if (params && params.req && params.req.body) {
                            doc.first_req_post = (params.req.body + "") || "";
                        }
                        else {
                            doc.first_req_post = "";
                        }
                        common.db.collection('app_users' + params.app_id).insert(doc, {ignore_errors: [11000]}, function() {
                            restartRequest(params, initiator, done, try_times, resolve);
                        });
                    }
                    else {
                        //document was created, but has no uid
                        //here we add uid only if it does not exist in db
                        //so if paralel request inserted it, we will not overwrite it
                        //and retrieve that uid on retry
                        common.db.collection('app_users' + params.app_id).update({
                            _id: params.app_user_id,
                            uid: {$exists: false}
                        }, {$set: {uid: uid}}, {upsert: true, ignore_errors: [11000]}, function() {
                            restartRequest(params, initiator, done, try_times, resolve);
                        });
                    }
                }
                else {
                    //cannot create uid, so cannot process request now
                    console.log("Cannot create uid", err, uid);
                    resolve("Cannot create uid");
                }
            });
        }
        //check if device id was changed
        else if (params && params.qstring && params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
            const old_id = common.crypto.createHash('sha1')
                .update(params.qstring.app_key + params.qstring.old_device_id + "")
                .digest('hex');

            countlyApi.mgmt.appUsers.merge(params.app_id, params.app_user, params.app_user_id, old_id, params.qstring.device_id, params.qstring.old_device_id, function(err) {
                if (err) {
                    return common.returnMessage(params, 400, 'Cannot update user');
                }
                //remove old device ID and retry request
                params.qstring.old_device_id = null;
                restartRequest(params, initiator, done, try_times, resolve);
            });
        }
        else {
            resolve();
        }
    });
}

/**
 * Function to fetch app user from db
 * @param  {object} params - params object
 * @returns {Promise} - user
 */
const fetchAppUser = (params) => {
    return new Promise((resolve) => {
        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err2, user) => {
            params.app_user = user || {};
            return resolve(user);
        });
    });
};

/**
 * Add devices to ignore them
 * @param  {Params} params - params object
 * @param  {function} done - callback when processing done
 * @returns {function} done
 */
const ignorePossibleDevices = (params) => {
    //ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 200, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        params.cancelRequest = "Ignoring zero IDFA device_id";
        plugins.dispatch("/sdk/cancel", {params: params});
        return true;
    }
};

/**
 * Fetches version mark history (filesystem)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadFsVersionMarks(callback) {
    fs.readFile(path.resolve(__dirname, "./../../countly_marked_version.json"), function(err, data) {
        if (err) {
            callback(err, []);
        }
        else {
            var olderVersions = [];
            try {
                olderVersions = JSON.parse(data);
            }
            catch (parseErr) { //unable to parse file
                console.log(parseErr);
                callback(parseErr, []);
            }
            if (Array.isArray(olderVersions)) {
                //sort versions here.
                olderVersions.sort(function(a, b) {
                    if (typeof a.updated !== "undefined" && typeof b.updated !== "undefined") {
                        return a.updated - b.updated;
                    }
                    else {
                        return 1;
                    }
                });
                callback(null, olderVersions);
            }
        }
    });
}

/**
 * Fetches version mark history (database)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadDbVersionMarks(callback) {
    common.db.collection('plugins').find({'_id': 'version'}, {"history": 1}).toArray(function(err, versionDocs) {
        if (err) {
            console.log(err);
            callback(err, []);
            return;
        }
        var history = [];
        if (versionDocs[0] && versionDocs[0].history) {
            history = versionDocs[0].history;
        }
        callback(null, history);
    });
}

/** @lends module:api/utils/requestProcessor */
module.exports = {processRequest: processRequest, processUserFunction: processUser, validateAppForFetchAPI: validateAppForFetchAPI};