const plugins = require('../../pluginManager.ts');
const log = require('../../../api/utils/log.js')('clickhouse');
const common = require('../../../api/utils/common.js');
const countlyConfig = require('../../../api/config');
const fs = require('fs');
const path = require('path');
const health = require('./health.js');
const ClusterManager = require('./managers/ClusterManager');
const { DictionaryManager } = require('./managers');
const { executeSQL } = require('./managers/SQLExecutor');
const { handleUserMerge } = require('./userMergeHandler');

let clickhouseClient = null;
let clickhouseQueryService = null;
let initializationPromise = null;

/**
 * Check if table exists in ClickHouse
 * @param {Object} client - ClickHouse client
 * @param {string} database - Database name
 * @param {string} table - Table name
 * @returns {boolean} True if table exists, false otherwise
 */
async function tableExists(client, database, table) {
    const result = await client.query({
        query: `SELECT count() as cnt FROM system.tables WHERE database = {database:String} AND name = {table:String}`,
        query_params: { database, table },
        format: 'JSONEachRow'
    });
    const rows = await result.json();
    return rows?.[0]?.cnt > 0;
}

/**
 * Validate all required ClickHouse schema objects exist.
 * Throws error on startup if anything is missing - fail fast principle.
 * @param {Object} client - ClickHouse client
 * @param {Object} cm - ClusterManager instance
 * @throws {Error} If any required object is missing
 */
async function validateSchemaComplete(client, cm) {
    const databaseName = countlyConfig.clickhouse?.database || 'countly_drill';
    const errors = [];

    // Build list of required tables based on deployment mode
    const requiredTables = [];

    if (cm.isClusterMode()) {
        // Cluster mode requires both local and distributed tables.
        // Note: Distributed tables are only created by SQLExecutor when @sharding metadata is present.
        // All current SQL files (drill_events, drill_snapshots, uid_map) define @sharding,
        // so distributed tables are expected. If adding a new table without @sharding,
        // update this validation to conditionally require it.
        requiredTables.push(
            { db: databaseName, table: 'drill_events_local', description: 'Local events table' },
            { db: databaseName, table: 'drill_events', description: 'Distributed events table' },
            { db: databaseName, table: 'drill_snapshots_local', description: 'Local snapshots table' },
            { db: databaseName, table: 'drill_snapshots', description: 'Distributed snapshots table' },
            { db: 'identity', table: 'uid_map_local', description: 'Local identity mapping table' },
            { db: 'identity', table: 'uid_map', description: 'Distributed identity mapping table' }
        );
    }
    else {
        // Single-node mode
        requiredTables.push(
            { db: databaseName, table: 'drill_events', description: 'Events table' },
            { db: databaseName, table: 'drill_snapshots', description: 'Snapshots table' },
            { db: 'identity', table: 'uid_map', description: 'Identity mapping table' }
        );
    }

    // Check each required table
    for (const { db, table, description } of requiredTables) {
        const exists = await tableExists(client, db, table);
        if (!exists) {
            errors.push(`Missing table: ${db}.${table} (${description})`);
        }
    }

    // Check required dictionary
    const dictManager = new DictionaryManager(client, 'identity', 'uid_map_dict');
    const dictExists = await dictManager.exists();
    if (!dictExists) {
        errors.push('Missing dictionary: identity.uid_map_dict (required for user identity resolution)');
    }

    // Throw if any errors found
    if (errors.length > 0) {
        const mode = cm.isCloudMode() ? 'Cloud' : (cm.isClusterMode() ? 'Cluster' : 'Single-node');
        const errorMessage = [
            `ClickHouse schema validation failed (${mode} mode).`,
            '',
            'Missing objects:',
            ...errors.map(e => `  - ${e}`),
            '',
            cm.isCloudMode()
                ? 'In Cloud mode, you must pre-create all schema objects before starting Countly.'
                : 'Run bootstrap or check ClickHouse connectivity.',
            '',
            'See ClickHouse plugin documentation for required DDL statements.'
        ].join('\n');

        throw new Error(errorMessage);
    }

    log.i('ClickHouse schema validation passed', {
        mode: cm.getDeploymentMode(),
        tables: requiredTables.length,
        dictionary: 'identity.uid_map_dict'
    });
}

/**
 * Bootstrap all ClickHouse tables from SQL files.
 * Executes all .sql files in the sql/ directory in alphabetical order.
 * @param {Object} client - ClickHouse client instance
 * @param {Object} cm - ClusterManager instance
 */
async function bootstrapTables(client, cm) {
    const sqlDir = path.join(__dirname, 'sql');
    const sqlFiles = fs.readdirSync(sqlDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of sqlFiles) {
        const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
        log.d(`Executing ${file}`);
        await executeSQL(client, cm, sql);
    }
}

/**
 * Get the identity daysOld configuration value.
 * This is the number of days after which identity mappings are baked into cold partitions.
 * Dictionary only loads mappings from the last (daysOld + 1) days.
 * @returns {number} Days old threshold (default: 30)
 */
function getIdentityDaysOld() {
    return countlyConfig.clickhouse?.identity?.daysOld ?? 30;
}

/**
 * Bootstrap identity dictionary.
 * @param {Object} client - ClickHouse client instance
 * @param {Object} cm - ClusterManager instance
 */
async function bootstrapIdentityDictionary(client, cm) {
    const dictManager = new DictionaryManager(client, 'identity', 'uid_map_dict');

    const exists = await dictManager.exists();
    if (exists) {
        log.d('identity.uid_map_dict already exists');
        return;
    }

    // Dictionary always sources from distributed table for complete cross-shard data.
    // This ensures param-side canonicalization in pidClusterPredicate works correctly
    // across all shards (merged users are visible from any node).
    const sourceTable = 'identity.uid_map';

    // Only load identity mappings from the last (daysOld + 1) days.
    // Older mappings are already baked into cold partitions by ColdPartitionMerging job.
    // The +1 day buffer ensures dictionary has mappings for data not yet baked.
    const daysOld = getIdentityDaysOld();
    const daysToLoad = daysOld + 1;

    // Dictionary cache lifetime configuration from config (with defaults)
    const identityConfig = countlyConfig.clickhouse?.identity || {};
    const lifetimeConfig = identityConfig.lifetime || {};
    const lifetimeMin = lifetimeConfig.min ?? 60;
    const lifetimeMax = lifetimeConfig.max ?? 120;

    const config = {
        structure: [
            { name: 'a', type: 'String' },
            { name: 'uid', type: 'String' },
            { name: 'canon', type: 'String' }
        ],
        primaryKey: ['a', 'uid'],
        source: {
            type: 'CLICKHOUSE',
            params: {
                // Note: We use argMax directly without nullIf() to keep String type consistent.
                // Empty canon values remain as empty strings, which are handled at query time.
                // WHERE clause limits to recent data - older mappings are baked into cold partitions.
                query: `
                    SELECT a, uid, argMax(canon,(change_ts,updated_at)) AS canon
                    FROM ${sourceTable}
                    WHERE change_ts > now() - INTERVAL ${daysToLoad} DAY
                    GROUP BY a, uid
                `
            }
        },
        layout: { type: 'COMPLEX_KEY_HASHED' },
        lifetime: { min: lifetimeMin, max: lifetimeMax }
    };

    if (cm.isClusterMode()) {
        await dictManager.createOrReplaceWithCluster(config, {
            onCluster: true,
            clusterManager: cm
        });
    }
    else {
        await dictManager.createOrReplace(config);
    }

    log.d('identity.uid_map_dict created');
}

/**
 * Bootstrap all ClickHouse schema (tables + dictionaries).
 * @param {Object} client - ClickHouse client instance
 */
async function bootstrapSchema(client) {
    const databaseName = countlyConfig.clickhouse?.database || 'countly_drill';
    const cm = new ClusterManager(countlyConfig.clickhouse);

    // In Cloud mode (or externally managed schemas), skip DDL and validate schema exists
    if (cm.isCloudMode()) {
        log.i('Cloud/external schema mode - skipping DDL, validating schema exists');
        // Schema must be pre-created. Validate and fail fast if missing.
        await validateSchemaComplete(client, cm);
        return;
    }

    // Check all required objects exist before skipping bootstrap
    // Include local tables
    const requiredObjects = [
        { db: databaseName, table: cm.isClusterMode() ? 'drill_events_local' : 'drill_events' },
        { db: databaseName, table: cm.isClusterMode() ? 'drill_snapshots_local' : 'drill_snapshots' },
        { db: 'identity', table: cm.isClusterMode() ? 'uid_map_local' : 'uid_map' }
    ];

    // In cluster mode, also check distributed tables exist (for tables with sharding)
    if (cm.isClusterMode()) {
        requiredObjects.push({ db: databaseName, table: 'drill_events' }); // distributed
        requiredObjects.push({ db: databaseName, table: 'drill_snapshots' }); // distributed
        requiredObjects.push({ db: 'identity', table: 'uid_map' }); // distributed, uses sipHash64(a, uid) sharding
    }

    let allExist = true;
    for (const obj of requiredObjects) {
        const exists = await tableExists(client, obj.db, obj.table);
        if (!exists) {
            log.i(`Missing ${obj.db}.${obj.table}, running full bootstrap`);
            allExist = false;
            break;
        }
    }

    // Also check dictionary exists
    if (allExist) {
        const dictManager = new DictionaryManager(client, 'identity', 'uid_map_dict');
        const dictExists = await dictManager.exists();
        if (!dictExists) {
            log.i('Missing identity.uid_map_dict, running full bootstrap');
            allExist = false;
        }
    }

    if (allExist) {
        log.d('Schema already bootstrapped (all required tables and dictionaries exist)');
        return;
    }

    log.i('Bootstrapping ClickHouse schema...', { mode: cm.getDeploymentMode() });

    // 1. Execute all SQL files (creates databases + tables)
    await bootstrapTables(client, cm);

    // 2. Create dictionaries
    await bootstrapIdentityDictionary(client, cm);

    // 3. Validate everything was created correctly
    await validateSchemaComplete(client, cm);

    log.i('Schema bootstrapped successfully', {
        mode: cm.getDeploymentMode(),
        distributed: cm.shouldCreateDistributedTable()
    });
}

/**
 * Initialize ClickHouse client and register with common object
 */
async function initializeClickHouse() {
    try {
        // Only initialize if ClickHouse is configured
        if (!countlyConfig.clickhouse || !countlyConfig.clickhouse.url) {
            log.i('ClickHouse not configured, skipping initialization');
            return;
        }

        // Check if ClickHouse adapter is enabled
        if (!countlyConfig.database?.adapters?.clickhouse?.enabled) {
            log.i('ClickHouse adapter disabled in database config, skipping initialization');
            return;
        }

        const clickhouseClientSingleton = require('./ClickhouseClient.js');
        const ClickhouseQueryService = require('./ClickhouseQueryService.js');

        try {
            clickhouseClient = await clickhouseClientSingleton.getInstance();
        }
        catch (instanceError) {
            log.e('Failed to get ClickHouse client instance', instanceError);
            // Disable ClickHouse adapter in config so QueryRunner knows it's unavailable
            if (countlyConfig.database?.adapters?.clickhouse) {
                countlyConfig.database.adapters.clickhouse.enabled = false;
                log.w('Disabling ClickHouse adapter in database config due to connection failure');
            }

            if (countlyConfig.database?.failOnConnectionError) {
                // Re-throw to trigger graceful shutdown
                throw instanceError;
            }
            return;
        }

        // Check connection on startup
        const isConnected = await clickhouseClientSingleton.isConnected();
        if (!isConnected) {
            // Disable ClickHouse adapter in config so QueryRunner knows it's unavailable
            if (countlyConfig.database?.adapters?.clickhouse) {
                countlyConfig.database.adapters.clickhouse.enabled = false;
                log.w('ClickHouse connection failed, disabling ClickHouse adapter in database config');
            }

            if (countlyConfig.database?.failOnConnectionError) {
                // Throw uncaught error to trigger graceful shutdown
                throw new Error('ClickHouse connection failed on startup and failOnConnectionError=true');
            }
            log.w('ClickHouse connection failed, continuing without ClickHouse');
            clickhouseClientSingleton.reset();
            return;
        }

        // Bootstrap all tables and dictionaries
        await bootstrapSchema(clickhouseClient);

        clickhouseQueryService = new ClickhouseQueryService(clickhouseClient);

        // Add query service to common object for use by other plugins 
        common.clickhouseQueryService = clickhouseQueryService;

        // Register client with common object via generic database registration event
        plugins.dispatch('/database/register', {
            name: 'clickhouse',
            client: clickhouseClient,
            queryService: clickhouseQueryService,
            type: 'clickhouse',
            description: 'ClickHouse analytics database'
        });

        log.i('ClickHouse client and query service initialized and registered');
    }
    catch (error) {
        log.e('Failed to initialize ClickHouse client', error);

        // Disable ClickHouse adapter in config so QueryRunner knows it's unavailable
        if (countlyConfig.database?.adapters?.clickhouse) {
            countlyConfig.database.adapters.clickhouse.enabled = false;
            log.w('Disabling ClickHouse adapter in database config due to initialization failure');
        }

        if (countlyConfig.database?.failOnConnectionError) {
            // Re-throw to trigger uncaught exception handler
            throw error;
        }
    }
}


/**
 * Get ClickHouse client instance
 * @returns {ClickHouseClient|null} ClickHouse client or null if not available
 */
function getClient() {
    return clickhouseClient;
}

/**
 * Get ClickHouse query service instance
 * @returns {Object|null} ClickHouse query service or null if not available
 */
function getQueryService() {
    return clickhouseQueryService;
}


// Initialize on plugin load
initializationPromise = initializeClickHouse()
    .catch(error => {
        log.e('Failed to initialize ClickHouse during plugin load', error);

        if (countlyConfig.database?.adapters?.clickhouse) {
            countlyConfig.database.adapters.clickhouse.enabled = false;
            log.w('ClickHouse adapter disabled due to plugin load failure');
        }

        if (countlyConfig.database?.failOnConnectionError) {
            throw error;
        }
    });


// Export client and query service access
module.exports = {
    getClient,
    getQueryService,
    initializeClickHouse,
    getIdentityDaysOld
};

plugins.register('/system/observability/collect', async function() {
    // Use cluster-aware table name for accurate system.parts/merges metrics
    const cm = new ClusterManager(countlyConfig.clickhouse || {});
    const database = countlyConfig.clickhouse?.database || 'countly_drill';
    const table = cm.isClusterMode() ? 'drill_events_local' : 'drill_events';
    return await health.getHealthSummary({ database, table });
});

/**
 * Handle app deletion - delete identity data from ClickHouse
 */
plugins.register("/i/apps/delete", async function(ob) {
    const appId = ob.appId;
    if (!appId) {
        return;
    }
    log.d('Deleting ClickHouse identity data for app:', appId);
    plugins.dispatch("/core/delete_granular_data", {
        query: {"a": appId + ""},
        db: "identity",
        collection: "uid_map"
    }, function() {});
});

/**
 * Handle app reset - clear identity data from ClickHouse
 */
plugins.register("/i/apps/reset", async function(ob) {
    const appId = ob.appId + "";
    if (!appId) {
        return;
    }
    log.d('Resetting ClickHouse identity data for app:', appId);
    plugins.dispatch("/core/delete_granular_data", {
        query: {"a": appId},
        db: "identity",
        collection: "uid_map"
    }, function() {});
});

/**
 * Handle clear all app data - clear identity data from ClickHouse
 */
plugins.register("/i/apps/clear_all", async function(ob) {
    const appId = ob.appId;
    if (!appId) {
        return;
    }
    log.d('Clearing all ClickHouse identity data for app:', appId);
    plugins.dispatch("/core/delete_granular_data", {
        query: {"a": appId + ""},
        db: "identity",
        collection: "uid_map"
    }, function() {});
});

/**
 * Handle user merge - write merge data to ClickHouse identity.uid_map table
 * This handler is registered in api.js so it runs when the userMerge job
 * dispatches /i/user_merge from the jobserver process.
 */
plugins.register("/i/user_merge", async function(ob) {
    await initializationPromise;
    const client = getClient();
    if (!client) {
        return;
    }
    await handleUserMerge(ob, client);
});

/**
 * Handle user merge via device_id event
 * This handler catches merges where oldAppUser was already deleted.
 * When the userMerge job runs and finds oldAppUser deleted, it dispatches
 * /i/device_id instead of /i/user_merge, so we need to handle both events.
 */
plugins.register("/i/device_id", async function(ob) {
    await initializationPromise;
    const client = getClient();
    if (!client) {
        return;
    }
    // ob contains: app_id, oldUser, newUser
    if (ob.oldUser && ob.newUser && ob.oldUser.uid && ob.newUser.uid) {
        await handleUserMerge({
            app_id: ob.app_id,
            oldAppUser: ob.oldUser,
            newAppUser: ob.newUser
        }, client);
    }
});