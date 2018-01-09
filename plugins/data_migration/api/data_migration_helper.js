
var crypto = require('crypto');
var Promise = require("bluebird");
var plugins = require('../../pluginManager.js');
const fs = require('fs');
const fse = require('fs-extra');
var path = require('path');
var  countlyFs = require('../../../api/utils/countlyFs.js');
var cp = require('child_process'); //call process
var spawn = cp.spawn; //for calling comannd line
const os=require('os'); //hostname, eol
const request = require('request');

module.exports = function(my_db){
    var db = "";
    if(my_db)
        db = my_db;
    var params="";
    
    var my_logpath="";
    var exportid="";
    var exp_count=0;
    var exp_prog=0;
    var log="";
    
    var self = this;
    var create_con_strings = function()
    {
        var dbstr="";
        var db_params = plugins.getDbConnectionParams('countly');
        for(var p in db_params){
            dbstr += " --"+p+" "+db_params[p];
        }

        var dbstr_drill = "";
        db_params = plugins.getDbConnectionParams('countly_drill');
        for(var p in db_params){
            dbstr_drill += " --"+p+" "+db_params[p];
        }
        return {dbstr:dbstr,dbstr_drill:dbstr_drill};
    }


    var check_ids = function(apps)
    {
        return new Promise(function(resolve, reject){
            var bad_ids=[];
            var app_names = [];
            var object_array = [];
            for(var i=0; i<apps.length; i++)
            {
                try
                {
                    object_array.push(db.ObjectID(apps[i]));
                }
                catch(err)
                {
                     bad_ids.push(apps[i]);
                }
            }
            
            if(bad_ids.length>0)
               reject(Error("Given app id is/are not valid:"+bad_ids.join()));  
            db.collection("apps").find({_id: { $in: object_array }}).toArray(function(err, res){
                if(err){ log.e(err); reject();}
                else 
                {
                    for(var i=0; i<apps.length; i++)
                    {
                        bad_ids.push(apps[i]);
                    }
                    
                    for(var i=0; i<res.length; i++)
                    {
                        app_names.push(res[i].name);
                        if(bad_ids.indexOf(res[i]._id))
                        {
                            bad_ids.splice(bad_ids.indexOf(res[i]._id),1);
                        }
                    }
                    if(bad_ids.length>0)
                        reject(Error("You don't have any apps with given ids:"+bad_ids.join())); 
                    else
                        resolve(app_names);
                }
            });
        });
    };
    
    var create_and_validate_export_id = function(apps)
    {
        return new Promise(function(resolve, reject){
            //exportid - defined at the top of file
            exportid = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
            db.collection("data_migrations").findOne({_id:exportid},function(err, res){
                if(err){  reject(err);}
                else 
                {
                    var havefile=false;
                    var dir = __dirname + '/../export/'+exportid+'.tar.gz';
                    havefile = fs.existsSync(dir);
                                        
                    if(res)
                    {
                        if((res.step=='sending' || res.step=='importing')&& res.status=='failed')
                        {
                            if(havefile)
                                reject(Error('You have valid export failed in sending state'));
                            else
                                resolve();
                        }
                        else if(res.status=='finished' && res.step == "exporting" && havefile)
                        {
                            reject(Error("You have already exported data."));
                        }
                        else if( res.stopped==false && res.status!='finished' && res.status!='failed')
                        {
                            reject(Error('Already running exporting process'));
                        }
                        else
                        {
                            self.clean_up_data('export',exportid,true).then(
                                function(res){resolve();},
                                function(err){reject(err);}
                            );  
                        }
                    }
                    else
                    {
                        self.clean_up_data('export',exportid,true).then(
                            function(res){resolve();},
                            function(err){reject(err);}
                        );  
                    }
                }
            });        
        });       
    }
    
    
    var update_progress = function(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams)
    {
        exp_prog = exp_prog+dif;
        if(reset_progress)
            exp_prog = dif;
        var progress = 0;
        if(exp_count!=0)
           progress = Math.round(100*exp_prog/exp_count); 
        else
            progress = exp_prog;
        
        if(typeof reason =='undefined')
            reason ="";
        
        var set_data = {step:step,status:status,progress:progress,ts:Date.now(),reason:reason}
        if(more_fields)
        {
             for (var k in more_fields) {
                if (more_fields.hasOwnProperty(k)) {
                    set_data[k] = more_fields[k];
                }
            }
        }
        var updatea = {_id:my_exportid};
        if(!reset_progress)
            updatea.stopped=false;
        db.collection("data_migrations").update(updatea,{$set:set_data}, {upsert:true},function(err, res){
            if(err){log.e("Unable to update export status in db");}
            //if(res && res.result && res.result.n>0)
            if((status=='failed' || status=='finished'))
            {
                db.collection("data_migrations").findOne({_id:my_exportid},function(err, res){
                    if(err){ }
                    else 
                    {
                        if(res)
                        {
                            plugins.dispatch("/systemlogs", {params:{req:JSON.parse(res.myreq)},user:{_id:res.userid,email:res.email}, action:"export_"+status, data:{app_ids:res.apps,status:status,message:reason}});
                        }
                    }
                });

            }
            
        });       
    }
    
    
    this.clean_up_data = function (folder,exportid,remove_archive)
    {
        return new Promise(function(resolve, reject){
            if(exportid!="")
            {
                if(remove_archive)
                {
                    if(fs.existsSync(path.resolve(__dirname,'./../'+folder+'/'+exportid+'.tar.gz')))
                    {
                        try{fs.unlinkSync(path.resolve(__dirname,'./../'+folder+'/'+exportid+'.tar.gz'))}
                        catch(err){}
                    }
                }
                if(fs.existsSync(path.resolve(__dirname,'./../'+folder+'/'+exportid)))
                {
                        fse.remove(path.resolve(__dirname,'./../'+folder+'/'+exportid), err => {
                            if (err) {reject(Error('Unable to remove directory')); } 
                            
                        });
                }
                if(remove_archive && folder=='export')
                {
                    db.collection("data_migrations").findOne({_id:exportid},function(err, res){
                        if(err){  log.e(err.message);}
                        else 
                        {
                            if(res && res.export_path && res.export_path!='')
                            {
                                try{fs.unlinkSync(res.export_path);}
                                catch(err){}
                            }
                        }
                        resolve();
                    });
                }
                else
                    resolve();
            }
            else
                reject(Error('No exportid given'));
        });   
    }

    
    var log_me = function(logpath,message,is_error)
    {
        if(is_error)
            log.e(message);
         try{
            if(message.indexOf(os.EOL)==-1)
                fs.writeFileSync(logpath,message+os.EOL,{'flag': 'a'});
            else
               fs.writeFileSync(logpath,message,{'flag': 'a'}); 
        }
         catch(err){log.e('Unable to log import process:'+message);}
    }
    
    var run_command = function(my_command,update=true)
    {
        return new Promise(function(resolve, reject){
            var starr = ['inherit', 'inherit', 'inherit'];
            if(my_logpath!='')
            {
                const out = fs.openSync(my_logpath, 'a');
                const err = fs.openSync(my_logpath, 'a');
                starr = [ 'ignore', out, err ];
                
                log_me(my_logpath,"running command "+my_command,false);
            }
            var child = spawn(my_command, {shell:true,cwd: __dirname, detached:false,stdio:starr},function(error)
            {
                if(error)
                {
                    return reject(Error('error:'+ JSON.stringify(error)));
                }
            
            });
            
            child.on('error', function(error) {
                if(my_logpath!='')
                {
                    log_me(my_logpath,error.message,false);
                }
                return resolve();
                
            });
            child.on('exit', function(code) {
                if(code ==0)
                {
                    if(update && exp_count>0 && exportid && exportid!="")
                    {
                        if(update_progress(exportid,"exporting","progress",1,"")==false)
                        {
                            return reject(Error("Stopped exporting process"));
                        }
                    }
                   
                    return resolve();
                }
                else
                {
                    if(my_logpath!='')
                    {
                        log_me(my_logpath,"Exited with error code: "+code,false);
                    }
                    return resolve();
                }
                
            })
        });
    };

    var generate_events_scripts = function(data)
    {
        return new Promise(function(resolve, reject){
            db.collection("events").find({_id: db.ObjectID(data.appid)}).toArray(function(err,res){
                if(err) reject(Error(err));
                var scripts = [];
                if (res && res.length>0) {
                    for (var j = 0; j < res.length; j++) {
                        if(res[j].list && res[j].list.length>0)
                        {
                            for (var z = 0; z < res[j].list.length; z++) {
                                var eventCollName = "events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                                scripts.push('mongodump ' + data.dbstr + ' --collection ' + eventCollName + ' --out ' + data.my_folder);
                                if(plugins.isPluginEnabled('drill'))
                                {
                                    eventCollName = "drill_events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');		
                                    scripts.push('mongodump ' + data.dbstr_drill + ' --collection ' + eventCollName + ' --out ' + data.my_folder);
                                }
                            }
                        }
                    }
                }
                resolve(scripts);
            }
            );
        });
    };
    
    var generate_credentials_scripts  =function(data)
    {
        return new Promise(function(resolve, reject){
            db.collection("apps").findOne({_id: db.ObjectID(data.appid)},function(err, res){
                if(err) reject(Error(err));
                var cid = [];
                if(res && res.apn && res.apn.length>0)
                {
                    for(var i=0; i<res.apn.length; i++)
                    {
                        cid.push('ObjectId('+res.apn[i]._id+')');
                    }
                }
                
                if(res && res.gcm && res.gcm.length>0)
                {
                    for(var i=0; i<res.gcm.length; i++)
                    {
                        cid.push('ObjectId("'+res.gcm[i]._id+'")');
                    }
                }
               if(cid.length>0)
                resolve(['mongodump ' + data.dbstr + ' --collection credentials -q \'{ _id: {$in:['+cid.join()+']}") }\' --out ' + data.my_folder]);
               else
                resolve([]);
            });
        });
    }
    
    var create_export_scripts = function(data)
    {
        return new Promise(function(resolve, reject){
            var appid = data.appid;
            var my_folder = data.my_folder;
            
            var scripts = [];
        
            var data_obj = [];
            var in_list = [];
            var dbstr="";
            var dbstr0="";
            var countly_db_name=""
            var db_params = plugins.getDbConnectionParams('countly');
            for(var p in db_params){
                dbstr += " --"+p+" "+db_params[p];
                if(p!='db')
                {
                    dbstr0+=" --"+p+" "+db_params[p];
                }
                else
                {
                    countly_db_name = db_params[p];
                }
            }

            var dbstr_drill = "";
            db_params = plugins.getDbConnectionParams('countly_drill');
            for(var p in db_params){
                dbstr_drill += " --"+p+" "+db_params[p];
            }
            
            db.collection("apps").findOne({_id:db.ObjectID(appid)}, function(err, res){
                if (err || !res)
                    reject(Error("Invalid app id" ));
                else
                {
                    if(!res.redirect_url || res.redirect_url=="")
                    {
                        scripts.push('mongodump ' + dbstr + ' --collection apps -q \'{ _id: ObjectId("' + appid + '") }\' --out '+ my_folder);
                    }
                    else
                    {
                        //remove redirect field and add it after dump.
                        scripts.push('mongo '+countly_db_name+' ' + dbstr0 + ' --eval  \'db.apps.update({ _id: ObjectId("' + appid + '") }, { $unset: { redirect_url: 1 } })\'');
                        scripts.push('mongodump ' + dbstr + ' --collection apps -q \'{ _id: ObjectId("' + appid + '") }\' --out '+ my_folder);
                        scripts.push('mongo '+countly_db_name+' ' + dbstr0 + ' --eval  \'db.apps.update({ _id: ObjectId("' + appid + '") }, { $set: { redirect_url: "'+res.redirect_url+'" } })\'');
                    }
            
                    var appDocs = ['app_users','metric_changes','app_crashes','app_crashgroups','app_crashusers','app_viewdata','app_views','campaign_users','event_flows','timesofday'];
                    for (var j = 0; j <appDocs.length; j++) {
                        scripts.push('mongodump ' + dbstr + ' --collection ' + appDocs[j] + appid+' --out '+ my_folder);
                    }

                    scripts.push('mongodump ' + dbstr + ' --collection campaigndata -q \'{ a: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection campaigns -q \'{ app_id: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection graph_notes -q \'{ _id: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + '  --collection messages -q \'{ apps: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection cohortdata -q \'{ a: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection cohorts -q \'{ app_id: "' + appid + '"}\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection server_stats_data_points -q \'{ a: "' + appid + '"}\' --out '+ my_folder);
                    
                    var sameStructures = ["browser","carriers","cities","crashdata","density","device_details","devices","langs","sources","users","retention_daily","retention_weekly","retention_monthly"];
                    
                    for (var j = 0; j < sameStructures.length; j++) {
                        scripts.push('mongodump ' + dbstr + ' --collection ' + sameStructures[j] + ' -q \'{ _id: {$regex: "' + appid + '_.*" }}\' --out '+ my_folder);
                    }
                    
                    scripts.push('mongodump ' + dbstr + ' --collection max_online_counts -q \'{ _id: ObjectId(\"' + appid + '\") }\' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection events -q \'{ _id: ObjectId(\"' + appid + '\") }\' --out ' + my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection funnels -q \'{ app_id: \"' + appid + '\" }\' --out ' + my_folder);
      
                    if(plugins.isPluginEnabled('drill'))
                    {
                        //export drill
                        var drill_events = ["session","view","action","push_action","push_open","push_sent","crash"]
                            
                        for (var j=0; j<drill_events.length; j++)
                        { 
                            eventCollName = "drill_events" + crypto.createHash('sha1').update("[CLY]_"+drill_events[j] + appid).digest('hex');
                            scripts.push('mongodump ' + dbstr_drill + ' --collection ' + eventCollName + ' --out ' + my_folder);
                        }
                        
                        scripts.push('mongodump ' + dbstr_drill + ' --collection drill_bookmarks -q \'{ app_id: \"' + appid + '\" }\' --out '+ my_folder);
                        scripts.push('mongodump ' + dbstr_drill + ' --collection drill_meta'+appid+' --out '+ my_folder);
                    }
                    if(data.aditional_files)//export symbolication files
                    {
                        scripts.push('mongodump ' + dbstr + ' --collection app_crashsymbols' + appid+' --out '+ my_folder);
                        scripts.push('mongodump ' + dbstr + ' --collection symbolication_jobs -q \'{ app_id: \"' + appid + '\" }\' --out ' + my_folder);
                    }
                    
                    //events sctipts
                    generate_events_scripts({appid:appid,my_folder:my_folder,dbstr:dbstr,dbstr_drill:dbstr_drill},db)
                    .then(
                        function(result)
                        {
                            if(result && Array.isArray(result))
                                scripts = scripts.concat(result);
                                  
                            return generate_credentials_scripts({appid:appid,my_folder:my_folder,dbstr:dbstr,dbstr_drill:dbstr_drill});
                        })
                    .then(
                        function(result) {
                            if(result && Array.isArray(result))
                                scripts = scripts.concat(result);
                            return resolve(scripts);
                        },
                        function(error) {
                            reject(Error(error.message));
                        }
                    ).catch(err => {reject(err);});
                }
             });
        });
    };
    
    var copy_app_image = function(data)
    {
        return new Promise(function(resolve, reject){
            var imagepath = path.resolve(__dirname,'./../../../frontend/express/public/appimages/'+data.appid+".png");
            countlyFs.exists("appimages", imagepath, {id:data.appid+".png"}, function(err,exist){
                if(exist)
                {
                    countlyFs.getStream("appimages", imagepath, {id:data.appid+".png"}, function(err, stream){
                        if(err || !stream){  
                            }
                            else{
                                var wstream = fs.createWriteStream(data.image_folder+'/'+data.appid+'.png');
                                stream.pipe(wstream);
                                stream.on('end', () => {resolve("Icon copied: "+data.appid+'.png');});
                                stream.on('error',()=>{resolve();});
                            }
                    });
                }
                else
                {
                    resolve("Icon doesn't exist:"+data.appid+'.png');
                }
            });
        }); 
    }
    
    var pack_data = function(my_exportid,pack_path,target_path)
    {
        return new Promise(function(resolve, reject){
            update_progress(my_exportid,"packing","progress",0,"",true);
            if(target_path=='')
            {
                target_path = path.resolve(__dirname,"./../export/"+my_exportid+".tar.gz");
            }
            
            run_command("tar -C "+__dirname+" -zcvf "+target_path+" ./../export/"+my_exportid).then(
            function(result) {
                return resolve();
            }, 
            function(error) {
                return reject(Error(error.message));
            });
        });
    }
    
    var uploadFile  = function(myfile){
        return new Promise(function(resolve, reject){
            var var_name = myfile.name
            var tmp_path = myfile.path;
            if (myfile.type != "application/x-gzip" && myfile.type != "application/gzip") {
                fs.unlink(tmp_path, function () {});
                reject(Error("Invalid file format"));
            }           
            else {
                var target_path =path.resolve( __dirname,'../import/'+var_name);
                fs.rename(tmp_path,target_path,(err) => {
                    if (err)
                        reject(Error("Unable to copy file"));          
                    resolve(); 
                });
            }
        });
    };
    
    var import_app_icons = function(folder)
    {
        return new Promise(function(resolve, reject){
            folder = fix_my_path(folder);
            if(folder==false)
                reject(Error('Bad Archive'));
            folder = folder+'/countly_app_icons';
            if (!fs.existsSync(folder)) {
                resolve("There are no icons");
            }
            else
            {
                var myfiles = fs.readdirSync(folder);
                
                var objlist = [];
                for( var i=0; i<myfiles.length; i++)
                {
                    objlist.push({imagepath:path.resolve(__dirname,'./../../../frontend/express/public/appimages/'+myfiles[i]),source:folder+'/'+myfiles[i],id:myfiles[i]});
                }
                Promise.all(objlist.map(function(obj){
                        return new Promise(function(resolve, reject){
                            countlyFs.saveFile("appimages", obj.imagepath, obj.source,{id:obj.id}, function(err){
                                if(err) reject(err);
                                else
                                {
                                    resolve('Icon coppied:'+obj.id);
                                }
                            });
                        });
                    }))
                .then(
                    function(result)
                    {
                        resolve(result);
                    },
                    function(err)
                    {
                        reject(Error(err));
                    }
                
                );
                
                
            }
        });
    };
    
    var import_symbolication_files = function(folder)
    {
        return new Promise(function(resolve, reject){
            folder = fix_my_path(folder);
            if(folder==false)
                reject(Error('Bad Archive'));
            folder = folder+'/countly_symbolication_files';
            if (!fs.existsSync(folder)) {
                resolve("There are no symbolication  crash files");
            }
            else
            {
                var myapps = fs.readdirSync(folder);
                var objlist = [];
                for(var i=0; i<myapps.length; i++)
                {
                    var myfiles = fs.readdirSync(folder+'/'+myapps[i]);
                    for( var j=0; j<myfiles.length; j++)
                    {
                        objlist.push({imagepath:path.resolve(__dirname,'./../../crash_symbolication/crashsymbols/'+myapps[i]+'/'+myfiles[j]),source:folder+'/'+myapps[i]+'/'+myfiles[j],id:myapps[i]+'.'+myfiles[j]});
                    }
                }
                
                if(objlist.length==0){resolve();}
                else
                {
                    Promise.all(objlist.map(function(obj){
                        return new Promise(function(resolve, reject){
                            countlyFs.saveFile("crash_symbols", obj.imagepath, obj.source,{id:obj.id}, function(err){
                                if(err) reject(err);
                                else
                                {
                                    resolve('Crash file coppied:'+obj.id);
                                }
                            });
                        });
                    }))
                    .then(
                        function(result)
                        {
                            resolve(result);
                        },
                        function(err)
                        {
                            reject(Error(err));
                        }
                    
                    );
                }
            }
        });
    }
    var fix_my_path = function(path)
    {
        if (fs.existsSync(path)){
            var myfolder = fs.readdirSync(path);
            if(myfolder.length==1)
            {
                var mm = myfolder[0].split(".");
                if(mm.length==1)//is folder
                {
                    var sub_ok =fix_my_path(path+"/"+myfolder[0]);
                    if(sub_ok!=false)
                        return sub_ok;
                }
            }
            else
            {
                for(var i=0; i<myfolder.length; i++)
                {
                    if(myfolder[i].slice(-5)=='.bson')
                    {
                        return false;
                    }
                }
            }
            return path;
        }
        else
            return false;
    }
    
    var copy_sybolication_file = function(obj)
    {
        return new Promise(function(resolve, reject){
            var tmp_path = path.resolve( __dirname,'./../../crash_symbolication/crashsymbols/' + obj.appid + "/" + obj.symbolid + ".cly_symbol");
                                
            countlyFs.exists("crash_symbols", tmp_path, {id:obj.appid + "." + obj.symbolid + ".cly_symbol"}, function(err,exist){
            if(exist)
            {
                countlyFs.getStream("crash_symbols", tmp_path, {id:obj.appid + "." + obj.symbolid + ".cly_symbol"}, function(err, stream){
                    if(err || !stream){
                        reject();
                    }
                    else{
                        if (!fs.existsSync(obj.folder+'/'+obj.appid)) {
                            try {fs.mkdirSync(obj.folder+'/'+obj.appid, 0744);}catch(err){log_me(logpath,err.message,true);}
                        }
                        var wstream = fs.createWriteStream(obj.folder+'/'+obj.appid+'/'+ obj.symbolid + ".cly_symbol");
                        stream.pipe(wstream);
                        stream.on('end', () => {resolve("Symbolication file copied: "+obj.appid + "/" + obj.symbolid + ".cly_symbol");});
                        stream.on('error',()=>{reject();});
                    }
                });
            }
            else
            {
                resolve("File doesn't exist:"+obj.appid + "/" + obj.symbolid + ".cly_symbol");
            }
            });
        });
    };

    var copy_symbolication_files = function(data)
    {
        return new Promise(function(resolve, reject){
            //aditional_files:path.resolve(my_folder,'./countly_symbolication_files')
            db.collection("app_crashsymbols"+data.appid).find().toArray(function(err, res){
                if(err){ log.e(err); reject();}
                else 
                {
                    var symb_files = [];
                    for(var i=0; i<res.length; i++)
                    {
                        symb_files.push({folder:data.aditional_files,symbolid:res[i]._id,appid:data.appid});
                    }
                    if(symb_files.length>0)
                    {
                        Promise.all(symb_files.map(copy_sybolication_file)
                        ).then(
                            function(result)
                            {
                                resolve(result);
                            },
                            function(err)
                            {
                                reject(Error(err));
                            }
                        );
                    }
                    else
                    {
                        resolve();
                    } 
                }
            });
        
        });
    };


    var report_import = function(params,message,status,my_exportid)
    {
        if(status!='finished')
            status='failed';
        
        var imported_apps = [];
        var imported_ids = [];
        try{
            var data = fs.readFileSync(path.resolve(__dirname,"./../import/"+my_exportid+'.json'));
            mydata = JSON.parse(data);
            if(mydata && mydata['app_names'])
            {
                imported_apps=mydata['app_names'].split(',');
            }
            
             if(mydata && mydata['app_ids'])
            {
                imported_ids=mydata['app_ids'].split(',');
            }
        }
        catch (SyntaxError) {}  
                                
        var moredata = {"app_ids":imported_ids,"app_names":imported_apps,"exportid":my_exportid,reason:message};
        if(params && params.qstring && params.qstring.exportid)
        {
            moredata.using_token = true;
            moredata.token = params.req.headers["countly-token"];
            moredata.serverip = params.req.headers["x-real-ip"];
            moredata.host = params.req.headers.host;
             
            var r = request.post({url: 'http://'+moredata.serverip+'/i/datamigration/report_import?token='+params.req.headers["countly-token"]+"&exportid="+my_exportid+"&status="+status+"&message="+message, agentOptions: {rejectUnauthorized: false}}, function(err, res, body)
            {
                if(err){
                     plugins.dispatch("/systemlogs", {params:params, action:"import_"+status+"_response_failed", data:moredata});
                }
                else
                {
                    if(res.statusCode>=400 && res.statusCode<500)
                    {
                        var msg = res.statusMessage;
                        
                        if(res.body && res.body!='')
                        {
                            try {
                                msg = JSON.parse(res.body);
                                if(msg['result'])
                                    msg = msg['result'];
                            }
                            catch (SyntaxError) {}
                        }
                        plugins.dispatch("/systemlogs", {params:params, action:"import_"+status+"_response_failed", data:moredata});
                    }
                    else
                    {
                        plugins.dispatch("/systemlogs", {params:params, action:"import_"+status+"_response_ok", data:moredata});
                    }
                }
            
            }); 
        }
        else
        {
            plugins.dispatch("/systemlogs", {params:params, action:"import_"+status, data:moredata});
        }
    }

    var import_me = function(folder,logpath,my_import_id){
        return new Promise(function(resolve, reject){
    
            folder = fix_my_path(folder);
            if(folder==false)
                reject(Error('Bad Archive'));
            
            try{
                var data = fs.readFileSync(folder+'/info.json');
                fs.writeFileSync(path.resolve(__dirname,'./../import/'+my_import_id+'.json'),data);  
            }
            catch (SyntaxError) {}  
            
            var myfiles = fs.readdirSync(folder);
            var myscripts = [];
            
            var constr = create_con_strings();
            var dbstr = constr.dbstr;
            var dbstr_drill  = constr.dbstr_drill;

            for(var i=0; i<myfiles.length; i++)
            {
                if(myfiles[i]!='.' && myfiles[i]!='..' && fs.lstatSync(path.resolve(folder,'./'+myfiles[i])).isDirectory() && myfiles[i]!='countly_app_icons')//folder for each app
                {
                    var subdirectory = fs.readdirSync(path.resolve(folder,'./'+myfiles[i]));
                    for(var j=0; j<subdirectory.length; j++)
                    {
                        if(constr.dbstr.indexOf('--db '+subdirectory[j])>-1)
                        {
                            myscripts.push('mongorestore '+constr.dbstr+' --dir '+folder+'/'+myfiles[i]+'/'+subdirectory[j]);
                        }
                        else if(constr.dbstr_drill.indexOf('--db '+subdirectory[j])>-1)
                        {
                            myscripts.push('mongorestore '+constr.dbstr_drill+' --dir '+folder+'/'+myfiles[i]+'/'+subdirectory[j]);
                        }
                    }
                }
            }
            if(myscripts.length>0)
            {
                log_me(logpath,'Scripts generated sucessfully',false);
                my_logpath = logpath;
                Promise.each(myscripts, run_command).then(
                    function(result) {resolve();}, 
                    function(err) {
                        reject(Error(err.message));
                    });
            }
            else
                reject(Error('There is no data for insert'));
        });
    };
    
    this.send_export = function(my_exportid,passed_db)
    {
        if(passed_db)
            db=passed_db;
                
        db.collection("data_migrations").findOne({_id:my_exportid},function(err, res){
            if(err){  log.e(err.message);}
            else 
            {
                if( res && res.stopped==false)
                {
                    update_progress(my_exportid,"validating_files","progress",0,"",true);
                    var dir = path.resolve(__dirname,'./../export/'+my_exportid+'.tar.gz');
                    if(res.export_path && res.export_path!='')
                    {
                        dir = res.export_path;
                    }
                    if (!fs.existsSync(dir)) {
                        update_progress(my_exportid,"validating_files","failed",0,"Export file missing",true,{});
                        return;
                    }
        
                    update_progress(my_exportid,"sending","progress",0,"",true);
                    var r = request.post({url: res.server_address+'/i/datamigration/import?exportid='+my_exportid,headers: {"countly-token": res.server_token}}, requestCallback);
                    var form = r.form();
                    form.append("import_file", fs.createReadStream(dir));
                    function requestCallback(err, res, body) {
                        if(err)
                            update_progress(my_exportid,"sending","failed",0,err.message,true); 
                        else
                        {
                            var msg = res.statusMessage;
                            if(res.body && res.body!='')
                            {
                                try 
                                {
                                    msg = JSON.parse(res.body);
                                    if(msg['result'])
                                        msg = msg['result'];
                                }
                                catch (SyntaxError) {}
                            }
                                    
                            if(res.statusCode>=400 && res.statusCode<500)
                            {
                                if(msg=="Invalid path")
                                {
                                    msg = "Invalid path. You have reached countly server, but it seems like data migration plugin is not enabled on it."
                                }
                                update_progress(my_exportid,"sending","failed",0,msg,true,{});       
                            }
                            else if(res.statusCode==200 && msg=="Importing process started.")
                            {
                                update_progress(my_exportid,"importing","progress",0,msg,true);
                            }
                            else
                            {
                                msg="Sending failed. Target server address is not valid";
                                update_progress(my_exportid,"sending","failed",0,msg,true,{});
                            }
                        }
                    }           
                }             
            }
        });  
    }
    
    this.update_progress = function(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams)
    {
       update_progress(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams); 
    }
    this.export_data = function(apps,my_params,passed_db,passed_log)
    {
        return new Promise(function(resolve, reject){
            if(passed_db)
                db=passed_db;
            if(my_params)
                params = my_params;
            if(passed_log)
                log = passed_log;
            
            
            apps = apps.sort();
            var app_names = [];
            //clear out duplicates
            for(var i=1; i<apps.lenght-1; i++)
            {
                if(apps[i-1]==apps[i]){apps.splice(i,1); i--;}
            }
            
            check_ids(apps).then(
                function(result){
                    if(result && Array.isArray(result))
                    {
                        app_names = result;
                    }
                    return create_and_validate_export_id(apps);
                }
            ).then(
                function(result)
                {
                    var my_folder=path.resolve(__dirname,'./../export/'+exportid);
                    if (!fs.existsSync(my_folder)) {
                        try {fs.mkdirSync(my_folder, 0744);}catch(err){log.e(err.message);}
                    }
            
                    var created = Date.now();
                    var myreq = JSON.stringify({headers:params.req.headers});
              
                    var logname ='dm-export_'+ exportid+'.log';
                    my_logpath = path.resolve(__dirname,'./../../../log/'+logname);
                    if (fs.existsSync(my_logpath)) {
                        try {fs.unlinkSync(path.resolve(__dirname ,'./../../../log/'+logname))}catch(err){log.e(err.message);}
                    }
                    
                    
                    var filepath = "";
                    if(params.qstring.target_path && params.qstring.target_path!="")
                    {
                        filepath = params.qstring.target_path;
                        filepath = path.resolve(params.qstring.target_path,'./'+exportid+'.tar.gz');
                    }
                    update_progress(exportid,"exporting","progress",0,"",true,{created:created,stopped:false,only_export:params.qstring.only_export,server_address:params.qstring.server_address,server_token:params.qstring.server_token,redirect_traffic:params.qstring.redirect_traffic,aditional_files:params.qstring.aditional_files, apps: apps,app_names:app_names,userid:params.member._id,email:params.member.email,myreq:myreq,log:logname,export_path:filepath});
                
                    var scriptobj = [];
                    
                    //creates dir for app icons
                    var image_folder = path.resolve(my_folder,'./countly_app_icons');
                    if (!fs.existsSync(image_folder)) {
                        try {fs.mkdirSync(image_folder, 0744);}catch(err){log.e(err.message);}
                    }
                                
                    for(var i=0; i<apps.length; i++)
                    {
                        var subfolder = path.resolve(my_folder,'./'+apps[i]);
                        scriptobj.push({appid:apps[i],my_folder:subfolder,image_folder:image_folder,aditional_files:path.resolve(my_folder,'./countly_symbolication_files')});
                        if (!fs.existsSync(subfolder)) {
                            try {fs.mkdirSync(subfolder, 0744);}catch(err){log.e(err.message);}
                        }
                    }
                    
                    Promise.all(scriptobj.map(create_export_scripts))
                    .then(function(result){
                        var scripts = [];
                        if(result && Array.isArray(result))
                        {
                            for(var i=0; i<result.length; i++)
                            {
                                if(Array.isArray(result[i]) && result[i].length>0)
                                    scripts = scripts.concat(result[i]);
                            }
                        }
                    
                        if(scripts && scripts.length>0)
                        {
                            log_me(my_logpath,"Export scripts created",false);
                            exp_count = scripts.length;
                            resolve(exportid);
                            Promise.each(scripts, run_command).then(
                            function(result) {
                                log_me(my_logpath,"Files generated sucessfully",false);
                                //create info file
                                try
                                {
                                    fs.writeFileSync(path.resolve(__dirname,'./../export/'+exportid+'/info.json'),'{"id":"'+exportid+'","app_names":"'+app_names.join()+'","app_ids":"'+apps.join()+'"}',{'flag': 'a'}); 
                                } 
                                catch(error){}
                                
                                //creates dir for app icons
                                var subfolder = path.resolve(my_folder,'./countly_app_icons');
                                if (!fs.existsSync(subfolder)) {
                                    try {fs.mkdirSync(subfolder, 0744);}catch(err){log.e(err.message);}
                                }
                                
                                Promise.all(scriptobj.map(copy_app_image))
                                .then(function(result){
                                    log_me(my_logpath,result,false);
                                    if(params.qstring.aditional_files)
                                    {
                                        //creates folder for symbolication files
                                        var subfolder = path.resolve(my_folder,'./countly_symbolication_files');
                                        if (!fs.existsSync(subfolder)) {
                                            try {fs.mkdirSync(subfolder, 0744);}catch(err){log.e(err.message);}
                                        }
                                        return Promise.all(scriptobj.map(copy_symbolication_files));
                                    }
                                    else
                                        return Promise.resolve();
                                })
                                .then( function(result){ 
                                    if(Array.isArray(result))
                                    {
                                        log_me(my_logpath,result,false);
                                    }
                                    return pack_data(exportid,path.resolve(__dirname,'./../export/'+exportid),filepath)
                                })
                                .then
                                 (
                                    function(result){
                                        log_me(my_logpath,"Files packed",false);
                                        if(params.qstring.only_export && params.qstring.only_export==true)
                                        {
                                            update_progress(exportid,"packing","progress",100,"",true,{},params);
                                            self.clean_up_data('export',exportid,false).then(
                                                function(result){
                                                    update_progress(exportid,"exporting","finished",0,"",true,{},params);
                                                },
                                                function(err)
                                                {
                                                    update_progress(exportid,"exporting","finished",0,"Export completed. Unable to delete files",true,{},params);
                                                }
                                            );
                                        }
                                        else
                                        {
                                            self.send_export(exportid);
                                        }
                                    },
                                    function(err)
                                    {
                                        update_progress(exportid,"packing","failed",0,err.message,true,{},params);
                                    }
                                 );
                            }, 
                            function(err) {
                                update_progress(exportid,"exporting","failed",0,err.message,true,{},params);
                            });
                        
                        }
                        else
                        {
                            reject(Error('Failed to generate export scripts'));
                        }
                    
                    },
                    function(error)
                    {
                        update_progress(exportid,"exporting","failed",0,error.message,true,{},params);
                        reject(Error('Failed to generate export scripts'));
                    });
                },
                function(error)
                {
                    return reject(error);
                }
            );
        
        });
    };
    
    this.import_data = function(my_file,my_params,logpath,passed_log)
    {
        my_logpath = logpath;
        params = my_params;
        if(passed_log)
            log = passed_log;
        
        log_me(my_logpath,'Starting import process',false);
        var dir =path.resolve( __dirname,'./../import');
        
        var imported_apps = [];
        if (!fs.existsSync(dir)) {
            try {fs.mkdirSync(dir, 0744);}catch(err){log_me(logpath,err.message,true);}
        }
                
        var foldername = my_file.name.split('.');
        try {fs.mkdirSync(path.resolve(__dirname,'./../import/'+foldername[0]), 0744);}catch(err){log_me(logpath,err.message,true);}
        
        uploadFile(my_file)
        .then(function(){
            log_me(logpath,'File uploaded sucessfully',false);
            return run_command("tar xvzf "+path.resolve(__dirname,'./../import/'+my_file.name)+" -C "+path.resolve(__dirname,'../import/'+foldername[0]+'/'),false);}) //unpack file
        .then(
            function(){
                log_me(logpath,'File unarchived sucessfully',false);
                return import_me(path.resolve(__dirname,'./../import/'+foldername[0]),logpath,foldername[0]);//create and run db scripts
            })
        .then(
            function(){
                log_me(logpath,'Data imported',false);
                return import_app_icons(path.resolve(__dirname,'./../import/'+foldername[0])); //copy icons
            }
        )
        .then(function(result)
        {
            if(Array.isArray(result))
            {
                log_me(logpath,result,false);
            }
            log_me(logpath,'Exported icons imported',false);
            return import_symbolication_files(path.resolve(__dirname,'./../import/'+foldername[0])); //copy symbolication files
        })
        .then(function(result)
        {
            
            if(Array.isArray(result))
            {
                log_me(logpath,result,false);
            }
            log_me(logpath,'Symbolication folder imported',false);
            return self.clean_up_data('import',foldername[0],true); //delete files
        })
        .then(function(result) {
            log_me(logpath,'Cleanup sucessfull',false);
            report_import(params,"Import successful","finished",foldername[0]);
            }, 
            function(err) { 
                log_me(logpath,err.message,true);
                report_import(params,err.message,"failed",foldername[0]);
            }
        ).catch(err => {report_import(params,err.message,"failed",foldername[0]);});

    };

   
}
