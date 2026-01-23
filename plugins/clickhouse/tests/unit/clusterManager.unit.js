/**
 * ClusterManager Unit Tests
 *
 * Tests all ClusterManager functionality including:
 * - Deployment mode detection
 * - Engine generation
 * - Table naming
 * - DDL helpers
 * - Configuration validation
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/clusterManager.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking } = require('./helpers/mockSetup');

// Direct require of ClusterManager (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const ClusterManager = require(path.join(PLUGIN_ROOT, 'api/managers/ClusterManager'));

describe('ClusterManager Unit Tests', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });
    // Reset singleton before each test
    beforeEach(function() {
        ClusterManager.resetInstance();
    });

    afterEach(function() {
        ClusterManager.resetInstance();
    });

    // ========================================================================
    // Deployment Mode Detection
    // ========================================================================
    describe('Deployment Mode Detection', function() {
        describe('getDeploymentMode()', function() {
            it('should return "single" for default config', function() {
                const cm = new ClusterManager({});
                cm.getDeploymentMode().should.equal('single');
            });

            it('should return "single" when shards=false, replicas=false', function() {
                const cm = new ClusterManager({
                    cluster: { shards: false, replicas: false }
                });
                cm.getDeploymentMode().should.equal('single');
            });

            it('should return "replicated" when shards=false, replicas=true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: false, replicas: true }
                });
                cm.getDeploymentMode().should.equal('replicated');
            });

            it('should return "sharded" when shards=true, replicas=false', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: false }
                });
                cm.getDeploymentMode().should.equal('sharded');
            });

            it('should return "ha" when shards=true, replicas=true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true }
                });
                cm.getDeploymentMode().should.equal('ha');
            });

            it('should return "cloud" when isCloud=true', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.getDeploymentMode().should.equal('cloud');
            });

            it('should prioritize cloud mode over shards/replicas', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true, isCloud: true }
                });
                cm.getDeploymentMode().should.equal('cloud');
            });
        });

        describe('isClusterMode()', function() {
            it('should return false for single mode', function() {
                const cm = new ClusterManager({});
                cm.isClusterMode().should.be.false();
            });

            it('should return true when replicas=true', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                cm.isClusterMode().should.be.true();
            });

            it('should return true when shards=true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true }
                });
                cm.isClusterMode().should.be.true();
            });

            it('should return true when both shards and replicas are true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true }
                });
                cm.isClusterMode().should.be.true();
            });
        });

        describe('isReplicated()', function() {
            it('should return false for single mode', function() {
                const cm = new ClusterManager({});
                cm.isReplicated().should.be.false();
            });

            it('should return true when replicas=true', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                cm.isReplicated().should.be.true();
            });

            it('should return false in cloud mode even with replicas=true', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true, isCloud: true }
                });
                cm.isReplicated().should.be.false();
            });
        });

        describe('isSharded()', function() {
            it('should return false for single mode', function() {
                const cm = new ClusterManager({});
                cm.isSharded().should.be.false();
            });

            it('should return true when shards=true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true }
                });
                cm.isSharded().should.be.true();
            });

            it('should return false in cloud mode even with shards=true', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, isCloud: true }
                });
                cm.isSharded().should.be.false();
            });
        });

        describe('isCloudMode()', function() {
            it('should return false by default', function() {
                const cm = new ClusterManager({});
                cm.isCloudMode().should.be.false();
            });

            it('should return true when isCloud=true', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.isCloudMode().should.be.true();
            });
        });
    });

    // ========================================================================
    // Table Naming
    // ========================================================================
    describe('Table Naming', function() {
        describe('getLocalTableName()', function() {
            it('should return base name for single mode', function() {
                const cm = new ClusterManager({});
                cm.getLocalTableName('drill_events').should.equal('drill_events');
            });

            it('should return name with _local suffix for cluster mode', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                cm.getLocalTableName('drill_events').should.equal('drill_events_local');
            });

            it('should return name with _local suffix for sharded mode', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true }
                });
                cm.getLocalTableName('drill_events').should.equal('drill_events_local');
            });

            it('should return base name for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.getLocalTableName('drill_events').should.equal('drill_events');
            });
        });

        describe('getDistributedTableName()', function() {
            it('should always return the base table name', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true }
                });
                cm.getDistributedTableName('drill_events').should.equal('drill_events');
            });
        });

        describe('shouldCreateDistributedTable()', function() {
            it('should return false for single mode', function() {
                const cm = new ClusterManager({});
                cm.shouldCreateDistributedTable().should.be.false();
            });

            it('should return true for cluster mode', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                cm.shouldCreateDistributedTable().should.be.true();
            });

            it('should return false for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.shouldCreateDistributedTable().should.be.false();
            });
        });

        describe('getInsertTable()', function() {
            it('should return base name for single mode', function() {
                const cm = new ClusterManager({});
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should return base name for cluster mode with writeThrough=true', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { writeThrough: true }
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should return _local name for cluster mode with writeThrough=false', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { writeThrough: false }
                });
                cm.getInsertTable('drill_events').should.equal('drill_events_local');
            });

            it('should return base name for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should prepend database if provided', function() {
                const cm = new ClusterManager({});
                cm.getInsertTable('drill_events', 'countly_drill').should.equal('countly_drill.drill_events');
            });

            it('should prepend database with _local suffix for cluster mode with writeThrough=false', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { writeThrough: false }
                });
                cm.getInsertTable('drill_events', 'countly_drill').should.equal('countly_drill.drill_events_local');
            });
        });

        describe('getFullInsertTable()', function() {
            it('should return database.table format', function() {
                const cm = new ClusterManager({});
                cm.getFullInsertTable('countly_drill', 'drill_events').should.equal('countly_drill.drill_events');
            });
        });
    });

    // ========================================================================
    // DDL Helpers
    // ========================================================================
    describe('DDL Helpers', function() {
        describe('getOnClusterClause()', function() {
            it('should return empty string for single mode', function() {
                const cm = new ClusterManager({});
                cm.getOnClusterClause().should.equal('');
            });

            it('should return ON CLUSTER clause for cluster mode', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true, name: 'my_cluster' }
                });
                cm.getOnClusterClause().should.equal('ON CLUSTER my_cluster');
            });

            it('should return empty string for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                cm.getOnClusterClause().should.equal('');
            });

            it('should use default cluster name if not specified', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                cm.getOnClusterClause().should.equal('ON CLUSTER countly_cluster');
            });
        });

        describe('getZkPath()', function() {
            it('should generate path with database and table placeholders replaced', function() {
                const cm = new ClusterManager({});
                const zkPath = cm.getZkPath('mydb', 'mytable');
                zkPath.should.containEql('mydb');
                zkPath.should.containEql('mytable');
                zkPath.should.containEql('{shard}');
            });

            it('should use custom zkPath template if configured', function() {
                const cm = new ClusterManager({
                    replication: {
                        zkPath: '/custom/{database}/{table}'
                    }
                });
                cm.getZkPath('mydb', 'mytable').should.equal('/custom/mydb/mytable');
            });
        });

        describe('getReplicaName()', function() {
            it('should return default replica name', function() {
                const cm = new ClusterManager({});
                cm.getReplicaName().should.equal('{replica}');
            });

            it('should return custom replica name if configured', function() {
                const cm = new ClusterManager({
                    replication: { replicaName: 'my_replica' }
                });
                cm.getReplicaName().should.equal('my_replica');
            });
        });
    });

    // ========================================================================
    // Engine Generation
    // ========================================================================
    describe('Engine Generation', function() {
        describe('getMergeTreeEngine()', function() {
            it('should return MergeTree()', function() {
                const cm = new ClusterManager({});
                cm.getMergeTreeEngine().should.equal('MergeTree()');
            });
        });

        describe('getReplicatedMergeTreeEngine()', function() {
            it('should return ReplicatedMergeTree with zkPath and replica', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedMergeTreeEngine('/zk/path');
                engine.should.equal("ReplicatedMergeTree('/zk/path', '{replica}')");
            });

            it('should use custom replica name', function() {
                const cm = new ClusterManager({
                    replication: { replicaName: 'node1' }
                });
                const engine = cm.getReplicatedMergeTreeEngine('/zk/path');
                engine.should.equal("ReplicatedMergeTree('/zk/path', 'node1')");
            });
        });

        describe('getReplacingMergeTreeEngine()', function() {
            it('should return ReplacingMergeTree with version column', function() {
                const cm = new ClusterManager({});
                cm.getReplacingMergeTreeEngine('ts').should.equal('ReplacingMergeTree(ts)');
            });
        });

        describe('getReplicatedReplacingMergeTreeEngine()', function() {
            it('should return ReplicatedReplacingMergeTree with all parameters', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedReplacingMergeTreeEngine('/zk/path', 'ts');
                engine.should.equal("ReplicatedReplacingMergeTree('/zk/path', '{replica}', ts)");
            });
        });

        describe('getReplicatedEngine()', function() {
            it('should convert MergeTree to ReplicatedMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('MergeTree', '/zk/path');
                engine.should.equal("ReplicatedMergeTree('/zk/path', '{replica}')");
            });

            it('should convert ReplacingMergeTree to ReplicatedReplacingMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('ReplacingMergeTree', '/zk/path');
                engine.should.equal("ReplicatedReplacingMergeTree('/zk/path', '{replica}')");
            });

            it('should handle ReplacingMergeTree(column) syntax', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('ReplacingMergeTree(ts)', '/zk/path');
                engine.should.equal("ReplicatedReplacingMergeTree('/zk/path', '{replica}', ts)");
            });

            it('should handle SummingMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('SummingMergeTree', '/zk/path');
                engine.should.equal("ReplicatedSummingMergeTree('/zk/path', '{replica}')");
            });

            it('should handle AggregatingMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('AggregatingMergeTree', '/zk/path');
                engine.should.equal("ReplicatedAggregatingMergeTree('/zk/path', '{replica}')");
            });

            it('should handle unknown engines by prepending Replicated', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('CustomMergeTree', '/zk/path');
                engine.should.equal("ReplicatedCustomMergeTree('/zk/path', '{replica}')");
            });
        });

        describe('getEngineForTable()', function() {
            it('should return MergeTree for single mode', function() {
                const cm = new ClusterManager({});
                const engine = cm.getEngineForTable('mydb', 'mytable', 'MergeTree');
                engine.should.equal('MergeTree()');
            });

            it('should return ReplicatedMergeTree for replicated mode', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                const engine = cm.getEngineForTable('mydb', 'mytable', 'MergeTree');
                engine.should.containEql('ReplicatedMergeTree');
                engine.should.containEql('mydb');
                engine.should.containEql('mytable');
            });

            it('should return ReplacingMergeTree for single mode with versionColumn', function() {
                const cm = new ClusterManager({});
                const engine = cm.getEngineForTable('mydb', 'mytable', 'ReplacingMergeTree', { versionColumn: 'ts' });
                engine.should.equal('ReplacingMergeTree(ts)');
            });

            it('should return ReplicatedReplacingMergeTree for replicated mode with versionColumn', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                });
                const engine = cm.getEngineForTable('mydb', 'mytable', 'ReplacingMergeTree', { versionColumn: 'ts' });
                engine.should.containEql('ReplicatedReplacingMergeTree');
                engine.should.containEql('ts');
            });

            it('should return MergeTree for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                const engine = cm.getEngineForTable('mydb', 'mytable', 'MergeTree');
                engine.should.equal('MergeTree()');
            });

            it('should return ReplacingMergeTree for cloud mode with versionColumn', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true }
                });
                const engine = cm.getEngineForTable('mydb', 'mytable', 'ReplacingMergeTree', { versionColumn: 'ts' });
                engine.should.equal('ReplacingMergeTree(ts)');
            });

            it('should return MergeTree for sharded (non-replicated) mode', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: false }
                });
                const engine = cm.getEngineForTable('mydb', 'mytable', 'MergeTree');
                engine.should.equal('MergeTree()');
            });
        });
    });

    // ========================================================================
    // Query Settings
    // ========================================================================
    describe('Query Settings', function() {
        describe('getParallelReplicaSettings()', function() {
            it('should return empty object when parallel replicas disabled', function() {
                const cm = new ClusterManager({});
                cm.getParallelReplicaSettings().should.deepEqual({});
            });

            it('should return settings when parallel replicas enabled', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    parallelReplicas: { enabled: true, maxParallelReplicas: 4 }
                });
                const settings = cm.getParallelReplicaSettings();
                settings.enable_parallel_replicas.should.equal(1);
                settings.max_parallel_replicas.should.equal(4);
                settings.cluster_for_parallel_replicas.should.equal('countly_cluster');
            });

            it('should use "default" cluster for cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true },
                    parallelReplicas: { enabled: true }
                });
                const settings = cm.getParallelReplicaSettings();
                settings.cluster_for_parallel_replicas.should.equal('default');
            });
        });

        describe('getDistributedWriteSettings()', function() {
            it('should return empty object for single mode', function() {
                const cm = new ClusterManager({});
                cm.getDistributedWriteSettings().should.deepEqual({});
            });

            it('should return settings for cluster mode', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { insertDistributedSync: true }
                });
                const settings = cm.getDistributedWriteSettings();
                settings.insert_distributed_sync.should.equal(1);
            });

            it('should respect insertDistributedSync=false', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { insertDistributedSync: false }
                });
                const settings = cm.getDistributedWriteSettings();
                settings.insert_distributed_sync.should.equal(0);
            });
        });

        describe('getClusterQuerySettings()', function() {
            it('should return empty object for single mode', function() {
                const cm = new ClusterManager({});
                cm.getClusterQuerySettings().should.deepEqual({});
            });

            it('should return optimization settings for cluster mode', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true }
                });
                const settings = cm.getClusterQuerySettings();
                settings.optimize_skip_unused_shards.should.equal(1);
                settings.optimize_distributed_group_by_sharding_key.should.equal(1);
            });
        });

        describe('getAllClusterSettings()', function() {
            it('should combine all settings', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true },
                    parallelReplicas: { enabled: true },
                    distributed: { insertDistributedSync: true }
                });
                const settings = cm.getAllClusterSettings();
                settings.should.have.property('enable_parallel_replicas');
                settings.should.have.property('insert_distributed_sync');
                settings.should.have.property('optimize_skip_unused_shards');
            });
        });
    });

    // ========================================================================
    // Configuration
    // ========================================================================
    describe('Configuration', function() {
        describe('getClusterName()', function() {
            it('should return default cluster name', function() {
                const cm = new ClusterManager({});
                cm.getClusterName().should.equal('countly_cluster');
            });

            it('should return custom cluster name', function() {
                const cm = new ClusterManager({
                    cluster: { name: 'my_cluster' }
                });
                cm.getClusterName().should.equal('my_cluster');
            });
        });

        describe('getCoordinatorType()', function() {
            it('should return default coordinator type', function() {
                const cm = new ClusterManager({});
                cm.getCoordinatorType().should.equal('keeper');
            });

            it('should return custom coordinator type', function() {
                const cm = new ClusterManager({
                    replication: { coordinatorType: 'zookeeper' }
                });
                cm.getCoordinatorType().should.equal('zookeeper');
            });
        });

        describe('isWriteThroughEnabled()', function() {
            it('should return true by default', function() {
                const cm = new ClusterManager({});
                cm.isWriteThroughEnabled().should.be.true();
            });

            it('should return false when configured', function() {
                const cm = new ClusterManager({
                    distributed: { writeThrough: false }
                });
                cm.isWriteThroughEnabled().should.be.false();
            });
        });

        describe('getConfigSummary()', function() {
            it('should return all configuration fields', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true }
                });
                const summary = cm.getConfigSummary();
                summary.should.have.property('shards', true);
                summary.should.have.property('replicas', true);
                summary.should.have.property('deploymentMode', 'ha');
                summary.should.have.property('isReplicated', true);
                summary.should.have.property('isSharded', true);
            });
        });
    });

    // ========================================================================
    // Validation
    // ========================================================================
    describe('Configuration Validation', function() {
        describe('validateConfig()', function() {
            it('should return valid for correct single mode config', function() {
                const cm = new ClusterManager({});
                const result = cm.validateConfig();
                result.valid.should.be.true();
                result.fatal.should.be.false();
            });

            it('should return valid for correct cluster mode config', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true, name: 'my_cluster' }
                });
                const result = cm.validateConfig();
                result.valid.should.be.true();
            });

            it('should warn about cloud mode ignoring shards/replicas', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true, isCloud: true }
                });
                const result = cm.validateConfig();
                result.warnings.length.should.be.greaterThan(0);
                result.warnings.some(w => w.includes('Cloud mode')).should.be.true();
            });

            it('should warn about parallel replicas without cluster mode', function() {
                const cm = new ClusterManager({
                    parallelReplicas: { enabled: true }
                });
                const result = cm.validateConfig();
                result.warnings.some(w => w.includes('parallelReplicas')).should.be.true();
            });

            it('should warn about sharding-only mode lacking redundancy', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: false }
                });
                const result = cm.validateConfig();
                result.warnings.some(w => w.includes('no data redundancy')).should.be.true();
            });

            it('should error on invalid coordinator type', function() {
                const cm = new ClusterManager({
                    replication: { coordinatorType: 'invalid' }
                });
                const result = cm.validateConfig();
                result.errors.some(e => e.includes('Invalid coordinator type')).should.be.true();
            });

            it('should error on cluster mode without cluster name', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true, name: '' }
                });
                const result = cm.validateConfig();
                result.errors.some(e => e.includes('cluster name')).should.be.true();
            });
        });
    });

    // ========================================================================
    // Singleton Pattern
    // ========================================================================
    describe('Singleton Pattern', function() {
        it('should return same instance on multiple constructor calls', function() {
            const cm1 = new ClusterManager({ cluster: { replicas: true } });
            const cm2 = new ClusterManager({ cluster: { shards: true } });
            cm1.should.equal(cm2);
            cm1.isReplicated().should.be.true(); // Original config preserved
        });

        it('should create new instance after resetInstance()', function() {
            const cm1 = new ClusterManager({ cluster: { replicas: true } });
            ClusterManager.resetInstance();
            const cm2 = new ClusterManager({ cluster: { shards: true } });
            cm1.should.not.equal(cm2);
            cm2.isSharded().should.be.true();
        });
    });

    // ========================================================================
    // Backward Compatibility
    // ========================================================================
    describe('Backward Compatibility', function() {
        it('should convert mode="replicated" to replicas=true', function() {
            const cm = new ClusterManager({
                cluster: { mode: 'replicated' }
            });
            cm.isReplicated().should.be.true();
            cm.isSharded().should.be.false();
        });

        it('should convert mode="sharded" to shards=true', function() {
            const cm = new ClusterManager({
                cluster: { mode: 'sharded' }
            });
            cm.isSharded().should.be.true();
            cm.isReplicated().should.be.false();
        });

        it('should convert mode="ha" to both shards and replicas', function() {
            const cm = new ClusterManager({
                cluster: { mode: 'ha' }
            });
            cm.isSharded().should.be.true();
            cm.isReplicated().should.be.true();
        });

        it('should handle enabled=false to disable cluster', function() {
            const cm = new ClusterManager({
                cluster: { enabled: false }
            });
            cm.isClusterMode().should.be.false();
        });

        it('should warn about deprecated mode config', function() {
            const cm = new ClusterManager({
                cluster: { mode: 'replicated' }
            });
            const result = cm.validateConfig();
            result.warnings.some(w => w.includes('Deprecated')).should.be.true();
        });
    });

    // ========================================================================
    // Additional Edge Cases
    // ========================================================================
    describe('Additional Edge Cases', function() {
        describe('getInsertTable() edge cases', function() {
            it('should default to writeThrough=true when distributed config missing', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true }
                    // distributed not set
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should handle undefined distributed.writeThrough', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: {} // writeThrough not set
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should handle HA mode with writeThrough enabled', function() {
                const cm = new ClusterManager({
                    cluster: { shards: true, replicas: true },
                    distributed: { writeThrough: true }
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should throw error for HA mode with writeThrough disabled (invalid config)', function() {
                should.throws(function() {
                    new ClusterManager({
                        cluster: { shards: true, replicas: true },
                        distributed: { writeThrough: false }
                    });
                }, /writeThrough.*not allowed with sharding/);
            });
        });

        describe('getZkPath() edge cases', function() {
            it('should handle database with underscores', function() {
                const cm = new ClusterManager({});
                const zkPath = cm.getZkPath('my_db_name', 'my_table');
                zkPath.should.containEql('my_db_name');
            });

            it('should handle table with underscores', function() {
                const cm = new ClusterManager({});
                const zkPath = cm.getZkPath('mydb', 'drill_events_local');
                zkPath.should.containEql('drill_events_local');
            });

            it('should handle empty zkPath template gracefully', function() {
                const cm = new ClusterManager({
                    replication: { zkPath: '' }
                });
                const zkPath = cm.getZkPath('mydb', 'mytable');
                // Should use default when empty
                zkPath.should.be.a.String();
            });

            it('should handle missing replication config', function() {
                const cm = new ClusterManager({});
                const zkPath = cm.getZkPath('mydb', 'mytable');
                zkPath.should.containEql('/clickhouse/tables');
            });
        });

        describe('getReplicaName() edge cases', function() {
            it('should handle empty replicaName', function() {
                const cm = new ClusterManager({
                    replication: { replicaName: '' }
                });
                cm.getReplicaName().should.equal('{replica}'); // Should use default
            });

            it('should handle null replication config', function() {
                const cm = new ClusterManager({
                    replication: null
                });
                cm.getReplicaName().should.equal('{replica}');
            });
        });

        describe('Configuration validation edge cases', function() {
            it('should handle completely empty config', function() {
                const cm = new ClusterManager();
                const result = cm.validateConfig();
                result.valid.should.be.true();
            });

            it('should handle undefined cluster config', function() {
                const cm = new ClusterManager({ cluster: undefined });
                cm.isClusterMode().should.be.false();
            });

            it('should handle null cluster config', function() {
                const cm = new ClusterManager({ cluster: null });
                cm.isClusterMode().should.be.false();
            });

            it('should handle writeThrough with single mode (no effect)', function() {
                const cm = new ClusterManager({
                    distributed: { writeThrough: false }
                });
                cm.getInsertTable('drill_events').should.equal('drill_events');
            });

            it('should handle parallelReplicas in cloud mode', function() {
                const cm = new ClusterManager({
                    cluster: { isCloud: true },
                    parallelReplicas: { enabled: true, maxParallelReplicas: 8 }
                });
                const settings = cm.getParallelReplicaSettings();
                settings.max_parallel_replicas.should.equal(8);
            });

            it('should use default maxParallelReplicas when not specified', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    parallelReplicas: { enabled: true }
                });
                const settings = cm.getParallelReplicaSettings();
                settings.should.have.property('max_parallel_replicas');
            });
        });

        describe('Engine generation edge cases', function() {
            it('should handle CollapsingMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('CollapsingMergeTree(sign)', '/zk/path');
                engine.should.containEql('Replicated');
                engine.should.containEql('CollapsingMergeTree');
            });

            it('should handle VersionedCollapsingMergeTree', function() {
                const cm = new ClusterManager({});
                const engine = cm.getReplicatedEngine('VersionedCollapsingMergeTree(sign, version)', '/zk/path');
                engine.should.containEql('Replicated');
            });

            it('should handle MergeTree with ORDER BY in engine string', function() {
                const cm = new ClusterManager({});
                const engine = cm.getMergeTreeEngine();
                engine.should.equal('MergeTree()');
            });
        });

        describe('getFullInsertTable() edge cases', function() {
            it('should handle identity database', function() {
                const cm = new ClusterManager({});
                cm.getFullInsertTable('identity', 'uid_map').should.equal('identity.uid_map');
            });

            it('should handle cluster mode with identity database', function() {
                const cm = new ClusterManager({
                    cluster: { replicas: true },
                    distributed: { writeThrough: false }
                });
                cm.getFullInsertTable('identity', 'uid_map').should.equal('identity.uid_map_local');
            });
        });
    });
});
