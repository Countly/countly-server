/**
 * Module contaning functions for basic user operations: login, logout, setup, settings
 * @module frontend/express/libs/members
 * @example
 * var plugins = require('../../plugins/pluginManager.js'); //need for db
 * var countlyDb = plugins.dbConnection(countlyConfig); //get db connection
 * var membersUtility = require("./libs/members.js");
 * membersUtility.db = countlyDB; //setting db before using any function
 *
 */

var authorize = require('./../../../api/utils/authorizer.js'); //for token validations
var common = require('./../../../api/utils/common.js');
var plugins = require('./../../../plugins/pluginManager.js');
var { getUserApps } = require('./../../../api/utils/rights.js');
var configs = require('./../config', 'dont-enclose');
var countlyMail = require('./../../../api/parts/mgmt/mail.js');
var countlyStats = require('./../../../api/parts/data/stats.js');
var request = require('request');
var url = require('url');
var crypto = require('crypto');
var argon2 = require('argon2');

var versionInfo = require('./../version.info'),
    COUNTLY_TYPE = versionInfo.type;

/** @lends module:frontend/express/libs/members */
var membersUtility = { };
//Helper functions
/**
 * @property {object} db - Data base connection. Needs to be set befoe callng any other function.
 */
membersUtility.db = null;
/**
 * @property {object} countlyConfig - countly configuration object
 */
membersUtility.countlyConfig = configs;
if (membersUtility.countlyConfig.web && membersUtility.countlyConfig.web.track === "all") {
    membersUtility.countlyConfig.web.track = null;
}

/**
 * @property {object} emptyPermission - empty crud permission
 */
membersUtility.emptyPermission = {
    "permission": {
        "c": {},
        "r": {},
        "u": {},
        "d": {},
        "_": {
            "a": [],
            "u": [
                []
            ]
        }
    }
};

/** Checks remote configuration and sets variables to configuration object
 * @param {object} countlyConfigOrig - configuration settings object. Original(ar read from file)
 * @param {object} countlyConfig - contiguration. Changes if are done on this object.
*/
membersUtility.recheckConfigs = function(countlyConfigOrig, countlyConfig) {
    var checkUrl = "https://count.ly/configurations/ce/tracking";
    if (COUNTLY_TYPE !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
        checkUrl = "https://count.ly/configurations/ee/tracking";
    }
    if (!plugins.getConfig("api").offline_mode) {
        request(checkUrl, function(error, response, body) {
            if (typeof body === "string") {
                try {
                    body = JSON.parse(body);
                }
                catch (ex) {
                    body = null;
                }
            }
            if (body) {
                if (countlyConfigOrig.web.use_intercom && typeof body.intercom !== "undefined") {
                    countlyConfig.web.use_intercom = body.intercom;
                }
                if (typeof countlyConfigOrig.web.track === "undefined" && typeof body.stats !== "undefined") {
                    if (body.stats) {
                        countlyConfig.web.track = null;
                    }
                    else {
                        countlyConfig.web.track = "none";
                    }
                }
            }
        });
    }
};
var origConf = JSON.parse(JSON.stringify(membersUtility.countlyConfig));
membersUtility.recheckConfigs(origConf, membersUtility.countlyConfig);

/**
 * Is hashed string argon2?
 * @param {string} hashedStr | argon2 hashed string
 * @returns {boolean} return true if string hashed by argon2
 */
function isArgon2Hash(hashedStr) {
    return hashedStr && hashedStr.includes("$argon2");
}

/**
* Verify argon2 hash string
* @param {string} hashedStr - argon2 hashed string
* @param {string} str - string for verify
* @returns {promise} verify promise
**/
function verifyArgon2Hash(hashedStr, str) {
    return argon2.verify(hashedStr, str);
}

/**
* Create argon2 hash string
* @param {string} str - string to hash
* @returns {promise} hash promise
**/
function argon2Hash(str) {
    return argon2.hash(str);
}

/**
* Update user password to new sha512 hash
* @param {string} id - id of the user document
* @param {string} password - password to hash
* @param {object} countlyDb  - data base object
**/
function updateUserPasswordToArgon2(id, password, countlyDb) {
    countlyDb.collection('members').update({ _id: id}, { $set: { password: password}});
}

/**
* Create sha1 hash string
* @param {string} str - string to hash
* @param {boolean} addSalt - should salt be added
* @returns {string} hashed string
**/
function sha1Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha1', salt + "").update(str + "").digest('hex');
}

/**
* Create sha512 hash string
* @param {string} str - string to hash
* @param {boolean} addSalt - should salt be added
* @returns {string} hashed string
**/
function sha512Hash(str, addSalt) {
    var salt = (addSalt) ? new Date().getTime() : "";
    return crypto.createHmac('sha512', salt + "").update(str + "").digest('hex');
}

/**
 * Verify member for Argon2 Hash
 * @param {string} username | User name
 * @param {password} password | Password string
 * @param {object} countlyDb  - data base object
 * @param {Function} callback | Callback function
 */
function verifyMemberArgon2Hash(username, password, countlyDb, callback) {
    countlyDb.collection('members').findOne({$and: [{ $or: [ {"username": username}, {"email": username}]}]}, (err, member) => {
        if (member) {
            if (isArgon2Hash(member.password)) {
                verifyArgon2Hash(member.password, password).then(match => {
                    if (match) {
                        callback(undefined, member);
                    }
                    else {
                        callback("Password is wrong!");
                    }
                }).catch(function() {
                    callback("Password is wrong!");
                });
            }
            else {
                var password_SHA1 = sha1Hash(password);
                var password_SHA5 = sha512Hash(password);

                if (member.password === password_SHA1 || member.password === password_SHA5) {
                    argon2Hash(password).then(password_ARGON2 => {
                        updateUserPasswordToArgon2(member._id, password_ARGON2, countlyDb);
                        callback(undefined, member);
                    }).catch(function() {
                        callback("Password is wrong!");
                    });
                }
                else {
                    callback("Password is wrong!");
                }
            }
        }
        else {
            callback("Username is wrong!");
        }
    });
}

/**
* Validate password based on configured settings
* @param {string} password - password to validatePassword
* @returns {vary} returns string if there is error, or false if everything is ok
**/
function validatePassword(password) {
    if (password.length < plugins.getConfig("security").password_min) {
        return "management-users.password.length";
    }
    if (plugins.getConfig("security").password_char && !/[A-Z]/.test(password)) {
        return "management-users.password.has-char";
    }
    if (plugins.getConfig("security").password_number && !/\d/.test(password)) {
        return "management-users.password.has-number";
    }
    if (plugins.getConfig("security").password_symbol && !/[^A-Za-z\d]/.test(password)) {
        return "management-users.password.has-special";
    }
    return false;
}
/**
 * Function gets session timeout in ms.
 * @param {object} req - requets object
 * @returns {integer} Session timeout in ms.
 */
var getSessionTimeoutInMs = function(req) {
    var myTimeoutValue = parseInt(plugins.getConfig("frontend", req.session && req.session.settings).session_timeout, 10) * 1000 * 60;
    //max value used by set timeout function
    if (myTimeoutValue > 2147483647) {
        myTimeoutValue = 1800000;
    }//30 minutes
    return myTimeoutValue;
};

/**
* Sets variables for logged in session
* @param {object} req - request object
* @param {object} member - member object
* @param {object} countlyDb  -data base reference
* @param {function} callback - callback function, called after token and variables are set. Returns nothing.
**/
function setLoggedInVariables(req, member, countlyDb, callback) {
    req.session.uid = member._id;
    req.session.gadm = (member.global_admin === true);
    req.session.email = member.email;
    req.session.settings = member.settings;
    var reuse = true;
    if (req.session.temporary_token) {
        reuse = false;
    }

    authorize.save({
        db: countlyDb,
        multi: true,
        owner: req.session.uid,
        tryReuse: reuse,
        ttl: getSessionTimeoutInMs(req) / 1000,
        purpose: "LoggedInAuth",
        callback: function(err2, token) {
            if (err2) {
                console.log(err2);
            }
            if (token) {
                req.session.auth_token = token;
            }
            callback();
        }
    });
}

/** Clears all inforamtion about user from session parameters. Used when logging ut user.
* @param {object} req - request object
* @param {object} res - response object
*/
membersUtility.clearReqAndRes = function(req, res) {
    if (req.session) {
        req.session.uid = null;
        req.session.gadm = null;
        req.session.email = null;
        req.session.settings = null;
        res.clearCookie('uid');
        res.clearCookie('gadm');
        req.session.destroy(function() {});
    }
};

/**
* Verifies a user's credentials without logging in.
*
* @param {string} username - username or the email address of the user
* @param {string} password - password
* @param {function} callback - callback function.  First parameter in callback function is member object if logging in is successful.
* @example
*   membersUtility.verifyCredentials(username, password, function(member) {
        if (member) {
            // logged in
        }
        else {
            // failed
        }
    });
**/
membersUtility.verifyCredentials = function(username, password, callback) {
    if (username && password) {
        username = (username + "").trim();

        var secret = membersUtility.countlyConfig.passwordSecret || "";
        password = password + secret;

        verifyMemberArgon2Hash(username, password, membersUtility.db, (err, member) => {
            if (member) {
                callback(member);
            }
            else {
                callback(undefined);
            }
        });
    }
    else {
        callback(undefined);
    }
};

/**
* Update Stats for member.
*
* @param {object} member - member properties
* @example
*   membersUtility.updateStats(member );
**/
membersUtility.updateStats = function(member) {
    var countlyConfig = membersUtility.countlyConfig;

    if ((!countlyConfig.web.track || countlyConfig.web.track === "GA" && member.global_admin || countlyConfig.web.track === "noneGA" && !member.global_admin) && !plugins.getConfig("api").offline_mode) {
        countlyStats.getUser(membersUtility.db, member, function(statsObj) {
            const userApps = getUserApps(member);
            var custom = {
                apps: (userApps) ? userApps.length : 0,
                platforms: {"$addToSet": statsObj["total-platforms"]},
                events: statsObj["total-events"],
                pushes: statsObj["total-msg-sent"],
                crashes: statsObj["total-crash-groups"],
                users: statsObj["total-users"]
            };
            var date = new Date();
            request({
                uri: "https://stats.count.ly/i",
                method: "GET",
                timeout: 4E3,
                qs: {
                    device_id: member.email,
                    app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
                    timestamp: Math.round(date.getTime() / 1000),
                    hour: date.getHours(),
                    dow: date.getDay(),
                    user_details: JSON.stringify(
                        {
                            custom: custom
                        }
                    )
                }
            }, function() {});
        });
    }
};

/**
* Tries to log in user based passed userame and password. Calls "plugins"
* methods to notify successful and unsucessful logging in attempts. If
* successful, sets all session variables and auth token. Passes the member
* object to the callback if retrieved succesfully, but not necessarily logged
* in succesfully i.e. a member object will still be returned even if the member
* was locked. Also passes a boolean parameter to the callback indicating if the
* login was succesful.
*
* @param {object} req - request object
* @param {string} req.body.username - username
* @param {string} req.body.password - password
* @param {object} res - response object
* @param {function} callback - callback function. First parameter in callback
* function is member object, if it could be retrieved succesfully. Second
* parameter is a boolean that is true when logged in succesfully.
* @example
*   membersUtility.login(req, res, function(member) {
        if(member) {
            // logged in
        }
        else {
            // failed
        }
    });
**/

membersUtility.login = function(req, res, callback) {
    membersUtility.verifyCredentials(req.body.username, req.body.password, (member) => {
        if (member === undefined || member.locked) {
            plugins.callMethod("loginFailed", {req: req, data: req.body});
            callback(member, false);
        }
        else {
            plugins.callMethod("loginSuccessful", {req: req, data: member});

            // update stats
            membersUtility.updateStats(member);

            req.session.regenerate(function() {
                // will have a new session here
                var update = {last_login: Math.round(new Date().getTime() / 1000)};
                if (typeof member.password_changed === "undefined") {
                    update.password_changed = Math.round(new Date().getTime() / 1000);
                }
                if (req.body.lang && req.body.lang !== member.lang) {
                    update.lang = req.body.lang;
                }

                membersUtility.db.collection('members').update({_id: member._id}, {$set: update}, function() {});

                if (parseInt(plugins.getConfig("frontend", member.settings).session_timeout, 10)) {
                    req.session.expires = Date.now() + parseInt(plugins.getConfig("frontend", member.settings).session_timeout, 10) * 1000 * 60;
                }
                if (member.upgrade) {
                    res.set({
                        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
                        'Expires': '0',
                        'Pragma': 'no-cache'
                    });
                }

                setLoggedInVariables(req, member, membersUtility.db, function() {
                    callback(member, true);
                });
            });
        }
    });
};

/**
* Tries to log in user without verification for external authentication.
* Similar behavior as the membersUtility.login just bypass the verification
* as the user is already authenticated by external authentication mechanism
* such as Active Directory, Azure AD or Ldap
*
* @param {object} req - request object
* @param {string} req.body.username - username
* @param {object} res - response object
* @param {function} callback - callback function. First parameter in callback
* function is member object, if it could be retrieved succesfully. Second
* parameter is a boolean that is true when logged in succesfully.
* @example
*   membersUtility.loginWithExternalAuthentication(req, res, function(member) {
        if(member) {
            // logged in
        }
        else {
            // failed
        }
    });
**/

membersUtility.loginWithExternalAuthentication = function(req, res, callback) {
    if (!req.body || !req.body.username) {
        callback(undefined);
    }

    var username = (req.body.username + "").trim();

    membersUtility.db.collection('members').findOne({username}, (err, member) => {
        if (member === undefined || member.locked) {
            plugins.callMethod("loginFailed", {req: req, data: req.body});
            callback(member, false);
        }
        else {
            plugins.callMethod("loginSuccessful", {req: req, data: member});

            // update stats
            membersUtility.updateStats(member);

            req.session.regenerate(function() {
                // will have a new session here
                var update = {last_login: Math.round(new Date().getTime() / 1000)};

                if (req.body.lang && req.body.lang !== member.lang) {
                    update.lang = req.body.lang;
                }

                membersUtility.db.collection('members').update({_id: member._id}, {$set: update}, function() {});

                if (parseInt(plugins.getConfig("frontend", member.settings).session_timeout, 10)) {
                    req.session.expires = Date.now() + parseInt(plugins.getConfig("frontend", member.settings).session_timeout, 10) * 1000 * 60;
                }
                if (member.upgrade) {
                    res.set({
                        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0',
                        'Expires': '0',
                        'Pragma': 'no-cache'
                    });
                }

                setLoggedInVariables(req, member, membersUtility.db, function() {
                    req.session.settings = member.settings;
                    callback(member, true);
                });
            });
        }
    });
};

/**
* Removes all other active sessions for user
* @param {string} userId - id of the user for which to remove sessions
* @param {string} my_token - current auth token
* @param {string} my_session - current session id
* @param {object} countlyDb  -data base reference
**/
function killOtherSessionsForUser(userId, my_token, my_session, countlyDb) {
    countlyDb.collection('sessions_').find({"session": { $regex: userId }}).toArray(function(err, sessions) {
        var delete_us = [];
        if (sessions) {
            for (var i = 0; i < sessions.length; i++) {
                var parsed_data = "";
                try {
                    parsed_data = JSON.parse(sessions[i].session);
                }
                catch (error) {
                    console.log(error);
                }

                if ((!my_session || sessions[i]._id !== my_session) && parsed_data && parsed_data.uid === userId) {
                    delete_us.push(sessions[i]._id);
                }
            }
            if (delete_us.length > 0) {
                countlyDb.collection('sessions_').remove({'_id': {$in: delete_us}});
            }
        }
    });
    //delete other auth tokens with purpose:"LoggedInAuth"
    if (my_token) {
        countlyDb.collection('auth_tokens').remove({'owner': countlyDb.ObjectID(userId), 'purpose': "LoggedInAuth", '_id': {$ne: my_token}});
    }
    else {
        countlyDb.collection('auth_tokens').remove({'owner': countlyDb.ObjectID(userId), 'purpose': "LoggedInAuth"});
    }
}

/**
* Logins user with token
* @param {object} req - request object
* @param {function} callback - callback function
**/
membersUtility.loginWithToken = function(req, callback) {
    var token = req.params.token;
    var pathUrl = req.url.replace(membersUtility.countlyConfig.path, "");
    var urlParts = url.parse(pathUrl, true);
    var fullPath = urlParts.pathname;

    authorize.verify_return({
        db: membersUtility.db,
        token: token,
        req_path: fullPath,
        return_data: true,
        callback: function(valid) {
            if (!valid) {
                plugins.callMethod("tokenLoginFailed", {req: req, data: {token: token}});
                return callback(undefined);
            }

            membersUtility.db.collection('members').findOne({"_id": membersUtility.db.ObjectID(valid.owner)}, function(err, member) {
                if (err || !member) {
                    plugins.callMethod("tokenLoginFailed", {req: req, data: {token: token, token_owner: valid.owner}});
                    callback(undefined);
                }
                else {
                    plugins.callMethod("tokenLoginSuccessful", {req: req, data: {username: member.username}});
                    if (valid.temporary) {
                        req.session.temporary_token = true;
                    }
                    setLoggedInVariables(req, member, membersUtility.db, function() {
                        req.session.settings = member.settings;
                        callback(member);
                    });
                }
            });
        }
    });
};



/**
* Logs out user  -  clears session info for request and response object
* @param {object} req - request object
* @param {object} res - response object
**/
membersUtility.logout = function(req, res) {
    if (req.session) {
        if (req.session.uid && req.session.email) {
            plugins.callMethod("userLogout", {req: req, data: {uid: req.session.uid, email: req.session.email, query: req.query}});
        }
        if (req.session.auth_token) {
            membersUtility.db.collection("auth_tokens").remove({_id: req.session.auth_token});

            //louout also other users logged in with same credentials
            if (!req.session.temporary_token) {
                killOtherSessionsForUser(req.session.uid, null, null, membersUtility.db);
            }
            req.session.auth_token = null;
        }
        membersUtility.clearReqAndRes(req, res);
    }
};

/**
 * Function to extend user session. Changes time when session expires and also extends token(if passed).
 * @param {object} req - request object
 * @param {string} req.session.auth_token - auth token
*/
membersUtility.extendSession = function(req) {
    req.session.expires = Date.now() + getSessionTimeoutInMs(req);
    if (req.session.auth_token) {
        var ChangeTime = getSessionTimeoutInMs(req);
        if (ChangeTime > 0) {
            authorize.extend_token({token: req.session.auth_token, db: membersUtility.db, extendTill: Date.now() + ChangeTime}, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
        else { //changed to not expire
            authorize.extend_token({token: req.session.auth_token, db: membersUtility.db, extendBy: 0}, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    }
};

/**
 * Sets up first user in Countly(if there is none). Req object is used to get mandatory variables from req.body and also there are variables set to have logged in session for new user.
 * @param {object} req - request object
 * @param {string} req.body.full_name - Full name. Mandatory.
 * @param {string} req.body.username - Username. Mandatory.
 * @param {string} req.body.password  - Password. Mandatory.
 * @param {string} req.body.email  - E-mail. Mandatory.
 * @param {function} callback  - Function with one return value - error (if there is one)
 * @example
 *   membersUtility.setup(req, res, countlyConfig, function(error) {
 *      if(error) {
 *          //there is error while setting up user
 *          // error === "Wrong request parameters" - not all mandatory parameters passed or there was error during creating user
 *         // error === "User exists" - There is already at least one user.
 *           // error === "....." - mongo error while getting user count.
 *      }
 *      else {
 *          //Success
 *      }
 *  });
**/

membersUtility.setup = function(req, callback) {
    membersUtility.db.collection('members').count(function(err, memberCount) {
        if (!err && memberCount === 0) {
            //check password
            const argProps = {
                'full_name': {
                    'required': true,
                    'type': 'String'
                },
                'username': {
                    'required': true,
                    'type': 'String'
                },
                'password': {
                    'required': true,
                    'type': 'String',
                    'min-length': plugins.getConfig("security").password_min,
                    'has-number': plugins.getConfig("security").password_number,
                    'has-upchar': plugins.getConfig("security").password_char,
                    'has-special': plugins.getConfig("security").password_symbol
                },
                'email': {
                    'required': true,
                    'type': 'String'
                },
            };
            var memberCreateValidation = common.validateArgs(req.body, argProps, true);
            if (!(req.body = memberCreateValidation.obj)) {
                callback({
                    message: memberCreateValidation.errors,
                    passMinLen: plugins.getConfig("security").password_min,
                });
                return;
            }
            var secret = membersUtility.countlyConfig.passwordSecret || "";
            argon2Hash(req.body.password + secret).then(password => {
                req.body.email = (req.body.email + "").trim();
                req.body.username = (req.body.username + "").trim();
                var doc = {
                    "full_name": req.body.full_name,
                    "username": req.body.username,
                    "password": password,
                    "email": req.body.email,
                    "global_admin": true,
                    created_at: Math.floor(((new Date()).getTime()) / 1000),
                    password_changed: Math.floor(((new Date()).getTime()) / 1000),
                    permission: membersUtility.emptyPermission
                };
                if (req.body.lang) {
                    doc.lang = req.body.lang;
                }
                crypto.randomBytes(48, function(errorBuff, buffer) {
                    doc.api_key = common.md5Hash(buffer.toString('hex') + Math.random());
                    membersUtility.db.collection('members').insert(doc, {safe: true}, function(err2, member) {
                        member = member.ops;
                        setLoggedInVariables(req, member[0], membersUtility.db, function() {
                            req.session.install = true;
                            callback();
                        });
                    });
                });
            }).catch(function() {
                callback("Wrong request parameters");
            });
        }
        else if (err) {
            callback(err);
        }
        else {
            callback("User exists");
        }
    });
};

/**
 * Function validates if email is not used by any other member.
 * @param {string} email - mandatory. E-mail to check
 * @param {function} callback -  function with one return value. Returns true if email is not used, false if taken.
 * @example
 * membersUtility.checkEmail(email, function(isFree) {
 *      if(isFree ===true) {
 *          //email is not taken
 *      }
 * });
 *
 *
*/
membersUtility.checkEmail = function(email, callback) {
    email = (email + "").trim();
    membersUtility.db.collection('members').findOne({email: email}, function(err, member) {
        if (member || err) {
            callback(false);
        }
        else {
            callback(true);
        }
    });
};

/**
 * Function validates if username is not used by any other member.
 * @param {string} username - mandatory. Username to check.
 * @param {function} callback -  function with one return value. Returns true if username is free, false if taken.
 * @example
 * membersUtility.checkUsername(username, function(isFree) {
 *      if(isFree ===true) {
 *          //username is not taken
 *      }
 * });
 *
 *
*/
membersUtility.checkUsername = function(username, callback) {
    username = (username + "").trim();
    membersUtility.db.collection('members').findOne({username: username}, function(err, member) {
        if (member || err) {
            callback(false);
        }
        else {
            callback(true);
        }
    });
};

/**
 * Sends user password reseting information to given e-mail.
 * @param {object} req - request object.
 * @param {string} req.body.email - mandatory. User email.
 * @param {string} req.body.lang - optional. Language.(default "en"  - english)
 * @param {function} callback  - function with one return value. Returns member object if successful.
 * @example
 * membersUtility.forgot(req, function(member) {
 *      if(member) {
 *         //member found
 *      }
 *      else {
 *         //e-mail not passed or user with this e-mail not found
 *      }
 * });
*/
membersUtility.forgot = function(req, callback) {
    if (!req || !req.body || !req.body.email) {
        callback(undefined); //to be sure email is passed
    }
    else {
        var email = (req.body.email + "").trim();
        membersUtility.db.collection('members').findOne({"email": email}, function(err, member) {
            if (member) {
                var timestamp = Math.round(new Date().getTime() / 1000),
                    prid = sha512Hash(member.username + member.full_name, timestamp);
                member.lang = member.lang || req.body.lang || "en";
                membersUtility.db.collection('password_reset').insert({"prid": prid, "user_id": member._id, "timestamp": timestamp}, {safe: true}, function() {
                    countlyMail.sendPasswordResetInfo(member, prid);
                    plugins.callMethod("passwordRequest", {req: req, data: req.body}); //used in systemlogs
                    callback(member);
                });
            }
            else {
                callback(undefined);
            }
        });
    }
};
/**
 * Resets user password
 * @param {object} req - request object
 * @param {string} req.body.password - mandatory. new password.
 * @param {string} req.body.again - mandatory.
 * @param {string} req.body.prid - mandatory. Password reset id.
 * @param {function} callback - function with one two return values. First one is password validation error(false if no error) and second one is member object if reset is sucessful.
*/
membersUtility.reset = function(req, callback) {
    var result = validatePassword(req.body.password);
    if (result === false) {
        if (req.body.password && req.body.again && req.body.prid) {
            req.body.prid += "";
            var secret = membersUtility.countlyConfig.passwordSecret || "";
            argon2Hash(req.body.password + secret).then(password => {
                membersUtility.db.collection('password_reset').findOne({ prid: req.body.prid }, function(err, passwordReset) {
                    membersUtility.db.collection('members').findAndModify({ _id: passwordReset.user_id }, {}, { '$set': { "password": password } }, function(err2, member) {
                        member = member && member.ok ? member.value : null;
                        killOtherSessionsForUser(passwordReset.user_id + "", null, null, membersUtility.db);
                        plugins.callMethod("passwordReset", { req: req, data: member }); //only req, used for systemolgs
                        callback(false, member);
                    });
                    membersUtility.db.collection('password_reset').remove({ prid: req.body.prid }, function() { });
                });
            }).catch(function() {
                callback(false, undefined);
            });
        }
        else {
            callback(false, undefined);
        }
    }
    else {
        callback(result, undefined);
    }
};

/**
 * Saves changed user settings
 * @param {object} req - request object
 * @param {string} req.body.username - mandatory - username (current or new one to chacge to)
 * @param {string} req.body.api_key - mandatory. User API KEY (current or the one to change to)
 * @param {string} req.body.old_pwd  - Old password. Optional. Passed if changing password.
 * @param {string} req.body.new_pwd  - New password. Optional. Passed if changing password.
 * @param {function} callback  - function with two return values. First one is true - if successful (false if not sucessful) and the second one - error message(in some cases).
*/
membersUtility.settings = function(req, callback) {
    var updatedUser = {};
    if (req.body.username && req.body.api_key) {
        if (req.body.api_key.length !== 32) {
            callback(false, "user-settings.api-key-length");
            return;
        }
        if (!req.body.api_key.match(/^[0-9a-zA-Z]+([0-9]+)([a-z]+)[0-9a-zA-Z]+$/)) {
            callback(false, "user-settings.api-key-restrict");
            return;
        }

        req.body.username = (req.body.username + "").trim();
        if (req.body.member_image && req.body.member_image !== "delete") {
            updatedUser.member_image = req.body.member_image;
        }
        if (req.body.member_image === "delete") {
            updatedUser.member_image = "";
        }
        updatedUser.username = req.body.username;
        updatedUser.api_key = req.body.api_key;
        if (req.body.lang) {
            updatedUser.lang = req.body.lang;
        }
        var change = JSON.parse(JSON.stringify(updatedUser));
        membersUtility.db.collection('members').findOne({"_id": membersUtility.db.ObjectID(req.session.uid + "")}, function(err, member) {
            if (err || !member) {
                callback(false);
                return;
            }
            membersUtility.db.collection('members').findOne({username: req.body.username}, async function(err2, user) {
                if (err) {
                    callback(false);
                    return;
                }
                member.change = change;
                if ((user && user._id + "" !== req.session.uid + "") || err2) {
                    callback(false, "username-exists");
                }
                else {
                    var secret = membersUtility.countlyConfig.passwordSecret || "";
                    req.body.new_pwd = req.body.new_pwd + secret;
                    if (req.body.old_pwd && req.body.old_pwd.length) {
                        if (isArgon2Hash(member.password)) {
                            var match;
                            try {
                                match = await verifyArgon2Hash(member.password, req.body.old_pwd);
                            }
                            catch (ex) {
                                match = null;
                            }
                            if (!match) {
                                return callback(false, "user-settings.old-password-not-match");
                            }
                        }
                        else {
                            var password_SHA1 = sha1Hash(req.body.old_pwd);
                            var password_SHA5 = sha512Hash(req.body.old_pwd);

                            if (member.password === password_SHA1 || member.password === password_SHA5) {
                                argon2Hash(req.body.old_pwd).then(password_ARGON2 => {
                                    updateUserPasswordToArgon2(member._id, password_ARGON2, membersUtility.db);
                                }).catch(function() {
                                    console.log("Problem updating password");
                                });
                            }
                            else {
                                return callback(false, "user-settings.old-password-not-match");
                            }
                        }
                        // eslint-disable-next-line require-atomic-updates
                        member.change.password = true;
                        try {
                            var newPassword_SHA5 = sha512Hash(req.body.new_pwd),
                                newPassword_ARGON2 = await argon2Hash(req.body.new_pwd);
                        }
                        catch (ex) {
                            callback(false);
                            return;
                        }

                        let isUsedBefore = false;
                        if (plugins.getConfig('security').password_rotation > 0) {
                            // Check if used before
                            const promises = [];
                            const passwordHistory = member.password_history || [];

                            for (let i = 0; i < passwordHistory.length; i++) {
                                const oldPassword = passwordHistory[i];
                                if (isArgon2Hash(oldPassword)) {
                                    promises.push(verifyArgon2Hash(oldPassword, req.body.new_pwd));
                                }
                                else if (oldPassword === newPassword_SHA5) {
                                    isUsedBefore = true;
                                    break;
                                }
                            }

                            if (!isUsedBefore && promises.length > 0) {
                                try {
                                    const promiseResults = await Promise.all(promises);
                                    isUsedBefore = promiseResults.some(x => x === true);
                                }
                                catch (ex) {
                                    callback(false);
                                    return;
                                }
                            }
                        }

                        if (req.body.new_pwd !== req.body.old_pwd && !isUsedBefore) {
                            var passRes = validatePassword(req.body.new_pwd);
                            if (passRes === false) {
                                updatedUser.password = newPassword_ARGON2;
                                updatedUser.password_changed = Math.round(new Date().getTime() / 1000);
                                membersUtility.db.collection('members').update({"_id": membersUtility.db.ObjectID(req.session.uid + "")}, {'$set': updatedUser, $push: {password_history: {$each: [newPassword_ARGON2], $slice: -parseInt(plugins.getConfig('security').password_rotation)}}}, {safe: true}, function(err3, result) {
                                    if (result && result.result && result.result.ok && result.result.nModified > 0 && !err3) {
                                        killOtherSessionsForUser(req.session.uid, req.session.auth_token, req.sessionID, membersUtility.db);
                                        plugins.callMethod("userSettings", {req: req, data: member});
                                        callback(true, updatedUser.password_changed + "");
                                    }
                                    else {
                                        callback(false, "user-settings.old-password-not-match");
                                        return;
                                    }
                                });
                            }
                            else {
                                callback(false, passRes);
                            }
                        }
                        else {
                            callback(false, "user-settings.password-not-old");
                        }
                    }
                    else {
                        membersUtility.db.collection('members').update({"_id": membersUtility.db.ObjectID(req.session.uid + "")}, {'$set': updatedUser}, {safe: true}, function(err3, result) {
                            if (result && !err3) {
                                plugins.callMethod("userSettings", {req: req, data: member});
                                callback(true);
                            }
                            else {
                                callback(false);
                            }
                        });
                    }
                }
            });
        });
    }
    else {
        callback(false);
        return;
    }
};

/**
 * Searches for a user with the given username/email. Useful for the input from the login prompt.
 * @param {string} input - username or the email address of the user we are looking for
 * @param {function} callback - function with one parameter, the member object if a user is found, undefined otherwise
*/
membersUtility.findByUsernameOrEmail = function(input, callback) {
    input = (input + "").trim();
    membersUtility.db.collection('members').findOne({$or: [{username: input}, {email: input}]}, function(err, member) {
        if (err) {
            console.log(`Database error searching for user: ${err}`);
        }
        callback(member);
    });
};

/**
 * Find Members
 * @param {Object} query query
 * @returns {Object[]} list of members
*/
membersUtility.findMembers = async function(query = {}) {
    return new Promise((resolve, reject) => {
        this.db.collection('members').find(query).toArray((err, members) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(members);
            }
        });
    });
};

/**
 * Update Member
 * @param {Object} query query
 * @param {Object} data data to update
 * @param {boolean} upsert upsert
 * @returns {Object} list of members
*/
membersUtility.updateMember = async function(query = {}, data = {}, upsert = true) {
    return new Promise((resolve, reject) => {
        this.db.collection('members').update(query, { $set: data }, { upsert }, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
};

/**
 * Remove Members
 * @param {Object} query query
 * @returns {Object[]} list of members
*/
membersUtility.removeMembers = async function(query = {}) {
    return new Promise((resolve, reject) => {
        if (!Object.keys(query).length) {
            return reject('Invalid query to remove members');
        }

        this.db.collection('members').remove(query, (err, response) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(response);
            }
        });
    });
};

/**
 * Create User for external authentication provider
 * @method createMember
 * @param {Object} data user data
 * @param {string} provider auth provider
 * @param {boolean} deleteDuplicate delete duplicate
 * @returns {Promise<any>} created or updated user data
*/
membersUtility.createMember = async function(data, provider = '', deleteDuplicate = false) {
    let user = {};
    if (!data || !Object.keys(data).length) {
        throw new Error('Invalid user data provided');
    }
    user._id = data._id || data.id || data.sub || data.username;
    user.email = data.email || '';
    user.username = data.username || data.email;
    user.full_name = data.full_name || data.name || `${data.firstName} ${data.lastName}` || "";
    user.global_admin = data.global_admin || false;
    user.locked = (typeof data.locked !== "undefined") ? data.locked : false;
    user.provider = provider;

    // can be deprecated after all data migrated to provider property
    user.isAD = (provider === 'ad' || provider === 'azure');
    user.isCognito = provider === 'cognito';

    user.created_at = data.created_at || Math.floor(((new Date()).getTime()) / 1000);

    user.admin_of = data.admin_of || [];
    user.user_of = data.user_of || [];
    user.restrict = data.restrict || [];
    user.app_restrict = data.app_restrict || {};
    user.permission = data.permission || membersUtility.emptyPermission;

    if (data.admin_of && data.admin_of.length) {
        user.user_of = [...new Set([...data.admin_of, ...data.user_of])];
    }

    if (data.group_id && data.group_id.length) {
        user.group_id = data.group_id;
    }

    // legacy rbac
    if (data.marketing_of && data.marketing_of.length) {
        user.admin_of.push(...data.marketing_of);
    }

    const buffer = crypto.randomBytes(48);
    user.api_key = data.api_key || common.md5Hash(buffer.toString('hex') + Math.random());
    user.password = data.password || common.md5Hash(data.api_key);

    // push approver permission
    user.approver = !!data.approver;
    user.approver_bypass = !!data.approver_bypass;

    const query = user.email
        ? {
            $or: [
                { _id: user._id },
                { email: user.email }
            ]
        }
        : { _id: user._id };

    try {
        const existingMembers = await membersUtility.findMembers(query);
        if (deleteDuplicate && (existingMembers.length >= 2 || (existingMembers.length === 1 && existingMembers[0]._id !== user._id))) {
            await membersUtility.removeMembers(query);
        }

        const memberData = await membersUtility.updateMember(query, user, true);

        return memberData;
    }
    catch (error) {
        console.error(`create member error ${provider} ${error.message}`, error);
        throw new Error(error);
    }
};

/**
 * Merge permission objects
 * @method mergePermissions
 * @param {object} current - current permission object
 * @param {object} addition - permission object to merge
 */
membersUtility.mergePermissions = (current, addition) => {
    var crud = {"c": true, "r": true, "u": true, "d": true};
    for (var p in addition) {
        //permission does not exist yet, just copy it
        if (!current[p]) {
            current[p] = addition[p];
        }
        else if (crud[p]) {
            //iterating through the apps
            if (addition[p]) {
                if (!current[p]) {
                    current[p] = {};
                }
                for (var app in addition[p]) {
                    if (addition[p][app]) {
                        if (!current[p][app]) {
                            current[p][app] = {};
                        }
                        if (addition[p][app].all) {
                            current[p][app].all = true;
                        }
                        if (addition[p][app].allowed) {
                            current[p][app].allowed = current[p][app].allowed || {};
                            for (var feat in addition[p][app].allowed) {
                                if (addition[p][app].allowed[feat]) {
                                    current[p][app].allowed[feat] = true;
                                }
                                else if (typeof current[p][app].allowed[feat] === "undefined") {
                                    current[p][app].allowed[feat] = addition[p][app].allowed[feat];
                                }
                            }
                        }
                    }
                }
            }
        }
        else if (p === "_") {
            //merge admin by merging arrays
            if (addition[p].a) {
                if (!current[p].a) {
                    current[p].a = [];
                }
                current[p].a = [...(new Set([...current[p].a, ...addition[p].a]))];
            }
            if (addition[p].u) {
                if (!current[p].u) {
                    current[p].u = [];
                }
                current[p].u = [...(new Set([...current[p].u, ...addition[p].u]))];
            }
        }
    }
};

module.exports = membersUtility;