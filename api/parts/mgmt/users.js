/**
* This module is meant handling dashboard user accounts
* @module api/parts/mgmt/users
*/

/** @lends module:api/parts/mgmt/users */
var usersApi = {},
    common = require('./../../utils/common.js'),
    mail = require('./mail.js'),
    countlyConfig = require('./../../../frontend/express/config.js'),
    plugins = require('../../../plugins/pluginManager.js');
const countlyCommon = require('../../lib/countly.common.js');
const log = require('../../utils/log.js')('core:mgmt.users');
const _ = require('lodash');

//for password checking when deleting own account. Could be removed after merging with next
var argon2 = require('argon2');
var crypto = require('crypto');
/**
* Get data about current user and output to browser
* @param {params} params - params object
* @returns {boolean} true
**/
usersApi.getCurrentUser = function(params) {
    delete params.member.password;

    common.returnOutput(params, params.member);
    return true;
};

/**
* Get data about specific user by user id, and outputs to browser
* @param {params} params - params object
* @returns {boolean} true if fetched data from db
**/
usersApi.getUserById = function(params) {
    if (!params.member.global_admin) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }
    if (!params.qstring.id || params.qstring.id.length !== 24) {
        common.returnMessage(params, 401, 'Missing or incorrect user id parameter');
        return false;
    }
    common.db.collection('members').findOne({ _id: common.db.ObjectID(params.qstring.id) }, {
        password: 0,
        appSortList: 0
    }, function(err, member) {

        if (!member || err) {
            common.returnOutput(params, {});
            return false;
        }

        var memberObj = {};

        if (member.admin_of && member.admin_of.length > 0 && member.admin_of[0] === "") {
            member.admin_of.splice(0, 1);
        }
        if (member.user_of && member.user_of.length > 0 && member.user_of[0] === "") {
            member.user_of.splice(0, 1);
        }

        member.admin_of = ((member.admin_of && member.admin_of.length > 0) ? member.admin_of : []);
        member.user_of = ((member.user_of && member.user_of.length > 0) ? member.user_of : []);
        member.global_admin = (member.global_admin === true);
        member.locked = (member.locked === true);
        member.created_at = member.created_at || 0;
        member.last_login = member.last_login || 0;
        member.is_current_user = (member.api_key === params.member.api_key);
        memberObj[member._id] = member;

        common.returnOutput(params, memberObj);
    });
    return true;
};

/**
* Get list of all users, for global admins only, and outputs to browser
* @param {params} params - params object
* @returns {boolean} true if fetched data from db
**/
usersApi.getAllUsers = function(params) {
    if (!params.member.global_admin) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }
    common.db.collection('members').find({}, {
        password: 0,
        appSortList: 0
    }).toArray(function(err, members) {

        if (!members || err) {
            common.returnOutput(params, {});
            return false;
        }



        common.db.collection('failed_logins').find({}).toArray(function(err2, failedLogins) {
            if (err2) {
                common.returnOutput(params, {});
                return false;
            }


            const bruteforceFails = plugins.getConfig("security").login_tries;
            const bruteforceWait = plugins.getConfig("security").login_wait;

            var membersObj = {};

            for (let i = 0; i < members.length; i++) {
                const result = failedLogins.find(x => (x._id === members[i].username)) || { fails: 0 };

                if (result.fails > 0 && result.fails % bruteforceFails === 0 && Math.floor(new Date().getTime() / 1000) < (((result.fails / bruteforceFails) * bruteforceWait) + result.lastFail)) {
                    members[i].blocked = true;
                }
                else {
                    members[i].blocked = false;
                }

                if (members[i].admin_of && members[i].admin_of.length > 0 && members[i].admin_of[0] === "") {
                    members[i].admin_of.splice(0, 1);
                }
                if (members[i].user_of && members[i].user_of.length > 0 && members[i].user_of[0] === "") {
                    members[i].user_of.splice(0, 1);
                }

                members[i].admin_of = ((members[i].admin_of && members[i].admin_of.length > 0) ? members[i].admin_of : []);
                members[i].user_of = ((members[i].user_of && members[i].user_of.length > 0) ? members[i].user_of : []);
                members[i].global_admin = (members[i].global_admin === true);
                members[i].locked = (members[i].locked === true);
                members[i].created_at = members[i].created_at || 0;
                members[i].last_login = members[i].last_login || 0;
                members[i].is_current_user = (members[i].api_key === params.member.api_key);
                membersObj[members[i]._id] = members[i];
            }

            common.returnOutput(params, membersObj);
        });


        return true;
    });
    return true;
};

/**
* Reset timeban for user and output result to browser
* @param {params} params - params object
* @returns {boolean} true if timeban reseted
**/
usersApi.resetTimeBan = function(params) {
    if (!params.member.global_admin) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }

    common.db.collection('failed_logins').remove({_id: params.qstring.username}, (err) => {
        if (err) {
            common.returnMessage(params, 500, 'Remove from collection failed.');
            return false;
        }

        common.returnOutput(params, true);
    });


    return true;
};

/**
* Create new dashboard user and output result to browser
* @param {params} params - params object
* @returns {boolean} true if user created
**/
usersApi.createUser = function(params) {
    if (!params.member.global_admin) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }

    var argProps = {
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
            'lang': {
                'required': false,
                'type': 'String'
            },
            'admin_of': {
                'required': false,
                'type': 'Array'
            },
            'user_of': {
                'required': false,
                'type': 'Array'
            },
            'global_admin': {
                'required': false,
                'type': 'Boolean'
            }
        },
        newMember = {};

    var createUserValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(newMember = createUserValidation.obj)) {
        common.returnMessage(params, 400, 'Error: ' + createUserValidation.errors);
        return false;
    }

    common.db.collection('members').findOne({ $or: [{ email: newMember.email }, { username: newMember.username }] }, function(err, member) {
        if (member || err) {
            common.returnMessage(params, 200, 'Email or username already exists');
            return false;
        }
        else {
            createUser();
            return true;
        }
    });

    /**
    * Creates user document with hashed password
    **/
    async function createUser() {
        var passwordNoHash = newMember.password;
        var secret = countlyConfig.passwordSecret || "";

        newMember.password = await common.argon2Hash(newMember.password + secret);
        newMember.password_changed = 0;
        newMember.created_at = Math.floor(((new Date()).getTime()) / 1000); //TODO: Check if UTC
        newMember.admin_of = newMember.admin_of || [];
        newMember.user_of = newMember.user_of || [];
        newMember.locked = false;
        newMember.username = newMember.username.trim();
        newMember.email = newMember.email.trim();

        common.db.collection('members').insert(newMember, { safe: true }, function(err, member) {
            member = member.ops;
            if (member && member.length && !err) {

                member[0].api_key = common.md5Hash(member[0]._id + (new Date().getTime()));
                common.db.collection('members').update({ '_id': member[0]._id }, { $set: { api_key: member[0].api_key } }, function() { });

                mail.sendToNewMember(member[0], passwordNoHash);
                plugins.dispatch("/i/users/create", {
                    params: params,
                    data: member[0]
                });
                delete member[0].password;

                common.returnOutput(params, member[0]);
            }
            else {
                common.returnMessage(params, 500, 'Error creating user');
            }
        });
    }

    return true;
};

/**
    * Removes all active sessions for user
    * @param {string} userId - id of the user for which to remove sessions
    **/
function killAllSessionForUser(userId) {
    common.db.collection('sessions_').find({"session": { $regex: userId }}).toArray(function(err, sessions) {

        var delete_us = [];
        sessions = sessions || [];
        for (let i = 0; i < sessions.length; i++) {
            var parsed_data = "";
            try {
                parsed_data = JSON.parse(sessions[i].session);
            }
            catch (SyntaxError) {
                console.log('Parse ' + sessions[i].session + ' JSON failed');
            }
            if (parsed_data && parsed_data.uid === userId) {
                delete_us.push(sessions[i]._id);
            }
        }
        if (delete_us.length > 0) {
            common.db.collection('sessions_').remove({ '_id': { $in: delete_us } });
        }
    });
    //delete auth tokens
    common.db.collection('auth_tokens').remove({
        'owner': userId,
        'purpose': "LoggedInAuth"
    });

}

/**
* Updates dashboard user's data and output result to browser
* @param {params} params - params object
* @returns {boolean} true if user was updated
**/
usersApi.updateUser = async function(params) {
    var argProps = {
            'user_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            },
            'full_name': {
                'required': false,
                'type': 'String'
            },
            'username': {
                'required': false,
                'type': 'String'
            },
            'password': {
                'required': false,
                'type': 'String',
                'min-length': plugins.getConfig("security").password_min,
                'has-number': plugins.getConfig("security").password_number,
                'has-upchar': plugins.getConfig("security").password_char,
                'has-special': plugins.getConfig("security").password_symbol
            },
            'email': {
                'required': false,
                'type': 'String'
            },
            'lang': {
                'required': false,
                'type': 'String'
            },
            'admin_of': {
                'required': false,
                'type': 'Array'
            },
            'user_of': {
                'required': false,
                'type': 'Array'
            },
            'global_admin': {
                'required': false,
                'type': 'Boolean'
            },
            'locked': {
                'required': false,
                'type': 'Boolean'
            },
            'send_notification': {
                'required': false,
                'type': 'Boolean',
                'exclude-from-ret-obj': true
            },
            'member_image': {
                'type': 'String',
                'required': false
            }
        },
        updatedMember = {},
        passwordNoHash = "";

    var updateUserValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(updatedMember = updateUserValidation.obj)) {
        common.returnMessage(params, 400, 'Error: ' + updateUserValidation.errors);
        return false;
    }

    if (!(params.member.global_admin || params.member._id === params.qstring.args.user_id)) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }

    if (updatedMember.password) {
        var secret = countlyConfig.passwordSecret || "";
        passwordNoHash = updatedMember.password;
        updatedMember.password = await common.argon2Hash(updatedMember.password + secret);
        if (params.member._id !== params.qstring.args.user_id) {
            updatedMember.password_changed = 0;
        }
    }
    if (updatedMember.username) {
        updatedMember.username = updatedMember.username.trim();
    }
    if (updatedMember.email) {
        updatedMember.email = updatedMember.email.trim();
    }

    if (updatedMember.member_image && updatedMember.member_image === 'delete') {
        updatedMember.member_image = "";
    }


    common.db.collection('members').findOne({ '_id': common.db.ObjectID(params.qstring.args.user_id) }, function(err, memberBefore) {
        common.db.collection('members').update({ '_id': common.db.ObjectID(params.qstring.args.user_id) }, { '$set': updatedMember }, { safe: true }, function() {
            common.db.collection('members').findOne({ '_id': common.db.ObjectID(params.qstring.args.user_id) }, function(err2, member) {
                if (member && !err2) {
                    updatedMember._id = params.qstring.args.user_id;
                    plugins.dispatch("/i/users/update", {
                        params: params,
                        data: updatedMember,
                        member: memberBefore
                    });
                    if (params.qstring.args.send_notification && passwordNoHash) {
                        mail.sendToUpdatedMember(member, passwordNoHash);
                    }
                    if (updatedMember.password && params.member._id + "" !== updatedMember._id + "") {
                        killAllSessionForUser(updatedMember._id);
                    }

                    common.returnMessage(params, 200, 'Success');
                }
                else {
                    common.returnMessage(params, 500, 'Error updating user');
                }
            });
        });
    });

    return true;
};

/**
* Deletes dashboard user and output result to browser
* @param {params} params - params object
* @returns {boolean} true if user was deleted
**/
usersApi.deleteUser = function(params) {
    var argProps = {
            'user_ids': {
                'required': true,
                'type': 'Array'
            }
        },
        userIds = [];

    if (!params.member.global_admin) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }

    var deleteUserValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(deleteUserValidation.obj && (userIds = deleteUserValidation.obj.user_ids))) {
        common.returnMessage(params, 400, 'Error: ' + deleteUserValidation.errors);
        return false;
    }

    for (var i = 0; i < userIds.length; i++) {
        // Each user id should be 24 chars long and a user can't delete his own account
        if (!userIds[i] || userIds[i] === params.member._id + "" || userIds[i].length !== 24) {
            continue;
        }
        else {
            common.db.collection('auth_tokens').remove({ 'owner': userIds[i] }, function() {});
            common.db.collection('members').findAndModify({ '_id': common.db.ObjectID(userIds[i]) }, {}, {}, { remove: true }, function(err, user) {
                if (!err && user && user.ok && user.value) {
                    plugins.dispatch("/i/users/delete", {
                        params: params,
                        data: user.value
                    });
                    usersApi.deleteUserNotes(params);
                }
            });
        }
    }

    common.returnMessage(params, 200, 'Success');
    return true;
};

// created functions below are for account deletion. when merging together with next should remove  and include from members utility !!!!!! 

/**
 * Is hashed string argon2?
 * @param {string} hashedStr | argon2 hashed string
 * @returns {boolean} return true if string hashed by argon2
 */
function isArgon2Hash(hashedStr) {
    return hashedStr.includes("$argon2");
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
* Update user password to new sha512 hash
* @param {string} id - id of the user document
* @param {string} password - password to hash
**/
function updateUserPasswordToArgon2(id, password) {
    common.db.collection('members').update({ _id: id}, { $set: { password: password}});
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
 * Verify member for Argon2 Hash
 * @param {string} username | User name
 * @param {password} password | Password string
 * @param {Function} callback | Callback function
 */
function verifyMemberArgon2Hash(username, password, callback) {
    common.db.collection('members').findOne({$and: [{ $or: [ {"username": username}, {"email": username}]}]}, (err, member) => {
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
                        updateUserPasswordToArgon2(member._id, password_ARGON2);
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

// END of reused functions 


usersApi.deleteOwnAccount = function(params) {
    if (params.qstring.password && params.qstring.password !== "") {
        verifyMemberArgon2Hash(params.member.email, params.qstring.password, (err, member) => {
            if (member) {
                if (member.global_admin) {
                    common.db.collection('members').find({'global_admin': true}).count(function(err2, count) {
                        if (err2) {
                            console.log(err2);
                            common.returnMessage(params, 400, 'Mongo error');
                        }
                        if (count < 2) {
                            common.returnMessage(params, 400, 'global admin limit');
                        }
                        else {
                            common.db.collection('members').remove({_id: common.db.ObjectID(member._id + "")}, function(err1 /*, res1*/) {
                                if (err1) {
                                    console.log(err1);
                                    common.returnMessage(params, 400, 'Mongo error');
                                }
                                else {
                                    plugins.dispatch("/i/users/delete", {
                                        params: params,
                                        data: member
                                    });
                                    killAllSessionForUser(member._id);
                                    common.returnMessage(params, 200, 'Success');
                                }
                            });
                        }

                    });

                }
                else {
                    common.db.collection('members').remove({_id: common.db.ObjectID(member._id + "")}, function(err3 /* , res1*/) {
                        if (err3) {
                            console.log(err3);
                            common.returnMessage(params, 400, 'Mongo error');
                        }
                        else {
                            plugins.dispatch("/i/users/delete", {
                                params: params,
                                data: member
                            });
                            killAllSessionForUser(member._id);
                            common.returnMessage(params, 200, 'Success');
                        }
                    });
                }
            }
            else {
                common.returnMessage(params, 400, 'password not valid');
            }
        });
    }
    else {
        common.returnMessage(params, 400, 'password mandatory');
    }
    return true;

};

module.exports = usersApi;
/**
 * Check update or delete note permission.
 *  @param {params} params - params object 
 *  @returns {boolean} true
 */
usersApi.checkNoteEditPermission = async function(params) {
    let noteId = params.qstring.note_id;
    /**
     * get note
     *  @returns {object} promise
     */
    const checkPermission = () => {
        return new Promise((resolve, reject) => {
            common.db.collection('notes').findOne(
                { '_id': common.db.ObjectID(noteId)},
                function(error, note) {
                    if (error) {
                        return reject(false);
                    }
                    const globalAdmin = params.member.global_admin;
                    const isAppAdmin = (params.member.admin_of && params.member.admin_of.indexOf(params.app_id + '') >= 0) ? true : false;
                    const noteOwner = (note.owner + '' === params.member._id + '');
                    return resolve(noteOwner || (isAppAdmin && note.noteType === 'public') || (globalAdmin && note.noteType === 'public'));
                }
            );
        });
    };
    if (params.qstring.args && params.qstring.args._id) {
        noteId = params.qstring.args._id;
    }
    const permit = await checkPermission();
    return permit;
};

/**
* Create or update note
* @param {params} params - params object
* @returns {boolean} true
**/
usersApi.saveNote = async function(params) {
    var argProps = {
        'note': {
            'required': true,
            'type': 'String'
        },
        'ts': {
            'required': true,
            'type': ''
        },
        'noteType': {
            'required': true,
            'type': 'String',
        },
        'color': {
            'required': true,
            'type': 'String'
        },
        'category': {
            'required': false,
            'type': 'Boolean'
        }
    };
    const args = params.qstring.args;
    const noteValidation = common.validateArgs(args, argProps, true);
    if (noteValidation) {
        const note = {
            app_id: params.qstring.app_id,
            note: args.note,
            ts: args.ts,
            noteType: args.noteType,
            emails: args.emails || [],
            color: args.color,
            category: args.category,
            owner: params.member._id + "",
            created_at: new Date().getTime(),
            updated_at: new Date().getTime(),
        };

        if (args._id) {
            const editPermission = await usersApi.checkNoteEditPermission(params);
            if (!editPermission) {
                common.returnMessage(params, 403, 'Not allow to edit note');
            }
            else {
                delete note.created_at;
                delete note.owner;
                common.db.collection('notes').update({_id: common.db.ObjectID(args._id)}, {$set: note }, (err) => {
                    if (err) {
                        common.returnMessage(params, 503, 'Save note failed');
                    }
                    else {
                        common.returnMessage(params, 200, 'Success');
                    }
                });
            }
        }
        else {
            common.db.collection('notes').insert(note, (err) => {
                if (err) {
                    common.returnMessage(params, 503, 'Insert Note failed.');
                }
                common.returnMessage(params, 200, 'Success');
            });
        }
    }
    else {
        common.returnMessage(params, 403, 'add notes failed');
    }
    return true;
};

/**
* Delete Note
* @param {params} params - params object
* @returns {boolean} true
**/
usersApi.deleteNote = async function(params) {

    const editPermission = await usersApi.checkNoteEditPermission(params);
    if (!editPermission) {
        common.returnMessage(params, 403, 'Not allow to delete this note');
    }
    else {
        const noteId = params.qstring.note_id;
        const query = {
            '_id': common.db.ObjectID(noteId),
        };
        common.db.collection('notes').remove(query, function(error) {
            if (error) {
                common.returnMessage(params, 503, "Error deleting note");
            }
            common.returnMessage(params, 200, "Success");
        });
    }
    return true;
};

/**
* Delete deleted user note
* @param {params} params - params object
* @returns {boolean} true
**/
usersApi.deleteUserNotes = async function(params) {
    const query = {
        'owner': params.member._id + "",
    };
    common.db.collection('notes').remove(query, function(error) {
        if (error) {
            log.e("Error deleting removed users' note");
        }
    });
    return true;
};

/**
* fetch Notes
* @param {params} params - params object
* @returns {boolean} true
**/
usersApi.fetchNotes = async function(params) {
    countlyCommon.getPeriodObj(params);
    const timestampRange = countlyCommon.getTimestampRangeQuery(params, false);
    let appIds = [];
    let filtedAppIds = [];
    try {
        appIds = JSON.parse(params.qstring.notes_apps);
        filtedAppIds = appIds.filter((appId) => {
            if (params.member.global_admin || params.member.user_of.indexOf(appId) > -1 || params.member.admin_of.indexOf(appId) > -1) {
                return true;
            }
            return false;
        });
    }
    catch (e) {
        log.e(' got error while paring query notes appIds request', e);
    }
    const query = {
        'app_id': {$in: filtedAppIds},
        'ts': timestampRange,
        $or: [
            {'owner': params.member._id + ""},
            {'noteType': 'public'},
            {'emails': {'$in': [params.member.email] }},
        ],
    };

    if (params.qstring.category) {
        query.category = params.qstring.category;
    }

    if (params.qstring.note_type) {
        query.noteType = params.qstring.note_type;
    }
    let skip = params.qstring.iDisplayStart || 0;
    let limit = params.qstring.iDisplayLength || 5000;
    const sEcho = params.qstring.sEcho || 1;
    const orderDirection = {'asc': 1, 'desc': -1};
    const orderByKey = {'3': 'noteType', '2': 'ts'};
    let sortBy = {};
    if (params.qstring.sSearch) {
        /*eslint-disable */
        query.note = {$regex: new RegExp(params.qstring.sSearch, "i")};
        /*eslint-enable */
    }
    if (params.qstring.iSortCol_0 && params.qstring.iSortCol_0 !== '0') {
        Object.assign(sortBy, { [orderByKey[params.qstring.iSortCol_0]]: orderDirection[params.qstring.sSortDir_0]});
    }
    try {
        skip = parseInt(skip, 10);
        limit = parseInt(limit, 10);
    }
    catch (e) {
        log.e(' got error while paring query notes request', e);
    }
    let count = 0;
    common.db.collection('notes').find(query).count(function(error, noteCount) {
        if (!error && noteCount) {
            count = noteCount;
            common.db.collection('notes').find(query)
                .sort(sortBy)
                .skip(skip)
                .limit(limit)
                .toArray(function(err1, notes) {
                    if (err1) {
                        return common.returnMessage(params, 503, 'fatch notes failed');
                    }
                    let ownerIds = _.uniqBy(notes, 'owner');
                    common.db.collection('members')
                        .find({
                            _id: {
                                $in: ownerIds.map((n) => {
                                    return common.db.ObjectID(n.owner);
                                })
                            }
                        },
                        {full_name: 1})
                        .toArray(function(err2, members) {
                            if (err2) {
                                return common.returnMessage(params, 503, 'fatch countly members for notes failed');
                            }
                            notes = notes.map((n) => {
                                n.owner_name = 'Anonymous';
                                members.forEach((m) => {
                                    if (n.owner === m._id + "") {
                                        n.owner_name = m.full_name;
                                    }
                                });
                                return n;
                            });
                            common.returnOutput(params, {aaData: notes, iTotalDisplayRecords: count, iTotalRecords: count, sEcho});
                        });
                });
        }
        else {
            common.returnOutput(params, {aaData: [], iTotalDisplayRecords: 0, iTotalRecords: 0, sEcho});
        }
    });
    return true;
};

module.exports = usersApi;