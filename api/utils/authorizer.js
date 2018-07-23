/**
* Module providing one time authentication
* @module api/utils/authorizer
*/

/** @lends module:api/utils/authorizer */
var authorizer = {};
var common = require("./common.js");
var crypto = require("crypto");
    
(function (authorizer) {
    /**
    * Store token for later authentication
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {number} options.ttl - amount of seconds for token to work, 0 works indefinately
    * @param {bool} [options.multi=false] - if true, can be used many times until expired
    * @param {string} options.token - token to store, if not provided, will be generated
    * @param {string} options.owner - id of the user who created this token
    * @param {string} options.app - list of the apps for which token was created
    * @param {string} options.endpoint - regexp of endpoint(any string - is used as substring,to mach exact ^{yourpath}$)
    * @param {function} options.callback - function called when saving was completed or errored, providing error object as first param and token string as second
    */
    authorizer.save = function (options) {
        options.db = options.db || common.db;
        options.token = options.token || authorizer.getToken();
        options.ttl = options.ttl || 0;
        options.multi = options.multi || false;
        options.owner = options.owner+"" || "";
        options.app = options.app || "";
        options.endpoint = options.endpoint || "";
        options.purpose = options.purpose || "";
            
        if(options.endpoint!="" && !Array.isArray(options.endpoint))
            options.endpoint = [options.endpoint];
            
        if(options.app!="" && !Array.isArray(options.app))
            options.app = [options.app];
        
        if(options.owner!="") {
            options.db.collection('members').findOne({'_id':options.db.ObjectID(options.owner)}, function (err, member) {
                if(err) {
                    if(typeof options.callback === "function"){
                        options.callback(err, "");
                        return;
                    }
                }
                else if(member) {
                    options.db.collection("auth_tokens").insert({_id:options.token, ttl:options.ttl, ends:options.ttl+Math.round(Date.now()/1000), multi:options.multi, owner:options.owner, app:options.app,endpoint:options.endpoint,purpose:options.purpose}, function(err, res){
                        if(typeof options.callback === "function"){
                            options.callback(err, options.token);
                        }
                    });
                }
                else {
                    if(typeof options.callback === "function"){
                        options.callback("Token must have owner. Please provide correct user id", "");
                    }
                }
            });
        }
        else {
            if(typeof options.callback === "function"){
                options.callback("Token must have owner. Please provide correct user id", "");
            }
        } 
    };
    
    /**
    * Get whole token information from database
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.token - token to read
    * @param {function} options.callback - function called when reading was completed or errored, providing error object as first param and token object from database as second
    */
    authorizer.read = function (options) {
        options.db = options.db || common.db;
        options.token = options.token;
        if(!options.token || options.token=="")
            options.callback(Error('Token not given'),null);
        else
            options.db.collection("auth_tokens").findOne({_id:options.token}, options.callback);
    };
    
    /**
    Token validation function called from verify and verify return
    */
    var verify_token = function(options, return_owner){
        options.db = options.db || common.db;
        options.token = options.token;

        if(!options.token || options.token=="") {
            options.callback(false);
            return;
        }
        else {
            options.db.collection("auth_tokens").findOne({_id:options.token},function(err, res){
                var valid = false;
                if(res){
                    var  valid_endpoint=true;
                    if(res.endpoint && res.endpoint!="") {
                        if(!Array.isArray(res.endpoint))//keep backwards compability
                            res.endpoint = [res.endpoint];
                        if(options.req_path!=""){
                            valid_endpoint=false;
                            for(var p=0; p<res.endpoint.length; p++){
                                var my_regexp = new RegExp(res.endpoint[p]);
                                if(my_regexp.test(options.req_path))
                                    valid_endpoint=true;
                            }
                        }
                    }
                    var valid_app = true;
                    if(res.app && res.app!=""){
                        if(!Array.isArray(res.app))//keep backwards compability
                            res.app = [res.app];
                        if(options.qstring && options.qstring.app_id){
                            valid_app = false;
                            for(var p=0; p<res.app.length; p++) {
                                if(res.app[p]==options.qstring.app_id)
                                    valid_endpoint=true;
                            }
                        }
                    }
                    
                    if(valid_endpoint && valid_app) {
                        if(res.ttl === 0){
                            valid = true;
                            if(return_owner)
                                valid = res.owner;
                        }
                        else if(res.ends >= Math.round(Date.now()/1000)){
                            valid = true;
                            if(return_owner)
                                valid = res.owner;
                        }
                        
                        //consume token if expired or not multi
                        if(!res.multi || (res.ttl > 0 && res.ends < Math.round(Date.now()/1000)))
                            options.db.collection("auth_tokens").remove({_id:options.token});
                    }
                }
                if(typeof options.callback === "function"){
                    options.callback(valid);
                }
            });
        }
    }
    /**
    * Verify token and expire it
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.token - token to verify
    * @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
    */
    authorizer.verify = function (options) {
        verify_token(options, false);
    };
    
    /** 
    * Similar to authorizer.verify. Only difference - return token owner if valid.
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.token - token to verify
    * @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
    */
    authorizer.verify_return= function (options) {
        verify_token(options, true);
    };
    /**
    * Generates auhtentication ID
    * @returns {string} id to be used when saving the task
    */
    authorizer.getToken = function(){
        return crypto.createHash('sha1').update(crypto.randomBytes(16).toString("hex")+""+new Date().getTime()).digest('hex');
    };
    
    /**
    * Clean all expired tokens
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {function} options.callback - function called when cleaning completed
    */
    authorizer.clean = function (options) {
        options.db = options.db || common.db;
        options.db.collection("auth_tokens").remove({ends:{$lt:Math.round(Date.now()/1000)}, ttl:{$ne:0}},options.callback);
    };
    
}(authorizer));

module.exports = authorizer;
