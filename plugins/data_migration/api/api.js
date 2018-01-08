var plugin = {},
	common = require('../../../api/utils/common.js'),
    countlyFs = require('../../../api/utils/countlyFs.js'),
    log = common.log('datamigration:api'),
    plugins = require('../../pluginManager.js'),
    migration_helper = require("./data_migration_helper.js");
const os=require('os'); //hostname
const fs = require('fs');
const fse = require('fs-extra');
var path = require('path');

var Promise = require("bluebird");

var authorize = require('../../../api/utils/authorizer.js'); //for token

const request = require('request');


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

function update_progress(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams)
{
    var data_migrator = new migration_helper(common.db);
    data_migrator.update_progress(my_exportid,step,status,dif,reason,reset_progress,more_fields,myparams); 
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


//update_progress
//apply_redirect_to_apps
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
                                if(res.server_address && res.server_address.length>0 && res.redirect_traffic && res.redirect_traffic==true)
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
                
                var data_migrator = new migration_helper();
            
                data_migrator.import_data(params.files['import_file'],params,logpath,log);
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
                            var data_migrator = new migration_helper(common.db);
            
                            data_migrator.clean_up_data('export',params.qstring.exportid,true).then
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
                 var data_migrator = new migration_helper(common.db);
            
                data_migrator.clean_up_data('import',params.qstring.exportid,true).then
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
            var dir = __dirname + '/../export';
            if (!fs.existsSync(dir)) {
                try {fs.mkdirSync(dir, 0744);}catch(err){log.e(err.message);}
            }
        
            var apps=[];
            var app_names=[];
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
            
            if(params.qstring.aditional_files && params.qstring.aditional_files=='1')
                params.qstring.aditional_files = true;
            else
                params.qstring.aditional_files = false;
                
           if(params.qstring.redirect_traffic && params.qstring.redirect_traffic=='1')
                    params.qstring.redirect_traffic = true;
                else
                    params.qstring.redirect_traffic = false
            


            var data_migrator = new migration_helper();
            
            data_migrator.export_data(apps,params,common.db,log).then(
                function(result)
                {
                    common.returnMessage(params, 200, result);
                },
                function(error)
                {
                    common.returnMessage(params, 404, error.message);
                }
                
            );
           
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
                
                if(params.qstring.redirect_traffic && params.qstring.redirect_traffic=='1')
                    params.qstring.redirect_traffic = true;
                else
                    params.qstring.redirect_traffic = false

                var myreq = JSON.stringify({headers:params.req.headers});
                update_progress(params.qstring.exportid,"packing","progress",100,"",true,{stopped:false,only_export:false,server_address:params.qstring.server_address,server_token:params.qstring.server_token,redirect_traffic:params.qstring.redirect_traffic,userid:params.member._id,email:params.member.email,myreq:myreq});
                
                common.returnMessage(params, 200, "Success");
                   
                var data_migrator = new migration_helper(common.db);
                data_migrator.send_export(params.qstring.exportid,common.db);

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