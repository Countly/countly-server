/**
* Module providing one time authentication
* @module api/utils/authorizer
*/

/** @lends module:api/utils/authorizer */
var authorizer = {};
var common = require("./common.js");
var crypto = require("crypto");
const log = require('./log.js')('core:authorizer');


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
* @param {string} options.tryReuse - if true - tries to find not expired token with same parameters. If not founds cretes new token. If found - updates token expiration time to new one and returns token.
* @param {bool} [options.temporary=false] - If logged in with temporary token. Doesn't kill other sessions on logout.
* @param {function} options.callback - function called when saving was completed or errored, providing error object as first param and token string as second
*/
authorizer.save = function(options) {
    options.db = options.db || common.db;
    options.token = options.token || authorizer.getToken();
    options.ttl = options.ttl || 0;
    options.multi = options.multi || false;
    options.app = options.app || "";
    options.endpoint = options.endpoint || "";
    options.purpose = options.purpose || "";
    options.temporary = options.temporary || false; //If logged in with temporary token. Doesn't kill other sessions on logout

    if (options.endpoint !== "" && !Array.isArray(options.endpoint)) {
        options.endpoint = [options.endpoint];
    }

    if (options.app !== "" && !Array.isArray(options.app)) {
        options.app = [options.app];
    }

    if (options.owner && options.owner !== "") {
        options.owner = options.owner + "";
        options.db.collection('members').findOne({'_id': options.db.ObjectID(options.owner)}, function(err, member) {
            if (err) {
                if (typeof options.callback === "function") {
                    options.callback(err, "");
                    return;
                }
            }
            else if (member) {
                authorizer.clearExpiredTokens(options);
                if (options.tryReuse === true) {
                    var rules = {"multi": options.multi, "endpoint": options.endpoint, "app": options.app, "owner": options.owner, "purpose": options.purpose};
                    if (options.purpose === "LoggedInAuth") {
                        //Login token, allow switching from expiring to not expiring(and other way around)
                        //If there is changes to session expiration - this will allow to treat those tokens as same token.
                        rules.$or = [{"ttl": 0}, {"ttl": {"$gt": 0}, "ends": {$gt: Math.round(Date.now() / 1000)}}];
                    }
                    else {
                        if (options.ttl > 0) {
                            rules.ttl = {$gt: 0};
                            rules.ends = {$gt: Math.round(Date.now() / 1000)};
                        }
                        else {
                            rules.ttl = options.ttl;
                        }
                    }


                    var setObj = {ttl: options.ttl};
                    setObj.ends = options.ttl + Math.round(Date.now() / 1000);
                    options.db.collection("auth_tokens").findAndModify(rules, {}, {$set: setObj}, function(err_token, token) {
                        if (token && token.value) {
                            options.callback(err_token, token.value._id);
                        }
                        else {
                            options.db.collection("auth_tokens").insert({
                                _id: options.token,
                                ttl: options.ttl,
                                ends: options.ttl + Math.round(Date.now() / 1000),
                                multi: options.multi,
                                owner: options.owner,
                                app: options.app,
                                endpoint: options.endpoint,
                                purpose: options.purpose,
                                temporary: options.temporary
                            }, function(err1) {
                                if (typeof options.callback === "function") {
                                    options.callback(err1, options.token);
                                }
                            });
                        }
                    });
                }
                else {
                    options.db.collection("auth_tokens").insert({
                        _id: options.token,
                        ttl: options.ttl,
                        ends: options.ttl + Math.round(Date.now() / 1000),
                        multi: options.multi,
                        owner: options.owner,
                        app: options.app,
                        endpoint: options.endpoint,
                        purpose: options.purpose,
                        temporary: options.temporary
                    }, function(err1) {
                        if (typeof options.callback === "function") {
                            options.callback(err1, options.token);
                        }
                    });
                }
            }
            else {
                if (typeof options.callback === "function") {
                    options.callback("Token must have owner. Please provide correct user id", "");
                }
            }
        });
    }
    else {
        if (typeof options.callback === "function") {
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
authorizer.read = function(options) {
    options.db = options.db || common.db;
    if (!options.token || options.token === "") {
        options.callback(Error('Token not given'), null);
    }
    else {
        options.token = options.token + "";
        options.db.collection("auth_tokens").findOne({_id: options.token}, options.callback);
    }
};


authorizer.clearExpiredTokens = function(options) {
    var ends = Math.round(Date.now() / 1000);
    options.db.collection("auth_tokens").remove({ttl: {$gt: 0}, ends: {$lt: ends}});
};

/**
* Checks if token is not expired yet
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.token - token to rvalidate
* @param {function} options.callback - function called when reading was completed or errored, providing error object as first param, true or false if expired as second, seconds till expiration as third.(-1 if never expires, 0 - if expired) 
*/
authorizer.check_if_expired = function(options) {
    options.db = options.db || common.db;
    options.token = options.token + "";
    options.db.collection("auth_tokens").findOne({_id: options.token}, function(err, res) {
        var expires_after = 0;
        var valid = false;
        if (res) {
            if (res.ttl > 0 && res.ends >= Math.round(Date.now() / 1000)) {
                valid = true;
                expires_after = res.ends - Math.round(Date.now() / 1000);
            }
            else if (res.ttl === 0) {
                valid = true;
                expires_after = -1;
            }
        }
        options.callback(err, valid, expires_after);
    });
};

/**
* extent token life spas
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.token - token to extend
* @param {string} options.extendBy - extend token by given time(in ms)(optional) You have to provide extedBy or extendTill. extendBy==0 makes it never die
* @param {string} options.extendTill - extend till given timestamp. (optional) You have to provide extedBy or extendTill
* @param {function} options.callback - function called when reading was completed or errored, providing error object as first param and true as second if extending successful
*/
authorizer.extend_token = function(options) {
    if (!options.token || options.token === "") {
        if (typeof options.callback === "function") {
            options.callback(Error("Token not provided"), null);
        }
        return;
    }
    options.token = options.token + "";
    options.db = options.db || common.db;
    var updateArr = {
        ttl: 0,
        ends: 0
    };
    if (options.extendBy) {
        updateArr.ends = Math.round((options.extendBy + Date.now()) / 1000);
        updateArr.ttl = options.extendBy;
    }
    else if (options.extendTill) {
        updateArr.ends = Math.round(options.extendTill / 1000);
        updateArr.ttl = 1;
    }
    else {
        if (typeof options.callback === "function") {
            options.callback(Error("Please provide extendTill or extendBy"), null);
        }
        return;
    }
    options.db.collection("auth_tokens").update({_id: options.token}, {$set: updateArr}, function(err) {
        if (typeof options.callback === "function") {
            options.callback(err, true);
        }
    });
};
/**
* Token validation function called from verify and verify return
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.token - token to validate
* @param {string} options.qstring - params.qstring. If not passed and there is limitation for this token on params - token will not be valid
* @param {function} options.callback - function called when verifying was completed or errored, providing error object as first param and true as second if extending successful
* @param {boolean} return_owner states if in callback owner shold be returned. If return_owner==false, returns true or false.
* @param {boolean} return_data states if in callback all token data should be returned.
*/
var verify_token = function(options, return_owner, return_data) {
    options.db = options.db || common.db;
    if (!options.token || options.token === "") {
        if (typeof options.callback === "function") {
            options.callback(false);
        }
        return;
    }
    else {
        options.token = options.token + "";
        options.db.collection("auth_tokens").findOne({_id: options.token}, function(err, res) {
            var valid = false;
            var expires_after = 0;
            if (res) {
                var valid_endpoint = true;
                if (Array.isArray(res.endpoint) && res.endpoint.length === 0) {
                    res.endpoint = "";
                }
                if (res.endpoint && res.endpoint !== "") {
                    //keep backwards compability
                    if (!Array.isArray(res.endpoint)) {
                        res.endpoint = [res.endpoint];
                    }
                    valid_endpoint = false;
                    if (options.req_path !== "") {
                        var my_regexp = "";
                        for (var p = 0; p < res.endpoint.length; p++) {
                            if (res.endpoint[p] && res.endpoint[p].endpoint) {
                                var missing_param = false;
                                if (res.endpoint[p].params) {
                                    for (var k in res.endpoint[p].params) {
                                        try {
                                            var my_regexp2 = new RegExp(res.endpoint[p].params[k]);
                                            if (!options.qstring || !options.qstring[k] || !my_regexp2.test(options.qstring[k])) {
                                                missing_param = true;
                                            }
                                        }
                                        catch (e) {
                                            log.e("Invalid regex: '" + res.endpoint[p].params[k] + "'");
                                            missing_param = true;
                                        }
                                    }
                                }
                                try {
                                    my_regexp = new RegExp(res.endpoint[p].endpoint);
                                    if (!missing_param && my_regexp.test(options.req_path)) {
                                        valid_endpoint = true;
                                    }
                                }
                                catch (e) {
                                    log.e("Invalid regex: '" + res.endpoint[p].endpoint + "'");
                                }
                            }
                            else {
                                try {
                                    my_regexp = new RegExp(res.endpoint[p]);
                                    if (my_regexp.test(options.req_path)) {
                                        valid_endpoint = true;
                                    }
                                }
                                catch (e) {
                                    log.e("Invalid regex: '" + res.endpoint[p] + "'");
                                }
                            }
                        }
                    }
                }
                var valid_app = true;
                if (res.app && res.app !== "") {
                    //keep backwards compability
                    if (!Array.isArray(res.app)) {
                        res.app = [res.app];
                    }
                    if (options.qstring && options.qstring.app_id) {
                        if (res.app.indexOf(options.qstring.app_id) === -1) {
                            valid_app = false;
                        }
                    }
                }

                if (valid_endpoint && valid_app) {
                    if (res.ttl === 0) {
                        valid = true;
                        expires_after = -1;
                        if (return_owner) {
                            valid = res.owner;
                        }
                        else if (return_data) {
                            valid = res;
                        }
                    }
                    else if (res.ends >= Math.round(Date.now() / 1000)) {
                        valid = true;
                        expires_after = Math.max(0, res.ends - Math.round(Date.now() / 1000));
                        if (return_owner) {
                            valid = res.owner;
                        }
                        else if (return_data) {
                            valid = res;
                        }
                    }

                    //consume token if expired or not multi
                    if (!res.multi || (res.ttl > 0 && res.ends < Math.round(Date.now() / 1000))) {
                        options.db.collection("auth_tokens").remove({_id: options.token});
                    }
                }
            }
            if (typeof options.callback === "function") {
                options.callback(valid, expires_after);
            }
        });
    }
};
    /**
* Verify token and expire it
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.token - token to verify
* @param {string} options.qstring - params.qstring. If not passed and there is limitation for this token on params - token will not be valid
* @param {string} options.req_path - current request path
* @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
*/
authorizer.verify = function(options) {
    verify_token(options, false);
};

/** 
* Similar to authorizer.verify. Only difference - return token owner if valid.
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {string} options.token - token to verify
* @param {string} options.qstring - params.qstring. If not passed and there is limitation for this token on params - token will not be valid
* @param {string} options.req_path - current request path
* @param {function} options.callback - function called when verifying was completed, providing 1 argument, true if could verify token and false if couldn't
*/
authorizer.verify_return = function(options) {
    if (options.return_data) {
        verify_token(options, false, true);
    }
    else {
        verify_token(options, true);
    }
};
/**
* Generates auhtentication ID
* @returns {string} id to be used when saving the task
*/
authorizer.getToken = function() {
    return crypto.createHash('sha1').update(crypto.randomBytes(16).toString("hex") + "" + new Date().getTime()).digest('hex');
};

/**
* Clean all expired tokens
* @param {object} options - options for the task
* @param {object} options.db - database connection
* @param {function} options.callback - function called when cleaning completed
*/
authorizer.clean = function(options) {
    options.db = options.db || common.db;
    options.db.collection("auth_tokens").remove({
        ends: {$lt: Math.round(Date.now() / 1000)},
        ttl: {$ne: 0}
    }, options.callback);
};

module.exports = authorizer;