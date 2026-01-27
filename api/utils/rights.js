/**
* Module for validation functions that manage access rights to application data. Divided in parts access for Global Admins, Admins and Users.
* @module api/utils/rights
*/

/**
 * @typedef {import('../../types/requestProcessor').Params} Params
 * @typedef {import('../../types/authorizer').Authorizer} Authorizer
 */

var common = require("./common.js"),
    plugins = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird"),
    crypto = require('crypto'),
    log = require('./log.js')('core:rights');

/** @type {Authorizer} */
var authorize = require('./authorizer.js'); //for token validations

var collectionMap = {};//map to know when data about som collections/events was refreshed
var cachedSchema = {};

//check token and return owner id if token valid
//owner d used later to set all member variables.
/**Validate if token exists and is not expired(uzing authorize.js)
* @param {Params} params  params
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
                callback: function(valid) {
                //false or owner.id
                    if (valid) {
                        resolve(valid);
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
* Validate user for read access by api_key for provided app_id (both required parameters for the request). 
* User must exist, must not be locked, must pass plugin validation (if any) and have at least user access to the provided app (which also must exist).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information and app information.
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
* @param {Params} params - {@link params} object
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
 * Creates filter object  to filter by member allowed collections
 * @param {object} member - members object from params
 * @param {string} dbName  - database name as string
 * @param {string} collectionName  - collection Name
 * @returns {object} filter object
 */
exports.getBaseAppFilter = function(member, dbName, collectionName) {
    var base_filter = {};
    var apps = exports.getUserApps(member);
    if (dbName === "countly_drill" && collectionName === "drill_events") {
        if (Array.isArray(apps) && apps.length > 0) {
            base_filter.a = {"$in": apps};
        }
    }
    else if (dbName === "countly" && collectionName === "events_data") {
        var in_array = [];
        if (Array.isArray(apps) && apps.length > 0) {
            for (var i = 0; i < apps.length; i++) {
                in_array.push(new RegExp("^" + apps[i] + "_.*"));
            }
            base_filter = {"_id": {"$in": in_array}};
        }
    }
    return base_filter;
};
/**
* Validate user for create access by api_key for provided app_id (both required parameters for the request).
* @param {Params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateCreate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'c', callback, callbackParam);
};

/**
* Validate user for update access by api_key for provided app_id (both required parameters for the request).
* @param {Params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any=} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateUpdate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'u', callback, callbackParam);
};

/**
* Validate user for delete access by api_key for provided app_id (both required parameters for the request).
* @param {Params} params - {@link params} object
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
    return isAdmin || member.global_admin;
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