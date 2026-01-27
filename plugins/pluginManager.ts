/**
 * @module "plugins/pluginManager"
 * This module handles communication with plugins
 */

import type { Db, MongoClient } from 'mongodb';
import type { CountlyAPIConfig, CountlyFrontendConfig } from '../types/config';
import type { LogModule, Logger } from '../types/log';
import type { DependencyMap as PluginDependencyMap } from '../types/pluginDependencies';


/** Init options for plugin manager */
interface InitOptions
 {
    filename?: string;
    skipDependencies?: boolean;
}

/** TTL Collection configuration */
interface TTLCollection {
    collection: string;
    db: Database | string;
    property: string;
    expireAfterSeconds: number;
}

/** Internal omit segments configuration */
interface InternalOmitSegments {
    [eventName: string]: string[];
}

/** Configuration object structure */
interface Config {
    [key: string]: any;
}

/** Plugin configuration with change handlers */
export interface ConfigWithOnChange {
    config: Config;
    onchange?: (current: Config, provided: Config) => void;
}

/** Event handler function */
interface EventHandler {
    (params: any): void | Promise<void>;
}

/** Event handlers registry */
interface EventsRegistry {
    [eventName: string]: EventHandler[];
}

/** Plugin API methods */
interface PluginApi {
    [methodName: string]: Function;
}

/** Plugins API collection */
interface PluginsApis {
    [pluginName: string]: PluginApi;
}

/** Database connection parameters */
export interface DbConnectionParams {
    [key: string]: string | number | boolean;
}

/** Database connection configuration */
export interface DatabaseConfig {
    mongodb?: string | {
        host?: string;
        port?: number;
        db?: string;
        username?: string;
        password?: string;
        max_pool_size?: number;
        ssl?: boolean;
        replSetServers?: string[] | string;
        replicaName?: string;
        dbOptions?: any;
        serverOptions?: any;
        [key: string]: any;
    };
    shared_connection?: boolean;
    [key: string]: any;
}

/** Database wrapper interface */
interface Database extends Db {
    collection: (name: string) => any;
    admin: () => any;
    close: () => void;
    ObjectID: (id?: string) => any;
    ObjectId: any;
    Binary: any;
    Long: any;
    _wrapped?: boolean;
    _cly_debug?: {
        db: string;
        connection: string;
        options: any;
    };
    encode?: (str: string) => string;
    decode?: (str: string) => string;
    onOpened?: (callback: () => void) => void;
    [key: string]: any;
}

/** Masking settings for an app */
export interface MaskingSettings {
    [eventName: string]: boolean | { [segmentKey: string]: boolean };
}

/** App and event information from hash */
export interface AppEventFromHash {
    appID: string;
    eventKey: string;
}

/** Event hashes for an app */
export interface EventHashes {
    [eventName: string]: string;
}

/** Plugin state object */
export interface PluginState {
    [pluginName: string]: boolean;
}

/** Plugin dependency information */
interface PluginDependency {
    dependencies?: string[];
    soft_dependencies?: string[];
    [key: string]: any;
}

/** Plugin dependency map */
export interface DependencyMap {
    [pluginName: string]: PluginDependency;
}

/** Configuration changes object */
interface ConfigChanges {
    [namespace: string]: {
        [key: string]: any;
    };
}

/** Promise results from Promise.allSettled equivalent */
interface PromiseResult<T> {
    status: 'fulfilled' | 'rejected';
    value?: T;
    reason?: any;
}

// ============================================================
// EXTERNAL DEPENDENCIES
// ============================================================

/** Plugin dependencies module for managing plugin load order */
interface PluginDependenciesModule {
    getFixedPluginList(pluginsList: string[] | PluginDependencyMap, options: { discoveryStrategy: string; overwrite: string }): string[];
    getDependencies(pluginNames: string[], options: Record<string, any>): Record<string, any>;
}

/** Utils module interface */
interface UtilsModule {
    encrypt(text: string, key?: string, iv?: string | Buffer, algorithm?: string, input_encoding?: string, output_encoding?: string): string;
    decrypt(crypted: string, key?: string, iv?: string | Buffer, algorithm?: string, input_encoding?: string, output_encoding?: string): string;
    [key: string]: any;
}

/** Config extender function type */
type ConfigExtenderFn = (mode: string, config: Record<string, any>, opts: Record<string, any>, over?: Record<string, any>) => Record<string, any>;

const pluginDependencies: PluginDependenciesModule = require('./pluginDependencies.js');
const path: typeof import('path') = require('path');
let plugins: string[] = pluginDependencies.getFixedPluginList(require('./plugins.json'), {
    'discoveryStrategy': 'disableChildren',
    'overwrite': path.resolve(__dirname, './plugins.json')
});
const pluginsApis: PluginsApis = {};
const mongodb: typeof import('mongodb') = require('mongodb');
const countlyConfig: CountlyFrontendConfig = require('../frontend/express/config');
const apiCountlyConfig: CountlyAPIConfig = require('../api/config');
const utils: UtilsModule = require('../api/utils/utils.js');
const fs: typeof import('fs') = require('fs');
const querystring: typeof import('querystring') = require('querystring');
const cp: typeof import('child_process') = require('child_process');
const async: any = require('async');
const _: any = require('underscore');
const crypto: typeof import('crypto') = require('crypto');
const BluebirdPromise: any = require('bluebird');
const log: LogModule = require('../api/utils/log.js');
const logDbRead: Logger = log('db:read');
const logDbWrite: Logger = log('db:write');
const logDriverDb: Logger = log('driver:db');
const exec: typeof cp.exec = cp.exec;
const spawn: typeof cp.spawn = cp.spawn;
const configextender: ConfigExtenderFn = require('../api/configextender');

// ============================================================
// INTERNAL INTERFACES (used within this module only)
// ============================================================

/** Type for MongoDB config */
interface MongoDbConfig {
    mongodb: string | {
        host?: string;
        port?: number;
        db?: string;
        username?: string;
        password?: string;
        max_pool_size?: number;
        replSetServers?: string[];
        replicaName?: string;
        dbOptions?: Record<string, any>;
        serverOptions?: Record<string, any>;
    };
    [key: string]: any;
}

let pluginConfig: Record<string, boolean> = {};

/** Bluebird inspection result interface */
interface BluebirdInspection<T> {
    isFulfilled(): boolean;
    value(): T;
    reason(): any;
}

/** Event registration wrapper */
interface EventRegistration {
    cb: EventHandler;
    name: string;
}

/** Plugin info structure */
interface PluginInfo {
    name: string;
    plugin: any;
}

/** Masking data structure */
interface MaskingData {
    apps?: Record<string, any>;
    hashMap?: Record<string, { a: string; e: string }>;
    isLoaded?: number;
}

/**
 * TODO: Remove this function and all it calls when moving to Node 12.
 * Normalize Bluebird's allSettled response to native Promise.allSettled shape.
 * @param bluebirdResults - Bluebird inspection results with isFulfilled(), value(), and reason() methods
 * @returns Native Promise.allSettled compatible settlement descriptors
 */
function promiseAllSettledBluebirdToStandard<T>(bluebirdResults: BluebirdInspection<T>[]): PromiseResult<T>[] {
    return bluebirdResults.map((bluebirdResult) => {
        const isFulfilled = bluebirdResult.isFulfilled();
        const status: 'fulfilled' | 'rejected' = isFulfilled ? 'fulfilled' : 'rejected';
        const value = isFulfilled ? bluebirdResult.value() : undefined;
        const reason = isFulfilled ? undefined : bluebirdResult.reason();
        return { status, value, reason };
    });
}

/**
 * Preserve numeric types when applying changes onto existing configs.
 * @param configsPointer - target config object that will be mutated
 * @param changes - incoming changes that may overwrite numbers
 */
function preventKillingNumberType(configsPointer: Record<string, any>, changes: Record<string, any>): void {
    for (const k in changes) {
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
}

/**
 * PluginManager class - Central orchestrator for Countly's plugin system
 */
class PluginManager {
    /** Event handlers registry */
    events: EventsRegistry = {};

    /** Loaded plugins and their frontend modules */
    plugs: PluginInfo[] = [];

    /** Cached sync method lookups */
    methodCache: Record<string, any[]> = {};

    /** Cached async method lookups */
    methodPromiseCache: Record<string, any[]> = {};

    /** Current plugin configurations */
    configs: Record<string, Config> = {};

    /** Default plugin configurations */
    defaultConfigs: Record<string, Config> = {};

    /** Configuration change callbacks */
    configsOnchanges: Record<string, (config: Config) => void> = {};

    /** Namespaces excluded from UI */
    excludeFromUI: Record<string, boolean> = { plugins: true };

    /** Indicates plugin sync state */
    finishedSyncing: boolean = true;

    /** Collections queued for TTL cleanup */
    expireList: string[] = [];

    /** Masking configuration container */
    masking: MaskingData = {};

    /** Map of all discovered plugins */
    fullPluginsMap: Record<string, boolean> = {};

    /** Core plugin list */
    coreList: string[] = ['api', 'core'];

    /** Dependency graph */
    dependencyMap: any = {};

    /** Registered app types */
    appTypes: string[] = [];

    /** Events prefixed with [CLY]_ that should be recorded in core as standard data model */
    internalEvents: string[] = [];

    /** Events prefixed with [CLY]_ that should be recorded in drill */
    internalDrillEvents: string[] = [
        '[CLY]_session_begin', '[CLY]_property_update', '[CLY]_session',
        '[CLY]_llm_interaction', '[CLY]_llm_interaction_feedback',
        '[CLY]_llm_tool_used', '[CLY]_llm_tool_usage_parameter'
    ];

    /** Segments for events prefixed with [CLY]_ that should be omitted */
    internalOmitSegments: InternalOmitSegments = {};

    /** Custom configuration files for different databases */
    dbConfigFiles: Record<string, string> = {
        countly_drill: './drill/config.js',
        countly_out: '../api/configs/config.db_out.js',
        countly_fs: '../api/configs/config.db_fs.js'
    };

    /** TTL collections to clean up periodically */
    ttlCollections: TTLCollection[] = [
        { 'db': 'countly' as any, 'collection': 'drill_data_cache', 'expireAfterSeconds': 600, 'property': 'lu' }
    ];

    /** Custom configuration files for different databases for docker env */
    dbConfigEnvs: Record<string, string> = {
        countly_drill: 'PLUGINDRILL',
        countly_out: 'PLUGINOUT',
        countly_fs: 'PLUGINFS'
    };

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    /**
     * Create plugin manager instance and register database handler.
     */
    constructor() {
        this.registerDatabaseHandler();
    }

    // ============================================================
    // CORE MANAGEMENT METHODS (1-10)
    // ============================================================

    /**
     * Build dependency graph for all plugin folders in this directory.
     */
    loadDependencyMap(): void {
        const pluginNames: string[] = [];
        const pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
        for (let z = 0; z < pluginsList.length; z++) {
            const p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
            if (p.isDirectory() || p.isSymbolicLink()) {
                pluginNames.push(pluginsList[z]);
            }
        }
        this.dependencyMap = pluginDependencies.getDependencies(pluginNames, {});
    }

    /**
     * Initialize api side plugins
     * @param options - load operations (filename to include, skip dependencies flag)
     */
    init(options?: InitOptions): void {
        options = options || {};
        const pluginNames: string[] = [];
        const pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
        for (let z = 0; z < pluginsList.length; z++) {
            const p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
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
                const filepath = path.resolve(__dirname, pluginNames[i] + '/api/' + (options.filename || 'api') + '.js');
                if (fs.existsSync(filepath)) {
                    const initConfigPath = path.resolve(__dirname, pluginNames[i] + '/api/init_configs.js');
                    if (fs.existsSync(initConfigPath)) {
                        require(initConfigPath);
                    }
                    pluginsApis[pluginNames[i]] = require(filepath);
                }
            }
            catch (ex: any) {
                console.log('Skipping plugin ' + pluginNames[i] + ' as we could not load it because of errors.');
                console.error(ex.stack);
                console.log('Saving this plugin as disabled in db');
            }
        }
    }

    /**
     * Update plugins state in database
     * @param db - database connection
     * @param params - request parameters
     * @param callback - callback function
     */
    updatePluginsInDb(db: Database, params: any, callback: () => void): void {
        try {
            params.qstring.plugin = JSON.parse(params.qstring.plugin);
        }
        catch (err) {
            console.log('Error parsing plugins');
        }

        if (params.qstring.plugin && typeof params.qstring.plugin === 'object') {
            const self = this;
            const before: Record<string, boolean> = {};
            const fordb: Record<string, boolean> = {};
            const arr = self.getPlugins();
            for (const i in params.qstring.plugin) {
                fordb['plugins.' + i] = params.qstring.plugin[i];
                if (arr.indexOf(i) === -1) {
                    before[i] = false;
                }
                else {
                    before[i] = true;
                }
            }
            db.collection('plugins').updateOne({ '_id': 'plugins' }, { '$set': fordb }, function(err1: any) {
                if (err1) {
                    console.error(err1);
                }
                else {
                    self.dispatch('/systemlogs', { params: params, action: 'change_plugins', data: { before: before, update: params.qstring.plugin } });
                    self.loadConfigs(db, function() {
                        callback();
                    });
                }
            });
        }
    }

    /**
     * Initialize a specific plugin
     * @param pluginName - Name of the plugin
     * @param filename - Filename to load (default: "api")
     */
    initPlugin(pluginName: string, filename?: string): void {
        try {
            filename = filename || 'api';
            const initConfigPath = path.resolve(__dirname, './' + pluginName + '/api/init_configs.js');
            if (fs.existsSync(initConfigPath)) {
                require(initConfigPath);
            }
            pluginsApis[pluginName] = require(path.resolve(__dirname, './' + pluginName + '/api/' + filename));
            this.fullPluginsMap[pluginName] = true;
        }
        catch (ex: any) {
            console.error(ex.stack);
        }
    }

    /**
     * Install missing plugins
     * @param db - database connection
     * @param callback - callback function
     */
    installMissingPlugins(db: Database, callback?: () => void): void {
        console.log('Checking if any plugins are missing');
        const self = this;
        const installPlugins: string[] = [];
        db.collection('plugins').findOne({ _id: 'plugins' }, function(err: any, res: any) {
            res = res || {};
            pluginConfig = res.plugins || {};
            const pluginNames: string[] = [];
            const pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
            for (let z = 0; z < pluginsList.length; z++) {
                const p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
                if (p.isDirectory() || p.isSymbolicLink()) {
                    pluginNames.push(pluginsList[z]);
                }
            }
            for (let zz = 0; zz < pluginNames.length; zz++) {
                if (typeof pluginConfig[pluginNames[zz]] === 'undefined') {
                    installPlugins.push(pluginNames[zz]);
                }
            }
            if (installPlugins.length > 0) {
                console.log('Plugins to install: ' + JSON.stringify(installPlugins));
            }
            BluebirdPromise.each(installPlugins, function(name: string) {
                return new Promise(function(resolve: (value?: unknown) => void) {
                    const obb: { name: string; enable?: boolean } = { 'name': name };
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
            }).catch(function(rejection: any) {
                console.log(rejection);
                if (callback) {
                    callback();
                }
            });
        });
    }

    /**
     * Reload the list of enabled plugins
     * @param db - database connection
     * @param callback - callback function
     */
    reloadEnabledPluginList(db: Database, callback?: () => void): void {
        const self = this;
        this.loadDependencyMap();
        db.collection('plugins').findOne({ _id: 'plugins' }, function(err: any, res: any) {
            if (err) {
                console.log(err);
            }
            res = res || {};
            if (Object.keys(self.fullPluginsMap).length > 0) {
                for (const pp in res.plugins) {
                    if (!self.fullPluginsMap[pp]) {
                        delete res.plugins[pp];
                    }
                }
            }
            pluginConfig = res.plugins || {};
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Load configurations from database
     * @param db - database connection
     * @param callback - callback function
     */
    loadConfigs(db: Database, callback?: () => void): void {
        const self = this;
        db.collection('plugins').findOne({ _id: 'plugins' }, function(err: any, res: any) {
            if (err) {
                console.log(err);
            }
            const pluginNames: string[] = [];
            const pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
            for (let z = 0; z < pluginsList.length; z++) {
                const p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
                if (p.isDirectory() || p.isSymbolicLink()) {
                    pluginNames.push(pluginsList[z]);
                }
            }

            for (let i = 0, l = pluginNames.length; i < l; i++) {
                self.fullPluginsMap[pluginNames[i]] = true;
            }
            if (!err) {
                res = res || {};
                for (const ns in self.configsOnchanges) {
                    if (self.configs && res && (!self.configs[ns] || !res[ns] || !_.isEqual(self.configs[ns], res[ns]))) {
                        self.configs[ns] = res[ns];
                        self.configsOnchanges[ns](self.configs[ns]);
                    }
                }
                self.configs = res;
                delete self.configs._id;
                pluginConfig = res.plugins || {};
                self.checkConfigs(db, self.configs, self.defaultConfigs, function() {
                    const installPlugins: string[] = [];
                    for (let z1 = 0; z1 < plugins.length; z1++) {
                        if (typeof pluginConfig[plugins[z1]] === 'undefined') {
                            pluginConfig[plugins[z1]] = true;
                        }
                    }
                    BluebirdPromise.each(installPlugins, function(name: string) {
                        return new Promise(function(resolve: (value?: unknown) => void) {
                            self.processPluginInstall(db, name, function() {
                                resolve();
                            });
                        });
                    }).then(function() {
                        if (callback) {
                            callback();
                        }
                    }).catch(function(rejection: any) {
                        console.log(rejection);
                        if (callback) {
                            callback();
                        }
                    });

                    if (self.getConfig('data-manager').enableDataMasking) {
                        self.fetchMaskingConf({ 'db': db });
                    }
                });
            }
            else if (callback) {
                callback();
            }
        });
    }

    /**
     * Load configuration for ingestor process and ensure defaults are stored
     * @param db - database connection
     * @param callback - callback function
     */
    async loadConfigsIngestor(db: Database, callback: () => void): Promise<void> {
        try {
            let res = await db.collection('plugins').findOne(
                { _id: 'plugins' },
                { 'api': true, 'plugins': true, 'drill': true, 'aggregator': true }
            );
            res = res || {};
            delete res._id;
            this.configs = res || {};
            pluginConfig = res.plugins || {};

            const diff = this.getObjectDiff(res, this.defaultConfigs);
            if (Object.keys(diff).length > 0) {
                const res2 = await db.collection('plugins').findOneAndUpdate(
                    { _id: 'plugins' },
                    { $set: this.flattenObject(diff) },
                    { upsert: true, new: true } as any
                );
                if (res2) {
                    for (const i in diff) {
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
     * @param namespace - namespace of configuration, usually plugin name
     * @param conf - object with key/values default configurations
     * @param exclude - should these configurations be excluded from dashboard UI
     * @param onchange - function to call when configurations change
     */
    setConfigs(namespace: string, conf: Config, exclude?: boolean, onchange?: (config: Config) => void): void {
        const processedConf: Config = {};
        for (const key in conf) {
            if (!Object.prototype.hasOwnProperty.call(conf, key)) {
                continue;
            }
            const envVarName = 'COUNTLY_SETTINGS__' + namespace.toUpperCase() + '__' + key.toUpperCase();
            if (process.env[envVarName] !== undefined) {
                const envValue = process.env[envVarName]!;
                try {
                    processedConf[key] = JSON.parse(envValue);
                }
                catch (e) {
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
            for (const i in processedConf) {
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
     * @param collection - collection name
     */
    addCollectionToExpireList(collection: string): void {
        this.expireList.push(collection);
    }

    // ============================================================
    // CONFIGURATION METHODS (11-22)
    // ============================================================

    /**
     * Get expire list array
     * @returns expireList array that created from plugins
     */
    getExpireList(): string[] {
        return this.expireList;
    }

    /**
     * Set user level default configurations
     * @param namespace - namespace of configuration, usually plugin name
     * @param conf - object with key/values default configurations
     */
    setUserConfigs(namespace: string, conf: Config): void {
        if (!this.defaultConfigs[namespace]) {
            this.defaultConfigs[namespace] = {};
        }
        if (!this.defaultConfigs[namespace]._user) {
            this.defaultConfigs[namespace]._user = {};
        }
        for (const i in conf) {
            this.defaultConfigs[namespace]._user[i] = conf[i];
        }
    }

    /**
     * Get configuration from specific namespace and populate empty values with provided defaults
     * @param namespace - namespace of configuration, usually plugin name
     * @param userSettings - possible other level configuration like user or app level to overwrite configs
     * @param override - if true, would simply override configs with userSettings, if false, would check if configs should be overridden
     * @returns copy of configs for provided namespace
     */
    getConfig(namespace: string, userSettings?: Record<string, any>, override?: boolean): Config {
        const ob: Config = {};
        if (this.configs[namespace]) {
            for (const i in this.configs[namespace]) {
                if (i === '_user') {
                    ob[i] = {};
                    for (const j in this.configs[namespace][i]) {
                        ob[i][j] = this.configs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = this.configs[namespace][i];
                }
            }
        }
        else if (this.defaultConfigs[namespace]) {
            for (const i in this.defaultConfigs[namespace]) {
                if (i === '_user') {
                    ob[i] = {};
                    for (const j in this.defaultConfigs[namespace][i]) {
                        ob[i][j] = this.defaultConfigs[namespace][i][j];
                    }
                }
                else {
                    ob[i] = this.defaultConfigs[namespace][i];
                }
            }
        }

        if (override && userSettings && userSettings[namespace]) {
            for (const i in userSettings[namespace]) {
                ob[i] = userSettings[namespace][i];
            }
        }
        else if (!override) {
            if (userSettings && userSettings[namespace] && ob._user) {
                for (const i in ob._user) {
                    if (ob._user[i]) {
                        ob[i] = userSettings[namespace][i];
                    }
                }
            }
        }
        return ob;
    }

    /**
     * Get all configs for all namespaces
     * @returns copy of all configs
     */
    getAllConfigs(): Record<string, Config> {
        const a = Object.keys(this.configs);
        const b = Object.keys(this.defaultConfigs);
        const c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        const ret: Record<string, Config> = {};
        for (let i = 0; i < c.length; i++) {
            if (!this.excludeFromUI[c[i]] && (plugins.indexOf(c[i]) === -1 || pluginConfig[c[i]])) {
                ret[c[i]] = this.getConfig(c[i]);
            }
        }
        return ret;
    }

    /**
     * Get all configs for all namespaces overwritted by user settings
     * @param userSettings - possible other level configuration like user or app level to overwrite configs
     * @returns user configurations
     */
    getUserConfigs(userSettings?: Record<string, any>): Record<string, Config> {
        userSettings = userSettings || {};
        const a = Object.keys(this.configs);
        const b = Object.keys(this.defaultConfigs);
        const c = a.concat(b.filter(function(item) {
            return a.indexOf(item) < 0;
        }));
        const ret: Record<string, Config> = {};
        for (let i = 0; i < c.length; i++) {
            if (!this.excludeFromUI[c[i]]) {
                const conf = this.getConfig(c[i], userSettings);
                for (const name in conf) {
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
     * Check if there are changes in configs and store the changes
     * @param db - database connection for countly db
     * @param current - current configs we have
     * @param provided - provided configs
     * @param callback - function to call when checking finished
     */
    checkConfigs(db: Database, current: Config, provided: Config, callback?: () => void): void {
        const diff = this.getObjectDiff(current, provided);
        if (Object.keys(diff).length > 0) {
            db.collection('plugins').findAndModify(
                { _id: 'plugins' },
                {},
                { $set: this.flattenObject(diff) },
                { upsert: true, new: true },
                function(err: any, res: any) {
                    if (!err && res && res.value) {
                        for (const i in diff) {
                            if (res.value[i]) {
                                current[i] = res.value[i];
                            }
                        }
                    }
                    if (callback) {
                        callback();
                    }
                }
            );
        }
        else if (callback) {
            callback();
        }
    }

    /**
     * Update existing configs, when syncing between servers
     * @param db - database connection for countly db
     * @param namespace - namespace of configuration, usually plugin name
     * @param conf - provided config
     * @param callback - function to call when updating finished
     */
    updateConfigs(db: Database, namespace: string, conf: Config, callback?: () => void): void {
        const update: Record<string, Config> = {};
        if (namespace === '_id') {
            if (callback) {
                callback();
            }
        }
        else {
            update[namespace] = conf;
            db.collection('plugins').update(
                { _id: 'plugins' },
                { $set: this.flattenObject(update) },
                { upsert: true },
                function(err: any) {
                    if (err) {
                        console.log(err);
                    }
                    if (callback) {
                        callback();
                    }
                }
            );
        }
    }

    /**
     * Update existing application level configuration
     * @param db - database connection for countly db
     * @param appId - id of application
     * @param namespace - name of plugin
     * @param config - new configuration object for selected plugin
     * @param callback - function that is called when updating has finished
     */
    updateApplicationConfigs(db: Database, appId: string, namespace: string, config: Config, callback?: (error: any, result: any) => void): void {
        const pluginName = 'plugins.'.concat(namespace);
        db.collection('apps').updateOne(
            { _id: appId },
            { $set: { [pluginName]: config } },
            function(error: any, result: any) {
                if (error) {
                    logDbWrite.e('Error updating application level %s plugin configuration.Got error:%j', namespace, error);
                }
                if (callback) {
                    if (error) {
                        callback(error, null);
                    }
                    else {
                        callback(null, result);
                    }
                }
            }
        );
    }

    /**
     * Update all configs with provided changes
     * @param db - database connection for countly db
     * @param changes - provided changes
     * @param callback - function to call when updating finished
     */
    updateAllConfigs(db: Database, changes: ConfigChanges, callback?: () => void): void {
        if (changes.api) {
            if (changes.api.country_data) {
                if (changes.api.country_data === false && this.configs.api.city_data === true) {
                    changes.api.city_data = false;
                }
            }
            if (changes.api.city_data) {
                if (changes.api.city_data === true && this.configs.api.country_data === false) {
                    changes.api.country_data = true;
                }
            }
        }
        for (const k in changes) {
            preventKillingNumberType(this.configs[k], changes[k]);
            _.extend(this.configs[k], changes[k]);
            if (k in this.configsOnchanges) {
                this.configsOnchanges[k](this.configs[k]);
            }
        }
        db.collection('plugins').update(
            { _id: 'plugins' },
            { $set: this.flattenObject(this.configs) },
            { upsert: true },
            function() {
                if (callback) {
                    callback();
                }
            }
        );
    }

    /**
     * Update user configs with provided changes
     * @param db - database connection for countly db
     * @param changes - provided changes
     * @param user_id - user for which to update settings
     * @param callback - function to call when updating finished
     */
    updateUserConfigs(db: Database, changes: ConfigChanges, user_id: string, callback?: () => void): void {
        const self = this;
        db.collection('members').findOne({ _id: db.ObjectID(user_id) }, function(err: any, member: any) {
            const update: Record<string, any> = {};
            for (const k in changes) {
                update[k] = {};
                _.extend(update[k], self.configs[k], changes[k]);
                if (member.settings && member.settings[k]) {
                    _.extend(update[k], member.settings[k], changes[k]);
                }
            }
            db.collection('members').update(
                { _id: db.ObjectID(user_id) },
                { $set: self.flattenObject(update, 'settings') },
                { upsert: true },
                function() {
                    if (callback) {
                        callback();
                    }
                }
            );
        });
    }

    /**
     * Allow extending object module by using extend folders
     * @param name - module name
     * @param object - object to extend
     */
    extendModule(name: string, object: any): void {
        for (let i = 0, l = plugins.length; i < l; i++) {
            try {
                require('./' + plugins[i] + '/extend/' + name)(object);
            }
            catch (ex: any) {
                if (!ex.code || ex.code !== 'MODULE_NOT_FOUND') {
                    console.log(ex);
                }
            }
        }
        try {
            require('../extend/' + name)(object);
        }
        catch (ex: any) {
            if (!ex.code || ex.code !== 'MODULE_NOT_FOUND') {
                console.log(ex);
            }
        }
    }

    /**
     * Check whether a plugin is enabled (core plugins are always on).
     * @param name - plugin name
     * @returns true if plugin is active
     */
    isPluginOn(name: string): boolean {
        if (this.coreList.indexOf(name) === -1) {
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

    // ============================================================
    // EVENT SYSTEM METHODS (23-28)
    // ============================================================

    /**
     * Infer the calling plugin name from the call stack (fallbacks to undefined).
     * @returns feature/plugin name if detected
     */
    getFeatureName(): string | undefined {
        const stack = new Error('test').stack;
        if (stack) {
            const lines = stack.split('\n');
            if (lines && lines[3]) {
                const line = lines[3];
                const parts = line.split('/');
                for (let z = 0; z < parts.length - 3; z++) {
                    if (parts[z] === 'plugins') {
                        return parts[z + 1];
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Register listening to new event on api side
     * @param event - event to listen to
     * @param callback - function to call, when event happens
     * @param unshift - whether to register a high-priority callback (unshift it to the listeners array)
     * @param featureName - name of plugin
     */
    register(event: string, callback: EventHandler, unshift: boolean = false, featureName?: string): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        if (!featureName) {
            featureName = this.getFeatureName();
            featureName = featureName || 'core';
        }
        const registration: EventRegistration = { 'cb': callback, 'name': featureName };
        if (unshift) {
            (this.events[event] as any).unshift(registration);
        }
        else {
            (this.events[event] as any).push(registration);
        }
    }

    /**
     * Dispatch specific event on api side
     * @param event - event to dispatch
     * @param params - object with parameters to pass to event
     * @param callback - function to call, when all event handlers that return Promise finished processing
     * @returns true if any one responded to event
     */
    dispatch(event: string, params: any, callback?: (err: any, results?: PromiseResult<any>[]) => void): boolean {
        let used = false;
        const promises: any[] = [];
        let promise: any;
        if (this.events[event]) {
            try {
                const eventHandlers = this.events[event] as any as EventRegistration[];
                for (let i = 0, l = eventHandlers.length; i < l; i++) {
                    let isEnabled = true;
                    if (this.fullPluginsMap[eventHandlers[i].name] && pluginConfig[eventHandlers[i].name] === false) {
                        isEnabled = false;
                    }

                    if (eventHandlers[i] && typeof eventHandlers[i].cb === 'function' && isEnabled) {
                        try {
                            promise = eventHandlers[i].cb.call(null, params);
                        }
                        catch (error: any) {
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
            catch (ex: any) {
                console.error(ex.stack);
            }

            if (params && params.params && params.params.promises) {
                params.params.promises.push(new Promise(function(resolve: (value?: unknown) => void) {
                    BluebirdPromise.allSettled(promises).then(function(results: BluebirdInspection<any>[]) {
                        resolve();
                        if (callback) {
                            callback(null, promiseAllSettledBluebirdToStandard(results));
                        }
                    });
                }));
            }
            else if (callback) {
                BluebirdPromise.allSettled(promises).then(function(results: BluebirdInspection<any>[]) {
                    callback(null, promiseAllSettledBluebirdToStandard(results));
                });
            }
        }
        else if (callback) {
            callback(null);
        }
        return used;
    }

    /**
     * Get a deep-cloned snapshot of the current event registry.
     * @returns cloned events registry
     */
    returnEventsCopy(): EventsRegistry {
        return JSON.parse(JSON.stringify(this.events));
    }

    /**
     * Dispatch specific event on api side and wait until all event handlers have processed the event (legacy)
     * @param event - event to dispatch
     * @param params - object with parameters to pass to event
     * @param callback - function to call, when all event handlers that return Promise finished processing
     * @returns true if any one responded to event
     */
    dispatchAllSettled(event: string, params: any, callback?: (err: any, results?: PromiseResult<any>[]) => void): boolean {
        return this.dispatch(event, params, callback);
    }

    /**
     * Dispatch specific event on api side
     * @param event - event to dispatch
     * @param params - object with parameters to pass to event
     * @returns Promise which resolves to array of objects returned by events if any or error
     */
    dispatchAsPromise(event: string, params: any): Promise<PromiseResult<any>[]> {
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
     * @param app - express app
     * @param countlyDb - connection to countly database
     * @param express - reference to express js
     */
    loadAppStatic(app: any, countlyDb: Database, express: any): void {
        const pluginNames: string[] = [];
        const pluginsList = fs.readdirSync(path.resolve(__dirname, './'));
        for (let z = 0; z < pluginsList.length; z++) {
            const p = fs.lstatSync(path.resolve(__dirname, './' + pluginsList[z]));
            if (p.isDirectory() || p.isSymbolicLink()) {
                pluginNames.push(pluginsList[z]);
            }
        }

        for (let i = 0, l = pluginNames.length; i < l; i++) {
            try {
                const initConfigPath = path.resolve(__dirname, pluginNames[i] + '/api/init_configs.js');
                if (fs.existsSync(initConfigPath)) {
                    require(initConfigPath);
                }
                const appPath = path.resolve(__dirname, pluginNames[i] + '/frontend/app.js');
                let plugin: any;
                if (fs.existsSync(appPath)) {
                    plugin = require(appPath);
                    this.plugs.push({ 'name': pluginNames[i], 'plugin': plugin });
                    app.use(countlyConfig.path + '/' + pluginNames[i], express.static(__dirname + '/' + pluginNames[i] + '/frontend/public', { maxAge: 31557600000 }));
                    if (plugin.staticPaths) {
                        plugin.staticPaths(app, countlyDb, express);
                    }
                }
                else {
                    app.use(countlyConfig.path + '/' + pluginNames[i], express.static(__dirname + '/' + pluginNames[i] + '/frontend/public', { maxAge: 31557600000 }));
                }
            }
            catch (ex: any) {
                console.log('skipping plugin because of errors:' + pluginNames[i]);
                console.error(ex.stack);
            }
        }
    }

    /**
     * Call init method of plugin's frontend app.js modules
     * @param app - express app
     * @param countlyDb - connection to countly database
     * @param express - reference to express js
     */
    loadAppPlugins(app: any, countlyDb: Database, express: any): void {
        for (let i = 0; i < this.plugs.length; i++) {
            try {
                if (this.plugs[i] && this.plugs[i].plugin && this.plugs[i].plugin.init && typeof this.plugs[i].plugin.init === 'function') {
                    this.plugs[i].plugin.init({
                        name: this.plugs[i].name,
                        get: function(this: { name: string }, pathTo: string, callback?: (req: any, res: any, next: any) => void) {
                            const pluginName = this.name;
                            if (!callback) {
                                app.get(pathTo);
                            }
                            else {
                                app.get(pathTo, function(req: any, res: any, next: any) {
                                    if (pluginConfig[pluginName]) {
                                        callback(req, res, next);
                                    }
                                    else {
                                        next();
                                    }
                                });
                            }
                        },
                        post: function(this: { name: string }, pathTo: string, callback: (req: any, res: any, next: any) => void) {
                            const pluginName = this.name;
                            app.post(pathTo, function(req: any, res: any, next: any) {
                                if (pluginConfig[pluginName] && callback && typeof callback === 'function') {
                                    callback(req, res, next);
                                }
                                else {
                                    next();
                                }
                            });
                        },
                        use: function(this: { name: string }, pathTo: string | ((req: any, res: any, next: any) => void), callback?: (req: any, res: any, next: any) => void) {
                            if (!callback) {
                                callback = pathTo as (req: any, res: any, next: any) => void;
                                pathTo = '/';
                            }

                            const pluginName = this.name;
                            app.use(pathTo, function(req: any, res: any, next: any) {
                                if (pluginConfig[pluginName] && callback && typeof callback === 'function') {
                                    callback(req, res, next);
                                }
                                else {
                                    next();
                                }
                            });
                        },
                        all: function(this: { name: string }, pathTo: string | ((req: any, res: any, next: any) => void), callback?: (req: any, res: any, next: any) => void) {
                            if (!callback) {
                                callback = pathTo as (req: any, res: any, next: any) => void;
                                pathTo = '/';
                            }

                            const pluginName = this.name;
                            app.all(pathTo, function(req: any, res: any, next: any) {
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
            catch (ex: any) {
                console.error(ex.stack);
            }
        }
    }

    /**
     * Call specific predefined methods of plugin's frontend app.js modules
     * @param method - method name
     * @param params - parameters object
     * @returns true if method was called
     */
    callMethod(method: string, params: any): boolean {
        let res = false;
        if (this.methodCache[method]) {
            if (this.methodCache[method].length > 0) {
                for (let i = 0; i < this.methodCache[method].length; i++) {
                    try {
                        if (this.methodCache[method][i][method](params)) {
                            res = true;
                        }
                    }
                    catch (ex: any) {
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
                catch (ex: any) {
                    console.error(ex.stack);
                }
            }
        }
        return res;
    }

    /**
     * Call async methods that return promises and merge results
     * @param method - method name
     * @param params - parameters object
     * @returns Promise with merged results
     */
    async callPromisedAppMethod(method: string, params: any): Promise<Record<string, any>> {
        const promises: Promise<any>[] = [];
        if (this.methodPromiseCache[method]) {
            if (this.methodPromiseCache[method].length > 0) {
                for (let i = 0; i < this.methodPromiseCache[method].length; i++) {
                    try {
                        const ret = this.methodPromiseCache[method][i][method](params);
                        if (ret) {
                            promises.push(ret);
                        }
                    }
                    catch (ex: any) {
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
                        const ret = this.plugs[i].plugin[method](params);
                        if (ret) {
                            promises.push(ret);
                        }
                    }
                }
                catch (ex: any) {
                    console.error(ex.stack);
                }
            }
        }
        const results = await Promise.all(promises);
        return results.reduce((acc: Record<string, any>, v: any) => {
            if (v) {
                for (const k in v) {
                    acc[k] = acc[k] || v[k];
                }
            }
            return acc;
        }, {});
    }

    /**
     * Reorder a plugin list based on their dependency graph (dependencies loaded first).
     * @param plugs_list - list of plugin names
     * @returns reordered plugin list
     */
    fixOrderBasedOnDependency(plugs_list: string[]): string[] {
        const self = this;
        const map0: Record<string, boolean> = {};
        const new_list: string[] = [];
        for (let z = 0; z < plugs_list.length; z++) {
            map0[plugs_list[z]] = true;
        }

        function add_Me(this: PluginManager, pluginName: string): void {
            if (self.dependencyMap) {
                if (self.dependencyMap && self.dependencyMap.dpcs && self.dependencyMap.dpcs[pluginName] && self.dependencyMap.dpcs[pluginName].up) {
                    for (let z1 = 0; z1 < self.dependencyMap.dpcs[pluginName].up.length; z1++) {
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

        for (const plugname in map0) {
            add_Me.call(this, plugname);
        }
        return new_list;
    }

    /**
     * Get list of plugins based on whether they are enabled.
     * @param returnFullList - pass true to include disabled plugins
     * @returns enabled (or all) plugin names
     */
    getPlugins(returnFullList?: boolean): string[] {
        const list: string[] = [];
        if (returnFullList) {
            for (const key2 in this.fullPluginsMap) {
                list.push(key2);
            }
            if (pluginConfig && Object.keys(pluginConfig).length > 0) {
                for (const key0 in pluginConfig) {
                    if (!this.fullPluginsMap[key0]) {
                        list.push(key0);
                    }
                }
            }
            else {
                for (let kk = 0; kk < plugins.length; kk++) {
                    if (!this.fullPluginsMap[plugins[kk]]) {
                        list.push(plugins[kk]);
                    }
                }
            }
            return this.fixOrderBasedOnDependency(list);
        }
        else {
            if (pluginConfig && Object.keys(pluginConfig).length > 0) {
                for (const key in pluginConfig) {
                    if (pluginConfig[key]) {
                        list.push(key);
                    }
                }
            }

            for (let k = 0; k < plugins.length; k++) {
                if (typeof pluginConfig[plugins[k]] === 'undefined') {
                    list.push(plugins[k]);
                }
            }

            return this.fixOrderBasedOnDependency(list);
        }
    }

    /**
     * Get the pluginsApis map.
     * @returns map of plugin names to API modules
     */
    getPluginsApis(): PluginsApis {
        return pluginsApis;
    }

    /**
     * Set a custom API function for a plugin.
     * @param plugin - plugin name
     * @param name - API function name
     * @param func - function to set
     * @returns the set function
     */
    setPluginApi(plugin: string, name: string, func: (...args: any[]) => any): (...args: any[]) => any {
        return pluginsApis[plugin][name] = func;
    }

    /**
     * Reload the plugins.json file.
     */
    reloadPlugins(): void {
        const pluginsJsonPath = path.resolve(__dirname, './plugins.json');
        delete require.cache[pluginsJsonPath];
        plugins = pluginDependencies.getFixedPluginList(require('./plugins.json'), {
            'discoveryStrategy': 'disableChildren',
            'overwrite': pluginsJsonPath
        });
    }

    /**
     * Check whether a specific plugin is currently enabled.
     * @param plugin - plugin name
     * @returns true if plugin is enabled
     */
    isPluginEnabled(plugin: string): boolean {
        const enabledPlugins = this.getPlugins();
        if (this.coreList.indexOf(plugin) === -1 && enabledPlugins.indexOf(plugin) === -1) {
            return false;
        }
        return true;
    }

    /**
     * Called by master process: connects to DB, reloads config, and triggers sync check.
     */
    checkPluginsMaster(): void {
        const self = this;
        if (this.finishedSyncing) {
            this.finishedSyncing = false;
            (self.dbConnection() as Promise<Database>).then((db: Database) => {
                db.collection('plugins').findOne({ _id: 'plugins' }, function(err: any, res: any) {
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
     * Marks the plugin manager as busy syncing.
     */
    startSyncing(): void {
        this.finishedSyncing = false;
    }

    /**
     * Marks the plugin manager as finished syncing.
     */
    stopSyncing(): void {
        this.finishedSyncing = true;
    }

    /**
     * We check plugins and sync configuration
     * @param db - connection to countly database
     * @param callback - when finished checking and syncing
     */
    checkPlugins(db: Database, callback?: () => void): void {
        const plugConf = this.getConfig('plugins');

        if (Object.keys(plugConf).length === 0) {
            const list = this.getPlugins();
            for (let i = 0; i < list.length; i++) {
                plugConf[list[i]] = true;
            }
            this.updateConfigs(db, 'plugins', plugConf, callback);
        }
        else {
            const pluginList = this.getPlugins();
            let changes = 0;

            for (const plugin in plugConf) {
                const state = plugConf[plugin];
                const index = pluginList.indexOf(plugin);
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
                this.syncPlugins(plugConf, callback);
            }
            else if (callback) {
                callback();
            }
        }
    }

    /**
     * Sync enable/disable plugin state to disk and potentially trigger a restart.
     * @param pluginState - object with plugin names as keys, enabled state as value
     * @param callback - function called on completion
     * @param db - optional database connection
     */
    syncPlugins(pluginState: Record<string, boolean>, callback?: (err?: boolean) => void, db?: Database): void {
        const self = this;
        const dir = path.resolve(__dirname, './plugins.json');
        const pluginList = this.getPlugins().slice();
        const newPluginsList = pluginList.slice();
        let changes = 0;
        async.each(Object.keys(pluginState), function(plugin: string, done: () => void) {
            const state = pluginState[plugin];
            const index = pluginList.indexOf(plugin);
            if (index !== -1 && !state) {
                self.uninstallPlugin(plugin, function(err: any) {
                    if (!err) {
                        changes++;
                        newPluginsList.splice(newPluginsList.indexOf(plugin), 1);
                        plugins.splice(plugins.indexOf(plugin), 1);
                    }
                    done();
                });
            }
            else if (index === -1 && state) {
                self.installPlugin(plugin, function(err: any) {
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
        }, function(error: any) {
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
                    async.series([(cb: (err?: Error | null) => void) => fs.writeFile(dir, JSON.stringify(newPluginsList), 'utf8', cb), self.prepareProduction.bind(self)], function(err: any) {
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
     * @param db - database connection
     * @param name - plugin name or object with name and enable properties
     * @param callback - callback function
     */
    processPluginInstall(db: Database, name: string | { name: string; enable?: boolean }, callback?: () => void): void {
        const self = this;
        let should_enable = true;
        let pluginName: string;
        if (typeof name !== 'string' && name.name) {
            if (name.enable === false || name.enable === true) {
                should_enable = name.enable;
            }
            pluginName = name.name;
        }
        else {
            pluginName = name as string;
        }
        db.collection('plugins').remove({ '_id': 'install_' + pluginName, 'time': { '$lt': Date.now() - 60 * 1000 * 60 } }, function(err: any) {
            if (err) {
                console.log(err);
                if (callback) {
                    callback();
                }
            }
            else {
                db.collection('plugins').insert({ '_id': 'install_' + pluginName, 'time': Date.now() }, { ignore_errors: [11000] }, function(err2: any) {
                    if (err2) {
                        if (err2.code && err2.code !== 11000) {
                            console.log(err2);
                        }
                        if (callback) {
                            callback();
                        }
                    }
                    else {
                        self.installPlugin(pluginName, function(errors: any) {
                            if (!errors) {
                                console.log('Install is finished fine. Updating state in database');
                                const query: Record<string, any> = { _id: 'plugins' };
                                query['plugins.' + pluginName] = { '$ne': !should_enable };
                                const update: Record<string, any> = {};
                                update['plugins.' + pluginName] = should_enable;
                                db.collection('plugins').update(query, { '$set': update }, { upsert: true }, function(err3: any, res: any) {
                                    console.log('plugins document updated');
                                    if (err3) {
                                        console.log(err3);
                                    }
                                    console.log(JSON.stringify(res));
                                    if (callback) {
                                        callback();
                                    }
                                    db.collection('plugins').remove({ '_id': 'install_' + pluginName }, function(err5: any) {
                                        if (err5) {
                                            console.log(err5);
                                        }
                                    });
                                });
                            }
                            else {
                                console.log('Install is finished with errors');
                                console.log(JSON.stringify(errors));
                                if (callback) {
                                    callback();
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * Procedure to install plugin
     * @param plugin - plugin name
     * @param callback - when finished installing plugin
     */
    installPlugin(plugin: string, callback?: (errors?: boolean) => void): void {
        const self = this;
        console.log('Installing plugin %j...', plugin);
        callback = callback || function() {};
        let errors: boolean = false;

        (new Promise(function(resolve: (value: boolean) => void) {
            const eplugin = (global as any).enclose ? (global as any).enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return resolve(errors);
            }
            const cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            if (process && process.env && process.env.COUNTLY_CONTAINER && !process.env.FORCE_NPM_INSTALL) {
                console.log('Skipping on docker');
                resolve(errors);
            }
            else if (!self.getConfig('api').offline_mode) {
                const args = ['install'];
                if (apiCountlyConfig.symlinked === true) {
                    args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
                }
                const cmd = spawn('npm', args, { cwd: cwd });
                let error2 = '';

                cmd.stdout.on('data', (data: Buffer) => {
                    console.log(`${data}`);
                });

                cmd.stderr.on('data', (data: Buffer) => {
                    error2 += data;
                });

                cmd.on('error', function(error: Error) {
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
        }) as globalThis.Promise<boolean>).then(function(result: boolean) {
            const scriptPath = path.join(__dirname, plugin, 'install.js');
            const args = [scriptPath];
            if (apiCountlyConfig.symlinked === true) {
                args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
            }
            const m = cp.spawn('nodejs', args);
            m.stdout.on('data', (data: Buffer) => {
                console.log(data.toString());
            });

            m.stderr.on('data', (data: Buffer) => {
                console.log(data.toString());
            });

            m.on('close', (code: number | null) => {
                console.log('Done installing plugin %j', code);
                if (parseInt(String(code), 10) !== 0) {
                    errors = true;
                }
                if (callback) {
                    callback(errors || result);
                }
            });
        });
    }

    /**
     * Procedure to upgrade plugin
     * @param plugin - plugin name
     * @param callback - when finished upgrading plugin
     */
    upgradePlugin(plugin: string, callback?: (errors?: boolean) => void): void {
        const self = this;
        console.log('Upgrading plugin %j...', plugin);
        callback = callback || function() {};
        let errors: boolean = false;

        (new Promise(function(resolve: (value: boolean) => void) {
            const eplugin = (global as any).enclose ? (global as any).enclose.plugins[plugin] : null;
            if (eplugin && eplugin.prepackaged) {
                return resolve(errors);
            }
            const cwd = eplugin ? eplugin.rfs : path.join(__dirname, plugin);
            if (!self.getConfig('api').offline_mode) {
                const cmd = spawn('sudo', ['npm', 'install', '--unsafe-perm'], { cwd: cwd });
                let error2 = '';

                cmd.stdout.on('data', (data: Buffer) => {
                    console.log(`${data}`);
                });

                cmd.stderr.on('data', (data: Buffer) => {
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
        }) as globalThis.Promise<boolean>).then(function(result: boolean) {
            const scriptPath = path.join(__dirname, plugin, 'install.js');
            const args = [scriptPath];
            if (apiCountlyConfig.symlinked === true) {
                args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
            }
            const m = cp.spawn('nodejs', args);

            m.stdout.on('data', (data: Buffer) => {
                console.log(data.toString());
            });

            m.stderr.on('data', (data: Buffer) => {
                console.log(data.toString());
            });

            m.on('close', (code: number | null) => {
                console.log('Done upgrading plugin %j', code);
                if (parseInt(String(code), 10) !== 0) {
                    errors = true;
                }
                if (callback) {
                    callback(errors || result);
                }
            });
        });
    }

    /**
     * Procedure to uninstall plugin
     * Should be used only to hard disabled plugins mainly in dev mode
     * @param plugin - plugin name
     * @param callback - when finished uninstalling plugin
     */
    uninstallPlugin(plugin: string, callback?: (errors?: boolean) => void): void {
        console.log('Uninstalling plugin %j...', plugin);
        callback = callback || function() {};
        const self = this;

        self.singleDefaultConnection().then((db: Database) => {
            db.collection('plugins').updateOne(
                { _id: 'plugins' },
                { $set: { [`plugins.${plugin}`]: false } },
                function(err: any) {
                    if (err) {
                        console.log('Error updating plugin state:', err);
                    }

                    const scriptPath = path.join(__dirname, plugin, 'uninstall.js');
                    let errors = false;
                    const args = [scriptPath];
                    if (apiCountlyConfig.symlinked === true) {
                        args.unshift(...['--preserve-symlinks', '--preserve-symlinks-main']);
                    }
                    const m = cp.spawn('nodejs', args);

                    m.stdout.on('data', (data: Buffer) => {
                        console.log(data.toString());
                    });

                    m.stderr.on('data', (data: Buffer) => {
                        console.log(data.toString());
                    });

                    m.on('close', (code: number | null) => {
                        console.log('Done running uninstall.js with %j', code);
                        if (parseInt(String(code), 10) !== 0) {
                            errors = true;
                        }
                        db.close();
                        if (callback) {
                            callback(errors);
                        }
                    });
                }
            );
        });
    }

    /**
     * Procedure to prepare production file
     * @param callback - when finished preparing
     */
    prepareProduction(callback?: (errors?: boolean) => void): void {
        console.log('Preparing production files');
        exec('countly task dist-all', { cwd: path.dirname(process.argv[1]) }, function(error: any, stdout: string) {
            console.log('Done preparing production files with %j / %j', error, stdout);
            let errors: boolean | undefined;
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
     */
    restartCountly(): void {
        console.log('Restarting Countly ...');
        exec('sudo countly restart', function(error: any, stdout: string, stderr: string) {
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
     * @returns db connection promise
     */
    singleDefaultConnection(): Promise<Database> {
        if (typeof countlyConfig.mongodb === 'string') {
            let query: Record<string, any> = {};
            let conUrl: string = countlyConfig.mongodb;
            if (countlyConfig.mongodb.indexOf('?') !== -1) {
                const parts = countlyConfig.mongodb.split('?');
                query = querystring.parse(parts.pop()!);
                conUrl = parts[0];
            }
            query.maxPoolSize = 3;
            conUrl += '?' + querystring.stringify(query);
            return this.dbConnection({ mongodb: conUrl }) as Promise<Database>;
        }
        else {
            const conf: Record<string, any> = Object.assign({}, countlyConfig.mongodb);
            for (const k in conf) {
                if (typeof conf[k] === 'object') {
                    conf[k] = Object.assign({}, conf[k]);
                }
            }
            conf.max_pool_size = 3;
            return this.dbConnection({ mongodb: conf }) as Promise<Database>;
        }
    }

    /**
     * Get database connection parameters for command line
     * @param config - connection configs
     * @returns db connection params
     */
    getDbConnectionParams(config: string | Record<string, any>): Record<string, any> {
        const ob: Record<string, any> = {};
        let db: string | undefined;
        let configObj: MongoDbConfig;
        if (typeof config === 'string') {
            db = config;
            if (this.dbConfigFiles[config]) {
                const confDb = config;
                try {
                    const conf = require(this.dbConfigFiles[config]);
                    configObj = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    configObj = JSON.parse(JSON.stringify(countlyConfig));
                }
                if (this.dbConfigEnvs[confDb]) {
                    configObj = configextender(this.dbConfigEnvs[confDb], configObj, process.env) as MongoDbConfig;
                }
            }
            else {
                configObj = JSON.parse(JSON.stringify(countlyConfig));
            }
        }
        else {
            configObj = (config || JSON.parse(JSON.stringify(countlyConfig))) as MongoDbConfig;
        }

        if (typeof configObj.mongodb === 'string') {
            let dbName = this.replaceDatabaseString(configObj.mongodb, db);
            dbName = dbName.split('://').pop()!;
            if (dbName.indexOf('@') !== -1) {
                const auth = dbName.split('@').shift()!;
                dbName = dbName.replace(auth + '@', '');
                const authParts = auth.split(':');
                ob.username = authParts[0];
                ob.password = authParts[1];
            }
            const dbParts = dbName.split('/');
            ob.host = dbParts[0];
            ob.db = dbParts[1] || 'countly';
            if (ob.db.indexOf('?') !== -1) {
                const parts = ob.db.split('?');
                ob.db = parts[0];
                const qstring = parts[1];
                if (qstring && qstring.length) {
                    const qstringParsed = querystring.parse(qstring) as Record<string, any>;
                    if (qstringParsed.ssl && (qstringParsed.ssl === true || qstringParsed.ssl === 'true')) {
                        ob.ssl = '';
                        ob.sslAllowInvalidCertificates = '';
                        ob.sslAllowInvalidHostnames = '';
                    }
                    if (qstringParsed.tls && (qstringParsed.tls === true || qstringParsed.tls === 'true')) {
                        ob.tls = '';
                        ob.tlsAllowInvalidCertificates = '';
                        ob.tlsAllowInvalidHostnames = '';
                        ob.tlsInsecure = '';
                    }
                    if (qstringParsed.replicaSet) {
                        ob.host = qstringParsed.replicaSet + '/' + ob.host;
                    }
                    if (qstringParsed.authSource) {
                        ob.authenticationDatabase = qstringParsed.authSource;
                    }
                }
            }
        }
        else {
            const mongoConf = configObj.mongodb as Exclude<MongoDbConfig['mongodb'], string>;
            ob.db = db || mongoConf.db || 'countly';
            if (typeof mongoConf.replSetServers === 'object') {
                ob.host = '';
                if (mongoConf.replicaName) {
                    ob.host = mongoConf.replicaName + '/';
                }
                ob.host += mongoConf.replSetServers.join(',');
            }
            else {
                ob.host = (mongoConf.host + ':' + mongoConf.port);
            }
            if (mongoConf.serverOptions && mongoConf.serverOptions.ssl && (mongoConf.serverOptions.ssl === true || mongoConf.serverOptions.ssl === 'true')) {
                ob.ssl = '';
                ob.sslAllowInvalidCertificates = '';
                ob.sslAllowInvalidHostnames = '';
            }
            if (mongoConf.serverOptions && mongoConf.serverOptions.tls && (mongoConf.serverOptions.tls === true || mongoConf.serverOptions.tls === 'true')) {
                ob.tls = '';
                ob.tlsAllowInvalidCertificates = '';
                ob.tlsAllowInvalidHostnames = '';
                ob.tlsInsecure = '';
            }
            if (mongoConf.username && mongoConf.password) {
                ob.username = mongoConf.username;
                ob.password = utils.decrypt(mongoConf.password);
                if (mongoConf.dbOptions && mongoConf.dbOptions.authSource) {
                    ob.authenticationDatabase = mongoConf.dbOptions.authSource;
                }
                else if (mongoConf.serverOptions && mongoConf.serverOptions.authSource) {
                    ob.authenticationDatabase = mongoConf.serverOptions.authSource;
                }
            }
        }

        return ob;
    }

    /**
     * This method accepts MongoDB connection string and new database name and replaces the name in string with provided one
     * @param str - MongoDB connection string
     * @param db - database name
     * @returns modified connection string
     */
    replaceDatabaseString(str: string, db?: string): string {
        if (!db) {
            db = 'countly';
        }

        const hasAdminDb = str.indexOf('/admin') !== -1;

        if (hasAdminDb) {
            let updatedConnectionString = str.replace('/admin', '/' + db);
            const hasAuthSource = updatedConnectionString.indexOf('authSource=') !== -1;

            if (!hasAuthSource) {
                const hasQueryParams = updatedConnectionString.indexOf('?') !== -1;
                const authSourceParam = hasQueryParams ? '&authSource=admin' : '?authSource=admin';
                updatedConnectionString += authSourceParam;
            }

            return updatedConnectionString;
        }

        const countlyIndex = str.lastIndexOf('/countly');
        const targetDbIndex = str.lastIndexOf('/' + db);
        if (countlyIndex !== targetDbIndex && countlyIndex !== -1 && db) {
            return str.substr(0, countlyIndex) + '/' + db + str.substr(countlyIndex + ('/countly').length);
        }
        else if (countlyIndex === -1 && targetDbIndex === -1) {
            const urlParts = str.split('://');
            if (typeof urlParts[1] === 'string') {
                const pathParts = urlParts[1].split('/');
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
     * Open connections for all databases required by the API and populate common.db, common.outDb, common.drillDb.
     * @param return_original - return the original mongodb driver instance instead of wrapped
     * @returns array of databases
     */
    async connectToAllDatabases(return_original?: boolean): Promise<Database[]> {
        const dbs = ['countly', 'countly_out', 'countly_fs', 'countly_drill'];

        let databases: Database[];
        if (apiCountlyConfig && apiCountlyConfig.shared_connection) {
            console.log('using shared connection pool');
            databases = await this.dbConnection(dbs, return_original) as Database[];
        }
        else {
            console.log('using separate connection pool');
            databases = await Promise.all(dbs.map((db) => this.dbConnection(db, return_original))) as Database[];
        }
        const [dbCountly, dbOut, dbFs, dbDrill] = databases;

        const common = require('../api/utils/common');
        require('../api/utils/countlyFs').setHandler(dbFs);

        common.db = dbCountly;
        common.outDb = dbOut;
        common.drillDb = dbDrill;

        try {
            common.db.collection('drill_data_cache').createIndex({ lu: 1 });
        }
        catch (err) {
            console.log('Plugin Manager: Failed to create index on drill_data_cache collection for lu field:', err);
        }
        const self = this;
        await new Promise(function(resolve: (value?: unknown) => void) {
            self.loadConfigs(common.db, function() {
                resolve();
            });
        });
        return databases;
    }

    /**
     * Establish a MongoDB connection based on provided config or defaults.
     * @param config - database name, array of names, or full configuration object
     * @param return_original - return the original mongodb driver instance instead of wrapped
     * @returns Promise resolving to database(s)
     */
    async dbConnection(config?: string | string[] | Record<string, any>, return_original?: boolean): Promise<Database | Database[]> {
        let db: string | undefined;
        let maxPoolSize: number | string = 100;
        const mngr = this;
        let dbList: string[] = [];

        let useConfig: MongoDbConfig = JSON.parse(JSON.stringify(countlyConfig));
        if (process.argv[1] && (process.argv[1].endsWith('api/api.js') ||
                                process.argv[1].endsWith('api/ingestor.js') ||
                                process.argv[1].endsWith('api/aggregator.js') ||
                                process.argv[1].includes('/api/') ||
                                process.argv[1].includes('jobServer/index.js'))) {
            useConfig = JSON.parse(JSON.stringify(apiCountlyConfig));
        }

        let configObj: MongoDbConfig;
        if (typeof config === 'string') {
            db = config;
            if (this.dbConfigFiles[config]) {
                const confDb = config;
                try {
                    const conf = require(this.dbConfigFiles[config]);
                    configObj = JSON.parse(JSON.stringify(conf));
                }
                catch (ex) {
                    configObj = useConfig;
                }
                if (this.dbConfigEnvs[confDb]) {
                    configObj = configextender(this.dbConfigEnvs[confDb], configObj, process.env) as MongoDbConfig;
                }
            }
            else {
                configObj = useConfig;
            }
        }
        else if (Array.isArray(config)) {
            dbList = config;
            configObj = useConfig;
        }
        else {
            configObj = (config || useConfig) as MongoDbConfig;
        }

        if (configObj && typeof configObj.mongodb === 'string') {
            try {
                const urlObj = new URL(configObj.mongodb);
                maxPoolSize = urlObj.searchParams.get('maxPoolSize') !== null ? urlObj.searchParams.get('maxPoolSize')! : maxPoolSize;
            }
            catch (_err) {
                const urlParts = configObj.mongodb.split('?');

                if (urlParts.length > 1) {
                    const queryParams = new URLSearchParams(urlParts[1]);
                    maxPoolSize = queryParams.get('maxPoolSize') !== null ? queryParams.get('maxPoolSize')! : maxPoolSize;
                }
            }
        }
        else if (configObj && typeof configObj.mongodb === 'object') {
            maxPoolSize = configObj.mongodb.max_pool_size || maxPoolSize;
        }

        if (process.argv[1] && process.argv[1].endsWith('executor.js')) {
            maxPoolSize = 3;
        }

        let dbName: string;
        const dbOptions: Record<string, any> = {
            maxPoolSize: maxPoolSize,
            noDelay: true,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 0,
            serverSelectionTimeoutMS: 30000,
            maxIdleTimeMS: 300000,
            waitQueueTimeoutMS: 0
        };
        if (typeof configObj.mongodb === 'string') {
            dbName = this.replaceDatabaseString(configObj.mongodb, db);
        }
        else {
            const mongoConf = configObj.mongodb as Exclude<MongoDbConfig['mongodb'], string>;
            mongoConf.db = db || mongoConf.db || 'countly';
            if (typeof mongoConf.replSetServers === 'object') {
                dbName = mongoConf.replSetServers.join(',') + '/' + mongoConf.db;
                if (mongoConf.replicaName) {
                    dbOptions.replicaSet = mongoConf.replicaName;
                }
            }
            else {
                dbName = (mongoConf.host + ':' + mongoConf.port + '/' + mongoConf.db);
            }
        }

        const mongoConfObj = typeof configObj.mongodb === 'object' ? configObj.mongodb : null;
        if (mongoConfObj && mongoConfObj.dbOptions) {
            delete mongoConfObj.dbOptions.native_parser;
            _.extend(dbOptions, mongoConfObj.dbOptions);
        }

        if (mongoConfObj && mongoConfObj.serverOptions) {
            _.extend(dbOptions, mongoConfObj.serverOptions);
        }

        if (mongoConfObj && mongoConfObj.username && mongoConfObj.password) {
            dbName = encodeURIComponent(mongoConfObj.username) + ':' + encodeURIComponent(utils.decrypt(mongoConfObj.password)) + '@' + dbName;
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

        let db_name = 'countly';
        try {
            db_name = dbName.split('/').pop()!.split('?')[0];
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
            let safeDbName = dbName;
            const start = dbName.indexOf('://') + 3;
            const end = dbName.indexOf('@', start);
            if (end > -1 && start > 3) {
                const middle = dbName.indexOf(':', start);
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
            process.exit(1);
            return null as any;
        }

        function logDriver(eventName: string, logObject: any, logLevel?: string): void {
            logLevel = logLevel || 'd';
            if (eventName === 'serverHeartbeatFailed' || eventName === 'topologyDescriptionChanged' || eventName === 'serverDescriptionChanged' || eventName === 'serverClosed') {
                client.on(eventName, (event: any) => logObject[logLevel!](eventName + ' %j', event));
            }
            else {
                client.on(eventName, () => logObject[logLevel!](eventName));
            }
        }

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

        logDriver('serverOpening', logDriverDb);
        logDriver('serverClosed', logDriverDb, 'i');
        logDriver('serverDescriptionChanged', logDriverDb, 'i');
        logDriver('topologyOpening', logDriverDb);
        logDriver('topologyClosed', logDriverDb);
        logDriver('topologyDescriptionChanged', logDriverDb, 'i');
        logDriver('serverHeartbeatStarted', logDriverDb);
        logDriver('serverHeartbeatSucceeded', logDriverDb);
        logDriver('serverHeartbeatFailed', logDriverDb, 'e');

        logDriver('commandStarted', logDriverDb);
        logDriver('commandSucceeded', logDriverDb);
        logDriver('commandFailed', logDriverDb, 'e');

        if (!return_original) {
            (client as any)._db = client.db;
            client.db = function(database?: string, options?: any) {
                return mngr.wrapDatabase((client as any)._db(database, options), client, db_name, dbName, dbOptions);
            };
        }
        else {
            if (!(client.db as any).ObjectID) {
                (client.db as any).ObjectID = function(id: string) {
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
            const ret: Database[] = [];
            for (let i = 0; i < dbList.length; i++) {
                ret.push(client.db(dbList[i]) as any);
                if (return_original) {
                    (ret[i] as any).ObjectID = (client.db as any).ObjectID;
                }
            }
            return ret;
        }
        else {
            const db_instance = client.db(db_name) as any;
            if (return_original && (client.db as any).ObjectID) {
                db_instance.ObjectID = (client.db as any).ObjectID;
            }
            return db_instance;
        }
    }

    /**
     * Fetch masking configuration from database.
     * @param options - object containing database connection
     */
    async fetchMaskingConf(options: { db: Database }): Promise<void> {
        const apps = await options.db.collection('apps').find({}, { 'masking': true }).toArray();

        const appObj: Record<string, any> = {};

        for (let z = 0; z < apps.length; z++) {
            appObj[apps[z]._id] = apps[z].masking;
        }

        this.masking.apps = appObj;
        const hashMap: Record<string, { a: string; e: string }> = {};
        const eventsDb = await options.db.collection('events').find({}, { 'list': true }).toArray();
        for (let z = 0; z < eventsDb.length; z++) {
            eventsDb[z]._id = eventsDb[z]._id + '';
            for (let i = 0; i < eventsDb[z].list.length; i++) {
                hashMap[crypto.createHash('sha1').update(eventsDb[z].list[i] + eventsDb[z]._id + '').digest('hex')] = { 'a': eventsDb[z]._id, 'e': eventsDb[z].list[i] };
            }

            const internalDrillEvents = ['[CLY]_session', '[CLY]_crash', '[CLY]_view', '[CLY]_action', '[CLY]_push_action', '[CLY]_push_sent', '[CLY]_star_rating', '[CLY]_nps', '[CLY]_survey', '[CLY]_apm_network', '[CLY]_apm_device', '[CLY]_consent'];
            const internalEvents = ['[CLY]_session', '[CLY]_crash', '[CLY]_view', '[CLY]_action', '[CLY]_push_action', '[CLY]_push_sent', '[CLY]_star_rating', '[CLY]_nps', '[CLY]_survey', '[CLY]_apm_network', '[CLY]_apm_device', '[CLY]_consent'];

            if (internalDrillEvents) {
                for (let i = 0; i < internalDrillEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalDrillEvents[i] + eventsDb[z]._id + '').digest('hex')] = { 'a': eventsDb[z]._id, 'e': internalDrillEvents[i] };
                }
            }

            if (internalEvents) {
                for (let i = 0; i < internalEvents.length; i++) {
                    hashMap[crypto.createHash('sha1').update(internalEvents[i] + eventsDb[z]._id + '').digest('hex')] = { 'a': eventsDb[z]._id, 'e': internalEvents[i] };
                }
            }
        }
        this.masking.hashMap = hashMap;
        this.masking.isLoaded = Date.now().valueOf();
        return;
    }

    /**
     * Checks if any item in object tree and subtree is true. Recursive.
     * @param myOb - object to check recursively
     * @returns true if any value in tree is true
     */
    hasAnyValueTrue(myOb: any): boolean {
        if (typeof myOb === 'object' && Object.keys(myOb) && Object.keys(myOb).length > 0) {
            let value = false;
            for (const key in myOb) {
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
     * Check if any app or event key has masking enabled.
     * @returns true if any masking rules are active
     */
    isAnyMasked(): boolean {
        let result = false;
        if (this.masking && this.masking.apps) {
            for (const app in this.masking.apps) {
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
     * @param appID - application id or 'all'
     * @returns masking rules
     */
    getMaskingSettings(appID: string): Record<string, any> {
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
     * @param hashValue - hashed event identifier
     * @returns resolved event data with hash
     */
    getAppEventFromHash(hashValue: string): Record<string, any> {
        if (this.masking && this.masking.hashMap && this.masking.hashMap[hashValue]) {
            const record = JSON.parse(JSON.stringify(this.masking.hashMap[hashValue]));
            record.hash = hashValue;
            return record;
        }
        else {
            return {};
        }
    }

    /**
     * Retrieve event hash map for a specific app or all apps.
     * @param appID - application id or 'all'
     * @returns map of event key to hash
     */
    getEHashes(appID: string): Record<string, string> {
        const map: Record<string, string> = {};
        if (this.masking && this.masking.hashMap) {
            if (appID === 'all') {
                for (const hash0 in this.masking.hashMap) {
                    map[this.masking.hashMap[hash0].e] = hash0;
                }
            }
            else {
                for (const hash in this.masking.hashMap) {
                    if (this.masking.hashMap[hash].a === appID) {
                        map[this.masking.hashMap[hash].e] = hash;
                    }
                }
            }
        }
        return map;
    }

    /**
     * Wrap a MongoDB Db object with Countly-specific helpers (ObjectID, encode, decode, etc.).
     * @param countlyDb - the mongodb driver db object
     * @param client - MongoClient instance
     * @param dbName - database name
     * @param dbConnectionString - the full connection string used
     * @param dbOptions - connection options
     * @returns wrapped Database
     */
    wrapDatabase(countlyDb: any, client: MongoClient, dbName: string, dbConnectionString: string, dbOptions: Record<string, any>): Database {
        if (countlyDb._wrapped) {
            return countlyDb;
        }

        countlyDb._wrapped = true;
        const mngr = this;
        countlyDb._cly_debug = {
            db: dbName,
            connection: dbConnectionString,
            options: dbOptions
        };

        logDbRead.d('New connection %j', countlyDb._cly_debug);
        if (!countlyDb.ObjectID) {
            countlyDb.ObjectID = function(id: string) {
                try {
                    return new mongodb.ObjectId(id);
                }
                catch (ex) {
                    logDbRead.i('Incorrect Object ID %j', ex);
                    return id;
                }
            };
        }
        countlyDb.encode = function(str: string): string {
            return str.replace(/^\$/g, '&#36;').replace(/\./g, '&#46;');
        };

        countlyDb.decode = function(str: string): string {
            return str.replace(/^&#36;/g, '$').replace(/&#46;/g, '.');
        };
        countlyDb.onOpened = function(callback: () => void): void {
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

        countlyDb.admin().buildInfo().then((result: any) => {
            if (result) {
                countlyDb.build = result;
            }
        }).catch(function(err: any) {
            console.log('Cannot get build info', err);
        });

        const overwriteDbPromise = function(obj: any, name: string): void {
            obj['_' + name] = obj[name];
            obj[name] = function(...args: any[]): Promise<any> {
                let callback: ((err: any, res?: any) => void) | undefined;
                if (typeof args[args.length - 1] === 'function') {
                    callback = args[args.length - 1] as (err: any, res?: any) => void;
                    args.pop();
                }

                let promise = obj['_' + name](...args);
                if (typeof callback === 'function') {
                    promise = promise.then(function(res: any) {
                        callback!(undefined, res);
                    }).catch(function(err: any) {
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

        const findOptions = [
            'allowDiskUse', 'allowPartialResults', 'authdb', 'awaitData', 'batchSize',
            'bsonRegExp', 'checkKeys', 'collation', 'comment', 'dbName', 'enableUtf8Validation',
            'explain', 'fieldsAsRaw', 'hint', 'ignoreUndefined', 'let', 'limit', 'max',
            'maxAwaitTimeMS', 'maxScan', 'maxTimeMS', 'min', 'noCursorTimeout', 'noResponse',
            'omitReadPreference', 'oplogReplay', 'partial', 'projection', 'promoteBuffers',
            'promoteLongs', 'promoteValues', 'raw', 'readConcern', 'readPreference',
            'retryWrites', 'returnKey', 'serializeFunctions', 'session', 'showDiskLoc',
            'showRecordId', 'singleBatch', 'skip', 'snapshot', 'sort', 'tailable', 'timeout',
            'timeoutMode', 'timeoutMS', 'useBigInt64', 'willRetryWrite'
        ];

        countlyDb._collection_cache = {};
        countlyDb._collection = countlyDb.collection;
        countlyDb.collection = function(collection: string, opts?: any, done?: any): any {
            if (countlyDb._collection_cache[collection]) {
                return countlyDb._collection_cache[collection];
            }

            function copyArguments(arg: any, name?: string): { name: string; args: any[] } {
                const data: { name: string; args: any[] } = {
                    name: name || arg.callee,
                    args: []
                };
                for (let i = 0; i < arg.length; i++) {
                    data.args.push(arg[i]);
                }
                return data;
            }

            function handlePromiseErrors(promise: Promise<any>, e: Error | undefined, data: any, callback?: (err: any, res?: any) => void, ignore_errors?: number[]): Promise<any> {
                if (promise && promise.then) {
                    if (typeof callback === 'function') {
                        promise = promise.then(function(res: any) {
                            callback!(undefined, res);
                        });
                    }
                    return promise.catch(function(err: any) {
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

            const ob = countlyDb._collection(collection, opts, done);

            const retryifNeeded = function(callback: ((err: any, res?: any) => void) | undefined, retry: (() => void) | null, e: Error | undefined, data: any): ((err: any, res?: any) => void) | undefined {
                if (!callback) {
                    return undefined;
                }
                return function(err: any, res?: any): void {
                    if (res) {
                        if (!res.value && data && data.name === 'findAndModify' && data.args && data.args[3] && data.args[3].remove) {
                            res = { 'value': res };
                        }
                        if (!res.value && data && data.name === 'findAOneAndDelete') {
                            res = { 'value': res };
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
            ob.findAndModify = function(query: any, sort: any, doc: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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
                let e: Error | undefined;
                let at = '';
                if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                    e = new Error();
                    at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }

                logDbWrite.d('findAndModify ' + collection + ' %j %j %j %j' + at, query, sort, doc, options);
                logDbWrite.d('From connection %j', countlyDb._cly_debug);
                if (options.upsert) {
                    const self = ob;
                    return handlePromiseErrors(ob._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, function() {
                        logDbWrite.d('retrying findAndModify ' + collection + ' %j %j %j %j' + at, query, sort, doc, options);
                        logDbWrite.d('From connection %j', countlyDb._cly_debug);
                        return handlePromiseErrors(self._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, null, e, copyArguments(arguments, 'findAndModify')));
                    }, e, copyArguments(arguments, 'findAndModify')));
                }
                else {
                    return handlePromiseErrors(ob._findAndModify(query, sort, doc, options), e, copyArguments(arguments, 'findAndModify'), retryifNeeded(callback, null, e, copyArguments(arguments, 'findAndModify')));
                }
            };

            const overwriteRetryWrite = function(obj: any, name: string): void {
                obj['_' + name] = obj[name];
                obj[name] = function(selector: any, doc: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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
                    let e: Error | undefined;
                    let at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbWrite.d(name + ' ' + collection + ' %j %j %j' + at, selector, doc, options);
                    logDbWrite.d('From connection %j', countlyDb._cly_debug);
                    if (options.upsert) {
                        const self = obj;
                        return handlePromiseErrors(obj['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, function() {
                            logDbWrite.d('retrying ' + name + ' ' + collection + ' %j %j %j' + at, selector, doc, options);
                            logDbWrite.d('From connection %j', countlyDb._cly_debug);
                            return handlePromiseErrors(self['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                        }, e, copyArguments(arguments, name)));
                    }
                    else {
                        return handlePromiseErrors(obj['_' + name](selector, doc, options), e, copyArguments(arguments, name), retryifNeeded(callback, null, e, copyArguments(arguments, name)));
                    }
                };
            };

            overwriteRetryWrite(ob, 'updateOne');
            overwriteRetryWrite(ob, 'updateMany');
            overwriteRetryWrite(ob, 'replaceOne');
            overwriteRetryWrite(ob, 'findOneAndUpdate');
            overwriteRetryWrite(ob, 'findOneAndReplace');

            const logForWrites = function(callback: ((err: any, res?: any) => void) | undefined, e: Error | undefined, data: any): ((err: any, res?: any) => void) | undefined {
                if (!callback) {
                    return undefined;
                }
                return function(err: any, res?: any): void {
                    if (err) {
                        if (!(data.args && data.args[1] && data.args[1].ignore_errors && data.args[1].ignore_errors.indexOf(err.code) !== -1)) {
                            logDbWrite.e('Error writing ' + collection + ' %j %s %j', data, err, err);
                            logDbWrite.d('From connection %j', countlyDb._cly_debug);
                            if (e) {
                                logDbWrite.e(e.stack);
                            }
                        }
                    }
                    if (res) {
                        if (res.insertedIds) {
                            const arr: any[] = [];
                            const ops: any[] = [];
                            for (const i in res.insertedIds) {
                                arr.push(res.insertedIds[i]);
                                ops.push({ _id: res.insertedIds[i], ...data.args[0][i] });
                            }
                            res.insertedIdsOrig = res.insertedIds;
                            res.insertedIds = arr;
                            res.insertedCount = res.insertedIds.length;
                            res.ops = res.ops || ops;
                        }
                        else if (res.insertedId) {
                            res.insertedIds = [res.insertedId];
                            res.insertedCount = res.insertedIds.length;
                            res.ops = res.ops || [{ _id: res.insertedId, ...data.args[0] }];
                        }
                    }
                    if (callback) {
                        callback(err, res);
                    }
                };
            };

            const overwriteDefaultWrite = function(obj: any, name: string): void {
                obj['_' + name] = obj[name];
                obj[name] = function(selector: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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
                    let e: Error | undefined;
                    let at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbWrite.d(name + ' ' + collection + ' %j %j' + at, selector, options);
                    logDbWrite.d('From connection %j', countlyDb._cly_debug);
                    return handlePromiseErrors(obj['_' + name](selector, options), e, copyArguments(arguments, name), logForWrites(callback, e, copyArguments(arguments, name)));
                };
            };
            overwriteDefaultWrite(ob, 'deleteOne');
            overwriteDefaultWrite(ob, 'deleteMany');
            overwriteDefaultWrite(ob, 'insertOne');
            overwriteDefaultWrite(ob, 'insertMany');
            overwriteDefaultWrite(ob, 'bulkWrite');
            overwriteDefaultWrite(ob, 'save');

            const logForReads = function(callback: ((err: any, res?: any) => void) | undefined, e: Error | undefined, data: any): ((err: any, res?: any) => void) | undefined {
                if (!callback) {
                    return undefined;
                }
                return function(err: any, res?: any): void {
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

            const overwriteDefaultRead = function(obj: any, name: string): void {
                obj['_' + name] = obj[name];
                obj[name] = function(query: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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
                    let e: Error | undefined;
                    let at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    if (name === 'findOne' && options && !options.projection) {
                        if (options.fields) {
                            options.projection = options.fields;
                            delete options.fields;
                        }
                        else if (findOptions.indexOf(Object.keys(options)[0]) === -1) {
                            options = { projection: options };
                        }
                    }
                    logDbRead.d(name + ' ' + collection + ' %j %j' + at, query, options);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    if (name === 'findOneAndDelete' && !options.remove) {
                        return handlePromiseErrors(obj['_' + name](query, options).then((result: any) => ({ value: result })),
                            e, copyArguments(arguments, name), logForReads(callback, e, copyArguments(arguments, name))
                        );
                    }
                    else {
                        return handlePromiseErrors(obj['_' + name](query, options), e, copyArguments(arguments, name), logForReads(callback, e, copyArguments(arguments, name)));
                    }
                };
            };

            overwriteDefaultRead(ob, 'findOne');
            overwriteDefaultRead(ob, 'findOneAndDelete');

            ob._aggregate = ob.aggregate;
            ob.aggregate = function(query: any, options?: any, callback?: (err: any, res?: any) => void): any {
                if (typeof options === 'function') {
                    callback = options;
                    options = {};
                }
                else {
                    options = options || {};
                }
                let e: Error | undefined;
                const args = arguments;
                let at = '';
                mngr.dispatch('/db/read', {
                    db: dbName,
                    operation: 'aggregate',
                    collection: collection,
                    query: query,
                    options: options
                });
                if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                    e = new Error();
                    at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }
                logDbRead.d('aggregate ' + collection + ' %j %j' + at, query, options);
                logDbRead.d('From connection %j', countlyDb._cly_debug);
                const cursor = ob._aggregate(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs: any[]): Promise<number> {
                    if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };
                cursor._toArray = cursor.toArray;
                cursor.toArray = function(cb?: (err: any, res?: any) => void): Promise<any[]> {
                    return handlePromiseErrors(cursor._toArray(), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                cursor._forEach = cursor.forEach;
                cursor.forEach = function(iterator: (doc: any) => void, cb?: (err: any, res?: any) => void): Promise<void> {
                    return handlePromiseErrors(cursor._forEach(iterator), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                cursor._close = cursor.close;
                cursor.close = function(cb?: (err: any, res?: any) => void): Promise<void> {
                    return handlePromiseErrors(cursor._close(), e, copyArguments(arguments, 'aggregate'), logForReads(cb, e, copyArguments(args, 'aggregate')));
                };
                if (typeof callback === 'function') {
                    return cursor.toArray(callback);
                }
                return cursor;
            };

            ob._find = ob.find;
            ob.find = function(query: any, options?: any): any {
                let e: Error | undefined;
                const args = arguments;
                let at = '';
                if (options && !options.projection) {
                    if (options.fields) {
                        options.projection = options.fields;
                        delete options.fields;
                    }
                    else if (findOptions.indexOf(Object.keys(options)[0]) === -1) {
                        options = { projection: options };
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
                    at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                }
                logDbRead.d('find ' + collection + ' %j %j' + at, query, options);
                logDbRead.d('From connection %j', countlyDb._cly_debug);
                const cursor = ob._find(query, options);
                cursor._count = cursor.count;
                cursor.count = function(...countArgs: any[]): Promise<number> {
                    if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                        return ob.estimatedDocumentCount.call(ob, ...countArgs);
                    }
                    return ob.countDocuments.call(ob, query, ...countArgs);
                };

                cursor._project = cursor.project;
                cursor.project = function(projection: any): any {
                    const newOptions = JSON.parse(JSON.stringify(projection));
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
                cursor.toArray = function(callback?: (err: any, res?: any) => void): Promise<any[]> {
                    return handlePromiseErrors(cursor._toArray(), e, copyArguments(arguments, 'find'), logForReads(callback, e, copyArguments(args, 'find')));
                };
                cursor._forEach = cursor.forEach;
                cursor.forEach = function(iterator: (doc: any) => void, callback?: (err: any, res?: any) => void): Promise<void> {
                    return handlePromiseErrors(cursor._forEach(iterator), e, copyArguments(arguments, 'find'), logForReads(callback, e, copyArguments(args, 'find')));
                };
                cursor._close = cursor.close;
                cursor.close = function(cb?: (err: any, res?: any) => void): Promise<void> {
                    return handlePromiseErrors(cursor._close(), e, copyArguments(arguments, 'find'), logForReads(cb, e, copyArguments(args, 'find')));
                };
                return cursor;
            };

            const logForOps = function(callback: ((err: any, res?: any) => void) | undefined, e: Error | undefined, data: any, ignore_errors?: number[]): ((err: any, res?: any) => void) | undefined {
                if (!callback) {
                    return undefined;
                }
                return function(err: any, res?: any): void {
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

            const overwritePromise = function(obj: any, name: string, ignore_errors?: number[]): void {
                obj['_' + name] = obj[name];
                obj[name] = function(...args: any[]): Promise<any> {
                    let callback: ((err: any, res?: any) => void) | undefined;
                    if (typeof args[args.length - 1] === 'function') {
                        callback = args[args.length - 1] as (err: any, res?: any) => void;
                        args.pop();
                    }

                    let e: Error | undefined;
                    let at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbRead.d(name + ' ' + collection + ' %j' + at, args);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    return handlePromiseErrors(obj['_' + name](...args), e, copyArguments(arguments, name), logForOps(callback, e, copyArguments(arguments, name), ignore_errors), ignore_errors);
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

            const overwriteBulkPromise = function(obj: any, name: string): void {
                obj['_' + name] = obj[name];
                obj[name] = function(...args: any[]): any {
                    let e: Error | undefined;
                    let at = '';
                    if (log.getLevel('db') === 'debug' || log.getLevel('db') === 'info') {
                        e = new Error();
                        at += e.stack!.replace(/\r\n|\r|\n/g, '\n').split('\n')[2];
                    }

                    logDbRead.d(name + ' ' + collection + ' %j' + at, args);
                    logDbRead.d('From connection %j', countlyDb._cly_debug);
                    const bulk = obj['_' + name](...args);
                    bulk._execute = bulk.execute;
                    bulk.execute = function(options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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

            ob._count = ob.count;
            ob.count = function(query: any, ...countArgs: any[]): Promise<number> {
                if (!query || (typeof query === 'object' && Object.keys(query).length === 0)) {
                    return ob.estimatedDocumentCount.call(ob, ...countArgs);
                }
                return ob.countDocuments.call(ob, query, ...countArgs);
            };
            ob.ensureIndex = ob.createIndex;

            ob.update = function(selector: any, document: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
                if (options && typeof options === 'object' && options.multi) {
                    return ob.updateMany(selector, document, options, callback);
                }
                else {
                    return ob.updateOne(selector, document, options, callback);
                }
            };

            ob.remove = function(selector: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
                if (options && typeof options === 'object' && options.single) {
                    return ob.deleteOne(selector, options, callback);
                }
                else {
                    return ob.deleteMany(selector, options, callback);
                }
            };

            ob.insert = function(docs: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
                if (docs && Array.isArray(docs)) {
                    return ob.insertMany(docs, options, callback);
                }
                else {
                    return ob.insertOne(docs, options, callback);
                }
            };

            ob._findAndModify = function(query: any, sort: any, doc: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
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

            ob.findAndRemove = function(query: any, sort: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
                return ob.findOneAndDelete(query, options, callback);
            };

            ob._save = ob.save;
            ob.save = function(doc: any, options?: any, callback?: (err: any, res?: any) => void): Promise<any> {
                if (doc._id) {
                    const selector = { '_id': doc._id };
                    delete doc._id;
                    options = options || {};
                    if (options && typeof options === 'object') {
                        options.upsert = true;
                        return ob.updateOne(selector, { '$set': doc }, options, callback);
                    }
                    else {
                        const myoptions = { 'upsert': true };
                        return ob.updateOne(selector, { '$set': doc }, myoptions, options);
                    }
                }
                else {
                    return ob.insertOne(doc, options, callback);
                }
            };

            countlyDb._collection_cache[collection] = ob;

            return ob;
        };
        return countlyDb;
    }

    /**
     * Compute a deep diff of provided config against current config, keeping only new keys.
     * @param current - current configuration object
     * @param provided - updated configuration object
     * @returns diff containing keys present in provided but missing in current
     */
    getObjectDiff(current: Record<string, any>, provided: Record<string, any>): Record<string, any> {
        const toReturn: Record<string, any> = {};

        for (const i in provided) {
            if (typeof current[i] === 'undefined') {
                toReturn[i] = provided[i];
            }
            else if ((typeof provided[i]) === 'object' && provided[i] !== null) {
                const diff = this.getObjectDiff(current[i], provided[i]);
                if (Object.keys(diff).length > 0) {
                    toReturn[i] = diff;
                }
            }
        }
        return toReturn;
    }

    /**
     * Flatten nested objects into dot-notation keys for MongoDB updates.
     * @param ob - object to flatten
     * @param prefix - key prefix for recursion
     * @returns flattened key/value map
     */
    flattenObject(ob: Record<string, any>, prefix?: string): Record<string, any> {
        if (prefix) {
            prefix += '.';
        }
        else {
            prefix = '';
        }
        const toReturn: Record<string, any> = {};

        for (const i in ob) {
            if (!Object.prototype.hasOwnProperty.call(ob, i)) {
                continue;
            }

            if ((typeof ob[i]) === 'object' && ob[i] !== null) {
                const flatObject = this.flattenObject(ob[i]);
                for (const x in flatObject) {
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
     * Register the /database/register event handler to allow other plugins to register database connections.
     */
    registerDatabaseHandler(): void {
        this.register('/database/register', (params: any) => {
            if (!params || !params.name || !params.client) {
                console.error('Invalid database registration: missing name or client');
                return;
            }

            try {
                const common = require('../api/utils/common.js');

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

// Create singleton instance
const pluginManagerInstance = new PluginManager();

// CommonJS export
module.exports = pluginManagerInstance;