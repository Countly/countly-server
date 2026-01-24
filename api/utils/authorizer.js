/**
* Module providing one time authentication
* @module api/utils/authorizer
*/

/**
 * @typedef {import('../../types/authorizer').Authorizer} Authorizer
 * @typedef {import('../../types/authorizer').SaveOptions} SaveOptions
 * @typedef {import('../../types/authorizer').ReadOptions} ReadOptions
 * @typedef {import('../../types/authorizer').VerifyOptions} VerifyOptions
 * @typedef {import('../../types/authorizer').VerifyReturnOptions} VerifyReturnOptions
 * @typedef {import('../../types/authorizer').VerifyTokenOptions} VerifyTokenOptions
 * @typedef {import('../../types/authorizer').CheckIfExpiredOptions} CheckIfExpiredOptions
 * @typedef {import('../../types/authorizer').ExtendTokenOptions} ExtendTokenOptions
 * @typedef {import('../../types/authorizer').ClearExpiredTokensOptions} ClearExpiredTokensOptions
 * @typedef {import('../../types/authorizer').CleanOptions} CleanOptions
 * @typedef {import('../../types/authorizer').AuthToken} AuthToken
 */

var common = require('./common.js');
var crypto = require('crypto');
const log = require('./log.js')('core:authorizer');

/**
* Token validation function called from verify and verify return
* @param {VerifyTokenOptions} options - options for the task
* @param {boolean} return_owner states if in callback owner should be returned. If return_owner==false, returns true or false.
* @param {boolean=} return_data states if in callback all token data should be returned.
*/
var verify_token = function(options, return_owner, return_data) {
    options.db = options.db || common.db;
    if (!options.token || options.token === '') {
        if (typeof options.callback === 'function') {
            options.callback(false);
        }
        return;
    }
    else {
        options.token = options.token + '';
        options.db.collection('auth_tokens').findOne({_id: options.token}, function(err, res) {
            var valid = false;
            var expires_after = 0;
            if (res) {
                var valid_endpoint = true;
                if (Array.isArray(res.endpoint) && res.endpoint.length === 0) {
                    res.endpoint = '';
                }
                if (res.endpoint && res.endpoint !== '') {
                    //keep backwards compability
                    if (!Array.isArray(res.endpoint)) {
                        res.endpoint = [res.endpoint];
                    }
                    valid_endpoint = false;
                    if (options.req_path !== '') {
                        var my_regexp = '';
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
                if (res.app && res.app !== '') {
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
                        options.db.collection('auth_tokens').remove({_id: options.token});
                    }
                }
            }
            if (typeof options.callback === 'function') {
                options.callback(valid, expires_after);
            }
        });
    }
};

/** @lends module:api/utils/authorizer */
/** @type {Authorizer} */
var authorizer = {
    /**
    * Store token for later authentication
    * @param {SaveOptions} options - options for the task
    */
    save: function(options) {
        options.db = options.db || common.db;
        options.token = options.token || authorizer.getToken();
        options.ttl = options.ttl || 0;
        options.multi = options.multi || false;
        options.app = options.app || '';
        options.endpoint = options.endpoint || '';
        options.purpose = options.purpose || '';
        options.temporary = options.temporary || false; //If logged in with temporary token. Doesn't kill other sessions on logout

        if (options.endpoint !== '' && !Array.isArray(options.endpoint)) {
            options.endpoint = [options.endpoint];
        }

        if (options.app !== '' && !Array.isArray(options.app)) {
            options.app = [options.app];
        }

        if (options.owner && options.owner !== '') {
            options.owner = options.owner + '';
            options.db.collection('members').findOne({'_id': options.db.ObjectID(options.owner)}, function(err, member) {
                if (err) {
                    if (typeof options.callback === 'function') {
                        options.callback(err, '');
                        return;
                    }
                }
                else if (member) {
                    authorizer.clearExpiredTokens(options);
                    if (options.tryReuse === true) {
                        var rules = {'multi': options.multi, 'endpoint': options.endpoint, 'app': options.app, 'owner': options.owner, 'purpose': options.purpose};
                        if (options.purpose === 'LoggedInAuth') {
                            //Login token, allow switching from expiring to not expiring(and other way around)
                            //If there is changes to session expiration - this will allow to treat those tokens as same token.
                            rules.$or = [{'ttl': 0}, {'ttl': {'$gt': 0}, 'ends': {$gt: Math.round(Date.now() / 1000)}}];
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
                        options.db.collection('auth_tokens').findAndModify(rules, {}, {$set: setObj}, function(err_token, token) {
                            if (token && token.value) {
                                options.callback(err_token, token.value._id);
                            }
                            else {
                                options.db.collection('auth_tokens').insert({
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
                                    if (typeof options.callback === 'function') {
                                        options.callback(err1, options.token);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        options.db.collection('auth_tokens').insert({
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
                            if (typeof options.callback === 'function') {
                                options.callback(err1, options.token);
                            }
                        });
                    }
                }
                else {
                    if (typeof options.callback === 'function') {
                        options.callback('Token must have owner. Please provide correct user id', '');
                    }
                }
            });
        }
        else {
            if (typeof options.callback === 'function') {
                options.callback('Token must have owner. Please provide correct user id', '');
            }
        }
    },

    /**
    * Get whole token information from database
    * @param {ReadOptions} options - options for the task
    */
    read: function(options) {
        options.db = options.db || common.db;
        if (!options.token || options.token === '') {
            options.callback(Error('Token not given'), null);
        }
        else {
            options.token = options.token + '';
            options.db.collection('auth_tokens').findOne({_id: options.token}, options.callback);
        }
    },


    /**
    * Clear expired tokens from database
    * @param {ClearExpiredTokensOptions} options - options for the task
    */
    clearExpiredTokens: function(options) {
        var ends = Math.round(Date.now() / 1000);
        options.db.collection('auth_tokens').remove({ttl: {$gt: 0}, ends: {$lt: ends}});
    },

    /**
    * Checks if token is not expired yet
    * @param {CheckIfExpiredOptions} options - options for the task
    */
    check_if_expired: function(options) {
        options.db = options.db || common.db;
        options.token = options.token + '';
        options.db.collection('auth_tokens').findOne({_id: options.token}, function(err, res) {
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
    },

    /**
    * Extend token life span
    * @param {ExtendTokenOptions} options - options for the task
    */
    extend_token: function(options) {
        if (!options.token || options.token === '') {
            if (typeof options.callback === 'function') {
                options.callback(Error('Token not provided'), null);
            }
            return;
        }
        options.token = options.token + '';
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
            if (typeof options.callback === 'function') {
                options.callback(Error('Please provide extendTill or extendBy'), null);
            }
            return;
        }
        options.db.collection('auth_tokens').update({_id: options.token}, {$set: updateArr}, function(err) {
            if (typeof options.callback === 'function') {
                options.callback(err, true);
            }
        });
    },

    /**
    * Verify token and expire it
    * @param {VerifyOptions} options - options for the task
    */
    verify: function(options) {
        verify_token(options, false);
    },

    /** 
    * Similar to authorizer.verify. Only difference - return token owner if valid.
    * @param {VerifyReturnOptions} options - options for the task
    */
    verify_return: function(options) {
        if (options.return_data) {
            verify_token(options, false, true);
        }
        else {
            verify_token(options, true);
        }
    },

    /**
    * Generates auhtentication ID
    * @returns {string} id to be used when saving the task
    */
    getToken: function() {
        return crypto.createHash('sha1').update(crypto.randomBytes(16).toString('hex') + '' + new Date().getTime()).digest('hex');
    },

    /**
    * Clean all expired tokens
    * @param {CleanOptions} options - options for the task
    */
    clean: function(options) {
        options.db = options.db || common.db;
        options.db.collection('auth_tokens').remove({
            ends: {$lt: Math.round(Date.now() / 1000)},
            ttl: {$ne: 0}
        }, options.callback);
    }
};
module.exports = authorizer;