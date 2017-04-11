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
    * @param {function} options.callback - function called when saving was completed or errored, providing error object as first param and token string as second
    */
    authorizer.save = function (options) {
        options.db = options.db || common.db;
        options.token = options.token || authorizer.getToken();
        options.ttl = options.ttl || 0;
        options.multi = options.multi || false;
        options.owner = options.owner || "";
        options.db.collection("auth_tokens").insert({_id:options.token, ttl:options.ttl, ends:options.ttl+Math.round(Date.now()/1000)}, function(err, res){
            if(typeof options.callback === "function"){
                options.callback(err, options.token);
            }
        });
    };
    
    /**
    * Verify token and expire it
    * @param {object} options - options for the task
    * @param {object} options.db - database connection
    * @param {string} options.token - token to store, if not provided, will be generated
    * @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
    */
    authorizer.verify = function (options) {
        options.db = options.db || common.db;
        options.token = options.token || authorizer.getToken();
        options.db.collection("auth_tokens").findOne({_id:options.token},function(err, res){
            var valid = false;
            if(res){
                if(res.ttl === 0)
                    valid = true;
                else if(res.ends >= Math.round(Date.now()/1000))
                    valid = true;
                
                //consume token if expired or not multi
                if(!res.multi || (res.ttl > 0 && res.ends > Math.round(Date.now()/1000)))
                    options.db.collection("auth_tokens").remove({_id:options.token});
            }
            if(typeof options.callback === "function"){
                options.callback(valid);
            }
        });
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