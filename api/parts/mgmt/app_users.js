/**
* This module is meant for manipulating app_users documents programmatically, without the need of SDK request
* @module api/parts/mgmt/app_users
*/

/** @lends module:api/parts/mgmt/app_users */
var usersApi = {},
    common = require('./../../utils/common.js'),
	plugins = require('../../../plugins/pluginManager.js');

(function (usersApi) {
    /**
    * Create new app_user document. Creates uid if one is not provided
    * @param {string} app_id - _id of the app
    * @param {object} doc - document to insert
    * @param {function} callback - called when finished providing error (if any) as first param and insert result as second
    */
    usersApi.create = function(app_id, doc, callback){
        if(typeof doc.uid === "undefined"){
            usersApi.getUid(app_id, function(err1, uid){
                if(uid){
                    common.db.collection('app_users' + app_id).insert(doc, function(err2, res) {
                        if(!err2){
                            plugins.dispatch("/i/app_users/create", {app_id:app_id, user:doc, res:res && res.value});
                        }
                        if(callback)
                            callback(err || err2, res);
                    });
                }
                else if(callback){
                    callback(err);
                }
            });
        }
        else{
            common.db.collection('app_users' + app_id).insert(doc, function(err, res) {
                if(!err){
                    plugins.dispatch("/i/app_users/create", {app_id:app_id, user:doc, res:res && res.value});
                }
                if(callback)
                    callback(err, res);
            });
        }
    };
    
    /**
    * Update existing app_users document. Cannot replace document, must have modifiers like $set, $unset, etc
    * @param {string} app_id - _id of the app
    * @param {object} query - mongodb query to select which app users to update
    * @param {object} update - mongodb update object
    * @param {function} callback - called when finished providing error (if any) as first param and updated user document as second
    */
    usersApi.update = function(app_id, query, update, callback){
        if(Object.keys(update).length){
            for(var i in update){
                if(i.indexOf("$") !== 0){
                    var err = "Unkown modifier " + i + " in " + update + " for " + query
                    console.log(err);
                    if(callback)
                        callback(err);
                    return;
                }
            }
            common.db.collection('app_users' + app_id).findAndModify(query, {}, update, {new:true, upsert:true}, function(err, res) {
                if(!err){
                    plugins.dispatch("/i/app_users/update", {app_id:app_id, query:query, update:update, user:res && res.value});
                }
                if(callback)
                    callback(err, res && res.value);
            });
        }
        else if(callback)
            callback();
    };
    
    /**
    * Delete existing app_users documents, deletes also all plugin data
    * @param {string} app_id - _id of the app
    * @param {object} query - mongodb query to select which app users to delete
    * @param {function} callback - called when finished providing error (if any) as first param and array with uids of removed users as second
    */
    usersApi.delete = function(app_id, query, callback){
        common.db.collection("app_users"+app_id).aggregate([
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    uid: { $addToSet: '$uid' }
                }
            }
        ], {allowDiskUse:true}, function(err, res){
            if(res && res[0] && res[0].uid && res[0].uid.length){
                common.db.collection("metric_changes" +  app_id).remove({uid: {$in: res[0].uid}},function(err, res){
                    plugins.dispatch("/i/app_users/delete", {app_id:app_id, query:query, uids:res[0].uid}, function(){
                        common.db.collection("app_users" + app_id).remove({uid: {$in: res[0].uid}},function(err, res){
                            callback(err, res[0].uid);
                        });
                    });
                });
            }
            else{
                callback(null, []);
            }
        });
    };
    
    /**
    * Returns uid for new users
    * @param {string} app_id - _id of the app
    * @param {function} callback - called when finished providing error (if any) as first param and new uid as second
    */
    usersApi.getUid = function(app_id, callback){
        common.db.collection('apps').findAndModify({_id:common.db.ObjectID(app_id)},{},{$inc:{seq:1}},{new:true, upsert:true}, function(err,result){
            result = result && result.ok ? result.value : null;
            if (result && result.seq) {
                if(callback)
                    callback(err, common.parseSequence(result.seq));
            }
            else if(callback){
                callback(err);
            }
        });
    }
    
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
    usersApi.merge = function(app_id, newAppUser, new_id, old_id, new_device_id, old_device_id, callback){
        function mergeUserData(newAppUser, oldAppUser){                  
            //allow plugins to deal with user mergin properties
            plugins.dispatch("/i/user_merge", {app_id:app_id, newAppUser:newAppUser, oldAppUser:oldAppUser});
            //merge user data
            for(var i in oldAppUser){
                // sum up session count and total session duration
                if(i == "sc" || i == "tsd"){
                    if(typeof newAppUser[i] === "undefined")
                        newAppUser[i] = 0;
                    newAppUser[i] += oldAppUser[i];
                }
                //check if old user has been seen before new one
                else if(i == "fs"){
                    if(!newAppUser.fs || oldAppUser.fs < newAppUser.fs)
                        newAppUser.fs = oldAppUser.fs;
                }
               //check if old user has been seen before new one
                else if(i == "fac"){
                    if(!newAppUser.fac || oldAppUser.fac < newAppUser.fac)
                        newAppUser.fac = oldAppUser.fac;
                }
                //check if old user has been the last to be seen
                else if(i == "ls"){
                    if(!newAppUser.ls || oldAppUser.ls > newAppUser.ls){
                        newAppUser.ls = oldAppUser.ls;
                        //then also overwrite last session data
                        if(oldAppUser.lsid)
                            newAppUser.lsid = oldAppUser.lsid;
                        if(oldAppUser.sd)
                            newAppUser.sd = oldAppUser.sd;
                    }
                }
                //check if old user has been the last to be seen
                else if(i == "lac"){
                    if(!newAppUser.lac || oldAppUser.lac > newAppUser.lac){
                        newAppUser.lac = oldAppUser.lac;
                    }
                }
                else if(i == "lest"){
                    if(!newAppUser.lest || oldAppUser.lest > newAppUser.lest){
                        newAppUser.lest = oldAppUser.lest;
                    }
                }
                else if(i == "lbst"){
                    if(!newAppUser.lbst || oldAppUser.lbst > newAppUser.lbst){
                        newAppUser.lbst = oldAppUser.lbst;
                    }
                }
                //merge custom user data
                else if(typeof oldAppUser[i] === "object" && oldAppUser[i]){
                    if(typeof newAppUser[i] === "undefined")
                        newAppUser[i] = {};
                    for(var j in oldAppUser[i]){
                        //set properties that new user does not have
                        if(typeof newAppUser[i][j] === "undefined")
                            newAppUser[i][j] = oldAppUser[i][j];
                    }
                }
                //set other properties that new user does not have
                else if(i != "_id" && i != "did" && typeof newAppUser[i] === "undefined"){
                    newAppUser[i] = oldAppUser[i];
                }
            }
            //update new user
            usersApi.update(app_id, {_id:newAppUser._id}, {'$set': newAppUser}, function(){
                //delete old user
                common.db.collection('app_users' + app_id).remove({_id:oldAppUser._id}, function(err, res){
                    //let plugins know they need to merge user data
                    common.db.collection("metric_changes" + app_id).update({uid:oldAppUser.uid}, {'$set': {uid:newAppUser.uid}}, {multi:true}, function(err, res){});
                    plugins.dispatch("/i/device_id", {app_id:app_id, oldUser:oldAppUser, newUser:newAppUser});
                        if(callback)
                            callback(err, res);
                });
            });
        }

        common.db.collection('app_users' + app_id).findOne({'_id': old_id }, function (err, oldAppUser){
            if(!err && oldAppUser){
                if(newAppUser && Object.keys(newAppUser).length){
                    if(newAppUser.ls && newAppUser.ls > oldAppUser.ls){
                        mergeUserData(newAppUser, oldAppUser);
                    }
                    else{
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
                }
                else{
                    //simply copy user document with old uid
                    //no harm is done
                    oldAppUser.did = new_device_id + "";
                    oldAppUser._id = new_id;
                    usersApi.create(app_id, oldAppUser, function(){
                        common.db.collection('app_users' + app_id).remove({_id:old_id}, function(err, res){
                            if(callback)
                                callback(err, oldAppUser);
                        });
                    });
                }
            }
            else if(callback){
                //process request
                callback(null, newAppUser);
            }
        });
    };
    
    /**
    * Exports data about app_users, including plugin data
    * @param {string} app_id - _id of the app
    * @param {object} query - mongodb query to select which app users data to export
    * @param {function} callback - called when finished providing error (if any) as first param and array with uids of exported users as second
    */
    usersApi.export = function(app_id, query, callback){
        common.db.collection("app_users"+app_id).aggregate([
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    uid: { $addToSet: '$uid' }
                }
            }
        ], {allowDiskUse:true}, function(err, res){
            if(res && res[0] && res[0].uid && res[0].uid.length){
                //common.db.collection("metric_changes" +  app_id).remove({uid: {$in: res[0].uid}},function(err, res){
                    plugins.dispatch("/i/app_users/export", {app_id:app_id, query:query, uids:res[0].uid}, function(){
                        //common.db.collection("app_users" + app_id).remove({uid: {$in: res[0].uid}},function(err, res){
                            callback(err, res[0].uid);
                        //});
                    });
                //});
            }
            else{
                callback(null, []);
            }
        });
    };
}(usersApi));

plugins.extendModule("app_users", usersApi);

module.exports = usersApi;