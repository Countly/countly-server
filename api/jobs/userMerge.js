'use strict';

const job = require('../parts/jobs/job.js'),
    plugins = require('../../plugins/pluginManager.js'),
    log = require('../utils/log.js')('job:userMerge');
var Promise = require("bluebird");
var usersApi = require('../parts/mgmt/app_users.js');

var handleMerges = function(db, callback) {
    log.d('looking for unfinished merges ...');

    var date = Math.round(new Date().getTime() / 1000) - 60;
    db.collection('app_user_merges').find({"lu": {"$lt": date}}).limit(100).toArray(function(err, mergedocs) {
        if (err) {
            callback(err);
        }
        if (mergedocs && mergedocs.length > 0) {
            log.d('found ' + mergedocs.length + ' unfinished merges');
            Promise.each(mergedocs, function(user) {
                return new Promise((resolve)=>{
                    var dd = user._id.split("_");
                    if (dd.length !== 3) {
                        log.e("deleting unexpected document in merges with bad _id: " + user._id);
                        db.collection('app_user_merges').remove({"_id": user._id}, (err2)=>{
                            if (err2) {
                                log.e("error deleting document in merges with bad _id: " + user._id);
                                log.e(err2);
                            }
                            resolve();
                        });
                    }
                    else if (user.t > 100) {
                        log.e("deleting document in merges with too many retries: " + user._id);
                        db.collection('app_user_merges').remove({"_id": user._id}, (err2)=>{
                            if (err2) {
                                log.e("error deleting document in merges with _id: " + user._id);
                                log.e(err2);
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
                                log.e("user doc not saved as merged. Processing it.");
                                db.collection('app_users' + app_id).find({"uid": {"$in": [olduid, user.merged_to]}}).toArray((err5, docs)=>{
                                    if (err5) {
                                        log.e("error fetching users for merge", err5);
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
                                                log.e("error deleting document in merges with bad _id: " + user._id);
                                                log.e(err4);
                                            }
                                            resolve();
                                        });
                                    }
                                    else if (oldAppUser && newAppUser) {
                                        db.collection('app_user_merges').update({"_id": user._id}, {"$inc": {"t": 1}}, {upsert: false}, function(err0) {
                                            if (err0) {
                                                log.e(err0);
                                            }
                                            //Both documents exists. We can assume that documents were not merged
                                            plugins.dispatch("/i/user_merge", {
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
                                                                log.e("Failed metric changes update in app_users merge", err7);
                                                            }
                                                        });
                                                        //delete old app users document
                                                        db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, function(errRemoving) {
                                                            if (errRemoving) {
                                                                log.e("Failed to remove merged user from database", errRemoving);
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
                                        log.e(err0);
                                    }
                                    db.collection("metric_changes" + app_id).update({uid: olduid}, {'$set': {uid: usersApi.merged_to}}, {multi: true}, function(err7) {
                                        if (err7) {
                                            log.e("Failed metric changes update in app_users merge", err7);
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
                });
            }).then(()=>{
                if (mergedocs.length === 100) {
                    setTimeout(()=>{
                        handleMerges(db, callback);
                    }, 0); //To do not grow stack.
                }
                else {
                    callback();
                }
            }).catch((errThrown)=>{
                log.e("finished with errors");
                log.e(errThrown);
                callback(errThrown);
            });
        }
        else {
            log.d('all users merged');
            callback();
        }
    });
};
/** Class for the user mergind job **/
class UserMergeJob extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     * @param {function} progressJob - callback when progress made
     */
    run(db, done, progressJob) {
        var total = 0;
        var current = 0;
        var bookmark = "";

        /**
         * check job status periodically
         */
        function ping() {
            log.d('Pinging user merging job');
            if (timeout) {
                progressJob(total, current, bookmark);
                timeout = setTimeout(ping, 10000);
            }
        }
        /**
         * end job
         * @returns {varies} job done
         */
        function endJob() {
            log.d('Ending user merging job');
            clearTimeout(timeout);
            timeout = 0;
            return done();
        }
        var timeout = setTimeout(ping, 10000);

        log.d('finishing up not finished merges merges...');
        handleMerges(db, ()=>{
            endJob();
        });
    }
}

module.exports = UserMergeJob;