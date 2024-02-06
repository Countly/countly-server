/**
 *  Description: Script will finish started merges
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node process_merges.js
 */
const pluginManager = require('../../../plugins/pluginManager.js');
const common = require("../../../api/utils/common.js");
var usersApi = require('../../../api/parts/mgmt/app_users.js');
const {WriteBatcher, ReadBatcher, InsertBatcher} = require('../../../api/parts/data/batcher.js');
var Promise = require("bluebird");



var limit = 100;
var paralel_cn = 1;

var getMergeDoc = function(data) {
    if (data && data.list && data.list.length > data.pointer) {
        var copy = data.pointer;
        data.pointer++;
        return data.list[copy];
    }
    else {
        return null;
    }
};

function processMerging(db, dataObj, resolve) {
    var user = getMergeDoc(dataObj);
    if (user) {
        mergeUserData(db, user, function() {
            processMerging(db, dataObj, resolve);
        });
    }
    else {
        resolve();
    }
}

function mergeUserData(db, user, resolve) {
    var dd = user._id.split("_");
    if (dd.length !== 3) {
        console.log("deleting unexpected document in merges with bad _id: " + user._id);
        db.collection('app_user_merges').remove({"_id": user._id}, (err2)=>{
            if (err2) {
                console.log("error deleting document in merges with bad _id: " + user._id);
                console.log(err2);
            }
            resolve();
        });
    }
    else if (user.t > 100) {
        console.log("deleting document in merges with too many retries: " + user._id);
        db.collection('app_user_merges').remove({"_id": user._id}, (err2)=>{
            if (err2) {
                console.log("error deleting document in merges with _id: " + user._id);
                console.log(err2);
            }
            resolve();
        });
    }
    else {
        var app_id = dd[0];
        var olduid = dd[2];
        //user docuument is not saved  merged - try merginfg it at first
        if (user.merged_to) {
            if (!user.u) { //user documents are not merged. Could be just failed state.
                console.log("user doc not saved as merged. Processing it.");
                db.collection('app_users' + app_id).find({"uid": {"$in": [olduid, user.merged_to]}}).toArray((err5, docs)=>{
                    if (err5) {
                        console.log("error fetching users for merge", err5);
                        resolve();
                        return;
                    }
                    var oldAppUser;
                    var newAppUser;
                    for (var z = 0; z < docs.length;z++) {
                        if (docs[z].uid === olduid) {
                            oldAppUser = docs[z];
                        }
                        if (docs[z].uid === user.merged_to) {
                            newAppUser = docs[z];
                        }
                    }
                    if (!oldAppUser && newAppUser) {
                        //old user was merged to new user, but state update failed - we can mark it as merged and process other plugins
                        usersApi.mergeOtherPlugins({db: db, app_id: app_id, newAppUser: {uid: user.merged_to}, oldAppUser: {uid: olduid}, updateFields: {"mc": true, "cc": true, "u": true}, mergeDoc: user}, resolve);
                    }
                    if (!newAppUser) {
                        //new user do not exists - we can delete merging record
                        db.collection('app_user_merges').remove({"_id": user._id}, (err4)=>{
                            if (err4) {
                                console.log("error deleting document in merges with bad _id: " + user._id);
                                console.log(err4);
                            }
                            resolve();
                        });
                    }
                    else if (oldAppUser && newAppUser) {
                        db.collection('app_user_merges').update({"_id": user._id}, {"$inc": {"t": 1}}, {upsert: false}, function(err0) {
                            if (err0) {
                                console.log(err0);
                            }
                            //Both documents exists. We can assume that documents were not merged
                            pluginManager.dispatch("/i/user_merge", {
                                app_id: app_id,
                                newAppUser: newAppUser,
                                oldAppUser: oldAppUser
                            }, function() {
                                //merge user data
                                usersApi.mergeUserProperties(newAppUser, oldAppUser);
                                //update new user

                                db.collection('app_users' + app_id).update({_id: newAppUser._id}, {'$set': newAppUser}, function(err6) {
                                    //Dispatch to other plugins only after callback.
                                    if (!err6) {
                                        //update metric changes document
                                        db.collection("metric_changes" + app_id).update({uid: oldAppUser.uid}, {'$set': {uid: newAppUser.uid}}, {multi: true}, function(err7) {
                                            if (err7) {
                                                console.log("Failed metric changes update in app_users merge", err7);
                                            }
                                        });
                                        //delete old app users document
                                        db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, function(errRemoving) {
                                            if (errRemoving) {
                                                console.log("Failed to remove merged user from database", errRemoving);
                                            }
                                            else {
                                                usersApi.mergeOtherPlugins({db: db, app_id: app_id, newAppUser: {uid: user.merged_to}, oldAppUser: {uid: olduid}, updateFields: {"cc": true, "u": true}, mergeDoc: user}, resolve);
                                            }
                                        });
                                    }
                                    else {
                                        resolve();//will retry after
                                    }
                                });
                            });
                        });
                    }
                });
            }
            else if (!user.mc) { //documents are merged, but metric changes and other plugins are not yet
                db.collection('app_user_merges').update({"_id": user._id}, {"$inc": {"t": 1}}, {upsert: false}, function(err0) {
                    if (err0) {
                        console.log(err0);
                    }
                    db.collection("metric_changes" + app_id).update({uid: olduid}, {'$set': {uid: usersApi.merged_to}}, {multi: true}, function(err7) {
                        if (err7) {
                            console.log("Failed metric changes update in app_users merge", err7);
                        }
                        else {
                            usersApi.mergeOtherPlugins({db: db, app_id: app_id, newAppUser: {uid: user.merged_to}, oldAppUser: {uid: olduid}, updateFields: {"cc": true, "mc": true}, mergeDoc: user}, resolve);
                        }
                    });
                });
            }
            else {
                usersApi.mergeOtherPlugins({db: db, app_id: app_id, newAppUser: {uid: user.merged_to}, oldAppUser: {uid: olduid}, updateFields: {"cc": true}, mergeDoc: user}, resolve);
            }
        }
        else {
            resolve();
        }
    }
}



var handleMerges = function(db, callback) {
    console.log('looking for unfinished merges ...');

    var date = Math.round(new Date().getTime() / 1000) - 30;
    db.collection('app_user_merges').find({"lu": {"$lt": date}}).limit(limit).toArray(function(err, mergedocs) {
        if (err) {
            callback(err);
        }
        if (mergedocs && mergedocs.length > 0) {
            var promises = [];
            console.log('found ' + mergedocs.length + ' unfinished merges');
            var dataObj = {'list': mergedocs, pointer: 0};
            for (var z = 0; z < paralel_cn; z++) {
                promises.push(new Promise((resolve)=>{
                    processMerging(db, dataObj, resolve);
                }));
            }
            Promise.all(promises).then(()=>{
                if (mergedocs.length === limit) {
                    setTimeout(()=>{
                        handleMerges(db, callback);
                    }, 0); //To do not grow stack.
                }
                else {
                    callback();
                }
            }).catch((errThrown)=>{
                console.log("finished with errors");
                console.log(errThrown);
                callback(errThrown);
            });
        }
        else {
            console.log('all users merged');
            callback();
        }
    });
};

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    common.db = countlyDb;
    common.drillDb = drillDb;

    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new ReadBatcher(common.db);
    common.insertBatcher = new InsertBatcher(common.db);
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb);
    }

    //get all apps
    pluginManager.init();
    console.log("Loading plugins...");
    pluginManager.loadConfigs(common.db, function() {
        console.log("Starting merge processing");
        handleMerges(common.db, close);
    });

    function close(err) {
        process.exit(1);
        if (err) {
            console.log("Finished with errors: ", err);
        }
        else {
            console.log("Finished successfully.");
        }
    }
});