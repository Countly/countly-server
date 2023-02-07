/**
* This module is meant for manipulating app_users documents programmatically, without the need of SDK request
* @module api/parts/mgmt/app_users
*/

/** @lends module:api/parts/mgmt/app_users */
var usersApi = {},
    common = require('./../../utils/common.js'),
    plugins = require('../../../plugins/pluginManager.js');
var path = require('path');
const fs = require('fs');
var countlyFs = require('./../../utils/countlyFs.js');
var cp = require('child_process'); //call process
var spawn = cp.spawn; //for calling comannd line
const fse = require('fs-extra');
var crypto = require('crypto');
var log = common.log('core:app_users');

var cohorts;
try {
    cohorts = require("../../../plugins/cohorts/api/parts/cohorts.js");
}
catch (ex) {
    cohorts = null;
}

/**
* Create new app_user document. Creates uid if one is not provided
* @param {string} app_id - _id of the app
* @param {object} doc - document to insert
* @param {params} params - to determine who makes modification, should have member property with user who makes modification, and req for request object to determine ip address
* @param {function} callback - called when finished providing error (if any) as first param and insert result as second
*/
usersApi.create = function(app_id, doc, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = {};
    }
    if (!doc) {
        callback("Provide data to insert");
        return;
    }
    if (typeof doc.did === "undefined") {
        callback("Provide device_id as did property for data");
        return;
    }
    common.readBatcher.getOne("apps", {_id: common.db.ObjectID(app_id)}, (err, app) => {
        if (err || !app) {
            callback("App does not exist");
            return;
        }
        var _id = common.crypto.createHash('sha1').update(app.key + doc.did + "").digest('hex');
        if (doc._id && doc._id !== _id) {
            callback("Based on app key and device_id, provided _id property should be " + _id + ". Do not provide _id if you want api to use correct one");
            return;
        }
        doc._id = _id;
        if (typeof doc.uid === "undefined") {
            usersApi.getUid(app_id, function(err1, uid) {
                if (uid) {
                    doc.uid = uid;
                    if (params && params.href) {
                        doc.first_req_get = (params.href + "") || "";
                    }
                    else {
                        doc.first_req_get = "";
                    }
                    if (params && params.req && params.req.body) {
                        doc.first_req_post = (params.req.body + "") || "";
                    }
                    else {
                        doc.first_req_post = "";
                    }
                    common.db.collection('app_users' + app_id).insert(doc, function(err2) {
                        if (!err2) {
                            plugins.dispatch("/i/app_users/create", {
                                app_id: app_id,
                                user: doc,
                                res: doc,
                                params: params
                            });
                        }
                        if (callback) {
                            callback(err1 || err2, doc);
                        }
                    });
                }
                else if (callback) {
                    callback(err1);
                }
            });
        }
        else {
            common.db.collection('app_users' + app_id).insert(doc, function(err1) {
                if (!err1) {
                    plugins.dispatch("/i/app_users/create", {
                        app_id: app_id,
                        user: doc,
                        res: doc,
                        params: params
                    });
                }
                if (callback) {
                    callback(err1, doc);
                }
            });
        }
    });
};

/**
* Update existing app_users document. Cannot replace document, must have modifiers like $set, $unset, etc
* @param {string} app_id - _id of the app
* @param {object} query - mongodb query to select which app users to update
* @param {object} update - mongodb update object
* @param {params} params - to determine who makes modification, should have member property with user who makes modification, and req for request object to determine ip address
* @param {function} callback - called when finished providing error (if any) as first param and updated user document as second
*/
usersApi.update = function(app_id, query, update, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = {};
    }
    plugins.dispatch("/drill/preprocess_query", {
        query: query
    });
    if (Object.keys(update).length) {
        for (var i in update) {
            if (i.indexOf("$") !== 0) {
                let err = "Unkown modifier " + i + " in " + JSON.stringify(update) + " for " + JSON.stringify(query);
                console.log(err);
                if (callback) {
                    callback(err);
                }
                return;
            }
        }
        common.db.collection('app_users' + app_id).updateMany(query, update, function(err, res) {
            if (!err) {
                var updated = {result: res.result || "", matchedCount: res.matchedCount || 0, modifiedCount: res.modifiedCount || 0, ops: res.ops || []};
                plugins.dispatch("/i/app_users/update", {
                    app_id: app_id,
                    query: query,
                    update: update,
                    user: updated,
                    params: params
                });
            }
            if (callback) {
                callback(err, res && res.result);
            }
        });
    }
    else if (callback) {
        callback("Update can't be empty");
    }
};

/**
* Delete existing app_users documents, deletes also all plugin data
* @param {string} app_id - _id of the app
* @param {object} query - mongodb query to select which app users to delete
* @param {params} params - to determine who makes modification, should have member property with user who makes modification, and req for request object to determine ip address
* @param {function} callback - called when finished providing error (if any) as first param and array with uids of removed users as second
*/
usersApi.delete = function(app_id, query, params, callback) {
    if (typeof params === "function") {
        callback = params;
        params = {};
    }
    query = query || {};
    if (typeof query === "string" && query.length) {
        try {
            query = JSON.parse(query);
        }
        catch (ex) {
            query = {};
        }
    }
    plugins.dispatch("/drill/preprocess_query", {
        query: query
    });
    common.db.collection("app_users" + app_id).aggregate([
        {$match: query},
        {
            $group: {
                _id: null,
                uid: { $addToSet: '$uid' },
                picture: {$addToSet: '$picture'},
                exported: {$addToSet: '$appUserExport'}
            }
        }
    ], {allowDiskUse: true}, function(err0, res) {
        if (err0) {
            console.log("Error generating list of uids", err0, res);
        }
        if (res && res[0] && res[0].uid && res[0].uid.length) {
            common.db.collection("metric_changes" + app_id).remove({uid: {$in: res[0].uid}}, function() {
                plugins.dispatch("/i/app_users/delete", {
                    app_id: app_id,
                    query: query,
                    uids: res[0].uid,
                    params: params
                }, function(_, otherPluginResults) {
                    const rejectReasons = otherPluginResults.reduce((acc, result) => {
                        if (result.status === "rejected") {
                            acc.push((result.reason && result.reason.message) || '');
                        }

                        return acc;
                    }, []);

                    if (rejectReasons.length > 0) {
                        log.e("User deletion failed\n%j", rejectReasons.join("\n"));
                        common.returnMessage(params, 500, { errorMessage: "User deletion failed. Failed to delete some data related to this user." });
                        return;
                    }

                    common.db.collection("app_users" + app_id).remove({uid: {$in: res[0].uid}}, function(err) {
                        if (res[0].exported) {
                            //delete exports if exist
                            for (let i = 0;i < res[0].exported.length; i++) {
                                let id = res[0].exported[i].split("/");
                                id = id[id.length - 1]; //last one is filename
                                id = id.substr(id.length - 7);

                                deleteMyExport(id).then(
                                    function() {},
                                    function(err1) {
                                        console.log(err1);
                                    }
                                );
                            }
                        }
                        //deleting userimages(if they exist);
                        if (res[0].picture) {
                            for (let i = 0;i < res[0].picture.length; i++) {
                                //remove /userimages/ 
                                let id = res[0].picture[i].substr(12, res[0].picture[i].length - 12);
                                var pp = path.resolve(__dirname, './../../../frontend/express/public/userimages/' + id);
                                countlyFs.deleteFile("userimages", pp, {id: id}, function(err1) {
                                    if (err1) {
                                        console.log(err1);
                                    }
                                });
                            }
                        }
                        try {
                            fs.appendFileSync(path.resolve(__dirname, './../../../log/deletedUsers' + app_id + '.txt'), res[0].uid.join("\n") + "\n", "utf-8");
                        }
                        catch (err2) {
                            console.log(err2);
                        }
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "app_user_deleted",
                            data: {
                                app_id: app_id,
                                query: JSON.stringify(query),
                                uids: res[0].uid,
                            }
                        });
                        callback(err, res[0].uid);
                    });
                });
            });
        }
        else {
            callback("No Users to delete", []);
        }
    });
};

/**
* Search for users by query. Additionally can manipulate result set as sort, limit, skip, and specify return fields
* @param {string} app_id - _id of the app
* @param {object|json_string} query - mongodb query to select which app users to update
* @param {object|json_string} project - mongodb projection which fields to return
* @param {object|json_string} sort - mongodb sort object
* @param {number} limit - upper limit, how many users to return
* @param {number} skip - how many users to skip from beginning
* @param {function} callback - called when finished providing error (if any) as first param and result user list array as second
*/
usersApi.search = function(app_id, query, project, sort, limit, skip, callback) {
    query = query || {};
    if (typeof query === "string" && query.length) {
        try {
            query = JSON.parse(query);
        }
        catch (ex) {
            query = {};
        }
    }

    plugins.dispatch("/drill/preprocess_query", {
        query: query
    });

    project = project || {};
    if (typeof project === "string" && project.length) {
        try {
            project = JSON.parse(project);
        }
        catch (ex) {
            project = {};
        }
    }

    sort = sort || {};
    if (typeof sort === "string" && sort.length) {
        try {
            sort = JSON.parse(sort);
        }
        catch (ex) {
            sort = {};
        }
    }

    limit = parseInt(limit) || 0;
    skip = parseInt(skip) || 0;

    var cursor = common.db.collection('app_users' + app_id).find(query, project);
    if (Object.keys(sort).length) {
        cursor.sort(sort);
    }

    if (skip) {
        cursor.skip(skip);
    }

    if (limit) {
        cursor.limit(limit);
    }

    cursor.toArray(callback);
};

/**
* Count users by query. 
* @param {string} app_id - _id of the app
* @param {object|json_string} query - mongodb query to select which app users to update
* @param {function} callback - called when finished providing error (if any) as first param and resultcount of users as second
*/
usersApi.count = function(app_id, query, callback) {
    query = query || {};
    if (typeof query === "string" && query.length) {
        try {
            query = JSON.parse(query);
        }
        catch (ex) {
            query = {};
        }
    }

    plugins.dispatch("/drill/preprocess_query", {
        query: query
    });

    common.db.collection('app_users' + app_id).count(query, callback);
};

/**
* Returns uid for new users
* @param {string} app_id - _id of the app
* @param {function} callback - called when finished providing error (if any) as first param and new uid as second
*/
usersApi.getUid = function(app_id, callback) {
    common.db.collection('apps').findAndModify({_id: common.db.ObjectID(app_id)}, {}, {$inc: {seq: 1}}, {
        new: true,
        upsert: true
    }, function(err, result) {
        result = result && result.ok ? result.value : null;
        if (result && result.seq) {
            if (callback) {
                callback(err, common.parseSequence(result.seq));
            }
        }
        else if (callback) {
            callback(err);
        }
    });
};

/**
* Merges two app users data (including plugin data) into one user, using mostly params from latest user, and updates all collections
* @param {string} app_id - _id of the app
* @param {object} newAppUser - app_users document of new/current user
* @param {string} new_id - new user's _id
* @param {string} old_id - old user's _id
* @param {string} new_device_id - new user's device_id
* @param {string} old_device_id - old user's device_id
* @param {function} callback - called when finished providing error (if any) as first param and resulting merged document as second
*/
usersApi.merge = function(app_id, newAppUser, new_id, old_id, new_device_id, old_device_id, callback) {
    /**
    * Inner function to merge user data
    * @param {object} newAppUserP  - new user data
    * @param {object} oldAppUser - old user data
    */
    function mergeUserData(newAppUserP, oldAppUser) {
        //allow plugins to deal with user mergin properties
        plugins.dispatch("/i/user_merge", {
            app_id: app_id,
            newAppUser: newAppUserP,
            oldAppUser: oldAppUser
        }, function() {
            //merge user data
            for (var i in oldAppUser) {
                // sum up session count and total session duration
                if (i === "sc" || i === "tsd") {
                    if (typeof newAppUserP[i] === "undefined") {
                        newAppUserP[i] = 0;
                    }
                    newAppUserP[i] += oldAppUser[i];
                }
                //check if old user has been seen before new one
                else if (i === "fs") {
                    if (!newAppUserP.fs || oldAppUser.fs < newAppUserP.fs) {
                        newAppUserP.fs = oldAppUser.fs;
                    }
                }
                //check if old user has been seen before new one
                else if (i === "fac") {
                    if (!newAppUserP.fac || oldAppUser.fac < newAppUserP.fac) {
                        newAppUserP.fac = oldAppUser.fac;
                    }
                }
                //check if old user has been the last to be seen
                else if (i === "ls") {
                    if (!newAppUserP.ls || oldAppUser.ls > newAppUserP.ls) {
                        newAppUserP.ls = oldAppUser.ls;
                        //then also overwrite last session data
                        if (oldAppUser.lsid) {
                            newAppUserP.lsid = oldAppUser.lsid;
                        }
                        if (oldAppUser.sd) {
                            newAppUserP.sd = oldAppUser.sd;
                        }
                    }
                }
                //check if old user has been the last to be seen
                else if (i === "lac") {
                    if (!newAppUserP.lac || oldAppUser.lac > newAppUserP.lac) {
                        newAppUserP.lac = oldAppUser.lac;
                    }
                }
                else if (i === "lest") {
                    if (!newAppUserP.lest || oldAppUser.lest > newAppUserP.lest) {
                        newAppUserP.lest = oldAppUser.lest;
                    }
                }
                else if (i === "lbst") {
                    if (!newAppUserP.lbst || oldAppUser.lbst > newAppUserP.lbst) {
                        newAppUserP.lbst = oldAppUser.lbst;
                    }
                }
                //merge custom user data
                else if (typeof oldAppUser[i] === "object" && oldAppUser[i]) {
                    if (Array.isArray(oldAppUser[i])) {
                        if (!Array.isArray(newAppUserP[i])) {
                            newAppUserP[i] = [];
                        }
                        for (let j = 0; j < oldAppUser[i].length; j++) {
                            //set properties that new user does not have
                            if (newAppUserP[i].indexOf(oldAppUser[i][j]) === -1) {
                                newAppUserP[i].push(oldAppUser[i][j]);
                            }
                        }
                    }
                    else {
                        if (typeof newAppUserP[i] === "undefined") {
                            newAppUserP[i] = {};
                        }
                        for (let j in oldAppUser[i]) {
                            //set properties that new user does not have
                            if (typeof newAppUserP[i][j] === "undefined") {
                                newAppUserP[i][j] = oldAppUser[i][j];
                            }
                        }
                    }
                }
                //set other properties that new user does not have
                else if (i !== "_id" && i !== "did" && typeof newAppUserP[i] === "undefined") {
                    newAppUserP[i] = oldAppUser[i];
                }
            }
            //store last merged uid for reference
            newAppUserP.merged_uid = oldAppUser.uid;
            newAppUserP.merged_did = oldAppUser.did;
            if (typeof newAppUserP.merges === "undefined") {
                newAppUserP.merges = 0;
            }
            if (typeof oldAppUser.merges !== "undefined") {
                newAppUserP.merges += oldAppUser.merges;
            }
            newAppUserP.merges++;
            //update new user
            common.db.collection('app_users' + app_id).update({_id: newAppUserP._id}, {'$set': newAppUserP}, function(/*err*/) {
                //if (err) {
                //return callback(err, newAppUserP);
                //}
                callback(null, newAppUserP);
                //let plugins know they need to merge user data
                common.db.collection("metric_changes" + app_id).update({uid: oldAppUser.uid}, {'$set': {uid: newAppUserP.uid}}, {multi: true}, function() {});
                plugins.dispatch("/i/device_id", {
                    app_id: app_id,
                    oldUser: oldAppUser,
                    newUser: newAppUserP
                }, function(/*result*/) {
                    //var retry = false;
                    //if (result && result.length) {
                    //    for (let index = 0; index < result.length; index++) {
                    //        if (result[index].status === "rejected") {
                    //           retry = true;
                    //            break;
                    //        }
                    //    }
                    //}

                    //if (retry) {
                    //all plugins could not merge data, we should retry
                    //return callback(new Error("Could not merge data in all plugins"), newAppUserP);
                    //}
                    //delete old user
                    common.db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, function(/*errRemoving*/) {
                        //if (callback) {
                        //callback(errRemoving, newAppUserP);
                        //}
                    });
                });
            });
        });
    }

    common.db.collection('app_users' + app_id).findOne({'_id': old_id }, function(err, oldAppUser) {
        if (err) {
            //problem getting old user data
            return callback(err, oldAppUser);
        }
        if (!oldAppUser) {
            //there is no old user, process request
            return callback(null, newAppUser);
        }
        if (!newAppUser || !Object.keys(newAppUser).length) {
            //new user does not exist yet
            //simply copy user document with old uid
            //no harm is done
            oldAppUser.did = new_device_id + "";
            oldAppUser._id = new_id;
            common.db.collection('app_users' + app_id).insert(oldAppUser, function(err2) {
                if (err) {
                    callback(err2, oldAppUser);
                }
                else {
                    common.db.collection('app_users' + app_id).remove({_id: old_id}, function(err3) {
                        callback(err3, oldAppUser);
                    });
                }
            });
        }
        else {
            //we have to merge user data
            common.db.collection('app_user_merges' + app_id).insert({
                _id: oldAppUser.uid,
                merged_to: newAppUser.uid,
                ts: Math.round(new Date().getTime() / 1000),
                cd: new Date()
            }, {ignore_errors: [11000]}, function() {
                if (newAppUser.ls && newAppUser.ls > oldAppUser.ls) {
                    mergeUserData(newAppUser, oldAppUser);
                }
                else {
                    //switching user identity
                    var temp = oldAppUser._id;
                    oldAppUser._id = newAppUser._id;
                    newAppUser._id = temp;

                    temp = oldAppUser.did;
                    oldAppUser.did = newAppUser.did;
                    newAppUser.did = temp;

                    temp = oldAppUser.uid;
                    oldAppUser.uid = newAppUser.uid;
                    newAppUser.uid = temp;

                    mergeUserData(oldAppUser, newAppUser);
                }
            });
        }
    });
};

var deleteMyExport = function(exportID) { //tries to delete packed file, exported folder and saved export in gridfs
    //normally there should be only export in gridfs. Cleaning all to be sure.
    //rejects only if there stays any saved data for export
    return new Promise(function(resolve, reject) {
        //remove archive
        var errors = [];
        if (fs.existsSync(path.resolve(__dirname, './../../../export/AppUser/' + exportID + '.tar.gz'))) {
            try {
                fs.unlinkSync(path.resolve(__dirname, './../../../export/AppUser/' + exportID + '.tar.gz'));
            }
            catch (err) {
                errors.push(err);
            }
        }

        countlyFs.gridfs.deleteFile("appUsers", path.resolve(__dirname, './../../../export/AppUser/' + exportID + '.tar.gz'), {id: exportID + '.tar.gz'}, function(error) {
            if (error && error.message && error.message.substring(0, 12) !== "FileNotFound") {
                errors.push(error.message);
            }
            if (fs.existsSync(path.resolve(__dirname, './../../../export/AppUser/' + exportID))) {
                fse.remove(path.resolve(__dirname, './../../../export/AppUser/' + exportID),
                    err => {
                        if (err) {
                            errors.push(error);
                        }
                        if (errors.length === 0) {
                            resolve();
                        }
                        else {
                            reject(errors);
                        }
                    }
                );
            }
            else {
                if (errors.length === 0) {
                    resolve();
                }
                else {
                    reject(errors);
                }
            }
        });

    });
};

usersApi.deleteExport = function(filename, params, callback) {
    if (filename && filename !== '') {
        var base_name = filename.split('.');
        var name_parts = base_name[0].split('_');

        //filename : appUsers_{appid}_{uid} vai appUsers_{appid}_HASH_{hash form uids}            
        if (name_parts[0] !== 'appUser') {
            callback('invalid filename', '');
        }
        else {
            //remove archive
            deleteMyExport(base_name[0]).then(
                function() {
                    if (name_parts.length === 3 && name_parts[2] !== 'HASH') {
                        //update user info
                        common.db.collection('app_users' + name_parts[1]).update({"uid": name_parts[2]}, {$unset: {"appUserExport": ""}}, {upsert: false, multi: true}, function(err) {
                            if (err) {
                                callback(err, "");
                            }
                            else {
                                plugins.dispatch("/systemlogs", {
                                    params: params,
                                    action: "export_app_user_deleted",
                                    data: {
                                        result: "ok",
                                        uids: name_parts[2],
                                        id: base_name[0],
                                        app_id: name_parts[1],
                                        info: "Exported data deleted"
                                    }
                                });
                                callback(null, "Export deleted");
                            }
                        });
                    }
                    else {
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "export_app_user_deleted",
                            data: {
                                result: "ok",
                                id: base_name[0],
                                app_id: name_parts[1],
                                info: "Exported data deleted"
                            }
                        });
                        callback(null, "Export deleted");
                    }
                },
                function(err) {
                    console.log(err);
                    callback("There was some errors during deleting export. Please look in log for more information", "");
                }
            );
        }
    }
    else {
        callback("Invalid filename", "");
    }
};

var run_command = function(my_command, my_args) {
    log.d("run_command:" + my_command + JSON.stringify(my_args));
    return new Promise(function(resolve, reject) {
        var child = spawn(my_command, my_args, {
            shell: false,
            cwd: path.resolve(__dirname, './../../../export/AppUser'),
            detached: false
        }, function(error) {
            if (error) {
                log.e(error);
                return reject(Error('error:' + JSON.stringify(error)));
            }
        });
        child.on('error', function(error) {
            log.e(error);
            return reject(error);
        });
        child.on('exit', function(code) {
            if (code === 0) {
                return resolve();
            }
            else {
                console.log("Exited with error code: " + code);
                try { //because we might have rejected it with error
                    reject("Bad exit code");
                }
                catch (error) {
                    console.log(error);
                }
            }
        });
    });
};
var clear_out_empty_files = function(folder) {
    return new Promise(function(resolve) {
        run_command("find", [folder, "-type", "f", "-name", "*.json", "-size", "0", "-delete"]).then(
            function() {
                resolve();
            },
            function() {
                resolve(); //resolve anyway(not so bad if empty files not deleted)
            }
        );
    });
};
/**
* Exports data about app_users, including plugin data
* @param {string} app_id - _id of the app
* @param {object} query - mongodb query to select which app users data to export
* @param {object} params  - params
* @param {function} callback - called when finished providing error (if any) as first param and array with uids of exported users as second
*/
usersApi.export = function(app_id, query, params, callback) {
    /**
    * Inner function to have less lines. Called when there is error and is necessery to clean up files
    * @param {string} my_export_filename  - export name
    * @param {object} my_params  - params
    * @param {string} my_app_id  - app id
    * @param {string} my_eid  - export id
    * @param {string} message1 - message on successful cleanup
    * @param {string} message2 -  message on failed cleaning up
    * @param {function} my_callback - callback function(passed)
    */
    function callDeleteExport(my_export_filename, my_params, my_app_id, my_eid, message1, message2, my_callback) {
        usersApi.deleteExport(my_export_filename, my_params, function(err) {
            if (err) {
                my_callback({ message: message1, filename: 'appUser_' + my_app_id + '_' + my_eid }, "");
            }
            else {
                my_callback({ message: message2, filename: 'appUser_' + my_app_id + '_' + my_eid}, "");
            }
        });
    }

    plugins.dispatch("/drill/preprocess_query", {
        query: query
    });

    common.db.collection("app_users" + app_id).aggregate([
        {$match: query},
        {
            $group: {
                _id: null,
                uid: { $addToSet: '$uid' },
                mid: {$addToSet: '$_id'}
            }
        }
    ], {allowDiskUse: true}, function(err_base, res) {
        if (err_base) {
            callback({
                message: err_base,
                filename: ""
            }, "");
            return;
        }
        if (res && res[0] && res[0].uid && res[0].uid.length) {
            //create export folder
            var eid = res[0].uid[0];
            var eid2 = res[0].mid[0];
            var single_user = true;
            //if more than one user - create hash
            if (res[0].uid.length > 1) {
                var sorted = res[0].uid.sort();
                eid = "HASH_" + crypto.createHash('SHA1').update(JSON.stringify(sorted)).digest('hex');
                single_user = false;
            }

            var export_folder = path.resolve(__dirname, './../../../export');
            if (!fs.existsSync(export_folder)) {
                try {
                    fs.mkdirSync(export_folder);
                }
                catch (err1) {
                    callback(err1, []);
                }
            }

            export_folder = path.resolve(__dirname, './../../../export/AppUser');
            if (!fs.existsSync(export_folder)) {
                try {
                    fs.mkdirSync(export_folder);
                }
                catch (err1) {
                    callback(err1, []);
                }
            }

            export_folder = path.resolve(__dirname, './../../../export/AppUser/appUser_' + app_id + '_' + eid);

            if (fs.existsSync(export_folder + '.tar.gz')) {
                callback({
                    message: 'There is exported data for given users on server.Delete it to start new',
                    filename: 'appUser_' + app_id + '_' + eid + '.tar.gz'
                }, "");
                return;
            }

            if (!fs.existsSync(export_folder)) {
                try {
                    fs.mkdirSync(export_folder);
                }
                catch (err1) {
                    callback(err1, []);
                }
            }
            else {
                callback({
                    message: 'There is ongoing export data on server with the same users.Wait till finish or delete it to start new',
                    filename: 'appUser_' + app_id + '_' + eid
                }, "");
                return;
            }
            var export_filename = 'appUser_' + app_id + '_' + eid;

            var dbargs = [];
            var export_commands = {};
            var db_params = plugins.getDbConnectionParams('countly');
            for (var p in db_params) {
                dbargs.push("--" + p);
                dbargs.push(db_params[p]);
            }

            plugins.dispatch("/systemlogs", {
                params: params,
                action: "export_app_user_started",
                data: {
                    result: "ok",
                    uids: res[0].uid.join(", "),
                    app_id: app_id,
                    info: "Export started",
                    export_file: export_folder + ".tar.gz"
                }
            });

            //update db if one user
            // new Promise(function(resolve, reject) {
            //commented out the below code as we do not want appUserExport in the exported json file
            // if (single_user) {
            //     common.db.collection('app_users' + app_id).update({"_id": eid2}, {$set: {"appUserExport": export_folder + ""}}, {upsert: false}, function(err_sel) {
            //         if (err_sel) {
            //             reject(err_sel);
            //         }
            //         else {
            //             resolve();
            //         }
            //     });
            // }
            // else {
            // resolve();
            // }
            new Promise(function(resolve) {
                log.d("collection marked");
                //export data from metric_changes
                run_command('mongoexport', [...dbargs, "--collection", "metric_changes" + app_id, "-q", '{"uid":{"$in": ["' + res[0].uid.join('","') + '"]}}', "--out", export_folder + "/metric_changes" + app_id + ".json"]).finally(function() {
                    resolve();
                });
            }).then(function() {
                log.d("metric_changes exported");
                //export data from app_users
                return run_command('mongoexport', [...dbargs, "--collection", "app_users" + app_id, "-q", '{"uid":{"$in": ["' + res[0].uid.join('","') + '"]}}', "--out", export_folder + "/app_users" + app_id + ".json"]);
            }).then(
                function() {
                    log.d("app_users exported");
                    //get other export commands from other plugins
                    plugins.dispatch("/i/app_users/export", {
                        app_id: app_id,
                        dbstr: "",
                        dbargs: dbargs,
                        export_commands: export_commands,
                        query: query,
                        uids: res[0].uid,
                        export_folder: export_folder
                    }, function() {
                        var commands = [];
                        for (var prop in export_commands) {
                            for (let k = 0; k < export_commands[prop].length; k++) {
                                commands.push(run_command(export_commands[prop][k].cmd, export_commands[prop][k].args));
                            }
                        }
                        Promise.all(commands).then(
                            function() {
                                log.d("plugins colections exported");
                                //pack export
                                clear_out_empty_files(path.resolve(__dirname, './../../../export/AppUser/' + export_filename))//remove empty files
                                    .then(function() {
                                        log.d("empty files cleared");
                                        return run_command("tar", ["-zcvf", export_filename + ".tar.gz", export_filename]);
                                    }) //create archive
                                    .then(function() {
                                        log.d("packed");
                                        return new Promise(function(resolve, reject) { /*save export in gridFS*/
                                            var my_filename = path.resolve(__dirname, './../../../export/AppUser/' + export_filename + '.tar.gz');
                                            countlyFs.gridfs.saveFile("appUsers", my_filename, my_filename, {
                                                id: export_filename + ".tar.gz",
                                                writeMode: "overwrite"
                                            }, function(err5) {
                                                if (err5) {
                                                    console.log(err5);
                                                    reject("unable to store exported file. There is more information in log.");
                                                }
                                                else {
                                                    //remove archive, because it is saved in db.
                                                    try {
                                                        fs.unlinkSync(my_filename);
                                                    }
                                                    catch (err6) {
                                                        console.log(err6);
                                                    }
                                                    resolve();//resolve anyway because export is still OK
                                                }
                                            });
                                        });
                                    })
                                    .then(
                                        function() {
                                            fse.remove(export_folder, err => {
                                                if (err) {
                                                    plugins.dispatch("/systemlogs", {
                                                        params: params,
                                                        action: "export_app_user",
                                                        data: {
                                                            result: "error",
                                                            uids: res[0].uid.join(", "),
                                                            app_id: app_id,
                                                            info: "There was error during cleanup. you should remove data folder manualy.",
                                                            export_file: export_folder + ".tar.gz",
                                                            export_folder: export_folder
                                                        }
                                                    });
                                                    callback({
                                                        message: "Export successful. Export saved as given filename.  Was  unable to clean up data associated with export. You can try to delete it via api.",
                                                        filename: "export_filename+".tar.gz
                                                    }, "");
                                                }
                                                else {
                                                    if (single_user === true) {
                                                        //update user document
                                                        common.db.collection('app_users' + app_id).update({"_id": eid2}, {$set: {"appUserExport": export_folder + ".tar.gz"}}, {upsert: false}, function(err4, res1) {
                                                            if (!err4 && res1.result && res1.result.n !== 0 && res1.result.nModified !== 0) {
                                                                plugins.dispatch("/systemlogs", {
                                                                    params: params,
                                                                    action: "export_app_user",
                                                                    data: {
                                                                        result: "ok",
                                                                        uids: res[0].uid.join(", "),
                                                                        app_id: app_id,
                                                                        info: "Export successful",
                                                                        export_file: export_folder + ".tar.gz"
                                                                    }
                                                                });
                                                                callback(null, export_filename + ".tar.gz");
                                                            }
                                                            //not updated (not exist or errored)
                                                            else {
                                                                plugins.dispatch("/systemlogs", {
                                                                    params: params,
                                                                    action: "export_app_user",
                                                                    data: {
                                                                        result: "error",
                                                                        uids: res[0].uid.join(", "),
                                                                        app_id: app_id,
                                                                        info: "User not exist",
                                                                        export_folder: export_folder
                                                                    }
                                                                });
                                                                callDeleteExport(export_filename, params, app_id, eid, "Exporting failed. User does not exist. Unable to clean exported data", "Exporting failed. User does not exist. Partially exported data deleted.", callback);
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        plugins.dispatch("/systemlogs", {
                                                            params: params,
                                                            action: "export_app_user",
                                                            data: {
                                                                result: "ok",
                                                                uids: res[0].uid.join(", "),
                                                                app_id: app_id,
                                                                info: "Export successful",
                                                                export_file: export_folder + ".tar.gz"
                                                            }
                                                        });
                                                        callback(null, export_filename + ".tar.gz");
                                                    }
                                                }
                                            });
                                        },
                                        function(err_promise) {
                                            plugins.dispatch("/systemlogs", {
                                                params: params,
                                                action: "export_app_user",
                                                data: {
                                                    result: "error",
                                                    uids: res[0].uid.join(", "),
                                                    app_id: app_id,
                                                    info: err_promise,
                                                    export_folder: export_folder
                                                }
                                            });
                                            callDeleteExport(export_filename, params, app_id, eid, "Storing exported files failed. Unable to clean up file system.", "Storing exported files failed. Partially exported data deleted.", callback);
                                        }
                                    ).catch(err => {
                                        plugins.dispatch("/systemlogs", {
                                            params: params,
                                            action: "export_app_user",
                                            data: {
                                                result: "error",
                                                info: err + ""
                                            }
                                        });
                                        callDeleteExport(export_filename, params, app_id, eid, "Storing exported files failed. Unable to clean up file system.", "Storing exported files failed. Partially exported data deleted.", callback);
                                    });
                            },
                            function(error) {
                                console.log(error);
                                plugins.dispatch("/systemlogs", {
                                    params: params,
                                    action: "export_app_user",
                                    data: {
                                        result: "error",
                                        uids: res[0].uid.join(", "),
                                        app_id: app_id,
                                        info: "Error during exporting files",
                                        export_folder: export_folder
                                    }
                                });
                                callDeleteExport(export_filename, params, app_id, eid, "Export failed while running commands from other plugins. Unable to clean up file system.", "Export failed while running commands from other plugins. Partially exported data deleted.", callback);
                            }
                        );
                    });
                },
                function(error) {
                    plugins.dispatch("/systemlogs", {
                        params: params,
                        action: "export_app_user",
                        data: {
                            result: "error",
                            info: error,
                            uids: res[0].uid.join(", "),
                            app_id: app_id
                        }
                    });
                    callDeleteExport(export_filename, params, app_id, eid, "Export failed while creating export files from DB. Unable to clean up file system.", "Export failed while creating export files from DB. Partially exported data deleted.", callback);
                }
            ).catch(err2 => {
                plugins.dispatch("/systemlogs", {
                    params: params,
                    action: "export_app_user",
                    data: {
                        result: "error",
                        info: err2
                    }
                });
                callDeleteExport(export_filename, params, app_id, eid, "Export failed while creating export files from DB. Unable to clean up file system.", "Export failed while creating export files from DB. Partially exported data deleted.", callback);
            });
        }
        else {
            plugins.dispatch("/systemlogs", {
                params: params,
                action: "export_app_user",
                data: {
                    result: "ok",
                    info: "There wasn't any user to export data for."
                }
            });
            callback("Query didn't mach any user", "");
        }
    });
};

/**
 * Fetch aggregated data from DB.
 * @param {string} collectionName | Name of collection
 * @param {object} aggregation | Aggregation object
 * @return {object} | new promise
 */
const getAggregatedAppUsers = (collectionName, aggregation) => {
    return new Promise((resolve, reject) => {
        common.db.collection(collectionName).aggregate(aggregation, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};

usersApi.loyalty = function(params) {
    const rangeLabels = ["1", "2", "3-5", "6-9", "10-19", "20-49", "50-99", "100-499", "> 500"];
    const ranges = [[1], [2], [3, 5], [6, 9], [10, 19], [20, 49], [50, 99], [100, 499], [500] ];
    const collectionName = 'app_users' + params.qstring.app_id;
    let query = params.qstring.query || {};

    if (typeof query === "string") {
        try {
            query = JSON.parse(query);
        }
        catch (error) {
            query = {};
        }
    }

    if (cohorts) {
        var cohortQuery = cohorts.preprocessQuery(query);
        query = Object.assign(query, cohortQuery);
    }

    // Time
    const ts = (new Date()).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Aggregations
    const matchQuery = { '$match': query};
    const sevenDaysMatch = { '$match': {ls: { '$gte': (ts - sevenDays) / 1000}}};
    const thirtyDaysMatch = { '$match': {ls: { '$gte': (ts - thirtyDays) / 1000}}};
    const rangeProject = { '$project': { 'range': { '$concat': [] }}};
    const indexProject = { '$project': {'count': 1, 'index': { '$concat': [] }}};
    const groupBy = { '$group': { '_id': '$range', count: { '$sum': 1 }}};
    const sort = {'$sort': { 'index': 1}};

    rangeProject.$project.range.$concat = rangeLabels.map((label, index) => {
        const range = ranges[index];
        if (index < 2 && range.length === 1) {
            return { '$cond': [{ '$eq': ['$sc', range[0] ]}, label, '']};
        }
        else if (range.length === 1) {
            return { $cond: [{ $gte: ['$sc', range[0] ]}, label, '']};
        }
        else {
            return { $cond: [{ $and: [{$gte: ['$sc', range[0]]}, {$lte: ['$sc', range[1]]}]}, label, '']};
        }
    });

    indexProject.$project.index.$concat = rangeLabels.map((label, index) => (
        { '$cond': [{'$eq': ['$_id', label]}, index.toString(), '']}
    ));

    // Promises
    const allDataPromise = getAggregatedAppUsers(collectionName, [matchQuery, rangeProject, groupBy, indexProject, sort]);
    const sevenDaysPromise = getAggregatedAppUsers(collectionName, [sevenDaysMatch, matchQuery, rangeProject, groupBy, indexProject, sort]);
    const thirtyDaysPromise = getAggregatedAppUsers(collectionName, [thirtyDaysMatch, matchQuery, rangeProject, groupBy, indexProject, sort]);

    Promise.all([allDataPromise, sevenDaysPromise, thirtyDaysPromise]).then(promiseResults => {
        common.returnOutput(params, {
            all: promiseResults[0],
            ['7days']: promiseResults[1],
            ['30days']: promiseResults[2]
        });
    }).catch(() => {
        common.returnOutput(params, {});
    });

    return true;
};

plugins.extendModule("app_users", usersApi);

module.exports = usersApi;