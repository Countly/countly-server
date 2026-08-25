/**
* Module for validation functions that manage access rights to application data. Divided in parts access for Global Admins, Admins and Users.
* @module api/utils/rights
*/
var common = require("./common.js"),
    plugins = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird"),
    crypto = require('crypto'),
    log = require('./log.js')('core:rights');

var authorize = require('./authorizer.js'); //for token validations

var collectionMap = {};//map to know when data about som collections/events was refreshed
var cachedSchema = {};

//check token and return owner id if token valid
//owner d used later to set all member variables.
/**Validate if token exists and is not expired(uzing authorize.js)
* @param {object} params  params
* @param {string} params.qstring.auth_token  authentication token
* @param {string}params.req.headers.countly-token {string} authentication token
* @param {string} params.fullPath current full path
* @returns {Promise} promise 
*/
function validate_token_if_exists(params) {
    return new Promise(function(resolve) {
        var token = params.qstring.auth_token || params.req.headers["countly-token"] || "";
        if (token && token !== "") {
            authorize.verify_return({
                db: common.db,
                qstring: params.qstring,
                token: token,
                req_path: params.fullPath,
                //the whole token document is needed, not just the owner, so the token's own
                //permissions can bound what the resolved member is allowed to do
                return_data: true,
                callback: function(valid) {
                //false or the token document
                    if (valid) {
                        params.token_data = valid;
                        resolve(valid.owner);
                    }
                    else {
                        resolve('token-invalid');
                    }

                }
            });
        }
        else {
            resolve("token-not-given");
        }
    });
}

/**
* Bound a member by the permissions of the token used to authenticate as them.
*
* Authenticating with a token resolves to the token's owner, and every validator then decides
* what to allow from that member. Without this step the member is loaded at full strength, so a
* token deliberately scoped to one app authorizes everything its owner can do - the escalation
* this model exists to prevent. Applied as soon as the member is loaded, so that the validators'
* own permission checks already see the bounded member.
*
* A token with no token_permission (an api_key request, a dashboard session token, or a token
* created before this model) is returned unchanged, so existing integrations are unaffected.
* @param {params} params - {@link params} object, carrying token_data when a token was used
* @param {object} member - member document loaded for the token owner
* @returns {object} the member, bounded by the token's permissions when the token is scoped
*/
function applyTokenScope(params, member) {
    if (params.token_data && params.token_data.token_permission) {
        return exports.intersectPermission(member, params.token_data.token_permission);
    }
    return member;
}

//exported so a route that resolves its own token can apply the same bounding rights.js
//applies for every other route
exports.applyTokenScope = applyTokenScope;
/**
* Validate user for read access by api_key for provided app_id (both required parameters for the request). 
* User must exist, must not be locked, must pass plugin validation (if any) and have at least user access to the provided app (which also must exist).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information and app information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateUserForRead = function(params, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (typeof params.qstring.app_id === "undefined") {
                    common.returnMessage(params, 401, 'No app_id provided');
                    reject('No app_id provided');
                    return false;
                }
                const userApps = module.exports.getUserApps(member);

                if (!((userApps.indexOf(params.qstring.app_id) !== -1) || member.global_admin)) {
                    common.returnMessage(params, 401, 'User does not have right');
                    reject('User does not have right');
                    return false;
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }

                common.db.collection('apps').findOne({'_id': common.db.ObjectID(params.qstring.app_id + "")}, function(err1, app) {
                    if (!app) {
                        common.returnMessage(params, 401, 'App does not exist');
                        reject('App does not exist');
                        return false;
                    }
                    params.member = member;
                    params.app_id = app._id;
                    params.app_cc = app.country;
                    params.appTimezone = app.timezone;
                    params.app = app;
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                        }
                        return false;
                    }

                    plugins.dispatch("/o/validate", {
                        params: params,
                        app: app
                    });

                    resolve(callbackParam);
                });
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};

/**
* Validate user for write access by api_key for provided app_id (both required parameters for the request). 
* User must exist, must not be locked, must pass plugin validation (if any) and have at least admin access to the provided app (which also must exist).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information and app information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateUserForWrite = function(params, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (!(module.exports.hasAdminAccess(member, params.qstring.app_id))) {
                    common.returnMessage(params, 401, 'User does not have right');
                    reject('User does not have right');
                    return false;
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }

                common.db.collection('apps').findOne({'_id': common.db.ObjectID(params.qstring.app_id + "")}, function(err1, app) {
                    if (!app) {
                        common.returnMessage(params, 401, 'App does not exist');
                        reject('App does not exist');
                        return false;
                    }
                    else if ((params.populator || params.qstring.populator) && app.locked) {
                        common.returnMessage(params, 403, 'App is locked');
                        reject('App is locked');
                        return false;
                    }

                    params.app_id = app._id;
                    params.appTimezone = app.timezone;
                    params.app = app;
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                    params.member = member;

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                        }
                        return false;
                    }

                    resolve(callbackParam);
                });
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};

/**
* Validate user for global admin access by api_key (required parameter for the request). 
* User must exist, must not be locked, must pass plugin validation (if any) and have global admin access.
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateGlobalAdmin = function(params, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (!member.global_admin) {
                    common.returnMessage(params, 401, 'User does not have right');
                    reject('User does not have right');
                    return false;
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }
                params.member = member;
                params.member.auth_token = params.qstring.auth_token || params.req.headers["countly-token"] || "";

                if (plugins.dispatch("/validation/user", {params: params})) {
                    if (!params.res.finished) {
                        common.returnMessage(params, 401, 'User does not have right');
                        reject('User does not have right');
                    }
                    return false;
                }
                resolve(callbackParam);
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};

/**
* Validate user for admin access for specific app by api_key (required parameter for the request). 
* User must exist, must not be locked, must pass plugin validation (if any).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateAppAdmin = function(params, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (!params.qstring.app_id) {
                    common.returnMessage(params, 400, 'No app id provided');
                    return false;
                }

                if (!member.global_admin) {
                    if (!member.permission || member.permission._.a.indexOf(params.qstring.app_id) === -1) {
                        common.returnMessage(params, 401, 'User does not have right');
                        reject('User does not have right');
                        return false;
                    }
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }
                params.member = member;
                params.member.auth_token = params.qstring.auth_token || params.req.headers["countly-token"] || "";

                if (plugins.dispatch("/validation/user", {params: params})) {
                    if (!params.res.finished) {
                        common.returnMessage(params, 401, 'User does not have right');
                        reject('User does not have right');
                    }
                    return false;
                }
                resolve(callbackParam);
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};

/**
* Basic user validation by api_key (required parameter for the request), mostly used for custom validation afterwards (like multi app access).
* User must exist, must not be locked and must pass plugin validation (if any).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateUser = function(params, callback, callbackParam) {
    //old backwards compatability call check
    if (typeof params === "function") {
        var temp = params;
        params = callback;
        callback = temp;
    }

    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }

                params.member = member;

                if (plugins.dispatch("/validation/user", {params: params})) {
                    if (!params.res.finished) {
                        common.returnMessage(params, 401, 'User does not have right');
                        reject('User does not have right');
                    }
                    return false;
                }

                resolve(callbackParam);
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};
/**
* Wrap callback using promise
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function
* @param {function} func - promise function
* @returns {Promise} promise
*/
function wrapCallback(params, callback, callbackParam, func) {
    var promise = new Promise(func);
    if (typeof callback === "function") {
        promise.asCallback(function(err) {
            if (!err) {
                let ret;
                if (callbackParam) {
                    ret = callback(callbackParam, params);
                }
                else {
                    ret = callback(params);
                }

                if (ret && typeof ret.then === 'function') {
                    ret.catch(e => {
                        log.e('Error in CRUD callback', e);
                        common.returnMessage(params, 500, 'Server error');
                    });
                }
            }
        });
    }
    else if (callback) {
        console.log("Incorrect callback function", callback);
    }
    return promise;
}

/**
 * Function to load and cache data
 * @param {object} apps - apps 
 * @param {function} callback - callback function 
 */
function loadAndCacheEventsData(apps, callback) {
    const appIds = [];
    const appNamesById = {};
    var anyNameMissing = false;
    apps.forEach((app) => {
        cachedSchema[app._id + ''] = cachedSchema[app._id + ''] || {};
        cachedSchema[app._id + ''].loading = true;
        appIds.push(common.db.ObjectID(app._id + ''));
        appNamesById[app._id + ''] = app.name;
        if (!appNamesById[app._id + '']) {
            anyNameMissing = true;
        }
    });

    /**
    * Get events collections with replaced app names
    * A helper function for db access check
    * @param {object} appColl - application ids and names
    * @param {function} cb - callback method
    **/
    function getEvents(appColl, cb) {
        common.db.collection('events').find({'_id': { $in: appColl.appIds }}).toArray(function(err, events) {
            if (!err && events) {
                for (let h = 0; h < events.length; h++) {
                    if (events[h].list) {
                        for (let i = 0; i < events[h].list.length; i++) {
                            collectionMap[crypto.createHash('sha1').update(events[h].list[i] + events[h]._id + "").digest('hex')] = {"n": true, "a": events[h]._id + "", "e": events[h].list[i], "name": "(" + appNamesById[events[h]._id + ''] + ": " + events[h].list[i] + ")"};
                        }
                    }
                }
            }

            appColl.appIds.forEach((appId) => {
                if (plugins.internalDrillEvents) {
                    for (let i = 0; i < plugins.internalDrillEvents.length; i++) {
                        collectionMap[crypto.createHash('sha1').update(plugins.internalDrillEvents[i] + appId + "").digest('hex')] = {"n": true, "a": appId + "", "e": plugins.internalDrillEvents[i], "name": "(" + appColl.appNamesById[appId + ''] + ": " + plugins.internalDrillEvents[i] + ")"};
                    }
                }

                if (plugins.internalEvents) {
                    for (let i = 0; i < plugins.internalEvents.length; i++) {
                        collectionMap[crypto.createHash('sha1').update(plugins.internalEvents[i] + appId + "").digest('hex')] = {"n": true, "a": appId + "", "e": plugins.internalEvents[i], "name": "(" + appColl.appNamesById[appId + ''] + ": " + plugins.internalEvents[i] + ")"};
                    }
                }
            });
            cb(null, true);
        });
    }

    /**
    * Get views collections with replaced app names
    * A helper function for db access check
    * @param {object} appColl - application ids and names
    * @param {function} cb - callback method
    **/
    function getViews(appColl, cb) {
        common.db.collection('views').find({'_id': { $in: appColl.appIds }}).toArray(function(err, viewDocs) {
            if (!err && viewDocs) {
                for (let idx = 0; idx < viewDocs.length; idx++) {
                    if (viewDocs[idx].segments) {
                        for (var segkey in viewDocs[idx].segments) {
                            collectionMap["app_viewdata" + crypto.createHash('sha1').update(segkey + viewDocs[idx]._id + '').digest('hex')] = {"n": true, "a": viewDocs[idx]._id + '', "vs": segkey, "name": "(" + appColl.appNamesById[viewDocs[idx]._id + ''] + ": " + segkey + ")"};
                        }
                    }
                }
            }
            appColl.appIds.forEach((appId) => {
                collectionMap["app_viewdata" + crypto.createHash('sha1').update("" + appId).digest('hex')] = {"n": true, "a": "" + appId, "vs": "", "name": "(" + appColl.appNamesById[appId + ''] + ": no-segment)"};
            });
            cb(null, true);
        });
    }

    if (anyNameMissing) { //We do not have name for APPs, so we need to fetch them
        common.db.collection('apps').find({'_id': { $in: appIds }}, {'name': 1}).toArray(function(err, newapps) {
            if (err) {
                log.e(err);
                callback(err);
            }
            else {
                for (var i = 0; i < newapps.length; i++) {
                    newapps[i].name = newapps[i].name || "Unknown";
                }
                loadAndCacheEventsData(newapps, callback);
            }
        });
    }
    else {
        getEvents({ appIds, appNamesById }, function(err) {
            if (err) {
                log.e(err);
            }
            getViews({ appIds, appNamesById }, function(err1) {
                if (err1) {
                    log.e(err1);
                }
                for (var item in collectionMap) {
                    if (appNamesById[collectionMap[item].a]) {
                        if (!collectionMap[item].n) {
                            delete collectionMap[item];
                        }
                        else {
                            delete collectionMap[item].n;
                        }
                    }
                }
                apps.forEach((app) => {
                    cachedSchema[app._id + ''].ts = Date.now();
                    cachedSchema[app._id + ''].loading = false;
                });
                common.cachedSchema = cachedSchema;
                common.collectionMap = collectionMap;
                callback(err || err1);
            });
        });
    }


}
/**
* Get events data
* A helper function for db access check
* @param {object} params - {@link params} object
* @param {array} apps - array with each element being app document
* @param {function} callback - callback method
**/
function dbLoadEventsData(params, apps, callback) {
    var events = {};
    var views = {};
    var callCalculate = [];
    var appMap = {};
    for (var a in apps) {
        if (!cachedSchema[apps[a]._id + ''] || (cachedSchema[apps[a]._id + ''] && !cachedSchema[apps[a]._id + ''].loading && (Date.now() - cachedSchema[apps[a]._id + ''].ts) > 10 * 60 * 1000)) {
            callCalculate.push(apps[a]);
        }
        appMap[apps[a]._id + ''] = true;
    }

    if (params.member.eventList) {
        callback(null, params.member.eventList, params.member.viewList);
        if (callCalculate.length > 0) {
            loadAndCacheEventsData(callCalculate, function(err) {
                if (err) {
                    log.e(err);
                }
            });
        }
    }
    else if (callCalculate.length > 0) {
        loadAndCacheEventsData(callCalculate, function(err) {
            if (err) {
                log.e(err);
            }
            for (var key in collectionMap) {
                if (appMap[collectionMap[key].a]) {
                    if (collectionMap[key].e) {
                        events[key] = collectionMap[key].name;
                    }
                    else if (collectionMap[key].vs) {
                        views[key] = collectionMap[key].name;
                    }
                }
            }
            params.member.eventList = events;
            params.member.viewList = views;
            callback(null, events, views);
        });
    }
    else {
        for (var key in collectionMap) {
            if (appMap[collectionMap[key].a]) {
                if (collectionMap[key].e) {
                    events[key] = collectionMap[key].name;
                }
                else if (collectionMap[key].vs) {
                    views[key] = collectionMap[key].name;
                }
            }
        }
        params.member.eventList = events;
        params.member.viewList = views;
        callback(null, events, views);
    }
}
exports.dbLoadEventsData = dbLoadEventsData;

exports.getCollectionName = function(hashValue) {
    if (collectionMap[hashValue]) {
        return collectionMap[hashValue].name;
    }
    else {
        return hashValue;
    }
};

/**
* Check user has access to collection
* @param {object} params - {@link params} object
* @param {string} collection - collection will be checked for access
* @param {string} app_id - app_id to which to restrict access
* @param {function} callback - callback method includes boolean variable as argument  
* @returns {function} returns callback
**/
exports.dbUserHasAccessToCollection = function(params, collection, app_id, callback) {
    if (typeof app_id === "function") {
        callback = app_id;
        app_id = null;
    }
    if (params.member.global_admin && !app_id) {
        //global admin without app_id restriction just has access to everything
        return callback(true);
    }
    var apps = [];
    var userApps = module.exports.getUserApps(params.member);
    var hashValue = "";
    //use whatever user has permission for
    apps = userApps || [];
    // also check for app based restrictions
    if (params.member.app_restrict) {
        for (var appid in params.member.app_restrict) {
            if (params.member.app_restrict[appid].indexOf("#/manage/db") !== -1 && apps.indexOf(appid) !== -1) {
                apps.splice(apps.indexOf(appid), 1);
            }
        }
    }
    if (app_id) {
        if (params.member.global_admin) {
            apps = [app_id];
        }
        else {
            apps = apps.filter(id => id + "" === app_id + "");
        }
    }
    var appList = [];
    if (collection.indexOf("events") === 0 || collection.indexOf("drill_events") === 0) {
        for (let i = 0; i < apps.length; i++) {
            if (apps[i].length) {
                appList.push({_id: apps[i]});
            }
        }
        hashValue = collection.replace("drill_events", "").replace("events", "");
        dbLoadEventsData(params, appList, function(err) {
            if (err) {
                log.e("[rights.js].dbUserHasAccessToCollection() failed at dbLoadEventsData (events) callback.", err);
                return callback(false);
            }
            else {
                if (collectionMap[hashValue] && apps.length > 0 && apps.indexOf(collectionMap[hashValue].a) !== -1) {
                    return callback(true);
                }
                else {
                    return callback(false);
                }
            }
        });
    }
    else if (collection.indexOf("app_viewdata") === 0) {
        for (let i = 0; i < apps.length; i++) {
            if (apps[i].length) {
                appList.push({_id: apps[i]});
            }
        }
        hashValue = collection;//we keep app_viewdata 

        dbLoadEventsData(params, appList, function(err) {
            if (err) {
                log.e("[rights.js].dbUserHasAccessToCollection() failed at dbLoadEventsData (app_viewdata) callback.", err);
                return callback(false);
            }
            else {
                if (collectionMap[hashValue] && apps.length > 0 && apps.indexOf(collectionMap[hashValue].a) !== -1) {
                    return callback(true);
                }
                else {
                    return callback(false);
                }

            }

        });
    }
    else {
        for (let i = 0; i < apps.length; i++) {
            if (apps[i].length > 0 && collection.indexOf(apps[i], collection.length - apps[i].length) !== -1) {
                return callback(true);
            }
        }
        return callback(false);
    }
};

/**
* Validate user for read access by api_key for provided app_id (both required parameters for the request).
* User must exist, must not be locked, must pass plugin validation (if any) and have at least read access to the provided app (which also must exist).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information and app information.
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
exports.validateRead = function(params, feature, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (!member.global_admin && typeof params.qstring.app_id === "undefined") {
                    common.returnMessage(params, 401, 'No app_id provided');
                    reject('No app_id provided');
                    return false;
                }

                // is member.permission exist?
                // is member.permission an object?
                // is params.qstring.app_id property of member.permission object?
                // is member.permission.r[app_id].all is true?
                // or member.global_admin?
                if (!member.global_admin) {
                    if (typeof member.permission !== 'undefined') {
                        var isPermissionObjectExistForRead = (typeof member.permission.r === "object" && typeof member.permission.r[params.qstring.app_id] === "object");
                        var isFeatureAllowedInReadPermissionObject = false;
                        if (typeof feature === "string") {
                            isFeatureAllowedInReadPermissionObject = isPermissionObjectExistForRead && (member.permission.r[params.qstring.app_id].all || (member.permission.r[params.qstring.app_id].allowed && member.permission.r[params.qstring.app_id].allowed[feature]));
                        }
                        else {
                            isFeatureAllowedInReadPermissionObject = false;
                            if (feature) {
                                for (var i = 0; i < feature.length; i++) {
                                    if (isPermissionObjectExistForRead && (member.permission.r[params.qstring.app_id].all || (member.permission.r[params.qstring.app_id].allowed && member.permission.r[params.qstring.app_id].allowed[feature[i]]))) {
                                        isFeatureAllowedInReadPermissionObject = true;
                                        break;
                                    }
                                }
                            }
                        }

                        var hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(params.qstring.app_id) > -1;
                        // don't allow if user has not permission for feature and has no admin access for current app
                        if (!(isFeatureAllowedInReadPermissionObject) && !(hasAdminAccess)) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                            return false;
                        }
                    }
                    else {
                        // check for legacy auth
                        if (!((member.user_of && Array.isArray(member.user_of) && member.user_of.indexOf(params.qstring.app_id) !== -1) || member.global_admin)) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                            return false;
                        }
                    }
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }

                if (params.qstring.app_id) {
                    common.db.collection('apps').findOne({'_id': common.db.ObjectID(params.qstring.app_id + "")}, function(err1, app) {
                        if (!app) {
                            common.returnMessage(params, 401, 'App does not exist');
                            reject('App does not exist');
                            return false;
                        }
                        else if (app) {
                            params.app_id = app._id;
                            params.app_cc = app.country;
                            params.appTimezone = app.timezone;
                            params.app = app;
                            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                        }

                        params.member = member;

                        if (plugins.dispatch("/validation/user", {params: params})) {
                            if (!params.res.finished) {
                                common.returnMessage(params, 401, 'User does not have right');
                                reject('User does not have right');
                            }
                            return false;
                        }

                        if (app) {
                            plugins.dispatch("/o/validate", {
                                params: params,
                                app: app
                            });
                        }

                        resolve(callbackParam);
                    });
                }
                else {
                    params.member = member;

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                        }
                        return false;
                    }

                    resolve(callbackParam);
                }
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
};

/**
* Validate user for write access by api_key for provided app_id (both required parameters for the request).
* User must exist, must not be locked, must pass plugin validation (if any) and have accessType that passed as accessType parameter to the provided app (which also must exist).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information and app information.
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {string} accessType - required access type for related request (c: create, u: update and d: delete)
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
* @returns {Promise} promise
*/
function validateWrite(params, feature, accessType, callback, callbackParam) {
    return wrapCallback(params, callback, callbackParam, function(resolve, reject) {
        validate_token_if_exists(params).then(function(result) {
            var query = "";
            //var appIdExceptions = ['global_users', 'global_applications', 'global_jobs', 'global_plugins', 'global_configurations', 'global_upload'];
            // then result is owner id
            if (result !== 'token-not-given' && result !== 'token-invalid') {
                query = {'_id': common.db.ObjectID(result)};
            }
            else {
                if (!params.qstring.api_key) {
                    if (result === 'token-invalid') {
                        common.returnMessage(params, 400, 'Token not valid');
                        return false;
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing parameter "api_key" or "auth_token"');
                        return false;
                    }
                }
                params.qstring.api_key = params.qstring.api_key + "";
                query = {'api_key': params.qstring.api_key};
            }
            common.db.collection('members').findOne(query, function(err, member) {
                if (!member || err) {
                    common.returnMessage(params, 401, 'User does not exist');
                    reject('User does not exist');
                    return false;
                }

                //bound the member by the token used to authenticate, before anything is authorized
                member = applyTokenScope(params, member);

                if (!member.global_admin && /*appIdExceptions.indexOf(feature) === -1 && */ typeof params.qstring.app_id === "undefined") {
                    common.returnMessage(params, 401, 'No app_id provided');
                    reject('No app_id provided');
                    return false;
                }

                if (!member.global_admin) {
                    if (typeof member.permission !== 'undefined') {
                        var isPermissionObjectExistForAccessType = (typeof member.permission[accessType] === "object" && typeof member.permission[accessType][params.qstring.app_id] === "object");
                        var isFeatureAllowedInRelatedPermissionObject = false;

                        // if feature name passed as single string
                        if (typeof feature === "string") {
                            isFeatureAllowedInRelatedPermissionObject = isPermissionObjectExistForAccessType && (member.permission[accessType][params.qstring.app_id].all || (member.permission[accessType][params.qstring.app_id].allowed && member.permission[accessType][params.qstring.app_id].allowed[feature]));
                        }
                        // or feature name passed as string array
                        else {
                            isFeatureAllowedInRelatedPermissionObject = false;
                            for (var i = 0; i < feature.length; i++) {
                                if (isPermissionObjectExistForAccessType && (member.permission[accessType][params.qstring.app_id].all || (member.permission[accessType][params.qstring.app_id].allowed && member.permission[accessType][params.qstring.app_id].allowed[feature[i]]))) {
                                    isFeatureAllowedInRelatedPermissionObject = true;
                                    break;
                                }
                            }
                        }

                        var hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(params.qstring.app_id) > -1;
                        // don't allow if user has not permission for feature and has no admin access for current app
                        if (!(isFeatureAllowedInRelatedPermissionObject) && !(hasAdminAccess)) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                            return false;
                        }
                    }
                    else {
                        if (!module.exports.hasAdminAccess(member, params.qstring.app_id)) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                            return false;
                        }
                    }
                }

                if (member && member.locked) {
                    common.returnMessage(params, 401, 'User is locked');
                    reject('User is locked');
                    return false;
                }

                if (params.qstring.app_id) {
                    common.db.collection('apps').findOne({'_id': common.db.ObjectID(params.qstring.app_id + "")}, function(err1, app) {
                        if (!app) {
                            common.returnMessage(params, 401, 'App does not exist');
                            reject('App does not exist');
                            return false;
                        }
                        else if ((params.populator || params.qstring.populator) && app.locked) {
                            common.returnMessage(params, 403, 'App is locked');
                            reject('App is locked');
                            return false;
                        }
                        else if (app) {
                            params.app_id = app._id;
                            params.app = app;
                            params.appTimezone = app.timezone;
                            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                        }

                        params.member = member;

                        if (plugins.dispatch("/validation/user", {params: params})) {
                            if (!params.res.finished) {
                                common.returnMessage(params, 401, 'User does not have right');
                                reject('User does not have right');
                            }
                            return false;
                        }

                        resolve(callbackParam);
                    });
                }
                else {
                    params.member = member;

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have right');
                            reject('User does not have right');
                        }
                        return false;
                    }

                    resolve(callbackParam);
                }
            });
        },
        function() {
            common.returnMessage(params, 401, 'Token is invalid');
            reject('Token is invalid');
            return false;
        });
    });
}

/**
* Validate user for create access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateCreate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'c', callback, callbackParam);
};

/**
* Validate user for update access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateUpdate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'u', callback, callbackParam);
};

/**
* Validate user for delete access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateDelete = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'd', callback, callbackParam);
};

/**
 * Is user has admin access on selected app?
 * @param {object} member - member object from params
 * @param {string} app_id - id value of related app
 * @param {string} type - type of access (c, r, u, d)
 * @returns {boolean} isAdmin - is that user has admin access on that app?
 */
exports.hasAdminAccess = function(member, app_id, type) {
    var hasPermissionObject = typeof member.permission !== "undefined";
    if (hasPermissionObject && member.permission._ && member.permission._.a && member.permission._.a.includes(app_id)) {
        return true;
    }

    //Admin access has to be granted, not merely left unsaid. This used to start true
    //and only clear when an entry for the app existed with `all` falsy, so an app the
    //member had no entry for never cleared it and every such app came back as one they
    //administer. Any check reached through here (hasCreateRight, hasReadRight,
    //hasUpdateRight, hasDeleteRight) then passed for apps nobody had granted.
    var isAdmin = false;
    // check users who has permission property
    if (hasPermissionObject) {
        var types = type ? [type] : ["c", "r", "u", "d"];
        var passesAllRules = true;
        for (var i = 0; i < types.length; i++) {
            if (member.permission[types[i]] && member.permission[types[i]][app_id]) {
                if (!member.permission[types[i]][app_id].all) {
                    passesAllRules = false;
                }
            }
            else {
                passesAllRules = false;
            }
        }
        if (passesAllRules) {
            isAdmin = true;
        }

    }
    // check legacy users who has admin_of property
    // users should have at least one app in admin_of array
    else {
        isAdmin = typeof member.admin_of !== "undefined" && member.admin_of.indexOf(app_id) > -1;
    }
    //coerced: global_admin is often simply absent, and `isAdmin || undefined` is
    //undefined rather than false. The JSDoc promises a boolean, and a caller comparing
    //strictly or serialising the result should not have to know the difference.
    return !!(isAdmin || member.global_admin);
};

exports.hasCreateRight = function(feature, app_id, member) {
    var hasAppSpecificRight = (member.permission && member.permission.c && member.permission.c[app_id] && member.permission.c[app_id].allowed && member.permission.c[app_id].allowed[feature]);
    var hasGlobalAdminRight = member.global_admin;
    var hasAppAdminRight = exports.hasAdminAccess(member, app_id, "c");
    return hasAppSpecificRight || hasGlobalAdminRight || hasAppAdminRight;
};

exports.hasReadRight = function(feature, app_id, member) {
    var hasAppSpecificRight = (member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].allowed && member.permission.r[app_id].allowed[feature]);
    var hasGlobalAdminRight = member.global_admin;
    var hasAppAdminRight = exports.hasAdminAccess(member, app_id, "r");
    return hasAppSpecificRight || hasGlobalAdminRight || hasAppAdminRight;
};

exports.hasUpdateRight = function(feature, app_id, member) {
    var hasAppSpecificRight = (member.permission && member.permission.u && member.permission.u[app_id] && member.permission.u[app_id].allowed && member.permission.u[app_id].allowed[feature]);
    var hasGlobalAdminRight = member.global_admin;
    var hasAppAdminRight = exports.hasAdminAccess(member, app_id, "u");
    return hasAppSpecificRight || hasGlobalAdminRight || hasAppAdminRight;
};

exports.hasDeleteRight = function(feature, app_id, member) {
    var hasAppSpecificRight = (member.permission && member.permission.d && member.permission.d[app_id] && member.permission.d[app_id].allowed && member.permission.d[app_id].allowed[feature]);
    var hasGlobalAdminRight = member.global_admin;
    var hasAppAdminRight = exports.hasAdminAccess(member, app_id, "d");
    return hasAppSpecificRight || hasGlobalAdminRight || hasAppAdminRight;
};

/**
* Access types in a permission object, in their canonical order.
*/
var PERMISSION_TYPES = ["c", "r", "u", "d"];

/**
* Whether a principal grants a single feature on an app for one access type.
*
* A principal is anything holding authority: a member (with global_admin / permission, or the
* legacy admin_of / user_of arrays), or a bare token permission set wrapped as {permission: obj}.
* This is the same rule the hasCreateRight / hasReadRight / hasUpdateRight / hasDeleteRight
* helpers apply to a member, expressed once so it can also be applied to a token.
* @param {object} principal - object with permission (and optionally global_admin)
* @param {string} type - access type (c, r, u, d)
* @param {string} appId - id of the app
* @param {string} feature - feature name
* @returns {boolean} true if the principal allows that feature
*/
function principalAllows(principal, type, appId, feature) {
    if (!principal) {
        return false;
    }
    if (principal.global_admin) {
        return true;
    }
    var permission = principal.permission;
    if (typeof permission === "undefined") {
        //legacy member: admin_of grants everything on the app, user_of grants reads
        if (Array.isArray(principal.admin_of) && principal.admin_of.indexOf(appId) !== -1) {
            return true;
        }
        return type === "r" && Array.isArray(principal.user_of) && principal.user_of.indexOf(appId) !== -1;
    }
    if (permission._ && Array.isArray(permission._.a) && permission._.a.indexOf(appId) !== -1) {
        return true;
    }
    var forType = permission[type];
    if (!forType || !forType[appId]) {
        return false;
    }
    if (forType[appId].all === true) {
        return true;
    }
    return !!(forType[appId].allowed && forType[appId].allowed[feature] === true);
}

/**
* Whether a principal grants every feature on an app for one access type.
*
* Distinct from principalAllows because "all" also covers features that do not exist yet, so it
* may only be granted by a principal that itself holds "all".
* @param {object} principal - object with permission (and optionally global_admin)
* @param {string} type - access type (c, r, u, d)
* @param {string} appId - id of the app
* @returns {boolean} true if the principal allows everything for that app and type
*/
function principalAllowsAll(principal, type, appId) {
    if (!principal) {
        return false;
    }
    if (principal.global_admin) {
        return true;
    }
    var permission = principal.permission;
    if (typeof permission === "undefined") {
        if (Array.isArray(principal.admin_of) && principal.admin_of.indexOf(appId) !== -1) {
            return true;
        }
        return type === "r" && Array.isArray(principal.user_of) && principal.user_of.indexOf(appId) !== -1;
    }
    if (permission._ && Array.isArray(permission._.a) && permission._.a.indexOf(appId) !== -1) {
        return true;
    }
    var forType = permission[type];
    return !!(forType && forType[appId] && forType[appId].all === true);
}

/**
* Every app id a principal refers to, whether through the _ grouping or a c/r/u/d entry.
* @param {object} principal - object with permission (and optionally the legacy arrays)
* @returns {string[]} list of app ids
*/
function principalApps(principal) {
    var apps = [];
    /**
    * Add an app id once.
    * @param {string} appId - id of the app
    * @returns {void}
    */
    var push = function(appId) {
        if (apps.indexOf(appId) === -1) {
            apps.push(appId);
        }
    };
    if (!principal) {
        return apps;
    }
    var permission = principal.permission;
    if (typeof permission === "undefined") {
        (principal.admin_of || []).forEach(push);
        (principal.user_of || []).forEach(push);
        return apps;
    }
    if (permission._) {
        if (Array.isArray(permission._.a)) {
            permission._.a.forEach(push);
        }
        if (Array.isArray(permission._.u)) {
            for (var g = 0; g < permission._.u.length; g++) {
                (permission._.u[g] || []).forEach(push);
            }
        }
    }
    for (var t = 0; t < PERMISSION_TYPES.length; t++) {
        var forType = permission[PERMISSION_TYPES[t]];
        for (var appId in forType || {}) {
            push(appId);
        }
    }
    return apps;
}

/**
* App ids a permission object actually grants something on.
*
* Distinct from principalApps: the permission editor emits an entry for every app the editing user
* can see, most of them granting nothing, and an empty entry is not a grant. Apps listed under _.u
* do count, because some validators authorize on app membership alone.
* @param {object} permission - permission object
* @returns {string[]} list of app ids the permission grants something on
*/
function grantingApps(permission) {
    var apps = [];
    /**
    * Add an app id once.
    * @param {string} appId - id of the app
    * @returns {void}
    */
    var push = function(appId) {
        if (apps.indexOf(appId) === -1) {
            apps.push(appId);
        }
    };
    if (!permission) {
        return apps;
    }
    if (permission._) {
        if (Array.isArray(permission._.a)) {
            permission._.a.forEach(push);
        }
        if (Array.isArray(permission._.u)) {
            for (var g = 0; g < permission._.u.length; g++) {
                (permission._.u[g] || []).forEach(push);
            }
        }
    }
    for (var t = 0; t < PERMISSION_TYPES.length; t++) {
        var forType = permission[PERMISSION_TYPES[t]] || {};
        for (var appId in forType) {
            var entry = forType[appId];
            if (!entry) {
                continue;
            }
            if (entry.all === true) {
                push(appId);
                continue;
            }
            for (var feature in entry.allowed || {}) {
                if (entry.allowed[feature] === true) {
                    push(appId);
                    break;
                }
            }
        }
    }
    return apps;
}

/**
* Feature names a principal explicitly allows for an app and access type.
* @param {object} principal - object with permission
* @param {string} type - access type (c, r, u, d)
* @param {string} appId - id of the app
* @returns {string[]} list of feature names
*/
function principalFeatures(principal, type, appId) {
    var features = [];
    var permission = principal && principal.permission;
    var entry = permission && permission[type] && permission[type][appId];
    if (entry && entry.allowed) {
        for (var feature in entry.allowed) {
            if (entry.allowed[feature] === true) {
                features.push(feature);
            }
        }
    }
    return features;
}

/**
* Whether one permission set grants nothing beyond what a ceiling principal already holds.
*
* This is what bounds a grant to the credential that creates it: a token may only pass on
* authority it holds itself. The ceiling is the member for an api_key or an unrestricted session,
* and the parent token's own permissions when a token creates a token - so a token scoped to app A
* cannot produce a child that reaches app B, even though their common owner can.
* @param {object} childPermission - permission object being granted
* @param {object} ceiling - principal that must already hold everything the child grants
* @returns {boolean} true if childPermission is a subset of the ceiling's authority
*/
exports.isPermissionSubset = function(childPermission, ceiling) {
    //a malformed permission grants nothing recognisable, and an empty-looking value must not be
    //mistaken for "grants nothing, therefore a subset"
    if (!childPermission || typeof childPermission !== "object" || Array.isArray(childPermission)) {
        return false;
    }
    var t, appId, i;
    //an app the child administers implies every feature of every type, present and future
    var childAdminApps = (childPermission._ && Array.isArray(childPermission._.a)) ? childPermission._.a : [];
    for (i = 0; i < childAdminApps.length; i++) {
        for (t = 0; t < PERMISSION_TYPES.length; t++) {
            if (!principalAllowsAll(ceiling, PERMISSION_TYPES[t], childAdminApps[i])) {
                return false;
            }
        }
    }
    //an app the child can see at all must be an app the ceiling can see, since some validators
    //authorize on app membership alone
    var ceilingApps = principalApps(ceiling);
    var childApps = grantingApps(childPermission);
    for (i = 0; i < childApps.length; i++) {
        if (!ceiling.global_admin && ceilingApps.indexOf(childApps[i]) === -1) {
            return false;
        }
    }
    for (t = 0; t < PERMISSION_TYPES.length; t++) {
        var forType = childPermission[PERMISSION_TYPES[t]];
        for (appId in forType || {}) {
            var entry = forType[appId];
            if (!entry) {
                continue;
            }
            if (entry.all === true && !principalAllowsAll(ceiling, PERMISSION_TYPES[t], appId)) {
                return false;
            }
            for (var feature in entry.allowed || {}) {
                if (entry.allowed[feature] === true && !principalAllows(ceiling, PERMISSION_TYPES[t], appId, feature)) {
                    return false;
                }
            }
        }
    }
    return true;
};

/**
* Whether the credential that authenticated this request is narrower than its owner.
*
* True for a token carrying token_permission, and for a token restricted by the legacy
* app/endpoint scope. False for an api_key (the member itself) and for an unrestricted token such
* as a dashboard session token. Used to keep credential management - which hands out and revokes
* the owner's other credentials - to credentials that are not themselves narrowed.
* @param {params} params - {@link params} object
* @returns {boolean} true if a scoped credential authenticated the request
*/
exports.isScopedCredential = function(params) {
    var token = params && params.token_data;
    if (!token) {
        return false;
    }
    if (token.token_permission) {
        return true;
    }
    /**
    * Whether a legacy scope value restricts anything.
    * @param {string|Array} scope - the app or endpoint field of a token
    * @returns {boolean} true if restricted
    */
    var isScopeRestricted = function(scope) {
        return !(scope === undefined || scope === null || scope === "" || (Array.isArray(scope) && scope.length === 0));
    };
    return isScopeRestricted(token.app) || isScopeRestricted(token.endpoint);
};

/**
* Every app id referenced by a permission object.
* @param {object} permission - permission object ({_:{a,u}, c/r/u/d:{appId:...}})
* @returns {string[]} list of app ids
*/
exports.getPermissionApps = function(permission) {
    return principalApps({permission: permission});
};

/**
* Bound a member by a token's permissions, returning a member that holds only what both allow.
*
* The subset check at creation time bounds a token to its creator, but the owner's own
* permissions can be reduced afterwards, so the intersection is recomputed on every request.
* The returned member never carries global_admin: that is precisely the authority a scoped token
* was narrowed away from, and leaving it set would let every global_admin check bypass the scope.
* @param {object} member - member document for the token owner
* @param {object} tokenPermission - permission object stored on the token
* @returns {object} a copy of the member holding only the intersection
*/
exports.intersectPermission = function(member, tokenPermission) {
    var scoped = Object.assign({}, member);
    scoped.global_admin = false;
    //the legacy arrays are an alternative expression of authority, so they cannot be carried over
    delete scoped.admin_of;
    delete scoped.user_of;

    var result = {_: {a: [], u: [[]]}, c: {}, r: {}, u: {}, d: {}};
    var tokenPrincipal = {permission: tokenPermission};
    var userApps = [];
    var memberApps = principalApps(member);
    var tokenAdminApps = (tokenPermission._ && Array.isArray(tokenPermission._.a)) ? tokenPermission._.a : [];
    var tokenUserApps = [];
    if (tokenPermission._ && Array.isArray(tokenPermission._.u)) {
        for (var g = 0; g < tokenPermission._.u.length; g++) {
            tokenUserApps = tokenUserApps.concat(tokenPermission._.u[g] || []);
        }
    }

    grantingApps(tokenPermission).forEach(function(appId) {
        //an app the owner can no longer reach grants the token nothing, whatever the token says
        if (!member.global_admin && memberApps.indexOf(appId) === -1) {
            return;
        }
        var grantsAnything = false;
        for (var t = 0; t < PERMISSION_TYPES.length; t++) {
            var type = PERMISSION_TYPES[t];
            var tokenAll = principalAllowsAll(tokenPrincipal, type, appId);
            if (tokenAll && principalAllowsAll(member, type, appId)) {
                result[type][appId] = {all: true, allowed: {}};
                grantsAnything = true;
                continue;
            }
            //whichever side is not "all" has a finite feature list, and that is what to walk
            var candidates = tokenAll ? principalFeatures(member, type, appId) : principalFeatures(tokenPrincipal, type, appId);
            var allowed = {};
            var any = false;
            candidates.forEach(function(feature) {
                if (principalAllows(tokenPrincipal, type, appId, feature) && principalAllows(member, type, appId, feature)) {
                    allowed[feature] = true;
                    any = true;
                }
            });
            if (any) {
                result[type][appId] = {all: false, allowed: allowed};
                grantsAnything = true;
            }
        }
        var isAdmin = tokenAdminApps.indexOf(appId) !== -1 && exports.hasAdminAccess(member, appId);
        if (isAdmin) {
            result._.a.push(appId);
        }
        else if (grantsAnything || tokenUserApps.indexOf(appId) !== -1) {
            //app membership alone is what some validators check, so an app the token grants
            //anything on - or names as a user app - stays visible
            userApps.push(appId);
        }
    });

    result._.u = [userApps];
    scoped.permission = result;
    return scoped;
};

exports.getUserApps = function(member) {
    let userApps = [];
    if (member.global_admin) {
        return userApps;
    }
    else {
        if (typeof member.permission !== "undefined") {
            for (var i = 0; i < member.permission._.u.length; i++) {
                userApps = userApps.concat(member.permission._.u[i]);
            }
            return userApps.concat(member.permission._.a);
        }
        else {
            return member.user_of;
        }
    }
};

exports.getUserAppsForFeaturePermission = function(member, feature, permissionType) {
    let userApps = [];
    if (member.global_admin) {
        return userApps;
    }
    if (typeof member.permission !== "undefined") {
        const permissionList = member.permission[permissionType];
        for (var appId in permissionList) {
            const targetPermissionForApp = permissionList[appId];
            if (targetPermissionForApp.all === true || targetPermissionForApp.allowed[feature] === true) {
                userApps.push(appId);
            }
        }
    }
    return userApps;
};

exports.getAdminApps = function(member) {
    if (member.global_admin) {
        return [];
    }
    else {
        if (typeof member.permission !== "undefined") {
            return member.permission._.a;
        }
        else {
            return member.admin_of;
        }
    }
};