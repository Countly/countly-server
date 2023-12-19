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
                                        usersApi.mergeOtherPlugins(db, app_id, {uid: user.merged_to}, {uid: olduid}, {"mc": true, "cc": true, "u": true}, resolve);
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
                                                if (callback && typeof callback === 'function') {
                                                    callback(null, newAppUser);//we do not return error as merge is already registred. Doc merging will be retried in job.
                                                }
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
                                                            usersApi.mergeOtherPlugins(db, app_id, newAppUser, oldAppUser, {"cc": true, "u": true}, resolve);
                                                        }
                                                    });
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                            else if (!user.mc) { //documents are merged, but metric changes and other plugins are not yet
                                db.collection("metric_changes" + app_id).update({uid: olduid}, {'$set': {uid: usersApi.merged_to}}, {multi: true}, function(err7) {
                                    if (err7) {
                                        log.e("Failed metric changes update in app_users merge", err7);
                                    }
                                    else {
                                        usersApi.mergeOtherPlugins(db, app_id, {uid: user.merged_to}, {uid: olduid}, {"cc": true, "mc": true}, resolve);
                                    }
                                });
                            }
                            else {
                                usersApi.mergeOtherPlugins(db, app_id, {uid: user.merged_to}, {uid: olduid}, {"cc": true}, resolve);
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
     */
    run(db, done) {
        log.d('finishing up not finished merges merges...');
        handleMerges(db, ()=>{
            done();
        });
    }
}

module.exports = UserMergeJob;