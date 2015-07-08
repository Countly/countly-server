require('log-timestamp');

var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
	countlyConfig = require('./config'),
    plugins = require('../plugins/pluginManager.js');
	
plugins.init();

http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

if (cluster.isMaster) {

    var workerCount = (countlyConfig.api.workers)? countlyConfig.api.workers : os.cpus().length;

    for (var i = 0; i < workerCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker) {
        cluster.fork();
    });
	
	plugins.dispatch("/master", {});

} else {

	var url = require('url'),
	querystring = require('querystring'),
    common = require('./utils/common.js'),
	crypto = require('crypto'),
    countlyApi = {
        data:{
            usage:require('./parts/data/usage.js'),
            fetch:require('./parts/data/fetch.js'),
            events:require('./parts/data/events.js')
        },
        mgmt:{
            users:require('./parts/mgmt/users.js'),
            apps:require('./parts/mgmt/apps.js')
        }
    };

	plugins.dispatch("/worker", {common:common});
	// Checks app_key from the http request against "apps" collection.
	// This is the first step of every write request to API.
	function validateAppForWriteAPI(params) {
		common.db.collection('apps').findOne({'key':params.qstring.app_key}, function (err, app) {
			if (!app) {
				if (common.config.api.safe) {
					common.returnMessage(params, 400, 'App does not exist');
				}
	
				return false;
			}
	
			params.app_id = app['_id'];
			params.app_cc = app['country'];
			params.app_name = app['name'];
			params.appTimezone = app['timezone'];
			params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
            
            if (params.qstring.location && params.qstring.location.length > 0) {
                var coords = params.qstring.location.split(',');
                if (coords.length === 2) {
                    var lat = parseFloat(coords[0]), lon = parseFloat(coords[1]);
    
                    if (!isNaN(lat) && !isNaN(lon)) {
                        params.user.lat = lat;
                        params.user.lng = lon;
                    }
                }
            }
            
            plugins.dispatch("/sdk", {params:params, app:app});
            if(!params.cancelRequest){
                //check if device id was changed
                if(params.qstring.old_device_id){
                    function restartRequest(){
                        //remove old device ID and retry request
                        params.qstring.old_device_id = null;
                        //retry request
                        validateAppForWriteAPI(params);
                    };
                    
                    var old_id = common.crypto.createHash('sha1').update(params.qstring.app_key + params.qstring.old_device_id + "").digest('hex');
                    //checking if there is an old user
                    common.db.collection('app_users' + params.app_id).findOne({'_id': old_id }, function (err, oldAppUser){
                        if(!err && oldAppUser){
                            //checking if there is a new user
                            common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id }, function (err, newAppUser){
                                if(!err && newAppUser){
                                    //merge user data
                                    if(!newAppUser.old)
                                        newAppUser.old = {};
                                    for(var i in oldAppUser){
                                        // sum up session count and total session duration
                                        if(i == "sc" || i == "tsd"){
                                            if(!newAppUser[i])
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
                                        else if(i == "custom"){
                                            if(!newAppUser[i])
                                                newAppUser[i] = {};
                                            if(!newAppUser.old[i])
                                                newAppUser.old[i] = {};
                                            for(var j in oldAppUser[i]){
                                                //set properties that new user does not have
                                                if(!newAppUser[i][j])
                                                    newAppUser[i][j] = oldAppUser[i][j];
                                                //preserve old property values
                                                else
                                                    newAppUser.old[i][j] = oldAppUser[i][j];
                                            }
                                        }
                                        //set other properties that new user does not have
                                        else if(i != "_id" && i != "did" && !newAppUser[i]){
                                            newAppUser[i] = oldAppUser[i];
                                        }
                                        //else preserve the old properties
                                        else{
                                            newAppUser.old[i] = oldAppUser[i];
                                        }
                                    }
                                    //update new user
                                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {'$set': newAppUser}, function() {
                                        //delete old user
                                        common.db.collection('app_users' + params.app_id).remove({_id:old_id}, function(){
                                            //let plugins know they need to merge user data
                                            plugins.dispatch("/i/device_id", {params:params, app:app, oldUser:oldAppUser, newUser:newAppUser});
                                            restartRequest();
                                        });
                                    });
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
                            });
                        }
                        else{
                            //process request
                            restartRequest();
                        }
                    });
                    
                    //do not proceed with request
                    return false;
                }
                
                plugins.dispatch("/i", {params:params, app:app});
        
                if (params.qstring.events) {
                    countlyApi.data.events.processEvents(params);
                } else if (common.config.api.safe) {
                    common.returnMessage(params, 200, 'Success');
                }
        
                if (params.qstring.begin_session) {
                    countlyApi.data.usage.beginUserSession(params);
                } else if (params.qstring.end_session) {
                    if (params.qstring.session_duration) {
                        countlyApi.data.usage.processSessionDuration(params, function () {
                            countlyApi.data.usage.endUserSession(params);
                        });
                    } else {
                        countlyApi.data.usage.endUserSession(params);
                    }
                } else if (params.qstring.session_duration) {
                    countlyApi.data.usage.processSessionDuration(params);
                } else {
                    // begin_session, session_duration and end_session handle incrementing request count in usage.js
                    var dbDateIds = common.getDateIds(params),
                        updateUsers = {};
        
                    common.fillTimeObjectMonth(params, updateUsers, common.dbMap['events']);
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month}, {'$inc': updateUsers}, {'upsert':true}, function(err, res){});
        
                    return false;
                }
            }
		});
	}
	
	function validateUserForWriteAPI(callback, params) {
		common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
			if (!member || err) {
				common.returnMessage(params, 401, 'User does not exist');
				return false;
			}
			params.member = member;
			callback(params);
		});
	}
	
	function validateUserForDataReadAPI(params, callback, callbackParam) {
		common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
			if (!member || err) {
				common.returnMessage(params, 401, 'User does not exist');
				return false;
			}
	
			if (!((member.user_of && member.user_of.indexOf(params.qstring.app_id) != -1) || member.global_admin)) {
				common.returnMessage(params, 401, 'User does not have view right for this application');
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
	
			common.db.collection('apps').findOne({'_id':common.db.ObjectID(params.qstring.app_id + "")}, function (err, app) {
				if (!app) {
					common.returnMessage(params, 401, 'App does not exist');
					return false;
				}
	
				params.app_id = app['_id'];
				params.appTimezone = app['timezone'];
				params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
				params.member = member;
	
				if (callbackParam) {
					callback(callbackParam, params);
				} else {
					callback(params);
				}
			});
		});
	}
	
	function validateUserForMgmtReadAPI(callback, params) {
		common.db.collection('members').findOne({'api_key':params.qstring.api_key}, function (err, member) {
			if (!member || err) {
				common.returnMessage(params, 401, 'User does not exist');
				return false;
			}
	
			params.member = member;
			callback(params);
		});
	}
    http.Server(function (req, res) {
        var urlParts = url.parse(req.url, true),
            queryString = urlParts.query,
            paths = urlParts.pathname.split("/"),
            apiPath = "",
            params = {
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
            plugins.dispatch("/", {params:params, apiPath:apiPath, validateAppForWriteAPI:validateAppForWriteAPI, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForDataWriteAPI:validateUserForDataWriteAPI, paths:paths});
    
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
                                console.log('Parse bulk JSON failed');
                            }
                        } else {
                            common.returnMessage(params, 400, 'Missing parameter "requests"');
                            return false;
                        }
                        for (var i = 0; i < requests.length; i++) {
            
                            if (!requests[i].app_key && !appKey) {
                                continue;
                            }
            
                            var tmpParams = {
                                'app_id':'',
                                'app_cc':'',
                                'ip_address':requests[i].ip_address || common.getIpAddress(req),
                                'user':{
                                    'country':requests[i].country_code || 'Unknown',
                                    'city':requests[i].city || 'Unknown'
                                },
                                'qstring':requests[i]
                            };
                            
                            tmpParams["qstring"]['app_key'] = requests[i].app_key || appKey;
            
                            if (!tmpParams.qstring.device_id) {
                                continue;
                            } else {
                                tmpParams.app_user_id = common.crypto.createHash('sha1').update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "").digest('hex');
                            }
            
                            if (tmpParams.qstring.metrics) {
                                if (tmpParams.qstring.metrics["_carrier"]) {
                                    tmpParams.qstring.metrics["_carrier"] = tmpParams.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                    });
                                }
            
                                if (tmpParams.qstring.metrics["_os"] && tmpParams.qstring.metrics["_os_version"]) {
                                    tmpParams.qstring.metrics["_os_version"] = tmpParams.qstring.metrics["_os"][0].toLowerCase() + tmpParams.qstring.metrics["_os_version"];
                                }
                            }
                            validateAppForWriteAPI(tmpParams);
                        }
            
                        common.returnMessage(params, 200, 'Success');
                        
                        break;
                    }
                    case '/i/users':
                    {
                        if (params.qstring.args) {
                            try {
                                params.qstring.args = JSON.parse(params.qstring.args);
                            } catch (SyntaxError) {
                                console.log('Parse ' + apiPath + ' JSON failed');
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
                                console.log('Parse ' + apiPath + ' JSON failed');
                            }
                        }
        
                        if (!params.qstring.api_key) {
                            common.returnMessage(params, 400, 'Missing parameter "api_key"');
                            return false;
                        }
        
                        switch (paths[3]) {
                            case 'create':
                                validateUserForWriteAPI(countlyApi.mgmt.apps.createApp, params);
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
                                common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
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
        
                        if (params.qstring.metrics) {
                            try {
                                params.qstring.metrics = JSON.parse(params.qstring.metrics);
        
                                if (params.qstring.metrics["_carrier"]) {
                                    params.qstring.metrics["_carrier"] = params.qstring.metrics["_carrier"].replace(/\w\S*/g, function (txt) {
                                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                    });
                                }
        
                                if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
                                    params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
                                }
        
                            } catch (SyntaxError) {
                                console.log('Parse metrics JSON failed');
                            }
                        }
        
                        if (params.qstring.events) {
                            try {
                                params.qstring.events = JSON.parse(params.qstring.events);
                            } catch (SyntaxError) {
                                console.log('Parse events JSON failed');
                            }
                        }
        
                        validateAppForWriteAPI(params);
        
                        if (!common.config.api.safe) {
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
                            default:
                                common.returnMessage(params, 400, 'Invalid path, must be one of /all or /mine');
                                break;
                        }
        
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
                                if (common.config.api.city_data !== false) {
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
                                        console.log('Parse events array failed');
                                    }
        
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
                                } else {
                                    validateUserForDataReadAPI(params, countlyApi.data.fetch.prefetchEventData, params.qstring.method);
                                }
                                break;
                            case 'get_events':
                                validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchCollection, 'events');
                                break;
                            default:
                                if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, validateUserForDataWriteAPI:validateUserForDataWriteAPI}))
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
                                if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI}))
                                    common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                                break;
                        }
        
                        break;
                    }
                    default:
                        if(!plugins.dispatch(apiPath, {params:params, validateUserForDataReadAPI:validateUserForDataReadAPI, validateUserForMgmtReadAPI:validateUserForMgmtReadAPI, validateUserForWriteAPI:validateUserForWriteAPI, paths:paths, validateUserForDataWriteAPI:validateUserForDataWriteAPI}))
                            common.returnMessage(params, 400, 'Invalid path');
                }
            }
        };
        
        if(req.method.toLowerCase() == 'post'){
			var body = "";
			req.on('data', function(chunk) {
				body += chunk.toString();
			});
			
			req.on('end', function() {					
				// parse the received body data
                params.qstring = querystring.parse(body);
				processRequest();
			});
		}
		else
			//attempt process GET request
			processRequest();

    }).listen(common.config.api.port, common.config.api.host || '');
}