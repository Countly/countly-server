/**
 * QueryHelpers Unit Tests
 *
 * Tests all QueryHelpers static methods including:
 * - Unique count function helpers
 * - PID/Identity expression helpers
 * - Table resolution
 * - Cluster predicate building
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/queryHelpers.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking } = require('./helpers/mockSetup');

// Direct require of QueryHelpers (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const QueryHelpers = require(path.join(PLUGIN_ROOT, 'api/QueryHelpers'));

describe('QueryHelpers Unit Tests', function() {
    // Setup/teardown mocking for this test file only
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });

    // ========================================================================
    // Unique Count Function Helpers
    // ========================================================================
    describe('Unique Count Functions', function() {

        describe('getUniqFunction()', function() {
            it('should return uniqCombined64(20) for approximate counting', function() {
                const result = QueryHelpers.getUniqFunction(true);
                result.should.equal('uniqCombined64(20)');
            });

            it('should return uniqExact for exact counting', function() {
                const result = QueryHelpers.getUniqFunction(false);
                result.should.equal('uniqExact');
            });

            it('should default to approximate counting', function() {
                const result = QueryHelpers.getUniqFunction();
                result.should.equal('uniqCombined64(20)');
            });
        });

        describe('getUniqStateFunction()', function() {
            it('should return uniqCombined64State(20) for approximate', function() {
                const result = QueryHelpers.getUniqStateFunction(true);
                result.should.equal('uniqCombined64State(20)');
            });

            it('should return uniqExactState for exact', function() {
                const result = QueryHelpers.getUniqStateFunction(false);
                result.should.equal('uniqExactState');
            });

            it('should default to approximate', function() {
                const result = QueryHelpers.getUniqStateFunction();
                result.should.equal('uniqCombined64State(20)');
            });
        });

        describe('getUniqMergeFunction()', function() {
            it('should return uniqCombined64Merge(20) for approximate', function() {
                const result = QueryHelpers.getUniqMergeFunction(true);
                result.should.equal('uniqCombined64Merge(20)');
            });

            it('should return uniqExactMerge for exact', function() {
                const result = QueryHelpers.getUniqMergeFunction(false);
                result.should.equal('uniqExactMerge');
            });

            it('should default to approximate', function() {
                const result = QueryHelpers.getUniqMergeFunction();
                result.should.equal('uniqCombined64Merge(20)');
            });
        });

        describe('getUniqMergeFunctionName()', function() {
            it('should return string for arrayReduce (approximate)', function() {
                const result = QueryHelpers.getUniqMergeFunctionName(true);
                result.should.equal('uniqCombined64Merge(20)');
            });

            it('should return string for arrayReduce (exact)', function() {
                const result = QueryHelpers.getUniqMergeFunctionName(false);
                result.should.equal('uniqExactMerge');
            });
        });

        describe('getUniqStateFunctionName()', function() {
            it('should return string for arrayReduce (approximate)', function() {
                const result = QueryHelpers.getUniqStateFunctionName(true);
                result.should.equal('uniqCombined64State(20)');
            });

            it('should return string for arrayReduce (exact)', function() {
                const result = QueryHelpers.getUniqStateFunctionName(false);
                result.should.equal('uniqExactState');
            });
        });
    });

    // ========================================================================
    // Array Reduce Helpers
    // ========================================================================
    describe('Array Reduce Helpers', function() {

        describe('uniqMergeArrayReduce()', function() {
            it('should build arrayReduce expression with default groupArray', function() {
                const result = QueryHelpers.uniqMergeArrayReduce('u_state', true);
                result.should.equal("arrayReduce('uniqCombined64Merge(20)', groupArray(u_state))");
            });

            it('should build arrayReduce with exact function', function() {
                const result = QueryHelpers.uniqMergeArrayReduce('u_state', false);
                result.should.equal("arrayReduce('uniqExactMerge', groupArray(u_state))");
            });

            it('should use custom groupArrayExpr when provided', function() {
                const result = QueryHelpers.uniqMergeArrayReduce('u_state', true, 'customGroupArray(x)');
                result.should.equal("arrayReduce('uniqCombined64Merge(20)', customGroupArray(x))");
            });

            it('should throw for null stateColumn', function() {
                should.throws(() => {
                    QueryHelpers.uniqMergeArrayReduce(null, true);
                }, /requires a state column/);
            });

            it('should throw for empty stateColumn', function() {
                should.throws(() => {
                    QueryHelpers.uniqMergeArrayReduce('', true);
                }, /requires a state column/);
            });

            it('should throw for non-string stateColumn', function() {
                should.throws(() => {
                    QueryHelpers.uniqMergeArrayReduce(123, true);
                }, /requires a state column/);
            });
        });

        describe('uniqMergeFromState()', function() {
            it('should wrap state column with merge function (approximate)', function() {
                const result = QueryHelpers.uniqMergeFromState('u_state', true);
                result.should.equal('uniqCombined64Merge(20)(u_state)');
            });

            it('should wrap state column with merge function (exact)', function() {
                const result = QueryHelpers.uniqMergeFromState('u_state', false);
                result.should.equal('uniqExactMerge(u_state)');
            });

            it('should throw for missing stateColumn', function() {
                should.throws(() => {
                    QueryHelpers.uniqMergeFromState(null, true);
                }, /requires a state column/);
            });

            it('should throw for empty stateColumn', function() {
                should.throws(() => {
                    QueryHelpers.uniqMergeFromState('', true);
                }, /requires a state column/);
            });
        });
    });

    // ========================================================================
    // PID/Identity Expression Helpers
    // ========================================================================
    describe('PID Expression Helpers', function() {

        describe('uniqPidFinal()', function() {
            it('should build uniq expression with default uid column', function() {
                const result = QueryHelpers.uniqPidFinal(true, 'uid');
                result.should.containEql('uniqCombined64(20)');
                result.should.containEql('coalesce');
            });

            it('should build exact uniq expression', function() {
                const result = QueryHelpers.uniqPidFinal(false, 'uid');
                result.should.containEql('uniqExact');
            });
        });

        describe('uniqStatePidFinal()', function() {
            it('should build state expression with default uid column', function() {
                const result = QueryHelpers.uniqStatePidFinal(true, 'uid');
                result.should.containEql('uniqCombined64State(20)');
                result.should.containEql('coalesce');
            });

            it('should build exact state expression', function() {
                const result = QueryHelpers.uniqStatePidFinal(false, 'uid');
                result.should.containEql('uniqExactState');
            });
        });

        describe('withPidFinal()', function() {
            it('should return WITH clause with default alias', function() {
                const result = QueryHelpers.withPidFinal('uid', 'pid_final', false);
                result.should.startWith('WITH');
                result.should.containEql('AS pid_final');
            });

            it('should use custom uid column', function() {
                const result = QueryHelpers.withPidFinal('custom_uid', 'pid_final', false);
                result.should.containEql('custom_uid');
            });

            it('should use custom alias', function() {
                const result = QueryHelpers.withPidFinal('uid', 'my_alias', false);
                result.should.containEql('AS my_alias');
            });
        });

        describe('pidFinalExpr()', function() {
            it('should return coalesce expression', function() {
                const result = QueryHelpers.pidFinalExpr('uid', false);
                result.should.containEql('coalesce');
                result.should.containEql('dictGetOrDefault');
            });

            it('should handle forGroupBy=true', function() {
                const resultGroupBy = QueryHelpers.pidFinalExpr('uid', true);
                const resultNormal = QueryHelpers.pidFinalExpr('uid', false);
                // forGroupBy=true omits any() wrapper
                resultGroupBy.should.containEql('uid_canon');
            });
        });

        describe('pidFinalSelect()', function() {
            it('should return expression with AS alias', function() {
                const result = QueryHelpers.pidFinalSelect('uid', 'pid_final', false);
                result.should.containEql('AS pid_final');
            });

            it('should use custom alias', function() {
                const result = QueryHelpers.pidFinalSelect('uid', 'custom_alias', false);
                result.should.containEql('AS custom_alias');
            });
        });
    });

    // ========================================================================
    // Cluster Predicate
    // ========================================================================
    describe('pidClusterPredicate()', function() {

        describe('Single UID Predicate', function() {
            it('should build single uid predicate', function() {
                const result = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}', 'uid', false, false);
                result.should.containEql('a = {app_id:String}');
                result.should.containEql('coalesce');
            });

            it('should include app filter by default', function() {
                const result = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}');
                result.should.containEql('a = {app_id:String}');
            });

            it('should skip app filter when requested', function() {
                const result = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}', 'uid', false, true);
                result.should.not.containEql('a = {app_id:String} AND');
            });
        });

        describe('Array UID Predicate', function() {
            it('should build array uid predicate', function() {
                const result = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uids:Array(String)}', 'uid', true, false);
                result.should.containEql('has(');
                result.should.containEql('arrayDistinct');
                result.should.containEql('arrayMap');
            });

            it('should include app filter for array predicate', function() {
                const result = QueryHelpers.pidClusterPredicate('{app_id:String}', '{uids:Array(String)}', 'uid', true, false);
                result.should.containEql('a = {app_id:String}');
            });
        });

        describe('Validation', function() {
            it('should throw for missing app_id token', function() {
                should.throws(() => {
                    QueryHelpers.pidClusterPredicate(null, '{uid:String}');
                }, /requires an app_id param token/);
            });

            it('should throw for empty app_id token', function() {
                should.throws(() => {
                    QueryHelpers.pidClusterPredicate('', '{uid:String}');
                }, /requires an app_id param token/);
            });

            it('should throw for missing uid token', function() {
                should.throws(() => {
                    QueryHelpers.pidClusterPredicate('{app_id:String}', null);
                }, /requires a uid param token/);
            });

            it('should throw for empty uid token', function() {
                should.throws(() => {
                    QueryHelpers.pidClusterPredicate('{app_id:String}', '');
                }, /requires a uid param token/);
            });
        });
    });

    // ========================================================================
    // Table Resolution
    // ========================================================================
    describe('resolveTable()', function() {

        describe('Basic Resolution', function() {
            it('should return table with database prefix for drill_events', function() {
                const result = QueryHelpers.resolveTable('drill_events');
                result.should.containEql('drill_events');
                result.should.containEql('.');
            });

            it('should return table without database prefix when includeDb=false', function() {
                const result = QueryHelpers.resolveTable('drill_events', { includeDb: false });
                result.should.equal('drill_events');
            });

            it('should resolve uid_map to identity database', function() {
                const result = QueryHelpers.resolveTable('uid_map');
                result.should.containEql('identity.');
            });
        });

        describe('Unknown Table', function() {
            it('should throw for unknown table', function() {
                should.throws(() => {
                    QueryHelpers.resolveTable('nonexistent_table');
                }, /Unknown table/);
            });

            it('should list registered tables in error message', function() {
                try {
                    QueryHelpers.resolveTable('nonexistent_table');
                }
                catch (err) {
                    err.message.should.containEql('Registered tables:');
                }
            });
        });

        describe('Insert Operations', function() {
            it('should handle forInsert option', function() {
                // In single mode, forInsert should return base table
                const result = QueryHelpers.resolveTable('drill_events', { forInsert: true });
                result.should.containEql('drill_events');
            });
        });

        describe('Mutation Operations', function() {
            it('should handle forMutation option in single mode', function() {
                // In single mode, forMutation should return base table
                const result = QueryHelpers.resolveTable('drill_events', { forMutation: true });
                result.should.containEql('drill_events');
            });
        });
    });
});
