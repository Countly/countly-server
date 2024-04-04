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
//var cp = require('child_process'); //call process
//var spawn = cp.spawn; //for calling comannd line
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


usersApi.mergeOtherPlugins = function(options, callback) {
    var db = options.db;
    var app_id = options.app_id;
    var newAppUser = options.newAppUser;
    var oldAppUser = options.oldAppUser;
    var updateFields = options.updateFields;
    var mergeDoc = options.mergeDoc || {};
    log.d("Merging other plugins ", oldAppUser.uid + "->" + newAppUser.uid);
    var iid = app_id + "_" + newAppUser.uid + "_" + oldAppUser.uid;
    updateFields.lu = Math.round(new Date().getTime() / 1000);
    //mark that we start calculating it, users doc is updated
    //check if there are any merges pointing to this user. Do not process unless previous is finished.
    db.collection('app_user_merges').aggregate([{"$match": {"_id": {"$regex": app_id + "_" + oldAppUser.uid + "_.*"}}}, {"$project": {"_id": 1}}, {"$limit": 1}]).toArray(function(err, res) {
        if (err) {
            log.e(err);
            if (callback && typeof callback === 'function') {
                callback(err);
            }
        }
        else if (res && res.length > 0) {
            //update lu field
            delete updateFields.cc;//do not set as calculating
            db.collection('app_user_merges').update({"_id": iid}, {"$set": updateFields}, {upsert: false}, function(err00) {
                if (err00) {
                    log.e(err00);
                }
                callback("skipping till previous merge is finished");
            });
        }
        else {
            var updateQuery = {"_id": iid};
            if (mergeDoc && mergeDoc.cc && mergeDoc.lu) {
                updateQuery.lu = mergeDoc.lu;
            }
            else {
                updateQuery.cc = {"$ne": true};
            }
            db.collection('app_user_merges').update(updateQuery, {'$set': updateFields, "$inc": {"t": 1}}, {upsert: false}, function(err0, resUpdate) {
                if (err0) {
                    log.e("Failed to update merge document about started merge", err);
                    if (callback && typeof callback === 'function') {
                        callback(err);
                    }
                }
                else if (resUpdate && resUpdate.modifiedCount > 0) { //doc was updated
                    plugins.dispatch("/i/device_id", {
                        app_id: app_id,
                        oldUser: oldAppUser,
                        newUser: newAppUser
                    }, function(err9, result) {
                        if (err9) {
                            log.e(err9);
                        }
                        var retry = false;
                        if (result && result.length) {
                            for (let index = 0; index < result.length; index++) {
                                if (result[index].status === "rejected") {
                                    retry = true;
                                    break;
                                }
                            }
                        }
                        if (retry) {
                            //Unmark cc to let it be retried later in job.
                            common.db.collection('app_user_merges').update({"_id": iid}, {'$unset': {"cc": ""}, "$set": {"lu": Math.round(new Date().getTime() / 1000)}}, {upsert: false}, function(err4) {
                                if (err4) {
                                    log.e(err4);
                                }
                                if (callback && typeof callback === 'function') {
                                    callback(err4);
                                }
                            });
                        }
                        else {
                            //data merged. Delete record from merges collection
                            common.db.collection('app_user_merges').remove({"_id": iid}, function(err5) {
                                if (err5) {
                                    log.e("Failed to remove merge document", err5);
                                }
                                if (callback && typeof callback === 'function') {
                                    callback(err5);
                                }
                            });
                        }
                    });
                }
                else {
                    //something else already triggered this change in paralel. 
                    callback();
                }
            });
        }
    });
};

usersApi.mergeUserProperties = function(newAppUserP, oldAppUser) {
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
        else if (i === "merges") {
            if (typeof newAppUserP.merges === "undefined") {
                newAppUserP.merges = 0;
            }
            if (typeof oldAppUser.merges !== "undefined") {
                newAppUserP.merges += oldAppUser.merges;
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
            else if (typeof oldAppUser[i].toHexString === 'function') {
                newAppUserP[i] = newAppUserP[i] || oldAppUser[i];
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
    newAppUserP.merged_uid = oldAppUser.uid;
    newAppUserP.merged_did = oldAppUser.did;
    newAppUserP.merges = (newAppUserP.merges || 0) + 1;
	newAppUsersP.last_merge = Date.now().valueOf();
};

/*
async function updateStatesInTransaction(common, app_id, newAppUserP, oldAppUser, callback) {
    const session = common.db.client.startSession();
    const transactionOptions = {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' }
    };
    var returned = false;
    try {
        const transactionResults = await session.withTransaction(async() => {
            await common.db.collection('app_users' + app_id).update({_id: newAppUserP._id}, {'$set': newAppUserP}, {session});
            await common.db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, {session});
            await common.db.collection("app_user_merges").update({"_id": app_id + "_" + newAppUserP.uid + "_" + oldAppUser.uid}, {'$set': {"u": true}}, {upsert: false, session});
        }, transactionOptions);

        if (transactionResults) {
            log.d("Data was updated.");
        }
        else {
            log.e('Transaction on user merge doc update failed.');
        }
    }
    catch (e) {
        log.e("The transaction was aborted due to an unexpected error: " + e);
        transactionResults = false;
    }
    finally {
        await session.endSession();
        callback(!transactionResults);
    }
}*/

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
            usersApi.mergeUserProperties(newAppUserP, oldAppUser);
            //update states in transaction to ensure integrity

            //we could use transactions, which makes it more stable, but we can't for now on all servers.
            //keeping for future reference
            /*  
                updateStatesInTransaction(common, app_id, newAppUserP, oldAppUser, function(err) {
                    if (err) {
                        log.e("Failed to update states in transaction", err);
                    }
                    if (callback && typeof callback === 'function') {
                        callback(err, newAppUserP);
                    }
                    if (!err) {
                        common.db.collection("metric_changes" + app_id).update({uid: oldAppUser.uid}, {'$set': {uid: newAppUserP.uid}}, {multi: true}, function(err7) {
                            if (err7) {
                                log.e("Failed metric changes update in app_users merge", err7);
                            }
                            else {
                                usersApi.mergeOtherPlugins(common.db, app_id, newAppUserP, oldAppUser, {"cc": true, "mc": true}, function() {


                                });
                            }
                        });
                    }
                });
            */
            common.db.collection('app_users' + app_id).update({_id: newAppUserP._id}, {'$set': newAppUserP}, function(err) {
                if (err) {
                    if (callback && typeof callback === 'function') {
                        callback(err, newAppUserP); //Filed. Old and new exists. SDK will re
                    }
                }
                else {
                    common.db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, function(errRemoving) {
                        if (errRemoving) {
                            log.e("Failed to remove merged user from database", errRemoving); //Failed. Old and new exists. SDK will retry
                        }
                        if (callback && typeof callback === 'function') {
                            callback(errRemoving, newAppUserP);
                        }
                        //Dispatch to other plugins only after callback.
                        if (!errRemoving) {
                            //If it fails now - job will retry.
                            //update metric changes document
                            var iid = app_id + "_" + newAppUser.uid + "_" + oldAppUser.uid;
                            common.db.collection('app_user_merges').update({"_id": iid, "cc": {"$ne": true}}, {'$set': {"u": true}}, {upsert: false}, function(err1) {
                                if (err1) {
                                    log.e(err1);
                                }
                                else {
                                    common.db.collection("metric_changes" + app_id).update({uid: oldAppUser.uid}, {'$set': {uid: newAppUserP.uid}}, {multi: true}, function(err7) {
                                        if (err7) {
                                            log.e("Failed metric changes update in app_users merge", err7);
                                        }
                                        usersApi.mergeOtherPlugins({db: common.db, app_id: app_id, newAppUser: newAppUserP, oldAppUser: oldAppUser, updateFields: {"cc": true, "u": true, "mc": true}}, function() {});
                                    });
                                }
                            });
                        }
                    });
                }
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
            if (!newAppUser.ls || (newAppUser.ls < oldAppUser.ls)) {
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

                //switching around doc references
                var tempDoc = oldAppUser;
                oldAppUser = newAppUser;
                newAppUser = tempDoc;
            }
            common.db.collection('app_user_merges').insert({
                //If we want to ensure order later then for each A->B we should check if there is B->C in progress and wait  for it to finish first. So we could recheck using $regex
                _id: app_id + "_" + newAppUser.uid + "_" + oldAppUser.uid,
                merged_to: newAppUser.uid,
                ts: Math.round(new Date().getTime() / 1000),
                lu: Math.round(new Date().getTime() / 1000),
                t: 0 //tries
            }, {ignore_errors: [11000]}, function() {
                //If there is any merge inserted New->somethingElse, do not merge data yet. skip till that finishes.
                mergeUserData(newAppUser, oldAppUser);
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
            if (error && error.message && error.message.substring(0, 12) !== "FileNotFound" && error.message.substring(0, 14) !== 'File not found') {
                log.e(error.message.substring(0, 14));
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
                    common.db.collection("exports").remove({"_eid": base_name[0]}, function(err0) {
                        if (err0) {
                            log.e(err0);
                        }
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
                    });
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

/*
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
};*/

var export_safely = function(options) {
    return new Promise(function(resolve) {
        var args = options.args;

        var params_countly = plugins.getDbConnectionParams('countly');

        var dbName = 'countly';
        var collection = "";
        var query = "{}";
        for (var z = 0; z < args.length; z++) {
            if (args[z] === '--collection') {
                collection = args[z + 1];
            }
            if (args[z] === '-q') {
                query = args[z + 1];
            }

            if (args[z] === '--db') {
                dbName = args[z + 1];
            }
        }
        try {
            query = JSON.parse(query);
        }
        catch (e) {
            log.e(e);
            query = {};
        }

        var pipeline = [{"$match": query}, {"$addFields": {"_col": collection, "__id": "$_id", "_eid": options.export_id}}, {"$project": {"_id": 0}}, {"$merge": {"into": {"db": "countly", "coll": "exports"}}}];
        if (dbName === params_countly.db) {
            common.db.collection(collection).aggregate(pipeline, function(err) {
                if (err) {
                    log.e(err);
                }
                resolve();
            });
        }
        else {
            common.drillDb.collection(collection).aggregate(pipeline, function(err2) {
                if (err2) {
                    log.e(err2);
                }
                resolve();
            });
        }
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
            export_folder = path.resolve(__dirname, './../../../export/AppUser/appUser_' + app_id + '_' + eid);
            var export_id = 'appUser_' + app_id + '_' + eid;
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
                    export_file: export_filename + ".json"
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

                export_safely({projection: {"appUserExport": 0}, export_id: export_id, app_id: app_id, args: [...dbargs, "--collection", "metric_changes" + app_id, "-q", '{"uid":{"$in": ["' + res[0].uid.join('","') + '"]}}', "--out", export_folder + "/metric_changes" + app_id + ".json"]}).finally(function() {
                    resolve();
                });
            }).then(function() {
                log.d("metric_changes exported");
                //export data from app_users
                return export_safely({projection: {"appUserExport": 0}, export_id: export_id, app_id: app_id, args: [...dbargs, "--collection", "app_users" + app_id, "-q", '{"uid":{"$in": ["' + res[0].uid.join('","') + '"]}}', "--out", export_folder + "/app_users" + app_id + ".json"]});

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
                                commands.push(export_safely({export_id: export_id, app_id: app_id, args: export_commands[prop][k].args}));
                            }
                        }
                        Promise.all(commands).then(
                            function() {
                                log.d("plugins colections exported");
                                if (single_user === true) {
                                    //update user document
                                    common.db.collection('app_users' + app_id).update({"_id": eid2}, {$set: {"appUserExport": export_folder + ".tar.gz"}}, {upsert: false}, function(err4, res1) {
                                        if (!err4 && res1.result && res1.result.nMatched !== 0) { //check against nMatched for cases when there is already false record of export file(to do not fail)
                                            plugins.dispatch("/systemlogs", {
                                                params: params,
                                                action: "export_app_user",
                                                data: {
                                                    result: "ok",
                                                    uids: res[0].uid.join(", "),
                                                    app_id: app_id,
                                                    info: "Export successful",
                                                    export_file: export_filename + ".json"
                                                }
                                            });
                                            callback(null, export_filename + ".json");
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
                                                    export_file: export_filename + ".json"
                                                }
                                            });
                                            if (res1 && res1.result) {
                                                log.e(JSON.stringify(res1.result));
                                            }
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
                                            export_file: export_filename + ".json"
                                        }
                                    });
                                    callback(null, export_filename + ".json");
                                }

                                //Now we don't have empty files.



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
                                        export_file: export_filename + ".json"
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
    const rangeLabels = ["1", "2", "3-5", "6-9", "10-19", "20-49", "50-99", "100-499", "500+"];
    const ranges = [[1], [2], [3, 5], [6, 9], [10, 19], [20, 49], [50, 99], [100, 499], [500] ];
    const collectionName = 'app_users' + params.qstring.app_id;
    let query = params.qstring.query || {};

    if (typeof query === "string") {
        try {
            query = JSON.parse(query);
            plugins.dispatch("/drill/preprocess_query", {
                query: query,
                params
            });
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

    const groupBy = { "$group": {"_id": "$sc", "count": {"$sum": 1}}};
    const sort = {'$sort': { 'index': 1}};

    var switches = [];
    var switches2 = [];
    for (let k = 0; k < ranges.length; k++) {
        if (k === ranges.length - 1) {
            switches.push({"case": {"$gte": ["$_id", ranges[k][0]]}, "then": rangeLabels[k]});
            switches2.push({"case": {"$gte": ["$_id", ranges[k][0]]}, "then": k});
        }
        else if (ranges[k].length === 1) {
            switches.push({"case": {"$eq": ["$_id", ranges[k][0]]}, "then": rangeLabels[k]});
            switches2.push({"case": {"$eq": ["$_id", ranges[k][0]]}, "then": k});
        }
        else {
            switches.push({"case": {"$and": [{"$gte": ["$_id", ranges[k][0]]}, {"$lte": ["$_id", ranges[k][1]]}]}, "then": rangeLabels[k]});
            switches2.push({"case": {"$and": [{"$gte": ["$_id", ranges[k][0]]}, {"$lte": ["$_id", ranges[k][1]]}]}, "then": k});
        }
    }

    var indexProject = {};

    indexProject.$project = {
        "_id": {"$switch": {"branches": switches, "default": ""}},
        "index": {"$switch": {"branches": switches2, "default": ""}},
        "count": "$count"
    };
    var group2 = {"$group": {"_id": "$_id", "count": {"$sum": "$count"}, "index": {"$first": "$index"}}};
    // Promises
    const allDataPromise = getAggregatedAppUsers(collectionName, [matchQuery, groupBy, indexProject, group2, {"$match": {"_id": {"$ne": ""}}}, sort]);
    const sevenDaysPromise = getAggregatedAppUsers(collectionName, [sevenDaysMatch, matchQuery, groupBy, indexProject, group2, {"$match": {"_id": {"$ne": ""}}}, sort]);
    const thirtyDaysPromise = getAggregatedAppUsers(collectionName, [thirtyDaysMatch, matchQuery, groupBy, indexProject, group2, {"$match": {"_id": {"$ne": ""}}}, sort]);

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