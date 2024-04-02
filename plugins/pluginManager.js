var pluginDependencies = require('./pluginDependencies.js'),
    path = require('path'),
    plugins = pluginDependencies.getFixedPluginList(require('./plugins.json', 'dont-enclose'), {
        "discoveryStrategy": "disableChildren",
        "overwrite": path.resolve(__dirname, './plugins.json')
    }),
    pluginsApis = {},
    mongodb = require('mongodb'),
    cluster = require('cluster'),
    countlyConfig = require('../frontend/express/config', 'dont-enclose'),
    apiCountlyConfig = require('../api/config', 'dont-enclose'),
    utils = require('../api/utils/utils.js'),
    fs = require('fs'),
    url = require('url'),
    querystring = require('querystring'),
    cp = require('child_process'),
    async = require("async"),
    _ = require('underscore'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    log = require('../api/utils/log.js'),
    logDbRead = log('db:read'),
    logDbWrite = log('db:write'),
    logDriverDb = log('driver:db'),
    exec = cp.exec,
    spawn = cp.spawn,
    configextender = require('../api/configextender');
var pluginConfig = {};

/**
* This module handles communicaton with plugins
* @module "plugins/pluginManager"
*/

/** @lends module:plugins/pluginManager */
var pluginManager = function pluginManager() {
    var events = {};
    var plugs = [];
    var methodCache = {};
    var methodPromiseCache = {};
    var configs = {};
    var defaultConfigs = {};
    var configsOnchanges = {};
    var excludeFromUI = {plugins: true};
    var finishedSyncing = true;
    var expireList = [];
    var masking = {};

    /**
     *  Registered app types
     */
    this.appTypes = [];
    /**
     *  Events prefixed with [CLY]_ that should be recorded in core as standard data model
     */
    this.internalEvents = [];
    /**
     *  Events prefixed with [CLY]_ that should be recorded in drill
     */
    this.internalDrillEvents = ["[CLY]_session"];
    /**
     *  Segments for events prefixed with [CLY]_ that should be omitted
     */
    this.internalOmitSegments = {};
    /**
     *  Custom configuration files for different databases
     */
    this.dbConfigFiles = {
        countly_drill: "./drill/config.js",
        countly_out: "../api/configs/config.db_out.js",
        countly_fs: "../api/configs/config.db_fs.js"
    };

    /**
     *  Custom configuration files for different databases for docker env
     */
    this.dbConfigEnvs = {
        countly_drill: "PLUGINDRILL",
        countly_out: "PLUGINOUT",
        countly_fs: "PLUGINFS"
    };

    /**
    * Initialize api side plugins
    **/
    this.init = function() {
        for (let i = 0, l = plugins.length; i < l; i++) {
            try {
                pluginsApis[plugins[i]] = require("./" + plugins[i] + "/api/api");
            }
            catch (ex) {
                console.error(ex.stack);
            }
        }
    };

    this.updatePluginsInDb = function(db, params, callback) {
        try {
            params.qstring.plugin = JSON.parse(params.qstring.plugin);
        }
        catch (err) {
            console.log('Error parsing plugins');
        }

        if (params.qstring.plugin && typeof params.qstring.plugin === 'object') {
            var self = this;
            var before = {};
            var fordb = {};
            var arr = self.getPlugins();
            for (var i in params.qstring.plugin) {
                fordb['plugins.' + i] = params.qstring.plugin[i];
                if (arr.indexOf(i) === -1) {
                    before[i] = false;
                }
                else {
                    before[i] = true;
                }
            }
            db.collection('plugins').updateOne({'_id': 'plugins'}, {'$set': fordb}, function(err1) {
                if (err1) {
                    log.e(err1);
                }
                else {
                    self.dispatch("/systemlogs", {params: params, action: "change_plugins", data: {before: before, update: params.qstring.plugin}});
                    // process.send({ cmd: "startPlugins" });
                    self.loadConfigs(db, function() {
                        callback();
                    });
                }
            });
        }

    };


    this.initPlugin = function(pluginName) {
        try {
            pluginsApis[pluginName] = require("./" + pluginName + "/api/api");
        }
        catch (ex) {
            console.error(ex.stack);
        }
    };

    this.installMissingPlugins = function(db, callback) {
        console.log("Checking if any plugins are missing");
        var self = this;
        var installPlugins = [];
        db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
            res = res || {};
            pluginConfig = res.plugins || {}; //currently enabled plugins
            //list of plugin folders
            var pluginNames = [];
            var pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
            //filter out just folders
            for (var z = 0; z < pluginsList.length; z++) {
                var p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
                if (p.isDirectory() || p.isSymbolicLink()) {
                    pluginNames.push(pluginsList[z]);
                }
            }
            for (var zz = 0; zz < pluginNames.length; zz++) {
                if (typeof pluginConfig[pluginNames[zz]] === 'undefined') {
                    installPlugins.push(pluginNames[zz]);
                }
            }
            if (installPlugins.length > 0) {
                console.log("Plugins to install: " + JSON.stringify(installPlugins));
            }
            Promise.each(installPlugins, function(name) {
                return new Promise(function(resolve) {
                    var obb = {'name': name};
                    if (plugins.indexOf(name) === -1) {
                        obb.enable = false;
                    }
                    else {
                        obb.enable = true;
                    }
                    self.processPluginInstall(db, obb, function() {
                        resolve();
                    });
                });
            }).then(function() {
                if (callback) {
                    callback();
                }
            }).catch(function(rejection) {
                console.log(rejection);
                if (callback) {
                    callback();
                }
            });


        });
    };
    /**
    * Load configurations from database
    * @param {object} db - database connection for countly db
    * @param {function} callback - function to call when configs loaded
    * @param {boolean} api - was the call made from api process
    **/
    this.loadConfigs = function(db, callback/*, api*/) {
        var self = this;
        db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
            if (err) {
                console.log(err);
            }
            if (!err) {
                res = res || {};
                for (let ns in configsOnchanges) {
                    if (configs && res && (!configs[ns] || !res[ns] || !_.isEqual(configs[ns], res[ns]))) {
                        configs[ns] = res[ns];
                        configsOnchanges[ns](configs[ns]);
                    }
                }
                configs = res;
                delete configs._id;
                self.checkConfigs(db, configs, defaultConfigs, function() {
                    pluginConfig = res.plugins || {}; //currently enabled plugins
                    var installPlugins = [];
                    for (var z = 0; z < plugins.length; z++) {
                        if (typeof pluginConfig[plugins[z]] === 'undefined') {
                            pluginConfig[plugins[z]] = true;
                            //installPlugins.push(plugins[z]);
                        }
                    }
                    Promise.each(installPlugins, function(name) {
                        return new Promise(function(resolve) {
                            self.processPluginInstall(db, name, function() {
                                resolve();
                            });
                        });
                    }).then(function() {
                        if (callback) {
                            callback();
                        }
                    }).catch(function(rejection) {
                        console.log(rejection);
                        if (callback) {
                            callback();
                        }
                    });
                    /*if (api && self.getConfig("api").sync_plugins) {
						self.checkPlugins(db);
					}*/

                    if (self.getConfig("data-manager").enableDataMasking) {
                        self.fetchMaskingConf({"db": db});
                    }
                });

            }
            else if (callback) {
                callback();
            }
        });

    };

    /**
    * Set default configurations
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - object with key/values default configurations
    * @param {boolean} exclude - should these configurations be excluded from dashboard UI
    * @param {function} onchange - function to call when configurations change
    **/
    this.setConfigs = function(namespace, conf, exclude, onchange) {
        if (!defaultConfigs[namespace]) {
            defaultConfigs[namespace] = conf;
        }
        else {
            for (let i in conf) {
                defaultConfigs[namespace][i] = conf[i];
            }
        }
        if (exclude) {
            excludeFromUI[namespace] = true;
        }
        if (onchange) {
            configsOnchanges[namespace] = onchange;
        }
    };

    /**
     * Add collection to expire list
     * @param {string} collection - collection name
     **/
    this.addCollectionToExpireList = function(collection) {
        expireList.push(collection);
    };

    /**
     * Get expire list array
     * @returns {array} expireList - expireList array that created from plugins
     **/
    this.getExpireList = function() {
        return expireList;
    };

    /**
    * Set user level default configurations
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - object with key/values default configurations
    **/
    this.setUserConfigs = function(namespace, conf) {
        if (!defaultConfigs[namespace]) {
            defaultConfigs[namespace] = {};
        }

        if (!defaultConfigs[namespace]._user) {
            defaultConfigs[namespace]._user = {};
        }

        for (let i in conf) {
            defaultConfigs[namespace]._user[i] = conf[i];
        }
    };

    /**
    * Get configuration from specific namespace and populate empty values with provided defaults
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} userSettings - possible other level configuration like user or app level to overwrite configs
    * @param {boolean} override - if true, would simply override configs with userSettings, if false, would check if configs should be overridden
    * @returns {object} copy of configs for provided namespace
    **/
    this.getConfig = function(namespace, userSettings, override) {
        var ob = {};
        if (configs[namespace]) {
            for (let i in configs[namespace]) {
                if (i === "_user") {
                    ob[i] = {};
                    for (let j in configs[namespace][i]) {
                        ob[i][j] = configs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = configs[namespace][i];
                }
            }
        }
        else if (defaultConfigs[namespace]) {
            for (let i in defaultConfigs[namespace]) {
                if (i === "_user") {
                    ob[i] = {};
                    for (let j in defaultConfigs[namespace][i]) {
                        ob[i][j] = defaultConfigs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = defaultConfigs[namespace][i];
                }
            }
        }

        //overwrite server settings by other level settings
        if (override && userSettings && userSettings[namespace]) {
            for (let i in userSettings[namespace]) {
                //over write it
                ob[i] = userSettings[namespace][i];
            }
        }
        else if (!override) {
            //use db logic to check if overwrite
            if (userSettings && userSettings[namespace] && ob._user) {
                for (let i in ob._user) {
                    //check if this config is allowed to be overwritten
                    if (ob._user[i]) {
                        //over write it
                        ob[i] = userSettings[namespace][i];
                    }
                }
            }
        }
        return ob;
    };

    /**
    * Get all configs for all namespaces
    * @returns {object} copy of all configs
    **/
    this.getAllConfigs = function() {
        //get unique namespaces
        var a = Object.keys(configs);
        var b = Object.keys(defaultConfigs);
        var c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        var ret = {};
        for (let i = 0; i < c.length; i++) {
            if (!excludeFromUI[c[i]] && (plugins.indexOf(c[i]) === -1 || pluginConfig[c[i]])) {
                ret[c[i]] = this.getConfig(c[i]);
            }
        }
        return ret;
    };

    /**
    * Get all configs for all namespaces overwritted by user settings
    * @param {object} userSettings - possible other level configuration like user or app level to overwrite configs
    * @returns {object} copy of all configs
    **/
    this.getUserConfigs = function(userSettings) {
        userSettings = userSettings || {};
        //get unique namespaces
        var a = Object.keys(configs);
        var b = Object.keys(defaultConfigs);
        var c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        var ret = {};
        for (let i = 0; i < c.length; i++) {
            if (!excludeFromUI[c[i]]) {
                var conf = this.getConfig(c[i], userSettings);
                for (let name in conf) {
                    if (conf._user && conf._user[name]) {
                        if (!ret[c[i]]) {
                            ret[c[i]] = {};
                        }
                        ret[c[i]][name] = conf[name];
                    }
                }
            }
        }
        return ret;
    };

    /**
    * Check if there are changes in configs ans store the changes
    * @param {object} db - database connection for countly db
    * @param {object} current - current configs we have
    * @param {object} provided - provided configs
    * @param {function} callback - function to call when checking finished
    **/
    this.checkConfigs = function(db, current, provided, callback) {
        var diff = getObjectDiff(current, provided);
        if (Object.keys(diff).length > 0) {
            db.collection("plugins").findAndModify({_id: "plugins"}, {}, {$set: flattenObject(diff)}, {upsert: true, new: true}, function(err, res) {
                if (!err && res && res.value) {
                    for (var i in diff) {
                        if (res.value[i]) {
                            current[i] = res.value[i];
                        }
                    }
                }
                if (callback) {
                    callback();
                }
            });
        }
        else if (callback) {
            callback();
        }
    };

    /**
    * Update existing configs, when syncing between servers
    * @param {object} db - database connection for countly db
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - provided config
    * @param {function} callback - function to call when updating finished
    **/
    this.updateConfigs = function(db, namespace, conf, callback) {
        var update = {};
        if (namespace === "_id" || namespace === "plugins" && !this.getConfig("api").sync_plugins) {
            if (callback) {
                callback();
            }
        }
        else {
            update[namespace] = conf;
            db.collection("plugins").update({_id: "plugins"}, {$set: flattenObject(update)}, {upsert: true}, function() {
                if (callback) {
                    callback();
                }
            });
        }
    };

    /**
    * Update existing application level configuration
    * @param {object} db -database connection for countly db
    * @param {string} appId - id of application
    * @param {string} namespace - name of plugin
    * @param {object} config  - new configuration object for selected plugin 
    * @param {function} callback - function that is called when updating has finished
    **/
    this.updateApplicationConfigs = function(db, appId, namespace, config, callback) {
        var pluginName = 'plugins.'.concat(namespace);
        db.collection('apps').updateOne({_id: appId}, {$set: {[pluginName]: config}}, function(error, result) {
            if (error) {
                log.e('Error updating application level %s plugin configuration.Got error:%j', namespace, error);
            }
            if (callback) {
                if (error) {
                    callback(error, null);
                }
                else {
                    callback(null, result);
                }
            }
        });
    };

    var preventKillingNumberType = function(configsPointer, changes) {
        for (var k in changes) {
            if (!Object.prototype.hasOwnProperty.call(configsPointer, k) || !Object.prototype.hasOwnProperty.call(changes, k)) {
                continue;
            }
            if (changes[k] !== null && configsPointer[k] !== null) {
                if (typeof changes[k] === 'object' && typeof configsPointer[k] === 'object') {
                    preventKillingNumberType(configsPointer[k], changes[k]);
                }
                else if (typeof configsPointer[k] === 'number' && typeof changes[k] !== 'number') {
                    try {
                        changes[k] = parseInt(changes[k], 10);
                        changes[k] = changes[k] || 0;
                    }
                    catch (e) {
                        changes[k] = 2147483647;
                    }
                }
                else if (typeof configsPointer[k] === 'string' && typeof changes[k] === 'number') {
                    changes[k] = changes[k] + "";
                }
            }

        }
    };

    /**
    * Update all configs with provided changes
    * @param {object} db - database connection for countly db
    * @param {object} changes - provided changes
    * @param {function} callback - function to call when updating finished
    **/
    this.updateAllConfigs = function(db, changes, callback) {
        if (changes.api) {
            //country data tracking is changed
            if (changes.api.country_data) {
                //user disabled country data tracking while city data tracking is enabled
                if (changes.api.country_data === false && configs.api.city_data === true) {
                    //disable city data tracking
                    changes.api.city_data = false;
                }
            }
            //city data tracking is changed
            if (changes.api.city_data) {
                //user enabled city data tracking while country data tracking is disabled
                if (changes.api.city_data === true && configs.api.country_data === false) {
                    //enable country data tracking
                    changes.api.country_data = true;
                }
            }
        }
        for (let k in changes) {
            preventKillingNumberType(configs[k], changes[k]);
            _.extend(configs[k], changes[k]);
            if (k in configsOnchanges) {
                configsOnchanges[k](configs[k]);
            }
        }
        db.collection("plugins").update({_id: "plugins"}, {$set: flattenObject(configs)}, {upsert: true}, function() {
            if (callback) {
                callback();
            }
        });
    };

    /**
    * Update user configs with provided changes
    * @param {object} db - database connection for countly db
    * @param {object} changes - provided changes
    * @param {string} user_id - user for which to update settings
    * @param {function} callback - function to call when updating finished
    **/
    this.updateUserConfigs = function(db, changes, user_id, callback) {
        db.collection("members").findOne({ _id: db.ObjectID(user_id) }, function(err, member) {
            var update = {};
            for (let k in changes) {
                update[k] = {};
                _.extend(update[k], configs[k], changes[k]);

                if (member.settings && member.settings[k]) {
                    _.extend(update[k], member.settings[k], changes[k]);
                }
            }
            db.collection("members").update({ _id: db.ObjectID(user_id) }, { $set: flattenObject(update, "settings") }, { upsert: true }, function() {
                if (callback) {
                    callback();
                }
            });
        });
    };

    /**
    * Allow extending object module is exporting by using extend folders in countly
    * @param {string} name - filename to extend
    * @param {object} object - object to extend
    **/
    this.extendModule = function(name, object) {
        //plugin specific extend
        for (let i = 0, l = plugins.length; i < l; i++) {
            try {
                require("./" + plugins[i] + "/extend/" + name)(object);
            }
            catch (ex) {
                //silent error, not extending or no module
                if (!ex.code || ex.code !== "MODULE_NOT_FOUND") {
                    console.log(ex);
                }
            }
        }

        //global extend
        try {
            require("../extend/" + name)(object);
        }
        catch (ex) {
            //silent error, not extending or no module
            if (!ex.code || ex.code !== "MODULE_NOT_FOUND") {
                console.log(ex);
            }
        }
    };
    this.isPluginOn = function(name) {
        if (plugins.indexOf(name) > -1) { //is one of plugins
            if (pluginConfig[name]) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return true;
        }
    };

    this.getFeatureName = function() {
        var stack = new Error('test').stack;
        stack = stack.split('\n');
        //0 - error, 1 - this function, 2 - pluginmanager, 3 - right path)

        if (stack && stack[3]) {
            stack = stack[3];

            stack = stack.split('/');
            for (var z = 0; z < stack.length - 3; z++) {
                if (stack[z] === 'plugins') {
                    return stack[z + 1];
                }
            }
        }

    };
    /**
    * Register listening to new event on api side
    * @param {string} event - event to listen to
    * @param {function} callback - function to call, when event happens
    * @param {boolean} unshift - whether to register a high-priority callback (unshift it to the listeners array)
	* @param {string} featureName -  name of plugin
    **/
    this.register = function(event, callback, unshift = false, featureName) {
        if (!events[event]) {
            events[event] = [];
        }
        //{"cb":callback, "plugin":
        if (!featureName) {
            featureName = this.getFeatureName();
            featureName = featureName || 'core';
        }
        events[event][unshift ? 'unshift' : 'push']({"cb": callback, "name": featureName});
    };

    // TODO: Remove this function and all it calls when moving to Node 12.
    var promiseAllSettledBluebirdToStandard = function(bluebirdResults) {
        return bluebirdResults.map((bluebirdResult) => {
            const isFulfilled = bluebirdResult.isFulfilled();

            const status = isFulfilled ? 'fulfilled' : 'rejected';
            const value = isFulfilled ? bluebirdResult.value() : undefined;
            const reason = isFulfilled ? undefined : bluebirdResult.reason();

            return { status, value, reason };
        });
    };

    /**
    * Dispatch specific event on api side
    * @param {string} event - event to dispatch
    * @param {object} params - object with parameters to pass to event
    * @param {function} callback - function to call, when all event handlers that return Promise finished processing
    * @returns {boolean} true if any one responded to event
    **/
    this.dispatch = function(event, params, callback) {
        var used = false,
            promises = [];
        var promise;
        if (events[event]) {
            try {
                for (let i = 0, l = events[event].length; i < l; i++) {
                    var isEnabled = true;
                    if (events[event][i].name && plugins.indexOf(events[event][i].name) > -1 && !pluginConfig[events[event][i].name]) {
                        isEnabled = false;
                    }

                    if (events[event][i] && events[event][i].cb && isEnabled) {
                        try {
                            promise = events[event][i].cb.call(null, params);
                        }
                        catch (error) {
                            promise = Promise.reject(error);
                            console.error(error.stack);
                        }
                        if (promise) {
                            used = true;
                        }
                        promises.push(promise);
                    }
                }
            }
            catch (ex) {
                console.error(ex.stack);
            }

            //should we create a promise for this dispatch
            if (params && params.params && params.params.promises) {
                params.params.promises.push(new Promise(function(resolve) {
                    Promise.allSettled(promises).then(function(results) {
                        resolve();
                        if (callback) {
                            callback(null, promiseAllSettledBluebirdToStandard(results));
                        }
                    });
                }));
            }
            else if (callback) {
                Promise.allSettled(promises).then(function(results) {
                    callback(null, promiseAllSettledBluebirdToStandard(results));
                });
            }
        }
        else if (callback) {
            callback();
        }
        return used;
    };

    /**
    * Dispatch specific event on api side and wait until all event handlers have processed the event (legacy)
    * @param {string} event - event to dispatch
    * @param {object} params - object with parameters to pass to event
    * @param {function} callback - function to call, when all event handlers that return Promise finished processing
    * @returns {boolean} true if any one responded to event
    **/
    this.dispatchAllSettled = function(event, params, callback) {
        return this.dispatch(event, params, callback);
    };

    /**
    * Dispatch specific event on api side
    * 
    * @param {string} event - event to dispatch
    * @param {object} params - object with parameters to pass to event
    * @returns {Promise} which resolves to array of objects returned by events if any or error
    */
    this.dispatchAsPromise = function(event, params) {
        return new Promise((res, rej) => {
            this.dispatch(event, params, (err, results) => {
                if (err) {
                    rej(err);
                }
                else {
                    res(results || []);
                }
            });
        });
    };

    /**
    * Load plugins frontend app.js and expose static paths for plugins
    * @param {object} app - express app
    * @param {object} countlyDb - connection to countly database
    * @param {object} express - reference to express js
    **/
    this.loadAppStatic = function(app, countlyDb, express) {
        for (let i = 0, l = plugins.length; i < l; i++) {
            try {
                var plugin = require("./" + plugins[i] + "/frontend/app");
                plugs.push({'name': plugins[i], "plugin": plugin});
                app.use(countlyConfig.path + '/' + plugins[i], express.static(__dirname + '/' + plugins[i] + "/frontend/public", { maxAge: 31557600000 }));
                if (plugin.staticPaths) {
                    plugin.staticPaths(app, countlyDb, express);
                }
            }
            catch (ex) {
                console.error(ex.stack);
            }
        }
    };

    /**
    * Call init method of plugin's frontend app.js  modules
    * @param {object} app - express app
    * @param {object} countlyDb - connection to countly database
    * @param {object} express - reference to express js
    **/
    this.loadAppPlugins = function(app, countlyDb, express) {
        for (let i = 0; i < plugs.length; i++) {
            try {
                //plugs[i].init(app, countlyDb, express);
                plugs[i].plugin.init({
                    name: plugs[i].name,
                    get: function(pathTo, callback) {
                        var pluginName = this.name;
                        if (!callback) {
                            app.get(pathTo);
                        }
                        else {
                            app.get(pathTo, function(req, res, next) {
                                if (pluginConfig[pluginName]) {
                                    callback(req, res, next);
                                }
                                else {
                                    next();
                                }
                            });
                        }
                    },
                    post: function(pathTo, callback) {
                        var pluginName = this.name;
                        app.post(pathTo, function(req, res, next) {
                            if (pluginConfig[pluginName] && callback && typeof callback === 'function') {
                                callback(req, res, next);
                            }
                            else {
                                next();
                            }
                        });
                    },
                    use: function(pathTo, callback) {
                        if (!callback) {
                            callback = pathTo;
                            pathTo = '/';//fallback to default
                        }

                        var pluginName = this.name;
                        app.use(pathTo, function(req, res, next) {
                            if (pluginConfig[pluginName] && callback && typeof callback === 'function') {
                                callback(req, res, next);
                            }
                            else {
                                next();
                            }
                        });
                    },
                    all: function(pathTo, callback) {
                        if (!callback) {
                            callback = pathTo;
                            pathTo = '/';//fallback to default
                        }

                        var pluginName = this.name;
                        app.all(pathTo, function(req, res, next) {
                            if (pluginConfig[pluginName] && callback && typeof callback === 'function') {
                                callback(req, res, next);
                            }
                            else {
                                next();
                            }
                        });
                    }
                }, countlyDb, express);
            }
            catch (ex) {
                console.error(ex.stack);
            }
        }
    };

    /**
    * Call specific predefined methods of plugin's frontend app.js  modules
    * @param {string} method - method name
    * @param {object} params - object with arguments
    * @returns {boolean} if any of plugins had that method
    **/
    this.callMethod = function(method, params) {
        var res = false;
        if (methodCache[method]) {
            if (methodCache[method].length > 0) {
                for (let i = 0; i < methodCache[method].length; i++) {
                    try {
                        if (methodCache[method][i][method](params)) {
                            res = true;
                        }
                    }
                    catch (ex) {
                        console.error(ex.stack);
                    }
                }
            }
        }
        else {
            methodCache[method] = [];
            for (let i = 0; i < plugs.length; i++) {
                try {
                    if (plugs[i].plugin && plugs[i].plugin[method]) {
                        methodCache[method].push(plugs[i].plugin);
                        if (plugs[i].plugin[method](params)) {
                            res = true;
                        }
                    }
                }
                catch (ex) {
                    console.error(ex.stack);
                }
            }
        }
        return res;
    };


    /**
    * Call specific predefined methods of plugin's frontend app.js modules which are expected to return a promise which resolves to an object
    * All results will then be merged into one object, ensure objects returned by promises have unique keys
    * 
    * @param {string} method - method name
    * @param {object} params - object with arguments
    * @returns {boolean} if any of plugins had that method
    **/
    this.callPromisedAppMethod = async function(method, params) {
        var promises = [];
        if (methodPromiseCache[method]) {
            if (methodPromiseCache[method].length > 0) {
                for (let i = 0; i < methodPromiseCache[method].length; i++) {
                    try {
                        let ret = methodPromiseCache[method][i][method](params);
                        if (ret) {
                            promises.push(ret);
                        }
                    }
                    catch (ex) {
                        console.error(ex.stack);
                    }
                }
            }
        }
        else {
            methodPromiseCache[method] = [];
            for (let i = 0; i < plugs.length; i++) {
                try {
                    if (plugs[i].plugin && plugs[i].plugin[method]) {
                        methodPromiseCache[method].push(plugs[i].plugin);
                        let ret = plugs[i].plugin[method](params);
                        if (ret) {
                            promises.push(ret);
                        }
                    }
                }
                catch (ex) {
                    console.error(ex.stack);
                }
            }
        }
        let results = await Promise.all(promises);
        return results.reduce((acc, v) => {
            if (v) {
                for (let k in v) {
                    acc[k] = acc[k] || v[k];
                }
            }
            return acc;
        }, {});
    };

    /**
    * Get array of enabled plugin names
	* @param {boolean} returnOnlyEnabled  - if true will return only enabled plugins
    * @returns {array} with plugin names
    **/
    this.getPlugins = function(returnOnlyEnabled) {
        //fix it to return only enabled based on db settings
        var list = [];
        if (!returnOnlyEnabled) {

            return JSON.parse(JSON.stringify(plugins));
        }
        else {
            for (var key in pluginConfig) {
                if (pluginConfig[key] && plugins.indexOf(key) > -1) {
                    list.push(key);
                }
            }
            return list;
        }
    };

    /**
    * Get array with references to plugin's api modules
    * @returns {array} with references to plugin's api modules
    **/
    this.getPluginsApis = function() {
        return pluginsApis;
    };

    /**
    * Sets/changes method of specific plugin's api module
    * @param {string} plugin - plugin name
    * @param {string} name - method name
    * @param {function} func - function to set as method
    * @returns {void} void
    **/
    this.setPluginApi = function(plugin, name, func) {
        return pluginsApis[plugin][name] = func;
    };

    /**
    * Try to reload cached plugins json file
    **/
    this.reloadPlugins = function() {
        delete require.cache[require.resolve('./plugins.json', 'dont-enclose')];
        plugins = pluginDependencies.getFixedPluginList(require('./plugins.json', 'dont-enclose'), {
            "discoveryStrategy": "disableChildren",
            "overwrite": path.resolve(__dirname, './plugins.json')
        });
    };

    /**
    * Check if plugin by provided name is enabled
    * @param {string} plugin - plugin name
    * @returns {boolean} if plugin is enabled
    **/
    this.isPluginEnabled = function(plugin) {
        if (plugins.indexOf(plugin) === -1) {
            return false;
        }
        return true;
    };

    /**
    * When syncing plugins between servers, here we check plugins on master process of each server
    **/
    this.checkPluginsMaster = function() {
        var self = this;
        if (finishedSyncing) {
            finishedSyncing = false;
            self.dbConnection().then((db) => {
                db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
                    if (!err) {
                        configs = res;
                        self.checkPlugins(db, function() {
                            db.close();
                            finishedSyncing = true;
                        });
                    }
                });
            });
        }
    };

    /**
    * Mark that we started syncing plugin states
    **/
    this.startSyncing = function() {
        finishedSyncing = false;
    };

    /**
    * Mark that we finished syncing plugin states
    **/
    this.stopSyncing = function() {
        finishedSyncing = true;
    };

    /**
    * We check plugins and sync between processes/servers
    * @param {object} db - connection to countly database
    * @param {function} callback - when finished checking and syncing
    **/
    this.checkPlugins = function(db, callback) {
        var plugConf;
        if (cluster.isMaster) {
            plugConf = this.getConfig("plugins");
            if (Object.keys(plugConf).length === 0) {
                //no plugins inserted yet, upgrading by inserting current plugins
                var list = this.getPlugins();
                for (let i = 0; i < list.length; i++) {
                    plugConf[list[i]] = true;
                }
                this.updateConfigs(db, "plugins", plugConf, callback);
            }
            else {
                this.syncPlugins(plugConf, callback);
            }
        }
        else {
            //check if we need to sync plugins
            var pluginList = this.getPlugins();
            plugConf = this.getConfig("plugins") || {};
            //let master know we need to include initial plugins
            if (Object.keys(plugConf).length === 0) {
                process.send({ cmd: "checkPlugins" });
            }
            else {
                //check if we need to sync plugins
                var changes = 0;
                for (let plugin in plugConf) {
                    var state = plugConf[plugin],
                        index = pluginList.indexOf(plugin);
                    if (index !== -1 && !state) {
                        changes++;
                        plugins.splice(plugins.indexOf(plugin), 1);
                    }
                    else if (index === -1 && state) {
                        changes++;
                        plugins.push(plugin);
                    }
                }
                if (changes > 0) {
                    //let master process know we need to sync plugins
                    process.send({ cmd: "checkPlugins" });
                }
            }
        }
    };

    /**
    * Sync plugin states between server
    * @param {object} pluginState - object with plugin names as keys and true/false values to indicate if plugin is enabled or disabled
    * @param {function} callback - when finished checking and syncing
    * @param {object} db - connection to countly database
    **/
    this.syncPlugins = function(pluginState, callback, db) {
        var self = this;
        var dir = path.resolve(__dirname, './plugins.json');
        var pluginList = this.getPlugins().slice(), newPluginsList = pluginList.slice();
        var changes = 0;
        async.each(Object.keys(pluginState), function(plugin, done) {
            var state = pluginState[plugin],
                index = pluginList.indexOf(plugin);
            if (index !== -1 && !state) {
                self.uninstallPlugin(plugin, function(err) {
                    if (!err) {
                        changes++;
                        newPluginsList.splice(newPluginsList.indexOf(plugin), 1);
                        plugins.splice(plugins.indexOf(plugin), 1);
                    }
                    done();
                });
            }
            else if (index === -1 && state) {
                self.installPlugin(plugin, function(err) {
                    if (!err) {
                        changes++;
                        plugins.push(plugin);
                        newPluginsList.push(plugin);
                    }
                    done();
                });
            }
            else {
                done();
            }
        }, function(error) {
            if (error) {
                if (callback) {
                    callback(true);
                }
            }
            else {
                if (changes > 0) {
                    if (db && self.getConfig("api").sync_plugins) {
                        self.updateConfigs(db, "plugins", pluginState);
                    }
                    async.series([fs.writeFile.bind(fs, dir, JSON.stringify(newPluginsList), 'utf8'), self.prepareProduction.bind(self)], function(err) {
                        if (callback) {
                            callback(err ? true : false);
                        }
                        setTimeout(self.restartCountly.bind(self), 500);
                    });
                }
                else if (callback) {
                    callback(false);
                }
            }
        });
    };

    this.processPluginInstall = function(db, name, callback) {
        var self = this;
        var should_enable = true;
        if (typeof name !== "string" && name.name) {
            if (name.enable === false || name.enable === true) {
                should_enable = name.enable;
            }
            name = name.name;
        }
        db.collection("plugins").remove({'_id': 'install_' + name, 'time': {'$lt': Date.now() - 60 * 1000 * 60}}, function(err) {
            if (err) {
                console.log(err);
                callback();
            }
            else {
                db.collection("plugins").insert({'_id': 'install_' + name, 'time': Date.now()}, {ignore_errors: [11000]}, function(err2) {
                    if (err2) {
                        if (err2.code && err2.code !== 11000) {
                            console.log(err2);
                        }
                        callback();
                    }
                    else {
                        self.installPlugin(name, function(errors) {
                            if (!errors) {
                                console.log("Install is finished fine. Updating state in database");
                                var query = {_id: "plugins"};
                                query["plugins." + name] = {"$ne": !should_enable};
                                var update = {};
                                update["plugins." + name] = should_enable;
                                db.collection("plugins").update(query, {"$set": update}, {upsert: true}, function(err3, res) {
                                    console.log('plugins document updated');
                                    if (err3) {
                                        console.log(err3);
                                    }
                                    console.log(JSON.stringify(res));
                                    if (callback) {
                                        callback();
                                    }
                                    db.collection("plugins").remove({'_id': 'install_' + name}, function(err5) {
                                        if (err5) {
                                            console.log(err5);
                                        }
                                    });
                                });
                            }
                            else {
                                console.log("Install is finished with errors");
                                console.log(JSON.stringify(errors));
                                callback();
                            }
                        });
                    }
                });
            }
        });
    };
    /**
    * Procedure to install plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished installing plugin
    * @returns {void} void
    **/
    this.installPlugin = function(plugin, callback) {
        var self = this;
        console.log('Installing plugin %j...', plugin);
        callback = callback || function() {};
        var errors = false;

        new Promise(function(resolve) {
            var eplugin = global.enclose ? global.enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return resolve(errors);
            }
            var cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            //if we are on docker skip npm install. 
            if (process && process.env && process.env.COUNTLY_CONTAINER && !process.env.FORCE_NPM_INSTALL) {
                console.log('Skipping on docker');
                resolve(errors);
            }
            else if (!self.getConfig("api").offline_mode) {
                const cmd = spawn('npm', ["install"], {cwd: cwd});
                var error2 = "";

                cmd.stdout.on('data', (data) => {
                    console.log(`${data}`);
                });

                cmd.stderr.on('data', (data) => {
                    error2 += data;
                });

                cmd.on('error', function(error) {
                    console.log(error);
                    errors = true;
                });

                cmd.on('close', () => {
                    if (error2) {
                        console.log('error: %j', error2);
                    }
                    console.log('Done running npm install %j', plugin);
                    resolve(errors);
                });
            }
            else {
                resolve(errors);
                console.log('Server is in offline mode, this command cannot be run. %j');
            }
        }).then(function(result) {
            var scriptPath = path.join(__dirname, plugin, 'install.js');
            var m = cp.spawn("nodejs", [scriptPath]);

            m.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            m.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            m.on('close', (code) => {
                console.log('Done installing plugin %j', code);
                if (parseInt(code, 10) !== 0) {
                    errors = true;
                }
                callback(errors || result);
            });
        });
    };

    /**
    * Procedure to upgrade plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished upgrading plugin
    * @returns {void} void
    **/
    this.upgradePlugin = function(plugin, callback) {
        var self = this;
        console.log('Upgrading plugin %j...', plugin);
        callback = callback || function() {};
        var errors = false;

        new Promise(function(resolve) {
            var eplugin = global.enclose ? global.enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return resolve(errors);
            }
            var cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            if (!self.getConfig("api").offline_mode) {

                const cmd = spawn('sudo', ["npm", "install", "--unsafe-perm"], {cwd: cwd});
                var error2 = "";

                cmd.stdout.on('data', (data) => {
                    console.log(`${data}`);
                });

                cmd.stderr.on('data', (data) => {
                    error2 += data;
                });

                cmd.on('error', function() {
                    errors = true;
                });

                cmd.on('close', () => {
                    if (error2) {
                        console.log('error: %j', error2);
                    }
                    console.log('Done running npm update with %j', plugin);
                    resolve(errors);
                });
            }
            else {
                resolve(errors);
                console.log('Server is in offline mode, this command cannot be run. %j');
            }
        }).then(function(result) {
            var scriptPath = path.join(__dirname, plugin, 'install.js');
            var m = cp.spawn("nodejs", [scriptPath]);

            m.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            m.stderr.on('data', (data) => {
                console.log(data.toString());
            });

            m.on('close', (code) => {
                console.log('Done upgrading plugin %j', code);
                if (parseInt(code, 10) !== 0) {
                    errors = true;
                }
                callback(errors || result);
            });
        });
    };

    /**
    * Procedure to uninstall plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished uninstalling plugin
    * @returns {void} void
    **/
    this.uninstallPlugin = function(plugin, callback) {
        console.log('Uninstalling plugin %j...', plugin);
        callback = callback || function() {};
        var scriptPath = path.join(__dirname, plugin, 'uninstall.js');
        var errors = false;
        var m = cp.spawn("nodejs", [scriptPath]);

        m.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        m.stderr.on('data', (data) => {
            console.log(data.toString());
        });

        m.on('close', (code) => {
            console.log('Done running uninstall.js with %j', code);
            if (parseInt(code, 10) !== 0) {
                errors = true;
            }
            callback(errors);
        });
    };

    /**
    * Procedure to prepare production file
    * @param {function} callback - when finished uninstalling plugin
    **/
    this.prepareProduction = function(callback) {
        console.log('Preparing production files');
        exec('countly task dist-all', {cwd: path.dirname(process.argv[1])}, function(error, stdout) {
            console.log('Done preparing production files with %j / %j', error, stdout);
            var errors;
            if (error && error !== 'Error: Command failed: ') {
                errors = true;
                console.log('error: %j', error);
            }
            if (callback) {
                callback(errors);
            }
        });
    };

    /**
    * Procedure to restart countly process
    **/
    this.restartCountly = function() {
        console.log('Restarting Countly ...');
        exec("sudo countly restart", function(error, stdout, stderr) {
            console.log('Done restarting countly with %j / %j / %j', error, stderr, stdout);
            if (error) {
                console.log('error: %j', error);
            }
            if (stderr) {
                console.log('stderr: %j', stderr);
            }
        });
    };

    /**
    * Get single pool connection for database
    * @returns {object} db connection
    **/
    this.singleDefaultConnection = function() {
        if (typeof countlyConfig.mongodb === "string") {
            var query = {};
            var conUrl = countlyConfig.mongodb;
            if (countlyConfig.mongodb.indexOf("?") !== -1) {
                var parts = countlyConfig.mongodb.split("?");
                query = querystring.parse(parts.pop());
                conUrl = parts[0];
            }
            query.maxPoolSize = 3;
            conUrl += "?" + querystring.stringify(query);
            return this.dbConnection({mongodb: conUrl});
        }
        else {
            var conf = Object.assign({}, countlyConfig.mongodb);
            for (let k in conf) {
                if (typeof k === 'object') {
                    conf[k] = Object.assign({}, conf[k]);
                }
            }
            conf.max_pool_size = 3;
            return this.dbConnection({mongodb: conf});
        }
    };

    /**
    * Get database connection parameters for command line
    * @param {object} config - connection configs
    * @returns {object} db connection params
    **/
    this.getDbConnectionParams = function(config) {
        var ob = {};
        var db;
        if (typeof config === "string") {
            db = config;
            if (this.dbConfigFiles[config]) {
                var confDb = config;
                try {
                    //try loading custom config file
                    var conf = require(this.dbConfigFiles[config]);
                    config = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    //user default config
                    config = JSON.parse(JSON.stringify(countlyConfig));
                }
                if (this.dbConfigEnvs[confDb]) {
                    config = configextender(this.dbConfigEnvs[confDb], config, process.env);
                }
            }
            else {
                //user default config
                config = JSON.parse(JSON.stringify(countlyConfig));
            }
        }
        else {
            config = config || JSON.parse(JSON.stringify(countlyConfig));
        }

        if (typeof config.mongodb === 'string') {
            var dbName = this.replaceDatabaseString(config.mongodb, db);
            //remove protocol
            dbName = dbName.split("://").pop();
            if (dbName.indexOf("@") !== -1) {
                var auth = dbName.split("@").shift();
                dbName = dbName.replace(auth + "@", "");
                var authParts = auth.split(":");
                ob.username = authParts[0];
                ob.password = authParts[1];
            }
            var dbParts = dbName.split("/");
            ob.host = dbParts[0];
            ob.db = dbParts[1] || "countly";
            if (ob.db.indexOf("?") !== -1) {
                var parts = ob.db.split("?");
                ob.db = parts[0];
                var qstring = parts[1];
                if (qstring && qstring.length) {
                    qstring = querystring.parse(qstring);
                    if (qstring.ssl && (qstring.ssl === true || qstring.ssl === "true")) {
                        ob.ssl = "";
                        ob.sslAllowInvalidCertificates = "";
                        ob.sslAllowInvalidHostnames = "";
                    }
                    if (qstring.tls && (qstring.tls === true || qstring.tls === "true")) {
                        ob.tls = "";
                        ob.tlsAllowInvalidCertificates = "";
                        ob.tlsAllowInvalidHostnames = "";
                        ob.tlsInsecure = "";
                    }
                    if (qstring.replicaSet) {
                        ob.host = qstring.replicaSet + "/" + ob.host;
                    }
                    if (qstring.authSource) {
                        ob.authenticationDatabase = qstring.authSource;
                    }
                }
            }

        }
        else {
            ob.db = db || config.mongodb.db || 'countly';
            if (typeof config.mongodb.replSetServers === 'object') {
                ob.host = "";
                if (config.mongodb.replicaName) {
                    ob.host = config.mongodb.replicaName + "/";
                }
                ob.host += config.mongodb.replSetServers.join(',');
            }
            else {
                ob.host = (config.mongodb.host + ':' + config.mongodb.port);
            }
            if (config.mongodb.serverOptions && config.mongodb.serverOptions.ssl && (config.mongodb.serverOptions.ssl === true || config.mongodb.serverOptions.ssl === "true")) {
                ob.ssl = "";
                ob.sslAllowInvalidCertificates = "";
                ob.sslAllowInvalidHostnames = "";
            }
            if (config.mongodb.serverOptions && config.mongodb.serverOptions.tls && (config.mongodb.serverOptions.tls === true || config.mongodb.serverOptions.tls === "true")) {
                ob.tls = "";
                ob.tlsAllowInvalidCertificates = "";
                ob.tlsAllowInvalidHostnames = "";
                ob.tlsInsecure = "";
            }
            if (config.mongodb.username && config.mongodb.password) {
                ob.username = config.mongodb.username;
                ob.password = utils.decrypt(config.mongodb.password);
                if (config.mongodb.dbOptions && config.mongodb.dbOptions.authSource) {
                    ob.authenticationDatabase = config.mongodb.dbOptions.authSource;
                }
                else if (config.mongodb.serverOptions && config.mongodb.serverOptions.authSource) {
                    ob.authenticationDatabase = config.mongodb.serverOptions.authSource;
                }
            }
        }

        return ob;
    };

    /**
    * This method accepts MongoDB connection string and new database name and replaces the name in string with provided one
    * @param {string} str - MongoDB connection string
    * @param {string} db - database name
    * @returns {string} modified connection string
    **/
    this.replaceDatabaseString = function(str, db) {
        var i = str.lastIndexOf('/countly');
        var k = str.lastIndexOf('/' + db);
        if (i !== k && i !== -1 && db) {
            return str.substr(0, i) + "/" + db + str.substr(i + ('/countly').length);
        }
        return str;
    };

    this.connectToAllDatabases = async() => {
        let dbs = ['countly', 'countly_out', 'countly_fs'];
        if (this.isPluginEnabled('drill')) {
            dbs.push('countly_drill');
        }

        const databases = await Promise.all(dbs.map(this.dbConnection.bind(this)));
        const [dbCountly, dbOut, dbFs, dbDrill] = databases;

        let common = require('../api/utils/common');
        common.db = dbCountly;
        common.outDb = dbOut;
        require('../api/utils/countlyFs').setHandler(dbFs);
        common.drillDb = dbDrill;
        var self = this;
        await new Promise(function(resolve) {
            self.loadConfigs(common.db, function() {
                resolve();
            });
        });
        return databases;
    };

    /**
    * Get database connection with configured pool size
    * @param {object} config - connection configs
    * @returns {object} db connection params
    **/
    this.dbConnection = async function(config) {
        var db, maxPoolSize = 10;
        var mngr = this;

        if (!cluster.isMaster) {
            //we are in worker
            maxPoolSize = 100;
        }
        if (process.argv[1] && process.argv[1].endsWith('executor.js')) {
            maxPoolSize = 3;
        }
        var useConfig = JSON.parse(JSON.stringify(countlyConfig));
        if (process.argv[1] && process.argv[1].endsWith('api/api.js') && !cluster.isMaster) {
            useConfig = JSON.parse(JSON.stringify(apiCountlyConfig));
        }
        if (typeof config === "string") {
            db = config;
            if (this.dbConfigFiles[config]) {
                var confDb = config;
                try {
                    //try loading custom config file
                    var conf = require(this.dbConfigFiles[config]);
                    config = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    //user default config
                    config = useConfig;
                }
                if (this.dbConfigEnvs[confDb]) {
                    config = configextender(this.dbConfigEnvs[confDb], config, process.env);
                }
            }
            else {
                //user default config
                config = useConfig;
            }
        }
        else {
            config = config || useConfig;
        }

        if (config && typeof config.mongodb === "string") {
            var urlParts = url.parse(config.mongodb, true);
            if (urlParts && urlParts.query && urlParts.query.maxPoolSize) {
                maxPoolSize = urlParts.query.maxPoolSize;
            }
        }
        else {
            maxPoolSize = config.mongodb.max_pool_size || maxPoolSize;
        }

        var dbName;
        var dbOptions = {
            maxPoolSize: maxPoolSize,
            noDelay: true,
            keepAlive: true,
            keepAliveInitialDelay: 30000,
            connectTimeoutMS: 999999999,
            socketTimeoutMS: 999999999,
            serverSelectionTimeoutMS: 999999999,
            maxIdleTimeMS: 0,
            waitQueueTimeoutMS: 0,
            useNewUrlParser: true,
            useUnifiedTopology: true
        };
        if (typeof config.mongodb === 'string') {
            dbName = this.replaceDatabaseString(config.mongodb, db);
        }
        else {
            config.mongodb.db = db || config.mongodb.db || 'countly';
            if (typeof config.mongodb.replSetServers === 'object') {
                //mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
                dbName = config.mongodb.replSetServers.join(',') + '/' + config.mongodb.db;
                if (config.mongodb.replicaName) {
                    dbOptions.replicaSet = config.mongodb.replicaName;
                }
            }
            else {
                dbName = (config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.db);
            }
        }

        if (config.mongodb.dbOptions) {
            //delete old config option
            delete config.mongodb.dbOptions.native_parser;
            _.extend(dbOptions, config.mongodb.dbOptions);
        }

        if (config.mongodb.serverOptions) {
            _.extend(dbOptions, config.mongodb.serverOptions);
        }

        if (config.mongodb.username && config.mongodb.password) {
            dbName = encodeURIComponent(config.mongodb.username) + ":" + encodeURIComponent(utils.decrypt(config.mongodb.password)) + "@" + dbName;
        }

        if (dbName.indexOf('mongodb://') !== 0 && dbName.indexOf('mongodb+srv://') !== 0) {
            dbName = 'mongodb://' + dbName;
        }
        if (dbName.indexOf('retryWrites') === -1) {
            if (dbName.indexOf('?') === -1) {
                dbName = dbName + "?retryWrites=false";
            }
            else {
                dbName = dbName + "&retryWrites=false";
            }
        }

        var db_name = "countly";
        try {
            db_name = dbName.split("/").pop().split("?")[0];
        }
        catch (ex) {
            db_name = "countly";
        }

        try {
            dbOptions.appname = process.title + ": " + db_name + "(" + maxPoolSize + ") " + process.pid;
        }
        catch (ex) {
            //silent
        }

        mngr.dispatch("/db/pre_connect", {
            db: db_name,
            connection: dbName,
            options: dbOptions
        });
        const client = new mongodb.MongoClient(dbName, dbOptions);
        try {
            await client.connect();
        }
        catch (ex) {
            logDbRead.e("Error connecting to database", ex);
            logDbRead.e("With params %j", {
                db: db_name,
                connection: dbName,
                options: dbOptions
            });
            //exit to retry to reconnect on restart
            process.exit(1);
            return;
        }

        /**
         * Log driver debug logs
         * @param {String} eventName - name of the event to log
         * @param {Object} logObject - log object where to write event
         * @param {String} logLevel - log level
         */
        function logDriver(eventName, logObject, logLevel) {
            logLevel = logLevel || "d";
            client.on(eventName, (event) => logObject[logLevel](eventName + " %j", event));
        }

        //connection pool
        logDriver("connectionPoolCreated", logDriverDb);
        logDriver("connectionPoolReady", logDriverDb);
        logDriver("connectionPoolClosed", logDriverDb);
        logDriver("connectionCreated", logDriverDb);
        logDriver("connectionReady", logDriverDb);
        logDriver("connectionClosed", logDriverDb);
        logDriver("connectionCheckOutStarted", logDriverDb);
        logDriver("connectionCheckOutFailed", logDriverDb);
        logDriver("connectionCheckedOut", logDriverDb);
        logDriver("connectionCheckedIn", logDriverDb);
        logDriver("connectionPoolCleared", logDriverDb);

        //SDAM
        logDriver("serverOpening", logDriverDb);
        logDriver("serverClosed", logDriverDb);
        logDriver("serverDescriptionChanged", logDriverDb);
        logDriver("topologyOpening", logDriverDb);
        logDriver("topologyClosed", logDriverDb);
        logDriver("topologyDescriptionChanged", logDriverDb);
        logDriver("serverHeartbeatStarted", logDriverDb);
        logDriver("serverHeartbeatSucceeded", logDriverDb);
        logDriver("serverHeartbeatFailed", logDriverDb, "e");

        //commands
        logDriver("commandStarted", logDriverDb);
        logDriver("commandSucceeded", logDriverDb);
        logDriver("commandFailed", logDriverDb, "e");


        client._db = client.db;

        client.db = function(database, options) {
            return mngr.wrapDatabase(client._db(database, options), client, db_name, dbName, dbOptions);
        };

        if (db_name === "countly") {
            var wrapped = client.db(db_name);
            //await this.fetchMaskingConf({db: wrapped});
            return wrapped;
        }
        else {
            return client.db(db_name);
        }
    };

    this.fetchMaskingConf = async function(options) {
        var apps = await options.db.collection("apps").find({}, {"masking": true}).toArray();

        var appObj = {};

        for (let z = 0; z < apps.length; z++) {
            appObj[apps[z]._id] = apps[z].masking;
        }

        masking.apps = appObj;
        var hashMap = {};
        var eventsDb = await options.db.collection("events").find({}, {"list": true}).toArray();
        for (let z = 0; z < eventsDb.length; z++) {
            eventsDb[z]._id = eventsDb[z]._id + "";
            for (let i = 0; i < eventsDb[z].list.length; i++) {
                hashMap[crypto.createHash('sha1').update(eventsDb[z].list[i] + eventsDb[z]._id + "").digest('hex')] = {"a": eventsDb[z]._id, "e": eventsDb[z].list[i]};
            }

            var internalDrillEvents = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_push_sent", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device", "[CLY]_consent"];
            var internalEvents = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_push_sent", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device", "[CLY]_consent"];

            if (internalDrillEvents) {
                for (let i = 0; i < internalDrillEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalDrillEvents[i] + eventsDb[z]._id + "").digest('hex')] = {"a": eventsDb[z]._id, "e": internalDrillEvents[i]};
                }
            }

            if (internalEvents) {
                for (let i = 0; i < internalEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalEvents[i] + eventsDb[z]._id + "").digest('hex')] = {"a": eventsDb[z]._id, "e": internalEvents[i]};
                }
            }
        }
        masking.hashMap = hashMap;
        masking.isLoaded = Date.now().valueOf();
        return;

    };

    /**
    * Checks if any item in object tree and subrtree is true. Recursive.
    * @param {object} myOb - object
    * @returns {boolean} true or false
    **/
    function hasAnyValueTrue(myOb) {
        if (typeof myOb === 'object' && Object.keys(myOb) && Object.keys(myOb).length > 0) {
            var value = false;
            for (var key in myOb) {
                value = value || hasAnyValueTrue(myOb[key]);
            }
            return value;
        }
        else {
            return !!myOb;
        }
    }
    this.isAnyMasked = function() {
        if (masking && masking.apps) {
            for (var app in masking.apps) {
                if (masking.apps[app] && masking.apps[app].masking) {
                    return hasAnyValueTrue(masking.apps[app].masking);
                }
            }
            return false;
        }
        else {
            return false;
        }
    };

    this.getMaskingSettings = function(appID) {
        if (appID === 'all') {
            if (masking && masking.apps) {
                return JSON.parse(JSON.stringify(masking.apps));
            }
            else {
                return {};
            }
        }
        else if (masking && masking.apps && masking.apps[appID]) {
            return JSON.parse(JSON.stringify(masking.apps[appID]));
        }
        else {
            return {};
        }
    };
    this.getAppEventFromHash = function(hashValue) {
        if (masking && masking.hashMap && masking.hashMap[hashValue]) {
            var record = JSON.parse(JSON.stringify(masking.hashMap[hashValue]));
            record.hash = hashValue;
            return record;
        }
        else {
            return {};
        }
    };

    this.getEHashes = function(appID) {
        var map = {};
        if (masking && masking.hashMap) {
            if (appID === 'all') {
                for (var hash0 in masking.hashMap) {
                    map[masking.hashMap[hash0].e] = hash0;
                }
            }
            else {
                for (var hash in masking.hashMap) {
                    if (masking.hashMap[hash].a === appID) {
                        map[masking.hashMap[hash].e] = hash;
                    }
                }
            }
        }
        return map;
    };

    /**
     *  Wrap db object with our compatability layer
     *  @param {Db} countlyDb - database connection
     *  @param {MongoClient} client - database client connection
     *  @param {string} dbName - database name
     *  @param {string} dbConnectionString - database connection string
     *  @param {Object} dbOptions - database connection options
     *  @returns {Db} wrapped database connection
     */
    this.wrapDatabase = function(countlyDb, client, dbName, dbConnectionString, dbOptions) {
        if (countlyDb._wrapped) {
            return countlyDb;
        }

        countlyDb._wrapped = true;
        var mngr = this;
        countlyDb._cly_debug = {
            db: dbName,
            connection: dbConnectionString,
            options: dbOptions
        };

        logDbRead.d("New connection %j", countlyDb._cly_debug);
        if (!countlyDb.ObjectID) {
            countlyDb.ObjectID = function(id) {
                try {
                    return mongodb.ObjectId(id);
                }
                catch (ex) {
                    logDbRead.i("Incorrect Object ID %j", ex);
                    return id;
                }
            };
        }
        countlyDb.encode = function(str) {
            return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
        };

        countlyDb.decode = function(str) {
            return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.');
        };
        countlyDb.onOpened = function(callback) {
            callback();
        };
        countlyDb._native = countlyDb;
        countlyDb.client = client;
        countlyDb.close = client.close.bind(client);
        mngr.dispatch("/db/connected", {
            db: dbName,
            instance: countlyDb,
            connection: dbConnectionString,
            options: dbOptions
        });

        countlyDb.admin().buildInfo({}, (err, result) => {
            if (!err && result) {
                countlyDb.build = result;
            }
        });

        var findOptions = ["limit", "sort", "projection", "skip", "hint", "explain", "snapshot", "timeout", "tailable", "batchSize", "returnKey", "maxScan", "min", "max", "showDiskLoc", "comment", "raw", "promoteLongs", "promoteValues", "promoteBuffers", "readPreference", "partial", "maxTimeMS", "collation", "session", "omitReadPreference"];

        countlyDb._collection_cache = {};
        //overwrite some methods
        countlyDb._collection = countlyDb.collection;
        countlyDb.collection = function(collection, opts, done) {
            if (countlyDb._collection_cache[collection]) {
                return countlyDb._collection_cache[collection];
            }

            /**
            * Copy arguments for logging purposes
            * @param {vary} arg - argument value
            * @param {string} name - argument name
            * @returns {object} data with arguments
            **/
            function copyArguments(arg, name) {
                var data = {};
                data.name = name || arg.callee;
                data.args = [];
                for (let i = 0; i < arg.length; i++) {
                    data.args.push(arg[i]);
                }
                return data;
            }

            /**
             *  Method to log promise errors
             *  @param {Promise} promise - Promise object
             *  @param {Error} e - Error for tracing
             *  @param {Object} data - arguments and calling method
             *  @returns {Promise} Promise to handle
             */
            function handlePromiseErrors(promise, e, data) {
                if (promise && promise.then) {
                    return promise.catch(function(err) {
                        logDbWrite.e("Error in promise from " + collection + " %j %s %j", data, err, err);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        if (e) {
                            logDbWrite.e(e.stack);
                        }
                        throw err;
                    });
                }
                return promise;
            }

            //get original collection object
            var ob = this._collection(collection, opts, done);

            //overwrite with retry policy
            var retryifNeeded = function(callback, retry, e, data) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (res) {
                        if (!res.result) {
                            res.result = {};
                        }
                        if (!res.result.ok) {
                            res.result.ok = !err;
                        }
                        if (!res.result.nModified) {
                            res.result.nModified = res.modifiedCount || 0;
                        }
                    }
                    if (err) {
                        if (retry && err.code === 11000) {
                            if (typeof retry === "function") {
                                logDbWrite.d("Retrying writing " + collection + " %j", data);
                                logDbWrite.d("From connection %j", countlyDb._cly_debug);
                                retry();
                            }
                            else {
                                if (!(data.args && data.args[2] && data.args[2].ignore_errors && data.args[2].ignore_errors.indexOf(err.code) !== -1)) {
                                    logDbWrite.e("Error writing " + collection + " %j %s %j", data, err, err);
                                    logDbWrite.d("From connection %j", countlyDb._cly_debug);
                                    if (e) {
                                        logDbWrite.e(e.stack);
                                    }
                                }
                                if (callback) {
                                    callback(err, res);
                                }
                            }
                        }
                        else {
                            if (!(data.args && data.args[2] && data.args[2].ignore_errors && data.args[2].ignore_errors.indexOf(err.code) !== -1)) {
                                logDbWrite.e("Error writing " + collection + " %j %s %j", data, err, err);
                                logDbWrite.d("From connection %j", countlyDb._cly_debug);
                                if (e) {
                                    logDbWrite.e(e.stack);
                                }
                            }
                            if (callback) {
                                callback(err, res);
                            }
                        }
                    }
                    else if (callback) {
                        callback(err, res);
                    }
                };
            };

            ob._findAndModify = ob.findAndModify;
            ob.findAndModify = function(query, sort, doc, options, callback) {
                if (typeof options === "function") {
                    callback = options;
                    options = {};
                }
                else {
                    options = options || {};
                }

                mngr.dispatch("/db/readAndUpdate", {
                    db: dbName,
                    operation: "findAndModify",
                    collection: collection,
                    query: query,
                    sort: sort,
                    update: doc,
                    options: options
                });
                var e;
                var args = arguments;
                var at = "";
                if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                }

                logDbWrite.d("findAndModify " + collection + " %j %j %j %j" + at, query, sort, doc, options);
                logDbWrite.d("From connection %j", countlyDb._cly_debug);
                if (options.upsert) {
                    var self = this;

                    return handlePromiseErrors(this._findAndModify(query, sort, doc, options, retryifNeeded(callback, function() {
                        logDbWrite.d("retrying findAndModify " + collection + " %j %j %j %j" + at, query, sort, doc, options);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        self._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(args, "findAndModify")));
                    }, e, copyArguments(arguments, "findAndModify"))), e, copyArguments(arguments, "findAndModify"));
                }
                else {
                    return handlePromiseErrors(this._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, "findAndModify"))), e, copyArguments(arguments, "findAndModify"));
                }
            };

            var overwriteRetryWrite = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(selector, doc, options, callback) {
                    if (typeof options === "function") {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    mngr.dispatch("/db/update", {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: selector,
                        update: doc,
                        options: options
                    });
                    var args = arguments;
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }

                    logDbWrite.d(name + " " + collection + " %j %j %j" + at, selector, doc, options);
                    logDbWrite.d("From connection %j", countlyDb._cly_debug);
                    if (options.upsert) {
                        var self = this;

                        return handlePromiseErrors(this["_" + name](selector, doc, options, retryifNeeded(callback, function() {
                            logDbWrite.d("retrying " + name + " " + collection + " %j %j %j" + at, selector, doc, options);
                            logDbWrite.d("From connection %j", countlyDb._cly_debug);
                            self["_" + name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(args, name)));
                        }, e, copyArguments(arguments, name))), e, copyArguments(arguments, name));
                    }
                    else {
                        return handlePromiseErrors(this["_" + name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, name))), e, copyArguments(arguments, name));
                    }
                };
            };

            overwriteRetryWrite(ob, "updateOne");
            overwriteRetryWrite(ob, "updateMany");
            overwriteRetryWrite(ob, "replaceOne");
            overwriteRetryWrite(ob, "findOneAndUpdate");
            overwriteRetryWrite(ob, "findOneAndReplace");

            //overwrite with write logging
            var logForWrites = function(callback, e, data) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (err) {
                        if (!(data.args && data.args[1] && data.args[1].ignore_errors && data.args[1].ignore_errors.indexOf(err.code) !== -1)) {
                            logDbWrite.e("Error writing " + collection + " %j %s %j", data, err, err);
                            logDbWrite.d("From connection %j", countlyDb._cly_debug);
                            if (e) {
                                logDbWrite.e(e.stack);
                            }
                        }
                    }
                    // new returned id format
                    if (res) {
                        if (res.insertedIds) {
                            var arr = [];
                            var ops = [];
                            for (let i in res.insertedIds) {
                                arr.push(res.insertedIds[i]);
                                ops.push({_id: res.insertedIds[i], ...data.args[0][i]});
                            }
                            res.insertedIdsOrig = res.insertedIds;
                            res.insertedIds = arr;
                            res.insertedCount = res.insertedIds.length;
                            res.ops = res.ops || ops;
                        }
                        else if (res.insertedId) {
                            res.insertedIds = [res.insertedId];
                            res.insertedCount = res.insertedIds.length;
                            res.ops = res.ops || [{_id: res.insertedId, ...data.args[0]}];
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                };
            };

            var overwriteDefaultWrite = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(selector, options, callback) {
                    if (typeof options === "function") {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    mngr.dispatch("/db/write", {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: selector,
                        options: options
                    });
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }

                    logDbWrite.d(name + " " + collection + " %j %j" + at, selector, options);
                    logDbWrite.d("From connection %j", countlyDb._cly_debug);
                    return handlePromiseErrors(this["_" + name](selector, options, logForWrites(callback, e, copyArguments(arguments, name))), e, copyArguments(arguments, name));
                };
            };
            overwriteDefaultWrite(ob, "deleteOne");
            overwriteDefaultWrite(ob, "deleteMany");
            overwriteDefaultWrite(ob, "insertOne");
            overwriteDefaultWrite(ob, "insertMany");
            overwriteDefaultWrite(ob, "bulkWrite");
            overwriteDefaultWrite(ob, "save");

            //overwrite with read logging
            var logForReads = function(callback, e, data) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (err) {
                        logDbRead.e("Error reading " + collection + " %j %s %j", data, err, err);
                        logDbRead.d("From connection %j", countlyDb._cly_debug);
                        if (e) {
                            logDbRead.e(e.stack);
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                };
            };

            var overwriteDefaultRead = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(query, options, callback) {
                    if (typeof options === "function") {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    mngr.dispatch("/db/read", {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: query,
                        options: options
                    });
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }

                    if (name === "findOne" && options && !options.projection) {
                        if (options.fields) {
                            options.projection = options.fields;
                            delete options.fields;
                        }
                        else if (findOptions.indexOf(Object.keys(options)[0]) === -1) {

                            options = {projection: options};
                        }
                    }
                    logDbRead.d(name + " " + collection + " %j %j" + at, query, options);
                    logDbRead.d("From connection %j", countlyDb._cly_debug);
                    return handlePromiseErrors(this["_" + name](query, options, logForReads(callback, e, copyArguments(arguments, name))), e, copyArguments(arguments, name));
                };
            };

            overwriteDefaultRead(ob, "findOne");
            overwriteDefaultRead(ob, "findOneAndDelete");

            ob._aggregate = ob.aggregate;
            ob.aggregate = function(query, options, callback) {
                if (typeof options === "function") {
                    callback = options;
                    options = {};
                }
                else {
                    options = options || {};
                }
                var e;
                var args = arguments;
                var at = "";
                mngr.dispatch("/db/read", {
                    db: dbName,
                    operation: "aggregate",
                    collection: collection,
                    query: query,
                    options: options
                });
                if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                }
                logDbRead.d("aggregate " + collection + " %j %j" + at, query, options);
                logDbRead.d("From connection %j", countlyDb._cly_debug);
                var cursor = this._aggregate(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs) {
                    if (!query || (typeof query === "object" && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(cb) {
                    return handlePromiseErrors(cursor._toArray(logForReads(cb, e, copyArguments(args, "aggregate"))), e, copyArguments(arguments, "aggregate"));
                };
                cursor.isClosed = function() {
                    return cursor.closed || cursor.killed;
                };
                if (typeof callback === "function") {
                    return cursor.toArray(callback);
                }
                return cursor;
            };

            ob._find = ob.find;
            ob.find = function(query, options) {
                var e;
                var args = arguments;
                var at = "";
                //new options instead of projection
                if (options && !options.projection) {
                    if (options.fields) {
                        options.projection = options.fields;
                        delete options.fields;
                    }
                    else if (findOptions.indexOf(Object.keys(options)[0]) === -1) {
                        options = {projection: options};
                    }
                }
                else {
                    options = options || {};
                }
                mngr.dispatch("/db/read", {
                    db: dbName,
                    operation: "find",
                    collection: collection,
                    query: query,
                    options: options
                });
                if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                }
                logDbRead.d("find " + collection + " %j %j" + at, query, options);
                logDbRead.d("From connection %j", countlyDb._cly_debug);
                var cursor = this._find(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs) {
                    if (!query || (typeof query === "object" && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };

                cursor._project = cursor.project;
                cursor.project = function(projection) {
                    //Fix projection
                    var newOptions = JSON.parse(JSON.stringify(projection));
                    newOptions.projection = projection;
                    mngr.dispatch("/db/read", {
                        db: dbName,
                        operation: "find",
                        collection: collection,
                        query: query,
                        options: newOptions
                    });
                    return cursor._project(newOptions.projection);
                };
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(callback) {
                    return handlePromiseErrors(cursor._toArray(logForReads(callback, e, copyArguments(args, "find"))), e, copyArguments(arguments, "find"));
                };
                cursor.isClosed = function() {
                    return cursor.closed || cursor.killed;
                };
                return cursor;
            };

            //backwards compatability

            ob._count = ob.count;
            ob.count = function(query, ...countArgs) {
                if (!query || (typeof query === "object" && Object.keys(query).length === 0)) {
                    return ob.estimatedDocumentCount.call(ob, ...countArgs);
                }
                return ob.countDocuments.call(ob, query, ...countArgs);
            };
            ob.ensureIndex = ob.createIndex;

            ob.update = function(selector, document, options, callback) {
                if (options && typeof options === "object" && options.multi) {
                    return ob.updateMany(selector, document, options, callback);
                }
                else {
                    return ob.updateOne(selector, document, options, callback);
                }
            };

            ob.remove = function(selector, options, callback) {
                if (options && typeof options === "object" && options.single) {
                    return ob.deleteOne(selector, options, callback);
                }
                else {
                    return ob.deleteMany(selector, options, callback);
                }
            };

            ob.insert = function(docs, options, callback) {
                if (docs && Array.isArray(docs)) {
                    return ob.insertMany(docs, options, callback);
                }
                else {
                    return ob.insertOne(docs, options, callback);
                }
            };

            ob._findAndModify = function(query, sort, doc, options, callback) {
                if (options && typeof options === "object") {
                    if (options.new) {
                        options.returnDocument = "after";
                    }
                    if (options.remove) {
                        return ob.findOneAndDelete(query, options, callback);
                    }
                    else {
                        return ob.findOneAndUpdate(query, doc, options, callback);
                    }
                }
                return ob.findOneAndUpdate(query, doc, options, callback);
            };

            ob.findAndRemove = function(query, sort, options, callback) {
                return ob.findOneAndDelete(query, options, callback);
            };

            ob._drop = ob.drop;
            ob.drop = function() {
                if (!arguments.length) {
                    return ob._drop().catch(function(ex) {
                        if (ex.code !== 26) {
                            throw ex;
                        }
                    });
                }
                else {
                    return ob._drop.apply(ob, arguments);
                }
            };

            ob._save = ob.save;
            ob.save = function(doc, options, callback) {
                if (doc._id) {
                    var selector = {"_id": doc._id};
                    delete doc._id;
                    options = options || {};
                    if (options && typeof options === "object") {
                        options.upsert = true;
                        return ob.updateOne(selector, {"$set": doc}, options, callback);
                    }
                    else {
                        var myoptions = {"upsert": true};
                        return ob.updateOne(selector, {"$set": doc}, myoptions, options); //we have callback in options param
                    }


                }
                else {
                    return ob.insertOne(doc, options, callback);
                }
            };



            countlyDb._collection_cache[collection] = ob;

            //return original collection object
            return ob;
        };
        return countlyDb;
    };

    var getObjectDiff = function(current, provided) {
        var toReturn = {};

        for (let i in provided) {
            if (typeof current[i] === "undefined") {
                toReturn[i] = provided[i];
            }
            else if ((typeof provided[i]) === 'object' && provided[i] !== null) {
                var diff = getObjectDiff(current[i], provided[i]);
                if (Object.keys(diff).length > 0) {
                    toReturn[i] = diff;
                }
            }
        }
        return toReturn;
    };

    var flattenObject = function(ob, prefix) {
        if (prefix) {
            prefix += ".";
        }
        else {
            prefix = "";
        }
        var toReturn = {};

        for (let i in ob) {
            if (!Object.prototype.hasOwnProperty.call(ob, i)) {
                continue;
            }

            if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                var flatObject = flattenObject(ob[i]);
                for (let x in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                        continue;
                    }

                    toReturn[prefix + i + '.' + x] = flatObject[x];
                }
            }
            else {
                if (!isNaN(ob[i]) && typeof (ob[i]) === "number" && ob[i] > 2147483647) {
                    ob[i] = 2147483647;
                }
                toReturn[prefix + i] = ob[i];
            }
        }
        return toReturn;
    };
};
/* ************************************************************************
SINGLETON CLASS DEFINITION
************************************************************************ */
pluginManager.instance = null;

/**
 * Singleton getInstance definition
 * @returns {object} pluginManager class
 */
pluginManager.getInstance = function() {
    if (this.instance === null) {
        this.instance = new pluginManager();
        this.instance.extendModule("pluginManager", this.instance);
    }
    return this.instance;
};

module.exports = pluginManager.getInstance();