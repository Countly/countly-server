/**
* Module for processing data passed to Countly
* @module api/utils/requestProcessor
*/

const Promise = require('bluebird');
const url = require('url');
const common = require('./common.js');
const countlyCommon = require('../lib/countly.common.js');
const { validateAppAdmin, validateUser, validateRead, validateUserForRead, validateUserForWrite, validateGlobalAdmin, dbUserHasAccessToCollection, validateUpdate, validateDelete, validateCreate } = require('./rights.js');
const authorize = require('./authorizer.js');
const taskmanager = require('./taskmanager.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const packageJson = require('./../../package.json');
const log = require('./log.js')('core:api');
const fs = require('fs');
var countlyFs = require('./countlyFs.js');
var path = require('path');
const validateUserForWriteAPI = validateUser;
const validateUserForDataReadAPI = validateRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const validateUserForMgmtReadAPI = validateUser;

var loaded_configs_time = 0;

const countlyApi = {
    data: {
        usage: require('../parts/data/usage.js'),
        fetch: require('../parts/data/fetch.js'),
        events: require('../parts/data/events.js'),
        exports: require('../parts/data/exports.js'),
        geoData: require('../parts/data/geoData.js')
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
        apps: require('../parts/mgmt/apps.js'),
        appUsers: require('../parts/mgmt/app_users.js'),
        eventGroups: require('../parts/mgmt/event_groups.js')
    }
};

const reloadConfig = function() {
    return new Promise(function(resolve) {
        var my_time = Date.now();
        var reload_configs_after = common.config.reloadConfigAfter || 10000;
        //once in minute
        if (loaded_configs_time === 0 || (my_time - loaded_configs_time) >= reload_configs_after) {
            plugins.loadConfigs(common.db, () => {
                loaded_configs_time = my_time;
                resolve();
            }, true);
        }
        else {
            resolve();
        }
    });
};

/**
 * Default request processing handler, which requires request context to operate. Check tcp_example.js
 * @static
 * @param {params} params - for request context. Minimum needed properties listed
 * @param {object} params.req - Request object, should not be empty and should contain listed params
 * @param {string} params.req.url - Endpoint URL that you are calling. May contain query string.
 * @param {object} params.req.body - Parsed JSON object with data (same name params will overwrite query string if anything provided there)
 * @param {APICallback} params.APICallback - API output handler. Which should handle API response
 * @returns {void} void
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
    if (!params.req || !params.req.url) {
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

    //copying query string data as qstring param
    if (queryString) {
        for (let i in queryString) {
            params.qstring[i] = queryString[i];
        }
    }

    //copying body as qstring param
    if (params.req.body && typeof params.req.body === "object") {
        for (let i in params.req.body) {
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

    reloadConfig().then(function() {
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
                    }
                    catch (SyntaxError) {
                        console.log('Parse bulk JSON failed', requests, params.req.url, params.req.body);
                        requests = null;
                    }
                }
                if (!requests) {
                    common.returnMessage(params, 400, 'Missing parameter "requests"');
                    return false;
                }
                if (!Array.isArray(requests)) {
                    console.log("Passed invalid param for request. Expected Array, got " + typeof requests);
                    common.returnMessage(params, 400, 'Invalid parameter "requests"');
                    return false;
                }
                if (!plugins.getConfig("api", params.app && params.app.plugins, true).safe && !params.res.finished) {
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
                    }
                    catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed', params.req.url, params.req.body);
                    }
                }

                switch (paths[3]) {
                case 'create':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.createUser);
                    break;
                case 'update':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.updateUser);
                    break;
                case 'delete':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.deleteUser);
                    break;
                case 'deleteOwnAccount':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.deleteOwnAccount);
                    break;
                case 'updateHomeSettings':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.updateHomeSettings);
                    break;
                case 'ack':
                    validateUserForWriteAPI(countlyApi.mgmt.users.ackNotification, params);
                    break;
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /deleteOwnAccount or /delete');
                    }
                    break;
                }

                break;
            }
            case '/i/notes': {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    }
                    catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed', params.req.url, params.req.body);
                    }
                }
                switch (paths[3]) {
                case 'save':
                    validateCreate(params, 'core', () => {
                        countlyApi.mgmt.users.saveNote(params);
                    });
                    break;
                case 'delete':
                    validateDelete(params, 'core', () => {
                        countlyApi.mgmt.users.deleteNote(params);
                    });
                    break;
                }
                break;
            }
            case '/i/app_users': {
                switch (paths[3]) {
                case 'create': {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    if (!params.qstring.data) {
                        common.returnMessage(params, 400, 'Missing parameter "data"');
                        return false;
                    }
                    else if (typeof params.qstring.data === "string") {
                        try {
                            params.qstring.data = JSON.parse(params.qstring.data);
                        }
                        catch (ex) {
                            console.log("Could not parse data", params.qstring.data);
                            common.returnMessage(params, 400, 'Could not parse parameter "data": ' + params.qstring.data);
                            return false;
                        }
                    }
                    if (!Object.keys(params.qstring.data).length) {
                        common.returnMessage(params, 400, 'Parameter "data" cannot be empty');
                        return false;
                    }
                    validateUserForWrite(params, function() {
                        countlyApi.mgmt.appUsers.create(params.qstring.app_id, params.qstring.data, params, function(err, res) {
                            if (err) {
                                common.returnMessage(params, 400, err);
                            }
                            else {
                                common.returnMessage(params, 200, 'User Created: ' + JSON.stringify(res));
                            }
                        });
                    });
                    break;
                }
                case 'update': {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    if (!params.qstring.update) {
                        common.returnMessage(params, 400, 'Missing parameter "update"');
                        return false;
                    }
                    else if (typeof params.qstring.update === "string") {
                        try {
                            params.qstring.update = JSON.parse(params.qstring.update);
                        }
                        catch (ex) {
                            console.log("Could not parse update", params.qstring.update);
                            common.returnMessage(params, 400, 'Could not parse parameter "update": ' + params.qstring.update);
                            return false;
                        }
                    }
                    if (!Object.keys(params.qstring.update).length) {
                        common.returnMessage(params, 400, 'Parameter "update" cannot be empty');
                        return false;
                    }
                    if (!params.qstring.query) {
                        common.returnMessage(params, 400, 'Missing parameter "query"');
                        return false;
                    }
                    else if (typeof params.qstring.query === "string") {
                        try {
                            params.qstring.query = JSON.parse(params.qstring.query);
                        }
                        catch (ex) {
                            console.log("Could not parse query", params.qstring.query);
                            common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
                            return false;
                        }
                    }
                    validateUserForWrite(params, function() {
                        countlyApi.mgmt.appUsers.count(params.qstring.app_id, params.qstring.query, function(err, count) {
                            if (err || count === 0) {
                                common.returnMessage(params, 400, 'No users matching criteria');
                                return false;
                            }
                            if (count > 1 && !params.qstring.force) {
                                common.returnMessage(params, 400, 'This query would update more than one user');
                                return false;
                            }
                            countlyApi.mgmt.appUsers.update(params.qstring.app_id, params.qstring.query, params.qstring.update, params, function(err2) {
                                if (err2) {
                                    common.returnMessage(params, 400, err2);
                                }
                                else {
                                    common.returnMessage(params, 200, 'User Updated');
                                }
                            });
                        });
                    });
                    break;
                }
                case 'delete': {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    if (!params.qstring.query) {
                        common.returnMessage(params, 400, 'Missing parameter "query"');
                        return false;
                    }
                    else if (typeof params.qstring.query === "string") {
                        try {
                            params.qstring.query = JSON.parse(params.qstring.query);
                        }
                        catch (ex) {
                            console.log("Could not parse query", params.qstring.query);
                            common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
                            return false;
                        }
                    }
                    if (!Object.keys(params.qstring.query).length) {
                        common.returnMessage(params, 400, 'Parameter "query" cannot be empty, it would delete all users. Use clear app instead');
                        return false;
                    }
                    validateUserForWrite(params, function() {
                        countlyApi.mgmt.appUsers.count(params.qstring.app_id, params.qstring.query, function(err, count) {
                            if (err || count === 0) {
                                common.returnMessage(params, 400, 'No users matching criteria');
                                return false;
                            }
                            if (count > 1 && !params.qstring.force) {
                                common.returnMessage(params, 400, 'This query would delete more than one user');
                                return false;
                            }
                            countlyApi.mgmt.appUsers.delete(params.qstring.app_id, params.qstring.query, params, function(err2) {
                                if (err2) {
                                    common.returnMessage(params, 400, err2);
                                }
                                else {
                                    common.returnMessage(params, 200, 'User deleted');
                                }
                            });
                        });
                    });
                    break;
                }
                case 'deleteExport': {
                    validateUserForWrite(params, function() {
                        countlyApi.mgmt.appUsers.deleteExport(paths[4], params, function(err) {
                            if (err) {
                                common.returnMessage(params, 400, err);
                            }
                            else {
                                common.returnMessage(params, 200, 'Export deleted');
                            }
                        });
                    });
                    break;
                }
                case 'export': {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    validateUserForWrite(params, function() {
                        taskmanager.checkIfRunning({
                            db: common.db,
                            params: params //allow generate request from params, as it is what identifies task in drill
                        }, function(task_id) {
                            //check if task already running
                            if (task_id) {
                                common.returnOutput(params, {task_id: task_id});
                            }
                            else {
                                if (!params.qstring.query) {
                                    common.returnMessage(params, 400, 'Missing parameter "query"');
                                    return false;
                                }
                                else if (typeof params.qstring.query === "string") {
                                    try {
                                        params.qstring.query = JSON.parse(params.qstring.query);
                                    }
                                    catch (ex) {
                                        console.log("Could not parse query", params.qstring.query);
                                        common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
                                        return false;
                                    }
                                }

                                var my_name = "";
                                if (params.qstring.query) {
                                    my_name = JSON.stringify(params.qstring.query);
                                }

                                countlyApi.mgmt.appUsers.export(params.qstring.app_id, params.qstring.query || {}, params, taskmanager.longtask({
                                    db: common.db,
                                    threshold: plugins.getConfig("api").request_threshold,
                                    force: false,
                                    app_id: params.qstring.app_id,
                                    params: params,
                                    type: "AppUserExport",
                                    report_name: "User export",
                                    meta: JSON.stringify({
                                        "app_id": params.qstring.app_id,
                                        "query": params.qstring.query || {}
                                    }),
                                    name: my_name,
                                    view: "#/exportedData/AppUserExport/",
                                    processData: function(err, res, callback) {
                                        if (!err) {
                                            callback(null, res);
                                        }
                                        else {
                                            callback(err, '');
                                        }
                                    },
                                    outputData: function(err, data) {
                                        if (err) {
                                            common.returnMessage(params, 400, err);
                                        }
                                        else {
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
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                    }
                    break;
                }
                break;
            }
            case '/i/apps': {
                if (params.qstring.args) {
                    try {
                        params.qstring.args = JSON.parse(params.qstring.args);
                    }
                    catch (SyntaxError) {
                        console.log('Parse ' + apiPath + ' JSON failed', params.req.url, params.req.body);
                    }
                }

                switch (paths[3]) {
                case 'create':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.createApp);
                    break;
                case 'update':
                    if (paths[4] === 'plugins') {
                        validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.updateAppPlugins);
                    }
                    else {
                        validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.updateApp);
                    }
                    break;
                case 'delete':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.deleteApp);
                    break;
                case 'reset':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.resetApp);
                    break;
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
                    }
                    break;
                }

                break;
            }
            case '/i/event_groups':
                switch (paths[3]) {
                case 'create':
                    validateCreate(params, 'core', countlyApi.mgmt.eventGroups.create);
                    break;
                case 'update':
                    validateUpdate(params, 'core', countlyApi.mgmt.eventGroups.update);
                    break;
                case 'delete':
                    validateDelete(params, 'core', countlyApi.mgmt.eventGroups.remove);
                    break;
                default:
                    break;
                }
                break;
            case '/i/tasks': {
                if (!params.qstring.task_id) {
                    common.returnMessage(params, 400, 'Missing parameter "task_id"');
                    return false;
                }

                switch (paths[3]) {
                case 'update':
                    validateUserForWrite(params, () => {
                        taskmanager.rerunTask({
                            db: common.db,
                            id: params.qstring.task_id
                        }, (err, res) => {
                            common.returnMessage(params, 200, res);
                        });
                    });
                    break;
                case 'delete':
                    validateUserForWrite(params, () => {
                        taskmanager.deleteResult({
                            db: common.db,
                            id: params.qstring.task_id
                        }, (err, task) => {
                            plugins.dispatch("/systemlogs", {params: params, action: "task_manager_task_deleted", data: task});
                            common.returnMessage(params, 200, "Success");
                        });
                    });
                    break;
                case 'name':
                    validateUserForWrite(params, () => {
                        taskmanager.nameResult({
                            db: common.db,
                            id: params.qstring.task_id,
                            name: params.qstring.name
                        }, () => {
                            common.returnMessage(params, 200, "Success");
                        });
                    });
                    break;
                case 'edit':
                    validateUserForWrite(params, () => {
                        const data = {
                            "report_name": params.qstring.report_name,
                            "report_desc": params.qstring.report_desc,
                            "global": params.qstring.global + "" === 'true',
                            "autoRefresh": params.qstring.autoRefresh + "" === 'true',
                            "period_desc": params.qstring.period_desc
                        };
                        taskmanager.editTask({
                            db: common.db,
                            data: data,
                            id: params.qstring.task_id
                        }, (err, d) => {
                            if (err) {
                                common.returnMessage(params, 503, "Error");
                            }
                            else {
                                common.returnMessage(params, 200, "Success");
                            }
                            plugins.dispatch("/systemlogs", {params: params, action: "task_manager_task_updated", data: d});
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
                    })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                    break;
                }

                break;
            }
            case '/i/events': {
                switch (paths[3]) {
                case 'whitelist_segments':
                {
                    validateUpdate(params, "events", function() {
                        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                            if (err) {
                                common.returnMessage(params, 400, err);
                                return;
                            }
                            else if (!event) {
                                common.returnMessage(params, 400, "Could not find record in event collection");
                                return;
                            }

                            //rewrite whitelisted
                            if (params.qstring.whitelisted_segments && params.qstring.whitelisted_segments !== "") {
                                try {
                                    params.qstring.whitelisted_segments = JSON.parse(params.qstring.whitelisted_segments);
                                }
                                catch (SyntaxError) {
                                    params.qstring.whitelisted_segments = {}; console.log('Parse ' + params.qstring.whitelisted_segments + ' JSON failed', params.req.url, params.req.body);
                                }

                                var update = {};
                                var whObj = params.qstring.whitelisted_segments;
                                for (let k in whObj) {
                                    if (Array.isArray(whObj[k]) && whObj[k].length > 0) {
                                        update.$set = update.$set || {};
                                        update.$set["whitelisted_segments." + k] = whObj[k];
                                    }
                                    else {
                                        update.$unset = update.$unset || {};
                                        update.$unset["whitelisted_segments." + k] = true;
                                    }
                                }

                                common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, update, function(err2) {
                                    if (err2) {
                                        common.returnMessage(params, 400, err2);
                                    }
                                    else {
                                        var data_arr = {update: {}};
                                        if (update.$set) {
                                            data_arr.update.$set = update.$set;
                                        }

                                        if (update.$unset) {
                                            data_arr.update.$unset = update.$unset;
                                        }
                                        data_arr.update = JSON.stringify(data_arr.update);
                                        common.returnMessage(params, 200, 'Success');
                                        plugins.dispatch("/systemlogs", {
                                            params: params,
                                            action: "segments_whitelisted_for_events",
                                            data: data_arr
                                        });
                                    }
                                });

                            }
                            else {
                                common.returnMessage(params, 400, "Value for 'whitelisted_segments' missing");
                                return;
                            }


                        });
                    });
                    break;
                }
                case 'edit_map':
                {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    validateUpdate(params, 'events', function() {
                        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                            if (err) {
                                common.returnMessage(params, 400, err);
                                return;
                            }
                            else if (!event) {
                                common.returnMessage(params, 400, "Could not find event");
                                return;
                            }

                            var update_array = {};
                            var update_segments = [];
                            var pull_us = {};
                            if (params.qstring.event_order && params.qstring.event_order !== "") {
                                try {
                                    update_array.order = JSON.parse(params.qstring.event_order);
                                }
                                catch (SyntaxError) {
                                    update_array.order = event.order; console.log('Parse ' + params.qstring.event_order + ' JSON failed', params.req.url, params.req.body);
                                }
                            }
                            else {
                                update_array.order = event.order || [];
                            }

                            if (params.qstring.event_overview && params.qstring.event_overview !== "") {
                                try {
                                    update_array.overview = JSON.parse(params.qstring.event_overview);
                                }
                                catch (SyntaxError) {
                                    update_array.overview = []; console.log('Parse ' + params.qstring.event_overview + ' JSON failed', params.req.url, params.req.body);
                                }
                                if (update_array.overview && Array.isArray(update_array.overview) && update_array.overview.length > 12) {
                                    common.returnMessage(params, 400, "You can't add more than 12 items in overview");
                                    return;
                                }
                                //check for duplicates
                                var overview_map = {};
                                for (let p = 0; p < update_array.overview.length; p++) {
                                    if (!overview_map[update_array.overview[p].eventKey]) {
                                        overview_map[update_array.overview[p].eventKey] = {};
                                    }
                                    if (!overview_map[update_array.overview[p].eventKey][update_array.overview[p].eventProperty]) {
                                        overview_map[update_array.overview[p].eventKey][update_array.overview[p].eventProperty] = 1;
                                    }
                                    else {
                                        update_array.overview.splice(p, 1);
                                        p = p - 1;
                                    }
                                }
                            }
                            else {
                                update_array.overview = event.overview || [];
                            }

                            update_array.omitted_segments = {};

                            if (event.omitted_segments) {
                                try {
                                    update_array.omitted_segments = JSON.parse(JSON.stringify(event.omitted_segments));
                                }
                                catch (SyntaxError) {
                                    update_array.omitted_segments = {};
                                }
                            }

                            if (params.qstring.omitted_segments && params.qstring.omitted_segments !== "") {
                                try {
                                    params.qstring.omitted_segments = JSON.parse(params.qstring.omitted_segments);
                                }
                                catch (SyntaxError) {
                                    params.qstring.omitted_segments = {}; console.log('Parse ' + params.qstring.omitted_segments + ' JSON failed', params.req.url, params.req.body);
                                }

                                for (let k in params.qstring.omitted_segments) {
                                    update_array.omitted_segments[k] = params.qstring.omitted_segments[k];
                                    update_segments.push({
                                        "key": k,
                                        "list": params.qstring.omitted_segments[k]
                                    });
                                    pull_us["segments." + k] = {$in: params.qstring.omitted_segments[k]};
                                }
                            }

                            if (params.qstring.event_map && params.qstring.event_map !== "") {
                                try {
                                    params.qstring.event_map = JSON.parse(params.qstring.event_map);
                                }
                                catch (SyntaxError) {
                                    params.qstring.event_map = {}; console.log('Parse ' + params.qstring.event_map + ' JSON failed', params.req.url, params.req.body);
                                }

                                if (event.map) {
                                    try {
                                        update_array.map = JSON.parse(JSON.stringify(event.map));
                                    }
                                    catch (SyntaxError) {
                                        update_array.map = {};
                                    }
                                }
                                else {
                                    update_array.map = {};
                                }


                                for (let k in params.qstring.event_map) {
                                    if (Object.prototype.hasOwnProperty.call(params.qstring.event_map, k)) {
                                        update_array.map[k] = params.qstring.event_map[k];

                                        if (update_array.map[k].is_visible && update_array.map[k].is_visible === true) {
                                            delete update_array.map[k].is_visible;
                                        }
                                        if (update_array.map[k].name && update_array.map[k].name === k) {
                                            delete update_array.map[k].name;
                                        }

                                        if (update_array.map[k] && typeof update_array.map[k].is_visible !== 'undefined' && update_array.map[k].is_visible === false) {
                                            for (var j = 0; j < update_array.overview.length; j++) {
                                                if (update_array.overview[j].eventKey === k) {
                                                    update_array.overview.splice(j, 1);
                                                    j = j - 1;
                                                }
                                            }
                                        }
                                        if (Object.keys(update_array.map[k]).length === 0) {
                                            delete update_array.map[k];
                                        }
                                    }
                                }
                            }
                            var changes = {$set: update_array};
                            if (Object.keys(pull_us).length > 0) {
                                changes = {
                                    $set: update_array,
                                    $pull: pull_us
                                };
                            }

                            common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, changes, function(err2) {
                                if (err2) {
                                    common.returnMessage(params, 400, err2);
                                }
                                else {
                                    var data_arr = {update: update_array};
                                    data_arr.before = {
                                        order: [],
                                        map: {},
                                        overview: [],
                                        omitted_segments: {}
                                    };
                                    if (event.order) {
                                        data_arr.before.order = event.order;
                                    }
                                    if (event.map) {
                                        data_arr.before.map = event.map;
                                    }
                                    if (event.overview) {
                                        data_arr.before.overview = event.overview;
                                    }
                                    if (event.omitted_segments) {
                                        data_arr.before.omitted_segments = event.omitted_segments;
                                    }

                                    //updated, clear out segments
                                    Promise.all(update_segments.map(function(obj) {
                                        return new Promise(function(resolve) {
                                            var collectionNameWoPrefix = common.crypto.createHash('sha1').update(obj.key + params.qstring.app_id).digest('hex');
                                            //removes all document for current segment
                                            common.db.collection("events" + collectionNameWoPrefix).remove({"s": {$in: obj.list}}, {multi: true}, function(err3) {
                                                if (err3) {
                                                    console.log(err3);
                                                }
                                                //create query for all segments
                                                var my_query = [];
                                                var unsetUs = {};
                                                if (obj.list.length > 0) {
                                                    for (let p = 0; p < obj.list.length; p++) {
                                                        my_query[p] = {};
                                                        my_query[p]["meta_v2.segments." + obj.list[p]] = {$exists: true}; //for select
                                                        unsetUs["meta_v2.segments." + obj.list[p]] = ""; //remove from list
                                                        unsetUs["meta_v2." + obj.list[p]] = "";
                                                    }
                                                    //clears out meta data for segments
                                                    common.db.collection("events" + collectionNameWoPrefix).update({$or: my_query}, {$unset: unsetUs}, {multi: true}, function(err4) {
                                                        if (err4) {
                                                            console.log(err4);
                                                        }
                                                        if (plugins.isPluginEnabled('drill')) {
                                                            //remove from drill
                                                            var eventHash = common.crypto.createHash('sha1').update(obj.key + params.qstring.app_id).digest('hex');
                                                            common.drillDb.collection("drill_meta" + params.qstring.app_id).findOne({_id: "meta_" + eventHash}, function(err5, resEvent) {
                                                                if (err5) {
                                                                    console.log(err5);
                                                                }

                                                                var newsg = {};
                                                                var remove_biglists = [];
                                                                resEvent = resEvent || {};
                                                                resEvent.sg = resEvent.sg || {};
                                                                for (let p = 0; p < obj.list.length; p++) {
                                                                    if (resEvent.sg[obj.list[p]] && resEvent.sg[obj.list[p]].type === "bl") {
                                                                        remove_biglists.push("meta_" + eventHash + "_sg." + obj.list[p]);
                                                                    }
                                                                    newsg["sg." + obj.list[p]] = {"type": "s"};
                                                                }
                                                                //big list, delete also big list file
                                                                if (remove_biglists.length > 0) {
                                                                    common.drillDb.collection("drill_meta" + params.qstring.app_id).remove({_id: {$in: remove_biglists}}, function(err6) {
                                                                        if (err6) {
                                                                            console.log(err6);
                                                                        }
                                                                        common.drillDb.collection("drill_meta" + params.qstring.app_id).update({_id: "meta_" + eventHash}, {$set: newsg}, function(err7) {
                                                                            if (err7) {
                                                                                console.log(err7);
                                                                            }
                                                                            resolve();
                                                                        });
                                                                    });
                                                                }
                                                                else {
                                                                    common.drillDb.collection("drill_meta" + params.qstring.app_id).update({_id: "meta_" + eventHash}, {$set: newsg}, function() {
                                                                        resolve();
                                                                    });
                                                                }
                                                            });
                                                        }
                                                        else {
                                                            resolve();
                                                        }

                                                    });
                                                }
                                                else {
                                                    resolve();
                                                }
                                            });
                                        });

                                    })).then(function() {
                                        common.returnMessage(params, 200, 'Success');
                                        plugins.dispatch("/systemlogs", {
                                            params: params,
                                            action: "events_updated",
                                            data: data_arr
                                        });

                                    })
                                        .catch((error) => {
                                            console.log(error);
                                            common.returnMessage(params, 400, 'Events were updated sucessfully. There was error during clearing segment data. Please look in log for more onformation');
                                        });

                                }
                            });
                        });
                    });
                    break;
                }
                case 'delete_events':
                {
                    validateDelete(params, 'events', function() {
                        var idss = [];
                        try {
                            idss = JSON.parse(params.qstring.events);
                        }
                        catch (SyntaxError) {
                            idss = [];
                        }

                        if (!Array.isArray(idss)) {
                            idss = [];
                        }

                        var app_id = params.qstring.app_id;
                        var updateThese = {"$unset": {}};
                        if (idss.length > 0) {
                            for (let i = 0; i < idss.length; i++) {
                                if (idss[i].indexOf('.') !== -1) {
                                    updateThese.$unset["map." + idss[i].replace(/\./g, '\\u002e')] = 1;
                                    updateThese.$unset["omitted_segments." + idss[i].replace(/\./g, '\\u002e')] = 1;
                                }
                                else {
                                    updateThese.$unset["map." + idss[i]] = 1;
                                    updateThese.$unset["omitted_segments." + idss[i]] = 1;
                                }
                                idss[i] = common.decode_html(idss[i]);//previously escaped, get unescaped id (because segments are using it)
                                if (idss[i].indexOf('.') !== -1) {
                                    updateThese.$unset["segments." + idss[i].replace(/\./g, '\\u002e')] = 1;
                                }
                                else {
                                    updateThese.$unset["segments." + idss[i]] = 1;
                                }
                            }

                            common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                                if (err) {
                                    common.returnMessage(params, 400, err);
                                }
                                if (!event) {
                                    common.returnMessage(params, 400, "Could not find event");
                                    return;
                                }
                                //fix overview
                                if (event.overview && event.overview.length) {
                                    for (let i = 0; i < idss.length; i++) {
                                        for (let j = 0; j < event.overview.length; j++) {
                                            if (event.overview[j].eventKey === idss[i]) {
                                                event.overview.splice(j, 1);
                                                j = j - 1;
                                            }
                                        }
                                    }
                                    if (!updateThese.$set) {
                                        updateThese.$set = {};
                                    }
                                    updateThese.$set.overview = event.overview;
                                }

                                //remove from list
                                if (typeof event.list !== 'undefined' && Array.isArray(event.list) && event.list.length > 0) {
                                    for (let i = 0; i < idss.length; i++) {
                                        let index = event.list.indexOf(idss[i]);
                                        if (index > -1) {
                                            event.list.splice(index, 1);
                                            i = i - 1;
                                        }
                                    }
                                    if (!updateThese.$set) {
                                        updateThese.$set = {};
                                    }
                                    updateThese.$set.list = event.list;
                                }
                                //remove from order
                                if (typeof event.order !== 'undefined' && Array.isArray(event.order) && event.order.length > 0) {
                                    for (let i = 0; i < idss.length; i++) {
                                        let index = event.order.indexOf(idss[i]);
                                        if (index > -1) {
                                            event.order.splice(index, 1);
                                            i = i - 1;
                                        }
                                    }
                                    if (!updateThese.$set) {
                                        updateThese.$set = {};
                                    }
                                    updateThese.$set.order = event.order;
                                }

                                common.db.collection('events').update({"_id": common.db.ObjectID(app_id)}, updateThese, function(err2) {
                                    if (err2) {
                                        console.log(err2);
                                        common.returnMessage(params, 400, err);
                                    }
                                    else {
                                        for (let i = 0; i < idss.length; i++) {
                                            var collectionNameWoPrefix = common.crypto.createHash('sha1').update(idss[i] + app_id).digest('hex');
                                            common.db.collection("events" + collectionNameWoPrefix).drop(function() {});
                                            plugins.dispatch("/i/event/delete", {
                                                event_key: idss[i],
                                                appId: app_id
                                            });
                                        }
                                        plugins.dispatch("/systemlogs", {
                                            params: params,
                                            action: "event_deleted",
                                            data: {
                                                events: idss,
                                                appID: app_id
                                            }
                                        });
                                        common.returnMessage(params, 200, 'Success');
                                    }
                                });
                            });
                        }
                        else {
                            common.returnMessage(params, 400, "Missing events to delete");
                        }
                    });
                    break;
                }
                case 'change_visibility':
                {
                    validateUpdate(params, 'events', function() {
                        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                            if (err) {
                                common.returnMessage(params, 400, err);
                                return;
                            }
                            if (!event) {
                                common.returnMessage(params, 400, "Could not find event");
                                return;
                            }

                            var update_array = {};
                            var idss = [];
                            try {
                                idss = JSON.parse(params.qstring.events);
                            }
                            catch (SyntaxError) {
                                idss = [];
                            }
                            if (!Array.isArray(idss)) {
                                idss = [];
                            }

                            if (event.map) {
                                try {
                                    update_array.map = JSON.parse(JSON.stringify(event.map));
                                }
                                catch (SyntaxError) {
                                    update_array.map = {};
                                    console.log('Parse ' + event.map + ' JSON failed', params.req.url, params.req.body);
                                }
                            }
                            else {
                                update_array.map = {};
                            }

                            for (let i = 0; i < idss.length; i++) {

                                var baseID = idss[i].replace(/\\u002e/g, ".");
                                if (!update_array.map[idss[i]]) {
                                    update_array.map[idss[i]] = {};
                                }

                                if (params.qstring.set_visibility === 'hide') {
                                    update_array.map[idss[i]].is_visible = false;
                                }
                                else {
                                    update_array.map[idss[i]].is_visible = true;
                                }

                                if (update_array.map[idss[i]].is_visible) {
                                    delete update_array.map[idss[i]].is_visible;
                                }

                                if (Object.keys(update_array.map[idss[i]]).length === 0) {
                                    delete update_array.map[idss[i]];
                                }

                                if (params.qstring.set_visibility === 'hide' && event && event.overview && Array.isArray(event.overview)) {
                                    for (let j = 0; j < event.overview.length; j++) {
                                        if (event.overview[j].eventKey === baseID) {
                                            event.overview.splice(j, 1);
                                            j = j - 1;
                                        }
                                    }
                                    update_array.overview = event.overview;
                                }
                            }
                            common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, {'$set': update_array}, function(err2) {

                                if (err2) {
                                    common.returnMessage(params, 400, err2);
                                }
                                else {
                                    common.returnMessage(params, 200, 'Success');
                                    var data_arr = {update: update_array};
                                    data_arr.before = {map: {}};
                                    if (event.map) {
                                        data_arr.before.map = event.map;
                                    }
                                    plugins.dispatch("/systemlogs", {
                                        params: params,
                                        action: "events_updated",
                                        data: data_arr
                                    });
                                }
                            });
                        });
                    });
                    break;
                }
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                    }
                    break;
                }
                break;
            }
            case '/i': {
                params.ip_address = params.qstring.ip_address || common.getIpAddress(params.req);
                params.user = {};

                if (!params.qstring.app_key || !params.qstring.device_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                    return false;
                }
                else {
                    //make sure device_id is string
                    params.qstring.device_id += "";
                    params.qstring.app_key += "";
                    // Set app_user_id that is unique for each user of an application.
                    params.app_user_id = common.crypto.createHash('sha1')
                        .update(params.qstring.app_key + params.qstring.device_id + "")
                        .digest('hex');
                }

                if (params.qstring.events && typeof params.qstring.events === "string") {
                    try {
                        params.qstring.events = JSON.parse(params.qstring.events);
                    }
                    catch (SyntaxError) {
                        console.log('Parse events JSON failed', params.qstring.events, params.req.url, params.req.body);
                    }
                }

                log.d('processing request %j', params.qstring);

                params.promises = [];

                validateAppForWriteAPI(params, () => {
                    /**
                    * Dispatches /sdk/end event upon finishing processing request
                    **/
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

                break;
            }
            case '/o/users': {
                switch (paths[3]) {
                case 'all':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.getAllUsers);
                    break;
                case 'me':
                    validateUserForMgmtReadAPI(countlyApi.mgmt.users.getCurrentUser, params);
                    break;
                case 'id':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.getUserById);
                    break;
                case 'reset_timeban':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.users.resetTimeBan);
                    break;
                case 'permissions':
                    validateRead(params, 'core', function() {
                        var features = ["core", "events" /* , "global_configurations", "global_applications", "global_users", "global_jobs", "global_upload" */];
                        plugins.dispatch("/permissions/features", {params: params, features: features}, function() {
                            common.returnOutput(params, features);
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
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                    }
                    break;
                }

                break;
            }
            case '/o/app_users': {
                switch (paths[3]) {
                case 'loyalty': {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing parameter "app_id"');
                        return false;
                    }
                    validateUserForMgmtReadAPI(countlyApi.mgmt.appUsers.loyalty, params);
                    break;
                }
                case 'download': {
                    if (paths[4] && paths[4] !== '') {
                        validateUserForRead(params, function() {
                            var filename = paths[4].split('.');
                            var myfile = '../../export/AppUser/' + filename[0] + '.tar.gz';
                            countlyFs.gridfs.getSize("appUsers", myfile, {id: filename[0] + '.tar.gz'}, function(error, size) {
                                if (error) {
                                    common.returnMessage(params, 400, error);
                                }
                                else if (parseInt(size) === 0) {
                                    common.returnMessage(params, 400, "Export doesn't exist");
                                }
                                else {
                                    countlyFs.gridfs.getStream("appUsers", myfile, {id: filename[0] + '.tar.gz'}, function(err, stream) {
                                        if (err) {
                                            common.returnMessage(params, 400, "Export doesn't exist");
                                        }
                                        else {
                                            params.res.writeHead(200, {
                                                'Content-Type': 'application/x-gzip',
                                                'Content-Length': size,
                                                'Content-Disposition': 'inline; filename="' + filename[0] + '.tar.gz"'
                                            });
                                            stream.pipe(params.res);
                                        }
                                    });
                                }
                            });
                        });
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing filename');
                    }
                    break;
                }
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
                    }
                    break;
                }
                break;
            }
            case '/o/apps': {
                switch (paths[3]) {
                case 'all':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.getAllApps);
                    break;
                case 'mine':
                    validateUser(params, countlyApi.mgmt.apps.getCurrentUserApps);
                    break;
                case 'details':
                    validateAppAdmin(params, countlyApi.mgmt.apps.getAppsDetails);
                    break;
                case 'plugins':
                    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.getAppPlugins);
                    break;
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /all, /mine, /details or /plugins');
                    }
                    break;
                }

                break;
            }
            case '/o/tasks': {
                switch (paths[3]) {
                case 'all':
                    validateRead(params, 'core', () => {
                        if (typeof params.qstring.query === "string") {
                            try {
                                params.qstring.query = JSON.parse(params.qstring.query);
                            }
                            catch (ex) {
                                params.qstring.query = {};
                            }
                        }
                        if (params.qstring.query.$or) {
                            params.qstring.query.$and = [
                                {"$or": Object.assign([], params.qstring.query.$or) },
                                {"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]}
                            ];
                            delete params.qstring.query.$or;
                        }
                        else {
                            params.qstring.query.$or = [{"global": {"$ne": false}}, {"creator": params.member._id + ""}];
                        }
                        params.qstring.query.subtask = {$exists: false};
                        params.qstring.query.app_id = params.qstring.app_id;
                        if (params.qstring.app_ids && params.qstring.app_ids !== "") {
                            var ll = params.qstring.app_ids.split(",");
                            if (ll.length > 1) {
                                params.qstring.query.app_id = {$in: ll};
                            }
                        }
                        if (params.qstring.period) {
                            countlyCommon.getPeriodObj(params);
                            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
                        }
                        taskmanager.getResults({
                            db: common.db,
                            query: params.qstring.query
                        }, (err, res) => {
                            common.returnOutput(params, res || []);
                        });
                    });
                    break;
                case 'count':
                    validateRead(params, 'core', () => {
                        if (typeof params.qstring.query === "string") {
                            try {
                                params.qstring.query = JSON.parse(params.qstring.query);
                            }
                            catch (ex) {
                                params.qstring.query = {};
                            }
                        }
                        if (params.qstring.query.$or) {
                            params.qstring.query.$and = [
                                {"$or": Object.assign([], params.qstring.query.$or) },
                                {"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]}
                            ];
                            delete params.qstring.query.$or;
                        }
                        else {
                            params.qstring.query.$or = [{"global": {"$ne": false}}, {"creator": params.member._id + ""}];
                        }
                        if (params.qstring.period) {
                            countlyCommon.getPeriodObj(params);
                            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
                        }
                        taskmanager.getCounts({
                            db: common.db,
                            query: params.qstring.query
                        }, (err, res) => {
                            common.returnOutput(params, res || []);
                        });
                    });
                    break;
                case 'list':
                    validateRead(params, 'core', () => {
                        if (typeof params.qstring.query === "string") {
                            try {
                                params.qstring.query = JSON.parse(params.qstring.query);
                            }
                            catch (ex) {
                                params.qstring.query = {};
                            }
                        }
                        if (params.qstring.query.$or) {
                            params.qstring.query.$and = [
                                {"$or": Object.assign([], params.qstring.query.$or) },
                                {"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]}
                            ];
                            delete params.qstring.query.$or;
                        }
                        else {
                            params.qstring.query.$or = [{"global": {"$ne": false}}, {"creator": params.member._id + ""}];
                        }
                        params.qstring.query.subtask = {$exists: false};
                        params.qstring.query.app_id = params.qstring.app_id;
                        if (params.qstring.period) {
                            countlyCommon.getPeriodObj(params);
                            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
                        }
                        const skip = params.qstring.iDisplayStart;
                        const limit = params.qstring.iDisplayLength;
                        const sEcho = params.qstring.sEcho;
                        const keyword = params.qstring.sSearch || null;
                        const sortBy = params.qstring.iSortCol_0 || null;
                        const sortSeq = params.qstring.sSortDir_0 || null;
                        taskmanager.getTableQueryResult({
                            db: common.db,
                            query: params.qstring.query,
                            page: {skip, limit},
                            sort: {sortBy, sortSeq},
                            keyword: keyword,
                        }, (err, res) => {
                            if (!err) {
                                common.returnOutput(params, {aaData: res.list, iTotalDisplayRecords: res.count, iTotalRecords: res.count, sEcho});
                            }
                            else {
                                common.returnMessage(params, 500, '"Query failed"');
                            }
                        });
                    });
                    break;
                case 'task':
                    validateRead(params, 'core', () => {
                        if (!params.qstring.task_id) {
                            common.returnMessage(params, 400, 'Missing parameter "task_id"');
                            return false;
                        }
                        taskmanager.getResult({
                            db: common.db,
                            id: params.qstring.task_id,
                            subtask_key: params.qstring.subtask_key
                        }, (err, res) => {
                            if (res) {
                                common.returnOutput(params, res);
                            }
                            else {
                                common.returnMessage(params, 400, 'Task does not exist');
                            }
                        });
                    });
                    break;
                case 'check':
                    validateRead(params, 'core', () => {
                        if (!params.qstring.task_id) {
                            common.returnMessage(params, 400, 'Missing parameter "task_id"');
                            return false;
                        }

                        var tasks = params.qstring.task_id;

                        try {
                            tasks = JSON.parse(tasks);
                        }
                        catch {
                            // ignore
                        }

                        var isMulti = Array.isArray(tasks);

                        taskmanager.checkResult({
                            db: common.db,
                            id: tasks
                        }, (err, res) => {
                            if (isMulti && res) {
                                common.returnMessage(params, 200, res);
                            }
                            else if (res) {
                                common.returnMessage(params, 200, res.status);
                            }
                            else {
                                common.returnMessage(params, 400, 'Task does not exist');
                            }
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
                    })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                    break;
                }

                break;
            }
            case '/o/system': {
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
                    })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                    break;
                }

                break;
            }
            case '/o/export': {
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
                        if (typeof params.qstring.filter === "string") {
                            try {
                                params.qstring.query = JSON.parse(params.qstring.filter, common.reviver);
                            }
                            catch (ex) {
                                params.qstring.query = null;
                            }
                        }
                        if (typeof params.qstring.projection === "string") {
                            try {
                                params.qstring.projection = JSON.parse(params.qstring.projection);
                            }
                            catch (ex) {
                                params.qstring.projection = null;
                            }
                        }
                        if (typeof params.qstring.project === "string") {
                            try {
                                params.qstring.projection = JSON.parse(params.qstring.project);
                            }
                            catch (ex) {
                                params.qstring.projection = null;
                            }
                        }
                        if (typeof params.qstring.sort === "string") {
                            try {
                                params.qstring.sort = JSON.parse(params.qstring.sort);
                            }
                            catch (ex) {
                                params.qstring.sort = null;
                            }
                        }

                        if (typeof params.qstring.formatFields === "string") {
                            try {
                                params.qstring.formatFields = JSON.parse(params.qstring.formatFields);
                            }
                            catch (ex) {
                                params.qstring.formatFields = null;
                            }
                        }

                        dbUserHasAccessToCollection(params, params.qstring.collection, (hasAccess) => {
                            if (hasAccess) {
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
                            }
                            else {
                                common.returnMessage(params, 401, 'User does not have access right for this collection');
                            }
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
                                console.log("Error parsing export request data", params.qstring.data, ex);
                                params.qstring.data = {};
                            }
                        }
                        countlyApi.data.exports.fromRequest({
                            params: params,
                            path: params.qstring.path,
                            data: params.qstring.data,
                            method: params.qstring.method,
                            prop: params.qstring.prop,
                            type: params.qstring.type,
                            filename: params.qstring.filename
                        });
                    }, params);
                    break;
                case 'requestQuery':
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
                                console.log("Error parsing export request data", params.qstring.data, ex);
                                params.qstring.data = {};
                            }
                        }
                        var my_name = JSON.stringify(params.qstring);

                        var ff = taskmanager.longtask({
                            db: common.db,
                            threshold: plugins.getConfig("api").request_threshold,
                            force: true,
                            gridfs: true,
                            binary: true,
                            app_id: params.qstring.app_id,
                            params: params,
                            type: params.qstring.type_name || "tableExport",
                            report_name: params.qstring.filename + "." + params.qstring.type,
                            meta: JSON.stringify({
                                "app_id": params.qstring.app_id,
                                "query": params.qstring.query || {}
                            }),
                            name: my_name,
                            view: "#/exportedData/tableExport/",
                            processData: function(err, res, callback) {
                                if (!err) {
                                    callback(null, res);
                                }
                                else {
                                    callback(err, '');
                                }
                            },
                            outputData: function(err, data) {
                                if (err) {
                                    common.returnMessage(params, 400, err);
                                }
                                else {
                                    common.returnMessage(params, 200, data);
                                }
                            }
                        });

                        countlyApi.data.exports.fromRequestQuery({
                            params: params,
                            path: params.qstring.path,
                            data: params.qstring.data,
                            method: params.qstring.method,
                            prop: params.qstring.prop,
                            type: params.qstring.type,
                            filename: params.qstring.filename + "." + params.qstring.type,
                            output: function(data) {
                                ff(null, data);
                            }
                        });
                    }, params);
                    break;
                case 'download': {
                    if (paths[4] && paths[4] !== '') {
                        common.db.collection("long_tasks").findOne({_id: paths[4]}, function(err, data) {

                            var filename = data.report_name;
                            var type = filename.split(".");
                            type = type[type.length - 1];
                            var myfile = paths[4];

                            countlyFs.gridfs.getSize("task_results", myfile, {id: paths[4]}, function(error, size) {
                                if (error) {
                                    common.returnMessage(params, 400, error);
                                }
                                else if (parseInt(size) === 0) {
                                    common.returnMessage(params, 400, "Export size is 0");
                                }
                                else {
                                    countlyFs.gridfs.getStream("task_results", myfile, {id: paths[4]}, function(err5, stream) {
                                        if (err5) {
                                            common.returnMessage(params, 400, "Export strem does not exist");
                                        }
                                        else {
                                            var headers = {};
                                            headers["Content-Type"] = countlyApi.data.exports.getType(type);
                                            headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename);
                                            params.res.writeHead(200, headers);
                                            stream.pipe(params.res);
                                        }
                                    });
                                }
                            });

                        });
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing filename');
                    }
                    break;
                }
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
                    })) {
                        common.returnMessage(params, 400, 'Invalid path');
                    }
                    break;
                }

                break;
            }
            case '/o/ping': {
                common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}, (err) => {
                    if (err) {
                        return common.returnMessage(params, 404, 'DB Error');
                    }
                    else {
                        return common.returnMessage(params, 200, 'Success');
                    }
                });
                break;
            }
            case '/i/token': {
                switch (paths[3]) {
                case 'delete':
                    validateUser(() => {
                        if (params.qstring.tokenid) {
                            common.db.collection("auth_tokens").remove({
                                "_id": params.qstring.tokenid,
                                "owner": params.member._id + ""
                            }, function(err, res) {
                                if (err) {
                                    common.returnMessage(params, 404, err.message);
                                }
                                else {
                                    common.returnMessage(params, 200, res);
                                }
                            });
                        }
                        else {
                            common.returnMessage(params, 404, "Token id not provided");
                        }
                    }, params);
                    break;
                case 'create':
                    validateUser(params, () => {
                        let ttl, multi, endpoint, purpose, apps;
                        if (params.qstring.ttl) {
                            ttl = parseInt(params.qstring.ttl);
                        }
                        else {
                            ttl = 1800;
                        }
                        multi = true;
                        if (params.qstring.multi === false || params.qstring.multi === 'false') {
                            multi = false;
                        }
                        apps = params.qstring.apps || "";
                        if (params.qstring.apps) {
                            apps = params.qstring.apps.split(',');
                        }

                        if (params.qstring.endpointquery && params.qstring.endpointquery !== "") {
                            try {
                                endpoint = JSON.parse(params.qstring.endpointquery); //structure with also info for qstring params.
                            }
                            catch (ex) {
                                if (params.qstring.endpoint) {
                                    endpoint = params.qstring.endpoint.split(',');
                                }
                                else {
                                    endpoint = "";
                                }
                            }
                        }
                        else if (params.qstring.endpoint) {
                            endpoint = params.qstring.endpoint.split(',');
                        }

                        if (params.qstring.purpose) {
                            purpose = params.qstring.purpose;
                        }
                        authorize.save({
                            db: common.db,
                            ttl: ttl,
                            multi: multi,
                            owner: params.member._id + "",
                            app: apps,
                            endpoint: endpoint,
                            purpose: purpose,
                            callback: (err, token) => {
                                if (err) {
                                    common.returnMessage(params, 404, err);
                                }
                                else {
                                    common.returnMessage(params, 200, token);
                                }
                            }
                        });
                    });
                    break;
                default:
                    common.returnMessage(params, 400, 'Invalid path, must be one of /delete or /create');
                }
                break;
            }
            case '/o/token': { //returns all my tokens
                switch (paths[3]) {
                case 'check':
                    if (!params.qstring.token) {
                        common.returnMessage(params, 400, 'Missing parameter "token"');
                        return false;
                    }

                    validateUser(params, function() {
                        authorize.check_if_expired({
                            token: params.qstring.token,
                            db: common.db,
                            callback: (err, valid, time_left)=>{
                                if (err) {
                                    common.returnMessage(params, 404, err.message);
                                }
                                else {
                                    common.returnMessage(params, 200, {
                                        valid: valid,
                                        time: time_left
                                    });
                                }
                            }
                        });
                    });
                    break;
                case 'list':
                    validateUser(params, function() {
                        common.db.collection("auth_tokens").find({"owner": params.member._id + ""}).toArray(function(err, res) {
                            if (err) {
                                common.returnMessage(params, 404, err.message);
                            }
                            else {
                                common.returnMessage(params, 200, res);
                            }
                        });
                    });
                    break;
                default:
                    common.returnMessage(params, 400, 'Invalid path, must be one of /list');
                }
                break;
            }
            case '/o': {
                if (!params.qstring.app_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_id"');
                    return false;
                }

                switch (params.qstring.method) {
                case 'jobs':
                    validateUserForGlobalAdmin(params, countlyApi.data.fetch.fetchJobs, 'jobs');
                    break;
                case 'total_users':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTotalUsersObj, params.qstring.metric || 'users');
                    break;
                case 'get_period_obj':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.getPeriodObj, 'users');
                    break;
                case 'locations':
                case 'sessions':
                case 'users':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, 'users');
                    break;
                case 'app_versions':
                case 'device_details':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, 'device_details');
                    break;
                case 'devices':
                case 'carriers':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                    break;
                case 'cities':
                    if (plugins.getConfig("api", params.app && params.app.plugins, true).city_data !== false) {
                        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
                    }
                    else {
                        common.returnOutput(params, {});
                    }
                    break;
                case 'geodata': {
                    validateRead(params, 'core', function() {
                        if (params.qstring.loadFor === "cities") {
                            countlyApi.data.geoData.loadCityCoordiantes({"query": params.qstring.query}, function(err, data) {
                                common.returnOutput(params, data);
                            });
                        }
                    });
                    break;
                }
                case 'get_event_groups':
                    validateRead(params, 'core', countlyApi.data.fetch.fetchEventGroups);
                    break;
                case 'get_event_group':
                    validateRead(params, 'core', countlyApi.data.fetch.fetchEventGroupById);
                    break;
                case 'events':
                    if (params.qstring.events) {
                        try {
                            params.qstring.events = JSON.parse(params.qstring.events);
                        }
                        catch (SyntaxError) {
                            console.log('Parse events array failed', params.qstring.events, params.req.url, params.req.body);
                        }
                        if (params.qstring.overview) {
                            validateRead(params, 'core', countlyApi.data.fetch.fetchDataEventsOverview);
                        }
                        else {
                            validateRead(params, 'core', countlyApi.data.fetch.fetchMergedEventData);
                        }
                    }
                    else {
                        if (params.qstring.event && params.qstring.event.startsWith('[CLY]_group_')) {
                            validateRead(params, 'core', countlyApi.data.fetch.fetchMergedEventGroups);
                        }
                        else {
                            params.truncateEventValuesList = true;
                            validateRead(params, 'core', countlyApi.data.fetch.prefetchEventData, params.qstring.method);
                        }
                    }
                    break;
                case 'get_events':
                    validateRead(params, 'core', countlyApi.data.fetch.fetchCollection, 'events');
                    break;
                case 'top_events':
                    validateRead(params, 'core', countlyApi.data.fetch.fetchDataTopEvents);
                    break;
                case 'all_apps':
                    validateUserForGlobalAdmin(params, countlyApi.data.fetch.fetchAllApps);
                    break;
                case 'notes':
                    validateRead(params, 'core', countlyApi.mgmt.users.fetchNotes);
                    break;
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid method');
                    }
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
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchDashboard);
                    break;
                case 'countries':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchCountries);
                    break;
                case 'sessions':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchSessions);
                    break;
                case 'metric':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchMetric);
                    break;
                case 'tops':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTops);
                    break;
                case 'loyalty':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchLoyalty);
                    break;
                case 'frequency':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchFrequency);
                    break;
                case 'durations':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchDurations);
                    break;
                case 'events':
                    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchEvents);
                    break;
                default:
                    if (!plugins.dispatch(apiPath, {
                        params: params,
                        validateUserForDataReadAPI: validateUserForDataReadAPI,
                        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
                        paths: paths,
                        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
                        validateUserForGlobalAdmin: validateUserForGlobalAdmin
                    })) {
                        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard or /countries');
                    }
                    break;
                }

                break;
            }
            case '/o/countly_version': {
                validateUser(params, () => {
                    //load previos version info if exist
                    loadFsVersionMarks(function(errFs, fsValues) {
                        loadDbVersionMarks(function(errDb, dbValues) {
                            var response = {};
                            if (errFs) {
                                response.fs = errFs;
                            }
                            else {
                                response.fs = fsValues;
                            }
                            if (errDb) {
                                response.db = errDb;
                            }
                            else {
                                response.db = dbValues;
                            }
                            response.pkg = packageJson.version || "";
                            var statusCode = (errFs && errDb) ? 400 : 200;
                            common.returnMessage(params, statusCode, response);
                        });
                    });
                });
                break;
            }
            case '/o/sdk': {
                params.ip_address = params.qstring.ip_address || common.getIpAddress(params.req);
                params.user = {};

                if (!params.qstring.app_key || !params.qstring.device_id) {
                    common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
                    return false;
                }
                else {
                    params.qstring.device_id += "";
                    params.app_user_id = common.crypto.createHash('sha1')
                        .update(params.qstring.app_key + params.qstring.device_id + "")
                        .digest('hex');
                }

                log.d('processing request %j', params.qstring);

                params.promises = [];

                validateAppForFetchAPI(params, () => { });

                break;
            }
            case '/o/notes': {
                validateUserForDataReadAPI(params, 'core', countlyApi.mgmt.users.fetchNotes);
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
        }
        else {
            if (!params.res.finished) {
                common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
            }
            common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
        }
    },
    function() {});
};

/**
 * Process Request Data
 * @param {params} params - params object
 * @param {object} app - app document
 * @param {function} done - callbck when processing done
 */
const processRequestData = (params, app, done) => {

    //preserve time for user's previous session
    params.previous_session = params.app_user.lsid;
    params.previous_session_start = params.app_user.ls;
    params.request_id = params.request_hash + "_" + params.app_user.uid + "_" + params.time.mstimestamp;

    var ob = {params: params, app: app, updates: []};
    plugins.dispatch("/sdk/user_properties", ob, function() {
        var update = {};
        //check if we already processed app users for this request
        if (params.app_user.last_req !== params.request_hash && ob.updates.length) {
            ob.updates.push({$set: {last_req: params.request_hash, ingested: false}});
            for (let i = 0; i < ob.updates.length; i++) {
                update = common.mergeQuery(update, ob.updates[i]);
            }
        }
        var newUser = params.app_user.fs ? false : true;
        common.updateAppUser(params, update, function() {
            if (!plugins.getConfig("api", params.app && params.app.plugins, true).safe && !params.res.finished) {
                common.returnMessage(params, 200, 'Success');
            }
            if (params.qstring.begin_session) {
                plugins.dispatch("/session/retention", {
                    params: params,
                    user: params.app_user,
                    isNewUser: newUser
                });
            }
            if (params.qstring.events) {
                if (params.promises) {
                    params.promises.push(countlyApi.data.events.processEvents(params));
                }
                else {
                    countlyApi.data.events.processEvents(params);
                }
            }
            //process the rest of the plugins as usual
            plugins.dispatch("/i", {
                params: params,
                app: app
            });
            plugins.dispatch("/sdk/data_ingestion", {params: params}, function(result) {
                var retry = false;
                if (result && result.length) {
                    for (let index = 0; index < result.length; index++) {
                        if (result[index].status === "rejected") {
                            retry = true;
                            break;
                        }
                    }
                }
                if (!retry && plugins.getConfig("api", params.app && params.app.plugins, true).safe) {
                    //acknowledge data ingestion
                    common.updateAppUser(params, {$set: {ingested: true}});
                }
                if (!params.res.finished) {
                    if (retry) {
                        common.returnMessage(params, 400, 'Could not ingest data');
                    }
                    else {
                        common.returnMessage(params, 200, 'Success');
                    }
                }
                if (done) {
                    done();
                }
            });
        });
    });
};

/**
 * Process fetch request from sdk
 * @param  {object} params - params object
 * @param  {object} app - app document
 * @param  {function} done - callback when processing done
 */
const processFetchRequest = (params, app, done) => {
    if (params.qstring.metrics) {
        try {
            countlyApi.data.usage.returnAllProcessedMetrics(params);
        }
        catch (ex) {
            console.log("Could not process metrics");
        }
    }

    plugins.dispatch("/o/sdk", {
        params: params,
        app: app
    }, () => {
        if (!params.res.finished) {
            common.returnMessage(params, 400, 'Invalid method');
        }

        //LOGGING THE REQUEST AFTER THE RESPONSE HAS BEEN SENT
        plugins.dispatch("/o/sdk/log", {
            params: params,
            app: params.app
        }, () => { });

        return done ? done() : false;
    });
};

/**
 * Process Bulk Request
 * @param {number} i - request number in bulk
 * @param {array} requests - array of requests to process
 * @param {params} params - params object
 * @returns {void} void
 */
const processBulkRequest = (i, requests, params) => {
    const appKey = params.qstring.app_key;
    if (i === requests.length) {
        common.unblockResponses(params);
        if (plugins.getConfig("api", params.app && params.app.plugins, true).safe && !params.res.finished) {
            common.returnMessage(params, 200, 'Success');
        }
        return;
    }

    if (!requests[i] || (!requests[i].app_key && !appKey)) {
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
        'bulk': true,
        'populator': params.qstring.populator
    };

    tmpParams.qstring.app_key = (requests[i].app_key || appKey) + "";

    if (!tmpParams.qstring.device_id) {
        return processBulkRequest(i + 1, requests, params);
    }
    else {
        //make sure device_id is string
        tmpParams.qstring.device_id += "";
        tmpParams.app_user_id = common.crypto.createHash('sha1')
            .update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "")
            .digest('hex');
    }

    return validateAppForWriteAPI(tmpParams, () => {
        /**
        * Dispatches /sdk/end event upon finishing processing request
        **/
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
 * @param  {object} params - params object
 * @param  {String} type - source type
 * @param  {Function} done - done callback
 * @returns {Function} - done or boolean value
 */
const checksumSaltVerification = (params) => {
    if (params.app.checksum_salt && params.app.checksum_salt.length && !params.no_checksum) {
        const payloads = [];
        payloads.push(params.href.substr(params.fullPath.length + 1));

        if (params.req.method.toLowerCase() === 'post') {
            payloads.push(params.req.body);
        }
        if (typeof params.qstring.checksum !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum=" + params.qstring.checksum, "").replace("checksum=" + params.qstring.checksum, "");
                payloads[i] = common.crypto.createHash('sha1').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha1';
                plugins.dispatch("/sdk/cancel", {params: params});
                return false;
            }
        }
        else if (typeof params.qstring.checksum256 !== "undefined") {
            for (let i = 0; i < payloads.length; i++) {
                payloads[i] = (payloads[i] + "").replace("&checksum256=" + params.qstring.checksum256, "").replace("checksum256=" + params.qstring.checksum256, "");
                payloads[i] = common.crypto.createHash('sha256').update(payloads[i] + params.app.checksum_salt).digest('hex').toUpperCase();
            }
            if (payloads.indexOf((params.qstring.checksum256 + "").toUpperCase()) === -1) {
                common.returnMessage(params, 200, 'Request does not match checksum');
                console.log("Checksum did not match", params.href, params.req.body, payloads);
                params.cancelRequest = 'Request does not match checksum sha256';
                plugins.dispatch("/sdk/cancel", {params: params});
                return false;
            }
        }
        else {
            common.returnMessage(params, 200, 'Request does not have checksum');
            console.log("Request does not have checksum", params.href, params.req.body);
            params.cancelRequest = "Request does not have checksum";
            plugins.dispatch("/sdk/cancel", {params: params});
            return false;
        }
    }

    return true;
};


/**
 * Validate App for Write API
 * Checks app_key from the http request against "apps" collection.
 * This is the first step of every write request to API.
 * @param {params} params - params object
 * @param {function} done - callback when processing done
 * @param {number} try_times - how many times request was retried
 * @returns {void} void
 */
const validateAppForWriteAPI = (params, done, try_times) => {
    if (ignorePossibleDevices(params)) {
        return done ? done() : false;
    }

    common.readBatcher.getOne("apps", {'key': params.qstring.app_key + ""}, (err, app) => {
        if (!app) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            return done ? done() : false;
        }

        if (app.paused) {
            common.returnMessage(params, 400, 'App is currently not accepting data');
            params.cancelRequest = "App is currently not accepting data";
            plugins.dispatch("/sdk/cancel", {params: params});
            return done ? done() : false;
        }

        if ((params.populator || params.qstring.populator) && app.locked) {
            common.returnMessage(params, 403, "App is locked");
            params.cancelRequest = "App is locked";
            plugins.dispatch("/sdk/cancel", {params: params});
            return false;
        }

        params.app_id = app._id;
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);


        var time = Date.now().valueOf();
        time = Math.round((time || 0) / 1000);
        if (params.app && (!params.app.last_data || params.app.last_data < time - 60 * 60 * 24)) { //update if more than day passed
            //set new value
            common.db.collection("apps").update({"_id": common.db.ObjectID(params.app._id)}, {"$set": {"last_data": time}}, function(err1) {
                if (err1) {
                    console.log("Failed to update apps collection " + err1);
                }
                common.readBatcher.invalidate("apps", {"key": params.app.key}, {}, false); //because we load app by key  on incoming requests. so invalidate also by key
            });
        }

        if (!checksumSaltVerification(params)) {
            return done ? done() : false;
        }

        if (typeof params.qstring.tz !== 'undefined' && !isNaN(parseInt(params.qstring.tz))) {
            params.user.tz = parseInt(params.qstring.tz);
        }

        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err2, user) => {
            if (err2) {
                common.returnMessage(params, 400, 'Cannot get app user');
                params.cancelRequest = "Cannot get app user or no Database connection";
                return done ? done() : false;
            }
            params.app_user = user || {};

            let payload = params.href.substr(3) || "";
            if (params.req.method.toLowerCase() === 'post') {
                payload += params.req.body;
            }
            params.request_hash = common.crypto.createHash('sha1').update(payload).digest('hex') + (params.qstring.timestamp || params.time.mstimestamp);
            if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests) {
                //check unique millisecond timestamp, if it is the same as the last request had,
                //then we are having duplicate request, due to sudden connection termination
                if (params.app_user.last_req === params.request_hash && (!plugins.getConfig("api", params.app && params.app.plugins, true).safe || params.app_user.ingested)) {
                    params.cancelRequest = "Duplicate request";
                }
            }

            if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
                try {
                    params.qstring.metrics = JSON.parse(params.qstring.metrics);
                }
                catch (SyntaxError) {
                    console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                }
            }

            plugins.dispatch("/sdk/pre", {
                params: params,
                app: app
            }, () => {
                plugins.dispatch("/sdk", {
                    params: params,
                    app: app
                }, () => {
                    plugins.dispatch("/sdk/log", {params: params});
                    if (!params.cancelRequest) {
                        processUser(params, validateAppForWriteAPI, done, try_times).then((userErr) => {
                            if (userErr) {
                                if (!params.res.finished) {
                                    common.returnMessage(params, 400, userErr);
                                }
                            }
                            else {
                                processRequestData(params, app, done);
                            }
                        });
                    }
                    else {
                        if (!params.res.finished && !params.waitForResponse) {
                            common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                            //common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                        }
                        common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                        return done ? done() : false;
                    }
                });
            });
        });
    });
};

/**
 * Validate app for fetch API from sdk
 * @param  {object} params - params object
 * @param  {function} done - callback when processing done
 * @param  {number} try_times - how many times request was retried
 * @returns {function} done - done callback
 */
const validateAppForFetchAPI = (params, done, try_times) => {
    if (ignorePossibleDevices(params)) {
        return done ? done() : false;
    }
    common.readBatcher.getOne("apps", {'key': params.qstring.app_key}, (err, app) => {
        if (!app) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            return done ? done() : false;
        }

        params.app_id = app._id;
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

        if (!checksumSaltVerification(params)) {
            return done ? done() : false;
        }

        if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
            try {
                params.qstring.metrics = JSON.parse(params.qstring.metrics);
            }
            catch (SyntaxError) {
                console.log('Parse metrics JSON failed for sdk fetch request', params.qstring.metrics, params.req.url, params.req.body);
            }
        }

        var parallelTasks = [countlyApi.data.usage.setLocation(params)];

        var processThisUser = true;

        if (app.paused) {
            log.d("App is currently not accepting data");
            processThisUser = false;
        }

        if ((params.populator || params.qstring.populator) && app.locked) {
            log.d("App is locked");
            processThisUser = false;
        }

        if (!processThisUser) {
            parallelTasks.push(fetchAppUser(params));
        }
        else {
            parallelTasks.push(fetchAppUser(params).then(() => {
                return processUser(params, validateAppForFetchAPI, done, try_times);
            }));
        }

        Promise.all(
            parallelTasks
        )
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                processFetchRequest(params, app, done);
            });
    });
};

/**
 * Restart Request
 * @param {params} params - params object
 * @param {function} initiator - function which initiated request
 * @param {function} done - callback when processing done
 * @param {number} try_times - how many times request was retried
 * @param {function} fail - callback when restart limit reached
 * @returns {void} void
 */
const restartRequest = (params, initiator, done, try_times, fail) => {
    if (!try_times) {
        try_times = 1;
    }
    else {
        try_times++;
    }
    if (try_times > 5) {
        console.log("Too many retries", try_times);
        if (typeof fail === "function") {
            fail("Cannot process request. Too many retries");
        }
        return;
    }
    params.retry_request = true;
    //retry request
    initiator(params, done, try_times);
};

/**
 * @param  {object} params - params object
 * @param  {function} initiator - function which initiated request
 * @param  {function} done - callback when processing done
 * @param  {number} try_times - how many times request was retried
 * @returns {Promise} - resolved
 */
function processUser(params, initiator, done, try_times) {
    return new Promise((resolve) => {
        if (!params.app_user.uid) {
            //first time we see this user, we need to id him with uid
            countlyApi.mgmt.appUsers.getUid(params.app_id, function(err, uid) {
                plugins.dispatch("/i/app_users/create", {
                    app_id: params.app_id,
                    user: {uid: uid, did: params.qstring.device_id, _id: params.app_user_id },
                    res: {uid: uid, did: params.qstring.device_id, _id: params.app_user_id },
                    params: params
                });
                if (uid) {
                    params.app_user.uid = uid;
                    if (!params.app_user._id) {
                        //if document was not yet created
                        //we try to insert one with uid
                        //even if paralel request already inserted uid
                        //this insert will fail
                        //but we will retry again and fetch new inserted document
                        common.db.collection('app_users' + params.app_id).insert({
                            _id: params.app_user_id,
                            uid: uid,
                            did: params.qstring.device_id
                        }, {ignore_errors: [11000]}, function() {
                            restartRequest(params, initiator, done, try_times, resolve);
                        });
                    }
                    else {
                        //document was created, but has no uid
                        //here we add uid only if it does not exist in db
                        //so if paralel request inserted it, we will not overwrite it
                        //and retrieve that uid on retry
                        common.db.collection('app_users' + params.app_id).update({
                            _id: params.app_user_id,
                            uid: {$exists: false}
                        }, {$set: {uid: uid}}, {upsert: true, ignore_errors: [11000]}, function() {
                            restartRequest(params, initiator, done, try_times, resolve);
                        });
                    }
                }
                else {
                    //cannot create uid, so cannot process request now
                    console.log("Cannot create uid", err, uid);
                    resolve("Cannot create uid");
                }
            });
        }
        //check if device id was changed
        else if (params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
            const old_id = common.crypto.createHash('sha1')
                .update(params.qstring.app_key + params.qstring.old_device_id + "")
                .digest('hex');

            countlyApi.mgmt.appUsers.merge(params.app_id, params.app_user, params.app_user_id, old_id, params.qstring.device_id, params.qstring.old_device_id, function(err) {
                if (err) {
                    return common.returnMessage(params, 400, 'Cannot update user');
                }
                //remove old device ID and retry request
                params.qstring.old_device_id = null;
                restartRequest(params, initiator, done, try_times, resolve);
            });
        }
        else {
            resolve();
        }
    });
}

/**
 * Function to fetch app user from db
 * @param  {object} params - params object
 * @returns {promise} - user
 */
const fetchAppUser = (params) => {
    return new Promise((resolve) => {
        common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id}, (err2, user) => {
            params.app_user = user || {};
            return resolve(user);
        });
    });
};

/**
 * Add devices to ignore them
 * @param  {params} params - params object
 * @param  {function} done - callback when processing done
 * @returns {function} done
 */
const ignorePossibleDevices = (params) => {
    //ignore possible opted out users for ios 10
    if (params.qstring.device_id === "00000000-0000-0000-0000-000000000000") {
        common.returnMessage(params, 400, 'Ignoring device_id');
        common.log("request").i('Request ignored: Ignoring zero IDFA device_id', params.req.url, params.req.body);
        params.cancelRequest = "Ignoring zero IDFA device_id";
        plugins.dispatch("/sdk/cancel", {params: params});
        return true;
    }
};

/**
 * Fetches version mark history (filesystem)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadFsVersionMarks(callback) {
    fs.readFile(path.resolve(__dirname, "./../../countly_marked_version.json"), function(err, data) {
        if (err) {
            callback(err, []);
        }
        else {
            var olderVersions = [];
            try {
                olderVersions = JSON.parse(data);
            }
            catch (parseErr) { //unable to parse file
                console.log(parseErr);
                callback(parseErr, []);
            }
            if (Array.isArray(olderVersions)) {
                //sort versions here.
                olderVersions.sort(function(a, b) {
                    if (typeof a.updated !== "undefined" && typeof b.updated !== "undefined") {
                        return a.updated - b.updated;
                    }
                    else {
                        return 1;
                    }
                });
                callback(null, olderVersions);
            }
        }
    });
}

/**
 * Fetches version mark history (database)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadDbVersionMarks(callback) {
    common.db.collection('plugins').find({'_id': 'version'}, {"history": 1}).toArray(function(err, versionDocs) {
        if (err) {
            console.log(err);
            callback(err, []);
            return;
        }
        var history = [];
        if (versionDocs[0] && versionDocs[0].history) {
            history = versionDocs[0].history;
        }
        callback(null, history);
    });
}

/** @lends module:api/utils/requestProcessor */
module.exports = {processRequest: processRequest, processUserFunction: processUser};