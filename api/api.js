var http = require('http'),
    cluster = require('cluster'),
    formidable = require('formidable'),
    os = require('os'),
    countlyConfig = require('./config', 'dont-enclose'),
    plugins = require('../plugins/pluginManager.js'),
    jobs = require('./parts/jobs'),
    Promise = require("bluebird"),
    workers = [],
    log = require('./utils/log.js')('core:api');
    
plugins.setConfigs("api", {
    domain: "",
    safe: false,
    session_duration_limit: 120,
    city_data: true,
    event_limit: 500,
    event_segmentation_limit: 100,
    event_segmentation_value_limit:1000,
    metric_limit: 5000,
    sync_plugins: false,
    session_cooldown: 15,
    total_users: true
});

plugins.setConfigs("apps", {
    country: "TR",
    timezone: "Europe/Istanbul",
    category: "6"
});

plugins.setConfigs("security", {
    login_tries: 3,
    login_wait: 5*60,
    password_min: 8,
    password_char: true,
    password_number: true,
    password_symbol: true,
    password_expiration: 0,
    dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains",
    api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block"
});
    
plugins.setConfigs('logs', {
    debug:      (countlyConfig.logging && countlyConfig.logging.debug)     ?  countlyConfig.logging.debug.join(', ')    : '',
    info:       (countlyConfig.logging && countlyConfig.logging.info)      ?  countlyConfig.logging.info.join(', ')     : '',
    warning:    (countlyConfig.logging && countlyConfig.logging.warning)   ?  countlyConfig.logging.warning.join(', ')  : '',
    error:      (countlyConfig.logging && countlyConfig.logging.error)     ?  countlyConfig.logging.error.join(', ')    : '',
    default:    (countlyConfig.logging && countlyConfig.logging.default)   ?  countlyConfig.logging.default : 'warning'
}, undefined, function(config){ 
    var cfg = plugins.getConfig('logs'), msg = {cmd: 'log', config: cfg};
    if (process.send) { process.send(msg); }
    require('./utils/log.js').ipcHandler(msg);
});

plugins.init();

http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    if(log && log.e)
        log.e('Logging caught exception');
    process.exit(1);
});
 
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    if(log && log.e)
        log.e('Logging unhandled rejection');
});

if (cluster.isMaster) {

    var workerCount = (countlyConfig.api.workers)? countlyConfig.api.workers : os.cpus().length;

    for (var i = 0; i < workerCount; i++) {
        var worker = cluster.fork();
        workers.push(worker);
    }

    var passToMaster = function(worker){
        worker.on('message', function(msg){
            if (msg.cmd === 'log') {
                // console.log(new Date().toISOString() + ': INFO\t[logs]\tLogging configuration changed: %j', msg.config);
                workers.forEach(function(w){
                    if (w !== worker) { w.send({cmd: 'log', config: msg.config}); }
                });
                require('./utils/log.js').ipcHandler(msg);
            }
            else if(msg.cmd === "checkPlugins"){
                plugins.checkPluginsMaster();
            }
            else if(msg.cmd === "startPlugins"){
                plugins.startSyncing();
            }
            else if(msg.cmd === "endPlugins"){
                plugins.stopSyncing();
            }
            else if(msg.cmd === "dispatch" && msg.event){
                workers.forEach(function(w){
                    w.send(msg);
                });
            }
        });
    };

    workers.forEach(passToMaster);

    cluster.on('exit', function(worker) {
        workers = workers.filter(function(w){
            return w !== worker;
        });
        var newWorker = cluster.fork();
        workers.push(newWorker);
        passToMaster(newWorker)
    });

    plugins.dispatch("/master", {});

    // Allow configs to load & scanner to find all jobs classes
    setTimeout(() => {
        jobs.job('api:ping').replace().schedule('every 1 day');
        jobs.job('api:clear').replace().schedule('every 1 day');
        jobs.job('api:clearTokens').replace().schedule('every 1 day');
    }, 10000);
} else {
    var common = require('./utils/common.js');
    var authorize = require('./utils/authorizer.js');
    var taskmanager = require('./utils/taskmanager.js');
    common.db = plugins.dbConnection(countlyConfig);
    //since process restarted mark running tasks as errored
    taskmanager.errorResults({db:common.db});
    var url = require('url'),
    querystring = require('querystring'),
    log = common.log('api'),
    crypto = require('crypto'),
    countlyApi = {
        data:{
            usage:require('./parts/data/usage.js'),
            fetch:require('./parts/data/fetch.js'),
            events:require('./parts/data/events.js'),
            exports:require('./parts/data/exports.js')
        },
        mgmt:{
            users:require('./parts/mgmt/users.js'),
            apps:require('./parts/mgmt/apps.js')
        }
    };
    
    process.on('message', common.log.ipcHandler);
    
    process.on('message', function(msg){
        if (msg.cmd === 'log') {
            common.log.ipcHandler(msg);
        }
        else if(msg.cmd === "dispatch" && msg.event){
            plugins.dispatch(msg.event, msg.data || {});
        }
    });

    plugins.dispatch("/worker", {common:common});
    // Checks app_key from the http request against "apps" collection.
    // This is the first step of every write request to API.
    function validateAppForWriteAPI(params, done) {
        //ignore possible opted out users for ios 10
        if(params.qstring.device_id == "00000000-0000-0000-0000-000000000000"){
            common.returnMessage(params, 400, 'Ignoring device_id');
            return done ? done() : false;
        }
        common.db.collection('apps').findOne({'key':params.qstring.app_key}, function (err, app) {
            if (!app) {
                if (plugins.getConfig("api").safe) {
                    common.returnMessage(params, 400, 'App does not exist');
                }
    
                return done ? done() : false;
            }
    
            params.app_id = app['_id'];
            params.app_cc = app['country'];
            params.app_name = app['name'];
            params.appTimezone = app['timezone'];
            params.app = app;
            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
            
            if(params.app.checksum_salt && params.app.checksum_salt.length && !params.files){ //ignore multipart data requests
                var payload;
                if(params.req.method.toLowerCase() == 'post'){
                    payload = params.req.body;
                }
                else{
                    payload = params.href.substr(3);
                }
                if(typeof params.qstring.checksum !== "undefined"){
                    payload = payload.replace("&checksum="+params.qstring.checksum, "").replace("checksum="+params.qstring.checksum, "");
                    if((params.qstring.checksum + "").toUpperCase() != common.crypto.createHash('sha1').update(payload + params.app.checksum_salt).digest('hex').toUpperCase()){
                        console.log("Checksum did not match", params.href, params.req.body);
                        if (plugins.getConfig("api").safe) {
                            common.returnMessage(params, 400, 'Request does not match checksum');
                        }
                        return done ? done() : false;
                    }
                }
                if(typeof params.qstring.checksum256 !== "undefined"){
                    payload = payload.replace("&checksum256="+params.qstring.checksum256, "").replace("checksum256="+params.qstring.checksum256, "");
                    if((params.qstring.checksum256 + "").toUpperCase() != common.crypto.createHash('sha256').update(payload + params.app.checksum_salt).digest('hex').toUpperCase()){
                        console.log("Checksum did not match", params.href, params.req.body);
                        if (plugins.getConfig("api").safe) {
                            common.returnMessage(params, 400, 'Request does not match checksum');
                        }
                        return done ? done() : false;
                    }
                }
            }
            
            if (params.qstring.location && params.qstring.location.length > 0) {
                var coords = params.qstring.location.split(',');
                if (coords.length === 2) {
                    var lat = parseFloat(coords[0]), lon = parseFloat(coords[1]);
    
                    if (!isNaN(lat) && !isNaN(lon)) {
                        params.user.lat = lat;
                        params.user.lng = lon;
                        if(params.user.lat && params.user.lng){
                            var update = {};  
                            update["$set"] = {lat:params.user.lat, lng:params.user.lng};
                            common.updateAppUser(params, update);
                        }
                    }
                }
            }

            if (params.qstring.tz && !isNaN(parseInt(params.qstring.tz))) {
                params.user.tz = parseInt(params.qstring.tz);
            } 
            
            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, user){
                params.app_user = user || {};
                
                if (params.qstring.metrics && typeof params.qstring.metrics === "string") {		
                    try {		
                        params.qstring.metrics = JSON.parse(params.qstring.metrics);		
                    } catch (SyntaxError) {		
                        console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);		
                    }		
                }
                
                plugins.dispatch("/sdk", {params:params, app:app});
                
                if (params.qstring.metrics) {		
                    common.processCarrier(params.qstring.metrics);	
                		
                    if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {		
                        if(common.os_mapping[params.qstring.metrics["_os"].toLowerCase()])		
                            params.qstring.metrics["_os_version"] = common.os_mapping[params.qstring.metrics["_os"].toLowerCase()] + params.qstring.metrics["_os_version"];		
                        else		
                            params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];		
                    }		
                }
                
                if(!params.cancelRequest){
                    //check if device id was changed
                    if(params.qstring.old_device_id && params.qstring.old_device_id != params.qstring.device_id){
                        function restartRequest(){
                            //remove old device ID and retry request
                            params.qstring.old_device_id = null;
                            //retry request
                            validateAppForWriteAPI(params, done);
                        };
                        
                        function mergeUserData(newAppUser, oldAppUser){
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
                            common.updateAppUser(params, {'$set': newAppUser}, function(){
                                //delete old user
                                common.db.collection('app_users' + params.app_id).remove({_id:old_id}, function(){
                                    //let plugins know they need to merge user data
                                    plugins.dispatch("/i/device_id", {params:params, app:app, oldUser:oldAppUser, newUser:newAppUser});
                                    restartRequest();
                                });
                            });
                        }
                        
                        var old_id = common.crypto.createHash('sha1').update(params.qstring.app_key + params.qstring.old_device_id + "").digest('hex');
                        //checking if there is an old user
                        common.db.collection('app_users' + params.app_id).findOne({'_id': old_id }, function (err, oldAppUser){
                            if(!err && oldAppUser){
                                //checking if there is a new user
                                var newAppUser = params.app_user;
                               if(Object.keys(newAppUser).length){
                                   if(newAppUser.ls && newAppUser.ls > oldAppUser.ls){
                                       mergeUserData(newAppUser, oldAppUser);
                                   }
                                   else{
                                       //switching user identidy
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
                                   oldAppUser.did = params.qstring.device_id + "";
                                   oldAppUser._id = params.app_user_id;
                                   common.db.collection('app_users' + params.app_id).insert(oldAppUser, function(){
                                       common.db.collection('app_users' + params.app_id).remove({_id:old_id}, function(){
                                           restartRequest();
                                       });
                                   });
                               }
                            }
                            else{
                                //process request
                                restartRequest();
                            }
                        });
                        
                        //do not proceed with request
                        return false;
                    }
                    else if(!params.app_user.uid){
                        function parseSequence(num){
                            var valSeq = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
                            var digits = [];
                            var base = valSeq.length;
                            while (num > base-1){
                                digits.push(num % base);
                                num = Math.floor(num / base);
                            }
                            digits.push(num);
                            var result = "";
                            for(var i = digits.length-1; i>=0; --i){
                                result = result + valSeq[digits[i]];
                            }
                            return result;
                        }
                        common.db.collection('app_users' + params.app_id).findAndModify({_id:"uid-sequence"},{},{$inc:{seq:1}},{new:true, upsert:true}, function(err,result){
                            result = result && result.ok ? result.value : null;
                            if (result && result.seq) {
                                params.app_user.uid = parseSequence(result.seq);
                                common.updateAppUser(params, {$set:{uid:params.app_user.uid}});
                                processRequestData();
                            }
                        });
                    }
                    else{
                        processRequestData();
                    }
                    
                    function processRequestData(){
                        plugins.dispatch("/i", {params:params, app:app});
                
                        if (params.qstring.events) {
                            if(params.promises)
                                params.promises.push(countlyApi.data.events.processEvents(params));
                            else
                                countlyApi.data.events.processEvents(params);
                        } else if (plugins.getConfig("api").safe && !params.bulk) {
                            common.returnMessage(params, 200, 'Success');
                        }
                
                        if (params.qstring.begin_session) {
                            countlyApi.data.usage.beginUserSession(params, done);
                        } else {
                            if(params.qstring.metrics){
                                countlyApi.data.usage.processMetrics(params);
                            }
                            if (params.qstring.end_session) {
                                if (params.qstring.session_duration) {
                                    countlyApi.data.usage.processSessionDuration(params, function () {
                                        countlyApi.data.usage.endUserSession(params, done);
                                    });
                                } else {
                                    countlyApi.data.usage.endUserSession(params, done);
                                }
                            } else if (params.qstring.session_duration) {
                                countlyApi.data.usage.processSessionDuration(params, function () {
                                    return done ? done() : false;
                                });
                            } else {
                                //update lac, all other requests do updates to app_users and update lac automatically
                                common.updateAppUser(params, {$set:{lac:params.time.timestamp}});
                                
                                // begin_session, session_duration and end_session handle incrementing request count in usage.js
                                var dbDateIds = common.getDateIds(params),
                                    updateUsers = {};
                    
                                common.fillTimeObjectMonth(params, updateUsers, common.dbMap['events']);
                                var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
                                common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {'$inc': updateUsers}, {'upsert':true}, function(err, res){});
                                
                                return done ? done() : false;
                            }
                        }
                    }
                } else {
                    return done ? done() : false;
                }
            });
        });
    }
    
    function validateUserForWriteAPI(callback, params) {
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                return false;
            }
            params.member = member;
            if(plugins.dispatch("/validation/user", {params:params})){
                if(!params.res.finished){
                    common.returnMessage(params, 401, 'User does not have permission');
                }
                return false;
            }
            callback(params);
        });
    }
    
    function validateUserForDataReadAPI(params, callback, callbackParam) {
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
            
            if (typeof params.qstring.app_id === "undefined") {
                common.returnMessage(params, 401, 'No app_id provided');
                return false;
            }
    
            if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
                common.returnMessage(params, 401, 'User does not have view right for this application');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                return false;
            }
    
            common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
                if (!app) {
                    common.returnMessage(params, 401, 'App does not exist');
                    return false;
                }
                params.member = member;
                params.app_id = app['_id'];
                params.app_cc = app['country'];
                params.appTimezone = app['timezone'];
                params.app = app;
                params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                
                if(plugins.dispatch("/validation/user", {params:params})){
                    if(!params.res.finished){
                        common.returnMessage(params, 401, 'User does not have permission');
                    }
                    return false;
                }
                
                plugins.dispatch("/o/validate", {params:params, app:app});
    
                if (callbackParam) {
                    callback(callbackParam, params);
                } else {
                    callback(params);
                }
            });
        });
    }
    
    function validateUserForDataWriteAPI(params, callback, callbackParam) {
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
    
            if (!((member.admin_of && member.admin_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
                common.returnMessage(params, 401, 'User does not have write right for this application');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                return false;
            }
    
            common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
                if (!app) {
                    common.returnMessage(params, 401, 'App does not exist');
                    return false;
                }
    
                params.app_id = app['_id'];
                params.appTimezone = app['timezone'];
                params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                params.member = member;
                
                if(plugins.dispatch("/validation/user", {params:params})){
                    if(!params.res.finished){
                        common.returnMessage(params, 401, 'User does not have permission');
                    }
                    return false;
                }
    
                if (callbackParam) {
                    callback(callbackParam, params);
                } else {
                    callback(params);
                }
            });
        });
    }
    
    function validateUserForGlobalAdmin(params, callback, callbackParam) {
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
    
            if (!member.global_admin) {
                common.returnMessage(params, 401, 'User does not have global admin right');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                return false;
            }
            
            params.member = member;
            
            if(plugins.dispatch("/validation/user", {params:params})){
                if(!params.res.finished){
                    common.returnMessage(params, 401, 'User does not have permission');
                }
                return false;
            }
    
            if (callbackParam) {
                callback(callbackParam, params);
            } else {
                callback(params);
            }
        });
    }
    
    function validateUserForMgmtReadAPI(callback, params) {
        common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
            if (!member || err) {
                common.returnMessage(params, 401, 'User does not exist');
                return false;
            }
            
            if (member && member.locked) {
                common.returnMessage(params, 401, 'User is locked');
                return false;
            }
    
            params.member = member;
            
            if(plugins.dispatch("/validation/user", {params:params})){
                if(!params.res.finished){
                    common.returnMessage(params, 401, 'User does not have permission');
                }
                return false;
            }
            
            callback(params);
        });
    }
    
    http.Server(function (req, res) {
        plugins.loadConfigs(common.db, function(){
            var urlParts = url.parse(req.url, true),
                queryString = urlParts.query,
                paths = urlParts.pathname.split("/"),
                apiPath = "",
                /**
                * Main request processing object containing all informashed shared through all the parts of the same request
                * @typedef params
                * @type {object}
                * @property {string} href - full URL href
                * @property {res} res - nodejs response object
                * @property {req} req - nodejs request object
                * @property {object} qstring - all the passed fields either through query string in GET requests or body and query string for POST requests
                * @property {string} apiPath - two top level url path, for example /i/analytics
                * @property {string} fullPath - full url path, for example /i/analytics/dashboards
                * @property {object} files - object with uploaded files, available in POST requests which upload files
                * @property {boolean} cancelRequest - Used for skipping SDK requests, if contains true, then request should be ignored and not processed. Can be set at any time by any plugin, but API only checks for it in beggining after / and /sdk events, so that is when plugins should set it if needed
                * @property {boolean} bulk - True if this SDK request is processed from the bulk method
                * @property {array} promises - Array of the promises by different events. When all promises are fulfilled, request counts as processed
                * @property {string} ip_address - IP address of the device submitted request, exists in all SDK requests
                * @property {object} user - Data with some user info, like country geolocation, etc from the request, exists in all SDK requests
                * @property {object} app_user - Document from the app_users collection for current user, exists in all SDK requests after validation
                * @property {object} app_user_id - ID of app_users document for the user, exists in all SDK requests after validation
                * @property {object} app - Document for the app sending request, exists in all SDK requests after validation and after validateUserForDataReadAPI validation
                * @property {ObjectID} app_id - ObjectID of the app document, available after validation
                * @property {string} app_cc - Selected app country, available after validation
                * @property {string} appTimezone - Selected app timezone, available after validation
                * @property {object} member - All data about dashboard user sending the request, exists on all requests containing api_key, after validation through validation methods
                * @property {timeObject} time - Time object for the request
                */
                params = {
                    'href':urlParts.href,
                    'qstring':queryString,
                    'res':res,
                    'req':req
                };
                
                //remove countly path
                if(common.config.path == "/"+paths[1]){
                    paths.splice(1, 1);
                }
                
            function processRequest(){
                if (params.qstring.app_id && params.qstring.app_id.length != 24) {
                    common.returnMessage(params, 400, 'Invalid parameter "app_id"');
                    return false;
                }
        
                if (params.qstring.user_id && params.qstring.user_id.length != 24) {
                    common.returnMessage(params, 400, 'Invalid parameter "user_id"');
                    return false;
                }
        
                for (var i = 1; i < paths.length; i++) {
                    if (i > 2) {
                        break;
                    }
        
                    apiPath += "/" + paths[i];
                }
                params.apiPath = apiPath;
                params.fullPath = paths.join("/");
                plugins.dispatch("/", {params:params, apiPath:apiPath, validateAppForWriteAPI:validateAppForWriteAPI, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin, paths:paths, urlParts:urlParts});
        
                if(!params.cancelRequest){
                    switch (apiPath) {
                        case '/i/bulk':
                        {               
                            var requests = params.qstring.requests,
                                appKey = params.qstring.app_key;
                
                            if (requests) {
                                try {
                                    requests = JSON.parse(requests);
                                } catch (SyntaxError) {
                                    console.log('Parse bulk JSON failed', requests, req.url, req.body);
                                }
                            } else {
                                common.returnMessage(params, 400, 'Missing parameter "requests"');
                                return false;
                            }
                            if (!plugins.getConfig("api").safe && !params.res.finished) {
                                common.returnMessage(params, 200, 'Success');
                            }
                            common.blockResponses(params);
                            function processBulkRequest(i) {
                                if(i == requests.length) {
                                    common.unblockResponses(params);
                                    if (plugins.getConfig("api").safe && !params.res.finished) {
                                        common.returnMessage(params, 200, 'Success');
                                    }
                                    return;
                                }
                                
                                if (!requests[i].app_key && !appKey) {
                                    return processBulkRequest(i + 1);
                                }
                
                                var tmpParams = {
                                    'app_id':'',
                                    'app_cc':'',
                                    'ip_address':requests[i].ip_address || common.getIpAddress(req),
                                    'user':{
                                        'country':requests[i].country_code || 'Unknown',
                                        'city':requests[i].city || 'Unknown'
                                    },
                                    'qstring':requests[i],
                                    'href':params.href,		
                                    'res':params.res,		
                                    'req':params.req,
                                    'promises':[],
                                    'bulk':true
                                };
                                
                                tmpParams["qstring"]['app_key'] = requests[i].app_key || appKey;
                
                                if (!tmpParams.qstring.device_id) {
                                    return processBulkRequest(i + 1);
                                } else {
                                    tmpParams.app_user_id = common.crypto.createHash('sha1').update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "").digest('hex');
                                }
                
                                return validateAppForWriteAPI(tmpParams, function(){
                                    function resolver(){
                                        plugins.dispatch("/sdk/end", {params:tmpParams});
                                        processBulkRequest(i + 1);
                                    }
                                    Promise.all(tmpParams.promises).then(resolver, resolver);
                                });
                            }
                            
                            processBulkRequest(0);
                            break;
                        }
                        case '/i/users':
                        {
                            if (params.qstring.args) {
                                try {
                                    params.qstring.args = JSON.parse(params.qstring.args);
                                } catch (SyntaxError) {
                                    console.log('Parse ' + apiPath + ' JSON failed', req.url, req.body);
                                }
                            }
            
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'create':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.createUser, params);
                                    break;
                                case 'update':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.updateUser, params);
                                    break;
                                case 'delete':
                                    validateUserForWriteAPI(countlyApi.mgmt.users.deleteUser, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update or /delete');
                                    break;
                            }
            
                            break;
                        }
                        case '/i/apps':
                        {
                            if (params.qstring.args) {
                                try {
                                    params.qstring.args = JSON.parse(params.qstring.args);
                                } catch (SyntaxError) {
                                    console.log('Parse ' + apiPath + ' JSON failed', req.url, req.body);
                                }
                            }
            
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'create':
                                    validateUserForWriteAPI(function(params){
                                        if (!(params.member.global_admin)) {
                                            common.returnMessage(params, 401, 'User is not a global administrator');
                                            return false;
                                        }
                                        countlyApi.mgmt.apps.createApp(params);
                                    }, params);
                                    break;
                                case 'update':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.updateApp, params);
                                    break;
                                case 'delete':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.deleteApp, params);
                                    break;
                                case 'reset':
                                    validateUserForWriteAPI(countlyApi.mgmt.apps.resetApp, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
                                    break;
                            }
            
                            break;
                        }
                        case '/i/tasks':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
                            
                            if (!params.qstring.task_id) {
                                common.returnMessage(params, 400, 'Missing parameter "task_id"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'update':
                                    validateUserForWriteAPI(function(){
                                        taskmanager.rerunTask({db:common.db, id:params.qstring.task_id}, function(err, res){
                                            common.returnMessage(params, 200, res);
                                        });
                                    }, params);
                                    break;
                                case 'delete':
                                    validateUserForWriteAPI(function(){
                                        taskmanager.deleteResult({db:common.db, id:params.qstring.task_id}, function(err, res){
                                            common.returnMessage(params, 200, "Success");
                                        });
                                    }, params);
                                    break;
                                case 'name':
                                    validateUserForWriteAPI(function(){
                                        taskmanager.deleteResult({db:common.db, id:params.qstring.task_id, name:params.qstring.name}, function(err, res){
                                            common.returnMessage(params, 200, "Success");
                                        });
                                    }, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path');
                                    break;
                            }
            
                            break;
                        }
                        case '/i':
                        {
                            params.ip_address =  params.qstring.ip_address || common.getIpAddress(req);
                            params.user = {
                                'country':params.qstring.country_code || 'Unknown',
                                'city':params.qstring.city || 'Unknown'
                            };
            
                            if (!params.qstring.app_key || !params.qstring.device_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                                return false;
                            } else {
                                // Set app_user_id that is unique for each user of an application.
                                params.app_user_id = common.crypto.createHash('sha1').update(params.qstring.app_key + params.qstring.device_id + "").digest('hex');
                            }
            
                            if (params.qstring.events) {
                                try {
                                    params.qstring.events = JSON.parse(params.qstring.events);
                                } catch (SyntaxError) {
                                    console.log('Parse events JSON failed', params.qstring.events, req.url, req.body);
                                }
                            }
                            
                            params.promises = [];
                            validateAppForWriteAPI(params, function(){
                                function resolver(){
                                    plugins.dispatch("/sdk/end", {params:params});
                                }
                                Promise.all(params.promises).then(resolver, resolver);
                            });
            
                            if (!plugins.getConfig("api").safe && !params.res.finished) {
                                common.returnMessage(params, 200, 'Success');
                            }
            
                            break;
                        }
                        case '/o/users':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'all':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getAllUsers, params);
                                    break;
                                case 'me':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                                    break;
                            }
            
                            break;
                        }
                        case '/o/apps':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'all':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getAllApps, params);
                                    break;
                                case 'mine':
                                    validateUserForMgmtReadAPI(countlyApi.mgmt.apps.getCurrentUserApps, params);
                                    break;
                                case 'details':
                                    validateUserForDataReadAPI(params, countlyApi.mgmt.apps.getAppsDetails);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /all , /mine or /details');
                                    break;
                            }
            
                            break;
                        }
                        case '/o/tasks':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'all':
                                    validateUserForMgmtReadAPI(function(){
                                        params.qstring.query = params.qstring.query || {};
                                        params.qstring.query.app_id = params.qstring.app_id;
                                        taskmanager.getResults({db:common.db, query:params.qstring.query}, function(err, res){
                                            common.returnOutput(params, res || []);
                                        });
                                    }, params);
                                    break;
                                case 'task':
                                    validateUserForMgmtReadAPI(function(){
                                        if (!params.qstring.task_id) {
                                            common.returnMessage(params, 400, 'Missing parameter "task_id"');
                                            return false;
                                        }
                                        taskmanager.getResult({db:common.db, id:params.qstring.task_id}, function(err, res){
                                            if(res){
                                                common.returnOutput(params, res);
                                            }
                                            else{
                                                common.returnMessage(params, 400, 'Task does not exist');
                                            }
                                        });
                                    }, params);
                                    break;
                                case 'check':
                                    validateUserForMgmtReadAPI(function(){
                                        if (!params.qstring.task_id) {
                                            common.returnMessage(params, 400, 'Missing parameter "task_id"');
                                            return false;
                                        }
                                        taskmanager.checkResult({db:common.db, id:params.qstring.task_id}, function(err, res){
                                            if(res){
                                                common.returnMessage(params, 200, res.status);
                                            }
                                            else{
                                                common.returnMessage(params, 400, 'Task does not exist');
                                            }
                                        });
                                    }, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path');
                                    break;
                            }
            
                            break;
                        }
                        case '/o/export':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'db':
                                    validateUserForMgmtReadAPI(function(){
                                        if (!params.qstring.collection) {
                                            common.returnMessage(params, 400, 'Missing parameter "collection"');
                                            return false;
                                        }
                                        if(typeof params.qstring.query === "string"){
                                            try{
                                                params.qstring.query = JSON.parse(params.qstring.query);
                                            }
                                            catch(ex){params.qstring.query = null;}
                                        }
                                        if(typeof params.qstring.projection === "string"){
                                            try{
                                                params.qstring.projection = JSON.parse(params.qstring.projection);
                                            }
                                            catch(ex){params.qstring.projection = null;}
                                        }
                                        if(typeof params.qstring.sort === "string"){
                                            try{
                                                params.qstring.sort = JSON.parse(params.qstring.sort);
                                            }
                                            catch(ex){params.qstring.sort = null;}
                                        }
                                        countlyApi.data.exports.fromDatabase({
                                            db: (params.qstring.db === "countly_drill") ? common.drillDb : common.db,
                                            params: params,
                                            collection: params.qstring.collection,
                                            query: params.qstring.query,
                                            projection: params.qstring.projection,
                                            sort: params.qstring.sort,
                                            limit: params.qstring.limit,
                                            skip: params.qstring.skip,
                                            type: params.qstring.type,
                                            filename: params.qstring.filename
                                        });
                                    }, params);
                                    break;
                                case 'request':
                                    validateUserForMgmtReadAPI(function(){
                                        if (!params.qstring.path) {
                                            common.returnMessage(params, 400, 'Missing parameter "path"');
                                            return false;
                                        }
                                        if(typeof params.qstring.data === "string"){
                                            try{
                                                params.qstring.data = JSON.parse(params.qstring.data);
                                            }
                                            catch(ex){
                                                params.qstring.data = {};
                                            }
                                        }
                                        countlyApi.data.exports.fromRequest({
                                            params: params,
                                            path:params.qstring.path,
                                            data:params.qstring.data,
                                            method:params.qstring.method,
                                            post:params.qstring.post,
                                            prop:params.qstring.prop,
                                            type: params.qstring.type,
                                            filename: params.qstring.filename
                                        });
                                    }, params);
                                    break;
                                case 'data':
                                    validateUserForMgmtReadAPI(function(){
                                        if (!params.qstring.data) {
                                            common.returnMessage(params, 400, 'Missing parameter "data"');
                                            return false;
                                        }
                                        if(typeof params.qstring.data === "string"){
                                            try{
                                                params.qstring.data = JSON.parse(params.qstring.data);
                                            }
                                            catch(ex){
                                                common.returnMessage(params, 400, 'Incorrect parameter "data"');
                                                return false;
                                            }
                                        }
                                        countlyApi.data.exports.fromData(params.qstring.data, {
                                            params: params,
                                            type: params.qstring.type,
                                            filename: params.qstring.filename
                                        });
                                    }, params);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path');
                                    break;
                            }
            
                            break;
                        }
                        case '/o/ping':
                        {
                            common.db.collection("plugins").findOne({_id:"plugins"}, {_id:1}, function(err, result){
                                if(err)
                                    common.returnMessage(params, 404, 'DB Error');
                                else
                                    common.returnMessage(params, 200, 'Success');
                            });
                            break;
                        }
                        case '/o/token':
                        {
                            var ttl;
                            if(params.qstring.ttl)
                               ttl = parseInt(params.qstring.ttl);
                            else
                                ttl = 1800;
                            validateUserForDataReadAPI(params, function(){
                                authorize.save({db:common.db, ttl:ttl, callback:function(err, token){
                                    if(err){
                                        common.returnMessage(params, 404, 'DB Error');
                                    }
                                    else{
                                        common.returnMessage(params, 200, token);
                                    }
                                }});
                            });
                            break;
                        }
                        case '/o':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            if (!params.qstring.app_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                                return false;
                            }
            
                            switch (params.qstring.method) {
                                case 'total_users':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTotalUsersObj, params.qstring.metric || 'users');
                                    break;
                                case 'get_period_obj':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.getPeriodObj, 'users');
                                    break;
                                case 'locations':
                                case 'sessions':
                                case 'users':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, 'users');
                                    break;
                                case 'app_versions':
                                case 'device_details':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, 'device_details');
                                    break;
                                case 'devices':
                                case 'carriers':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                                    break;
                                case 'cities':
                                    if (plugins.getConfig("api").city_data !== false) {
                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                                    } else {
                                        common.returnOutput(params, {});
                                    }
                                    break;
                                case 'events':
                                    if (params.qstring.events) {
                                        try {
                                            params.qstring.events = JSON.parse(params.qstring.events);
                                        } catch (SyntaxError) {
                                            console.log('Parse events array failed', params.qstring.events, req.url, req.body);
                                        }
            
                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
                                    } else {
                                        validateUserForDataReadAPI(params, countlyApi.data.fetch.prefetchEventData, params.qstring.method);
                                    }
                                    break;
                                case 'get_events':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCollection, 'events');
                                    break;
                                case 'all_apps':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchAllApps);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid method');
                                    break;
                            }
            
                            break;
                        }
                        case '/o/analytics':
                        {
                            if (!params.qstring.api_key) {
                                common.returnMessage(params, 400, 'Missing parameter "api_key"');
                                return false;
                            }
            
                            if (!params.qstring.app_id) {
                                common.returnMessage(params, 400, 'Missing parameter "app_id"');
                                return false;
                            }
            
                            switch (paths[3]) {
                                case 'dashboard':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDashboard);
                                    break;
                                case 'countries':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCountries);
                                    break;
                                case 'sessions':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchSessions);
                                    break;
                                case 'metric':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMetric);
                                    break;
                                case 'tops':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTops);
                                    break;
                                case 'loyalty':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchLoyalty);
                                    break;
                                case 'frequency':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchFrequency);
                                    break;
                                case 'durations':
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchDurations);
                                    break;
                                default:
                                    if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin}))
                                        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                                    break;
                            }
            
                            break;
                        }
                        default:
                            if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, validateUserForWriteAPI:validateUserForWriteAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin})){
                                if(!plugins.dispatch(params.fullPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, validateUserForWriteAPI:validateUserForWriteAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI, validateUserForGlobalAdmin:validateUserForGlobalAdmin})){
                                    common.returnMessage(params, 400, 'Invalid path');
                                }
                            }
                    }
                }
            };
            
            if(req.method.toLowerCase() == 'post'){
                var form = new formidable.IncomingForm();
                req.body = '';

                req.on('data', function (data) {
                    req.body += data;
                });
    
                form.parse(req, function(err, fields, files) {
                    params.files = files;
                    for(var i in fields){
                        params.qstring[i] = fields[i];
                    }
                    processRequest();
                });
            }
            else if (req.method === 'OPTIONS') {
                var headers = {};
                headers["Access-Control-Allow-Origin"] = "*";
                headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
                headers["Access-Control-Allow-Headers"] = "countly-token";
                res.writeHead(200, headers);
                res.end();
            }
            else
                //attempt process GET request
                processRequest();
        }, true);

    }).listen(common.config.api.port, common.config.api.host || '').timeout = common.config.api.timeout || 120000;

    plugins.loadConfigs(common.db);
}
