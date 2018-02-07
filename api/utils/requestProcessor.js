const Promise = require('bluebird');
const common = require('./common.js');
const {validateUser, validateUserForRead, validateUserForWrite, validateGlobalAdmin} = require('./rights.js');
const authorize = require('./authorizer.js');
const plugins = require('../../plugins/pluginManager.js');
const versionInfo = require('../../frontend/express/version.info');
const log = require('./log.js')('core:api');
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
        apps: require('../parts/mgmt/apps.js')
    }
};

/**
 * Process Request
 * @param params
 * @returns {boolean}
 */
const processRequest = (params) => {
    let apiPath = '';
    const urlParts = params.urlParts;
    const paths = params.paths || urlParts.pathname.split("/");

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
                    return common.returnMessage(params, 200, 'Success');
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
                                return common.returnMessage(params, 401, 'User is not a global administrator');
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
                        validateUserForWriteAPI(() => {
                            taskmanager.rerunTask({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                return common.returnMessage(params, 200, res);
                            });
                        }, params);
                        break;
                    case 'delete':
                        validateUserForWriteAPI(() => {
                            taskmanager.deleteResult({db: common.db, id: params.qstring.task_id}, (err, res) => {
                                return common.returnMessage(params, 200, "Success");
                            });
                        }, params);
                        break;
                    case 'name':
                        validateUserForWriteAPI(() => {
                            taskmanager.deleteResult({
                                db: common.db,
                                id: params.qstring.task_id,
                                name: params.qstring.name
                            }, (err, res) => {
                                return common.returnMessage(params, 200, "Success");
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

                if (!params.res || Object.keys(params.res).length === 0) {
                    return false;
                }

                if (!plugins.getConfig("api").safe && !params.res.finished) {
                    return common.returnMessage(params, 200, 'Success');
                }

                if (!plugins.getConfig("api").safe && !params.res.finished) {
                    return common.returnMessage(params, 200, 'Success');
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
                                    return false;
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
                                    return common.returnMessage(params, 200, params.res.status);
                                }
                                else {
                                    common.returnMessage(params, 400, 'Task does not exist');
                                    return false;
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
                            return false;
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
                            if (typeof params.qstring.projection === "string") {
                                try {
                                    params.qstring.projection = JSON.parse(params.qstring.projection);
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
                common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}, (err, result) => {
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
                                return common.returnMessage(params, 404, 'DB Error');
                            }
                            else {
                                return common.returnMessage(params, 200, token);
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
                        return false;
                    }
                }
        }
    } else {
        if (plugins.getConfig("api").safe && !params.res.finished) {
            return common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
        }
        common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
    }
};

/**
 * Process Request Data
 */
const processRequestData = (params, app) => {
    plugins.dispatch("/i", {params: params, app: app});

    if (params.qstring.events) {
        if (params.promises)
            params.promises.push(countlyApi.data.events.processEvents(params));
        else
            countlyApi.data.events.processEvents(params);
    } else if (plugins.getConfig("api").safe && !params.bulk) {
        return common.returnMessage(params, 200, 'Success');
    }

    if (countlyApi.data.usage.processLocationRequired(params)) {
        countlyApi.data.usage.processLocation(params).then(() => continueProcessingRequestData(params, () => {}));
    } else {
        continueProcessingRequestData(params, () => {});
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
            return common.returnMessage(params, 200, 'Success');
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

                        //checking if there is an old user
                        common.db.collection('app_users' + params.app_id).findOne({'_id': old_id}, (err, oldAppUser) => {
                            if (!err && oldAppUser) {
                                //checking if there is a new user
                                const newAppUser = params.app_user;
                                if (Object.keys(newAppUser).length) {
                                    if (newAppUser.ls && newAppUser.ls > oldAppUser.ls) {
                                        mergeUserData(newAppUser, oldAppUser, params);
                                    }
                                    else {
                                        //switching user identidy
                                        let temp = oldAppUser._id;
                                        oldAppUser._id = newAppUser._id;
                                        newAppUser._id = temp;

                                        temp = oldAppUser.did;
                                        oldAppUser.did = newAppUser.did;
                                        newAppUser.did = temp;

                                        temp = oldAppUser.uid;
                                        oldAppUser.uid = newAppUser.uid;
                                        newAppUser.uid = temp;

                                        mergeUserData(oldAppUser, newAppUser, params);
                                    }
                                }
                                else {
                                    //simply copy user document with old uid
                                    //no harm is done
                                    oldAppUser.did = params.qstring.device_id + "";
                                    oldAppUser._id = params.app_user_id;
                                    common.db.collection('app_users' + params.app_id).insert(oldAppUser, () => {
                                        common.db.collection('app_users' + params.app_id).remove({_id: old_id}, () => {
                                            restartRequest(params);
                                        });
                                    });
                                }
                            }
                            else {
                                //process request
                                restartRequest(params);
                            }
                        });

                        //do not proceed with request
                        return false;
                    }
                    else if (!params.app_user.uid) {
                        common.db.collection('apps').findAndModify(
                            {_id: common.db.ObjectID(params.app_id)},
                            {},
                            {$inc: {seq: 1}},
                            {
                                new: true,
                                upsert: true
                            },
                            (err, result) => {
                                result = result && result.ok ? result.value : null;
                                if (result && result.seq) {
                                    params.app_user.uid = common.parseSequence(result.seq);
                                    common.updateAppUser(params, {$set: {uid: params.app_user.uid}});
                                    processRequestData(params, app);
                                }
                            });
                    }
                    else {
                        processRequestData(params, app);
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
 * Merge User Data
 * @param newAppUser
 * @param oldAppUser
 * @param params
 */
const mergeUserData = (newAppUser, oldAppUser, params) => {
    //allow plugins to deal with user merging properties
    plugins.dispatch("/i/user_merge", {
        params: params,
        newAppUser: newAppUser,
        oldAppUser: oldAppUser
    });
    //merge user data
    for (const i in oldAppUser) {
        // sum up session count and total session duration
        if (i === "sc" || i === "tsd") {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = 0;
            newAppUser[i] += oldAppUser[i];
        }
        //check if old user has been seen before new one
        else if (i === "fs") {
            if (!newAppUser.fs || oldAppUser.fs < newAppUser.fs)
                newAppUser.fs = oldAppUser.fs;
        }
        //check if old user has been seen before new one
        else if (i === "fac") {
            if (!newAppUser.fac || oldAppUser.fac < newAppUser.fac)
                newAppUser.fac = oldAppUser.fac;
        }
        //check if old user has been the last to be seen
        else if (i === "ls") {
            if (!newAppUser.ls || oldAppUser.ls > newAppUser.ls) {
                newAppUser.ls = oldAppUser.ls;
                //then also overwrite last session data
                if (oldAppUser.lsid)
                    newAppUser.lsid = oldAppUser.lsid;
                if (oldAppUser.sd)
                    newAppUser.sd = oldAppUser.sd;
            }
        }
        //check if old user has been the last to be seen
        else if (i === "lac") {
            if (!newAppUser.lac || oldAppUser.lac > newAppUser.lac) {
                newAppUser.lac = oldAppUser.lac;
            }
        }
        else if (i === "lest") {
            if (!newAppUser.lest || oldAppUser.lest > newAppUser.lest) {
                newAppUser.lest = oldAppUser.lest;
            }
        }
        else if (i === "lbst") {
            if (!newAppUser.lbst || oldAppUser.lbst > newAppUser.lbst) {
                newAppUser.lbst = oldAppUser.lbst;
            }
        }
        //merge custom user data
        else if (typeof oldAppUser[i] === "object" && oldAppUser[i]) {
            if (typeof newAppUser[i] === "undefined")
                newAppUser[i] = {};
            for (const j in oldAppUser[i]) {
                //set properties that new user does not have
                if (typeof newAppUser[i][j] === "undefined")
                    newAppUser[i][j] = oldAppUser[i][j];
            }
        }
        //set other properties that new user does not have
        else if (i !== "_id" && i !== "did" && typeof newAppUser[i] === "undefined") {
            newAppUser[i] = oldAppUser[i];
        }
    }
    //update new user
    common.updateAppUser(params, {'$set': newAppUser}, () => {
        //delete old user
        common.db.collection('app_users' + params.app_id).remove({_id: old_id}, () => {
            //let plugins know they need to merge user data
            common.db.collection("metric_changes" + params.app_id).update(
                {uid: oldAppUser.uid},
                {'$set': {uid: newAppUser.uid}},
                {multi: true},
                (err, res) => {
                });
            plugins.dispatch("/i/device_id", {
                params: params,
                app: app,
                oldUser: oldAppUser,
                newUser: newAppUser
            });
            restartRequest(params, () => {});
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

module.exports = {
    processRequest: processRequest
};
