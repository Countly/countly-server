var plugins = require('./plugins.json', 'dont-enclose'),
    pluginsApis = {},
    mongo = require('mongoskin'),
    cluster = require('cluster'),
    countlyConfig = require('../frontend/express/config', 'dont-enclose'),
    utils = require('../api/utils/utils.js'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    querystring = require('querystring'),
    cp = require('child_process'),
    async = require("async"),
    _ = require('underscore'),
    Promise = require("bluebird"),
    log = require('../api/utils/log.js'),
    logDbRead = log('db:read'),
    logDbWrite = log('db:write'),
    exec = cp.exec;

/**
* This module handles communicaton with plugins
* @module "plugins/pluginManager"
*/

/** @lends module:plugins/pluginManager */
var pluginManager = function pluginManager() {
    var events = {};
    var plugs = [];
    var methodCache = {};
    var configs = {};
    var defaultConfigs = {};
    var configsOnchanges = {};
    var excludeFromUI = {plugins: true};
    var finishedSyncing = true;

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
        countly_out: "../api/configs/config.db_out.js"
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

    /**
    * Load configurations from database
    * @param {object} db - database connection for countly db
    * @param {function} callback - function to call when configs loaded
    * @param {boolean} api - was the call made from api process
    **/
    this.loadConfigs = function(db, callback, api) {
        var self = this;
        db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
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
                self.checkConfigs(db, configs, defaultConfigs, callback);
                if (api && self.getConfig("api").sync_plugins) {
                    self.checkPlugins(db);
                }
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
            if (!excludeFromUI[c[i]]) {
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

    /**
    * Register listening to new event on api side
    * @param {string} event - event to listen to
    * @param {function} callback - function to call, when event happens
    **/
    this.register = function(event, callback) {
        if (!events[event]) {
            events[event] = [];
        }
        events[event].push(callback);
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
                    promise = events[event][i].call(null, params);
                    if (promise) {
                        used = true;
                    }
                    promises.push(promise);
                }
            }
            catch (ex) {
                console.error(ex.stack);
            }
            //should we create a promise for this dispatch
            if (params && params.params && params.params.promises) {
                params.params.promises.push(new Promise(function(resolve) {
                    /**
                    * Resolved promise handler
                    * @param {object} err - error if any
                    * @param {object} data - data passed to be resolved
                    **/
                    function resolver(err, data) {
                        resolve();
                        if (callback) {
                            callback(err, data);
                        }
                    }
                    Promise.all(promises).then(resolver.bind(null, null)).catch(function(error) {
                        console.log(error);
                        resolver(error);
                    });
                }));
            }
            else if (callback) {
                Promise.all(promises).then(callback.bind(null, null)).catch(function(error) {
                    console.log(error);
                    callback(error);
                });
            }
        }
        else if (callback) {
            callback();
        }
        return used;
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
                plugs.push(plugin);
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
                plugs[i].init(app, countlyDb, express);
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
                    if (plugs[i][method]) {
                        methodCache[method].push(plugs[i]);
                        if (plugs[i][method](params)) {
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
    * Get array of enabled plugin names
    * @returns {array} with plugin names
    **/
    this.getPlugins = function() {
        return plugins;
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
        plugins = require('./plugins.json', 'dont-enclose');
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
            var db = self.dbConnection();
            db.collection("plugins").findOne({_id: "plugins"}, function(err, res) {
                if (!err) {
                    configs = res;
                    self.checkPlugins(db, function() {
                        db.close();
                        finishedSyncing = true;
                    });
                }
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

    /**
    * Procedure to install plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished installing plugin
    * @returns {void} void
    **/
    this.installPlugin = function(plugin, callback) {
        console.log('Installing plugin %j...', plugin);
        callback = callback || function() {};
        var scriptPath = path.join(__dirname, plugin, 'install.js');
        var errors = false;
        var process = exec("nodejs " + scriptPath, {maxBuffer: 1024 * 20000}, function(error) {
            console.log('Done running install.js with %j', error);
            if (error) {
                errors = true;
                return callback(errors);
            }

            var eplugin = global.enclose ? global.enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return callback(errors);
            }
            var cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            exec('sudo npm install --unsafe-perm', {cwd: cwd}, function(error2) {
                if (error2) {
                    errors = true;
                    console.log('error: %j', error2);
                }
                console.log('Done installing plugin %j', plugin);
                callback(errors);
            });
        });

        process.stdout.on("data", function(data) {
            console.log(data.toString());
        });

        process.stderr.on("data", function(data) {
            console.log(data.toString());
        });
    };

    /**
    * Procedure to upgrade plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished upgrading plugin
    * @returns {void} void
    **/
    this.upgradePlugin = function(plugin, callback) {
        console.log('Upgrading plugin %j...', plugin);
        callback = callback || function() {};
        var scriptPath = path.join(__dirname, plugin, 'install.js');
        var errors = false;
        var process = exec("nodejs " + scriptPath, {maxBuffer: 1024 * 20000}, function(error) {
            console.log('Done running install.js with %j', error);
            if (error) {
                errors = true;
                return callback(errors);
            }

            var eplugin = global.enclose ? global.enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return callback(errors);
            }
            var cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            exec('sudo npm update --unsafe-perm', {cwd: cwd}, function(error2) {
                if (error2) {
                    errors = true;
                    console.log('error: %j', error2);
                }
                console.log('Done upgrading plugin %j', plugin);
                callback(errors);
            });
        });

        process.stdout.on("data", function(data) {
            console.log(data.toString());
        });

        process.stderr.on("data", function(data) {
            console.log(data.toString());
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
        var process = exec("nodejs " + scriptPath, {maxBuffer: 1024 * 20000}, function(error) {
            console.log('Done running uninstall.js with %j', error);
            if (error) {
                errors = true;
            }
            callback(errors);
        });

        process.stdout.on("data", function(data) {
            console.log(data.toString());
        });

        process.stderr.on("data", function(data) {
            console.log(data.toString());
        });
    };

    /**
    * Procedure to prepare production file
    * @param {function} callback - when finished uninstalling plugin
    **/
    this.prepareProduction = function(callback) {
        console.log('Preparing production files');
        exec('grunt plugins locales', {cwd: path.dirname(process.argv[1])}, function(error, stdout) {
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
            query.maxPoolSize = 1;
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
            conf.max_pool_size = 1;
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
                try {
                    //try loading custom config file
                    var conf = require(this.dbConfigFiles[config]);
                    config = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    //user default config
                    config = JSON.parse(JSON.stringify(countlyConfig));
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
                    if (qstring.ssl) {
                        ob.ssl = "";
                        ob.sslAllowInvalidCertificates = "";
                        ob.sslAllowInvalidHostnames = "";
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
            if (config.mongodb.serverOptions && config.mongodb.serverOptions.ssl) {
                ob.ssl = "";
                ob.sslAllowInvalidCertificates = "";
                ob.sslAllowInvalidHostnames = "";
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

    /**
    * Get database connection with configured pool size
    * @param {object} config - connection configs
    * @returns {object} db connection params
    **/
    this.dbConnection = function(config) {
        if (process.argv[1].endsWith('executor.js') && (!config || !config.mongodb || config.mongodb.max_pool_size !== 1)) {
            console.log('************************************ executor.js common.db ***********************************', process.argv);
            return this.singleDefaultConnection();
        }

        var db, maxPoolSize = 10;
        if (!cluster.isMaster) {
            //we are in worker
            maxPoolSize = 100;
        }
        if (typeof config === "string") {
            db = config;
            if (this.dbConfigFiles[config]) {
                try {
                    //try loading custom config file
                    var conf = require(this.dbConfigFiles[config]);
                    config = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    //user default config
                    config = JSON.parse(JSON.stringify(countlyConfig));
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
            poolSize: maxPoolSize,
            reconnectInterval: 1000,
            reconnectTries: 999999999,
            autoReconnect: true,
            noDelay: true,
            keepAlive: true,
            keepAliveInitialDelay: 30000,
            connectTimeoutMS: 999999999,
            socketTimeoutMS: 999999999,
            useNewUrlParser: true
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
            _.extend(dbOptions, config.mongodb.dbOptions);
        }

        if (config.mongodb.serverOptions) {
            _.extend(dbOptions, config.mongodb.serverOptions);
        }

        if (config.mongodb.username && config.mongodb.password) {
            dbName = encodeURIComponent(config.mongodb.username) + ":" + encodeURIComponent(utils.decrypt(config.mongodb.password)) + "@" + dbName;
        }

        if (dbName.indexOf('mongodb://') !== 0) {
            dbName = 'mongodb://' + dbName;
        }

        try {
            dbOptions.appname = process.title + ": " + dbName.split("/").pop().split("?")[0] + "(" + maxPoolSize + ") " + process.pid;
        }
        catch (ex) {
            //silent
        }

        var countlyDb = mongo.db(dbName, dbOptions);
        countlyDb._cly_debug = {
            db: dbName,
            options: dbOptions
        };
        logDbRead.d("New connection %j", countlyDb._cly_debug);
        countlyDb._emitter.setMaxListeners(0);
        if (!countlyDb.ObjectID) {
            countlyDb.ObjectID = function(id) {
                try {
                    return mongo.ObjectID(id);
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
        countlyDb.on('error', console.log);
        countlyDb.onOpened = function(callback) {
            if (countlyDb.isOpen()) {
                callback();
            }
            else {
                countlyDb._emitter.once('open', function() {
                    callback();
                });
            }
        };

        countlyDb.admin().buildInfo({}, (err, result) => {
            if (!err && result) {
                countlyDb.build = result;
            }
        });

        countlyDb.s = {};
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

            //get original collection object
            var ob = this._collection(collection, opts, done);

            //overwrite with retry policy
            var retryifNeeded = function(callback, retry, e, data) {
                return function(err, res) {
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
                                else {
                                    logDbWrite.d("Without Callback");
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
                            else {
                                logDbWrite.d("Without Callback");
                            }
                        }
                    }
                    else if (callback) {
                        callback(err, res);
                    }
                    else {
                        logDbWrite.d("Without Callback");
                    }
                };
            };

            ob._findAndModify = ob.findAndModify;
            ob.findAndModify = function(query, sort, doc, options, callback) {
                var e;
                var args = arguments;
                var at = "";
                if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                }
                if (typeof options === "function") {
                    //options was not passed, we have callback
                    logDbWrite.d("findAndModify " + collection + " %j %j %j" + at, query, sort, doc);
                    logDbWrite.d("From connection %j", countlyDb._cly_debug);
                    return this._findAndModify(query, sort, doc, retryifNeeded(options, null, e, copyArguments(arguments, "findAndModify")));
                }
                else {
                    //we have options
                    logDbWrite.d("findAndModify " + collection + " %j %j %j %j" + at, query, sort, doc, options);
                    logDbWrite.d("From connection %j", countlyDb._cly_debug);
                    if (options.upsert) {
                        var self = this;

                        return this._findAndModify(query, sort, doc, options, retryifNeeded(callback, function() {
                            logDbWrite.d("retrying findAndModify " + collection + " %j %j %j %j" + at, query, sort, doc, options);
                            logDbWrite.d("From connection %j", countlyDb._cly_debug);
                            self._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(args, "findAndModify")));
                        }, e, copyArguments(arguments, "findAndModify")));
                    }
                    else {
                        return this._findAndModify(query, sort, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, "findAndModify")));
                    }
                }
            };

            var overwriteRetryWrite = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(selector, doc, options, callback) {
                    var args = arguments;
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }
                    if (typeof options === "function") {
                        //options was not passed, we have callback
                        logDbWrite.d(name + " " + collection + " %j %j" + at, selector, doc);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        return this["_" + name](selector, doc, retryifNeeded(options, null, e, copyArguments(arguments, name)));
                    }
                    else {
                        options = options || {};
                        //we have options
                        logDbWrite.d(name + " " + collection + " %j %j %j" + at, selector, doc, options);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        if (options.upsert) {
                            var self = this;

                            return this["_" + name](selector, doc, options, retryifNeeded(callback, function() {
                                logDbWrite.d("retrying " + name + " " + collection + " %j %j %j" + at, selector, doc, options);
                                logDbWrite.d("From connection %j", countlyDb._cly_debug);
                                self["_" + name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(args, name)));
                            }, e, copyArguments(arguments, name)));
                        }
                        else {
                            return this["_" + name](selector, doc, options, retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                        }
                    }
                };
            };

            overwriteRetryWrite(ob, "updateOne");
            overwriteRetryWrite(ob, "updateMany");
            overwriteRetryWrite(ob, "replaceOne");

            //overwrite with write logging
            var logForWrites = function(callback, e, data) {
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
                            for (let i in res.insertedIds) {
                                arr.push(res.insertedIds[i]);
                            }
                            res.insertedIdsOrig = res.insertedIds;
                            res.insertedIds = arr;
                        }
                        else if (res.insertedId) {
                            res.insertedIds = [res.insertedId];
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                    else {
                        logDbWrite.d("Without Callback");
                        /*if (e) {
                            logDbWrite.e(e.stack);
                        }*/
                    }
                };
            };

            var overwriteDefaultWrite = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(selector, options, callback) {
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }
                    if (typeof options === "function") {
                        //options was not passed, we have callback
                        logDbWrite.d(name + " " + collection + " %j" + at, selector);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        return this["_" + name](selector, logForWrites(options, e, copyArguments(arguments, name)));
                    }
                    else {
                        //we have options
                        logDbWrite.d(name + " " + collection + " %j %j" + at, selector, options);
                        logDbWrite.d("From connection %j", countlyDb._cly_debug);
                        return this["_" + name](selector, options, logForWrites(callback, e, copyArguments(arguments, name)));
                    }
                };
            };
            overwriteDefaultWrite(ob, "deleteOne");
            overwriteDefaultWrite(ob, "deleteMany");
            overwriteDefaultWrite(ob, "insertOne");
            overwriteDefaultWrite(ob, "insertMany");
            overwriteDefaultWrite(ob, "save");

            //overwrite with read logging
            var logForReads = function(callback, e, data) {
                return function(err, res) {
                    if (err) {
                        logDbRead.e("Error reading " + collection + " %j %s %j", data, err, err);
                        logDbRead.d("From connection %j", countlyDb._cly_debug);
                        if (e) {
                            logDbRead.e(e.stack);
                        }
                    }
                    if (callback) {
                        //aggregation to result conversion
                        if (data.name === "aggregate" && !err && res && res.toArray) {
                            if (data.args.length >= 2 && data.args[1].cursor) {
                                callback(err, res);
                            }
                            else {
                                res.toArray(function(err2, result) {
                                    callback(err2, result);
                                });
                            }
                        }
                        else {
                            callback(err, res);
                        }
                    }
                    else {
                        logDbRead.d("Without Callback");
                    }
                };
            };

            var overwriteDefaultRead = function(obj, name) {
                obj["_" + name] = obj[name];
                obj[name] = function(query, options, callback) {
                    var e;
                    var at = "";
                    if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                    }
                    if (typeof options === "function") {
                        //options was not passed, we have callback
                        logDbRead.d(name + " " + collection + " %j" + at, query);
                        logDbRead.d("From connection %j", countlyDb._cly_debug);
                        return this["_" + name](query, logForReads(options, e, copyArguments(arguments, name)));
                    }
                    else {
                        if (name === "findOne" && options && !options.projection) {
                            if (options.fields) {
                                options.projection = options.fields;
                                delete options.fields;
                            }
                            else {
                                options = {projection: options};
                            }
                        }
                        //we have options
                        logDbRead.d(name + " " + collection + " %j %j" + at, query, options);
                        logDbRead.d("From connection %j", countlyDb._cly_debug);
                        return this["_" + name](query, options, logForReads(callback, e, copyArguments(arguments, name)));
                    }
                };
            };

            overwriteDefaultRead(ob, "findOne");
            overwriteDefaultRead(ob, "aggregate");

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
                    else {
                        options = {projection: options};
                    }
                }
                if (log.getLevel("db") === "debug" || log.getLevel("db") === "info") {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, "\n").split("\n")[2];
                }
                logDbRead.d("find " + collection + " %j %j" + at, query, options);
                logDbRead.d("From connection %j", countlyDb._cly_debug);
                var cursor = this._find(query, options);
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(callback) {
                    cursor._toArray(logForReads(callback, e, copyArguments(args, "find")));
                };
                return cursor;
            };

            //backwards compatability

            ob._count = ob.count;
            ob.count = ob.countDocuments;
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
                        options.returnOriginal = false;
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