/**
* Module for validation functions that manage access rights to application data. Divided in parts access for Global Admins, Admins and Users.
* @module api/utils/rights
*/
var common = require("./common.js"),
    plugins = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird");
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

                if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) !== -1) || member.global_admin)) {
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

                if (!((member.admin_of && member.admin_of.indexOf(params.qstring.app_id) !== -1) || member.global_admin)) {
                    common.returnMessage(params, 401, 'User does not have write right for this application');
                    reject('User does not have write right for this application');
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