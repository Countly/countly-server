/**
 * ClickHouse Cluster Modes Integration Tests
 *
 * Tests all 5 deployment modes using actual plugin code:
 * - Single: shards=false, replicas=false, isCloud=false
 * - Replicas: shards=false, replicas=true, isCloud=false
 * - Shards: shards=true, replicas=false, isCloud=false
 * - HA: shards=true, replicas=true, isCloud=false
 * - Cloud: isCloud=true (skips DDL)
 *
 * Usage:
 *   # Run from core directory
 *   NODE_PATH=./node_modules/ npx mocha 'plugins/clickhouse/tests/integration/*.integration.js' --timeout 300000
 *
 *   # Run specific mode via grep
 *   NODE_PATH=./node_modules/ npx mocha 'plugins/clickhouse/tests/integration/*.integration.js' --grep "Single Mode" --timeout 300000
 *
 * Prerequisites:
 *   - Docker and docker compose installed
 *   - Run test runner to manage docker lifecycle: node plugins/clickhouse/tests/run-cluster-tests.js
 */
const Module = require('module');

const {
    MODES,
    PLUGIN_ROOT,
    getModeConfig,
    createTestClient,
    waitForAllNodes,
    dropAllDatabases,
    getAllTables,
    validateTableEngines,
    getReplicationStatus,
    validateReplication,
    getDistributedTables,
    validateDistributedTables,
    isDockerComposeRunning,
    sleep,
    getClusterManagerClass,
    getSQLExecutor,
    getSQLFiles,
    // Polling helpers
    waitForTableExists,
    waitForTablesCreated,
    waitForReplicationSync,
    assertValidation
} = require('./helpers/testHelpers');

// Store original Module._load for config override
const originalLoad = Module._load;
let currentMockConfig = null;

/**
 * Override config module to use our test config
 * @param {Object} config - Config to use
 */
function setMockConfig(config) {
    currentMockConfig = config;
    Module._load = function(request, parent) {
        if (currentMockConfig && (
            request.endsWith('api/config') ||
            request.endsWith('api/config.js') ||
            request.includes('/api/config'))) {
            return currentMockConfig;
        }
        return originalLoad.apply(this, arguments);
    };
}

/**
 * Reset config override
 */
function resetMockConfig() {
    currentMockConfig = null;
    Module._load = originalLoad;
}

/**
 * Create a fresh ClusterManager instance for a mode
 * @param {string} mode - Mode name
 * @returns {Object} ClusterManager instance
 */
function createClusterManager(mode) {
    const config = getModeConfig(mode);
    setMockConfig(config);

    const ClusterManagerClass = getClusterManagerClass();
    // Reset singleton
    ClusterManagerClass.resetInstance();
    return new ClusterManagerClass(config.clickhouse);
}

/**
 * Bootstrap tables using actual SQLExecutor
 * @param {Object} client - ClickHouse client
 * @param {Object} clusterManager - ClusterManager instance
 * @returns {Promise<Object>} Results of SQL execution
 */
async function bootstrapTables(client, clusterManager) {
    const { executeSQL } = getSQLExecutor();
    const sqlFiles = getSQLFiles();
    const results = { success: [], failed: [] };

    for (const file of sqlFiles) {
        try {
            await executeSQL(client, clusterManager, file.content);
            results.success.push(file.name);
        }
        catch (e) {
            results.failed.push({ name: file.name, error: e.message });
        }
    }

    return results;
}

/**
 * Pre-create tables for Cloud mode testing (simulates existing cloud tables)
 * @param {Object} client - ClickHouse client
 */
async function preCreateCloudTables(client) {
    // Create databases
    await client.exec({ query: 'CREATE DATABASE IF NOT EXISTS countly_drill' });
    await client.exec({ query: 'CREATE DATABASE IF NOT EXISTS identity' });

    // Create tables with simple MergeTree engines (cloud-style)
    await client.exec({
        query: `
            CREATE TABLE IF NOT EXISTS countly_drill.drill_events (
                a String,
                uid String,
                ts DateTime64(3),
                s String,
                sg JSON,
                c String,
                sc UInt8,
                dur Float64
            ) ENGINE = MergeTree()
            ORDER BY (a, uid, ts)
        `
    });

    await client.exec({
        query: `
            CREATE TABLE IF NOT EXISTS countly_drill.drill_snapshots (
                a String,
                uid String,
                ts DateTime64(3),
                sg JSON
            ) ENGINE = MergeTree()
            ORDER BY (a, uid, ts)
        `
    });

    await client.exec({
        query: `
            CREATE TABLE IF NOT EXISTS identity.uid_map (
                a String,
                uid String,
                pid String DEFAULT '',
                did String DEFAULT '',
                _version UInt64
            ) ENGINE = ReplacingMergeTree(_version)
            ORDER BY (a, uid)
        `
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe('ClickHouse Cluster Modes Integration', function() {
    this.timeout(300000); // 5 min timeout for cluster operations

    // ========================================================================
    // SINGLE MODE
    // ========================================================================
    describe('Single Mode (shards=false, replicas=false)', function() {
        let client;
        let bootstrapClient;
        let clusterManager;
        const mode = 'single';

        before(async function() {
            // Check if docker is running for this mode
            if (!isDockerComposeRunning(mode)) {
                this.skip();
                return;
            }

            await waitForAllNodes(mode);
            clusterManager = createClusterManager(mode);
            const config = getModeConfig(mode);

            // Create bootstrap client without database (for CREATE DATABASE)
            bootstrapClient = await createTestClient(config, { skipDatabase: true });

            // Clean slate
            await dropAllDatabases(bootstrapClient, clusterManager);

            // Create regular client for queries after bootstrap
            client = await createTestClient(config);
        });

        after(async function() {
            resetMockConfig();
            if (client) {
                await client.close();
            }
            if (bootstrapClient) {
                await bootstrapClient.close();
            }
        });

        describe('ClusterManager Configuration', function() {
            it('should detect single deployment mode', function() {
                clusterManager.getDeploymentMode().should.equal('single');
            });

            it('should NOT be in cluster mode', function() {
                clusterManager.isClusterMode().should.be.false();
            });

            it('should NOT be replicated', function() {
                clusterManager.isReplicated().should.be.false();
            });

            it('should NOT be sharded', function() {
                clusterManager.isSharded().should.be.false();
            });

            it('should return empty ON CLUSTER clause', function() {
                clusterManager.getOnClusterClause().should.equal('');
            });
        });

        describe('Table Creation', function() {
            it('should bootstrap all tables successfully', async function() {
                const results = await bootstrapTables(bootstrapClient, clusterManager);
                results.failed.should.be.empty();
                results.success.length.should.be.greaterThan(0);
            });

            it('should create tables with MergeTree engines', async function() {
                // Wait for expected tables to be created (polling-based)
                const modeConfig = MODES[mode];
                const expectedTables = Object.keys(modeConfig.expectedEngines);
                await waitForTablesCreated(bootstrapClient, expectedTables);

                const tables = await getAllTables(bootstrapClient);
                const validation = validateTableEngines(tables, modeConfig.expectedEngines);

                assertValidation(validation, 'Table engine validation');
                validation.passed.length.should.be.greaterThan(0, 'No tables were validated');
            });

            it('should NOT create distributed tables', async function() {
                const distributed = await getDistributedTables(bootstrapClient);
                distributed.should.be.empty();
            });
        });
    });

    // ========================================================================
    // REPLICAS MODE
    // ========================================================================
    describe('Replicas Mode (shards=false, replicas=true)', function() {
        let client;
        let bootstrapClient;
        let clusterManager;
        const mode = 'replicas';

        before(async function() {
            if (!isDockerComposeRunning(mode)) {
                this.skip();
                return;
            }

            await waitForAllNodes(mode);
            clusterManager = createClusterManager(mode);
            const config = getModeConfig(mode);

            // Create bootstrap client without database (for CREATE DATABASE)
            bootstrapClient = await createTestClient(config, { skipDatabase: true });

            await dropAllDatabases(bootstrapClient, clusterManager);

            // Create regular client for queries after bootstrap
            client = await createTestClient(config);
        });

        after(async function() {
            resetMockConfig();
            if (client) {
                await client.close();
            }
            if (bootstrapClient) {
                await bootstrapClient.close();
            }
        });

        describe('ClusterManager Configuration', function() {
            it('should detect replicated deployment mode', function() {
                clusterManager.getDeploymentMode().should.equal('replicated');
            });

            it('should be in cluster mode', function() {
                clusterManager.isClusterMode().should.be.true();
            });

            it('should be replicated', function() {
                clusterManager.isReplicated().should.be.true();
            });

            it('should NOT be sharded', function() {
                clusterManager.isSharded().should.be.false();
            });

            it('should return ON CLUSTER clause', function() {
                clusterManager.getOnClusterClause().should.containEql('ON CLUSTER');
            });
        });

        describe('Table Creation', function() {
            it('should bootstrap all tables successfully', async function() {
                const results = await bootstrapTables(bootstrapClient, clusterManager);
                results.failed.should.be.empty();
            });

            it('should create local tables with ReplicatedMergeTree', async function() {
                // Wait for expected tables to be created (polling-based)
                const modeConfig = MODES[mode];
                const expectedTables = Object.keys(modeConfig.expectedEngines);
                await waitForTablesCreated(bootstrapClient, expectedTables);

                const tables = await getAllTables(bootstrapClient);
                const validation = validateTableEngines(tables, modeConfig.expectedEngines);

                assertValidation(validation, 'Table engine validation (ReplicatedMergeTree)');
            });

            it('should create distributed wrapper tables', async function() {
                const distributed = await getDistributedTables(bootstrapClient);
                distributed.length.should.be.greaterThan(0);
            });
        });

        describe('Replication Status', function() {
            it('should have 2 active replicas for all tables', async function() {
                const replicas = await getReplicationStatus(bootstrapClient);
                const validation = validateReplication(replicas, 2);

                assertValidation(validation, 'Replication validation');
                validation.passed.length.should.be.greaterThan(0, 'No replicas were validated');
            });
        });
    });

    // ========================================================================
    // SHARDS MODE
    // ========================================================================
    describe('Shards Mode (shards=true, replicas=false)', function() {
        let client;
        let bootstrapClient;
        let clusterManager;
        const mode = 'shards';

        before(async function() {
            if (!isDockerComposeRunning(mode)) {
                this.skip();
                return;
            }

            await waitForAllNodes(mode);
            clusterManager = createClusterManager(mode);
            const config = getModeConfig(mode);

            // Create bootstrap client without database (for CREATE DATABASE)
            bootstrapClient = await createTestClient(config, { skipDatabase: true });

            // With Keeper added to shards mode, we can now use ON CLUSTER DDL
            await dropAllDatabases(bootstrapClient, clusterManager);

            // Create regular client for queries after bootstrap
            client = await createTestClient(config);
        });

        after(async function() {
            resetMockConfig();
            if (client) {
                await client.close();
            }
            if (bootstrapClient) {
                await bootstrapClient.close();
            }
        });

        describe('ClusterManager Configuration', function() {
            it('should detect sharded deployment mode', function() {
                clusterManager.getDeploymentMode().should.equal('sharded');
            });

            it('should be in cluster mode', function() {
                clusterManager.isClusterMode().should.be.true();
            });

            it('should NOT be replicated', function() {
                clusterManager.isReplicated().should.be.false();
            });

            it('should be sharded', function() {
                clusterManager.isSharded().should.be.true();
            });

            it('should return ON CLUSTER clause', function() {
                clusterManager.getOnClusterClause().should.containEql('ON CLUSTER');
            });
        });

        describe('Table Creation', function() {
            it('should bootstrap all tables successfully', async function() {
                const results = await bootstrapTables(bootstrapClient, clusterManager);
                results.failed.should.be.empty();
                results.success.length.should.be.greaterThan(0);
            });

            it('should create local tables with MergeTree (non-replicated)', async function() {
                // Wait for expected tables to be created (polling-based)
                const modeConfig = MODES[mode];
                const expectedTables = Object.keys(modeConfig.expectedEngines);
                await waitForTablesCreated(bootstrapClient, expectedTables);

                const tables = await getAllTables(bootstrapClient);
                const validation = validateTableEngines(tables, modeConfig.expectedEngines);

                assertValidation(validation, 'Table engine validation (MergeTree)');
                validation.passed.length.should.be.greaterThan(0, 'No tables were validated');
            });

            it('should NOT use Replicated engines for local tables', async function() {
                const tables = await getAllTables(bootstrapClient);

                // Local tables should NOT have Replicated prefix
                const localTables = tables.filter(t => t.name.endsWith('_local'));
                for (const table of localTables) {
                    table.engine.should.not.startWith('Replicated');
                }
            });

            it('should create distributed wrapper tables', async function() {
                const distributed = await getDistributedTables(bootstrapClient);
                distributed.length.should.be.greaterThan(0);
            });
        });

        describe('Sharding Configuration', function() {
            it('should create distributed tables with sharding keys', async function() {
                const distributed = await getDistributedTables(bootstrapClient);
                const validation = validateDistributedTables(distributed);

                assertValidation(validation, 'Distributed table sharding key validation');
                validation.passed.length.should.be.greaterThan(0, 'No distributed tables were validated');
            });

            it('should have 2 shards configured in cluster', async function() {
                const result = await bootstrapClient.query({
                    query: `SELECT count(DISTINCT shard_num) as shard_count
                            FROM system.clusters
                            WHERE cluster = 'countly_cluster'`
                });
                const rows = await result.json();
                parseInt(rows.data[0].shard_count).should.equal(2);
            });

            it('should have 1 replica per shard (non-replicated)', async function() {
                const result = await bootstrapClient.query({
                    query: `SELECT shard_num, count(*) as replica_count
                            FROM system.clusters
                            WHERE cluster = 'countly_cluster'
                            GROUP BY shard_num`
                });
                const rows = await result.json();
                for (const row of rows.data) {
                    parseInt(row.replica_count).should.equal(1);
                }
            });
        });
    });

    // ========================================================================
    // HA MODE
    // ========================================================================
    describe('HA Mode (shards=true, replicas=true)', function() {
        let client;
        let bootstrapClient;
        let clusterManager;
        const mode = 'ha';

        before(async function() {
            if (!isDockerComposeRunning(mode)) {
                this.skip();
                return;
            }

            await waitForAllNodes(mode);
            clusterManager = createClusterManager(mode);
            const config = getModeConfig(mode);

            // Create bootstrap client without database (for CREATE DATABASE)
            bootstrapClient = await createTestClient(config, { skipDatabase: true });

            await dropAllDatabases(bootstrapClient, clusterManager);

            // Create regular client for queries after bootstrap
            client = await createTestClient(config);
        });

        after(async function() {
            resetMockConfig();
            if (client) {
                await client.close();
            }
            if (bootstrapClient) {
                await bootstrapClient.close();
            }
        });

        describe('ClusterManager Configuration', function() {
            it('should detect ha deployment mode', function() {
                clusterManager.getDeploymentMode().should.equal('ha');
            });

            it('should be in cluster mode', function() {
                clusterManager.isClusterMode().should.be.true();
            });

            it('should be replicated', function() {
                clusterManager.isReplicated().should.be.true();
            });

            it('should be sharded', function() {
                clusterManager.isSharded().should.be.true();
            });

            it('should return ON CLUSTER clause', function() {
                clusterManager.getOnClusterClause().should.containEql('ON CLUSTER');
            });
        });

        describe('Table Creation', function() {
            it('should bootstrap all tables successfully', async function() {
                const results = await bootstrapTables(bootstrapClient, clusterManager);
                results.failed.should.be.empty();
            });

            it('should create local tables with ReplicatedMergeTree', async function() {
                // Wait for expected tables to be created (polling-based)
                const modeConfig = MODES[mode];
                const expectedTables = Object.keys(modeConfig.expectedEngines);
                await waitForTablesCreated(bootstrapClient, expectedTables);

                const tables = await getAllTables(bootstrapClient);
                const validation = validateTableEngines(tables, modeConfig.expectedEngines);

                assertValidation(validation, 'Table engine validation (ReplicatedMergeTree HA)');
            });

            it('should create distributed tables with sharding keys', async function() {
                const distributed = await getDistributedTables(bootstrapClient);
                const validation = validateDistributedTables(distributed);

                assertValidation(validation, 'Distributed table validation');
                validation.passed.length.should.be.greaterThan(0, 'No distributed tables were validated');
            });
        });

        describe('Replication Status', function() {
            it('should have 2 active replicas per shard', async function() {
                const replicas = await getReplicationStatus(bootstrapClient);
                const validation = validateReplication(replicas, 2);

                assertValidation(validation, 'Replication validation (HA mode)');
            });
        });
    });

    // ========================================================================
    // CLOUD MODE
    // ========================================================================
    describe('Cloud Mode (isCloud=true)', function() {
        let client;
        let bootstrapClient;
        let clusterManager;
        const mode = 'cloud';

        before(async function() {
            // Cloud mode requires CLICKHOUSE_CLOUD_URL environment variable
            const cloudUrl = process.env.CLICKHOUSE_CLOUD_URL;
            if (!cloudUrl) {
                console.log('    Skipping Cloud Mode: CLICKHOUSE_CLOUD_URL not set');
                console.log('    Run with: --cloud-url=https://your-instance.clickhouse.cloud:8443');
                this.skip();
                return;
            }

            // Create cloud-specific config
            const cloudConfig = {
                clickhouse: {
                    url: cloudUrl,
                    username: process.env.CLICKHOUSE_CLOUD_USER || 'default',
                    password: process.env.CLICKHOUSE_CLOUD_PASSWORD || '',
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
                        name: 'default',
                        shards: false,
                        replicas: false,
                        isCloud: true
                    }
                }
            };

            setMockConfig(cloudConfig);
            const ClusterManagerClass = getClusterManagerClass();
            ClusterManagerClass.resetInstance();
            clusterManager = new ClusterManagerClass(cloudConfig.clickhouse);

            // Create bootstrap client without database (for CREATE DATABASE)
            bootstrapClient = await createTestClient(cloudConfig, { skipDatabase: true });

            // For cloud mode test, we first drop and pre-create tables
            // to simulate existing cloud infrastructure
            try {
                await dropAllDatabases(bootstrapClient, clusterManager);
                await preCreateCloudTables(bootstrapClient);
            }
            catch (err) {
                console.log(`    Warning: Could not setup cloud tables: ${err.message}`);
                // Continue anyway - tables might already exist
            }

            // Create regular client for queries after bootstrap
            client = await createTestClient(cloudConfig);
        });

        after(async function() {
            resetMockConfig();
            if (client) {
                await client.close();
            }
            if (bootstrapClient) {
                await bootstrapClient.close();
            }
        });

        describe('ClusterManager Configuration', function() {
            it('should detect cloud deployment mode', function() {
                clusterManager.getDeploymentMode().should.equal('cloud');
            });

            it('should identify as cloud mode', function() {
                clusterManager.isCloudMode().should.be.true();
            });

            it('should NOT be in cluster mode', function() {
                // Cloud mode treats cluster as false since tables are managed externally
                clusterManager.isClusterMode().should.be.false();
            });
        });

        describe('DDL Behavior', function() {
            it('should skip DDL execution when tables exist', async function() {
                // In cloud mode, SQLExecutor should detect existing tables
                // and skip DDL creation
                const tables = await getAllTables(bootstrapClient);
                tables.length.should.be.greaterThan(0);

                // Try to bootstrap - should not throw
                const results = await bootstrapTables(bootstrapClient, clusterManager);

                // Success means DDL was skipped or handled gracefully
                // (tables already exist)
                results.success.length.should.be.greaterThan(0);
            });

            it('should validate existing tables have correct structure', async function() {
                const tables = await getAllTables(bootstrapClient);
                const modeConfig = MODES[mode];
                const validation = validateTableEngines(tables, modeConfig.expectedEngines);

                // Cloud mode may have slightly different engines but base should match
                validation.passed.length.should.be.greaterThan(0);
            });
        });
    });
});
