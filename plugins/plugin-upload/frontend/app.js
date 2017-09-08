var plugin = {};
const fs = require('fs');
const fse = require('fs-extra') //easiermove files, delete folders
var StreamZip = require('node-stream-zip'); //for zips
var Promise = require("bluebird");
var cp = require('child_process'); //call process
var exec = cp.exec; //for calling comannd line
var spawn = cp.spawn; //for calling comannd line

var path = require('path');
const jaguar = require('jaguar');//extracting tar files

var common = require('../../../api/utils/common.js');
var log = common.log('plugin-upload:app');
    

var package_name= '';
var plugindata = {};

//Checking if provided plugin name is not in given file
function check_name_list(filepath,myname,mandatory)
{
    return new Promise(function(resolve, reject){
        if (fs.existsSync(filepath))
        {
            fs.readFile(filepath,(err,filedata)=>
            {
                if (err){reject(Error("Unable to parse plugin list file"));}
                var mylist=null;
                try { mylist = JSON.parse(filedata);} 
                catch (SyntaxError) {//unable to parse package list
                    return reject(Error("Unable to parse plugin list file")); 
                } 
                if(mylist)
                {
                    for(i=0; i<mylist.length; i++)
                    {
                        if(mylist[i] == myname)
                        {
                            if(mandatory==false)
                                return reject(Error('existing_name')); 
                            else
                                return reject(Error('enabled_plugin'));
                        }
                    }
                    package_name = myname;
                    return resolve();
                }
            }); 
        
        }
        else
        {
            if(mandatory)
                reject(Error('nofile'));
            else
                resolve();
            
        }
    });
}

//checks package.json file(if exists, mandotory fields) calls check_name_list on plugins.ee.json(if exists) and plugins.json to prevent rewriting enterprise or enabled plugins;
function check_package_file(path)
{
    return new Promise(function(resolve, reject){
        if (!fs.existsSync(path+'/package.json')) 
            return reject(Error('package_missing'));
        fs.readFile(path+'/package.json', (err, data) => {
            var mydata=null;
            if (err)//unable to read package file
                return reject(Error('package_invalid'));    
            try { mydata = JSON.parse(data);} 
            catch (SyntaxError) {//unable to parse package file
                return reject(Error('package_invalid')); 
            } 
                
            //check if mandatory fields exist
            if(!mydata){return reject(Error('package_invalid'));}
            if(!mydata.name){ return  reject(Error('name_missing'));}
            if(!mydata.title){ return reject(Error('title_missing'));}
            if(!mydata.version){ return reject(Error('version_missing'));}
            if(!mydata.description){ return  reject(Error('description_missing'));}
                
            if(mydata.name.indexOf(".")>-1){
                return  reject(Error('name_invalid'));//name shall not contain dot
            }

            check_name_list(__dirname + '/../../plugins.ee.json',mydata.name,false)
            .then(function () {return check_name_list(__dirname + '/../../plugins.json',mydata.name,true)})
            .then(
                function(result)
                {
                    package_name = mydata.name;
                    plugindata = mydata;
                    return resolve();
                },
                function (error)
                {
                    return reject(error);
                }
            );    
        });
    });
}

//checks if there is any of other mandatory files or folders.
function check_structure(path,app,countlyDb)
{
    return new Promise(function(resolve, reject){
        if (!fs.existsSync(path+'/api/api.js'))
            return reject(Error('apijs_missing')); 
        if (!fs.existsSync(path+'/frontend/app.js'))
            return reject(Error('appjs_missing'));   
        if(! fs.existsSync(path+'/frontend/public/')) 
            return reject(Error('public_missing'));
        if (!fs.existsSync(path+'/install.js')) 
            return reject(Error('install_missing'));   
        if (!fs.existsSync(path+'/uninstall.js')) 
            return reject(Error('uninstall_missing')); 
        if (!fs.existsSync(path+'/frontend/public/javascripts')) 
            return reject(Error('javascripts_missing'));
            
        try
        {
            delete require.cache[require.resolve(path+"/frontend/app.js")];
            var mynewplugin = require(path+"/frontend/app.js");
                
            if(typeof mynewplugin.init != "undefined")
                return resolve();
            else
                return reject(Error('init_missing')); 
        }
        catch(err)
        {
            return reject(Error("/frontend.app.js SyntaxError: "+err.message)); 
        }
    });
}

//clears plugins/{myplugindir} if already uploaded once.
function reset_plugin_dir()
{
    return new Promise(function(resolve, reject){
        if(package_name!='')
        {
            if(fs.existsSync(__dirname + '/../../'+package_name))
            {
                fse.remove(__dirname + '/../../'+package_name, err => {
                    if (err) {reject(Error('unable_copy_files')); } 
                    else
                        resolve();
                });
            }
            else
                resolve();
        }
        else
            reject(Error('unable_copy_files')); 
    });
}

//cleans up uploaded temporary files
function cleanup()
{
    return new Promise(function(resolve, reject){
        if (fs.existsSync(__dirname + '/upload')){
            fse.remove(__dirname + '/upload')
            .then(() => {resolve();})
            .catch(err => {reject(err);});
        }
    });
}

//sometimes there are extra folder when data is extracted
function fix_my_path(path)
{
    if (fs.existsSync(path)){
        var myfolder = fs.readdirSync(path);
        if(myfolder.length==1)
        {
            var mm = myfolder[0].split(".");
            if(mm.length==1)//is folder
            {
                return fix_my_path(path+"/"+myfolder[0]);
            }
        }
        return path;
    }
    else
        return false;
}

/*Plugin validation. Called after extraction.  */
function validate_files(path,app,countlyDb)
{
    return new Promise(function(resolve, reject){
        //sometimes there is created subfolder when extracted - fix it
        path = fix_my_path(path);
        //check
        if(path==false)
            return reject(Error("Folder missing"));
        else
        {
            check_package_file(path)
            .then(function(){ return check_structure(path,app,countlyDb);})
            .then(function(){ return reset_plugin_dir();})
            .then(
                function(result) {
                    //copy files
                    fse.move(path, __dirname + '/../../'+package_name ).then(() => { 
                      return resolve();
                    })
                    .catch(err => {reject(err);});
                },
                function(err) {
                    return reject(err);
                }
            ).catch(err => {
                return reject(err);
            });
        }
    });
}


/*Function used to call new child process, separated from parent. For validate_reset() */
function run_command(my_command,my_dir,logpath)
{
    return new Promise(function(resolve, reject){
    
        const out = fs.openSync(logpath, 'a');
        const err = fs.openSync(logpath, 'a');

        var child = spawn(my_command, {cwd: __dirname,shell:true, detached:true, stdio: [ 'ignore', out, err ]}, function(error) {
            if (error)
                return reject(Error('error:'+ JSON.stringify(error)));
            else
                return resolve();
        });
    });
}

/*checks if we are not in neverending chrashing  - restarting loop
If countly is restarted at least 5 times in a row(and there is less than 10 seconds between any restart) - 
calling /plugin-upload/scripts/disable_plugins.sh. (disables lastly enabled plugins, call upgrade->restart) Creates log with timestamp in log folder. 
*/
function validate_reset()
{
   
    var tstamp = new Date().getTime();
        var tarray = [];
        if (fs.existsSync(__dirname + '/reset_time.json')) {
            var data=fs.readFileSync(__dirname + '/reset_time.json'); 
            if(data)
            {
                try { tarray = JSON.parse(data);} 
                catch (SyntaxError) {}
            }            
        }
        if(tarray.length>0)
        {
            if((tstamp - tarray[tarray.length-1])<10000) //10 seconds
            {
                tarray.push(tstamp);
                log.d("Reload failure ");
                log.d("Reload failure "+tarray.length);
                if(tarray.length>=5)//already 5. time in row
                {
                    tarray = [tstamp];
                    //try reseting all plugins,enabled in last turn
                    var commandList = [];
                    if (fs.existsSync(__dirname + '/last_enabled_plugins.json')) {
                        var pluginlist=[];
                        var data=fs.readFileSync(__dirname + '/last_enabled_plugins.json'); 
                        if(data)
                        {
                            try { pluginlist = JSON.parse(data);} 
                            catch(error){log.e(error.message +"1");}
                        } 
                    }
                    if(pluginlist.length>0)
                    {
                        var logpath = path.resolve(__dirname+'/../../../log/plugns-disable'+(new Date().toISOString().replace('T',':'))+'.log');
                       
                        var mydir = path.resolve(__dirname+'/../scripts');
                        run_command('bash '+mydir+'/disable_plugins.sh '+pluginlist.join(' '),
                        mydir,logpath)
                        .then(
                            function(result) {
                                try
                                {
                                    fs.writeFileSync(__dirname + '/reset_time.json',JSON.stringify(tarray));
                                }
                                catch(error){log.e(error.message+"2");}
                            },
                            function(err){log.e(err.message+"3");}
                        )
                        .catch(err => {log.e(err.message+"4"); });
                        
                        log.e('Countly has been crashing and resatarting repeatedly.In attempt to fix it lastly enabled plugins are being disabled:'+pluginlist.join()+' You can review disabling process here:'+logpath);
                        
                        try
                        {
                            fs.writeFileSync(__dirname + '/reset_time.json',JSON.stringify(tarray)); 
                        } 
                        catch(error){log.e(error.message+"5");}
                    }
               }
            }
            else
            {
                log.d('good reload');
                tarray = [tstamp];
            }
        }
        else
            tarray.push(tstamp);
        try {fs.writeFileSync(__dirname + '/reset_time.json',JSON.stringify(tarray));}
        catch(err){ log.e(err.message+"6");}
}


function extract_files(ext,target_path)
{
    return new Promise(function(resolve, reject){
        if(ext=="zip")
        {
            var zip = new StreamZip({  file: target_path,  storeEntries: true });
            zip.on('error', function(err){
                 return reject(Error("bad_archive"));
            });
            zip.on('ready', function() {
                // extract all
                zip.extract(null, path.resolve(__dirname + '/upload/unpacked'), function(err, count) {
                if(err)
                   return reject(Error("bad_archive"));
                else
                   resolve();
                });   
            });
        }
        else//for other - tar, tar.gz
        {
            const extract = jaguar.extract(target_path,path.resolve(__dirname + '/upload/unpacked'));
            extract.on('error', (error) => {
                return reject(Error("bad_archive"));
            });
            extract.on('end', () => {
                return resolve();
            });
        }
    });
}

(function (plugin) {
	plugin.init = function(app, countlyDb){
        validate_reset();//checks if we are not in neverending crashing-restarting loop
        app.post(countlyConfig.path+'/plugins/plugin-upload', function (req, res, next) {
            if(req.session && req.session.gadm)
            {
                plugindata={};
                package_name=''; 
                if(!req){res.end("nofile");return true;}
                if(!req.files){res.end("nofile");return true;}
                if(!req.files.new_plugin_input) {res.end("nofile");return true;}
            
                //upload folder
                var mydir = path.resolve(__dirname,"");
                var dir = path.resolve(__dirname + '/upload');
                if (!fs.existsSync(dir)) {
                    try {fs.mkdirSync(dir, 0744);}catch(err){log.e(err.message);}
                }
                //folder for extracted data
                var dir = path.resolve(__dirname + '/upload/unpacked');
                if (!fs.existsSync(dir)) {
                   try {fs.mkdirSync(dir, 0744);}catch(err){log.e(err.message);}
                }

                var tmp_path = req.files.new_plugin_input.path;
                var target_path = path.resolve(__dirname + '/upload/'+req.files.new_plugin_input.name);
                var plain_name_array = req.files.new_plugin_input.name.split(".");

                var ext="";
                
                if(plain_name_array.length<2)
                {
                    fs.unlink(tmp_path, function () {});
                    res.send("badformat");
                    cleanup().then(function(){ return true;});
                }
                else
                {
                    var ext=plain_name_array[1];//zip tar tar.gz tgz
                    if (ext != "zip" && ext != "tar" && ext != "tgz")
                    {
                        fs.unlink(tmp_path, function () {});
                        res.send("badformat");
                        cleanup().then(function(){ return true;});
                    }   
                }
                
                var is = fs.createReadStream(tmp_path);
                var os = fs.createWriteStream(target_path);
                is.pipe(os);
                is.on('end',function() {
                    fs.unlink(tmp_path, function(){});
                });
                os.on('finish',function() {
                    
                    edir = path.resolve(__dirname + '/upload/unpacked/');
                    extract_files(ext,target_path)
                    .then(function(){ return validate_files(edir,app,countlyDb);})
                    .then(
                        function(result)
                        {
                            cleanup()
                            .then( function(){
                                plugins.callMethod("logAction", {req:req, user:{_id:req.session.uid, email:req.session.email}, action:"plugin_uploaded", data:plugindata});
                                res.send('Success.'+package_name);
                            });
                        },
                        function(err) {
                            cleanup().then( function(){res.send(err.message)});
                        }
                    );
                });
            }
            else
            {
                res.send(false);
            }
        });
    }
}(plugin));

module.exports = plugin;
