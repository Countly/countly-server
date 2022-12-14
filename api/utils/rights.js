/**
* Module for validation functions that manage access rights to application data. Divided in parts access for Global Admins, Admins and Users.
* @module api/utils/rights
*/
var common = require("./common.js"),
    plugins = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird"),
    async = require('async'),
    crypto = require('crypto'),
    log = require('./log.js')('core:rights');

var authorize = require('./authorizer.js'); //for token validations

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
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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

                if (!member.global_admin && member.permission._.a.indexOf(params.qstring.app_id) === -1) {
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
* Basic user validation by api_key (required parameter for the request), mostly used for custom validation afterwards (like multi app access).
* User must exist, must not be locked and must pass plugin validation (if any).
* If user does not pass validation, it outputs error to request. In case validation passes, provided callback is called.
* Additionally populates params with member information.
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
* @param {params} params - {@link params} object
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function 
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
* Get events data
* A helper function for db access check
* @param {object} params - {@link params} object
* @param {array} apps - array with each element being app document
* @param {function} callback - callback method
**/
function dbLoadEventsData(params, apps, callback) {

    /**
    * Get events collections with replaced app names
    * A helper function for db access check
    * @param {object} app - application object
    * @param {function} cb - callback method
    **/
    function getEvents(app, cb) {
        var result = {};
        common.db.collection('events').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, events) {
            if (!err && events && events.list) {
                for (let i = 0; i < events.list.length; i++) {
                    result[crypto.createHash('sha1').update(events.list[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + events.list[i] + ")";
                }
            }
            if (plugins.internalDrillEvents) {
                for (let i = 0; i < plugins.internalDrillEvents.length; i++) {
                    result[crypto.createHash('sha1').update(plugins.internalDrillEvents[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + plugins.internalDrillEvents[i] + ")";
                }
            }
            if (plugins.internalEvents) {
                for (let i = 0; i < plugins.internalEvents.length; i++) {
                    result[crypto.createHash('sha1').update(plugins.internalEvents[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + plugins.internalEvents[i] + ")";
                }
            }
            cb(null, result);
        });
    }

    /**
    * Get views collections with replaced app names
    * A helper function for db access check
    * @param {object} app - application object
    * @param {function} cb - callback method
    **/
    function getViews(app, cb) {
        var result = {};
        common.db.collection('views').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, viewDoc) {
            if (!err && viewDoc && viewDoc.segments) {
                for (var segkey in viewDoc.segments) {
                    result["app_viewdata" + crypto.createHash('sha1').update(segkey + app._id).digest('hex')] = "(" + app.name + ": " + segkey + ")";
                }
            }
            result["app_viewdata" + crypto.createHash('sha1').update("" + app._id).digest('hex')] = "(" + app.name + ": no-segment)";
            cb(null, result);
        });
    }

    if (params.member.eventList) {
        callback(null, params.member.eventList, params.member.viewList);
    }
    else {
        async.map(apps, getEvents, function(err, events) {
            var eventList = {};
            for (let i = 0; i < events.length; i++) {
                for (var j in events[i]) {
                    eventList[j] = events[i][j];
                }
            }
            params.member.eventList = eventList;
            async.map(apps, getViews, function(err1, views) {
                var viewList = {};
                for (let i = 0; i < views.length; i++) {
                    for (let z in views[i]) {
                        viewList[z] = views[i][z];
                    }
                }
                params.member.viewList = viewList;
                callback(err, eventList, viewList);
            });
        });
    }
}
exports.dbLoadEventsData = dbLoadEventsData;

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
        apps = apps.filter(id => id + "" === app_id + "");
    }
    var appList = [];
    if (collection.indexOf("events") === 0 || collection.indexOf("drill_events") === 0) {
        for (let i = 0; i < apps.length; i++) {
            if (apps[i].length) {
                appList.push({_id: apps[i]});
            }
        }
        dbLoadEventsData(params, appList, function(err, eventList/*, viewList*/) {
            if (err) {
                log.e("[rights.js].dbUserHasAccessToCollection() failed at dbLoadEventsData (events) callback.", err);
                return callback(false);
            }
            for (let i in eventList) {
                if (collection.indexOf(i, collection.length - i.length) !== -1) {
                    return callback(true);
                }
            }
            return callback(false);
        });
    }
    else if (collection.indexOf("app_viewdata") === 0) {
        for (let i = 0; i < apps.length; i++) {
            if (apps[i].length) {
                appList.push({_id: apps[i]});
            }
        }

        dbLoadEventsData(params, appList, function(err, eventList, viewList) {
            if (err) {
                log.e("[rights.js].dbUserHasAccessToCollection() failed at dbLoadEventsData (app_viewdata) callback.", err);
                return callback(false);
            }
            for (let i in viewList) {
                if (collection.indexOf(i, collection.length - i.length) !== -1) {
                    return callback(true);
                }
            }
            return callback(false);
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
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
                            for (var i = 0; i < feature.length; i++) {
                                if (isPermissionObjectExistForRead && (member.permission.r[params.qstring.app_id].all || (member.permission.r[params.qstring.app_id].allowed && member.permission.r[params.qstring.app_id].allowed[feature[i]]))) {
                                    isFeatureAllowedInReadPermissionObject = true;
                                    break;
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
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
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
* Validate user for create access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateCreate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'c', callback, callbackParam);
};

/**
* Validate user for update access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateUpdate = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'u', callback, callbackParam);
};

/**
* Validate user for delete access by api_key for provided app_id (both required parameters for the request).
* @param {params} params - {@link params} object
* @param {string} feature - feature that trying to access
* @param {function} callback - function to call only if validation passes
* @param {any} callbackParam - parameter to pass to callback function (params is automatically passed to callback function, no need to include that)
*/
exports.validateDelete = function(params, feature, callback, callbackParam) {
    validateWrite(params, feature, 'd', callback, callbackParam);
};

/**
 * Is user has admin access on selected app?
 * @param {object} member - member object from params
 * @param {string} app_id - id value of related app
 * @returns {boolean} isAdmin - is that user has admin access on that app?
 */
exports.hasAdminAccess = function(member, app_id) {
    var hasPermissionObject = typeof member.permission !== "undefined";

    if (hasPermissionObject && member.permission._ && member.permission._.a && member.permission._.a.includes(app_id)) {
        return true;
    }

    var isAdmin = true;
    // check users who has permission property
    if (hasPermissionObject) {
        var types = ["c", "r", "u", "d"];
        for (var i = 0; i < types.length; i++) {
            if (!member.permission[types[i]][app_id].all) {
                isAdmin = false;
            }
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
    return member.global_admin || member.permission.c[app_id].allowed[feature] || member.permission.c[app_id].all;
};

exports.hasReadRight = function(feature, app_id, member) {
    return member.global_admin || member.permission.r[app_id].allowed[feature] || member.permission.r[app_id].all;
};

exports.hasUpdateRight = function(feature, app_id, member) {
    return member.global_admin || member.permission.u[app_id].allowed[feature] || member.permission.u[app_id].all;
};

exports.hasDeleteRight = function(feature, app_id, member) {
    return member.global_admin || member.permission.d[app_id].allowed[feature] || member.permission.d[app_id].all;
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