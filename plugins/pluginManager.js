/**
 * @typedef {import('mongodb').Db} Db
 * @typedef {import('../types/pluginManager').Database} Database
 * @typedef {import('../types/pluginManager').InitOptions} InitOptions
 * @typedef {import('../types/pluginManager').PluginManager} PluginManager
 * @typedef {import('../types/pluginManager').EventHandler} EventHandler
 * @typedef {import('../types/pluginManager').EventsRegistry} EventsRegistry
 * @typedef {import('../types/pluginManager').PluginsApis} PluginsApis
 * @typedef {import('../types/pluginManager').Config} Config
 * @typedef {import('../types/pluginManager').ConfigChanges} ConfigChanges
 * @typedef {import('../types/pluginManager').PluginState} PluginState
 * @typedef {import('../types/pluginManager').DatabaseConfig} DatabaseConfig
 * @typedef {import('../types/pluginManager').DbConnectionParams} DbConnectionParams
 * @typedef {import('../types/pluginManager').MaskingSettings} MaskingSettings
 * @typedef {import('../types/pluginManager').AppEventFromHash} AppEventFromHash
 * @typedef {import('../types/pluginManager').EventHashes} EventHashes
 */

var pluginDependencies = require('./pluginDependencies.js'),
    path = require('path'),
    plugins = pluginDependencies.getFixedPluginList(require('./plugins.json', 'dont-enclose'), {
        'discoveryStrategy': 'disableChildren',
        'overwrite': path.resolve(__dirname, './plugins.json')
    }),
    /** @type {PluginsApis} */
    pluginsApis = {},
    mongodb = require('mongodb'),
    countlyConfig = require('../frontend/express/config', 'dont-enclose'),
    apiCountlyConfig = require('../api/config', 'dont-enclose'),
    utils = require('../api/utils/utils.js'),
    fs = require('fs'),
    querystring = require('querystring'),
    cp = require('child_process'),
    async = require('async'),
    _ = require('underscore'),
    crypto = require('crypto'),
    Promise = require('bluebird'),
    log = require('../api/utils/log.js'),
    logDbRead = log('db:read'),
    logDbWrite = log('db:write'),
    logDriverDb = log('driver:db'),
    exec = cp.exec,
    spawn = cp.spawn,
    configextender = require('../api/configextender');
var pluginConfig = {};

/**
 * TODO: Remove this function and all it calls when moving to Node 12.
 * Normalize Bluebird's allSettled response to native Promise.allSettled shape.
 * @param {Array<{ isFulfilled: function(): boolean, value: function(): any, reason: function(): any }>} bluebirdResults - Bluebird inspection results with isFulfilled(), value(), and reason() methods
 * @returns {Array<{status: string, value: any, reason: any}>} Native Promise.allSettled compatible settlement descriptors
 */
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
 * Preserve numeric types when applying changes onto existing configs.
 * @param {object} configsPointer - target config object that will be mutated
 * @param {object} changes - incoming changes that may overwrite numbers
 * @returns {void}
 */
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
                changes[k] = changes[k] + '';
            }
        }

    }
};

/**
* This module handles communicaton with plugins
* @module "plugins/pluginManager"
*/

/** @lends module:plugins/pluginManager */
class pluginManager {
    /** @type {EventsRegistry} */
    events = {};

    /** @type {any[]} */
    plugs = [];

    /** @type {Record<string, any>} */
    methodCache = {};

    /** @type {Record<string, any>} */
    methodPromiseCache = {};

    /** @type {Record<string, Config>} */
    configs = {};

    /** @type {Record<string, Config>} */
    defaultConfigs = {};

    /** @type {Record<string, Function>} */
    configsOnchanges = {};

    /** @type {Record<string, boolean>} */
    excludeFromUI = {plugins: true};

    finishedSyncing = true;

    /** @type {string[]} */
    expireList = [];

    /** @type {any} */
    masking = {};

    /** @type {Record<string, boolean>} */
    fullPluginsMap = {};

    /** @type {string[]} */
    coreList = ['api', 'core'];

    /** @type {any} */
    dependencyMap = {};


    /**
     *  Registered app types
     *  @type {string[]}
     */
    appTypes = [];

    /**
     *  Events prefixed with [CLY]_ that should be recorded in core as standard data model
     *  @type {string[]}
     */
    internalEvents = [];

    /**
     *  Events prefixed with [CLY]_ that should be recorded in drill
     */
    internalDrillEvents = ['[CLY]_session_begin', '[CLY]_property_update', '[CLY]_session', '[CLY]_llm_interaction', '[CLY]_llm_interaction_feedback', '[CLY]_llm_tool_used', '[CLY]_llm_tool_usage_parameter'];

    /**
     *  Segments for events prefixed with [CLY]_ that should be omitted
     */
    internalOmitSegments = {};

    /**
     *  Custom configuration files for different databases
     */
    dbConfigFiles = {
        countly_drill: './drill/config.js',
        countly_out: '../api/configs/config.db_out.js',
        countly_fs: '../api/configs/config.db_fs.js'
    };

    /**
     * TTL collections to clean up periodically
     * @type {{collection: string, db: mongodb.Db, property: string, expireAfterSeconds: number}[]}
     */
    ttlCollections = [{'db': 'countly', 'collection': 'drill_data_cache', 'expireAfterSeconds': 600, 'property': 'lu'}];

    /**
     *  Custom configuration files for different databases for docker env
     */
    dbConfigEnvs = {
        countly_drill: 'PLUGINDRILL',
        countly_out: 'PLUGINOUT',
        countly_fs: 'PLUGINFS'
    };

    /**
     * Build dependency graph for all plugin folders in this directory.
     * @returns {void}
     */
    loadDependencyMap() {
        var pluginNames = [];
        var pluginsList = fs.readdirSync(path.resolve(__dirname, './')); //all plugins in folder
        //filter out just folders
        for (var z = 0; z < pluginsList.length; z++) {
            var p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
            if (p.isDirectory() || p.isSymbolicLink()) {
                pluginNames.push(pluginsList[z]);
            }
        }
        this.dependencyMap = pluginDependencies.getDependencies(pluginNames, {});
    }

    /**
     * Create plugin manager instance and register database handler.
     */
    constructor() {
        this.registerDatabaseHandler();
    }

    /**
    * Initialize api side plugins
    * @param {InitOptions} [options] - load operations
    * options.filename - filename to include (default api)
    **/
    init(options) {
        options = options || {};
        var pluginNames = [];
        var pluginsList = fs.readdirSync(path.resolve(__dirname, './')); //all plugins in folder
        //filter out just folders
        for (var z = 0; z < pluginsList.length; z++) {
            var p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
            if (p.isDirectory() || p.isSymbolicLink()) {
                pluginNames.push(pluginsList[z]);
            }
        }
        if (!options.skipDependencies) {
            this.dependencyMap = pluginDependencies.getDependencies(pluginNames, {});
        }
        console.log('Loading plugins', pluginNames);
        for (let i = 0, l = pluginNames.length; i < l; i++) {
            this.fullPluginsMap[pluginNames[i]] = true;
            try {
                //If file exists try including
                var filepath = path.resolve(__dirname, pluginNames[i] + '/api/' + (options.filename || 'api') + '.js');
                if (fs.existsSync(filepath)) {
                    //Require init_config if it exists
                    var initConfigPath = path.resolve(__dirname, pluginNames[i] + '/api/init_configs.js');
                    if (fs.existsSync(initConfigPath)) {
                        require(initConfigPath);
                    }
                    pluginsApis[pluginNames[i]] = require(filepath);
                }
            }
            catch (ex) {
                console.log('Skipping plugin ' + pluginNames[i] + ' as we could not load it because of errors.');
                console.error(ex.stack);
                console.log('Saving this plugin as disabled in db');
            }
        }
    }

    /**
     * Update plugins state in database
     * @param {Database} db - database connection
     * @param {object} params - request parameters
     * @param {function} callback - callback function
     */
    updatePluginsInDb(db, params, callback) {
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
                    console.error(err1);
                }
                else {
                    self.dispatch('/systemlogs', {params: params, action: 'change_plugins', data: {before: before, update: params.qstring.plugin}});
                    self.loadConfigs(db, function() {
                        callback();
                    });
                }
            });
        }

    }


    /**
     * Initialize a specific plugin
     * @param {string} pluginName - Name of the plugin
     * @param {string} [filename] - Filename to load (default: "api")
     */
    initPlugin(pluginName, filename) {
        try {
            filename = filename || 'api';
            var initConfigPath = path.resolve(__dirname, './' + pluginName + '/api/init_configs.js');
            if (fs.existsSync(initConfigPath)) {
                require(initConfigPath);
            }
            pluginsApis[pluginName] = require(path.resolve(__dirname, './' + pluginName + '/api/' + filename));
            this.fullPluginsMap[pluginName] = true;
        }
        catch (ex) {
            console.error(ex.stack);
        }
    }

    /**
     * Install missing plugins
     * @param {Database} db - database connection
     * @param {function} callback - callback function
     */
    installMissingPlugins(db, callback) {
        console.log('Checking if any plugins are missing');
        var self = this;
        var installPlugins = [];
        db.collection('plugins').findOne({_id: 'plugins'}, function(err, res) {
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
                console.log('Plugins to install: ' + JSON.stringify(installPlugins));
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
    }

    /**
     * Reload enabled plugin list from database
     * @param {Database} db - database connection
     * @param {function} callback - callback function
     */
    reloadEnabledPluginList(db, callback) {
        var self = this;
        this.loadDependencyMap();
        db.collection('plugins').findOne({_id: 'plugins'}, function(err, res) {
            if (err) {
                console.log(err);
            }
            res = res || {};
            if (Object.keys(self.fullPluginsMap).length > 0) {
                for (var pp in res.plugins) {
                    if (!self.fullPluginsMap[pp]) {
                        delete res.plugins[pp];
                    }
                }
            }
            pluginConfig = res.plugins || {}; //currently enabled plugins
            if (callback) {
                callback();
            }
        });
    }

    /**
    * Load configurations from database
    * @param {Database} db - database connection for countly db
    * @param {function} callback - function to call when configs loaded
    * @param {boolean} api - was the call made from api process
    **/
    loadConfigs(db, callback/*, api*/) {
        var self = this;
        db.collection('plugins').findOne({_id: 'plugins'}, function(err, res) {
            if (err) {
                console.log(err);
            }
            var pluginNames = [];
            var pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
            for (var z = 0; z < pluginsList.length; z++) {
                var p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
                if (p.isDirectory() || p.isSymbolicLink()) {
                    pluginNames.push(pluginsList[z]);
                }
            }

            for (let i = 0, l = pluginNames.length; i < l; i++) {
                self.fullPluginsMap[pluginNames[i]] = true;
            }
            if (!err) {
                res = res || {};
                for (let ns in self.configsOnchanges) {
                    if (self.configs && res && (!self.configs[ns] || !res[ns] || !_.isEqual(self.configs[ns], res[ns]))) {
                        self.configs[ns] = res[ns];
                        self.configsOnchanges[ns](self.configs[ns]);
                    }
                }
                self.configs = res;
                delete self.configs._id;
                pluginConfig = res.plugins || {}; //currently enabled plugins
                self.checkConfigs(db, self.configs, self.defaultConfigs, function() {

                    var installPlugins = [];
                    for (var z1 = 0; z1 < plugins.length; z1++) {
                        if (typeof pluginConfig[plugins[z1]] === 'undefined') {
                            pluginConfig[plugins[z1]] = true;
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

                    if (self.getConfig('data-manager').enableDataMasking) {
                        self.fetchMaskingConf({'db': db});
                    }
                });

            }
            else if (callback) {
                callback();
            }
        });

    }

    /**
    * Load configuration for ingestor process and ensure defaults are stored.
    * @param {Database} db - connection to Countly database
    * @param {function} callback - invoked after configs are loaded
    * @returns {Promise<void>} resolves when loading finishes
    */
    async loadConfigsIngestor(db, callback/*, api*/) {
        try {
            var res = await db.collection('plugins').findOne({_id: 'plugins'}, {'api': true, 'plugins': true, 'drill': true, 'aggregator': true});
            res = res || {};
            delete res._id;
            this.configs = res || {};
            pluginConfig = res.plugins || {}; //currently enabled plugins

            var diff = this.getObjectDiff(res, this.defaultConfigs);
            if (Object.keys(diff).length > 0) {
                var res2 = await db.collection('plugins').findOneAndUpdate({_id: 'plugins'}, {$set: this.flattenObject(diff)}, {upsert: true, new: true});
                if (res2) {
                    for (var i in diff) {
                        if (res2[i]) {
                            this.configs[i] = res2[i];
                        }
                    }
                }
            }
        }
        catch (err) {
            console.log(err);
        }
        callback();
    }

    /**
    * Set default configurations
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - object with key/values default configurations
    * @param {boolean} exclude - should these configurations be excluded from dashboard UI
    * @param {function} onchange - function to call when configurations change
    **/
    setConfigs(namespace, conf, exclude, onchange) {
        // Apply environment variable overrides before setting defaults
        var processedConf = {};
        for (let key in conf) {
            if (!Object.prototype.hasOwnProperty.call(conf, key)) {
                continue;
            }
            // Check for environment variable: COUNTLY_SETTINGS__NAMESPACE__KEY
            var envVarName = 'COUNTLY_SETTINGS__' + namespace.toUpperCase() + '__' + key.toUpperCase();
            if (process.env[envVarName] !== undefined) {
                var envValue = process.env[envVarName];
                // Try to parse as JSON first (for objects, arrays, booleans, numbers)
                try {
                    processedConf[key] = JSON.parse(envValue);
                }
                catch (e) {
                    // If parsing fails, use as string
                    processedConf[key] = envValue;
                }
            }
            else {
                processedConf[key] = conf[key];
            }
        }

        if (!this.defaultConfigs[namespace]) {
            this.defaultConfigs[namespace] = processedConf;
        }
        else {
            for (let i in processedConf) {
                if (!Object.prototype.hasOwnProperty.call(processedConf, i)) {
                    continue;
                }
                this.defaultConfigs[namespace][i] = processedConf[i];
            }
        }
        if (exclude) {
            this.excludeFromUI[namespace] = true;
        }
        if (onchange) {
            this.configsOnchanges[namespace] = onchange;
        }
    }

    /**
     * Add collection to expire list
     * @param {string} collection - collection name
     **/
    addCollectionToExpireList(collection) {
        this.expireList.push(collection);
    }

    /**
     * Get expire list array
     * @returns {string[]} expireList - expireList array that created from plugins
     **/
    getExpireList() {
        return this.expireList;
    }

    /**
    * Set user level default configurations
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - object with key/values default configurations
    **/
    setUserConfigs(namespace, conf) {
        if (!this.defaultConfigs[namespace]) {
            this.defaultConfigs[namespace] = {};
        }

        if (!this.defaultConfigs[namespace]._user) {
            this.defaultConfigs[namespace]._user = {};
        }

        for (let i in conf) {
            this.defaultConfigs[namespace]._user[i] = conf[i];
        }
    }

    /**
    * Get configuration from specific namespace and populate empty values with provided defaults
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} [userSettings] - possible other level configuration like user or app level to overwrite configs
    * @param {boolean} [override] - if true, would simply override configs with userSettings, if false, would check if configs should be overridden
    * @returns {object} copy of configs for provided namespace
    **/
    getConfig(namespace, userSettings, override) {
        var ob = {};
        if (this.configs[namespace]) {
            for (let i in this.configs[namespace]) {
                if (i === '_user') {
                    ob[i] = {};
                    for (let j in this.configs[namespace][i]) {
                        ob[i][j] = this.configs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = this.configs[namespace][i];
                }
            }
        }
        else if (this.defaultConfigs[namespace]) {
            for (let i in this.defaultConfigs[namespace]) {
                if (i === '_user') {
                    ob[i] = {};
                    for (let j in this.defaultConfigs[namespace][i]) {
                        ob[i][j] = this.defaultConfigs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = this.defaultConfigs[namespace][i];
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
    }

    /**
    * Get all configs for all namespaces
    * @returns {object} copy of all configs
    **/
    getAllConfigs() {
        //get unique namespaces
        var a = Object.keys(this.configs);
        var b = Object.keys(this.defaultConfigs);
        var c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        var ret = {};
        for (let i = 0; i < c.length; i++) {
            if (!this.excludeFromUI[c[i]] && (plugins.indexOf(c[i]) === -1 || pluginConfig[c[i]])) {
                ret[c[i]] = this.getConfig(c[i]);
            }
        }
        return ret;
    }

    /**
    * Get all configs for all namespaces overwritted by user settings
    * @param {object} userSettings - possible other level configuration like user or app level to overwrite configs
    * @returns {object} copy of all configs
    **/
    getUserConfigs(userSettings) {
        userSettings = userSettings || {};
        //get unique namespaces
        var a = Object.keys(this.configs);
        var b = Object.keys(this.defaultConfigs);
        var c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        var ret = {};
        for (let i = 0; i < c.length; i++) {
            if (!this.excludeFromUI[c[i]]) {
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
    }

    /**
    * Check if there are changes in configs ans store the changes
    * @param {Database} db - database connection for countly db
    * @param {object} current - current configs we have
    * @param {object} provided - provided configs
    * @param {function} callback - function to call when checking finished
    **/
    checkConfigs(db, current, provided, callback) {
        var diff = this.getObjectDiff(current, provided);
        if (Object.keys(diff).length > 0) {
            db.collection('plugins').findAndModify({_id: 'plugins'}, {}, {$set: this.flattenObject(diff)}, {upsert: true, new: true}, function(err, res) {
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
    }

    /**
    * Update existing configs, when syncing between servers
    * @param {Database} db - database connection for countly db
    * @param {string} namespace - namespace of configuration, usually plugin name
    * @param {object} conf - provided config
    * @param {function} callback - function to call when updating finished
    **/
    updateConfigs(db, namespace, conf, callback) {
        var update = {};
        if (namespace === '_id') {
            if (callback) {
                callback();
            }
        }
        else {
            update[namespace] = conf;
            db.collection('plugins').update({_id: 'plugins'}, {$set: this.flattenObject(update)}, {upsert: true}, function(err) {
                if (err) {
                    console.log(err);
                }
                if (callback) {
                    callback();
                }
            });
        }
    }

    /**
    * Update existing application level configuration
    * @param {Database} db -database connection for countly db
    * @param {string} appId - id of application
    * @param {string} namespace - name of plugin
    * @param {object} config  - new configuration object for selected plugin 
    * @param {function} callback - function that is called when updating has finished
    **/
    updateApplicationConfigs(db, appId, namespace, config, callback) {
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
    }

    /**
    * Update all configs with provided changes
    * @param {Database} db - database connection for countly db
    * @param {object} changes - provided changes
    * @param {function} callback - function to call when updating finished
    **/
    updateAllConfigs(db, changes, callback) {
        if (changes.api) {
            //country data tracking is changed
            if (changes.api.country_data) {
                //user disabled country data tracking while city data tracking is enabled
                if (changes.api.country_data === false && this.configs.api.city_data === true) {
                    //disable city data tracking
                    changes.api.city_data = false;
                }
            }
            //city data tracking is changed
            if (changes.api.city_data) {
                //user enabled city data tracking while country data tracking is disabled
                if (changes.api.city_data === true && this.configs.api.country_data === false) {
                    //enable country data tracking
                    changes.api.country_data = true;
                }
            }
        }
        for (let k in changes) {
            preventKillingNumberType(this.configs[k], changes[k]);
            _.extend(this.configs[k], changes[k]);
            if (k in this.configsOnchanges) {
                this.configsOnchanges[k](this.configs[k]);
            }
        }
        db.collection('plugins').update({_id: 'plugins'}, {$set: this.flattenObject(this.configs)}, {upsert: true}, function() {
            if (callback) {
                callback();
            }
        });
    }

    /**
    * Update user configs with provided changes
    * @param {Database} db - database connection for countly db
    * @param {object} changes - provided changes
    * @param {string} user_id - user for which to update settings
    * @param {function} callback - function to call when updating finished
    **/
    updateUserConfigs(db, changes, user_id, callback) {
        var self = this;
        db.collection('members').findOne({ _id: db.ObjectID(user_id) }, function(err, member) {
            var update = {};
            for (let k in changes) {
                update[k] = {};
                _.extend(update[k], self.configs[k], changes[k]);

                if (member.settings && member.settings[k]) {
                    _.extend(update[k], member.settings[k], changes[k]);
                }
            }
            db.collection('members').update({ _id: db.ObjectID(user_id) }, { $set: self.flattenObject(update, 'settings') }, { upsert: true }, function() {
                if (callback) {
                    callback();
                }
            });
        });
    }

    /**
    * Allow extending object module is exporting by using extend folders in countly
    * @param {string} name - filename to extend
    * @param {object} object - object to extend
    **/
    extendModule(name, object) {
        //plugin specific extend
        for (let i = 0, l = plugins.length; i < l; i++) {
            try {
                require('./' + plugins[i] + '/extend/' + name)(object);
            }
            catch (ex) {
                //silent error, not extending or no module
                if (!ex.code || ex.code !== 'MODULE_NOT_FOUND') {
                    console.log(ex);
                }
            }
        }

        //global extend
        try {
            require('../extend/' + name)(object);
        }
        catch (ex) {
            //silent error, not extending or no module
            if (!ex.code || ex.code !== 'MODULE_NOT_FOUND') {
                console.log(ex);
            }
        }
    }

    /**
    * Check whether a plugin is enabled (core plugins are always on).
    * @param {string} name - plugin name
    * @returns {boolean} true if plugin is active
    */
    isPluginOn(name) {
        if (this.coreList.indexOf(name) === -1) { //is one of plugins
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
    }

    /**
    * Infer the calling plugin name from the call stack (fallbacks to undefined).
    * @returns {string|undefined} feature/plugin name if detected
    */
    getFeatureName() {
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

    }

    /**
    * Register listening to new event on api side
    * @param {string} event - event to listen to
    * @param {EventHandler} callback - function to call, when event happens
    * @param {boolean} [unshift=false] - whether to register a high-priority callback (unshift it to the listeners array)
	* @param {string} [featureName] -  name of plugin
    **/
    register(event, callback, unshift = false, featureName) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        //{"cb":callback, "plugin":
        if (!featureName) {
            featureName = this.getFeatureName();
            featureName = featureName || 'core';
        }
        this.events[event][unshift ? 'unshift' : 'push']({'cb': callback, 'name': featureName});
    }

    /**
    * Dispatch specific event on api side
    * @param {string} event - event to dispatch
    * @param {any} params - object with parameters to pass to event
    * @param {Function} [callback] - function to call, when all event handlers that return Promise finished processing
    * @returns {boolean} true if any one responded to event
    **/
    dispatch(event, params, callback) {
        var used = false,
            promises = [];
        var promise;
        if (this.events[event]) {
            try {
                for (let i = 0, l = this.events[event].length; i < l; i++) {
                    var isEnabled = true;
                    if (this.fullPluginsMap[this.events[event][i].name] && pluginConfig[this.events[event][i].name] === false) {
                        isEnabled = false;
                    }

                    if (this.events[event][i] && this.events[event][i].cb && isEnabled) {
                        try {
                            promise = this.events[event][i].cb.call(null, params);
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
    }

    /**
    * Get a deep-cloned snapshot of the current event registry.
    * @returns {EventsRegistry} cloned events registry
    */
    returnEventsCopy() {
        return JSON.parse(JSON.stringify(this.events));
    }

    /**
    * Dispatch specific event on api side and wait until all event handlers have processed the event (legacy)
    * @param {string} event - event to dispatch
    * @param {object} params - object with parameters to pass to event
    * @param {function} callback - function to call, when all event handlers that return Promise finished processing
    * @returns {boolean} true if any one responded to event
    **/
    dispatchAllSettled(event, params, callback) {
        return this.dispatch(event, params, callback);
    }

    /**
    * Dispatch specific event on api side
    * 
    * @param {string} event - event to dispatch
    * @param {object} params - object with parameters to pass to event
    * @returns {Promise} which resolves to array of objects returned by events if any or error
    */
    dispatchAsPromise(event, params) {
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
    }

    /**
    * Load plugins frontend app.js and expose static paths for plugins
    * @param {object} app - express app
    * @param {object} countlyDb - connection to countly database
    * @param {object} express - reference to express js
    **/
    loadAppStatic(app, countlyDb, express) {
        var pluginNames = [];
        var pluginsList = fs.readdirSync(path.resolve(__dirname, './')); //all plugins in folder
        //filter out just folders
        for (var z = 0; z < pluginsList.length; z++) {
            var p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
            if (p.isDirectory() || p.isSymbolicLink()) {
                pluginNames.push(pluginsList[z]);
            }
        }

        for (let i = 0, l = pluginNames.length; i < l; i++) {
            try {
                //Require init_config if it exists
                var initConfigPath = path.resolve(__dirname, pluginNames[i] + '/api/init_configs.js');
                if (fs.existsSync(initConfigPath)) {
                    require(initConfigPath);
                }
                var appPath = path.resolve(__dirname, pluginNames[i] + '/frontend/app.js');
                let plugin;
                if (fs.existsSync(appPath)) {
                    plugin = require(appPath);
                    this.plugs.push({'name': pluginNames[i], 'plugin': plugin});
                    app.use(countlyConfig.path + '/' + pluginNames[i], express.static(__dirname + '/' + pluginNames[i] + '/frontend/public', { maxAge: 31557600000 }));
                    if (plugin.staticPaths) {
                        plugin.staticPaths(app, countlyDb, express);
                    }
                }
                else {
                    app.use(countlyConfig.path + '/' + pluginNames[i], express.static(__dirname + '/' + pluginNames[i] + '/frontend/public', { maxAge: 31557600000 }));
                }
            }
            catch (ex) {
                console.log('skipping plugin because of errors:' + pluginNames[i]);
                console.error(ex.stack);
            }
        }
    }

    /**
    * Call init method of plugin's frontend app.js  modules
    * @param {object} app - express app
    * @param {object} countlyDb - connection to countly database
    * @param {object} express - reference to express js
    **/
    loadAppPlugins(app, countlyDb, express) {
        for (let i = 0; i < this.plugs.length; i++) {
            try {
                //plugs[i].init(app, countlyDb, express);
                if (this.plugs[i] && this.plugs[i].plugin && this.plugs[i].plugin.init && typeof this.plugs[i].plugin.init === 'function') {
                    this.plugs[i].plugin.init({
                        name: this.plugs[i].name,
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
            }
            catch (ex) {
                console.error(ex.stack);
            }
        }
    }

    /**
    * Call specific predefined methods of plugin's frontend app.js  modules
    * @param {string} method - method name
    * @param {object} params - object with arguments
    * @returns {boolean} if any of plugins had that method
    **/
    callMethod(method, params) {
        var res = false;
        if (this.methodCache[method]) {
            if (this.methodCache[method].length > 0) {
                for (let i = 0; i < this.methodCache[method].length; i++) {
                    try {
                        if (this.methodCache[method][i][method](params)) {
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
            this.methodCache[method] = [];
            for (let i = 0; i < this.plugs.length; i++) {
                try {
                    if (this.plugs[i].plugin && this.plugs[i].plugin[method]) {
                        this.methodCache[method].push(this.plugs[i].plugin);
                        if (this.plugs[i].plugin[method](params)) {
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
    }


    /**
    * Call specific predefined methods of plugin's frontend app.js modules which are expected to return a promise which resolves to an object
    * All results will then be merged into one object, ensure objects returned by promises have unique keys
    * 
    * @param {string} method - method name
    * @param {object} params - object with arguments
    * @returns {boolean} if any of plugins had that method
    **/
    async callPromisedAppMethod(method, params) {
        var promises = [];
        if (this.methodPromiseCache[method]) {
            if (this.methodPromiseCache[method].length > 0) {
                for (let i = 0; i < this.methodPromiseCache[method].length; i++) {
                    try {
                        let ret = this.methodPromiseCache[method][i][method](params);
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
            this.methodPromiseCache[method] = [];
            for (let i = 0; i < this.plugs.length; i++) {
                try {
                    if (this.plugs[i].plugin && this.plugs[i].plugin[method]) {
                        this.methodPromiseCache[method].push(this.plugs[i].plugin);
                        let ret = this.plugs[i].plugin[method](params);
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
    }

    /**
    * Order plugins so that dependencies come before dependents.
    * @param {string[]} plugs_list - plugins to sort
    * @returns {string[]} dependency-sorted plugin list
    */
    fixOrderBasedOnDependency(plugs_list) {
        var self = this;
        var map0 = {};
        var new_list = [];
        for (var z = 0; z < plugs_list.length; z++) {
            map0[plugs_list[z]] = true;
        }

        /**
         * Recursively add plugin and its dependencies to the sorted list.
         * @param {string} pluginName - name of the plugin to add
         * @returns {void}
         */
        function add_Me(pluginName) {
            if (self.dependencyMap) {
                if (self.dependencyMap && self.dependencyMap.dpcs && self.dependencyMap.dpcs[pluginName] && self.dependencyMap.dpcs[pluginName].up) {
                    for (var z1 = 0; z1 < self.dependencyMap.dpcs[pluginName].up.length; z1++) {
                        if (map0[self.dependencyMap.dpcs[pluginName].up[z1]]) {
                            add_Me.call(self, self.dependencyMap.dpcs[pluginName].up[z1]);
                        }
                    }
                }
            }
            if (map0[pluginName]) {
                new_list.push(pluginName);
                map0[pluginName] = false;
            }
        }

        for (var plugname in map0) {
            add_Me.call(this, plugname);
        }
        return new_list;
    }

    /**
    * Get array of enabled plugin names
	* @param {boolean} returnFullList  - if true will return all available plugins
    * @returns {string[]} with plugin names
    **/
    getPlugins(returnFullList) {
        //fix it to return only enabled based on db settings
        var list = [];
        if (returnFullList) {
            for (var key2 in this.fullPluginsMap) {
                list.push(key2);
            }
            if (pluginConfig && Object.keys(pluginConfig).length > 0) {
                for (var key0 in pluginConfig) {
                    if (!this.fullPluginsMap[key0]) {
                        list.push(key0);
                    }
                }
            }
            else {
                for (var kk = 0; kk < plugins.length; kk++) {
                    if (!this.fullPluginsMap[plugins[kk]]) {
                        list.push(plugins[kk]);
                    }
                }
            }
            return this.fixOrderBasedOnDependency(list);
        }
        else {
            if (pluginConfig && Object.keys(pluginConfig).length > 0) {
                for (var key in pluginConfig) {
                    if (pluginConfig[key]) {
                        list.push(key);
                    }
                }
            }

            for (var k = 0; k < plugins.length; k++) {
                if (typeof pluginConfig[plugins[k]] === 'undefined') {
                    list.push(plugins[k]);
                }
            }

            return this.fixOrderBasedOnDependency(list);
        }
    }

    /**
    * Get array with references to plugin's api modules
    * @returns {PluginsApis} plugins api registry
    **/
    getPluginsApis() {
        return pluginsApis;
    }

    /**
    * Sets/changes method of specific plugin's api module
    * @param {string} plugin - plugin name
    * @param {string} name - method name
    * @param {function} func - function to set as method
    * @returns {void} void
    **/
    setPluginApi(plugin, name, func) {
        return pluginsApis[plugin][name] = func;
    }

    /**
    * Try to reload cached plugins json file
    **/
    reloadPlugins() {
        delete require.cache[require.resolve('./plugins.json', 'dont-enclose')];
        plugins = pluginDependencies.getFixedPluginList(require('./plugins.json', 'dont-enclose'), {
            'discoveryStrategy': 'disableChildren',
            'overwrite': path.resolve(__dirname, './plugins.json')
        });
    }

    /**
    * Check if plugin by provided name is enabled
    * @param {string} plugin - plugin name
    * @returns {boolean} if plugin is enabled
    **/
    isPluginEnabled(plugin) {
        var enabledPlugins = this.getPlugins();
        if (this.coreList.indexOf(plugin) === -1 && enabledPlugins.indexOf(plugin) === -1) { //it is plugin, but it is not enabled
            return false;
        }
        return true;
    }

    /**
    * When syncing plugins between servers, here we check plugins on master process of each server
    **/
    checkPluginsMaster() {
        var self = this;
        if (this.finishedSyncing) {
            this.finishedSyncing = false;
            self.dbConnection().then((/** @type {Database} */ db) => {
                db.collection('plugins').findOne({_id: 'plugins'}, function(err, res) {
                    if (!err) {
                        self.configs = res;
                        self.checkPlugins(db, function() {
                            db.close();
                            self.finishedSyncing = true;
                        });
                    }
                });
            });
        }
    }

    /**
    * Mark that we started syncing plugin states
    **/
    startSyncing() {
        this.finishedSyncing = false;
    }

    /**
    * Mark that we finished syncing plugin states
    **/
    stopSyncing() {
        this.finishedSyncing = true;
    }

    /**
    * We check plugins and sync configuration
    * @param {Database} db - connection to countly database
    * @param {function} callback - when finished checking and syncing
    **/
    checkPlugins(db, callback) {
        var plugConf = this.getConfig('plugins');

        if (Object.keys(plugConf).length === 0) {
            // No plugins inserted yet, initialize by inserting current plugins
            var list = this.getPlugins();
            for (let i = 0; i < list.length; i++) {
                plugConf[list[i]] = true;
            }
            this.updateConfigs(db, 'plugins', plugConf, callback);
        }
        else {
            // Check if we need to sync plugins
            var pluginList = this.getPlugins();
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
                // Sync plugins directly since we're in a single process
                this.syncPlugins(plugConf, callback);
            }
            else if (callback) {
                callback();
            }
        }
    }

    /**
    * Sync plugin states between server
    * @param {object} pluginState - object with plugin names as keys and true/false values to indicate if plugin is enabled or disabled
    * @param {function} callback - when finished checking and syncing
    * @param {Database} db - connection to countly database
    **/
    syncPlugins(pluginState, callback, db) {
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
                    if (db && self.getConfig('api').sync_plugins) {
                        self.updateConfigs(db, 'plugins', pluginState);
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
    }

    /**
     * Process plugin installation
     * @param {Database} db - database connection
     * @param {string|object} name - plugin name or object with name and enable properties
     * @param {function} callback - callback function
     */
    processPluginInstall(db, name, callback) {
        var self = this;
        var should_enable = true;
        if (typeof name !== 'string' && name.name) {
            if (name.enable === false || name.enable === true) {
                should_enable = name.enable;
            }
            name = name.name;
        }
        db.collection('plugins').remove({'_id': 'install_' + name, 'time': {'$lt': Date.now() - 60 * 1000 * 60}}, function(err) {
            if (err) {
                console.log(err);
                callback();
            }
            else {
                db.collection('plugins').insert({'_id': 'install_' + name, 'time': Date.now()}, {ignore_errors: [11000]}, function(err2) {
                    if (err2) {
                        if (err2.code && err2.code !== 11000) {
                            console.log(err2);
                        }
                        callback();
                    }
                    else {
                        self.installPlugin(name, function(errors) {
                            if (!errors) {
                                console.log('Install is finished fine. Updating state in database');
                                var query = {_id: 'plugins'};
                                query['plugins.' + name] = {'$ne': !should_enable};
                                var update = {};
                                update['plugins.' + name] = should_enable;
                                db.collection('plugins').update(query, {'$set': update}, {upsert: true}, function(err3, res) {
                                    console.log('plugins document updated');
                                    if (err3) {
                                        console.log(err3);
                                    }
                                    console.log(JSON.stringify(res));
                                    if (callback) {
                                        callback();
                                    }
                                    db.collection('plugins').remove({'_id': 'install_' + name}, function(err5) {
                                        if (err5) {
                                            console.log(err5);
                                        }
                                    });
                                });
                            }
                            else {
                                console.log('Install is finished with errors');
                                console.log(JSON.stringify(errors));
                                callback();
                            }
                        });
                    }
                });
            }
        });
    }

    /**
    * Procedure to install plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished installing plugin
    * @returns {void} void
    **/
    installPlugin(plugin, callback) {
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
            else if (!self.getConfig('api').offline_mode) {
                var args = ['install'];
                if (apiCountlyConfig.symlinked === true) {
                    args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
                }
                const cmd = spawn('npm', args, {cwd: cwd});
                var error2 = '';

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
            var args = [scriptPath];
            if (apiCountlyConfig.symlinked === true) {
                args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
            }
            var m = cp.spawn('nodejs', args);
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
    }

    /**
    * Procedure to upgrade plugin
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished upgrading plugin
    * @returns {void} void
    **/
    upgradePlugin(plugin, callback) {
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
            if (!self.getConfig('api').offline_mode) {

                const cmd = spawn('sudo', ['npm', 'install', '--unsafe-perm'], {cwd: cwd});
                var error2 = '';

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
            var args = [scriptPath];
            if (apiCountlyConfig.symlinked === true) {
                args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
            }
            var m = cp.spawn('nodejs', args);

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
    }

    /**
    * Procedure to uninstall plugin
    * Should be used only to hard disabled plugins mainly in dev mode
    * @param {string} plugin - plugin name
    * @param {function} callback - when finished uninstalling plugin
    * @returns {void} void
    **/
    uninstallPlugin(plugin, callback) {
        console.log('Uninstalling plugin %j...', plugin);
        callback = callback || function() {};
        var self = this;

        // First update database to disable plugin
        self.singleDefaultConnection().then((/** @type {Database} */ db) => {
            db.collection('plugins').updateOne(
                {_id: 'plugins'},
                {$set: {[`plugins.${plugin}`]: false}},
                function(err) {
                    if (err) {
                        console.log('Error updating plugin state:', err);
                    }

                    // Then run uninstall script
                    var scriptPath = path.join(__dirname, plugin, 'uninstall.js');
                    var errors = false;
                    var args = [scriptPath];
                    if (apiCountlyConfig.symlinked === true) {
                        args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
                    }
                    var m = cp.spawn('nodejs', args);

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
                        db.close();
                        callback(errors);
                    });
                }
            );
        });
    }

    /**
    * Procedure to prepare production file
    * @param {function} callback - when finished uninstalling plugin
    **/
    prepareProduction(callback) {
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
    }

    /**
    * Procedure to restart countly process
    **/
    restartCountly() {
        console.log('Restarting Countly ...');
        exec('sudo countly restart', function(error, stdout, stderr) {
            console.log('Done restarting countly with %j / %j / %j', error, stderr, stdout);
            if (error) {
                console.log('error: %j', error);
            }
            if (stderr) {
                console.log('stderr: %j', stderr);
            }
        });
    }

    /**
    * Get single pool connection for database
    * @returns {Database} db connection
    **/
    singleDefaultConnection() {
        if (typeof countlyConfig.mongodb === 'string') {
            var query = {};
            var conUrl = countlyConfig.mongodb;
            if (countlyConfig.mongodb.indexOf('?') !== -1) {
                var parts = countlyConfig.mongodb.split('?');
                query = querystring.parse(parts.pop());
                conUrl = parts[0];
            }
            query.maxPoolSize = 3;
            conUrl += '?' + querystring.stringify(query);
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
    }

    /**
    * Get database connection parameters for command line
    * @param {object} config - connection configs
    * @returns {object} db connection params
    **/
    getDbConnectionParams(config) {
        var ob = {};
        /** @type {string|undefined} */
        var db;
        if (typeof config === 'string') {
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
            dbName = dbName.split('://').pop();
            if (dbName.indexOf('@') !== -1) {
                var auth = dbName.split('@').shift();
                dbName = dbName.replace(auth + '@', '');
                var authParts = auth.split(':');
                ob.username = authParts[0];
                ob.password = authParts[1];
            }
            var dbParts = dbName.split('/');
            ob.host = dbParts[0];
            ob.db = dbParts[1] || 'countly';
            if (ob.db.indexOf('?') !== -1) {
                var parts = ob.db.split('?');
                ob.db = parts[0];
                var qstring = parts[1];
                if (qstring && qstring.length) {
                    qstring = querystring.parse(qstring);
                    if (qstring.ssl && (qstring.ssl === true || qstring.ssl === 'true')) {
                        ob.ssl = '';
                        ob.sslAllowInvalidCertificates = '';
                        ob.sslAllowInvalidHostnames = '';
                    }
                    if (qstring.tls && (qstring.tls === true || qstring.tls === 'true')) {
                        ob.tls = '';
                        ob.tlsAllowInvalidCertificates = '';
                        ob.tlsAllowInvalidHostnames = '';
                        ob.tlsInsecure = '';
                    }
                    if (qstring.replicaSet) {
                        ob.host = qstring.replicaSet + '/' + ob.host;
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
                ob.host = '';
                if (config.mongodb.replicaName) {
                    ob.host = config.mongodb.replicaName + '/';
                }
                ob.host += config.mongodb.replSetServers.join(',');
            }
            else {
                ob.host = (config.mongodb.host + ':' + config.mongodb.port);
            }
            if (config.mongodb.serverOptions && config.mongodb.serverOptions.ssl && (config.mongodb.serverOptions.ssl === true || config.mongodb.serverOptions.ssl === 'true')) {
                ob.ssl = '';
                ob.sslAllowInvalidCertificates = '';
                ob.sslAllowInvalidHostnames = '';
            }
            if (config.mongodb.serverOptions && config.mongodb.serverOptions.tls && (config.mongodb.serverOptions.tls === true || config.mongodb.serverOptions.tls === 'true')) {
                ob.tls = '';
                ob.tlsAllowInvalidCertificates = '';
                ob.tlsAllowInvalidHostnames = '';
                ob.tlsInsecure = '';
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
    }

    /**
    * This method accepts MongoDB connection string and new database name and replaces the name in string with provided one
    * @param {string} str - MongoDB connection string
    * @param {string} db - database name
    * @returns {string} modified connection string
    **/
    replaceDatabaseString(str, db) {
        if (!db) {
            db = 'countly';
        }

        // Handle admin database replacement for any target database
        var hasAdminDb = str.indexOf('/admin') !== -1;

        if (hasAdminDb) {
            var updatedConnectionString = str.replace('/admin', '/' + db);
            var hasAuthSource = updatedConnectionString.indexOf('authSource=') !== -1;

            if (!hasAuthSource) {
                var hasQueryParams = updatedConnectionString.indexOf('?') !== -1;
                var authSourceParam = hasQueryParams ? '&authSource=admin' : '?authSource=admin';
                updatedConnectionString += authSourceParam;
            }

            return updatedConnectionString;
        }

        var countlyIndex = str.lastIndexOf('/countly');
        var targetDbIndex = str.lastIndexOf('/' + db);
        if (countlyIndex !== targetDbIndex && countlyIndex !== -1 && db) {
            return str.substr(0, countlyIndex) + '/' + db + str.substr(countlyIndex + ('/countly').length);
        }
        else if (countlyIndex === -1 && targetDbIndex === -1) {
            //no db found in the string, we should insert the needed one
            var urlParts = str.split('://');
            if (typeof urlParts[1] === 'string') {
                var pathParts = urlParts[1].split('/');
                if (pathParts.length === 1) {
                    pathParts[0] += '/' + db;
                }
                else {
                    pathParts[pathParts.length - 1] = db + pathParts[pathParts.length - 1];
                }
                urlParts[1] = pathParts.join('/');
            }
            return urlParts.join('://');
        }
        return str;
    }

    /**
    * Establish connections to all configured databases and initialize common handlers.
    * @param {boolean} return_original - when true, returns raw driver instances instead of wrapped ones
    * @returns {Promise<mongodb.Db[]>} Resolves with [countly, out, fs, drill] database connections
    */
    async connectToAllDatabases(return_original) {
        let dbs = ['countly', 'countly_out', 'countly_fs', 'countly_drill'];

        let databases = [];
        if (apiCountlyConfig && apiCountlyConfig.shared_connection) {
            console.log('using shared connection pool');
            databases = await this.dbConnection(dbs, return_original);
        }
        else {
            console.log('using separate connection pool');
            databases = await Promise.all(dbs.map((db) => this.dbConnection(db, return_original)));
        }
        const [dbCountly, dbOut, dbFs, dbDrill] = databases;

        let common = require('../api/utils/common');
        require('../api/utils/countlyFs').setHandler(dbFs);

        common.db = dbCountly;
        common.outDb = dbOut;
        common.drillDb = dbDrill;

        try {
            common.db.collection('drill_data_cache').createIndex({lu: 1});
        }
        catch (err) {
            console.log('Plugin Manager: Failed to create index on drill_data_cache collection for lu field:', err);
        }
        var self = this;
        await new Promise(function(resolve) {
            self.loadConfigs(common.db, function() {
                resolve();
            });
        });
        return databases;
    }

    /**
    * Get database connection with configured pool size
    * @param {object|string|string[]} config - connection configs
    * @param {boolean} return_original - return original driver connection object(database is not wrapped)
    * @returns {Promise<mongodb.Db|mongodb.Db[]>} db connection instance or array of instances
    **/
    async dbConnection(config, return_original) {
        var db, maxPoolSize = 100;
        var mngr = this;
        var dbList = [];

        var useConfig = JSON.parse(JSON.stringify(countlyConfig));
        if (process.argv[1] && (process.argv[1].endsWith('api/api.js') ||
                                process.argv[1].endsWith('api/ingestor.js') ||
                                process.argv[1].endsWith('api/aggregator.js') ||
                                process.argv[1].includes('/api/') ||
                                process.argv[1].includes('jobServer/index.js'))) {
            useConfig = JSON.parse(JSON.stringify(apiCountlyConfig));
        }

        if (typeof config === 'string') {
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
        else if (Array.isArray(config)) {
            dbList = config;
            config = useConfig;
        }
        else {
            config = config || useConfig;
        }

        if (config && typeof config.mongodb === 'string') {
            try {
                const urlObj = new URL(config.mongodb);
                // mongo connection string with multiple host like 'mongodb://localhost:30000,localhost:30001' will cause an error

                maxPoolSize = urlObj.searchParams.get('maxPoolSize') !== null ? urlObj.searchParams.get('maxPoolSize') : maxPoolSize;
            }
            catch (_err) {
                // we catch the error here and try to process only the query params part
                const urlParts = config.mongodb.split('?');

                if (urlParts.length > 1) {
                    const queryParams = new URLSearchParams(urlParts[1]);

                    maxPoolSize = queryParams.get('maxPoolSize') !== null ? queryParams.get('maxPoolSize') : maxPoolSize;
                }
            }
        }
        else {
            maxPoolSize = config.mongodb.max_pool_size || maxPoolSize;
        }

        if (process.argv[1] && process.argv[1].endsWith('executor.js')) {
            maxPoolSize = 3;
        }

        var dbName;
        var dbOptions = {
            maxPoolSize: maxPoolSize,
            noDelay: true,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 0,
            serverSelectionTimeoutMS: 30000,
            maxIdleTimeMS: 300000,
            waitQueueTimeoutMS: 0
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
            dbName = encodeURIComponent(config.mongodb.username) + ':' + encodeURIComponent(utils.decrypt(config.mongodb.password)) + '@' + dbName;
        }

        if (dbName.indexOf('mongodb://') !== 0 && dbName.indexOf('mongodb+srv://') !== 0) {
            dbName = 'mongodb://' + dbName;
        }
        if (dbName.indexOf('retryWrites') === -1) {
            if (dbName.indexOf('?') === -1) {
                dbName = dbName + '?retryWrites=false';
            }
            else {
                dbName = dbName + '&retryWrites=false';
            }
        }

        var db_name = 'countly';
        try {
            db_name = dbName.split('/').pop().split('?')[0];
        }
        catch (ex) {
            db_name = 'countly';
        }

        try {
            dbOptions.appname = process.title + ': ' + db_name + '(' + maxPoolSize + ') ' + process.pid;
        }
        catch (ex) {
            //silent
        }

        mngr.dispatch('/db/pre_connect', {
            db: db_name,
            connection: dbName,
            options: dbOptions
        });
        const client = new mongodb.MongoClient(dbName, dbOptions);
        try {
            await client.connect();
        }
        catch (ex) {
            var safeDbName = dbName;
            var start = dbName.indexOf('://') + 3;
            var end = dbName.indexOf('@', start);
            if (end > -1 && start > 3) {
                var middle = dbName.indexOf(':', start);
                if (middle > -1 && middle < end) {
                    safeDbName = dbName.substring(0, middle) + ':*****' + dbName.substring(end);
                }
            }
            logDbRead.e('Error connecting to database', ex);
            logDbRead.e('With params %j', {
                db: db_name,
                connection: safeDbName,
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
            logLevel = logLevel || 'd';
            if (eventName === 'serverHeartbeatFailed' || eventName === 'topologyDescriptionChanged' || eventName === 'serverDescriptionChanged' || eventName === 'serverClosed') {
                client.on(eventName, (event) => logObject[logLevel](eventName + ' %j', event));
            }
            else {
                client.on(eventName, () => logObject[logLevel](eventName));
            }
        }

        //connection pool
        logDriver('connectionPoolCreated', logDriverDb);
        logDriver('connectionPoolReady', logDriverDb);
        logDriver('connectionPoolClosed', logDriverDb);
        logDriver('connectionCreated', logDriverDb);
        logDriver('connectionReady', logDriverDb);
        logDriver('connectionClosed', logDriverDb);
        logDriver('connectionCheckOutStarted', logDriverDb);
        logDriver('connectionCheckOutFailed', logDriverDb);
        logDriver('connectionCheckedOut', logDriverDb);
        logDriver('connectionCheckedIn', logDriverDb);
        logDriver('connectionPoolCleared', logDriverDb);

        //SDAM
        logDriver('serverOpening', logDriverDb);
        logDriver('serverClosed', logDriverDb, 'i');
        logDriver('serverDescriptionChanged', logDriverDb, 'i');
        logDriver('topologyOpening', logDriverDb);
        logDriver('topologyClosed', logDriverDb);
        logDriver('topologyDescriptionChanged', logDriverDb, 'i');
        logDriver('serverHeartbeatStarted', logDriverDb);
        logDriver('serverHeartbeatSucceeded', logDriverDb);
        logDriver('serverHeartbeatFailed', logDriverDb, 'e');

        //commands
        logDriver('commandStarted', logDriverDb);
        logDriver('commandSucceeded', logDriverDb);
        logDriver('commandFailed', logDriverDb, 'e');




        if (!return_original) {
            client._db = client.db;
            client.db = function(database, options) {
                return mngr.wrapDatabase(client._db(database, options), client, db_name, dbName, dbOptions);
            };
        }
        else {
            if (!client.db.ObjectID) {
                client.db.ObjectID = function(id) {
                    try {
                        return new mongodb.ObjectId(id);
                    }
                    catch (ex) {
                        logDbRead.i('Incorrect Object ID %j', ex);
                        return id;
                    }
                };
            }
        }

        if (dbList.length) {
            var ret = [];
            for (let i = 0; i < dbList.length; i++) {
                ret.push(client.db(dbList[i]));
                if (return_original) {
                    ret[i].ObjectID = client.db.ObjectID;
                }
            }
            return ret;
        }
        else {
            var db_instance = client.db(db_name);
            if (return_original && client.db.ObjectID) {
                db_instance.ObjectID = client.db.ObjectID;
            }
            return db_instance;
        }
    }

    /**
    * Load masking configuration and event hash map for all applications.
    * @param {{db: Database}} options - options containing database connection
    * @returns {Promise<void>} resolves when masking data is loaded
    */
    async fetchMaskingConf(options) {
        var apps = await options.db.collection('apps').find({}, {'masking': true}).toArray();

        var appObj = {};

        for (let z = 0; z < apps.length; z++) {
            appObj[apps[z]._id] = apps[z].masking;
        }

        this.masking.apps = appObj;
        var hashMap = {};
        var eventsDb = await options.db.collection('events').find({}, {'list': true}).toArray();
        for (let z = 0; z < eventsDb.length; z++) {
            eventsDb[z]._id = eventsDb[z]._id + '';
            for (let i = 0; i < eventsDb[z].list.length; i++) {
                hashMap[crypto.createHash('sha1').update(eventsDb[z].list[i] + eventsDb[z]._id + '').digest('hex')] = {'a': eventsDb[z]._id, 'e': eventsDb[z].list[i]};
            }

            var internalDrillEvents = ['[CLY]_session', '[CLY]_crash', '[CLY]_view', '[CLY]_action', '[CLY]_push_action', '[CLY]_push_sent', '[CLY]_star_rating', '[CLY]_nps', '[CLY]_survey', '[CLY]_apm_network', '[CLY]_apm_device', '[CLY]_consent'];
            var internalEvents = ['[CLY]_session', '[CLY]_crash', '[CLY]_view', '[CLY]_action', '[CLY]_push_action', '[CLY]_push_sent', '[CLY]_star_rating', '[CLY]_nps', '[CLY]_survey', '[CLY]_apm_network', '[CLY]_apm_device', '[CLY]_consent'];

            if (internalDrillEvents) {
                for (let i = 0; i < internalDrillEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalDrillEvents[i] + eventsDb[z]._id + '').digest('hex')] = {'a': eventsDb[z]._id, 'e': internalDrillEvents[i]};
                }
            }

            if (internalEvents) {
                for (let i = 0; i < internalEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalEvents[i] + eventsDb[z]._id + '').digest('hex')] = {'a': eventsDb[z]._id, 'e': internalEvents[i]};
                }
            }
        }
        this.masking.hashMap = hashMap;
        this.masking.isLoaded = Date.now().valueOf();
        return;
    }

    /**
    * Checks if any item in object tree and subtree is true. Recursive.
    * @param {object} myOb - object
    * @returns {boolean} true or false
    **/
    hasAnyValueTrue(myOb) {
        if (typeof myOb === 'object' && Object.keys(myOb) && Object.keys(myOb).length > 0) {
            var value = false;
            for (var key in myOb) {
                value = value || this.hasAnyValueTrue(myOb[key]);
            }
            return value;
        }
        else {
            if (myOb === true) {
                return true;
            }
            else {
                return false;
            }
        }
    }

    /**
    * Check if any masking rule is enabled across applications.
    * @returns {boolean} true if at least one mask is active
    */
    isAnyMasked() {
        var result = false;
        if (this.masking && this.masking.apps) {
            for (var app in this.masking.apps) {
                if (this.masking.apps[app]) {
                    result = result || this.hasAnyValueTrue(this.masking.apps[app]);
                    if (result) {
                        return true;
                    }
                }
            }
            return false;
        }
        return result;
    }

    /**
    * Get masking settings for a specific app or for all apps.
    * @param {string} appID - application id or 'all'
    * @returns {MaskingSettings|Object.<string, MaskingSettings>} masking rules
    */
    getMaskingSettings(appID) {
        if (appID === 'all') {
            if (this.masking && this.masking.apps) {
                try {
                    return JSON.parse(JSON.stringify(this.masking.apps));
                }
                catch (ex) {
                    return {};
                }
            }
            else {
                return {};
            }
        }
        else if (this.masking && this.masking.apps && this.masking.apps[appID]) {
            try {
                return JSON.parse(JSON.stringify(this.masking.apps[appID]));
            }
            catch (ex) {
                return {};
            }
        }
        else {
            return {};
        }
    }

    /**
    * Resolve hash back to application id and event key.
    * @param {string} hashValue - hashed event identifier
    * @returns {AppEventFromHash|object} resolved event data with hash
    */
    getAppEventFromHash(hashValue) {
        if (this.masking && this.masking.hashMap && this.masking.hashMap[hashValue]) {
            var record = JSON.parse(JSON.stringify(this.masking.hashMap[hashValue]));
            record.hash = hashValue;
            return record;
        }
        else {
            return {};
        }
    }

    /**
    * Retrieve event hash map for a specific app or all apps.
    * @param {string} appID - application id or 'all'
    * @returns {EventHashes} map of event key to hash
    */
    getEHashes(appID) {
        var map = {};
        if (this.masking && this.masking.hashMap) {
            if (appID === 'all') {
                for (var hash0 in this.masking.hashMap) {
                    map[this.masking.hashMap[hash0].e] = hash0;
                }
            }
            else {
                for (var hash in this.masking.hashMap) {
                    if (this.masking.hashMap[hash].a === appID) {
                        map[this.masking.hashMap[hash].e] = hash;
                    }
                }
            }
        }
        return map;
    }

    /**
     *  Wrap db object with our compatability layer
     *  @param {Db} countlyDb - database connection
     *  @param {MongoClient} client - database client connection
     *  @param {string} dbName - database name
     *  @param {string} dbConnectionString - database connection string
     *  @param {Object} dbOptions - database connection options
     *  @returns {Database} wrapped database connection
     */
    wrapDatabase(countlyDb, client, dbName, dbConnectionString, dbOptions) {
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

        logDbRead.d('New connection %j', countlyDb._cly_debug);
        if (!countlyDb.ObjectID) {
            countlyDb.ObjectID = function(id) {
                try {
                    return new mongodb.ObjectId(id);
                }
                catch (ex) {
                    logDbRead.i('Incorrect Object ID %j', ex);
                    return id;
                }
            };
        }
        countlyDb.encode = function(str) {
            return str.replace(/^\$/g, '&#36;').replace(/\./g, '&#46;');
        };

        countlyDb.decode = function(str) {
            return str.replace(/^&#36;/g, '$').replace(/&#46;/g, '.');
        };
        countlyDb.onOpened = function(callback) {
            callback();
        };
        countlyDb._native = countlyDb;
        countlyDb.client = client;
        countlyDb.close = client.close.bind(client);
        mngr.dispatch('/db/connected', {
            db: dbName,
            instance: countlyDb,
            connection: dbConnectionString,
            options: dbOptions
        });

        countlyDb.admin().buildInfo().then((result) => {
            if (result) {
                countlyDb.build = result;
            }
        }).catch(function(err) {
            console.log('Cannot get build info', err);
        });

        //promise compatability
        var overwriteDbPromise = function(obj, name) {
            obj['_' + name] = obj[name];
            obj[name] = function(...args) {
                var callback;
                if (typeof args[args.length - 1] === 'function') {
                    callback = args[args.length - 1];
                    args.pop();
                }

                var promise = obj['_' + name](...args);
                if (typeof callback === 'function') {
                    promise = promise.then(function(res) {
                        callback(undefined, res);
                    }).catch(function(err) {
                        if (typeof callback === 'function') {
                            callback(err, null);
                        }
                    });
                }
                return promise;
            };
        };
        overwriteDbPromise(countlyDb, 'aggregate');
        overwriteDbPromise(countlyDb, 'collections');
        overwriteDbPromise(countlyDb, 'command');
        overwriteDbPromise(countlyDb, 'createCollection');
        overwriteDbPromise(countlyDb, 'createIndex');
        overwriteDbPromise(countlyDb, 'dropCollection');
        overwriteDbPromise(countlyDb, 'dropDatabase');
        overwriteDbPromise(countlyDb, 'indexInformation');
        overwriteDbPromise(countlyDb, 'profilingLevel');
        overwriteDbPromise(countlyDb, 'removeUser');
        overwriteDbPromise(countlyDb, 'renameCollection');
        overwriteDbPromise(countlyDb, 'setProfilingLevel');
        overwriteDbPromise(countlyDb, 'stats');


        var findOptions = [
            'allowDiskUse',
            'allowPartialResults',
            'authdb',
            'awaitData',
            'batchSize',
            'bsonRegExp',
            'checkKeys',
            'collation',
            'comment',
            'dbName',
            'enableUtf8Validation',
            'explain',
            'fieldsAsRaw',
            'hint',
            'ignoreUndefined',
            'let',
            'limit',
            'max',
            'maxAwaitTimeMS',
            'maxScan',
            'maxTimeMS',
            'min',
            'noCursorTimeout',
            'noResponse',
            'omitReadPreference',
            'oplogReplay',
            'partial',
            'projection',
            'promoteBuffers',
            'promoteLongs',
            'promoteValues',
            'raw',
            'readConcern',
            'readPreference',
            'retryWrites',
            'returnKey',
            'serializeFunctions',
            'session',
            'showDiskLoc',
            'showRecordId',
            'singleBatch',
            'skip',
            'snapshot',
            'sort',
            'tailable',
            'timeout',
            'timeoutMode',
            'timeoutMS',
            'useBigInt64',
            'willRetryWrite'
        ];

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
             *  @param {Function} callback - callback
             *  @param {Array} ignore_errors - array with error codes to ignore
             *  @returns {Promise} Promise to handle
             */
            function handlePromiseErrors(promise, e, data, callback, ignore_errors) {
                if (promise && promise.then) {
                    if (typeof callback === 'function') {
                        promise = promise.then(function(res) {
                            callback(undefined, res);
                        });
                    }
                    return promise.catch(function(err) {
                        if (typeof callback === 'function') {
                            callback(err, null);
                        }
                        else {
                            if (ignore_errors && ignore_errors.indexOf(err.code) === -1) {
                                logDbWrite.e('Error in promise from ' + collection + ' %j %s %j', data, err, err);
                                logDbWrite.d('From connection %j', countlyDb._cly_debug);
                                if (e) {
                                    logDbWrite.e(e.stack);
                                }
                            }
                            throw err;
                        }
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
                        if (!res.value && data && data.name === 'findAndModify' && data.args && data.args[3] && data.args[3].remove) {
                            res = {'value': res};
                        }
                        if (!res.value && data && data.name === 'findAOneAndDelete') {
                            res = {'value': res};
                        }
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
                            if (typeof retry === 'function') {
                                logDbWrite.d('Retrying writing ' + collection + ' %j', data);
                                logDbWrite.d('From connection %j', countlyDb._cly_debug);
                                retry();
                            }
                            else {
                                if (!(data.args && data.args[2] && data.args[2].ignore_errors && data.args[2].ignore_errors.indexOf(err.code) !== -1)) {
                                    logDbWrite.e('Error writing ' + collection + ' %j %s %j', data, err, err);
                                    logDbWrite.d('From connection %j', countlyDb._cly_debug);
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
                                logDbWrite.e('Error writing ' + collection + ' %j %s %j', data, err, err);
                                logDbWrite.d('From connection %j', countlyDb._cly_debug);
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
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                else {
                    options = options || {};
                }

                mngr.dispatch('/db/readAndUpdate', {
                    db: dbName,
                    operation: 'findAndModify',
                    collection: collection,
                    query: query,
                    sort: sort,
                    update: doc,
                    options: options
                });
                var e;
                var at = '';
                if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }

                logDbWrite.d('findAndModify ' + collection + ' %j %j %j %j' + at, query, sort, doc, options);
                logDbWrite.d('From connection %j', countlyDb._cly_debug);
                if (options.upsert) {
                    var self = this;
                    return handlePromiseErrors(this._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, function() {
                        logDbWrite.d('retrying findAndModify ' + collection + ' %j %j %j %j' + at, query, sort, doc, options);
                        logDbWrite.d('From connection %j', countlyDb._cly_debug);
                        return handlePromiseErrors(self._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, null, e, copyArguments(arguments, 'findAndModify')));
                    }, e, copyArguments(arguments, 'findAndModify')));
                }
                else {
                    return handlePromiseErrors(this._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, null, e, copyArguments(arguments, 'findAndModify')));
                }
            };

            var overwriteRetryWrite = function(obj, name) {
                obj['_' + name] = obj[name];
                obj[name] = function(selector, doc, options, callback) {
                    if (typeof options === 'function') {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    if (typeof options.includeResultMetadata === 'undefined') {
                        options.includeResultMetadata = true;
                    }

                    mngr.dispatch('/db/update', {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: selector,
                        update: doc,
                        options: options
                    });
                    var e;
                    var at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbWrite.d(name + ' ' + collection + ' %j %j %j' + at, selector, doc, options);
                    logDbWrite.d('From connection %j', countlyDb._cly_debug);
                    if (options.upsert) {
                        var self = this;
                        return handlePromiseErrors(this['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, function() {
                            logDbWrite.d('retrying ' + name + ' ' + collection + ' %j %j %j' + at, selector, doc, options);
                            logDbWrite.d('From connection %j', countlyDb._cly_debug);
                            return handlePromiseErrors(self['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                        }, e, copyArguments(arguments, name)));
                    }
                    else {
                        return handlePromiseErrors(this['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                    }
                };
            };

            overwriteRetryWrite(ob, 'updateOne');
            overwriteRetryWrite(ob, 'updateMany');
            overwriteRetryWrite(ob, 'replaceOne');
            overwriteRetryWrite(ob, 'findOneAndUpdate');
            overwriteRetryWrite(ob, 'findOneAndReplace');

            //overwrite with write logging
            var logForWrites = function(callback, e, data) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (err) {
                        if (!(data.args && data.args[1] && data.args[1].ignore_errors && data.args[1].ignore_errors.indexOf(err.code) !== -1)) {
                            logDbWrite.e('Error writing ' + collection + ' %j %s %j', data, err, err);
                            logDbWrite.d('From connection %j', countlyDb._cly_debug);
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
                obj['_' + name] = obj[name];
                obj[name] = function(selector, options, callback) {
                    if (typeof options === 'function') {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    mngr.dispatch('/db/write', {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: selector,
                        options: options
                    });
                    var e;
                    var at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbWrite.d(name + ' ' + collection + ' %j %j' + at, selector, options);
                    logDbWrite.d('From connection %j', countlyDb._cly_debug);
                    return handlePromiseErrors(this['_' + name](selector, options), e, copyArguments(arguments, name), logForWrites(callback, e, copyArguments(arguments, name)));
                };
            };
            overwriteDefaultWrite(ob, 'deleteOne');
            overwriteDefaultWrite(ob, 'deleteMany');
            overwriteDefaultWrite(ob, 'insertOne');
            overwriteDefaultWrite(ob, 'insertMany');
            overwriteDefaultWrite(ob, 'bulkWrite');
            overwriteDefaultWrite(ob, 'save');

            //overwrite with read logging
            var logForReads = function(callback, e, data) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (err) {
                        if (!(data && data.args && data.args[1] && data.args[1].ignore_errors && data.args[1].ignore_errors.indexOf(err.code) !== -1)) {
                            logDbRead.e('Error reading ' + collection + ' %j %s %j', data, err, err);
                            logDbRead.d('From connection %j', countlyDb._cly_debug);
                            if (e) {
                                logDbRead.e(e.stack);
                            }
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                };
            };

            var overwriteDefaultRead = function(obj, name) {
                obj['_' + name] = obj[name];
                obj[name] = function(query, options, callback) {
                    if (typeof options === 'function') {
                        callback = options;
                        options = {};
                    }
                    else {
                        options = options || {};
                    }

                    mngr.dispatch('/db/read', {
                        db: dbName,
                        operation: name,
                        collection: collection,
                        query: query,
                        options: options
                    });
                    var e;
                    var at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    if (name === 'findOne' && options && !options.projection) {
                        if (options.fields) {
                            options.projection = options.fields;
                            delete options.fields;
                        }
                        else if (findOptions.indexOf(Object.keys(options)[0]) === -1) {

                            options = {projection: options};
                        }
                    }
                    logDbRead.d(name + ' ' + collection + ' %j %j' + at, query, options);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    if (name === 'findOneAndDelete' && !options.remove) {
                        return handlePromiseErrors(this['_' + name](query, options).then(result => ({ value: result })),
                            e, copyArguments(arguments, name), logForReads(callback, e, copyArguments(arguments, name))
                        );
                    }
                    else {
                        return handlePromiseErrors(this['_' + name](query, options), e, copyArguments(arguments, name), logForReads(callback, e, copyArguments(arguments, name)));
                    }
                };
            };

            overwriteDefaultRead(ob, 'findOne');
            overwriteDefaultRead(ob, 'findOneAndDelete');

            ob._aggregate = ob.aggregate;
            ob.aggregate = function(query, options, callback) {
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                else {
                    options = options || {};
                }
                var e;
                var args = arguments;
                var at = '';
                mngr.dispatch('/db/read', {
                    db: dbName,
                    operation: 'aggregate',
                    collection: collection,
                    query: query,
                    options: options
                });
                if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }
                logDbRead.d('aggregate ' + collection + ' %j %j' + at, query, options);
                logDbRead.d('From connection %j', countlyDb._cly_debug);
                var cursor = this._aggregate(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs) {
                    if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(cb) {
                    return handlePromiseErrors(cursor._toArray(), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                cursor._forEach = cursor.forEach;
                cursor.forEach = function(iterator, cb) {
                    return handlePromiseErrors(cursor._forEach(iterator), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                cursor._close = cursor.close;
                cursor.close = function(cb) {
                    return handlePromiseErrors(cursor._close(), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                if (typeof callback === 'function') {
                    return cursor.toArray(callback);
                }
                return cursor;
            };

            ob._find = ob.find;
            ob.find = function(query, options) {
                var e;
                var args = arguments;
                var at = '';
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
                mngr.dispatch('/db/read', {
                    db: dbName,
                    operation: 'find',
                    collection: collection,
                    query: query,
                    options: options
                });
                if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                    e = new Error();
                    at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }
                logDbRead.d('find ' + collection + ' %j %j' + at, query, options);
                logDbRead.d('From connection %j', countlyDb._cly_debug);
                var cursor = this._find(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs) {
                    if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };

                cursor._project = cursor.project;
                cursor.project = function(projection) {
                    //Fix projection
                    var newOptions = JSON.parse(JSON.stringify(projection));
                    newOptions.projection = projection;
                    mngr.dispatch('/db/read', {
                        db: dbName,
                        operation: 'find',
                        collection: collection,
                        query: query,
                        options: newOptions
                    });
                    return cursor._project(newOptions.projection);
                };
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(callback) {
                    return handlePromiseErrors(cursor._toArray(), e, copyArguments(arguments, 'find'), logForReads(callback, e, copyArguments(args, 'find')));
                };
                cursor._forEach = cursor.forEach;
                cursor.forEach = function(iterator, callback) {
                    return handlePromiseErrors(cursor._forEach(iterator), e, copyArguments(arguments, 'find'), logForReads(callback, e, copyArguments(args, 'find')));
                };
                cursor._close = cursor.close;
                cursor.close = function(cb) {
                    return handlePromiseErrors(cursor._close(), e, copyArguments(arguments, 'find'), logForReads(cb, e, copyArguments(args, 'find')));
                };
                return cursor;
            };

            //overwrite with ops logging
            var logForOps = function(callback, e, data, ignore_errors) {
                //we cannot enforce callback, to make it return promise
                if (!callback) {
                    return;
                }
                return function(err, res) {
                    if (err) {
                        if (ignore_errors && ignore_errors.indexOf(err.code) === -1) {
                            logDbRead.d('Error reading ' + collection + ' %j %s %j', data, err, err);
                            logDbRead.d('From connection %j', countlyDb._cly_debug);
                            if (e) {
                                logDbRead.e(e.stack);
                            }
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                };
            };

            //promise compatability
            var overwritePromise = function(obj, name, ignore_errors) {
                obj['_' + name] = obj[name];
                obj[name] = function(...args) {
                    var callback;
                    if (typeof args[args.length - 1] === 'function') {
                        callback = args[args.length - 1];
                        args.pop();
                    }

                    var e;
                    var at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbRead.d(name + ' ' + collection + ' %j' + at, args);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    return handlePromiseErrors(this['_' + name](...args), e, copyArguments(arguments, name), logForOps(callback, e, copyArguments(arguments, name), ignore_errors), ignore_errors);
                };
            };
            overwritePromise(ob, 'countDocuments');
            overwritePromise(ob, 'createIndex');
            overwritePromise(ob, 'createIndexes');
            overwritePromise(ob, 'distinct');
            overwritePromise(ob, 'drop', [26]);
            overwritePromise(ob, 'dropIndex');
            overwritePromise(ob, 'dropIndexes');
            overwritePromise(ob, 'estimatedDocumentCount');
            overwritePromise(ob, 'indexExists');
            overwritePromise(ob, 'indexInformation');
            overwritePromise(ob, 'indexes');
            overwritePromise(ob, 'isCapped');
            overwritePromise(ob, 'options');
            overwritePromise(ob, 'rename');

            var overwriteBulkPromise = function(obj, name) {
                obj['_' + name] = obj[name];
                obj[name] = function(...args) {
                    var e;
                    var at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbRead.d(name + ' ' + collection + ' %j' + at, args);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    var bulk = this['_' + name](...args);
                    bulk._execute = bulk.execute;
                    bulk.execute = function(options, callback) {
                        if (typeof options === 'function') {
                            callback = options;
                            options = {};
                        }
                        return handlePromiseErrors(bulk._execute(options), e, copyArguments(arguments, name), logForOps(callback, e, copyArguments(arguments, name)));
                    };
                    return bulk;
                };
            };

            overwriteBulkPromise(ob, 'initializeOrderedBulkOp');
            overwriteBulkPromise(ob, 'initializeUnorderedBulkOp');

            //backwards compatability

            ob._count = ob.count;
            ob.count = function(query, ...countArgs) {
                if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                    return ob.estimatedDocumentCount.call(ob, ...countArgs);
                }
                return ob.countDocuments.call(ob, query, ...countArgs);
            };
            ob.ensureIndex = ob.createIndex;

            ob.update = function(selector, document, options, callback) {
                if (options && typeof options === 'object' && options.multi) {
                    return ob.updateMany(selector, document, options, callback);
                }
                else {
                    return ob.updateOne(selector, document, options, callback);
                }
            };

            ob.remove = function(selector, options, callback) {
                if (options && typeof options === 'object' && options.single) {
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
                if (options && typeof options === 'object') {
                    if (options.new) {
                        options.returnDocument = 'after';
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

            ob._save = ob.save;
            ob.save = function(doc, options, callback) {
                if (doc._id) {
                    var selector = {'_id': doc._id};
                    delete doc._id;
                    options = options || {};
                    if (options && typeof options === 'object') {
                        options.upsert = true;
                        return ob.updateOne(selector, {'$set': doc}, options, callback);
                    }
                    else {
                        var myoptions = {'upsert': true};
                        return ob.updateOne(selector, {'$set': doc}, myoptions, options); //we have callback in options param
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
    }

    /**
    * Compute a deep diff of provided config against current config, keeping only new keys.
    * @param {object} current - current configuration object
    * @param {object} provided - updated configuration object
    * @returns {object} diff containing keys present in provided but missing in current
    */
    getObjectDiff(current, provided) {
        var toReturn = {};

        for (let i in provided) {
            if (typeof current[i] === 'undefined') {
                toReturn[i] = provided[i];
            }
            else if ((typeof provided[i]) === 'object' && provided[i] !== null) {
                var diff = this.getObjectDiff(current[i], provided[i]);
                if (Object.keys(diff).length > 0) {
                    toReturn[i] = diff;
                }
            }
        }
        return toReturn;
    }

    /**
    * Flatten nested objects into dot-notation keys for MongoDB updates.
    * @param {object} ob - object to flatten
    * @param {string} [prefix] - key prefix for recursion
    * @returns {object} flattened key/value map
    */
    flattenObject(ob, prefix) {
        if (prefix) {
            prefix += '.';
        }
        else {
            prefix = '';
        }
        var toReturn = {};

        for (let i in ob) {
            if (!Object.prototype.hasOwnProperty.call(ob, i)) {
                continue;
            }

            if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                var flatObject = this.flattenObject(ob[i]);
                for (let x in flatObject) {
                    if (!Object.prototype.hasOwnProperty.call(flatObject, x)) {
                        continue;
                    }

                    toReturn[prefix + i + '.' + x] = flatObject[x];
                }
            }
            else {
                if (!isNaN(ob[i]) && typeof (ob[i]) === 'number' && ob[i] > 2147483647) {
                    ob[i] = 2147483647;
                }
                toReturn[prefix + i] = ob[i];
            }
        }
        return toReturn;
    }

    /**
    * Register handler that allows external database clients to be attached to the common module.
    * @returns {void}
    */
    registerDatabaseHandler() {
        this.register('/database/register', (params) => {
            if (!params || !params.name || !params.client) {
                console.error('Invalid database registration: missing name or client');
                return;
            }

            try {
                const common = require('../api/utils/common.js');

                // Attach database client to common object using the provided name
                common[params.name] = params.client;
                console.log(`Database '${params.name}' (${params.type || 'unknown'}) registered with common object`);

                if (params.description) {
                    console.log(`  Description: ${params.description}`);
                }
            }
            catch (error) {
                console.error(`Failed to register database '${params.name}':`, error);
            }
        });
    }
}

module.exports = new pluginManager();
