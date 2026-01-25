import { Db, MongoClient } from "mongodb";

/** Init options for plugin manager */
export interface InitOptions {
    filename?: string;
    skipDependencies?: boolean;
}

/** TTL Collection configuration */
export interface TTLCollection {
    collection: string;
    db: Database | string;
    property: string;
    expireAfterSeconds: number;
}

/** Database configuration files mapping */
export interface DbConfigFiles {
    countly_drill: string;
    countly_out: string;
    countly_fs: string;
}

/** Database configuration environment variables mapping */
export interface DbConfigEnvs {
    countly_drill: string;
    countly_out: string;
    countly_fs: string;
}

/** Internal omit segments configuration */
export interface InternalOmitSegments {
    [eventName: string]: string[];
}

/** Configuration object structure */
export interface Config {
    [key: string]: any;
}

/** Plugin configuration with change handlers */
export interface ConfigWithOnChange {
    config: Config;
    onchange?: (current: Config, provided: Config) => void;
}

/** Event handler function */
export interface EventHandler {
    (params: any): void | Promise<void>;
}

/** Event handlers registry */
export interface EventsRegistry {
    [eventName: string]: EventHandler[];
}

/** Plugin API methods */
export interface PluginApi {
    [methodName: string]: Function;
}

/** Plugins API collection */
export interface PluginsApis {
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
export interface Database extends Db {
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
export interface PluginDependency {
    dependencies?: string[];
    soft_dependencies?: string[];
    [key: string]: any;
}

/** Plugin dependency map */
export interface DependencyMap {
    [pluginName: string]: PluginDependency;
}

/** Configuration changes object */
export interface ConfigChanges {
    [namespace: string]: {
        [key: string]: any;
    };
}

/** Promise results from Promise.allSettled equivalent */
export interface PromiseResult<T> {
    status: 'fulfilled' | 'rejected';
    value?: T;
    reason?: any;
}

/**
 * Plugin Manager - Central orchestrator for Countly's plugin system
 */
export interface PluginManager {
    /** Registered app types */
    appTypes: string[];

    /** Events prefixed with [CLY]_ that should be recorded in core as standard data model */
    internalEvents: string[];

    /** Events prefixed with [CLY]_ that should be recorded in drill */
    internalDrillEvents: string[];

    /** Segments for events prefixed with [CLY]_ that should be omitted */
    internalOmitSegments: InternalOmitSegments;

    /** Custom configuration files for different databases */
    dbConfigFiles: DbConfigFiles;

    /** TTL collections to clean up periodically */
    ttlCollections: TTLCollection[];

    /** Custom configuration files for different databases for docker env */
    dbConfigEnvs: DbConfigEnvs;

    // Core Management Methods
    /**
     * Loads plugin dependency mappings
     */
    loadDependencyMap(): void;

    /**
     * Initialize api side plugins
     * @param options - Init options with filename and dependency settings
     */
    init(options?: InitOptions): void;

    /**
     * Initialize a specific plugin
     * @param pluginName - Name of the plugin to initialize
     * @param filename - Optional filename to load (default: "api")
     */
    initPlugin(pluginName: string, filename?: string): void;

    /**
     * Install plugins that are missing from database
     * @param db - Database connection
     * @param callback - Callback function
     */
    installMissingPlugins(db: Database, callback: (error?: Error) => void): void;

    /**
     * Reload the list of enabled plugins
     * @param db - Database connection
     * @param callback - Callback function
     */
    reloadEnabledPluginList(db: Database, callback: (error?: Error) => void): void;

    /**
     * Update plugin states in database
     * @param db - Database connection
     * @param params - Parameters object
     * @param callback - Callback function
     */
    updatePluginsInDb(db: Database, params: any, callback: (error?: Error) => void): void;

    // Configuration Management Methods
    /**
     * Load configurations from database
     * @param db - Database connection
     * @param callback - Callback function
     * @param api - Optional API flag
     */
    loadConfigs(db: Database, callback: (error?: Error) => void, api?: boolean): void;

    /**
     * Set default configurations
     * @param namespace - Configuration namespace
     * @param conf - Configuration object
     * @param exclude - Exclude from UI
     * @param onchange - Change handler function
     */
    setConfigs(namespace: string, conf: Config, exclude?: boolean, onchange?: (current: Config, provided: Config) => void): void;

    /**
     * Set user level default configurations
     * @param namespace - Configuration namespace
     * @param conf - Configuration object
     */
    setUserConfigs(namespace: string, conf: Config): void;

    /**
     * Get configuration from specific namespace
     * @param namespace - Configuration namespace
     * @param userSettings - User settings object
     * @param override - Override flag
     * @returns Configuration object
     */
    getConfig(namespace: string, userSettings?: object, override?: boolean): Config;

    /**
     * Get all configs for all namespaces
     * @returns All configurations
     */
    getAllConfigs(): { [namespace: string]: Config };

    /**
     * Get all configs overwritten by user settings
     * @param userSettings - User settings object
     * @returns User configurations
     */
    getUserConfigs(userSettings?: object): { [namespace: string]: Config };

    /**
     * Check if there are changes in configs
     * @param db - Database connection
     * @param current - Current configuration
     * @param provided - Provided configuration
     * @param callback - Callback function
     */
    checkConfigs(db: Database, current: Config, provided: Config, callback: (error?: Error, hasChanges?: boolean) => void): void;

    /**
     * Update existing configs
     * @param db - Database connection
     * @param namespace - Configuration namespace
     * @param conf - Configuration object
     * @param callback - Callback function
     */
    updateConfigs(db: Database, namespace: string, conf: Config, callback: (error?: Error) => void): void;

    /**
     * Update application level configuration
     * @param db - Database connection
     * @param appId - Application ID
     * @param namespace - Configuration namespace
     * @param config - Configuration object
     * @param callback - Callback function
     */
    updateApplicationConfigs(db: Database, appId: string, namespace: string, config: Config, callback: (error?: Error) => void): void;

    /**
     * Update all configs with provided changes
     * @param db - Database connection
     * @param changes - Configuration changes
     * @param callback - Callback function
     */
    updateAllConfigs(db: Database, changes: ConfigChanges, callback: (error?: Error) => void): void;

    /**
     * Update user configs
     * @param db - Database connection
     * @param changes - Configuration changes
     * @param user_id - User ID
     * @param callback - Callback function
     */
    updateUserConfigs(db: Database, changes: ConfigChanges, user_id: string, callback: (error?: Error) => void): void;

    // Collection Management Methods
    /**
     * Add collection to expire list
     * @param collection - Collection name
     */
    addCollectionToExpireList(collection: string): void;

    /**
     * Get expire list array
     * @returns Array of collection names
     */
    getExpireList(): string[];

    // Plugin Management Methods
    /**
     * Get array of enabled plugin names
     * @param returnFullList - Return full list flag
     * @returns Array of plugin names
     */
    getPlugins(returnFullList?: boolean): string[];

    /**
     * Get array with references to plugin's api modules
     * @returns Plugin APIs object
     */
    getPluginsApis(): PluginsApis;

    /**
     * Sets/changes method of specific plugin's api module
     * @param plugin - Plugin name
     * @param name - Method name
     * @param func - Function to set
     */
    setPluginApi(plugin: string, name: string, func: Function): void;

    /**
     * Try to reload cached plugins json file
     */
    reloadPlugins(): void;

    /**
     * Check if plugin by provided name is enabled
     * @param plugin - Plugin name
     * @returns True if enabled
     */
    isPluginEnabled(plugin: string): boolean;

    /**
     * Check if plugin is enabled
     * @param name - Plugin name
     * @returns True if enabled
     */
    isPluginOn(name: string): boolean;

    /**
     * Fix plugin order based on dependencies
     * @param plugs_list - List of plugins
     * @returns Ordered plugin list
     */
    fixOrderBasedOnDependency(plugs_list: string[]): string[];

    // Plugin Lifecycle Methods
    /**
     * Process plugin installation
     * @param db - Database connection
     * @param name - Plugin name or plugin object with name and enable properties
     * @param callback - Callback function
     */
    processPluginInstall(db: Database, name: string | { name: string; enable?: boolean }, callback: (error?: Error) => void): void;

    /**
     * Procedure to install plugin
     * @param plugin - Plugin name
     * @param callback - Callback function
     */
    installPlugin(plugin: string, callback: (error?: Error) => void): void;

    /**
     * Procedure to upgrade plugin
     * @param plugin - Plugin name
     * @param callback - Callback function
     */
    upgradePlugin(plugin: string, callback: (error?: Error) => void): void;

    /**
     * Procedure to uninstall plugin
     * @param plugin - Plugin name
     * @param callback - Callback function
     */
    uninstallPlugin(plugin: string, callback: (error?: Error) => void): void;

    /**
     * Check plugins on master process
     */
    checkPluginsMaster(): void;

    /**
     * Mark that we started syncing plugin states
     */
    startSyncing(): void;

    /**
     * Mark that we finished syncing plugin states
     */
    stopSyncing(): void;

    /**
     * Check plugins and sync between processes/servers
     * @param db - Database connection
     * @param callback - Callback function
     */
    checkPlugins(db: Database, callback: (error?: Error) => void): void;

    /**
     * Sync plugin states between servers
     * @param pluginState - Plugin state object
     * @param callback - Callback function
     * @param db - Optional database connection
     */
    syncPlugins(pluginState: PluginState, callback: (error?: Error) => void, db?: Database): void;

    // Event System Methods
    /**
     * Register listening to new event on api side
     * @param event - Event name
     * @param callback - Event handler function
     * @param unshift - Add to beginning of handlers
     * @param featureName - Feature name
     */
    register(event: string, callback: EventHandler, unshift?: boolean, featureName?: string): void;

    /**
     * Dispatch specific event on api side
     * @param event - Event name
     * @param params - Parameters object
     * @param callback - Optional callback function
     * @returns True if event was dispatched
     */
    dispatch(event: string, params: any, callback?: (error?: Error) => void): boolean;

    /**
     * Dispatch specific event and wait until all handlers finished (legacy)
     * @param event - Event name
     * @param params - Parameters object
     * @param callback - Optional callback function
     * @returns True if event was dispatched
     */
    dispatchAllSettled(event: string, params: any, callback?: (error?: Error) => void): boolean;

    /**
     * Dispatch specific event as Promise
     * @param event - Event name
     * @param params - Parameters object
     * @returns Promise that resolves when all handlers complete
     */
    dispatchAsPromise(event: string, params: any): Promise<PromiseResult<any>[]>;

    /**
     * Returns a copy of all events
     * @returns Events registry copy
     */
    returnEventsCopy(): EventsRegistry;

    // Frontend Integration Methods
    /**
     * Load plugins frontend app.js and expose static paths
     * @param app - Express app
     * @param countlyDb - Database connection
     * @param express - Express module
     */
    loadAppStatic(app: any, countlyDb: Database, express: any): void;

    /**
     * Call init method of plugin's frontend app.js modules
     * @param app - Express app
     * @param countlyDb - Database connection
     * @param express - Express module
     */
    loadAppPlugins(app: any, countlyDb: Database, express: any): void;

    /**
     * Call specific predefined methods of plugin's frontend app.js modules
     * @param method - Method name
     * @param params - Parameters object
     * @returns True if method was called
     */
    callMethod(method: string, params: any): boolean;

    /**
     * Call async methods that return promises and merge results
     * @param method - Method name
     * @param params - Parameters object
     * @returns Promise with merged results
     */
    callPromisedAppMethod(method: string, params: any): Promise<{ [pluginName: string]: any }>;

    // Database Connection Methods
    /**
     * Get single pool connection for database
     * @returns Promise with database connection
     */
    singleDefaultConnection(): Promise<Database>;

    /**
     * Connect to all databases (countly, countly_out, countly_fs, countly_drill)
     * @param return_original - Return original driver connection object (database is not wrapped)
     * @returns Promise with array of database connections
     */
    connectToAllDatabases(return_original?: boolean): Promise<Database[]>;

    /**
     * Get database connection with configured pool size
     * @param config - Database configuration (string, array of strings, or config object)
     * @param return_original - Return original driver connection object (database is not wrapped)
     * @returns Promise with database connection or array of connections
     */
    dbConnection(config?: string | string[] | DatabaseConfig, return_original?: boolean): Promise<Database | Database[]>;

    /**
     * Get database connection parameters for command line
     * @param config - Database configuration
     * @returns Connection parameters object
     */
    getDbConnectionParams(config: DatabaseConfig): DbConnectionParams;

    /**
     * Replace database name in MongoDB connection string
     * @param str - Connection string
     * @param db - Optional database name
     * @returns Modified connection string
     */
    replaceDatabaseString(str: string, db?: string): string;

    /**
     * Wrap db object with compatibility layer
     * @param countlyDb - Countly database connection
     * @param client - MongoDB client
     * @param dbName - Database name
     * @param dbConnectionString - Connection string
     * @param dbOptions - Database options
     * @returns Wrapped database object
     */
    wrapDatabase(countlyDb: Db, client: MongoClient, dbName: string, dbConnectionString: string, dbOptions: object): Database;

    // Data Masking Methods
    /**
     * Fetch masking configuration from database
     * @param options - Options object with database connection
     * @returns Promise that resolves when masking config is fetched
     */
    fetchMaskingConf(options: { db: Database }): Promise<void>;

    /**
     * Check if any item in masking tree is true
     * @returns True if any masking is enabled
     */
    isAnyMasked(): boolean;

    /**
     * Get masking settings for specific app
     * @param appID - Application ID
     * @returns Masking settings object
     */
    getMaskingSettings(appID: string): MaskingSettings;

    /**
     * Get app and event from hash value
     * @param hashValue - Hash value
     * @returns App and event information
     */
    getAppEventFromHash(hashValue: string): AppEventFromHash;

    /**
     * Get event hashes for specific app
     * @param appID - Application ID
     * @returns Event hashes object
     */
    getEHashes(appID: string): EventHashes;

    // Utility Methods
    /**
     * Allow extending object module by using extend folders
     * @param name - Module name
     * @param object - Object to extend
     */
    extendModule(name: string, object: object): void;

    /**
     * Get feature name from call stack
     * @returns Feature name
     */
    getFeatureName(): string;

    /**
     * Procedure to prepare production files
     * @param callback - Callback function
     */
    prepareProduction(callback: (error?: Error) => void): void;

    /**
     * Procedure to restart countly process
     */
    restartCountly(): void;

    /**
     * Singleton getInstance definition
     * @returns PluginManager instance
     */
    getInstance(): PluginManager;
}

/**
 * Plugin Manager singleton instance
 */
declare const pluginManager: PluginManager;
export default pluginManager;