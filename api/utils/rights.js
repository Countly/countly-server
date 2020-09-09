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

                // is member.permission exist?
                // is member.permission an object?
                // is params.qstring.app_id property of member.permission object?
                // is member.permission.r[app_id].all is true?
                // or member.global_admin?
                if (!(member.permission && typeof member.permission.r === "object" && typeof member.permission.r[params.qstring.app_id] === "object" && member.permission.r[params.qstring.app_id].all || member.global_admin)) {
                    common.returnMessage(params, 401, 'User does not have view right for this application');
                    reject('User does not have view right for this application');
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
                            common.returnMessage(params, 401, 'User does not have permission');
                            reject('User does not have permission');
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

                var grantAccess = true;

                if (!member.global_admin) {
                    if (typeof member.permission === "object") {
                        Object.keys(member.permission).forEach(function(key) {
                            if (!(typeof member.permission[key][params.qstring.app_id] === "object" && member.permission[key][params.qstring.app_id].all)) {
                                grantAccess = false;
                            }
                        });

                        if (!grantAccess) {
                            common.returnMessage(params, 401, 'User does not have write right for this application');
                            reject('User does not have write right for this application');
                            return false;
                        }
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have write right for this application');
                        reject('User does not have write right for this application');
                        return false;
                    }
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
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                    params.member = member;

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have permission');
                            reject('User does not have permission');
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
                    common.returnMessage(params, 401, 'User does not have global admin right');
                    reject('User does not have global admin right');
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
                        common.returnMessage(params, 401, 'User does not have permission');
                        reject('User does not have permission');
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
                        common.returnMessage(params, 401, 'User does not have permission');
                        reject('User does not have permission');
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
    if (callback) {
        promise.asCallback(function(err) {
            if (!err) {
                if (callbackParam) {
                    callback(callbackParam, params);
                }
                else {
                    callback(params);
                }
            }
        });
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
* @param {function} callback - callback method includes boolean variable as argument
* @returns {function} returns callback
**/
exports.dbUserHasAccessToCollection = function(params, collection, callback) {
    if (params.member.global_admin && !params.qstring.app_id) {
        //global admin without app_id restriction just has access to everything
        return callback(true);
    }

    var apps = [];
    if (params.qstring.app_id) {
        //if app_id was provided, we need to check if user has access for this app_id
        // is user has read permission for current app
        var hasReadAccess = params.member.permission && typeof params.member.permission.r[params.qstring.app_id] === "object" && params.member.permission.r[params.qstring.app_id].all;
        // leave it for backwards compatibility
        var isRestricted = params.member.app_restrict && params.member.app_restrict[params.qstring.app_id] && params.member.app_restrict[params.qstring.app_id].indexOf("#/manage/db");
        if (params.member.global_admin || hasReadAccess && !isRestricted) {
            apps = [params.qstring.app_id];
        }
    }
    else {
        //use whatever user has permission for
        apps = Object.keys(params.member.permission.r) || [];
        // also check for app based restrictions
        if (params.member.app_restrict) {
            for (var app_id in params.member.app_restrict) {
                if (params.member.app_restrict[app_id].indexOf("#/manage/db") !== -1 && apps.indexOf(app_id) !== -1) {
                    apps.splice(apps.indexOf(app_id), 1);
                }
            }
        }
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

                if (typeof params.qstring.app_id === "undefined") {
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
                    if (feature.substr(0, 7) === 'global_') {
                        feature = feature.split('_')[1];
                        if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r.global === "object") && (member.permission.r.global.all || member.permission.r.global.allowed[feature]))) {
                            common.returnMessage(params, 401, 'User does not have view right for this application');
                            reject('User does not have view right for this application');
                            return false;
                        }
                    }
                    else if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r[params.qstring.app_id] === "object") && (member.permission.r[params.qstring.app_id].all || member.permission.r[params.qstring.app_id].allowed[feature]))) {
                        common.returnMessage(params, 401, 'User does not have view right for this application');
                        reject('User does not have view right for this application');
                        return false;
                    }
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
                            common.returnMessage(params, 401, 'User does not have permission');
                            reject('User does not have permission');
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
                    if (feature.substr(0, 7) === 'global_') {
                        feature = feature.split('_')[1];
                        if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType].global === "object") && (member.permission[accessType].global.all || member.permission[accessType].global.allowed[feature]))) {
                            common.returnMessage(params, 401, 'User does not have view right for this application');
                            reject('User does not have view right for this application');
                            return false;
                        }
                    }
                    else if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType][params.qstring.app_id] === "object") && (member.permission[accessType][params.qstring.app_id].all || member.permission[accessType][params.qstring.app_id].allowed[feature]))) {
                        common.returnMessage(params, 401, 'User does not have view right for this application');
                        reject('User does not have view right for this application');
                        return false;
                    }
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
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                    params.member = member;

                    if (plugins.dispatch("/validation/user", {params: params})) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 401, 'User does not have permission');
                            reject('User does not have permission');
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