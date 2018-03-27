/**
* Module for processing data passed to Countly
* @module api/utils/requestProcessor
*/

const Promise = require('bluebird');
const url = require('url');
const common = require('./common.js');
const {validateUser, validateUserForRead, validateUserForWrite, validateGlobalAdmin} = require('./rights.js');
const authorize = require('./authorizer.js');
const taskmanager = require('./taskmanager.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const log = require('./log.js')('core:api');
const fs = require('fs');
var path = require('path');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateUserForRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;


const countlyApi = {
    data: {
        usage: require('../parts/data/usage.js'),
        fetch: require('../parts/data/fetch.js'),
        events: require('../parts/data/events.js'),
        exports: require('../parts/data/exports.js')
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
        apps: require('../parts/mgmt/apps.js'),
        appUsers:require('../parts/mgmt/app_users.js')
    }
};

/**
 * Default request processing handler, which requires request context to operate. Check tcp_example.js
 * @static
 * @param {params} params - for request context. Minimum needed properties listed
 * @param {object} params.req - Request object, should not be empty and should contain listed params
 * @param {string} params.req.url - Endpoint URL that you are calling. May contain query string.
 * @param {object} params.req.body - Parsed JSON object with data (same name params will overwrite query string if anything provided there)
 * @param {APICallback} params.APICallback - API output handler. Which should handle API response
 * @example
 * //creating request context
 * var params = {
 *     //providing data in request object
 *     'req':{"url":"/i", "body":{"device_id":"test","app_key":"APP_KEY","begin_session":1,"metrics":{}}},
 *     //adding custom processing for API responses
 *     'APICallback': function(err, data, headers, returnCode, params){
 *          //handling api response, like sending to client or verifying
 *          if(err){
 *              //there was problem processing request
 *              console.log(data, returnCode);
 *          }
 *          else{
 *              //request was processed, let's handle response data
 *              handle(data);
 *          }
 *     }
 * };
 * 
 * //processing request
 * processRequest(params);
 */
const processRequest = (params) => {
    if(!params.req || !params.req.url){
        return common.returnMessage(params, 400, "Please provide request data");
    }
    const urlParts = url.parse(params.req.url, true),
    queryString = urlParts.query,
    paths = urlParts.pathname.split("/");
    /**
     * Main request processing object containing all information shared through all the parts of the same request
     * @typedef params
     * @type {object}
     * @global
     * @property {string} href - full URL href
     * @property {res} res - nodejs response object
     * @property {req} req - nodejs request object
     * @param {APICallback} params.APICallback - API output handler. Which should handle API response
     * @property {object} qstring - all the passed fields either through query string in GET requests or body and query string for POST requests
     * @property {string} apiPath - two top level url path, for example /i/analytics
     * @property {string} fullPath - full url path, for example /i/analytics/dashboards
     * @property {object} files - object with uploaded files, available in POST requests which upload files
     * @property {string} cancelRequest - Used for skipping SDK requests, if contains true, then request should be ignored and not processed. Can be set at any time by any plugin, but API only checks for it in beggining after / and /sdk events, so that is when plugins should set it if needed. Should contain reason for request cancelation
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
    params.href = urlParts.href;
    params.qstring = params.qstring || {};
    params.res = params.res || {};
    params.urlParts = urlParts;
    params.paths = paths;
    
    //request object fillers
    params.req.method = params.req.method || "custom";
    params.req.headers = params.req.headers || {};
    params.req.socket = params.req.socket || {};
    params.req.connection = params.req.connection || {};
    params.req.connection = params.req.connection || {};
    
    //copying query string data as qstring param
    if(queryString){
        for(var i in queryString){
            params.qstring[i] = queryString[i];
        }
    }
    
    //copying body as qstring param
    if(params.req.body && typeof params.req.body === "object"){
        for(var i in params.req.body){
            params.qstring[i] = params.req.body[i];
        }
    }

    if (params.qstring.app_id && params.qstring.app_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "app_id"');
        return false;
    }

    if (params.qstring.user_id && params.qstring.user_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "user_id"');
        return false;
    }

    //remove countly path
    if (common.config.path === "/" + paths[1]) {
        paths.splice(1, 1);
    }

    let apiPath = '';
    
    for (let i = 1; i < paths.length; i++) {
        if (i > 2) {
            break;
        }

        apiPath += "/" + paths[i];
    }

    params.apiPath = apiPath;
    params.fullPath = paths.join("/");

    plugins.dispatch("/", {
        params: params,
        apiPath: apiPath,
        validateAppForWriteAPI: validateAppForWriteAPI,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin,
        paths: paths,
        urlParts: urlParts
    });

    if (!params.cancelRequest) {
        switch (apiPath) {
            case '/i/bulk': {
                let requests = params.qstring.requests;

                if (requests && typeof requests === "string") {
                    try {
                        requests = JSON.parse(requests);
                    } catch (SyntaxError) {
                        console.log('Parse bulk JSON failed', requests, params.req.url, params.req.body);
                        requests = null;
                    }
                }
                if (!requests) {
                    common.returnMessage(params, 400, 'Missing parameter "requests"');
                    return false;
                }
                if (!plugins.getConfig("api").safe && !params.res.finished) {
                    common.returnMessage(params, 200, 'Success');
                }
                common.blockResponses(params);

                processBulkRequest(0, requests, params);
                break;
            }
            case '/i/users': {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    } catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed', params.req.url, params.req.body);
                    }
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
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update or /delete');
                        break;
                }

                break;
            }
            case '/i/app_users':{
                switch (paths[3]) {
                    case 'deleteExport':{
                        validateUserForWrite(params, function(){
                            countlyApi.mgmt.appUsers.deleteExport(paths[4],params,function(err,res){
                                if(err)
                                    common.returnMessage(params, 400, err);
                                else
                                   common.returnMessage(params, 200, 'Export deleted'); 
                            });
                        });
                        break;
                    }
                    case 'export':{
                        if (!params.qstring.app_id) {
                            common.returnMessage(params, 400, 'Missing parameter "app_id"');
                            return false;
                        }
                        validateUserForWrite(params, function(){
                            taskmanager.checkIfRunning({
                                db:common.db,
                                params: params //allow generate request from params, as it is what identifies task in drill
                            }, function(task_id){
                                //check if task already running
                                if(task_id){
                                    common.returnOutput(params, {task_id:task_id});
                                }
                                else{
                                    countlyApi.mgmt.appUsers.export(params.qstring.app_id,params.qstring.query || {},params, taskmanager.longtask({
                                        db:common.db, 
                                        threshold:plugins.getConfig("api").request_threshold, 
                                        force:false,
                                        app_id:params.qstring.app_id,
                                        params: params,
                                        type:"AppUserExport", 
                                        meta:"User export",
                                        view:"#/users/",
                                        processData:function(err, res, callback){
                                            if(!err)
                                                callback(null, res);
                                            else
                                                callback(err, '');
                                        },
                                        outputData:function(err, data){
                                            if(err)
                                            {
                                                common.returnMessage(params, 400, err);
                                            }
                                            else
                                            {
                                                common.returnMessage(params, 200, data);
                                            }
                                        }
                                    }));
                                }
                            });
                        });
                        break;
                    }
                    default:
                        common.returnMessage(params, 400, 'Invalid path');
                }
                break;
            }
            case '/i/apps': {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    } catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed', params.req.url, params.req.body);
                    }
                }

                switch (paths[3]) {
                    case 'create':
                        validateUserForWriteAPI((params) => {
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
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
                        break;
                }

                break;
            }
            case '/i/tasks': {
                if (!params.qstring.task_id) {
                    common.returnMessage(params, 400, 'Missing parameter "task_id"');
                    return false;
                }

                switch (paths[3]) {
                    case 'update':
                        validateUserForWrite(params, () => {
                            taskmanager.rerunTask({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                common.returnMessage(params, 200, res);
                            });
                        });
                        break;
                    case 'delete':
                        validateUserForWrite(params, () => {
                            taskmanager.deleteResult({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                common.returnMessage(params, 200, "Success");
                            });
                        });
                        break;
                    case 'name':
                        validateUserForWrite(params, () => {
                            taskmanager.deleteResult({
                                db: common.db,
                                id: params.qstring.task_id,
                                name: params.qstring.name
                            }, (err, res) => {
                                common.returnMessage(params, 200, "Success");
                            });
                        });
                        break;
                    default:
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path');
                        break;
                }

                break;
            }
            case '/i/events':
            {
                switch (paths[3]) {
                    case 'edit_map':
                    {
                        validateUserForWrite(params, function(){
                            common.db.collection('events').findOne({"_id":common.db.ObjectID(params.qstring.app_id)}, function (err, event) {
                                var update_array = {};
                                if(params.qstring.event_order && params.qstring.event_order!="")
                                {
                                    try{update_array['order'] = JSON.parse(params.qstring.event_order);}
                                    catch (SyntaxError) {update_array['order'] = event.order; console.log('Parse ' + params.qstring.event_order + ' JSON failed', params.req.url, params.req.body);}
                                }
                                else
                                    update_array['order'] = event.order || [];
            
                                if(params.qstring.event_overview && params.qstring.event_overview!="")
                                {
                                    try{update_array['overview']= JSON.parse(params.qstring.event_overview);}
                                    catch (SyntaxError) {update_array['overview']=[]; console.log('Parse ' + params.qstring.event_overview + ' JSON failed', req.url, req.body);}
                                    if(update_array['overview'] && Array.isArray(update_array['overview']) && update_array['overview'].length>12)
                                    {
                                        common.returnMessage(params, 400, "You can't add more than 12 items in overview");
                                        return;
                                    }
                                    //check for duplicates
                                    var overview_map = {};
                                    for(var p=0; p<update_array['overview'].length; p++)
                                    {
                                        if(!overview_map[update_array['overview'][p]["eventKey"]])
                                           overview_map[update_array['overview'][p]["eventKey"]]={} 
                                        if(!overview_map[update_array['overview'][p]["eventKey"]][update_array['overview'][p]["eventProperty"]])
                                           overview_map[update_array['overview'][p]["eventKey"]][update_array['overview'][p]["eventProperty"]] = 1;
                                        else  
                                        {
                                            update_array['overview'].splice(p,1);
                                            p=p-1;
                                        }  
                                    }
                                }
                                else
                                    update_array['overview'] = event.overview || [];
                                    
                                
                                if(params.qstring.event_map && params.qstring.event_map!="")
                                {
                                    try{params.qstring.event_map = JSON.parse(params.qstring.event_map);}
                                    catch (SyntaxError) {params.qstring.event_map={}; console.log('Parse ' + params.qstring.event_map + ' JSON failed', params.req.url, params.req.body);}
                                    
                                    if(event.map)
                                       try{ update_array['map'] = JSON.parse(JSON.stringify(event.map));} catch (SyntaxError) {update_array['map'] = {};}
                                    else
                                        update_array['map'] = {};
                                    
                                    
                                    for (var k in params.qstring.event_map){
                                        if (params.qstring.event_map.hasOwnProperty(k)) {
                                            update_array['map'][k] = params.qstring.event_map[k];
                                            
                                            if(update_array['map'][k]['is_visible'] && update_array['map'][k]['is_visible']==true)
                                                delete update_array['map'][k]['is_visible'];
                                            if(update_array['map'][k]['name'] && update_array['map'][k]['name']==k)
                                                delete update_array['map'][k]['name'];
                                            
                                            if(update_array['map'][k] && typeof update_array['map'][k]['is_visible'] !== 'undefined' && update_array['map'][k]['is_visible']==false)
                                            {
                                                for(var j=0; j<update_array['overview'].length; j++)
                                                {
                                                    if(update_array['overview'][j].eventKey == k)
                                                    {
                                                        update_array['overview'].splice(j,1);
                                                        j=j-1;
                                                    }
                                                }
                                            }
                                            if(Object.keys(update_array['map'][k]).length==0)
                                                delete update_array['map'][k];
                                        }                                                    
                                    }
                                }
            
                                common.db.collection('events').update({"_id":common.db.ObjectID(params.qstring.app_id)}, {'$set':update_array}, function (err, events) {
                                    if(err){
                                        common.returnMessage(params, 400, err);
                                    }
                                    else
                                    {
                                        common.returnMessage(params, 200, 'Success');
                                        var data_arr = {update:update_array};
                                        data_arr.before = {order:[],map:{},overview:[]};
                                        if(event.order)
                                            data_arr.before.order = event.order;
                                        if(event.map)
                                             data_arr.before.map = event.map;
                                        if(event.overview)
                                             data_arr.before.overview = event.overview;
                                        plugins.dispatch("/systemlogs", {params:params, action:"events_updated", data:data_arr});
                                    }
                                });
                            });
                        });
                        break;
                    }
                    case 'delete_events':
                    {
                        validateUserForWrite(params, function(){
                            var idss =[];
                            try{idss=JSON.parse(params.qstring.events);}catch(SyntaxError){idss=[];}
                            var app_id = params.qstring.app_id;
                            var updateThese = {
                                "$unset": {}
                            };
                            for(var i=0; i<idss.length; i++)
                            {
                               
                                if(idss[i].indexOf('.') != -1){
                                    updateThese["$unset"]["map." + idss[i].replace(/\./g,':')] = 1;
                                    updateThese["$unset"]["segments." + idss[i].replace(/\./g,':')] = 1;
                                }
                                else{
                                    updateThese["$unset"]["map." + idss[i]] = 1;
                                    updateThese["$unset"]["segments." + idss[i]] = 1;
                                }
                            }
                            
                            common.db.collection('events').findOne({"_id":common.db.ObjectID(params.qstring.app_id)}, function (err, event) {
                                if(err)
                                {
                                    console.log(err);
                                    common.returnMessage(params, 400, err);
                                }
                                 //fix overview
                                if(event.overview && event.overview.length)
                                {
                                    for(var i=0; i<idss.length; i++)
                                    {
                                        for(var j=0; j<event.overview.length; j++)
                                        {
                                            if(event.overview[j].eventKey == idss[i])
                                            {
                                                event.overview.splice(j,1);
                                                j=j-1;
                                             }
                                        }
                                    }
                                    if(!updateThese["$set"])
                                        updateThese["$set"] = {};
                                    updateThese["$set"]["overview"] = event.overview;
                                }
                                
                                //remove from list
                                if(typeof event.list !== 'undefined' && Array.isArray(event.list) && event.list.length>0)
                                {
                                    for(var i=0; i<idss.length; i++)
                                    {
                                        var index = event.list.indexOf(idss[i]);
                                        if(index>-1)
                                        {
                                           event.list.splice(index, 1);
                                            i = i-1;
                                        }
                                    }
                                    if(!updateThese["$set"])
                                        updateThese["$set"] = {};
                                    updateThese["$set"]["list"] = event.list;
                                }
                                //remove from order
                                if(typeof event.order !== 'undefined' && Array.isArray(event.order) && event.order.length>0)
                                {
                                    for(var i=0; i<idss.length; i++)
                                    {
                                        var index = event.order.indexOf(idss[i]);
                                        if(index>-1)
                                        {
                                           event.order.splice(index, 1);
                                            i = i-1;
                                        }
                                    }
                                    if(!updateThese["$set"])
                                        updateThese["$set"] = {};
                                    updateThese["$set"]["order"] = event.order;
                                }
                                
                                common.db.collection('events').update({"_id":common.db.ObjectID(app_id)}, updateThese, function (err, events) {
                                    if(err)
                                    {
                                        console.log(err);
                                        common.returnMessage(params, 400, err);
                                    }
                                    else
                                    {
                                        for(var i=0; i<idss.length; i++)
                                        {
                                            var collectionNameWoPrefix = common.crypto.createHash('sha1').update(idss[i] + app_id).digest('hex');
                                            common.db.collection("events" + collectionNameWoPrefix).drop();
                                            plugins.dispatch("/i/event/delete", {event_key:idss[i],appId:app_id});
                                        }
                                        plugins.dispatch("/systemlogs", {params:params, action:"event_deleted", data:{events:idss,appID:app_id}});
                                        common.returnMessage(params, 200, 'Success');
                                    }
                                });  
                            });
                        });
                        break;
                    }
                    case 'change_visibility':
                    {
                        validateUserForWrite(params, function(){
                            common.db.collection('events').findOne({"_id":common.db.ObjectID(params.qstring.app_id)}, function (err, event) {
                                var update_array = {};
                                 var idss =[];
                                try{idss=JSON.parse(params.qstring.events);}catch(SyntaxError){idss=[];}
                               
                                if(event.map)
                                {
                                    try{ update_array['map'] = JSON.parse(JSON.stringify(event.map));}
                                    catch(SyntaxError){
                                        update_array['map'] = {};
                                        console.log('Parse ' + event.map + ' JSON failed', req.url, req.body);
                                    }
                                }
                                else
                                    update_array['map'] = {};
                                
                                for (var i=0; i<idss.length; i++){
                                
                                    if(!update_array['map'][idss[i]])
                                        update_array['map'][idss[i]]={};
                                            
                                    if(params.qstring.set_visibility=='hide')
                                        update_array['map'][idss[i]]['is_visible'] = false;
                                    else
                                        update_array['map'][idss[i]]['is_visible'] = true;
                                    
                                    if(update_array['map'][idss[i]]['is_visible'])
                                        delete update_array['map'][idss[i]]['is_visible'];
                                    
                                    if(Object.keys(update_array['map'][idss[i]]).length==0)
                                        delete update_array['map'][idss[i]];
                                     
                                    if(params.qstring.set_visibility=='hide')
                                    {
                                        for(var j=0; j<event.overview.length; j++)
                                        {
                                            if(event.overview[j].eventKey == idss[i])
                                            {
                                                event.overview.splice(j,1);
                                                j=j-1;
                                            }
                                        }
                                        update_array['overview'] = event.overview;
                                    }
                                }
                                common.db.collection('events').update({"_id":common.db.ObjectID(params.qstring.app_id)}, {'$set':update_array}, function (err, events) {
                                
                                    if(err){
                                        common.returnMessage(params, 400, err);
                                    }
                                    else
                                    {
                                        common.returnMessage(params, 200, 'Success');
                                        var data_arr = {update:update_array};
                                        data_arr.before = {map:{}};
                                        if(event.map)
                                             data_arr.before.map = event.map;
                                        plugins.dispatch("/systemlogs", {params:params, action:"events_updated", data:data_arr});
                                    }
                                });
                            });
                        });
                        break;
                    }
                }
                break;
            }
            case '/i': {
                params.ip_address = params.qstring.ip_address || common.getIpAddress(params.req);
                params.user = {};

                if (!params.qstring.app_key || !params.qstring.device_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                    return false;
                } else {
                    //make sure device_id is string
                    params.qstring.device_id += "";
                    // Set app_user_id that is unique for each user of an application.
                    params.app_user_id = common.crypto.createHash('sha1')
                    .update(params.qstring.app_key + params.qstring.device_id + "")
                    .digest('hex');
                }

                if (params.qstring.events) {
                    try {
                        params.qstring.events = JSON.parse(params.qstring.events);
                    } catch (SyntaxError) {
                        console.log('Parse events JSON failed', params.qstring.events, params.req.url, params.req.body);
                    }
                }

                log.d('processing request %j', params.qstring);

                params.promises = [];

                validateAppForWriteAPI(params, () => {
                    function resolver() {
                        plugins.dispatch("/sdk/end", {params: params});
                    }

                    Promise.all(params.promises)
                    .then(resolver)
                    .catch((error) => {
                        console.log(error);
                        resolver();
                    });
                });

                if (!plugins.getConfig("api").safe && !params.res.finished) {
                    common.returnMessage(params, 200, 'Success');
                }

                break;
            }
            case '/o/users': {
                switch (paths[3]) {
                    case 'all':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.users.getAllUsers, params);
                        break;
                    case 'me':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
                        break;
                    case 'id':
                        validateUserForMgmtReadAPI(countlyApi.mgmt.users.getUserById, params);
                        break;
                    default:
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                        break;
                }

                break;
            }
            case '/o/app_users':{
                switch (paths[3]) {
                    case 'download':{
                        if(paths[4] && paths[4]!='')
                        {
                            validateUserForRead(params, function(){
                                var filename = paths[4].split('.');
                                var myfile = '../../export/AppUser/'+filename[0]+'.tar.gz';
                                fs.stat(myfile,function(err,stat)
                                {
                                    if(err)
                                    {
                                        common.returnMessage(params, 400, "Export doesn't exist");
                                    }
                                    else
                                    {
                                        var readStream = fs.createReadStream(myfile);
                                        params.res.writeHead(200, {
                                            'Content-Type': 'application/x-gzip',
                                            'Content-Length': stat.size
                                            });
                                        readStream.pipe(params.res);
                                    }
                                });
                            });
                        }
                        else
                            common.returnMessage(params, 400, 'Missing filename');
                        break;
                    }
                    case 'search':{
                        if (!params.qstring.app_id) {
                            common.returnMessage(params, 400, 'Missing parameter "app_id"');
                            return false;
                        }
                        validateUserForRead(params, function(){
                            countlyApi.mgmt.appUsers.count(params.qstring.app_id, {}, function(err,total){
                                if(err)
                                    common.returnMessage(params, 400, err);
                                else if(total > 0){
                                    params.qstring.query = params.qstring.query || params.qstring.filter || {};
                                    params.qstring.project = params.qstring.project || params.qstring.projection || {"cc":1, "d":1, "av":1, "sc":1, "ls":1, "tsd":1};
                                    
                                    var columns = ["cc", "d", "av", "sc", "ls", "tsd"];
                                    var ob;
                                    if(params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0]){
                                        ob = {};
                                        if(columns[params.qstring.iSortCol_0] === "ls"){
                                            ob["lac"] = (params.qstring.sSortDir_0 == "asc") ? 1 : -1;
                                            ob["ls"] = (params.qstring.sSortDir_0 == "asc") ? 1 : -1;
                                        }
                                        else{
                                            ob[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 == "asc") ? 1 : -1;
                                        }
                                    }
                                    params.qstring.sort = ob || params.qstring.sort || {};
                                    countlyApi.mgmt.appUsers.search(params.qstring.app_id, params.qstring.query, params.qstring.project, params.qstring.sort, params.qstring.limit, params.qstring.skip, function(err, items){
                                        if(err)
                                            common.returnMessage(params, 400, err);
                                        else{
                                            var item;
                                            for(var i = items.length-1; i >= 0; i--){
                                                item = items[i];
                                                if(item.ls && item.lac){
                                                    if(Math.round(item.lac/1000) > item.ls)
                                                        item.ls = Math.round(item.lac/1000);
                                                }
                                                else if(item.lac){
                                                    item.ls = Math.round(item.lac/1000);
                                                }
                                            }
                                            common.returnOutput(params, {sEcho:params.qstring.sEcho, iTotalRecords:total, iTotalDisplayRecords:total, aaData:items});
                                        }
                                    });
                                }
                                else{
                                    common.returnOutput(params, {sEcho:params.qstring.sEcho, iTotalRecords:total, iTotalDisplayRecords:total, aaData:[]});
                                }
                            });
                        });
                        break;
                    }
                    default:
                        common.returnMessage(params, 400, 'Invalid path');
                }
                break;
            }
            case '/o/apps': {
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
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path, must be one of /all , /mine or /details');
                        break;
                }

                break;
            }
            case '/o/tasks': {
                switch (paths[3]) {
                    case 'all':
                        validateUserForMgmtReadAPI(() => {
                            if (typeof params.qstring.query === "string") {
                                try {
                                    params.qstring.query = JSON.parse(params.qstring.query);
                                }
                                catch (ex) {
                                    params.qstring.query = {};
                                }
                            }
                            params.qstring.query['$or'] = [{"global":{"$ne":false}}, {"creator": params.member._id + ""}]
                            params.qstring.query.app_id = params.qstring.app_id;
                            taskmanager.getResults({db: common.db, query: params.qstring.query}, (err, res) => {
                                common.returnOutput(params, res || []);
                            });
                        }, params);
                        break;
                    case 'task':
                        validateUserForMgmtReadAPI(() => {
                            if (!params.qstring.task_id) {
                                common.returnMessage(params, 400, 'Missing parameter "task_id"');
                                return false;
                            }
                            taskmanager.getResult({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                if (res) {
                                    common.returnOutput(params, res);
                                }
                                else {
                                    common.returnMessage(params, 400, 'Task does not exist');
                                }
                            });
                        }, params);
                        break;
                    case 'check':
                        validateUserForMgmtReadAPI(() => {
                            if (!params.qstring.task_id) {
                                common.returnMessage(params, 400, 'Missing parameter "task_id"');
                                return false;
                            }
                            taskmanager.checkResult({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                if (res) {
                                    common.returnMessage(params, 200, res.status);
                                }
                                else {
                                    common.returnMessage(params, 400, 'Task does not exist');
                                }
                            });
                        }, params);
                        break;
                    default:
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path');
                        break;
                }

                break;
            }
            case '/o/system': {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    return false;
                }

                switch (paths[3]) {
                    case 'version':
                        validateUserForMgmtReadAPI(() => {
                            common.returnOutput(params, {"version": versionInfo.version});
                        }, params);
                        break;
                    case 'plugins':
                        validateUserForMgmtReadAPI(() => {
                            common.returnOutput(params, plugins.getPlugins());
                        }, params);
                        break;
                    default:
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path');
                        break;
                }

                break;
            }
            case '/o/export': {
                if (!params.qstring.api_key) {
                    common.returnMessage(params, 400, 'Missing parameter "api_key"');
                    return false;
                }

                switch (paths[3]) {
                    case 'db':
                        validateUserForMgmtReadAPI(() => {
                            if (!params.qstring.collection) {
                                common.returnMessage(params, 400, 'Missing parameter "collection"');
                                return false;
                            }
                            if (typeof params.qstring.query === "string") {
                                try {
                                    params.qstring.query = JSON.parse(params.qstring.query, common.reviver);
                                }
                                catch (ex) {
                                    params.qstring.query = null;
                                }
                            }
                            if (typeof params.qstring.filter === "string"){
                                try{
                                    params.qstring.query = JSON.parse(params.qstring.filter, common.reviver);
                                }
                                catch(ex){params.qstring.query = null;}
                            }
                            if (typeof params.qstring.projection === "string") {
                                try {
                                    params.qstring.projection = JSON.parse(params.qstring.projection);
                                }
                                catch (ex) {
                                    params.qstring.projection = null;
                                }
                            }
                            if(typeof params.qstring.project === "string"){
                                try{
                                    params.qstring.projection = JSON.parse(params.qstring.project);
                                }
                                catch(ex){params.qstring.projection = null;}
                            }
                            if (typeof params.qstring.sort === "string") {
                                try {
                                    params.qstring.sort = JSON.parse(params.qstring.sort);
                                }
                                catch (ex) {
                                    params.qstring.sort = null;
                                }
                            }
                            countlyApi.data.exports.fromDatabase({
                                db: (params.qstring.db === "countly_drill") ? common.drillDb : (params.qstring.dbs === "countly_drill") ? common.drillDb : common.db,
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
                        validateUserForMgmtReadAPI(() => {
                            if (!params.qstring.path) {
                                common.returnMessage(params, 400, 'Missing parameter "path"');
                                return false;
                            }
                            if (typeof params.qstring.data === "string") {
                                try {
                                    params.qstring.data = JSON.parse(params.qstring.data);
                                }
                                catch (ex) {
                                    params.qstring.data = {};
                                }
                            }
                            countlyApi.data.exports.fromRequest({
                                params: params,
                                path: params.qstring.path,
                                data: params.qstring.data,
                                method: params.qstring.method,
                                post: params.qstring.post,
                                prop: params.qstring.prop,
                                type: params.qstring.type,
                                filename: params.qstring.filename
                            });
                        }, params);
                        break;
                    case 'data':
                        validateUserForMgmtReadAPI(() => {
                            if (!params.qstring.data) {
                                common.returnMessage(params, 400, 'Missing parameter "data"');
                                return false;
                            }
                            if (typeof params.qstring.data === "string" && !params.qstring.raw) {
                                try {
                                    params.qstring.data = JSON.parse(params.qstring.data);
                                }
                                catch (ex) {
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
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path');
                        break;
                }

                break;
            }
            case '/o/ping': {
                common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}, (err) => {
                    if (err)
                        return common.returnMessage(params, 404, 'DB Error');
                    else
                        return common.returnMessage(params, 200, 'Success');
                });
                break;
            }
            case '/o/token': {
                let ttl, multi;
                if (params.qstring.ttl)
                    ttl = parseInt(params.qstring.ttl);
                else
                    ttl = 1800;

                multi = !!params.qstring.multi;

                validateUserForDataReadAPI(params, () => {
                    authorize.save({
                        db: common.db,
                        ttl: ttl,
                        multi: multi,
                        owner: params.member._id + "",
                        app: params.app_id + "",
                        callback: (err, token) => {
                            if (err) {
                                common.returnMessage(params, 404, 'DB Error');
                            }
                            else {
                                common.returnMessage(params, 200, token);
                            }
                        }
                    });
                });
                break;
            }
            case '/o': {
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
                                console.log('Parse events array failed', params.qstring.events, params.req.url, params.req.body);
                            }
                            if(params.qstring.overview)
                            {
                                validateUserForDataReadAPI(params, function(){
                                    countlyApi.data.fetch.fetchDataEventsOverview(params);
                                });
                            }
                            else
                            {
                                validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchMergedEventData);
                            }
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
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid method');
                        break;
                }

                break;
            }
            case '/o/analytics': {
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
                    case 'events':
                        validateUserForDataReadAPI(params, countlyApi.data.fetch.fetchEvents);
                        break;
                    default:
                        if (!plugins.dispatch(apiPath, {
                                params: params,
                                validateUserForDataReadAPI: validateUserForDataReadAPI,
                                validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                                paths: paths,
                                validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                                validateUserForGlobalAdmin: validateUserForGlobalAdmin
                            }))
                            common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                        break;
                }

                break;
            }
            default:
                if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        validateUserForWriteAPI: validateUserForWriteAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                    if (!plugins.dispatch(params.fullPath, {
                            params: params,
                            validateUserForDataReadAPI: validateUserForDataReadAPI,
                            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                            validateUserForWriteAPI: validateUserForWriteAPI,
                            paths: paths,
                            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                            validateUserForGlobalAdmin: validateUserForGlobalAdmin
                        })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                }
        }
    } else {
        if (plugins.getConfig("api").safe && !params.res.finished) {
            common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
        }
        common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
    }
};

/**
 * Process Request Data
 */
const processRequestData = (params, app, done) => {
    plugins.dispatch("/i", {params: params, app: app});

    if (params.qstring.events) {
        if (params.promises)
            params.promises.push(countlyApi.data.events.processEvents(params));
        else
            countlyApi.data.events.processEvents(params);
    } else if (plugins.getConfig("api").safe && !params.bulk) {
        common.returnMessage(params, 200, 'Success');
    }

    if (countlyApi.data.usage.processLocationRequired(params)) {
        countlyApi.data.usage.processLocation(params).then(() => continueProcessingRequestData(params, done));
    } else {
        continueProcessingRequestData(params, done);
    }
};

/**
 * Continue Processing Request Data
 * @returns {boolean}
 */
const continueProcessingRequestData = (params, done) => {
    if (params.qstring.begin_session) {
        countlyApi.data.usage.beginUserSession(params, done);
    } else {
        if (params.qstring.metrics) {
            countlyApi.data.usage.processMetrics(params);
        }
        if (params.qstring.end_session) {
            if (params.qstring.session_duration) {
                countlyApi.data.usage.processSessionDuration(params, () => {
                    countlyApi.data.usage.endUserSession(params, done);
                });
            } else {
                countlyApi.data.usage.endUserSession(params, done);
            }
        } else if (params.qstring.session_duration) {
            countlyApi.data.usage.processSessionDuration(params, () => {
                return done ? done() : false;
            });
        } else {
            //update lac, all other requests do updates to app_users and update lac automatically
            common.updateAppUser(params, {$set: {lac: params.time.mstimestamp}});

            // begin_session, session_duration and end_session handle incrementing request count in usage.js
            const dbDateIds = common.getDateIds(params),
                updateUsers = {};

            common.fillTimeObjectMonth(params, updateUsers, common.dbMap['events']);
            const postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
            common.db.collection('users').update({
                '_id': params.app_id + "_" + dbDateIds.month + "_" + postfix
            }, {'$inc': updateUsers}, {'upsert': true}, (err, res) => {
            });

            return done ? done() : false;
        }
    }
};

/**
 * Process Bulk Request
 * @param i
 * @param requests
 * @param params
 */
const processBulkRequest = (i, requests, params) => {
    const appKey = params.qstring.app_key;
    if (i === requests.length) {
        common.unblockResponses(params);
        if (plugins.getConfig("api").safe && !params.res.finished) {
            common.returnMessage(params, 200, 'Success');
        }
        return;
    }

    if (!requests[i].app_key && !appKey) {
        return processBulkRequest(i + 1, requests, params);
    }

    params.req.body = JSON.stringify(requests[i]);

    const tmpParams = {
        'app_id': '',
        'app_cc': '',
        'ip_address': requests[i].ip_address || common.getIpAddress(params.req),
        'user': {
            'country': requests[i].country_code || 'Unknown',
            'city': requests[i].city || 'Unknown'
        },
        'qstring': requests[i],
        'href': "/i",
        'res': params.res,
        'req': params.req,
        'promises': [],
        'bulk': true
    };

    tmpParams["qstring"]['app_key'] = requests[i].app_key || appKey;

    if (!tmpParams.qstring.device_id) {
        return processBulkRequest(i + 1, requests, params);
    } else {
        //make sure device_id is string
        tmpParams.qstring.device_id += "";
        tmpParams.app_user_id = common.crypto.createHash('sha1')
        .update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "")
        .digest('hex');
    }

    return validateAppForWriteAPI(tmpParams, () => {
        function resolver() {
            plugins.dispatch("/sdk/end", {params: tmpParams}, () => {
                processBulkRequest(i + 1, requests, params);
            });
        }

        Promise.all(tmpParams.promises)
        .then(resolver)
        .catch((error) => {
            console.log(error);
            resolver();
        });
    });
};

/**
 * Validate App for Write API
 * Checks app_key from the http request against "apps" collection.
 * This is the first step of every write request to API.
 * @param params
 * @param done
 * @returns {boolean}
 */
const validateAppForWriteAPI = (params, done) => {
    //ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 400, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        return done ? done() : false;
    }
    common.db.collection('apps').findOne({'key': params.qstring.app_key}, (err, app) => {
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
        if (params.app.checksum_salt && params.app.checksum_salt.length) {
            const payloads = [];
            payloads.push(params.href.substr(3));
            if (params.req.method.toLowerCase() === 'post') {
                payloads.push(params.req.body);
            }
            if (typeof params.qstring.checksum !== "undefined") {
                for (let i = 0; i < payloads.length; i++) {
                    payloads[i] = payloads[i].replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                    payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
                }
                if (payloads.indexOf((params.qstring.checksum + "").toUpperCase()) === -1) {
                    console.log("Checksum did not match", params.href, params.req.body, payloads);
                    if (plugins.getConfig("api").safe) {
                        common.returnMessage(params, 400, 'Request does not match checksum');
                    }
                    return done ? done() : false;
                }
            }
            else if (typeof params.qstring.checksum256 !== "undefined") {
                for (let i = 0; i < payloads.length; i++) {
                    payloads[i] = payloads[i].replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                    payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
                }
                if (payloads.indexOf((params.qstring.checksum256 + "").toUpperCase()) === -1) {
                    console.log("Checksum did not match", params.href, params.req.body, payloads);
                    if (plugins.getConfig("api").safe) {
                        common.returnMessage(params, 400, 'Request does not match checksum');
                    }
                    return done ? done() : false;
                }
            }
            else {
                console.log("Request does not have checksum", params.href, params.req.body);
                if (plugins.getConfig("api").safe) {
                    common.returnMessage(params, 400, 'Request does not have checksum');
                }
                return done ? done() : false;
            }
        }

        if (typeof params.qstring.tz !== 'undefined' && !isNaN(parseInt(params.qstring.tz))) {
            params.user.tz = parseInt(params.qstring.tz);
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err, user) => {
            params.app_user = user || {};

            if (plugins.getConfig("api").prevent_duplicate_requests) {
                //check unique millisecond timestamp, if it is the same as the last request had,
                //then we are having duplicate request, due to sudden connection termination
                let payload = params.href.substr(3) || "";
                if (params.req.method.toLowerCase() === 'post') {
                    payload += params.req.body;
                }
                params.request_hash = common.crypto.createHash('sha512').update(payload).digest('hex') + (params.qstring.timestamp || params.time.mstimestamp);
                if (params.app_user.last_req === params.request_hash) {
                    params.cancelRequest = "Duplicate request";
                }
            }

            if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
                try {
                    params.qstring.metrics = JSON.parse(params.qstring.metrics);
                } catch (SyntaxError) {
                    console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                }
            }

            plugins.dispatch("/sdk", {params: params, app: app}, () => {

                if (params.qstring.metrics) {
                    common.processCarrier(params.qstring.metrics);

                    if (params.qstring.metrics["_os"] && params.qstring.metrics["_os_version"]) {
                        if (common.os_mapping[params.qstring.metrics["_os"].toLowerCase()])
                            params.qstring.metrics["_os_version"] = common.os_mapping[params.qstring.metrics["_os"].toLowerCase()] + params.qstring.metrics["_os_version"];
                        else
                            params.qstring.metrics["_os_version"] = params.qstring.metrics["_os"][0].toLowerCase() + params.qstring.metrics["_os_version"];
                    }
                }

                if (!params.cancelRequest) {
                    //check if device id was changed
                    if (params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
                        const old_id = common.crypto.createHash('sha1')
                        .update(params.qstring.app_key + params.qstring.old_device_id + "")
                        .digest('hex');
                        
                        countlyApi.mgmt.appUsers.merge(params.app_id, params.app_user, params.app_user_id, old_id, params.qstring.device_id, params.qstring.old_device_id, function(){restartRequest(params, done);});

                        //do not proceed with request
                        return false;
                    }
                    else if (!params.app_user.uid) {
                        countlyApi.mgmt.appUsers.getUid(params.app_id, function(err, uid){
                            if(uid){
                                params.app_user.uid = uid;
                                common.updateAppUser(params, {$set:{uid:params.app_user.uid}});
                                processRequestData(params, app, done);
                            }
                            else{
                                //cannot create uid, so cannot process request now
                                console.log("Cannot create uid", err, uid);
                                if (plugins.getConfig("api").safe && !params.res.finished) {
                                    common.returnMessage(params, 400, "Cannot create uid");
                                }
                            }
                        });
                    }
                    else {
                        processRequestData(params, app, done);
                    }
                } else {
                    if (plugins.getConfig("api").safe && !params.res.finished) {
                        common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                    }
                    common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                    return done ? done() : false;
                }
            });
        });
    });
};

/**
 * Restart Request
 * @param params
 * @param done
 */
const restartRequest = (params, done) => {
    //remove old device ID and retry request
    params.qstring.old_device_id = null;
    //retry request
    validateAppForWriteAPI(params, done);
};

/** @lends module:api/utils/requestProcessor */
module.exports = {
    processRequest: processRequest
};
