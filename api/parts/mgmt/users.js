var usersApi = {},
    common = require('./../../utils/common.js'),
    mail = require('./mail.js'),
	plugins = require('../../../plugins/pluginManager.js'),
    crypto = require('crypto');

(function (usersApi) {

    usersApi.getCurrentUser = function (params) {
        delete params.member.password;

        common.returnOutput(params, params.member);
        return true;
    };

    usersApi.getAllUsers = function (params) {
        if (!params.member.global_admin) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }
        common.db.collection('members').find({}).toArray(function (err, members) {
    
            if (!members || err) {
                common.returnOutput(params, {});
                return false;
            }
    
            var membersObj = {};
    
            for (var i = 0; i < members.length ;i++) {
                membersObj[members[i]._id] = {
                    '_id':members[i]._id,
                    'api_key':members[i].api_key,
                    'full_name':members[i].full_name,
                    'username':members[i].username,
                    'email':members[i].email,
                    'admin_of':((members[i].admin_of && members[i].admin_of.length > 0 && members[i].admin_of[0] != "") ? members[i].admin_of : []),
                    'user_of':((members[i].user_of && members[i].user_of.length > 0 && members[i].user_of[0] != "") ? members[i].user_of : []),
                    'global_admin':(members[i].global_admin === true),
                    'is_current_user':(members[i].api_key == params.member.api_key)
                };
            }
    
            common.returnOutput(params, membersObj);
            return true;
        });
        return true;
    };

    usersApi.createUser = function (params) {
        if (!params.member.global_admin) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        var argProps = {
                'full_name':    { 'required': true, 'type': 'String' },
                'username':     { 'required': true, 'type': 'String' },
                'password':     { 'required': true, 'type': 'String' },
                'email':        { 'required': true, 'type': 'String' },
                'lang':         { 'required': false, 'type': 'String' },
                'admin_of':     { 'required': false, 'type': 'Array' },
                'user_of':      { 'required': false, 'type': 'Array' },
                'global_admin': { 'required': false, 'type': 'Boolean' }
            },
            newMember = {};

        if (!(newMember = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('members').findOne({ $or : [ {email: newMember.email}, {username: newMember.username} ] }, function(err, member) {
            if (member || err) {
                common.returnMessage(params, 200, 'Email or username already exists');
                return false;
            } else {
                createUser();
                return true;
            }
        });

        function createUser() {
            var passwordNoHash = newMember.password;
            newMember.password = common.sha1Hash(newMember.password);
            newMember.created_at = Math.floor(((new Date()).getTime()) / 1000); //TODO: Check if UTC

            common.db.collection('members').insert(newMember, {safe: true}, function(err, member) {
                member = member.ops;
                if (member && member.length && !err) {

                    member[0].api_key = common.md5Hash(member[0]._id + (new Date().getTime()));
                    common.db.collection('members').update({'_id': member[0]._id}, {$set: {api_key: member[0].api_key}},function(){});

                    mail.sendToNewMember(member[0], passwordNoHash);
                    plugins.dispatch("/i/users/create", {params:params, data:member[0]});
                    delete member[0].password;

                    common.returnOutput(params, member[0]);
                } else {
                    common.returnMessage(params, 500, 'Error creating user');
                }
            });
        }

        return true;
    };

    usersApi.updateUser = function (params) {
        var argProps = {
                'user_id':      { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24, 'exclude-from-ret-obj': true },
                'full_name':    { 'required': false, 'type': 'String' },
                'username':     { 'required': false, 'type': 'String' },
                'password':     { 'required': false, 'type': 'String' },
                'email':        { 'required': false, 'type': 'String' },
                'lang':         { 'required': false, 'type': 'String' },
                'admin_of':     { 'required': false, 'type': 'Array' },
                'user_of':      { 'required': false, 'type': 'Array' },
                'global_admin': { 'required': false, 'type': 'Boolean' },
                'send_notification': { 'required': false, 'type': 'Boolean', 'exclude-from-ret-obj': true }
            },
            updatedMember = {},
            passwordNoHash = "";

        if (!(updatedMember = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        if (!(params.member.global_admin || params.member._id === params.qstring.args.user_id)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        if (updatedMember.password) {
            passwordNoHash = updatedMember.password;
            updatedMember.password = common.sha1Hash(updatedMember.password);
        }

        common.db.collection('members').update({'_id': common.db.ObjectID(params.qstring.args.user_id)}, {'$set': updatedMember}, {safe: true}, function(err, isOk) {
            common.db.collection('members').findOne({'_id': common.db.ObjectID(params.qstring.args.user_id)}, function(err, member) {
                if (member && !err) {
					plugins.dispatch("/i/users/update", {params:params, data:updatedMember, member:member});
                    if (params.qstring.args.send_notification && passwordNoHash) {
                        mail.sendToUpdatedMember(member, passwordNoHash);
                    }
                    common.returnMessage(params, 200, 'Success');
                } else {
                    common.returnMessage(params, 500, 'Error updating user');
                }
            });
        });

        return true;
    };

    usersApi.deleteUser = function (params) {
        var argProps = {
                'user_ids': { 'required': true, 'type': 'Array' }
            },
            userIds = [];

        if (!params.member.global_admin) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        if (!(userIds = common.validateArgs(params.qstring.args, argProps).user_ids)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        for (var i = 0; i < userIds.length; i++) {
            // Each user id should be 24 chars long and a user can't delete his own account
            if (!userIds[i] || userIds[i] === params.member._id || userIds[i].length !== 24) {
                continue;
            } else {
				common.db.collection('members').findAndModify({'_id': common.db.ObjectID(userIds[i])},{},{},{remove:true},function(err, user){
                    user = user.value;
					if(!err && user)
						plugins.dispatch("/i/users/delete", {params:params, data:user});
				});
            }
        }

        common.returnMessage(params, 200, 'Success');
        return true;
    };

}(usersApi));

module.exports = usersApi;