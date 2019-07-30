/**
* This module is meant for managing apps
* @module api/parts/mgmt/apps
*/

/** @lends module:api/parts/mgmt/apps */
var appsApi = {},
    common = require('./../../utils/common.js'),
    log = common.log('mgmt:apps'),
    moment = require('moment-timezone'),
    crypto = require('crypto'),
    plugins = require('../../../plugins/pluginManager.js'),
    jimp = require('jimp'),
    fs = require('fs'),
    countlyFs = require('./../../utils/countlyFs.js');

/**
* Get all apps and outputs to browser, requires global admin permission
* @param {params} params - params object
* @returns {boolean} true if got data from db, false if did not
**/
appsApi.getAllApps = function(params) {
    if (!(params.member.global_admin)) {
        common.returnMessage(params, 401, 'User is not a global administrator');
        return false;
    }

    common.db.collection('apps').find({}).toArray(function(err, apps) {

        if (!apps || err) {
            common.returnOutput(params, {
                admin_of: {},
                user_of: {}
            });
            return false;
        }

        var appsObj = packApps(apps);
        common.returnOutput(params, {
            admin_of: appsObj,
            user_of: appsObj
        });
        return true;
    });

    return true;
};

/**
* Get only apps that current user has access to and outputs to browser
* @param {params} params - params object
* @returns {boolean} true if got data from db, false if did not
**/
appsApi.getCurrentUserApps = function(params) {
    if (params.member.global_admin) {
        appsApi.getAllApps(params);
        return true;
    }

    var adminOfAppIds = [],
        userOfAppIds = [];

    if (params.member.admin_of) {
        for (let i = 0; i < params.member.admin_of.length ;i++) {
            if (params.member.admin_of[i] === "") {
                continue;
            }

            adminOfAppIds[adminOfAppIds.length] = common.db.ObjectID(params.member.admin_of[i]);
        }
    }

    if (params.member.user_of) {
        for (let i = 0; i < params.member.user_of.length ;i++) {
            userOfAppIds[userOfAppIds.length] = common.db.ObjectID(params.member.user_of[i]);
        }
    }

    common.db.collection('apps').find({ _id: { '$in': adminOfAppIds } }).toArray(function(err, admin_of) {
        common.db.collection('apps').find({ _id: { '$in': userOfAppIds } }).toArray(function(err2, user_of) {
            common.returnOutput(params, {
                admin_of: packApps(admin_of),
                user_of: packApps(user_of)
            });
        });
    });

    return true;
};

/**
* Gets app details for specific app and outputs to browser
* @param {params} params - params object
* @returns {boolean} true if got data from db, false if did not
**/
appsApi.getAppsDetails = function(params) {
    if (params.app.owner) {
        params.app.owner_id = params.app.owner;
        params.app.owner = common.db.ObjectID(params.app.owner + "");
    }
    common.db.collection('app_users' + params.qstring.app_id).find({}, {
        ls: 1,
        _id: 0
    }).sort({ls: -1}).limit(1).toArray(function(err, last) {
        common.db.collection('members').findOne({ _id: params.app.owner }, {
            full_name: 1,
            username: 1
        }, function(err2, owner) {
            if (owner) {
                if (owner.full_name && owner.full_name !== "") {
                    params.app.owner = owner.full_name;
                }
                else if (owner.username && owner.username !== "") {
                    params.app.owner = owner.username;
                }
                else {
                    params.app.owner = "";
                }
            }
            else {
                params.app.owner = "";
            }
            common.db.collection('members').find({ global_admin: true }, {
                full_name: 1,
                username: 1
            }).toArray(function(err3, global_admins) {
                common.db.collection('members').find({ admin_of: params.qstring.app_id }, {
                    full_name: 1,
                    username: 1
                }).toArray(function(err4, admins) {
                    common.db.collection('members').find({ user_of: params.qstring.app_id }, {
                        full_name: 1,
                        username: 1
                    }).toArray(function(err5, users) {
                        common.returnOutput(params, {
                            app: {
                                owner: params.app.owner || "",
                                owner_id: params.app.owner_id || "",
                                created_at: params.app.created_at || 0,
                                edited_at: params.app.edited_at || 0,
                                last_data: (typeof last !== "undefined" && last.length) ? last[0].ls : 0,
                            },
                            global_admin: global_admins || [],
                            admin: admins || [],
                            user: users || []
                        });
                    });
                });
            });
        });
    });

    return true;
};
/**
*  upload app icon function
*  @param {params} params - params object with args to create app
*  @return {object} return promise object;
**/
const iconUpload = function(params) {
    const appId = params.app_id || params.qstring.args.app_id;
    if (params.files && params.files.app_image) {
        const tmp_path = params.files.app_image.path,
            target_path = __dirname + '/../../../frontend/express/public/appimages/' + appId + ".png",
            type = params.files.app_image.type;
        if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
            fs.unlink(tmp_path, function() {});
            log.d("Invalid file type");
            return Promise.reject();
        }
        try {
            return jimp.read(tmp_path, function(err, icon) {
                if (err) {
                    log.e(err, err.stack);
                }
                icon.cover(72, 72).getBuffer(jimp.MIME_PNG, function(err2, buffer) {
                    countlyFs.saveData("appimages", target_path, buffer, {id: appId + ".png", writeMode: "overwrite"}, function(err3) {
                        if (err3) {
                            log.e(err3, err3.stack);
                        }
                        fs.unlink(tmp_path, function() {});
                    });
                });
            });
        }
        catch (e) {
            log.e(e.stack);
        }
    }
};

/**
* Creates new app, and outputs result to browser
* @param {params} params - params object with args to create app
* @returns {boolean} true if operation successful
**/
appsApi.createApp = function(params) {
    var argProps = {
            'name': {
                'required': true,
                'type': 'String'
            },
            'country': {
                'required': false,
                'type': 'String'
            },
            'type': {
                'required': false,
                'type': 'String'
            },
            'category': {
                'required': false,
                'type': 'String'
            },
            'timezone': {
                'required': false,
                'type': 'String'
            },
            'checksum_salt': {
                'required': false,
                'type': 'String'
            }
        },
        newApp = {};

    var createAppValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(newApp = createAppValidation.obj)) {
        common.returnMessage(params, 400, 'Error: ' + createAppValidation.errors);
        return false;
    }

    for (let i in params.qstring.args) {
        if (typeof newApp[i] === "undefined") {
            newApp[i] = params.qstring.args[i];
        }
    }

    processAppProps(newApp);

    newApp.created_at = Math.floor(((new Date()).getTime()) / 1000);
    newApp.edited_at = newApp.created_at;
    newApp.owner = params.member._id + "";
    newApp.seq = 0;

    common.db.collection('apps').insert(newApp, function(err, app) {
        if (!err && app && app.ops && app.ops[0] && app.ops[0]._id) {
            var appKey = common.sha1Hash(app.ops[0]._id, true);

            common.db.collection('apps').update({'_id': app.ops[0]._id}, {$set: {key: appKey}}, function() {});

            newApp._id = app.ops[0]._id;
            newApp.key = appKey;

            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ls: -1}, { background: true }, function() {});
            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({"uid": 1}, { background: true }, function() {});
            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({"sc": 1}, { background: true }, function() {});
            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({
                "lac": 1,
                "ls": 1
            }, { background: true }, function() {});
            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({"tsd": 1}, { background: true }, function() {});
            common.db.collection('app_users' + app.ops[0]._id).ensureIndex({"did": 1}, { background: true }, function() {});
            common.db.collection('app_user_merges' + app.ops[0]._id).ensureIndex({cd: 1}, {
                expireAfterSeconds: 60 * 60 * 3,
                background: true
            }, function() {});
            common.db.collection('metric_changes' + app.ops[0]._id).ensureIndex({ts: -1}, { background: true }, function() {});
            common.db.collection('metric_changes' + app.ops[0]._id).ensureIndex({ts: 1, "cc.o": 1}, { background: true }, function() {});
            common.db.collection('metric_changes' + app.ops[0]._id).ensureIndex({uid: 1}, { background: true }, function() {});
            plugins.dispatch("/i/apps/create", {
                params: params,
                appId: app.ops[0]._id,
                data: newApp
            });
            iconUpload(Object.assign({}, params, {app_id: app.ops[0]._id}));
            common.returnOutput(params, newApp);
        }
        else {
            common.returnMessage(params, 500, "Error creating App: " + err);
        }
    });
};

/**
* Updates existing app, and outputs result to browser
* @param {params} params - params object with args to update app with
* @returns {boolean} true if operation successful
**/
appsApi.updateApp = function(params) {
    var argProps = {
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24,
                'exclude-from-ret-obj': true
            },
            'name': {
                'required': false,
                'type': 'String'
            },
            'type': {
                'required': false,
                'type': 'String'
            },
            'category': {
                'required': false,
                'type': 'String'
            },
            'key': {
                'required': false,
                'type': 'String'
            },
            'timezone': {
                'required': false,
                'type': 'String'
            },
            'country': {
                'required': false,
                'type': 'String'
            },
            'checksum_salt': {
                'required': false,
                'type': 'String'
            },
            'locked': {
                'required': false,
                'type': 'Boolean'
            }
        },
        updatedApp = {};

    var updateAppValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(updatedApp = updateAppValidation.obj)) {
        common.returnMessage(params, 400, 'Error: ' + updateAppValidation.errors);
        return false;
    }

    var invalidProps = validateAppUpdateProps(updatedApp);
    if (invalidProps.length > 0) {
        common.returnMessage(params, 400, 'Invalid props: ' + invalidProps);
        return false;
    }

    for (var i in params.qstring.args) {
        if (typeof updatedApp[i] === "undefined" && i !== "app_id") {
            updatedApp[i] = params.qstring.args[i];
        }
    }

    if (Object.keys(updatedApp).length === 0) {
        common.returnMessage(params, 200, 'Nothing changed');
        return true;
    }

    updatedApp.edited_at = Math.floor(((new Date()).getTime()) / 1000);

    common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.args.app_id), function(err, appBefore) {
        if (err || !appBefore) {
            common.returnMessage(params, 404, 'App not found');
        }
        else {
            if (params.member && params.member.global_admin) {
                common.db.collection('apps').update({'_id': common.db.ObjectID(params.qstring.args.app_id)}, {$set: updatedApp}, function() {
                    plugins.dispatch("/i/apps/update", {
                        params: params,
                        appId: params.qstring.args.app_id,
                        data: {
                            app: appBefore,
                            update: updatedApp
                        }
                    });
                    iconUpload(params);
                    common.returnOutput(params, updatedApp);
                });
            }
            else {
                common.db.collection('members').findOne({'_id': params.member._id}, {admin_of: 1}, function(err2, member) {
                    if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
                        common.db.collection('apps').update({'_id': common.db.ObjectID(params.qstring.args.app_id)}, {$set: updatedApp}, function() {
                            plugins.dispatch("/i/apps/update", {
                                params: params,
                                appId: params.qstring.args.app_id,
                                data: {
                                    app: appBefore,
                                    update: updatedApp
                                }
                            });
                            iconUpload(params);
                            common.returnOutput(params, updatedApp);
                        });
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                });
            }
        }
    });

    return true;
};

/**
* Updates existing app's configurations and outputs result to browser
* @param {params} params - params object with args to update app with
* @returns {boolean} true if operation successful
**/
appsApi.updateAppPlugins = function(params) {
    var props = {
        'app_id': {
            'required': true,
            'type': 'String',
            'min-length': 24,
            'max-length': 24,
            'exclude-from-ret-obj': true
        },
    };

    log.d('Updating plugin config for app %s: %j', params.qstring.app_id, params.qstring.args);

    var updateAppPluginsValidation = common.validateArgs(params.qstring, props, true);
    if (!updateAppPluginsValidation.result) {
        common.returnMessage(params, 400, 'Error: ' + updateAppPluginsValidation.errors);
        return false;
    }

    common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.app_id), (err1, app) => {
        if (err1 || !app) {
            log.w('App %s not found %j', params.qstring.app_id, err1 || '');
            return common.returnMessage(params, 404, 'App not found');
        }

        let promises = [];

        Object.keys(params.qstring.args).forEach(k => {
            if (plugins.getPlugins().indexOf(k) !== -1) {
                promises.push(new Promise((resolve, reject) => {
                    plugins.dispatch('/i/apps/update/plugins/' + k, {
                        params: params,
                        app: app,
                        config: params.qstring.args[k]
                    }, (err2, changes) => {
                        if (err2) {
                            reject(err2);
                        }
                        else if (changes) {
                            resolve({[k]: changes});
                        }
                        else {
                            log.d('Updating %s plugin config for app %s in db: %j', k, params.qstring.app_id, params.qstring.args[k]);
                            common.dbPromise('apps', 'updateOne', {_id: app._id}, {$set: {[`plugins.${k}`]: params.qstring.args[k]}}).then(() => {
                                plugins.dispatch('/systemlogs', {
                                    params: params,
                                    action: `plugin_${k}_config_updated`,
                                    data: {
                                        before: common.dot(app, `plugins.${k}` || {}),
                                        after: params.qstring.args[k]
                                    }
                                });
                                resolve({[k]: params.qstring.args[k]});
                            }, reject);
                        }
                    });
                }));
            }
            //for plugins sections we might not have plugin
            else {
                promises.push(new Promise((resolve, reject) => {
                    log.d('Updating %s plugin config for app %s in db: %j', k, params.qstring.app_id, params.qstring.args[k]);
                    common.dbPromise('apps', 'updateOne', {_id: app._id}, {$set: {[`plugins.${k}`]: params.qstring.args[k]}}).then(() => {
                        plugins.dispatch('/systemlogs', {
                            params: params,
                            action: `plugin_${k}_config_updated`,
                            data: {
                                before: common.dot(app, `plugins.${k}` || {}),
                                after: params.qstring.args[k]
                            }
                        });
                        resolve({[k]: params.qstring.args[k]});
                    }, reject);
                }));
            }
        });

        if (promises.length) {
            Promise.all(promises).then(results => {
                log.d('Plugin config updates for app %s returned %j', params.qstring.app_id, results);
                let ret = {}, errors = [];
                results.forEach(r => {
                    let plugin = Object.keys(r)[0],
                        config = Array.isArray(r[plugin]) ? r[plugin][0] : r[plugin];
                    log.d('Result for %s is %j', plugin, config);
                    if (typeof config === 'object') {
                        Object.assign(ret, {[plugin]: config});
                    }
                    else {
                        errors.push(config);
                    }
                });
                ret = {
                    _id: app._id,
                    plugins: ret
                };
                if (errors.length) {
                    ret.result = errors.join('\n');
                }
                common.returnOutput(params, ret);
            }, err => {
                log.e('Error during plugin config updates for app %s: %j %s, %d', params.qstring.app_id, err, typeof err, err.length);
                common.returnMessage(params, 400, 'Couldn\'t update plugin: ' + (typeof err === 'string' ? err : err.message || err.code || JSON.stringify(err)));
            });
        }
        else {
            common.returnMessage(params, 200, 'Nothing changed');
        }

    });

    return true;
};

/**
* Deletes existing app's and outputs result to browser
* @param {params} params - params object with app_id to delete
* @returns {boolean} true if operation successful
**/
appsApi.deleteApp = function(params) {

    var argProps = {
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24
            }
        },
        appId = '';

    var deleteAppValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(deleteAppValidation.obj && (appId = deleteAppValidation.obj.app_id))) {
        common.returnMessage(params, 400, 'Error: ' + deleteAppValidation.errors);
        return false;
    }
    common.db.collection('apps').findOne({'_id': common.db.ObjectID(appId)}, function(err, app) {
        if (!err && app) {
            if (app.locked) {
                common.returnMessage(params, 403, 'Application is locked');
            }
            else if (params.member && params.member.global_admin) {
                removeApp(app);
            }
            else {
                common.db.collection('members').findOne({'_id': params.member._id}, {admin_of: 1}, function(err2, member) {
                    if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
                        removeApp(app);
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                });
            }
        }
        else {
            common.returnMessage(params, 500, 'Error deleting app');
        }
    });

    /**
    * Deletes TopEvents data of the application.
    **/
    function deleteTopEventsData() {
        const collectionName = "top_events";
        const app_id = common.db.ObjectID(appId);
        common.db.collection(collectionName).remove({app_id}, function() {});
    }

    /**
    * Removes the app after validation of params and calls deleteAppData
    * @param {object} app - app document
    **/
    function removeApp(app) {
        common.db.collection('apps').remove({'_id': common.db.ObjectID(appId)}, {safe: true}, function(err) {
            if (err) {
                common.returnMessage(params, 500, 'Error deleting app');
                return false;
            }

            var iconPath = __dirname + '/../../../frontend/express/public/appimages/' + appId + '.png';
            countlyFs.deleteFile("appimages", iconPath, {id: appId + ".png"}, function() {});

            common.db.collection('members').update({}, {
                $pull: {
                    'apps': appId,
                    'admin_of': appId,
                    'user_of': appId
                }
            }, {multi: true}, function() {});

            deleteAppData(appId, true, params, app);
            deleteTopEventsData();
            common.returnMessage(params, 200, 'Success');
            return true;
        });
    }

    return true;
};

/**
* Resets app to clean state
* @param {params} params - params object with app_id to reset
* @returns {boolean} true if operation successful
**/
appsApi.resetApp = function(params) {
    var argProps = {
            'app_id': {
                'required': true,
                'type': 'String',
                'min-length': 24,
                'max-length': 24
            }
        },
        appId = '';
    var resetAppValidation = common.validateArgs(params.qstring.args, argProps, true);
    if (!(resetAppValidation.obj && (appId = resetAppValidation.obj.app_id))) {
        common.returnMessage(params, 400, 'Error: ' + resetAppValidation.errors);
        return false;
    }
    common.db.collection('apps').findOne({'_id': common.db.ObjectID(appId)}, function(err, app) {
        if (!err && app) {
            if (app.locked) {
                common.returnMessage(params, 403, 'Application is locked');
            }
            else if (params.member.global_admin) {
                deleteAppData(appId, false, params, app);
                common.returnMessage(params, 200, 'Success');
            }
            else {
                common.db.collection('members').findOne({
                    admin_of: appId,
                    api_key: params.member.api_key
                }, function(err2, member) {
                    if (!err2 && member) {
                        deleteAppData(appId, false, params, app);
                        common.returnMessage(params, 200, 'Success');
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                });
            }
        }
        else {
            common.returnMessage(params, 404, 'App not found');
        }
    });

    return true;
};

/**
* Deletes app's data, either all or for specific period, as well as can reset data to clean state
* @param {string} appId - id of the app for which to delete data
* @param {boolean} fromAppDelete - true if all document will also be deleted
* @param {params} params - params object
* @param {object} app - app document
**/
function deleteAppData(appId, fromAppDelete, params, app) {
    if (fromAppDelete || !params.qstring.args.period || params.qstring.args.period === "all" || params.qstring.args.period === "reset") {
        deleteAllAppData(appId, fromAppDelete, params, app);
    }
    else {
        deletePeriodAppData(appId, fromAppDelete, params, app);
    }
}

/**
* Deletes all app's data or resets data to clean state
* @param {string} appId - id of the app for which to delete data
* @param {boolean} fromAppDelete - true if all document will also be deleted
* @param {params} params - params object
* @param {object} app - app document
**/
function deleteAllAppData(appId, fromAppDelete, params, app) {
    if (!fromAppDelete) {
        common.db.collection('apps').update({'_id': common.db.ObjectID(appId)}, {$set: {seq: 0}}, function() {});
    }
    common.db.collection('users').remove({'_id': {$regex: appId + ".*"}}, function() {});
    common.db.collection('carriers').remove({'_id': {$regex: appId + ".*"}}, function() {});
    common.db.collection('devices').remove({'_id': {$regex: appId + ".*"}}, function() {});
    common.db.collection('device_details').remove({'_id': {$regex: appId + ".*"}}, function() {});
    common.db.collection('cities').remove({'_id': {$regex: appId + ".*"}}, function() {});

    /**
    * Deletes all app's events
    **/
    function deleteEvents() {
        common.db.collection('events').findOne({'_id': common.db.ObjectID(appId)}, function(err, events) {
            if (!err && events && events.list) {

                common.arrayAddUniq(events.list, plugins.internalEvents);
                for (var i = 0; i < events.list.length; i++) {
                    var collectionNameWoPrefix = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                    common.db.collection("events" + collectionNameWoPrefix).drop(function() {});
                }
                if (fromAppDelete || params.qstring.args.period === "reset") {
                    common.db.collection('events').remove({'_id': common.db.ObjectID(appId)}, function() {});
                }
            }
        });
    }
    common.db.collection('app_users' + appId).drop(function() {
        if (!fromAppDelete) {
            common.db.collection('metric_changes' + appId).drop(function() {
                common.db.collection('metric_changes' + appId).ensureIndex({ts: -1}, { background: true }, function() {});
                common.db.collection('metric_changes' + appId).ensureIndex({ts: 1, "cc.o": 1}, { background: true }, function() {});
                common.db.collection('metric_changes' + appId).ensureIndex({uid: 1}, { background: true }, function() {});
            });
            common.db.collection('app_user_merges' + appId).drop(function() {
                common.db.collection('app_user_merges' + appId).ensureIndex({cd: 1}, {
                    expireAfterSeconds: 60 * 60 * 3,
                    background: true
                }, function() {});
            });
            if (params.qstring.args.period === "reset") {
                plugins.dispatch("/i/apps/reset", {
                    params: params,
                    appId: appId,
                    data: app
                }, deleteEvents);
            }
            else {
                plugins.dispatch("/i/apps/clear_all", {
                    params: params,
                    appId: appId,
                    data: app
                }, deleteEvents);
            }
        }
        else {
            common.db.collection('metric_changes' + appId).drop(function() {});
            common.db.collection('app_user_merges' + appId).drop(function() {});
            plugins.dispatch("/i/apps/delete", {
                params: params,
                appId: appId,
                data: app
            }, deleteEvents);
        }
    });
    if (fromAppDelete) {
        common.db.collection('notes').remove({'app_id': appId}, function() {});
    }
}

/**
* Deletes app's data for specific period
* @param {string} appId - id of the app for which to delete data
* @param {boolean} fromAppDelete - true if all document will also be deleted
* @param {params} params - params object
* @param {object} app - app document
**/
function deletePeriodAppData(appId, fromAppDelete, params, app) {
    var periods = {
        "1month": 1,
        "3month": 3,
        "6month": 6,
        "1year": 12,
        "2year": 24
    };
    var back = periods[params.qstring.args.period];
    var skip = {};
    var dates = {};
    var now = moment();
    skip[appId + "_" + now.format('YYYY:M')] = true;
    skip[appId + "_" + now.format('YYYY') + ":0"] = true;
    dates[now.format('YYYY:M')] = true;
    dates[now.format('YYYY') + ":0"] = true;
    for (let i = 0; i < common.base64.length; i++) {
        skip[appId + "_" + now.format('YYYY:M') + "_" + common.base64[i]] = true;
        skip[appId + "_" + now.format('YYYY') + ":0" + "_" + common.base64[i]] = true;
        dates[now.format('YYYY:M') + "_" + common.base64[i]] = true;
        dates[now.format('YYYY') + ":0" + "_" + common.base64[i]] = true;
    }
    for (let i = 0; i < back; i++) {
        skip[appId + "_" + now.subtract(1, "months").format('YYYY:M')] = true;
        skip[appId + "_" + now.format('YYYY') + ":0"] = true;
        dates[now.format('YYYY:M')] = true;
        dates[now.format('YYYY') + ":0"] = true;
        for (let j = 0; j < common.base64.length; j++) {
            skip[appId + "_" + now.format('YYYY:M') + "_" + common.base64[j]] = true;
            skip[appId + "_" + now.format('YYYY') + ":0" + "_" + common.base64[j]] = true;
            dates[now.format('YYYY:M') + "_" + common.base64[j]] = true;
            dates[now.format('YYYY') + ":0" + "_" + common.base64[j]] = true;
        }
    }

    /*
         This variable set after the above loop because it already does the necessary subtraction
         */
    var oldestTimestampWanted = Math.round(now.valueOf() / 1000);

    skip = Object.keys(skip);
    dates = Object.keys(dates);

    common.db.collection('users').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: skip}}]}, function() {});
    common.db.collection('carriers').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: skip}}]}, function() {});
    common.db.collection('devices').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: skip}}]}, function() {});
    common.db.collection('device_details').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: skip}}]}, function() {});
    common.db.collection('cities').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: skip}}]}, function() {});

    common.db.collection('events').findOne({'_id': common.db.ObjectID(appId)}, function(err, events) {
        if (!err && events && events.list) {
            common.arrayAddUniq(events.list, plugins.internalEvents);
            for (let i = 0; i < events.list.length; i++) {
                var segments = [];

                if (events.list[i] && events.segments && events.segments[events.list[i]]) {
                    segments = events.segments[events.list[i]];
                }

                segments.push("no-segment");
                var docs = [];
                for (let j = 0; j < segments.length; j++) {
                    for (let k = 0; k < dates.length; k++) {
                        docs.push(segments[j] + "_" + dates[k]);
                    }
                }
                var collectionNameWoPrefix = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                common.db.collection("events" + collectionNameWoPrefix).remove({'_id': {$nin: docs}}, function() {});
            }
        }
    });

    /*
    Set ls (last session) timestamp of users who had their last session before oldestTimestampWanted to 1
    This prevents these users to be included as "total users" in the reports
    */
    common.db.collection('app_users' + appId).update({ls: {$lte: oldestTimestampWanted}}, {$set: {ls: 1}});

    /*
    Remove all metric changes that happened before oldestTimestampWanted since we no longer need
    old metric changes
    */
    common.db.collection('metric_changes' + appId).remove({ts: {$lte: oldestTimestampWanted}});

    plugins.dispatch("/i/apps/clear", {
        params: params,
        appId: appId,
        data: app,
        moment: now,
        dates: dates,
        ids: skip
    });
}

/**
* Converts apps array into object with app_id as key
* @param {array} apps - array of apps documents
* @returns {object} with app_id as key and app doc as value
**/
function packApps(apps) {
    var appsObj = {};

    for (let i = 0; i < apps.length ;i++) {
        appsObj[apps[i]._id] = {
            '_id': apps[i]._id,
            'category': apps[i].category,
            'country': apps[i].country,
            'key': apps[i].key,
            'name': apps[i].name,
            'timezone': apps[i].timezone
        };
    }

    return appsObj;
}

/**
* Validate and correct app's properties, by modifying original object
* @param {object} app - app document
**/
function processAppProps(app) {
    if (!app.country || !isValidCountry(app.country)) {
        app.country = plugins.getConfig("apps").country;
    }

    if (!app.timezone || !isValidTimezone(app.timezone)) {
        app.timezone = plugins.getConfig("apps").timezone;
    }

    if (!app.category || !isValidCategory(app.category)) {
        app.category = plugins.getConfig("apps").category;
    }

    if (!app.type || !isValidType(app.type)) {
        app.type = "mobile";
    }
}

/**
* Validate and correct an app update's properties, replacing invalid
* values with defaults
* @param {object} app - app update document
* @returns {array} invalidProps - keys of invalid properties
**/
function validateAppUpdateProps(app) {
    const invalidProps = [];

    if (app.country && !isValidCountry(app.country)) {
        invalidProps.push("country");
    }

    if (app.timezone && !isValidTimezone(app.timezone)) {
        invalidProps.push("timezone");
    }

    if (app.category && !isValidCategory(app.category)) {
        invalidProps.push("category");
    }

    if (app.type && !isValidType(app.type)) {
        invalidProps.push("type");
    }

    return invalidProps;
}

/**
* Validate timezone
* @param {string} timezone - timezone value
* @returns {boolean} if timezone was valid or not
**/
function isValidTimezone(timezone) {
    var timezones = ["Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers", "Africa/Asmera", "Africa/Bamako", "Africa/Bangui", "Africa/Banjul", "Africa/Bissau", "Africa/Blantyre", "Africa/Brazzaville", "Africa/Bujumbura", "Africa/Cairo", "Africa/Casablanca", "Africa/Ceuta", "Africa/Conakry", "Africa/Dakar", "Africa/Dar_es_Salaam", "Africa/Djibouti", "Africa/Douala", "Africa/El_Aaiun", "Africa/Freetown", "Africa/Gaborone", "Africa/Harare", "Africa/Johannesburg", "Africa/Kampala", "Africa/Khartoum", "Africa/Kigali", "Africa/Kinshasa", "Africa/Lagos", "Africa/Libreville", "Africa/Lome", "Africa/Luanda", "Africa/Lubumbashi", "Africa/Lusaka", "Africa/Malabo", "Africa/Maputo", "Africa/Maseru", "Africa/Mbabane", "Africa/Mogadishu", "Africa/Monrovia", "Africa/Nairobi", "Africa/Ndjamena", "Africa/Niamey", "Africa/Nouakchott", "Africa/Ouagadougou", "Africa/Porto-Novo", "Africa/Sao_Tome", "Africa/Tripoli", "Africa/Tunis", "Africa/Windhoek", "America/Anchorage", "America/Anguilla", "America/Antigua", "America/Araguaina", "America/Aruba", "America/Asuncion", "America/Bahia", "America/Barbados", "America/Belem", "America/Belize", "America/Boa_Vista", "America/Bogota", "America/Buenos_Aires", "America/Campo_Grande", "America/Caracas", "America/Cayenne", "America/Cayman", "America/Chicago", "America/Costa_Rica", "America/Cuiaba", "America/Curacao", "America/Danmarkshavn", "America/Dawson_Creek", "America/Denver", "America/Dominica", "America/Edmonton", "America/El_Salvador", "America/Fortaleza", "America/Godthab", "America/Grand_Turk", "America/Grenada", "America/Guadeloupe", "America/Guatemala", "America/Guayaquil", "America/Guyana", "America/Halifax", "America/Havana", "America/Hermosillo", "America/Iqaluit", "America/Jamaica", "America/La_Paz", "America/Lima", "America/Los_Angeles", "America/Maceio", "America/Managua", "America/Manaus", "America/Martinique", "America/Mazatlan", "America/Mexico_City", "America/Miquelon", "America/Montevideo", "America/Montreal", "America/Montserrat", "America/Nassau", "America/New_York", "America/Noronha", "America/Panama", "America/Paramaribo", "America/Phoenix", "America/Port-au-Prince", "America/Port_of_Spain", "America/Porto_Velho", "America/Puerto_Rico", "America/Recife", "America/Regina", "America/Rio_Branco", "America/Santiago", "America/Santo_Domingo", "America/Sao_Paulo", "America/Scoresbysund", "America/St_Johns", "America/St_Kitts", "America/St_Lucia", "America/St_Thomas", "America/St_Vincent", "America/Tegucigalpa", "America/Thule", "America/Tijuana", "America/Toronto", "America/Tortola", "America/Vancouver", "America/Whitehorse", "America/Winnipeg", "America/Yellowknife", "Antarctica/Casey", "Antarctica/Davis", "Antarctica/DumontDUrville", "Antarctica/Mawson", "Antarctica/Palmer", "Antarctica/Rothera", "Antarctica/Syowa", "Antarctica/Vostok", "Arctic/Longyearbyen", "Asia/Aden", "Asia/Almaty", "Asia/Amman", "Asia/Aqtau", "Asia/Aqtobe", "Asia/Ashgabat", "Asia/Baghdad", "Asia/Bahrain", "Asia/Baku", "Asia/Bangkok", "Asia/Beirut", "Asia/Bishkek", "Asia/Brunei", "Asia/Calcutta", "Asia/Choibalsan", "Asia/Colombo", "Asia/Damascus", "Asia/Dhaka", "Asia/Dili", "Asia/Dubai", "Asia/Dushanbe", "Asia/Gaza", "Asia/Hong_Kong", "Asia/Hovd", "Asia/Irkutsk", "Asia/Jakarta", "Asia/Jayapura", "Asia/Jerusalem", "Asia/Kabul", "Asia/Kamchatka", "Asia/Karachi", "Asia/Katmandu", "Asia/Krasnoyarsk", "Asia/Kuala_Lumpur", "Asia/Kuwait", "Asia/Macau", "Asia/Magadan", "Asia/Makassar", "Asia/Manila", "Asia/Muscat", "Asia/Nicosia", "Asia/Omsk", "Asia/Phnom_Penh", "Asia/Pyongyang", "Asia/Qatar", "Asia/Rangoon", "Asia/Riyadh", "Asia/Saigon", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore", "Asia/Taipei", "Asia/Tashkent", "Asia/Tbilisi", "Asia/Tehran", "Asia/Thimphu", "Asia/Tokyo", "Asia/Ulaanbaatar", "Asia/Vientiane", "Asia/Vladivostok", "Asia/Yakutsk", "Asia/Yekaterinburg", "Asia/Yerevan", "Atlantic/Azores", "Atlantic/Bermuda", "Atlantic/Canary", "Atlantic/Cape_Verde", "Atlantic/Faeroe", "Atlantic/Reykjavik", "Atlantic/South_Georgia", "Atlantic/St_Helena", "Atlantic/Stanley", "Australia/Adelaide", "Australia/Brisbane", "Australia/Darwin", "Australia/Hobart", "Australia/Perth", "Australia/Sydney", "Etc/GMT", "Europe/Amsterdam", "Europe/Andorra", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin", "Europe/Bratislava", "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Chisinau", "Europe/Copenhagen", "Europe/Dublin", "Europe/Gibraltar", "Europe/Helsinki", "Europe/Istanbul", "Europe/Kaliningrad", "Europe/Kiev", "Europe/Lisbon", "Europe/Ljubljana", "Europe/London", "Europe/Luxembourg", "Europe/Madrid", "Europe/Malta", "Europe/Minsk", "Europe/Monaco", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Riga", "Europe/Rome", "Europe/Samara", "Europe/San_Marino", "Europe/Sarajevo", "Europe/Skopje", "Europe/Sofia", "Europe/Stockholm", "Europe/Tallinn", "Europe/Tirane", "Europe/Vaduz", "Europe/Vatican", "Europe/Vienna", "Europe/Vilnius", "Europe/Warsaw", "Europe/Zagreb", "Europe/Zurich", "Indian/Antananarivo", "Indian/Chagos", "Indian/Christmas", "Indian/Cocos", "Indian/Comoro", "Indian/Kerguelen", "Indian/Mahe", "Indian/Maldives", "Indian/Mauritius", "Indian/Mayotte", "Indian/Reunion", "Pacific/Apia", "Pacific/Auckland", "Pacific/Easter", "Pacific/Efate", "Pacific/Enderbury", "Pacific/Fakaofo", "Pacific/Fiji", "Pacific/Funafuti", "Pacific/Galapagos", "Pacific/Gambier", "Pacific/Guadalcanal", "Pacific/Guam", "Pacific/Honolulu", "Pacific/Johnston", "Pacific/Kiritimati", "Pacific/Kosrae", "Pacific/Kwajalein", "Pacific/Majuro", "Pacific/Marquesas", "Pacific/Midway", "Pacific/Nauru", "Pacific/Niue", "Pacific/Norfolk", "Pacific/Noumea", "Pacific/Pago_Pago", "Pacific/Palau", "Pacific/Pitcairn", "Pacific/Ponape", "Pacific/Port_Moresby", "Pacific/Rarotonga", "Pacific/Saipan", "Pacific/Tahiti", "Pacific/Tarawa", "Pacific/Tongatapu", "Pacific/Truk", "Pacific/Wake", "Pacific/Wallis"];

    return timezones.indexOf(timezone) !== -1;
}

/**
* Validate category
* @param {string} category - category value
* @returns {boolean} if category was valid or not
**/
function isValidCategory(category) {
    var categories = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];

    return categories.indexOf(category) !== -1;
}

/**
* Validate app type
* @param {string} type - type value
* @returns {boolean} if type was valid or not
**/
function isValidType(type) {
    //check if valid app type and it's plugin is enabled
    return plugins.appTypes.indexOf(type) !== -1 && plugins.isPluginEnabled(type);
}

/**
* Validate country
* @param {string} country - country value
* @returns {boolean} if country was valid or not
**/
function isValidCountry(country) {
    var countries = ["AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ", "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR", "IO", "BN", "BG", "BF", "BI", "KH", "CM", "CA", "CV", "KY", "CF", "TD", "CL", "CN", "CX", "CC", "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO", "EC", "EG", "SV", "GQ", "ER", "EE", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF", "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY", "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM", "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY", "LI", "LT", "LU", "MO", "MK", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX", "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI", "NE", "NG", "NU", "NF", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH", "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC", "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS", "SS", "ES", "LK", "SD", "SR", "SJ", "SZ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK", "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU", "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW"];

    return countries.indexOf(country) !== -1;
}

module.exports = appsApi;