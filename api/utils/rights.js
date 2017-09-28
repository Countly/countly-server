/**
* Module for validation functions that manage access rights to application data. Divided in parts access for Global Admins, Admins and Users.
* @module api/utils/rights
*/
var common = require("./common.js"),
    plugins = require('../../plugins/pluginManager.js'),
    Promise = require("bluebird");

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
    return new Promise(function(resolve, reject){
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
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
    
            if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
                common.returnMessage(params, 401, 'User does not have view right for this application');
                reject('User does not have view right for this application');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                reject('User is locked');
                return false;
            }
    
            common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
                if (!app) {
                    common.returnMessage(params, 401, 'App does not exist');
                    reject('App does not exist');
                    return false;
                }
                params.member = member;
                params.app_id = app['_id'];
                params.app_cc = app['country'];
                params.appTimezone = app['timezone'];
                params.app = app;
                params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                
                if(plugins.dispatch("/validation/user", {params:params})){
                    if(!params.res.finished){
                        common.returnMessage(params, 401, 'User does not have permission');
                        reject('User does not have permission');
                    }
                    return false;
                }
                
                plugins.dispatch("/o/validate", {params:params, app:app});
                
                resolve();
    
                if (callbackParam) {
                    callback(callbackParam, params);
                } else {
                    callback(params);
                }
            });
        });
    });
}

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
    return new Promise(function(resolve, reject){
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                reject('User does not exist');
                return false;
            }
    
            if (!((member.admin_of && member.admin_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
                common.returnMessage(params, 401, 'User does not have write right for this application');
                reject('User does not have write right for this application');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                reject('User is locked');
                return false;
            }
    
            common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
                if (!app) {
                    common.returnMessage(params, 401, 'App does not exist');
                    reject('App does not exist');
                    return false;
                }
    
                params.app_id = app['_id'];
                params.appTimezone = app['timezone'];
                params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                params.member = member;
                
                if(plugins.dispatch("/validation/user", {params:params})){
                    if(!params.res.finished){
                        common.returnMessage(params, 401, 'User does not have permission');
                        reject('User does not have permission');
                    }
                    return false;
                }
  
                resolve();
                
                if (callbackParam) {
                    callback(callbackParam, params);
                } else {
                    callback(params);
                }
            });
        });
    });
}

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
    return new Promise(function(resolve, reject){
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
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
            
            if(plugins.dispatch("/validation/user", {params:params})){
                if(!params.res.finished){
                    common.returnMessage(params, 401, 'User does not have permission');
                    reject('User does not have permission');
                }
                return false;
            }
            
            resolve();
    
            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    });
}

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
exports.validateUser = function (params, callback, callbackParam) {
    return new Promise(function(resolve, reject){
        //old backwards compatability call check
        if(typeof params === "function"){
            var temp = params;
            params = callback;
            callback = temp;
        }
        
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
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
            
            if(plugins.dispatch("/validation/user", {params:params})){
                if(!params.res.finished){
                    common.returnMessage(params, 401, 'User does not have permission');
                    reject('User does not have permission');
                }
                return false;
            }
            
            resolve();
            
            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    });
};