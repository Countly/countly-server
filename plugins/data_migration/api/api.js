var plugin = {},
	common = require('../../../api/utils/common.js'),
    countlyFs = require('../../../api/utils/countlyFs.js'),
    log = common.log('datamigration:api'),
    plugins = require('../../pluginManager.js');
const os=require('os'); //hostname
const fs = require('fs');
const fse = require('fs-extra');
var path = require('path');
var cp = require('child_process'); //call process
var spawn = cp.spawn; //for calling comannd line


var crypto = require('crypto');
var Promise = require("bluebird");

var authorize = require('../../../api/utils/authorizer.js'); //for token
var exp_count=0;
var exp_prog=0;
var exportid="";
var app_names=[];

var myparams="";
var dbstr="";
var dbstr_drill="";
const request = require('request');
var my_logpath='';

//creates connection strings based on config files
function create_con_strings()
{
    dbstr="";
    var db_params = plugins.getDbConnectionParams('countly');
    for(var p in db_params){
        dbstr += " --"+p+" "+db_params[p];
    }

    dbstr_drill = "";
    db_params = plugins.getDbConnectionParams('countly_drill');
    for(var p in db_params){
        dbstr_drill += " --"+p+" "+db_params[p];
    }
    return {dbstr:dbstr,dbstr_drill:dbstr_drill};
}

//clean up export folder
function delete_all_exports()
{
    return new Promise(function(resolve, reject){
        if(fs.existsSync(__dirname + '/../export'))
        {
            fse.remove(__dirname + '/../export', err => {
                if (err) {reject(Error('Unable to remove directory')); } 
                else
                    resolve();
            });
        }
    });
}

//Clean up data about one export. (Or imprt) 
//@folder - folder name  - export or import
//@exportid  - Export id
function clean_up_data(folder,exportid,remove_archive)
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
                common.db.collection("data_migrations").findOne({_id:exportid},function(err, res){
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

function uploadFile(myfile){
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
}

function fix_my_path(path)
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

function update_progress(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams)
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
    common.db.collection("data_migrations").update(updatea,{$set:set_data}, {upsert:true},function(err, res){
        if(err){log.e("Unable to update export status in db");}
        //if(res && res.result && res.result.n>0)
        if((status=='failed' || status=='finished'))
        {
             common.db.collection("data_migrations").findOne({_id:my_exportid},function(err, res){
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

function run_command(my_command,update=true)
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
            return reject(Error('Error.For more information view log'+my_logpath));
            
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
                return reject(Error("Error. For more information view log: "+my_logpath));
            }
            
        })
    });
}

function generate_events_scripts(data)
{
    return new Promise(function(resolve, reject){
        common.db.collection("events").find({_id: common.db.ObjectID(data.appid)}).toArray(function(err,res){
            if(err) reject(Error(err));
            var scripts = [];
            if (res && res.length>0) {
                for (var j = 0; j < res.length; j++) {
                    if(res[j].list && res[j].list.length>0)
                    {
                        for (var z = 0; z < res[j].list.length; z++) {
                            var eventCollName = "events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                            scripts.push('mongodump ' + data.dbstr + ' --collection ' + eventCollName + ' --out ' + data.my_folder);
                            eventCollName = "drill_events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');		
                            scripts.push('mongodump ' + data.dbstr_drill + ' --collection ' + eventCollName + ' --out ' + data.my_folder);
                        }
                    }
                }
            }
            resolve(scripts);
        }
        );
    });
}

function generate_credentials_scripts(data)
{
    return new Promise(function(resolve, reject){
        common.db.collection("apps").findOne({_id: common.db.ObjectID(data.appid)},function(err, res){
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


function import_app_icons(folder)
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
}

function import_symbolication_files(folder)
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

function copy_sybolication_file(obj)
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
}

function copy_symbolication_files(data)
{
    return new Promise(function(resolve, reject){
        //aditional_files:path.resolve(my_folder,'./countly_symbolication_files')
        common.db.collection("app_crashsymbols"+data.appid).find().toArray(function(err, res){
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

}
function copy_app_image(data)
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

function create_export_scripts(data)
{
    return new Promise(function(resolve, reject){
        var appid = data.appid;
        var my_folder = data.my_folder;
        
        create_con_strings();
        var scripts = [];
    
        var data_obj = [];
        var in_list = [];
        dbstr="";
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

        dbstr_drill = "";
        db_params = plugins.getDbConnectionParams('countly_drill');
        for(var p in db_params){
            dbstr_drill += " --"+p+" "+db_params[p];
        }
        
         common.db.collection("apps").findOne({_id:common.db.ObjectID(appid)}, function(err, res){
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
        
                var appDocs = ['app_users','metric_changes','app_crashes','app_crashgroups','app_crashusers','app_viewdata','app_views','campaign_users','event_flows']
                    
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
  
                //export drill
                var drill_events = ["session","view","action","push_action","push_open","push_sent","crash"]
                    
                for (var j=0; j<drill_events.length; j++)
                { 
                    eventCollName = "drill_events" + crypto.createHash('sha1').update("[CLY]_"+drill_events[j] + appid).digest('hex');
                    scripts.push('mongodump ' + dbstr_drill + ' --collection ' + eventCollName + ' --out ' + my_folder);
                }
                
                scripts.push('mongodump ' + dbstr_drill + ' --collection drill_bookmarks -q \'{ app_id: \"' + appid + '\" }\' --out '+ my_folder);
                scripts.push('mongodump ' + dbstr_drill + ' --collection drill_meta'+appid+' --out '+ my_folder);

                if(data.aditional_files)//export symbolication files
                {
                    scripts.push('mongodump ' + dbstr + ' --collection app_crashsymbols' + appid+' --out '+ my_folder);
                    scripts.push('mongodump ' + dbstr + ' --collection symbolication_jobs -q \'{ app_id: \"' + appid + '\" }\' --out ' + my_folder);
                }
                
                //events sctipts
                generate_events_scripts({appid:appid,my_folder:my_folder,dbstr:dbstr,dbstr_drill:dbstr_drill})
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
}


//packing exported data
function pack_data(my_exportid,pack_path,target_path)
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

//sending exported data
function send_export(my_exportid)
{
    common.db.collection("data_migrations").findOne({_id:my_exportid},function(err, res){
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

function log_me(logpath,message,is_error)
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


function import_process(my_file,params,logpath)
{
    log_me(logpath,'Starting import process',false);
    var dir =path.resolve( __dirname,'./../import');
    
    var imported_apps = [];
    if (!fs.existsSync(dir)) {
        try {fs.mkdirSync(dir, 0744);}catch(err){log_me(logpath,err.message,true);}
    }
            
    var foldername = my_file.name.split('.');
    try {fs.mkdirSync(path.resolve(__dirname,'./../import/'+foldername[0]), 0744);}catch(err){log_me(logpath,err.message,true);}
    
    my_logpath = logpath;
    uploadFile(my_file)//upload file
    .then(function(){
        log_me(logpath,'File uploaded sucessfully',false);
        return run_command("tar xvzf "+path.resolve(__dirname,'./../import/'+my_file.name)+" -C "+path.resolve(__dirname,'../import/'+foldername[0]+'/'),false);}) //unpack file
    .then(
        function(){
            log_me(logpath,'File unarchived sucessfully',false);
            return import_data(path.resolve(__dirname,'./../import/'+foldername[0]),logpath,foldername[0]);//create and run db scripts
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
        return clean_up_data('import',foldername[0],true); //delete files
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
}

function import_data(folder,logpath,my_import_id)
{
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
                my_logpath =='';

                reject(Error(err.message));
            });
    }
    else
            reject(Error('There is no data for insert'));
    });
}


function report_import(params,message,status,my_exportid)
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
         
        var r = request.post({url: 'http://'+moredata.serverip+'/i/datamigration/report_import?token='+params.req.headers["countly-token"]+'&exportid='+my_exportid+"&status="+status+"&message="+message, agentOptions: {rejectUnauthorized: false}}, function(err, res, body)
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
function check_ids(apps)
{
    return new Promise(function(resolve, reject){
    
        bad_ids=[];
        var object_array = [];
        for(var i=0; i<apps.length; i++)
        {
            try
            {
                object_array.push(common.db.ObjectID(apps[i]));
            }
            catch(err)
            {
                 bad_ids.push(apps[i]);
            }
        }
        
        if(bad_ids.length>0)
           reject("Given app id is/are not valid:"+bad_ids.join());  
           
        common.db.collection("apps").find({_id: { $in: object_array }}).toArray(function(err, res){
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
                    reject("You don't have any apps with given ids:"+bad_ids.join()); 
                else
                    resolve();
            }
        });
    });
}

function apply_redirect_to_apps(apps,params,my_redirect_url,userid,email)
{
    return new Promise(function(resolve, reject){
        if(!my_redirect_url || my_redirect_url=="")
        {
            resolve();
        }
        else
        {
            var object_array = [];
            for (var i=0; i<apps.length; i++)
            {
                object_array.push(common.db.ObjectID(apps[i]));
            }
           
           common.db.collection("apps").update({_id:{$in:object_array}},{$set:{redirect_url:my_redirect_url}}, {upsert:true,multi:true},function(err, res){
                if(err){ resolve(err);}
                else
                {
                    plugins.dispatch("/systemlogs", {params:{req:JSON.parse(params)},user:{_id:userid,email:email}, action:"app_redirected", data:{app_id:apps,redirect_url:my_redirect_url}});
                }
                        resolve();
                    });   
            
            
        }
    });
}

function create_and_validate_export_id(apps)
{
    return new Promise(function(resolve, reject){
        //exportid - defined at the top of file
        exportid = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
    
        common.db.collection("data_migrations").findOne({_id:exportid},function(err, res){
            if(err){  common.returnOutput(ob.params,err.message);}
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
                            reject('You have valid export failed in sending state');
                        else
                            resolve();
                    }
                    else if(res.status=='finished' && res.step == "exporting" && havefile)
                    {
                        reject("You have already exported data.");
                    }
                    else if( res.stopped==false && res.status!='finished' && res.status!='failed')
                    {
                        reject('Already running exporting process');
                    }
                    else
                    {
                        clean_up_data('export',exportid,true).then(
                            function(res){resolve();},
                            function(err){reject(err);}
                        );  
                    }
                }
                else
                {
                    clean_up_data('export',exportid,true).then(
                        function(res){resolve();},
                        function(err){reject(err);}
                    );  
                }
            }
        });        
    });       
}

(function (plugin) { 

    //report import status from remote server
    plugins.register("/i/datamigration/report_import", function(ob){
        var params = ob.params;
        
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        
        if(params.qstring)
        {
            if(!params.qstring.exportid)
            {
                 common.returnMessage(params, 404, 'Missing parameter "exportid"');
                 return;
            }
            if(!params.qstring.token)
            {
                 common.returnMessage(params, 404, 'Missing parameter "token"');
                 return;
            }
           
            common.db.collection("data_migrations").findOne({_id:params.qstring.exportid,server_token:params.qstring.token}, function(err, res){
                if (err)
                    common.returnMessage(params,404, err);  
                else
                {
                    if(res)
                    {
                        if(params.qstring.status && params.qstring.status!="")
                        {
                            if(params.qstring.status=='finished')
                            {
                                update_progress(params.qstring.exportid,"importing","finished",0,"",true,{},params);
                                if(res.server_address && res.server_address.length>0)
                                {
                                    //remove trailing slash
                                    while(res.server_address.length>0 && res.server_address[res.server_address.length-1]=='/')
                                    {
                                        res.server_address = res.server_address.substring(0, res.server_address.length-1);
                                    }
                                    apply_redirect_to_apps(res.apps,res.myreq,res.server_address,res.userid,res.email).then
                                    (
                                        function(result){},
                                        function(err){ log.e(err.message);}
                                    );  
                                }
                                common.returnMessage(ob.params,200,"ok");      
                            }
                            else
                            {
                                update_progress(params.qstring.exportid,"importing",params.qstring.status,0,params.qstring.message,true,{},params);
                            }
                        }
                        else
                        {
                            common.returnMessage(ob.params,404,"Status missing");
                        }   
                    }
                    else
                    {
                        common.returnMessage(ob.params,404,"Export not found");
                    }
                }
            });  
        }
        return true;
    });
    
    //Import data
    plugins.register("/i/datamigration/import", function(ob){
        //exportid
        //my hash key
        var params = ob.params;
        //if we have import key or validated as user

        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
       
        validate(params, function(){
            if(params.qstring.test_con)
            {
                common.returnMessage(params, 200, "valid");
                return;
            }
            
            if(params.files && params.files['import_file'])
            {
                var foldername = params.files['import_file'].name.split('.');
                if(params.qstring.exportid && params.qstring.exportid=='')
                {
                    foldername[0] = params.qstring.exportid;
                }

                if(fs.existsSync(__dirname+"/../import/"+foldername[0]+".tar.gz") || fs.existsSync(__dirname+"/../import/"+foldername[0]))
                {
                    common.returnMessage(params, 404, 'There is ongoing import process on target server with same apps. Clear out data on target server to start new import process.');
                    return;
                }   
                var logpath = path.resolve(__dirname,'../../../log/dm-import_'+foldername[0]+'.log');  
                common.returnMessage(params, 200, "Importing process started.");  
                import_process(params.files['import_file'],params,logpath);
            } 
            else
            {
                common.returnMessage(params, 404, "Import file missing");
            }
        });
        return true;
    });
    
    plugins.register("/i/datamigration/delete_all", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            delete_all_exports()
            .then(function (result)
            {
                if(fs.existsSync(path.resolve(__dirname,'./../import')))
                {
                    fse.remove(path.resolve(__dirname,'./../import'), err => {
                        common.returnMessage(ob.params,200,"ok"); 
                    });
                }
                else
                    common.returnMessage(ob.params,200,"ok"); 
            },
            function(err)
            {
                common.returnMessage(ob.params,404,err.message);
            });
        });
        return true;
    });
    
    
   plugins.register("/i/datamigration/delete_export", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            if(params.qstring.exportid)
            {
                common.db.collection("data_migrations").findOne({_id:params.qstring.exportid}, function(err, res){
                    if (err)
                       common.returnMessage(params,404, err);  
                    else
                    {
                        if(res)
                        {
                            clean_up_data('export',params.qstring.exportid,true).then
                            (function (result)
                            {
                                if (fs.existsSync(path.resolve(__dirname ,'./../../../log/'+res.log)))
                                {
                                    try
                                    {
                                        fs.unlinkSync(path.resolve(__dirname ,'./../../../log/'+res.log))
                                    }
                                    catch(err)
                                    { 
                                        common.returnMessage(ob.params,401,"Unable to delete log file"); return;
                                    }  
                                }
                                     common.db.collection("data_migrations").remove({_id:params.qstring.exportid}, function(err, res){
                                        if (err)
                                            common.returnMessage(params,404, err); 
                                        else
                                            common.returnMessage(ob.params,200,"ok");
                                     });
                              
                            },
                            function(err)
                            {
                                common.returnMessage(ob.params,404,err.message);
                            });
                        }
                        else
                        {
                            common.returnMessage(ob.params,404,"Invalid export ID");
                        }
                    }
                });    
            }
            else
            {
                common.returnMessage(ob.params,404,'Missing parameter "exportid"');
            }
        });
        return true;
    });
    
    
     plugins.register("/i/datamigration/delete_import", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            if(params.qstring.exportid && params.qstring.exportid!='')
            {
                clean_up_data('import',params.qstring.exportid,true).then
                (function (result)
                {
                    //delete log file
                    if (fs.existsSync(path.resolve(__dirname ,'./../../../log/dm-import_'+params.qstring.exportid+'.log')))
                    {
                        try
                        {
                            fs.unlinkSync(path.resolve(__dirname ,'./../../../log/dm-import_'+params.qstring.exportid+'.log'))
                        }
                        catch(err){}  
                    }
                    //delete info file
                    try{fs.unlinkSync(path.resolve(__dirname,'./../import/'+params.qstring.exportid+'.json'));}
                    catch(err){}
       
                    common.returnMessage(ob.params,200,"ok");
                },
                function(err)
                {
                    common.returnMessage(ob.params,404,err.message);
                });
            }
            else
            {
                common.returnMessage(ob.params,404,'Missing parameter "exportid"');
            }
        });
        return true;
    });
    
   plugins.register("/i/datamigration/stop_export", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            if(params.qstring.exportid)
            {
                common.db.collection("data_migrations").findOne({_id:params.qstring.exportid}, function(err, res){
                    if (err)
                       common.returnMessage(params,404, err);  
                    else
                    {
                        if(res)
                        {
                            if(res.status=='finished')
                            {
                               common.returnMessage(ob.params,404,'Export already finished'); 
                            }
                            else if(res.status=='failed')
                            {
                               common.returnMessage(ob.params,404,'Export already failed'); 
                            }
                            else 
                            {
                                common.db.collection("data_migrations").update({_id:params.qstring.exportid},{$set:{stopped:true}}, {upsert:true},function(err, res){
                                    if(err){log.e("Unable to update export status in db");}
                                });   
                                
                                if(res.step == 'packing' || res.step == 'exporting')
                                {
                                    common.returnMessage(ob.params,200,"Export process stopped");
                                }
                                else
                                {
                                    common.returnMessage(ob.params,200,"Data has already been sent");
                                }
                            }
                            return true;
                        
                        }
                        else
                        {
                            common.returnMessage(ob.params,404,"Invalid export ID");
                        }
                    }
                });    
            }
            else
            {
                common.returnMessage(ob.params,404,'Missing parameter "exportid"');
            }
        });
        return true;
    });
    
    //gets list of exports
    plugins.register("/o/datamigration/getmyexports", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('/o/datamigration/getmyexports Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            common.db.collection("data_migrations").find().sort({ts:-1}).toArray(function(err, res){
                if(err)
                    common.returnMessage(ob.params,404,err.message);
                else 
                {
                    if(res)
                    {   
                        if(res.length==0)
                        {
                            common.returnMessage(params,200, "You don't have any exports"); 
                            return true;
                        }
                        for(var i=0; i<res.length; i++)
                        {
                            var dir =path.resolve( __dirname,'./../export/'+res[i]._id+'.tar.gz');
                            if(res[i].export_path && res[i].export_path!='')
                                dir = res[i].export_path;
      
                            if (fs.existsSync(dir))
                                res[i].can_download=true;
                            else
                                res[i].can_download=false;
                                
                            if (fs.existsSync(path.resolve(__dirname,'./../export/'+res[i]._id)))
                                res[i].have_folder=true;
                            else
                                res[i].have_folder=false;
                                
                            if (!fs.existsSync(path.resolve(__dirname,'./../../../log/'+res[i].log)))
                                res[i].log="";
                        }  
                        common.returnMessage(ob.params,200,res);
                    } 
                    else
                    {
                            common.returnMessage(params,404, "You don't have any exports"); 
                    }
                }
            }); 
        });
        return true;
    });
    
    
    plugins.register("/o/datamigration/getmyimports", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('/o/datamigration/getmyimports Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            var ret_arr = {};
            var have_any=false;
            
            if(fs.existsSync(path.resolve(__dirname,"./../import")))
            {
                var myfiles = fs.readdirSync(path.resolve(__dirname,"./../import"));
                for(var i=0; i<myfiles.length; i++)
                {
                    var filename = myfiles[i].split('.');
                    if(!ret_arr[filename[0]])
                    {
                        ret_arr[filename[0]] = {type:'',log:'',last_update:""};
                        have_any = true;                            
                    }
                        
                    if(filename.length>0 && filename[1]=='tar')
                        ret_arr[filename[0]]['type']='archive';
                    else if(filename.length>0 && filename[1]=='json') 
                    {
                        try{
                            var data = fs.readFileSync(path.resolve(__dirname,"./../import/"+myfiles[i]));
                            mydata = JSON.parse(data);
                            if(mydata && mydata['app_names'])
                            {
                                ret_arr[filename[0]]['app_list']=mydata['app_names'];
                            }
                        }
                        catch (SyntaxError) {}  
                    }
                    else
                        ret_arr[filename[0]]['type']='folder';  
                }
            }

            if(fs.existsSync(path.resolve(__dirname,"../../../log")))
            {
                var myfiles = fs.readdirSync(path.resolve(__dirname,"../../../log"));
                for(var i=0; i<myfiles.length; i++)
                {
                    var filename = myfiles[i].split('_');
                    if( filename[0] =='dm-import' && filename.length>0 )
                    {
                        var myid = myfiles[i].substr(10).split('.');
                        if(myid[0] && ret_arr[myid[0]]!=null)
                        {
                            ret_arr[myid[0]]['log']=myfiles[i];
                        }
                        else
                        {
                            ret_arr[myid[0]] = {type:'',log:myfiles[i],last_update:""};
                            have_any = true; 
                        }
                        
                        try
                        {
                            var stats = fs.statSync(path.resolve(__dirname,"../../../log/"+myfiles[i]))
                            ret_arr[myid[0]]['last_update'] = stats['atime'];
                        }
                        catch(error)
                        {
                        
                        }
                    }
                    
                }
            }
            if(have_any)
            {
                common.returnMessage(ob.params,200,ret_arr);
            }
            else
            {
                common.returnMessage(ob.params,200,"You don't have any imports");
            }
        });
        return true;
    });
    
    //create import token
    //@params.ttl = time to live in minutes
    plugins.register("/o/datamigration/createimporttoken", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        
        validate(params, function(){
            var ttl, multi;
            if(params.qstring.ttl)//passed in minutes
                ttl = parseInt(params.qstring.ttl)*60;
            else
                ttl = 86400;//1 day
            if(params.qstring.multi==false)
                multi = false;
            else
                multi = true;
            
            ob.validateUserForDataReadAPI(params, function(){
                authorize.save({endpoint:['/i/datamigration/import'],db:common.db, ttl:ttl, multi:multi, owner:params.member._id+"", app:params.app_id+"", callback:function(err, token){
                    if(err){
                        log.e(err);
                        common.returnMessage(params, 404, 'Unable to create token. Data base error:'+err);
                    }
                    else{
                        common.returnMessage(params, 200, token);
                    }
                }});
            });
        }); 
        return true;        
    });
    
    
    //Get status of export
    //@params.exportid  - Export ID
    plugins.register("/o/datamigration/getstatus", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('/o/datamigration/getstatus Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            if(typeof params.qstring.exportid !== "undefined")
            {
                common.db.collection("data_migrations").findOne({_id:params.qstring.exportid},function(err, res){
                    if(err){  common.returnOutput(ob.params,err.message);}
                    else 
                    {
                        if(res)
                            common.returnMessage(params, 200, res);
                        else
                            common.returnMessage(params,404,'Invalid export ID');
                    }
                });
            }
            else
                common.returnOutput(ob.params,'exportid missing');
        });
        
        return true;
    });
    
    
    //Get configuration. Default export path for.
    plugins.register("/o/datamigration/get_config", function(ob){
        var params = ob.params;
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('/o/datamigration/getstatus Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            common.returnMessage(params, 200, {def_path:path.resolve(__dirname,'./../export')});            
        });
        
        return true;
    });
	
    //Export data
    //@only_export  - 1(only export data), 0 - export and send to remote server
    //@apps - app id's separated with ','
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    plugins.register("/i/datamigration/export", function(ob){
        var params = ob.params;
        
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            myparams = params;
            var dir = __dirname + '/../export';
            if (!fs.existsSync(dir)) {
                try {fs.mkdirSync(dir, 0744);}catch(err){log.e(err.message);}
            }
        
            var apps=[];
            app_names=[];
            if(typeof params.qstring['apps']!== 'undefined' && params.qstring['apps']!=="" )
                apps =params.qstring['apps'].split(',');
            else
            {
                common.returnMessage(params, 404, 'Please provide at least one app id to export data');
                return true;
            }

            if(!params.qstring.only_export || params.qstring.only_export!='1')
            {
                params.qstring.only_export=false;
                if(!params.qstring.server_token || params.qstring.server_token=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_token"');
                    return true;
                }
                
                if(!params.qstring.server_address || params.qstring.server_address=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_address"');
                    return true;
                }
            }
            else
            {
                params.qstring.only_export=true;
                params.qstring.server_address="";
                params.qstring.server_token=""
            }
            
            if(!params.qstring.aditional_files || params.qstring.aditional_files!='1')
                params.qstring.aditional_files = false;
            else
                params.qstring.aditional_files = true
                
            if(!params.qstring.redirect_traffic || params.qstring.redirect_traffic!='1')
                params.qstring.redirect_traffic = false;
            else
                params.qstring.redirect_traffic = true
                
            apps = apps.sort();
            //clear out duplicates
            for(var i=1; i<apps.lenght-1; i++)
            {
                if(apps[i-1]==apps[i]){apps.splice(i,1); i--;}
            }
            //check if all app id's are valid id's
            
            check_ids(apps).then(
                function(){return create_and_validate_export_id(apps);}).then(
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
                    log_me(my_logpath,"Export scripts created",false);
                    if(scripts && scripts.length>0)
                    {
                        exp_count = scripts.length;
                        common.returnMessage(params, 200, exportid);
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
                                        clean_up_data('export',exportid,false).then(
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
                                        send_export(exportid,created);
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
                            common.returnMessage(params, 404, 'Failed to generate export scripts');
                        }
                    },
                    function(err){
                        update_progress(exportid,"exporting","failed",0,err.message,true,{},params);
                        common.returnMessage(params, 404, 'Failed to generate export scripts');
                    });
                },
                function(err) {common.returnMessage(params, 404, err);});
        });
        return true;
    });
    
    //Validates if given token and address can be used for data import
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    plugins.register("/o/datamigration/validateconnection", function(ob){
        var params = ob.params;
        
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            if(!params.qstring.server_token || params.qstring.server_token=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_token"');
                    return true;
                }
                
                if(!params.qstring.server_address || params.qstring.server_address=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_address"');
                    return true;
                }
                
                var r = request.post({url: params.qstring.server_address+'/i/datamigration/import?test_con=1',headers: {"countly-token": params.qstring.server_token}}, requestCallback);
                var form = r.form();
                function requestCallback(err, res, body) {
                    if(err)
                    {
                        common.returnMessage(params, 404, err.message);
                        return true; 
                    }
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
                            common.returnMessage(params, 404, msg);      
                        }
                        else if(res.statusCode==200 && msg=="valid")
                        {
                           common.returnMessage(params, 200, 'Connection is valid');
                        }
                        else
                        {
                            msg="Target server address is not valid";
                            common.returnMessage(params, 404, msg);
                        }
                    }
                    return;
                }
                
        });
        return true;
    
    });
    
    //Send exported
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    //@exportid = export id
    plugins.register("/i/datamigration/sendexport", function(ob){
        var params = ob.params;
        
        var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            } catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validate(params, function(){
            myparams = params;
            
            if(params.qstring.exportid)
            {
                if(!params.qstring.server_token || params.qstring.server_token=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_token"');
                    return true;
                }
                
                if(!params.qstring.server_address || params.qstring.server_address=='')
                {
                    common.returnMessage(params, 404, 'Missing parameter "server_address"');
                    return true;
                }
                
                if(!params.qstring.redirect_traffic || params.qstring.redirect_traffic!='1')
                    params.qstring.redirect_traffic = false;
                else
                    params.qstring.redirect_traffic = true
                    
                var myreq = JSON.stringify({headers:params.req.headers});
                update_progress(params.qstring.exportid,"packing","progress",100,"",true,{stopped:false,only_export:false,server_address:params.qstring.server_address,server_token:params.qstring.server_token,redirect_traffic:params.qstring.redirect_traffic,userid:params.member._id,email:params.member.email,myreq:myreq});
                
                common.returnMessage(params, 200, "Success");
                send_export(params.qstring.exportid);
            }
            else
            {
                common.returnMessage(params,404,'Invalid export ID');
            }
           
           });
        return true;
    });
    
    //for redirect
    plugins.register("/sdk", function(ob){
        var params = ob.params,
            app = ob.app;
        if (!params.cancelRequest && app.redirect_url && app.redirect_url!='') {
            var path = params.href;
            
            //check if we have query part
            if(path.indexOf('?') === -1){
                path += "?";
            }
            
            var opts = {
                uri: app.redirect_url + path + '&ip_address=' + params.ip_address,
                method: 'GET'
            };
            
            //should we send post request
            if(params.req.method.toLowerCase() == 'post'){
                opts.method = "POST";
                //check if we have body from post method
                if(params.req.body){
                    opts.json = true;
                    opts.body = params.req.body;
                }
            }
            
            request(opts, function (error, response, body) {});

            if (plugins.getConfig("api").safe) {
                common.returnMessage(params, 200, 'Success');
            }

            params.cancelRequest = true;
            return false;
        }
        return false;
    });
    

}(plugin));

module.exports = plugin;