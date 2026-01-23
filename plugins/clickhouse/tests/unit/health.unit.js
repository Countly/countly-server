/**
 * Health Unit Tests
 *
 * Tests all health.js functions including:
 * - getOperationalSnapshot
 * - getBackpressureSnapshot
 * - getHealthSummary
 * - getMutationStatus
 * - listPendingMutations
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/health.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking, setMockCommonOverrides, resetMockCommonOverrides } = require('./helpers/mockSetup');

// Direct require of health (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
var health;

describe('Health Unit Tests', function() {
    beforeEach(function() {
        resetMockCommonOverrides();
    });

    afterEach(function() {
        resetMockCommonOverrides();
    });
    before(function() {
        setupMocking();
        health = require(path.join(PLUGIN_ROOT, 'api/health'));
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // getOperationalSnapshot()
    // ========================================================================
    describe('getOperationalSnapshot()', function() {
        it('should return default values when clickhouseQueryService is not available', async function() {
            // common.clickhouseQueryService is null by default in mock
            const result = await health.getOperationalSnapshot({});
            result.should.have.property('merges_in_progress', 0);
            result.should.have.property('active_merges', 0);
            result.should.have.property('max_parts_per_partition', 0);
            result.should.have.property('total_merge_tree_parts', 0);
        });

        it('should throw when database is missing', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => []
                }
            });

            await should(health.getOperationalSnapshot({ table: 'test' }))
                .be.rejectedWith(/requires database and table/);
        });

        it('should throw when table is missing', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => []
                }
            });

            await should(health.getOperationalSnapshot({ database: 'test' }))
                .be.rejectedWith(/requires database and table/);
        });

        it('should return operational metrics from ClickHouse', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: 5,
                        active_merges: 2,
                        max_parts_per_partition: 100,
                        total_merge_tree_parts: 500
                    }]
                }
            });

            const result = await health.getOperationalSnapshot({ database: 'countly_drill', table: 'drill_events' });
            result.merges_in_progress.should.equal(5);
            result.active_merges.should.equal(2);
            result.max_parts_per_partition.should.equal(100);
            result.total_merge_tree_parts.should.equal(500);
        });

        it('should handle empty result from ClickHouse', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => []
                }
            });

            const result = await health.getOperationalSnapshot({ database: 'countly_drill', table: 'drill_events' });
            result.merges_in_progress.should.equal(0);
            result.active_merges.should.equal(0);
        });

        it('should convert string values to numbers', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: '10',
                        active_merges: '3',
                        max_parts_per_partition: '50',
                        total_merge_tree_parts: '200'
                    }]
                }
            });

            const result = await health.getOperationalSnapshot({ database: 'countly_drill', table: 'drill_events' });
            result.merges_in_progress.should.be.a.Number();
            result.merges_in_progress.should.equal(10);
        });
    });

    // ========================================================================
    // getBackpressureSnapshot()
    // ========================================================================
    describe('getBackpressureSnapshot()', function() {
        beforeEach(function() {
            // Set up mock DB for threshold lookup
            setMockCommonOverrides({
                db: {
                    collection: () => ({
                        findOne: async() => ({
                            mutation_manager: {
                                ch_max_parts_per_partition: 1000,
                                ch_max_total_mergetree_parts: 100000
                            }
                        })
                    })
                }
            });
        });

        it('should return low risk for healthy metrics', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 100,
                total_merge_tree_parts: 5000
            });
            result.deferred_due_to_clickhouse.should.be.false();
            result.risk_level.should.equal('low');
        });

        it('should detect critical risk when max_parts_per_partition exceeded', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 1000, // equals threshold
                total_merge_tree_parts: 5000
            });
            result.deferred_due_to_clickhouse.should.be.true();
            result.defer_reason.should.equal('max_parts_per_partition');
            result.risk_level.should.equal('critical');
        });

        it('should detect critical risk when total_merge_tree_parts exceeded', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 100,
                total_merge_tree_parts: 100000 // equals threshold
            });
            result.deferred_due_to_clickhouse.should.be.true();
            result.defer_reason.should.equal('total_merge_tree_parts');
            result.risk_level.should.equal('critical');
        });

        it('should detect moderate risk when approaching limits (80%)', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 800, // 80% of 1000
                total_merge_tree_parts: 5000
            });
            result.deferred_due_to_clickhouse.should.be.false();
            result.approaching_limits.should.be.true();
            result.risk_level.should.equal('moderate');
        });

        it('should detect high risk when near limits (90%)', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 900, // 90% of 1000
                total_merge_tree_parts: 5000
            });
            result.deferred_due_to_clickhouse.should.be.false();
            result.risk_level.should.equal('high');
        });

        it('should include utilization values', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 500,
                total_merge_tree_parts: 50000
            });
            result.utilization.should.have.property('max_parts_per_partition');
            result.utilization.should.have.property('total_merge_tree_parts');
            result.utilization.max_parts_per_partition.should.equal(0.5); // 500/1000
            result.utilization.total_merge_tree_parts.should.equal(0.5); // 50000/100000
        });

        it('should include thresholds in response', async function() {
            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 100,
                total_merge_tree_parts: 5000
            });
            result.thresholds.should.have.property('CH_MAX_PARTS_PER_PARTITION', 1000);
            result.thresholds.should.have.property('CH_MAX_TOTAL_MERGETREE_PARTS', 100000);
        });

        it('should use default thresholds when configured thresholds are zero', async function() {
            // When thresholds are 0, the code falls back to defaults (1000, 100000)
            setMockCommonOverrides({
                db: {
                    collection: () => ({
                        findOne: async() => ({
                            mutation_manager: {
                                ch_max_parts_per_partition: 0,
                                ch_max_total_mergetree_parts: 0
                            }
                        })
                    })
                }
            });

            const result = await health.getBackpressureSnapshot({
                max_parts_per_partition: 100,
                total_merge_tree_parts: 5000
            });
            result.deferred_due_to_clickhouse.should.be.false();
            // Default thresholds are used: 1000 and 100000
            result.thresholds.CH_MAX_PARTS_PER_PARTITION.should.equal(1000);
            result.thresholds.CH_MAX_TOTAL_MERGETREE_PARTS.should.equal(100000);
            result.utilization.max_parts_per_partition.should.equal(0.1); // 100/1000
        });
    });

    // ========================================================================
    // getHealthSummary()
    // ========================================================================
    describe('getHealthSummary()', function() {
        it('should return unhealthy status when clickhouseQueryService unavailable', async function() {
            // common.clickhouseQueryService is null by default
            const result = await health.getHealthSummary({});
            result.provider.should.equal('clickhouse');
            result.healthy.should.be.false();
            result.issues.should.containEql('service_unavailable');
        });

        it('should return healthy status for good metrics', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: 2,
                        active_merges: 1,
                        max_parts_per_partition: 100,
                        total_merge_tree_parts: 5000
                    }]
                },
                db: {
                    collection: () => ({
                        findOne: async() => ({
                            mutation_manager: {
                                ch_max_parts_per_partition: 1000,
                                ch_max_total_mergetree_parts: 100000
                            }
                        })
                    })
                }
            });

            const result = await health.getHealthSummary({ database: 'countly_drill', table: 'drill_events' });
            result.healthy.should.be.true();
            result.issues.should.have.length(0);
        });

        it('should include metrics in response', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: 2,
                        active_merges: 1,
                        max_parts_per_partition: 100,
                        total_merge_tree_parts: 5000
                    }]
                },
                db: {
                    collection: () => ({
                        findOne: async() => null
                    })
                }
            });

            const result = await health.getHealthSummary({ database: 'countly_drill', table: 'drill_events' });
            result.metrics.should.have.property('clickhouse_snapshot');
            result.metrics.should.have.property('backpressure');
        });

        it('should report backpressure issue when limits exceeded', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: 2,
                        active_merges: 1,
                        max_parts_per_partition: 1000, // at threshold
                        total_merge_tree_parts: 5000
                    }]
                },
                db: {
                    collection: () => ({
                        findOne: async() => ({
                            mutation_manager: {
                                ch_max_parts_per_partition: 1000,
                                ch_max_total_mergetree_parts: 100000
                            }
                        })
                    })
                }
            });

            const result = await health.getHealthSummary({ database: 'countly_drill', table: 'drill_events' });
            result.healthy.should.be.false();
            result.issues.should.containEql('backpressure');
        });

        it('should report approaching_limits issue', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        merges_in_progress: 2,
                        active_merges: 1,
                        max_parts_per_partition: 800, // 80%
                        total_merge_tree_parts: 5000
                    }]
                },
                db: {
                    collection: () => ({
                        findOne: async() => ({
                            mutation_manager: {
                                ch_max_parts_per_partition: 1000,
                                ch_max_total_mergetree_parts: 100000
                            }
                        })
                    })
                }
            });

            const result = await health.getHealthSummary({ database: 'countly_drill', table: 'drill_events' });
            result.healthy.should.be.true();
            result.issues.should.containEql('approaching_limits');
        });

        it('should include date in response', async function() {
            const result = await health.getHealthSummary({});
            result.should.have.property('date');
            result.date.should.be.a.String();
        });
    });

    // ========================================================================
    // getMutationStatus()
    // ========================================================================
    describe('getMutationStatus()', function() {
        it('should throw when clickhouseQueryService unavailable', async function() {
            await should(health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill',
                table: 'drill_events'
            })).be.rejectedWith(/ClickHouse query service not available/);
        });

        it('should throw when validation_command_id is missing', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: { aggregate: async() => [] }
            });

            await should(health.getMutationStatus({
                database: 'countly_drill',
                table: 'drill_events'
            })).be.rejectedWith(/requires validation_command_id/);
        });

        it('should throw when database is missing', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: { aggregate: async() => [] }
            });

            await should(health.getMutationStatus({
                validation_command_id: 'test_id',
                table: 'drill_events'
            })).be.rejectedWith(/requires database and table/);
        });

        it('should throw when table is missing', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: { aggregate: async() => [] }
            });

            await should(health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill'
            })).be.rejectedWith(/requires database and table/);
        });

        it('should return mutation status when done', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        is_done: 1,
                        is_killed: 0,
                        latest_fail_reason: null
                    }]
                }
            });

            const result = await health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill',
                table: 'drill_events'
            });
            result.is_done.should.be.true();
            result.is_killed.should.be.false();
            should(result.latest_fail_reason).be.null();
        });

        it('should handle string values for is_done', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        is_done: '1',
                        is_killed: '0',
                        latest_fail_reason: null
                    }]
                }
            });

            const result = await health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill',
                table: 'drill_events'
            });
            result.is_done.should.be.true();
        });

        it('should return is_killed when mutation was killed', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        is_done: 0,
                        is_killed: 1,
                        latest_fail_reason: 'Manually killed'
                    }]
                }
            });

            const result = await health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill',
                table: 'drill_events'
            });
            result.is_killed.should.be.true();
            result.latest_fail_reason.should.equal('Manually killed');
        });

        it('should handle empty result (mutation not found)', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => []
                }
            });

            const result = await health.getMutationStatus({
                validation_command_id: 'test_id',
                database: 'countly_drill',
                table: 'drill_events'
            });
            result.is_done.should.be.false();
            result.is_killed.should.be.false();
        });
    });

    // ========================================================================
    // listPendingMutations()
    // ========================================================================
    describe('listPendingMutations()', function() {
        it('should throw when clickhouseQueryService unavailable', async function() {
            await should(health.listPendingMutations())
                .be.rejectedWith(/ClickHouse query service not available/);
        });

        it('should return empty list when no pending mutations', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => []
                }
            });

            const result = await health.listPendingMutations();
            result.pending.should.equal(0);
            result.details.should.have.length(0);
        });

        it('should return list of pending mutations', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [
                        {
                            database: 'countly_drill',
                            table: 'drill_events',
                            command: 'DELETE WHERE app_id = "test"',
                            is_killed: 0,
                            latest_fail_reason: null
                        },
                        {
                            database: 'countly_drill',
                            table: 'uid_map',
                            command: 'DELETE WHERE app_id = "test2"',
                            is_killed: 0,
                            latest_fail_reason: null
                        }
                    ]
                }
            });

            const result = await health.listPendingMutations();
            result.pending.should.equal(2);
            result.details.should.have.length(2);
            result.details[0].database.should.equal('countly_drill');
            result.details[0].table.should.equal('drill_events');
        });

        it('should handle killed mutations in list', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        database: 'countly_drill',
                        table: 'drill_events',
                        command: 'DELETE WHERE app_id = "test"',
                        is_killed: 1,
                        latest_fail_reason: 'User cancelled'
                    }]
                }
            });

            const result = await health.listPendingMutations();
            result.details[0].is_killed.should.be.true();
            result.details[0].latest_fail_reason.should.equal('User cancelled');
        });

        it('should convert string is_killed to boolean', async function() {
            setMockCommonOverrides({
                clickhouseQueryService: {
                    aggregate: async() => [{
                        database: 'countly_drill',
                        table: 'drill_events',
                        command: 'DELETE WHERE app_id = "test"',
                        is_killed: '1',
                        latest_fail_reason: null
                    }]
                }
            });

            const result = await health.listPendingMutations();
            result.details[0].is_killed.should.be.true();
        });
    });
});
