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

(function (usersApi) {
    /**
    * Create new app_user document. Creates uid if one is not provided
    * @param {string} app_id - _id of the app
    * @param {object} doc - document to insert
    * @param {params} params - to determine who makes modification, should have member property with user who makes modification, and req for request object to determine ip address
    * @param {function} callback - called when finished providing error (if any) as first param and insert result as second
    */
    usersApi.create = function(app_id, doc, params, callback){
        if(typeof params === "function"){
            callback = params;
            params = {};
        }
        if(!doc){
            callback("Provide data to insert");
            return;
        }
        if(typeof doc.did === "undefined"){
            callback("Provide device_id as did property for data");
            return;
        }
        common.db.collection('apps').findOne({_id:common.db.ObjectID(app_id)}, function(err, app) {
            if(err || !app){
                callback("App does not exist");
                return;
            }
            var _id = common.crypto.createHash('sha1').update(app.key + doc.did + "").digest('hex');
            if(doc._id && doc._id != _id){
                callback("Based on app key and device_id, provided _id property should be "+_id+". Do not provide _id if you want api to use correct one");
                return;
            }
            doc._id = _id;
            if(typeof doc.uid === "undefined"){
                usersApi.getUid(app_id, function(err1, uid){
                    if(uid){
                        doc.uid = uid;
                        common.db.collection('app_users' + app_id).insert(doc, function(err2, res) {
                            if(!err2){
                                plugins.dispatch("/i/app_users/create", {app_id:app_id, user:doc, res:doc, params:params});
                            }
                            if(callback)
                                callback(err1 || err2, doc);
                        });
                    }
                    else if(callback){
                        callback(err1);
                    }
                });
            }
            else{
                common.db.collection('app_users' + app_id).insert(doc, function(err, res) {
                    if(!err){
                        plugins.dispatch("/i/app_users/create", {app_id:app_id, user:doc, res:doc, params:params});
                    }
                    if(callback)
                        callback(err, doc);
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
    usersApi.update = function(app_id, query, update, params, callback){
        if(typeof params === "function"){
            callback = params;
            params = {};
        }
        if(Object.keys(update).length){
            for(var i in update){
                if(i.indexOf("$") !== 0){
                    var err = "Unkown modifier " + i + " in " + JSON.stringify(update) + " for " + JSON.stringify(query);
                    console.log(err);
                    if(callback)
                        callback(err);
                    return;
                }
            }
            common.db.collection('app_users' + app_id).findAndModify(query, {}, update, {upsert:true}, function(err, res) {
                if(!err){
                    plugins.dispatch("/i/app_users/update", {app_id:app_id, query:query, update:update, user:res && res.value, params:params});
                }
                if(callback)
                    callback(err, res && res.value);
            });
        }
        else if(callback)
            callback("Update can't be empty");
    };
    
    /**
    * Delete existing app_users documents, deletes also all plugin data
    * @param {string} app_id - _id of the app
    * @param {object} query - mongodb query to select which app users to delete
    * @param {params} params - to determine who makes modification, should have member property with user who makes modification, and req for request object to determine ip address
    * @param {function} callback - called when finished providing error (if any) as first param and array with uids of removed users as second
    */
    usersApi.delete = function(app_id, query, params, callback){
        if(typeof params === "function"){
            callback = params;
            params = {};
        }
        common.db.collection("app_users"+app_id).aggregate([
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    uid: { $addToSet: '$uid' },
                    picture:{$addToSet: '$picture'},
                    exported:{$addToSet:'$appUserExport'}
                }
            }
        ], {allowDiskUse:true}, function(err, res){
            if(res && res[0] && res[0].uid && res[0].uid.length){
                common.db.collection("metric_changes" +  app_id).remove({uid: {$in: res[0].uid}},function(err, result){
                    plugins.dispatch("/i/app_users/delete", {app_id:app_id, query:query, uids:res[0].uid, params:params}, function(){
                        common.db.collection("app_users" + app_id).remove({uid: {$in: res[0].uid}},function(err, result){
                            if(res[0].exported)
                            {
                                for(var i=0;i<res[0].exported.length; i++)//delete exports if exist
                                {
                                    var id = res[0].exported[i].split("/");
                                    id = id.substr(id.length-7);
                                    
                                    deleteMyExport(id).then(
                                        function(res){},
                                        function(err){ console.log(err);}
                                    );
                                }
                            }
                            //deleting userimages(if they exist);
                            if(res[0].picure)
                            {
                            for(var i=0;i<res[0].picture.length; i++)//delete exports if exist
                                {
                                    //remove /userimages/ 
                                    var id = res[0].picture[i].substr(12,res[0].picture[i].length-12);
                                    var pp = path.resolve(__dirname,'./../../../frontend/express/public/userimages/'+id);
                                    countlyFs.deleteFile("userimages",pp,{id:id},function(err){
                                        if(err)
                                            console.log(err);
                                    }); 
                                }
                            }
                            try {
                              fs.appendFileSync(path.resolve(__dirname,'./../../../log/deletedUsers'+app_id+'.txt'), res[0].uid.join("\n")+"\n","utf-8");
                            } catch (err) {
                              console.log(err);
                            }
                            callback(err, res[0].uid);
                        });
                    });
                });
            }
            else{
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
    usersApi.search = function(app_id, query, project, sort, limit, skip, callback){
        query = query || {};
        if(typeof query === "string" && query.length){
            try{
                query = JSON.parse(query);
            }
            catch(ex){query = {};}
        }
        
        project = project || {};
        if(typeof project === "string" && project.length){
            try{
                project = JSON.parse(project);
            }
            catch(ex){project = {};}
        }
        
        sort = sort || {};
        if(typeof sort === "string" && sort.length){
            try{
                sort = JSON.parse(sort);
            }
            catch(ex){sort = {};}
        }
        
        limit = parseInt(limit) || 0;
        skip = parseInt(skip) || 0;
        
        var cursor =  common.db.collection('app_users' + app_id).find(query, project);
        if(Object.keys(sort).length){
            cursor.sort(sort);
        }
        
        if(skip){
            cursor.skip(skip);
        }
        
        if(limit){
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
    usersApi.count = function(app_id, query, callback){
        query = query || {};
        if(typeof query === "string" && query.length){
            try{
                query = JSON.parse(query);
            }
            catch(ex){query = {};}
        }
        
        common.db.collection('app_users' + app_id).count(query, callback);
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
            //store last merged uid for reference
            newAppUser.merged_uid = oldAppUser.uid;
            //update new user
            common.db.collection('app_users' + app_id).update({_id:newAppUser._id}, {'$set': newAppUser}, function(){
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
                    //register user merge
                    common.db.collection('app_user_merges' + app_id).insert({
                        _id:oldAppUser.uid, 
                        merged_to:newAppUser.uid, 
                        ts:Math.round(new Date().getTime()/1000), 
                        cd:new Date()
                    }, function(){
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
                    });
                }
                else{
                    //simply copy user document with old uid
                    //no harm is done
                    oldAppUser.did = new_device_id + "";
                    oldAppUser._id = new_id;
                    common.db.collection('app_users' + app_id).insert(oldAppUser, function(){
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
   
    var deleteMyExport = function(exportID)
    {//tries to delete packed file, exported folder and saved export in gridfs
    //normally there should be only export in gridfs. Cleaning all to be sure.
    //rejects only if there stays any saved data for export
       return new Promise(function (resolve, reject) {
            //remove archive
            errors = [];
            if (fs.existsSync(path.resolve(__dirname,'./../../../export/AppUser/'+exportID+'.tar.gz'))) {
                try {fs.unlinkSync(path.resolve(__dirname,'./../../../export/AppUser/'+exportID+'.tar.gz'));}
                catch(err){ errors.push(err);}
            }
            
            countlyFs.gridfs.deleteFile("appUsers", path.resolve(__dirname,'./../../../export/AppUser/'+exportID+'.tar.gz'), {id:exportID+'.tar.gz'}, function(error)
            {
                if(error && error.message && error.message.substring(0,12)!="FileNotFound")
                    errors.push(error.message);
                if(fs.existsSync(path.resolve(__dirname,'./../../../export/AppUser/'+exportID)))
                {
                    fse.remove(path.resolve(__dirname,'./../../../export/AppUser/'+exportID),
                        err => { 
                            if(err)
                                errors.push(error);
                            if(errors.length==0)
                                resolve();
                            else
                                reject(errors);
                        }
                    );
                }
                else  
                {
                    if(errors.length==0)
                        resolve();
                    else
                        reject(errors);
                }
            });            
           
        });
    }
    
    usersApi.deleteExport=function(filename,params,callback)
    {
        if(filename && filename!='')
        {
            var base_name = filename.split('.');
            var name_parts = base_name[0].split('_');
            
            //filename : appUsers_{appid}_{uid} vai appUsers_{appid}_HASH_{hash form uids}            
            if(name_parts[0] !='appUser')
            {
                callback('invalid filename','');
            }
            else
            {
                //remove archive
                deleteMyExport(base_name[0]).then(
                    function(res)
                    {
                        if(name_parts.length==3 && name_parts[2]!='HASH')
                        {
                            //update user info
                            common.db.collection('app_users' + name_parts[1]).update({"uid":name_parts[2]},{$unset:{"appUserExport":""}}, {upsert:false}, function(err, res1) {
                                if(err)
                                    callback(err,"");
                                else
                                {
                                    plugins.dispatch("/systemlogs", {params:params, action:"export_app_user_deleted", data:{result:"ok",uids:name_parts[2],id:base_name[0],app_id:name_parts[1],info:"Exported data deleted"}});
                                    callback(null,"Export deleted");
                                }
                            });
                        }
                        else
                        {
                            plugins.dispatch("/systemlogs", {params:params, action:"export_app_user_deleted", data:{result:"ok",id:base_name[0],app_id:name_parts[1],info:"Exported data deleted"}});
                            callback(null,"Export deleted");
                        }
                    },
                    function(err)
                    {
                        console.log(err);
                        callback("There was some errors during deleting export. Please look in log for more information","");
                    }
                );             
            }
        }
        else
             callback("Invalid filename","");
    }
    
   var run_command = function(my_command)
    {
        return new Promise(function(resolve, reject){
            var child = spawn(my_command, {shell:true,cwd: path.resolve(__dirname,'./../../../export/AppUser'), detached:false},function(error)
            {
                if(error)
                {
                    return reject(Error('error:'+ JSON.stringify(error)));
                }
            });
            child.on('error', function(error) {
                console.log(error);
                return resolve();
            });
            child.on('exit', function(code) {
                if(code ==0)
                    return resolve();
                else
                    console.log("Exited with error code: "+code);
            });
        });
    }        
    var clear_out_empty_files = function(folder)
    {
        return new Promise(function(resolve, reject){
            run_command("find "+folder+" -type f -name '*.json' -size 0 -delete").then(
                function(result)
                {
                    resolve();
                },
                function(error)
                {
                    resolve(); //resolve anyway(not so bad if empty files not deleted)
                }
            );
        });
    }
     /**
    * Exports data about app_users, including plugin data
    * @param {string} app_id - _id of the app
    * @param {object} query - mongodb query to select which app users data to export
    * @param {function} callback - called when finished providing error (if any) as first param and array with uids of exported users as second
    */
    usersApi.export = function(app_id, query,params, callback){
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
            if(err)
            {
                callback({message:err,filename:""},"");
                return;
            }
            if(res && res[0] && res[0].uid && res[0].uid.length){
                //create export folder
                var eid = res[0].uid[0];
                var single_user=true;
                if(res[0].uid.length>1)//if more than one user - create hash
                {
                    var sorted = res[0].uid.sort();
                    eid = "HASH_"+crypto.createHash('SHA1').update(JSON.stringify(sorted)).digest('hex');
                    single_user=false;
                }

                var export_folder = path.resolve(__dirname,'./../../../export');
                if (!fs.existsSync(export_folder)) {
                    try {fs.mkdirSync(export_folder);}catch(err){callback(err,[]);}
                }
                
                export_folder = path.resolve(__dirname,'./../../../export/AppUser');
                if (!fs.existsSync(export_folder)) {
                    try {fs.mkdirSync(export_folder);}catch(err){callback(err,[]);}
                }
                
                export_folder = path.resolve(__dirname,'./../../../export/AppUser/appUser_'+app_id+'_'+eid);
                
                if (fs.existsSync(export_folder+'.tar.gz')) {
                    callback({message:'There is exported data for given users on server.Delete it to start new',filename:'appUser_'+app_id+'_'+eid+'.tar.gz'},"");
                    return;
                }
                
                if (!fs.existsSync(export_folder)) {
                    try {fs.mkdirSync(export_folder);}catch(err){callback(err,[]);}
                }
                else
                {
                    callback({message:'There is ongoing export data on server with the same users.Wait till finish or delete it to start new',filename:'appUser_'+app_id+'_'+eid},"");
                    return;
                }
                var export_filename = 'appUser_'+app_id+'_'+eid;
                
                var dbstr="";
                var export_commands = {};
                var db_params = plugins.getDbConnectionParams('countly');
                for(var p in db_params){
                    dbstr += " --"+p+" "+db_params[p];
                }
                
                plugins.dispatch("/systemlogs", {params:params, action:"export_app_user_started", data:{result:"ok",uids:res[0].uid.join(", "),app_id:app_id,info:"Export started",export_file:export_folder+".tar.gz"}});
                
               //update db if one user
                new Promise(function (resolve, reject) {
                    if(single_user)
                        common.db.collection('app_users' + app_id).update({"uid":eid},{$set:{"appUserExport":export_folder+""}}, {upsert:false}, function(err, res1) {
                            if(err)
                                reject(err);
                            else
                                resolve();
                        });
                    else
                        resolve();
                }).then(function(){
                    //export data from metric_changes
                    return run_command('mongoexport ' + dbstr + ' --collection metric_changes'+app_id+' -q \'{uid:{$in: ["'+res[0].uid.join('","')+'"]}}\' --out '+ export_folder+'/metric_changes'+app_id+'.json');
                }).then( function(){
                    //export data from app_users
                    return run_command('mongoexport ' + dbstr + ' --collection app_users'+app_id+' -q \'{uid: {$in: ["'+res[0].uid.join('","')+'"]}}\' --out '+ export_folder+'/app_users'+app_id+'.json');
                 }).then(
                    function(result) {
                        //get other export commands from other plugins
                        plugins.dispatch("/i/app_users/export", {app_id:app_id,dbstr:dbstr,export_commands:export_commands, query:query, uids:res[0].uid,export_folder:export_folder}, function(){
                            var commands = [];
                            for (var prop in export_commands) {
                                for( var p=0; p<export_commands[prop].length; p++)
                                {
                                    commands.push(run_command(export_commands[prop][p]));
                                }
                            }
                            Promise.all(commands).then(
                                function(result) {
                                //pack export
                                    clear_out_empty_files(path.resolve(__dirname,'./../../../export/AppUser/'+export_filename))//remove empty files
                                    .then(function(){ return run_command("tar -cvf "+export_filename+".tar.gz"+" "+export_filename)}) //create archive
                                    .then(function(){
                                        return new Promise(function(resolve, reject){/*save export in gridFS*/
                                            var my_filename = path.resolve(__dirname,'./../../../export/AppUser/'+export_filename+'.tar.gz')
                                            countlyFs.gridfs.saveFile("appUsers", my_filename, my_filename, {id:export_filename+".tar.gz",writeMode:"overwrite"}, function(err){
                                                if(err)
                                                {
                                                    console.log(err);
                                                    reject("unable to store exported file. There is more information in log.");
                                                }
                                                else
                                                {
                                                //remove archive, because it is saved in db.
                                                    try {fs.unlinkSync(my_filename);}
                                                    catch(err){ console.log(err);}
                                                    resolve();//resolve anyway because export is still OK
                                                }
                                            });
                                        });
                                    })
                                    .then(
                                        function(result) {
                                            fse.remove(export_folder, err => {
                                                if (err) {
                                                    plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",uids:res[0].uid.join(", "),app_id:app_id,info:"There was error during cleanup. you should remove data folder manualy.",export_file:export_folder+".tar.gz", export_folder:export_folder}});
                                                    callback({message:"Export successful. Export saved as given filename.  Was  unable to clean up data associated with export. You can try to delete it via api.",filename:"export_filename+".tar.gz},"");
                                                } 
                                                else
                                                {
                                                    if(single_user==true)
                                                    {
                                                        //update user document
                                                        common.db.collection('app_users' + app_id).update({"uid":eid},{$set:{"appUserExport":export_folder+".tar.gz"}}, {upsert:false}, function(err, res1) {
                                                            if(!err && res1.result && res1.result.n!=0 && res1.result.nModified!=0)
                                                            {
                                                                plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"ok",uids:res[0].uid.join(", "),app_id:app_id,info:"Export successful",export_file:export_folder+".tar.gz"}});
                                                                callback(null, export_filename+".tar.gz");
                                                            }
                                                            else//not updated (not exist or errored)
                                                            {
                                                                plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",uids:res[0].uid.join(", "),app_id:app_id,info:"User not exist",export_folder:export_folder}});
                                                                usersApi.deleteExport(export_filename,params,function(err,msg){
                                                                    if(err)
                                                                        callback({mesage:"Exporting failed. User does not exist. Unable to clean exported data",filename:'appUser_'+app_id+'_'+eid},"");
                                                                    else
                                                                        callback({mesage:"Exporting failed. User does not exist. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                                                                });
                                                            
                                                            }
                                                                
                                                        });
                                                    }
                                                    else
                                                    {
                                                        plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"ok",uids:res[0].uid.join(", "),app_id:app_id,info:"Export successful",export_file:export_folder+".tar.gz"}});
                                                        callback(null, export_filename+".tar.gz");
                                                    }
                                                }
                                            });
                                        }, 
                                        function(error) {
                                            plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",uids:res[0].uid.join(", "),app_id:app_id,info:err,export_folder:export_folder}});
                                            usersApi.deleteExport(export_filename,params,function(err,msg){
                                                if(err)
                                                    callback({mesage:"Storing exported files failed. Unable to clean up file system.",filename:'appUser_'+app_id+'_'+eid},"");
                                                else
                                                    callback({mesage:"Storing exported files failed. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                                            });
                                        }
                                    ).catch(err => {
                                        plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",info:err}});
                                        usersApi.deleteExport(export_filename,params,function(err,msg){
                                            if(err)
                                                callback({mesage:"Storing exported files failed. Unable to clean up file system.",filename:'appUser_'+app_id+'_'+eid},"");
                                            else
                                                callback({mesage:"Storing exported files failed. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                                        });
                                    });
                                },
                                function(error) {
                                    console.log(error);
                                    plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",uids:res[0].uid.join(", "),app_id:app_id,info:"Error during exporting files",export_folder:export_folder}});
                                    usersApi.deleteExport(export_filename,params,function(err,msg){
                                        if(err)
                                            callback({mesage:"Export failed. Unable to clean up file system.",filename:'appUser_'+app_id+'_'+eid},"");
                                        else
                                            callback({mesage:"Export failed. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                                    });
                                }
                            );
                        });    
                    },
                    function(error) {
                        plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",info:error,uids:res[0].uid.join(", "),app_id:app_id}});
                        usersApi.deleteExport(export_filename,params,function(err,msg){
                            if(err)
                                callback({mesage:"Export failed. Unable to clean up file system.",filename:'appUser_'+app_id+'_'+eid},"");
                            else
                                callback({mesage:"Export failed. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                        });
                    }
                ).catch(err => {
                    plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"error",info:err}});
                    usersApi.deleteExport(export_filename,params,function(err,msg){
                            if(err)
                                callback({mesage:"Export failed. Unable to clean up file system.",filename:'appUser_'+app_id+'_'+eid},"");
                            else
                                callback({mesage:"Export failed. Partially exported data deleted.",filename:'appUser_'+app_id+'_'+eid},"");
                        });
                });
            }
            else{
                plugins.dispatch("/systemlogs", {params:params, action:"export_app_user", data:{result:"ok",info:"There wasn't any user to export data for."}});
                callback("Query didn't mach any user","");
            }
        });
    };
}(usersApi));

plugins.extendModule("app_users", usersApi);

module.exports = usersApi;