'use strict';

const { exists } = require('grunt');
const common = require('mocha/lib/interfaces/common');

const job = require('../parts/jobs/job.js'),
    async = require('async'),
    moment = require('moment'),
    plugins = require('../../plugins/pluginManager.js'),
    log = require('../utils/log.js')('job:userMerge');


    async function handleMerges(db,callback) {
        log.d('finishing up not finished merges merges...');

        var date = Math.round(new Date().getTime() / 1000) - 300;
        var cursor = db.collection('app_user_merges').find({"lu":{"$lt":date}});
        //check all serially with cursor next
        var user= await cursor.next();
        while(user){
            await new Promise((resolve,reject)=>{
                var dd = user._id.split("_");
                if(dd.length!=2){
                    log.e("deleting unexpected document in merges with bad _id: "+user._id);
                    db.collection('app_user_merges').remove({"_id":user._id},(err)=>{
                        if(err){
                            log.e("error deleting document in merges with bad _id: "+user._id);
                        }
                        resolve();
                    });
                }
                else {
                    var app_id = dd[0];
                    var olduid = dd[1];
                    //user docuument is not saved  merged - try merginfg it at first
                    if (user.merged_to) {
                        if(!user.u){//user documents are not fully merged. Retry merging them. 
                            //We create merging record only if both users are found. If old user do not exist - it was most likely merged and we can mark "u" as true.
                            //If both recolrde exists   - we should fetch both annd merge user properties+save them.
                            db.collection('app_users' + app_id).find({"uid":{"$in":[olduid,user.merged_to]}}).toArray((err,docs)=>{
                                var oldAppUser;
                                var newAppUser;
                                for(var z=0; z<docs.length;z++){
                                    if(docs[z].uid==olduid){
                                        oldAppUser = docs[z];
                                    }
                                    if(docs[z].uid==user.merged_to){
                                        newAppUser = docs[z];
                                    }
                                }
                                if(!oldAppUser && newAppUser){
                                    //old user was merged to new user - we can mark it as merged and process merging
                                    usersApi.mergeOtherPlugins(db, app_id, {uid: user._id}, {uid:user.merged_to}, {"cc":true,"u":true},resolve);
                                }
                                if( !newAppUser){
                                    //new user do not exists - we can delete merging record
                                    //If there would be case with old user existing, but new one not - old user has been readded after merge was triggered.(Because we create merge record if there really are 2 users to merge)
                                    db.collection('app_user_merges').remove({"_id":user._id},(err)=>{
                                        if(err){
                                            log.e("error deleting document in merges with bad _id: "+user._id);
                                        }
                                        resolve();
                                    });
                                }
                                else if(oldAppUser && newAppUser){
                                    //Both documents exists. Retry mergigin properties and  then  try merging other plugins
                                    plugins.dispatch("/i/user_merge", {
                                        app_id: app_id,
                                        newAppUser: newAppUser,
                                        oldAppUser: oldAppUser
                                    }, function() {
                                        //merge user data
                                        usersApi.mergeUserProperties(oldAppUser,newAppUser);
                                        //update new user
                                        
                                        common.db.collection('app_users' + app_id).update({_id: newAppUser._id}, {'$set': newAppUser}, function(err) {
                                            if(callback && typeof callback === 'function') {
                                                callback(null, newAppUserP);//we do not return error as merge is already registred. Doc merging will be retried in job.
                                            }
                                            //Dispatch to other plugins only after callback.
                                            if(!err){
                                                //update metric changes document
                                                common.db.collection("metric_changes" + app_id).update({uid: oldAppUser.uid}, {'$set': {uid: newAppUser.uid}}, {multi: true}, function(err) {
                                                    if(err){
                                                        log.e("Failed metric changes update in app_users merge", err);
                                                    }
                                                });
                                                //delete old app users document
                                                common.db.collection('app_users' + app_id).remove({_id: oldAppUser._id}, function(/*errRemoving*/) {
                                                    if(errRemoving){
                                                        log.e("Failed to remove merged user from database",errRemoving);
                                                    }
                                                    else {
                                                        usersApi.mergeOtherPlugins(common.db, app_id, oldAppUser, newAppUser, {"cc":true,"u":true},resolve);   
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        }
                        else {
                            usersApi.mergeOtherPlugins(db, app_id, {uid: user._id}, {uid:user.merged_to}, {"cc":true},resolve);
                        }
                    }
                    else {
                        resolve();
                    }
                }
            });
            user = await cursor.next();
        }
        callback();

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
        handleMerges(db,()=>{
                done();
        });


        
    }
}

module.exports = UserMergeJob;