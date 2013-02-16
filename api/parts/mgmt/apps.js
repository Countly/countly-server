var appsApi = {},
    common = require('./../../utils/common.js'),
    fs = require('fs');

(function (appsApi) {

    appsApi.getAllApps = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        common.db.collection('apps').find({}).toArray(function (err, apps) {

            if (!apps || err) {
                common.returnOutput(params, {});
                return false;
            }

            common.returnOutput(params, packApps(apps));
            return true;
        });

        return true;
    };

    appsApi.getCurrentUserApps = function (params) {
        if (params.member.global_admin) {
            appsApi.getAllApps();
            return true;
        }

        var adminOfAppIds = [],
            userOfAppIds = [];

        if (params.member.admin_of) {
            for (var i = 0; i < params.member.admin_of.length; i++) {
                adminOfAppIds[adminOfAppIds.length] = common.db.ObjectID(params.member.admin_of[i]);
            }
        }

        if (params.member.user_of) {
            for (var i = 0; i < params.member.user_of.length; i++) {
                userOfAppIds[userOfAppIds.length] = common.db.ObjectID(params.member.user_of[i]);
            }
        }

        common.db.collection('apps').find({ _id:{ '$in':adminOfAppIds } }).toArray(function (err, admin_of) {
            common.db.collection('apps').find({ _id:{ '$in':userOfAppIds } }).toArray(function (err, user_of) {
                common.returnOutput(params, {admin_of:packApps(admin_of), user_of:packApps(user_of)});
            });
        });

        return true;
    };

    appsApi.createApp = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        var argProps = {
                'name':{ 'required':true, 'type':'String' },
                'category':{ 'required':true, 'type':'String' },
                'timezone':{ 'required':true, 'type':'String' },
                'country':{ 'required':true, 'type':'String' }
            },
            newApp = {};

        if (!(newApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('apps').insert(newApp, function (err, app) {
            var appKey = common.sha1Hash(app[0]._id, true);

            common.db.collection('apps').update({'_id':app[0]._id}, {$set:{key:appKey}}, function (err, app) {
            });

            newApp._id = app[0]._id;
            newApp.key = appKey;

            common.returnOutput(params, newApp);
        });
    };

    appsApi.updateApp = function (params) {
        var argProps = {
                'app_id':{ 'required':true, 'type':'String', 'min-length':24, 'max-length':24, 'exclude-from-ret-obj':true },
                'name':{ 'required':false, 'type':'String' },
                'category':{ 'required':false, 'type':'String' },
                'timezone':{ 'required':false, 'type':'String' },
                'country':{ 'required':false, 'type':'String' }
            },
            updatedApp = {};

        if (!(updatedApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        if (Object.keys(updatedApp).length === 0) {
            common.returnMessage(params, 200, 'Nothing changed');
            return true;
        }

        if (params.member && params.member.global_admin) {
            common.db.collection('apps').update({'_id':common.db.ObjectID(params.qstring.args.app_id)}, {$set:updatedApp}, function (err, app) {
                common.returnOutput(params, updatedApp);
            });
        } else {
            common.db.collection('members').findOne({'_id':params.member._id}, {admin_of:1}, function (err, member) {
                if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
                    common.db.collection('apps').update({'_id':common.db.ObjectID(params.qstring.args.app_id)}, {$set:updatedApp}, function (err, app) {
                        common.returnOutput(params, updatedApp);
                    });
                } else {
                    common.returnMessage(params, 401, 'User does not have admin rights for this app');
                }
            });
        }

        return true;
    };

    appsApi.deleteApp = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        var argProps = {
                'app_id':{ 'required':true, 'type':'String', 'min-length':24, 'max-length':24 }
            },
            appId = '';

        if (!(appId = common.validateArgs(params.qstring.args, argProps).app_id)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        common.db.collection('apps').remove({'_id':common.db.ObjectID(appId)}, {safe:true}, function (err, result) {

            if (!result) {
                common.returnMessage(params, 500, 'Error deleting app');
                return false;
            }

            var iconPath = __dirname + '/public/appimages/' + appId + '.png';
            fs.unlink(iconPath, function () {
            });

            common.db.collection('members').update({}, {$pull:{'apps':appId, 'admin_of':appId, 'user_of':appId}}, {multi:true}, function (err, app) {
            });

            deleteAppData(appId);
            common.returnMessage(params, 200, 'Success');
            return true;
        });

        return true;
    };

    appsApi.resetApp = function (params) {
        var argProps = {
                'app_id':{ 'required':true, 'type':'String', 'min-length':24, 'max-length':24 }
            },
            appId = '';

        if (!(appId = common.validateArgs(params.qstring.args, argProps).app_id)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        if (params.member.global_admin) {
            deleteAppData(appId);
            common.returnMessage(params, 200, 'Success');
        } else {
            common.db.collection('members').findOne({ admin_of:appId, api_key:params.member.api_key}, function (err, member) {
                if (!err && member) {
                    deleteAppData(appId);
                    common.returnMessage(params, 200, 'Success');
                } else {
                    common.returnMessage(params, 401, 'User does not have admin rights for this app');
                }
            });
        }

        return true;
    };

    function deleteAppData(appId) {
        common.db.collection('sessions').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('users').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('carriers').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('locations').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('cities').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('app_users' + appId).drop();
        common.db.collection('devices').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('device_details').remove({'_id':common.db.ObjectID(appId)});
        common.db.collection('app_versions').remove({'_id':common.db.ObjectID(appId)});

        common.db.collection('events').findOne({'_id':common.db.ObjectID(appId)}, function (err, events) {
            if (!err && events && events.list) {
                for (var i = 0; i < events.list.length; i++) {
                    common.db.collection(events.list[i] + appId).drop();
                }

                common.db.collection('events').remove({'_id':common.db.ObjectID(appId)});
            }
        });
    }

    function packApps(apps) {
        var appsObj = {};

        for (var i = 0; i < apps.length; i++) {
            appsObj[apps[i]._id] = {
                '_id':apps[i]._id,
                'category':apps[i].category,
                'country':apps[i].country,
                'key':apps[i].key,
                'name':apps[i].name,
                'timezone':apps[i].timezone
            };
        }

        return appsObj;
    }

}(appsApi));

module.exports = appsApi;