/**
 * ClickHouse Cluster Integration Test Helpers
 *
 * Shared utilities for testing all cluster deployment modes.
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const Module = require('module');

// Path to plugin root and core
const PLUGIN_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOCKER_DIR = path.resolve(__dirname, '..', '..', 'docker');
const CORE_DIR = process.cwd(); // Assumes running from core directory

// Store original Module._load
const originalLoad = Module._load;

/**
 * Mock logger that mimics countly log interface
 */
function createMockLogger(prefix) {
    const noop = () => {};
    const logger = {
        d: noop,
        i: noop,
        w: console.warn.bind(console, `[${prefix}]`),
        e: console.error.bind(console, `[${prefix}]`),
        debug: noop,
        info: noop,
        warn: console.warn.bind(console, `[${prefix}]`),
        error: console.error.bind(console, `[${prefix}]`)
    };
    return logger;
}

/**
 * Setup module mocking for core dependencies
 * Must be called before loading any plugin modules
 */
function setupModuleMocking() {
    Module._load = function(request, parent) {
        // Mock the log.js module from core
        if (request.includes('api/utils/log.js') || request.includes('api/utils/log')) {
            return function(prefix) {
                return createMockLogger(prefix);
            };
        }

        // Mock common.js if needed
        if (request.includes('api/utils/common.js') || request.includes('api/utils/common')) {
            return {
                log: createMockLogger('common'),
                getConfig: () => ({}),
                dbUserHasAccessToCollection: () => true
            };
        }

        return originalLoad.apply(this, arguments);
    };
}

/**
 * Reset module mocking
 */
function resetModuleMocking() {
    Module._load = originalLoad;
}

// Setup mocking immediately when this module is loaded
setupModuleMocking();

/**
 * Mode configurations for all supported deployment modes
 */
const MODES = {
    single: {
        config: { shards: false, replicas: false, isCloud: false },
        compose: 'docker-compose.single.yml',
        expectedEngines: {
            'countly_drill.drill_events': 'MergeTree',
            'countly_drill.drill_snapshots': 'MergeTree',
            'identity.uid_map': 'ReplacingMergeTree'
        },
        hasDistributed: false,
        hasReplication: false,
        nodeCount: 1,
        ports: [8123]
    },
    replicas: {
        config: { shards: false, replicas: true, isCloud: false },
        compose: 'docker-compose.replicas.yml',
        expectedEngines: {
            'countly_drill.drill_events_local': 'ReplicatedMergeTree',
            'countly_drill.drill_events': 'Distributed',
            'countly_drill.drill_snapshots_local': 'ReplicatedMergeTree',
            'countly_drill.drill_snapshots': 'Distributed',
            'identity.uid_map_local': 'ReplicatedReplacingMergeTree',
            'identity.uid_map': 'Distributed'
        },
        hasDistributed: true,
        hasReplication: true,
        nodeCount: 2,
        ports: [8123, 8124]
    },
    shards: {
        config: { shards: true, replicas: false, isCloud: false },
        compose: 'docker-compose.shards.yml',
        expectedEngines: {
            'countly_drill.drill_events_local': 'MergeTree',
            'countly_drill.drill_events': 'Distributed',
            'countly_drill.drill_snapshots_local': 'MergeTree',
            'countly_drill.drill_snapshots': 'Distributed',
            'identity.uid_map_local': 'ReplacingMergeTree',
            'identity.uid_map': 'Distributed'
        },
        expectedNotEngines: {
            'countly_drill.drill_events_local': 'Replicated',
            'countly_drill.drill_snapshots_local': 'Replicated',
            'identity.uid_map_local': 'Replicated'
        },
        hasDistributed: true,
        hasReplication: false,
        nodeCount: 2,
        ports: [8123, 8124]
    },
    ha: {
        config: { shards: true, replicas: true, isCloud: false },
        compose: 'docker-compose.ha.yml',
        expectedEngines: {
            'countly_drill.drill_events_local': 'ReplicatedMergeTree',
            'countly_drill.drill_events': 'Distributed',
            'countly_drill.drill_snapshots_local': 'ReplicatedMergeTree',
            'countly_drill.drill_snapshots': 'Distributed',
            'identity.uid_map_local': 'ReplicatedReplacingMergeTree',
            'identity.uid_map': 'Distributed'
        },
        hasDistributed: true,
        hasReplication: true,
        nodeCount: 4,
        ports: [8123, 8124, 8125, 8126]
    },
    cloud: {
        config: { shards: false, replicas: false, isCloud: true },
        compose: 'docker-compose.single.yml', // Use single node for cloud simulation
        expectedEngines: {
            // Cloud mode expects tables to already exist
            'countly_drill.drill_events': 'MergeTree',
            'countly_drill.drill_snapshots': 'MergeTree',
            'identity.uid_map': 'ReplacingMergeTree'
        },
        hasDistributed: false,
        hasReplication: false,
        nodeCount: 1,
        ports: [8123],
        skipDDL: true // Cloud mode skips DDL
    }
};

/**
 * Create a mock config object for ClusterManager
 * @param {string} mode - Mode name (single, replicas, shards, ha, cloud)
 * @param {number} port - ClickHouse HTTP port
 * @returns {Object} Config object
 */
function getModeConfig(mode, port = 8123) {
    const modeConfig = MODES[mode];
    if (!modeConfig) {
        throw new Error(`Unknown mode: ${mode}`);
    }

    return {
        clickhouse: {
            url: `http://localhost:${port}`,
            username: 'default',
            password: '',
            database: 'countly_drill',
            compression: { request: false, response: false },
            application: 'countly_drill',
            request_timeout: 60000,
            keep_alive: { enabled: true },
            max_open_connections: 10,
            clickhouse_settings: {
                allow_experimental_object_type: 1
            },
            cluster: {
                name: 'countly_cluster',
                ...modeConfig.config
            },
            replication: {
                coordinatorType: 'keeper',
                zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
                replicaName: '{replica}'
            },
            distributed: {
                writeThrough: true,
                insertDistributedSync: true
            }
        }
    };
}

/**
 * Create a ClickHouse client
 * @param {Object} config - Config object from getModeConfig
 * @param {Object} options - Optional settings
 * @param {boolean} options.skipDatabase - Don't set default database (for bootstrapping)
 * @returns {Object} ClickHouse client
 */
async function createTestClient(config, options = {}) {
    const { createClient } = require(path.join(PLUGIN_ROOT, 'node_modules/@clickhouse/client'));

    const clientConfig = {
        url: config.clickhouse.url,
        username: config.clickhouse.username,
        password: config.clickhouse.password,
        compression: config.clickhouse.compression,
        application: config.clickhouse.application,
        request_timeout: config.clickhouse.request_timeout,
        keep_alive: config.clickhouse.keep_alive,
        max_open_connections: config.clickhouse.max_open_connections,
        clickhouse_settings: config.clickhouse.clickhouse_settings
    };

    // Only set database if not skipping (for bootstrapping we skip so CREATE DATABASE works)
    if (!options.skipDatabase) {
        clientConfig.database = config.clickhouse.database;
    }

    return createClient(clientConfig);
}

/**
 * Wait for ClickHouse to be healthy
 * @param {number} port - ClickHouse HTTP port
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<boolean>}
 */
async function waitForHealthy(port = 8123, maxRetries = 30, retryDelay = 2000) {
    const http = require('http');

    for (let i = 0; i < maxRetries; i++) {
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:${port}/ping`, (res) => {
                    if (res.statusCode === 200) {
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}`));
                    }
                });
                req.on('error', reject);
                req.setTimeout(2000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
            return true;
        }
        catch (e) {
            if (i < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }
    }
    throw new Error(`ClickHouse not healthy after ${maxRetries} retries on port ${port}`);
}

/**
 * Wait for all nodes in a mode to be healthy
 * @param {string} mode - Mode name
 * @returns {Promise<void>}
 */
async function waitForAllNodes(mode) {
    const modeConfig = MODES[mode];
    for (const port of modeConfig.ports) {
        await waitForHealthy(port);
    }
}

/**
 * Drop all test databases
 * @param {Object} client - ClickHouse client
 * @param {Object} clusterManager - ClusterManager instance
 * @returns {Promise<void>}
 */
async function dropAllDatabases(client, clusterManager) {
    const onCluster = clusterManager.isClusterMode() ? `ON CLUSTER ${clusterManager.getClusterName()}` : '';
    const databases = ['countly_drill', 'identity'];

    for (const db of databases) {
        try {
            await client.exec({ query: `DROP DATABASE IF EXISTS ${db} ${onCluster}` });
        }
        catch (e) {
            // Ignore errors - database might not exist
        }
    }

    // Wait for propagation
    await sleep(2000);
}

/**
 * Get all tables in test databases
 * @param {Object} client - ClickHouse client
 * @returns {Promise<Array>} Array of table info objects
 */
async function getAllTables(client) {
    const result = await client.query({
        query: `
            SELECT database, name, engine, engine_full
            FROM system.tables
            WHERE database IN ('countly_drill', 'identity')
            ORDER BY database, name
        `,
        format: 'JSONEachRow'
    });
    return result.json();
}

/**
 * Validate table engines match expected
 * @param {Array} tables - Array of table info from getAllTables
 * @param {Object} expectedEngines - Map of table name to expected engine
 * @param {Object} expectedNotEngines - Map of table name to engines that should NOT be present
 * @returns {Object} Validation result with passed and failed arrays
 */
function validateTableEngines(tables, expectedEngines, expectedNotEngines = {}) {
    const results = { passed: [], failed: [] };
    const tableMap = {};

    for (const t of tables) {
        tableMap[`${t.database}.${t.name}`] = t;
    }

    // Check expected engines
    for (const [tableName, expectedEngine] of Object.entries(expectedEngines)) {
        const t = tableMap[tableName];
        if (!t) {
            results.failed.push(`Missing table: ${tableName}`);
        }
        else if (!t.engine.includes(expectedEngine.replace('Replicated', ''))) {
            results.failed.push(`${tableName} has engine ${t.engine}, expected ${expectedEngine}`);
        }
        else {
            results.passed.push(`${tableName} has correct engine: ${t.engine}`);
        }
    }

    // Check that certain engines are NOT present
    for (const [tableName, notEngine] of Object.entries(expectedNotEngines)) {
        const t = tableMap[tableName];
        if (t && t.engine.includes(notEngine)) {
            results.failed.push(`${tableName} should NOT have ${notEngine} engine, got: ${t.engine}`);
        }
    }

    return results;
}

/**
 * Get replication status for replicated tables
 * @param {Object} client - ClickHouse client
 * @returns {Promise<Array>} Array of replica info
 */
async function getReplicationStatus(client) {
    const result = await client.query({
        query: `
            SELECT database, table, replica_path, is_leader, total_replicas, active_replicas
            FROM system.replicas
            ORDER BY database, table
        `,
        format: 'JSONEachRow'
    });
    return result.json();
}

/**
 * Validate replication status
 * @param {Array} replicas - Array of replica info from getReplicationStatus
 * @param {number} expectedReplicas - Expected number of active replicas
 * @returns {Object} Validation result with passed and failed arrays
 */
function validateReplication(replicas, expectedReplicas = 2) {
    const results = { passed: [], failed: [] };

    if (replicas.length === 0) {
        results.failed.push('No replicated tables found');
        return results;
    }

    for (const r of replicas) {
        if (r.active_replicas >= expectedReplicas) {
            results.passed.push(`${r.database}.${r.table} has ${r.active_replicas} active replicas`);
        }
        else {
            results.failed.push(`${r.database}.${r.table} has only ${r.active_replicas} active replica(s), expected ${expectedReplicas}`);
        }
    }

    return results;
}

/**
 * Get distributed tables info
 * @param {Object} client - ClickHouse client
 * @returns {Promise<Array>} Array of distributed table info
 */
async function getDistributedTables(client) {
    const result = await client.query({
        query: `
            SELECT database, name, create_table_query
            FROM system.tables
            WHERE database IN ('countly_drill', 'identity')
              AND engine = 'Distributed'
            ORDER BY database, name
        `,
        format: 'JSONEachRow'
    });
    return result.json();
}

/**
 * Validate distributed tables have correct sharding keys
 * @param {Array} distributed - Array of distributed table info
 * @returns {Object} Validation result with passed and failed arrays
 */
function validateDistributedTables(distributed) {
    const results = { passed: [], failed: [] };

    for (const d of distributed) {
        const fullName = `${d.database}.${d.name}`;

        // drill_snapshots uses rand(), others use sipHash64
        if (d.name === 'drill_snapshots') {
            if (d.create_table_query.includes('rand()')) {
                results.passed.push(`${fullName} has correct sharding key (rand())`);
            }
            else {
                results.failed.push(`${fullName} missing rand() sharding key`);
            }
        }
        else {
            if (d.create_table_query.includes('sipHash64')) {
                results.passed.push(`${fullName} has correct sharding key (sipHash64)`);
            }
            else {
                results.failed.push(`${fullName} missing sipHash64 sharding key`);
            }
        }
    }

    return results;
}

/**
 * Start docker-compose for a mode
 * @param {string} mode - Mode name
 * @returns {Promise<void>}
 */
async function startDockerCompose(mode) {
    const modeConfig = MODES[mode];
    const composeFile = path.join(DOCKER_DIR, modeConfig.compose);

    console.log(`Starting docker-compose for ${mode} mode...`);

    try {
        execSync(`docker compose -f ${composeFile} up -d`, {
            cwd: DOCKER_DIR,
            stdio: 'inherit'
        });
    }
    catch (e) {
        throw new Error(`Failed to start docker-compose for ${mode}: ${e.message}`);
    }

    // Wait for nodes to be healthy
    console.log('Waiting for ClickHouse nodes to be healthy...');
    await waitForAllNodes(mode);
    console.log('All nodes healthy');
}

/**
 * Stop docker-compose for a mode and clean up volumes
 * @param {string} mode - Mode name
 * @returns {Promise<void>}
 */
async function stopDockerCompose(mode) {
    const modeConfig = MODES[mode];
    const composeFile = path.join(DOCKER_DIR, modeConfig.compose);

    console.log(`Stopping docker-compose for ${mode} mode...`);

    try {
        execSync(`docker compose -f ${composeFile} down -v`, {
            cwd: DOCKER_DIR,
            stdio: 'inherit'
        });
    }
    catch (e) {
        console.log(`Warning: Failed to stop docker-compose for ${mode}: ${e.message}`);
    }
}

/**
 * Check if docker-compose is running for a mode
 * @param {string} mode - Mode name
 * @returns {boolean}
 */
function isDockerComposeRunning(mode) {
    const modeConfig = MODES[mode];
    const composeFile = path.join(DOCKER_DIR, modeConfig.compose);

    try {
        const output = execSync(`docker compose -f ${composeFile} ps -q`, {
            cwd: DOCKER_DIR,
            encoding: 'utf8'
        });
        return output.trim().length > 0;
    }
    catch (e) {
        return false;
    }
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the ClusterManager class from plugin
 * @returns {Class}
 */
function getClusterManagerClass() {
    return require(path.join(PLUGIN_ROOT, 'api/managers/ClusterManager'));
}

/**
 * Get the SQLExecutor from plugin
 * @returns {Object}
 */
function getSQLExecutor() {
    return require(path.join(PLUGIN_ROOT, 'api/managers/SQLExecutor'));
}

/**
 * Get SQL files from the plugin
 * @returns {Array<Object>} Array of {name, content} objects
 */
function getSQLFiles() {
    const sqlDir = path.join(PLUGIN_ROOT, 'api/sql');
    const files = fs.readdirSync(sqlDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    return files.map(name => ({
        name,
        content: fs.readFileSync(path.join(sqlDir, name), 'utf8')
    }));
}

/**
 * Wait for a specific table to exist (polling-based)
 * @param {Object} client - ClickHouse client
 * @param {string} tableName - Full table name (database.table)
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<boolean>}
 */
async function waitForTableExists(client, tableName, maxRetries = 30, retryDelay = 500) {
    const [database, table] = tableName.includes('.') ? tableName.split('.') : ['default', tableName];

    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await client.query({
                query: `SELECT 1 FROM system.tables WHERE database = '${database}' AND name = '${table}'`,
                format: 'JSONEachRow'
            });
            const rows = await result.json();
            if (rows.length > 0) {
                return true;
            }
        }
        catch (e) {
            // Retry on error
        }
        await sleep(retryDelay);
    }
    return false;
}

/**
 * Wait for replication to sync for a table
 * @param {Object} client - ClickHouse client
 * @param {string} tableName - Table name (without database prefix)
 * @param {number} expectedReplicas - Expected number of active replicas
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<boolean>}
 */
async function waitForReplicationSync(client, tableName, expectedReplicas = 2, maxRetries = 60, retryDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await client.query({
                query: `SELECT active_replicas FROM system.replicas WHERE table = '${tableName}'`,
                format: 'JSONEachRow'
            });
            const rows = await result.json();
            if (rows.length > 0 && rows[0].active_replicas >= expectedReplicas) {
                return true;
            }
        }
        catch (e) {
            // Retry on error
        }
        await sleep(retryDelay);
    }
    return false;
}

/**
 * Wait for all expected tables to be created (polling-based replacement for sleep)
 * @param {Object} client - ClickHouse client
 * @param {Array<string>} expectedTables - Array of full table names (database.table)
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<{found: string[], missing: string[]}>}
 */
async function waitForTablesCreated(client, expectedTables, maxRetries = 30, retryDelay = 500) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await client.query({
                query: `
                    SELECT concat(database, '.', name) as full_name
                    FROM system.tables
                    WHERE database IN ('countly_drill', 'identity')
                `,
                format: 'JSONEachRow'
            });
            const rows = await result.json();
            const existingTables = new Set(rows.map(r => r.full_name));

            const found = expectedTables.filter(t => existingTables.has(t));
            const missing = expectedTables.filter(t => !existingTables.has(t));

            if (missing.length === 0) {
                return { found, missing: [] };
            }

            // If some tables still missing, wait and retry
            if (i < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }
        catch (e) {
            if (i < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }
    }

    // Final check
    const result = await client.query({
        query: `
            SELECT concat(database, '.', name) as full_name
            FROM system.tables
            WHERE database IN ('countly_drill', 'identity')
        `,
        format: 'JSONEachRow'
    });
    const rows = await result.json();
    const existingTables = new Set(rows.map(r => r.full_name));

    return {
        found: expectedTables.filter(t => existingTables.has(t)),
        missing: expectedTables.filter(t => !existingTables.has(t))
    };
}

/**
 * Format validation failures with detailed error messages
 * @param {Object} validation - Validation result with passed/failed arrays
 * @param {string} context - Context for error message (e.g., 'Table engine validation')
 * @throws {Error} If validation.failed is not empty
 */
function assertValidation(validation, context = 'Validation') {
    if (validation.failed.length > 0) {
        const details = validation.failed.map(f => `  - ${f}`).join('\n');
        throw new Error(`${context} failed:\n${details}`);
    }
}

module.exports = {
    MODES,
    PLUGIN_ROOT,
    DOCKER_DIR,
    CORE_DIR,
    getModeConfig,
    createTestClient,
    waitForHealthy,
    waitForAllNodes,
    dropAllDatabases,
    getAllTables,
    validateTableEngines,
    getReplicationStatus,
    validateReplication,
    getDistributedTables,
    validateDistributedTables,
    startDockerCompose,
    stopDockerCompose,
    isDockerComposeRunning,
    sleep,
    getClusterManagerClass,
    getSQLExecutor,
    getSQLFiles,
    setupModuleMocking,
    resetModuleMocking,
    createMockLogger,
    // Polling helpers (for replacing fixed sleep waits)
    waitForTableExists,
    waitForReplicationSync,
    waitForTablesCreated,
    assertValidation
};
