var http = require('http'),
    cluster = require('cluster'),
    os = require('os'),
    url = require('url'),
    common = require('./utils/common.js'),
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

http.globalAgent.maxSockets = common.config.api.max_sockets || 1024;

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
        params.appTimezone = app['timezone'];
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

        var updateSessions = {};
        common.fillTimeObject(params, updateSessions, common.dbMap['events']);
        common.db.collection('sessions').update({'_id':params.app_id}, {'$inc':updateSessions}, {'upsert':true}, function(err, res){});

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
            return false;
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

if (cluster.isMaster) {

    var workerCount = (common.config.api.workers)? common.config.api.workers : os.cpus().length;

    for (var i = 0; i < workerCount; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker) {
        cluster.fork();
    });

} else {

    http.Server(function (req, res) {

        var urlParts = url.parse(req.url, true),
            queryString = urlParts.query,
            paths = urlParts.pathname.split("/"),
            apiPath = "",
            params = {
                'qstring':queryString,
                'res':res
            };

        if (queryString.app_id && queryString.app_id.length != 24) {
            common.returnMessage(params, 400, 'Invalid parameter "app_id"');
            return false;
        }

        if (queryString.user_id && queryString.user_id.length != 24) {
            common.returnMessage(params, 400, 'Invalid parameter "user_id"');
            return false;
        }

        for (var i = 1; i < paths.length; i++) {
            if (i > 2) {
                break;
            }

            apiPath += "/" + paths[i];
        }

        switch (apiPath) {
            case '/i/bulk':
            {

                var requests = queryString.requests,
                    appKey = queryString.app_key;

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
                        'ip_address':requests[i].ip_address,
                        'user':{
                            'country':requests[i].country_code || 'Unknown',
                            'city':requests[i].city || 'Unknown'
                        },
                        'qstring':{
                            'app_key':requests[i].app_key || appKey,
                            'device_id':requests[i].device_id,
                            'metrics':requests[i].metrics,
                            'events':requests[i].events,
                            'session_duration':requests[i].session_duration,
                            'begin_session':requests[i].begin_session,
                            'end_session':requests[i].end_session,
                            'timestamp':requests[i].timestamp
                        }
                    };

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
                var ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

                params.ip_address =  params.qstring.ip_address || ipAddress.split(",")[0];
                params.user = {
                    'country':'Unknown',
                    'city':'Unknown'
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
                    case 'locations':
                    case 'sessions':
                    case 'users':
                    case 'devices':
                    case 'device_details':
                    case 'carriers':
                    case 'app_versions':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
                        break;
                    case 'cities':
                        if (common.config.api.city_data === true) {
                            validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchTimeData, params.qstring.method);
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
                    default:
                        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                        break;
                }

                break;
            }
        }

    }).listen(common.config.api.port, common.config.api.host || '');
}