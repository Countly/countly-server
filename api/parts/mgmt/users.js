/**
* This module is meant handling dashboard user accounts
* @module api/parts/mgmt/users
*/

/** @lends module:api/parts/mgmt/users */
var usersApi = {},
    common = require('./../../utils/common.js'),
    mail = require('./mail.js'),
    plugins = require('../../../plugins/pluginManager.js');


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
        newMember.password = await common.argon2Hash(newMember.password);
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
        passwordNoHash = updatedMember.password;
        updatedMember.password = await common.argon2Hash(updatedMember.password);
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

    /**
    * Removes all active sessions for user
    * @param {string} userId - id of the user for which to remove sessions
    **/
    function killAllSessionForUser(userId) {
        common.db.collection('sessions_').find({"session": { $regex: userId }}).toArray(function(err, sessions) {

            var delete_us = [];
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
                    if (updatedMember.password) {
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
            common.db.collection('auth_tokens').remove({ 'owner': userIds[i] });
            common.db.collection('members').findAndModify({ '_id': common.db.ObjectID(userIds[i]) }, {}, {}, { remove: true }, function(err, user) {
                if (!err && user && user.ok && user.value) {
                    plugins.dispatch("/i/users/delete", {
                        params: params,
                        data: user.value
                    });
                }
            });
        }
    }

    common.returnMessage(params, 200, 'Success');
    return true;
};

module.exports = usersApi;