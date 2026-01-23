/**
 * Identity Unit Tests
 *
 * Tests Identity class static methods and instance methods including:
 * - SQL expression generation for person ID resolution
 * - Table name helpers
 * - Cluster mode delegation
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/identity.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking, createMockClickHouseClient, createMockClickHouseConfig } = require('./helpers/mockSetup');

// Direct require of Identity (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const Identity = require(path.join(PLUGIN_ROOT, 'api/users/Identity'));

describe('Identity Unit Tests', function() {

    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });
    // ========================================================================
    // Static Methods - SQL Expression Helpers
    // ========================================================================
    describe('Static Methods', function() {

        describe('getCanonicalExpression()', function() {
            it('should return coalesce expression with default uid column', function() {
                const result = Identity.getCanonicalExpression();
                result.should.containEql('coalesce');
                result.should.containEql('dictGetOrDefault');
                result.should.containEql('uid');
            });

            it('should use custom uid column', function() {
                const result = Identity.getCanonicalExpression('custom_uid');
                result.should.containEql('custom_uid');
            });

            it('should reference identity.uid_map_dict dictionary', function() {
                const result = Identity.getCanonicalExpression();
                result.should.containEql('identity.uid_map_dict');
            });

            it('should include canon attribute lookup', function() {
                const result = Identity.getCanonicalExpression();
                result.should.containEql("'canon'");
            });
        });

        describe('getFinalExpression()', function() {
            it('should include any() wrapper by default', function() {
                const result = Identity.getFinalExpression('uid', false);
                result.should.containEql('any(uid_canon)');
            });

            it('should omit any() when forGroupBy=true', function() {
                const result = Identity.getFinalExpression('uid', true);
                result.should.not.containEql('any(uid_canon)');
                result.should.containEql('uid_canon');
            });

            it('should include coalesce with dictionary lookup', function() {
                const result = Identity.getFinalExpression('uid', false);
                result.should.containEql('coalesce');
                result.should.containEql('dictGetOrDefault');
            });

            it('should use custom uid column', function() {
                const result = Identity.getFinalExpression('my_uid', false);
                result.should.containEql('my_uid');
            });

            it('should include fallback to uid column', function() {
                const result = Identity.getFinalExpression('uid', false);
                // The expression should fall back to uid if no mapping exists
                result.should.containEql('uid');
            });
        });

        describe('getFinalSelect()', function() {
            it('should return expression with AS alias', function() {
                const result = Identity.getFinalSelect('uid', 'pid_final', false);
                result.should.containEql('AS pid_final');
            });

            it('should use custom uid column', function() {
                const result = Identity.getFinalSelect('custom_uid', 'pid_final', false);
                result.should.containEql('custom_uid');
            });

            it('should use custom alias', function() {
                const result = Identity.getFinalSelect('uid', 'my_alias', false);
                result.should.containEql('AS my_alias');
            });

            it('should respect forGroupBy parameter', function() {
                const withAny = Identity.getFinalSelect('uid', 'pid', false);
                const withoutAny = Identity.getFinalSelect('uid', 'pid', true);

                withAny.should.containEql('any(uid_canon)');
                withoutAny.should.not.containEql('any(uid_canon)');
            });
        });
    });

    // ========================================================================
    // Instance Methods
    // ========================================================================
    describe('Instance Methods', function() {
        let mockClient;
        let identity;

        beforeEach(function() {
            mockClient = createMockClickHouseClient();
            identity = new Identity(mockClient);
        });

        describe('Constructor', function() {
            it('should initialize with client', function() {
                identity.client.should.equal(mockClient);
            });

            it('should create ClusterManager instance', function() {
                identity.cm.should.be.an.Object();
            });

            it('should create DictionaryManager instance', function() {
                identity.dictManager.should.be.an.Object();
            });
        });

        describe('getTableName()', function() {
            it('should return identity.uid_map', function() {
                const result = identity.getTableName();
                result.should.equal('identity.uid_map');
            });
        });

        describe('getLocalTableName()', function() {
            it('should return uid_map for single mode (no cluster)', function() {
                const result = identity.getLocalTableName();
                // In mock config, cluster mode is disabled
                result.should.equal('identity.uid_map');
            });
        });

        describe('isClusterMode()', function() {
            it('should delegate to ClusterManager', function() {
                const result = identity.isClusterMode();
                // Mock config has cluster disabled
                result.should.be.false();
            });
        });

        describe('isCloudMode()', function() {
            it('should delegate to ClusterManager', function() {
                const result = identity.isCloudMode();
                // Mock config has cloud mode disabled
                result.should.be.false();
            });
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('Edge Cases', function() {

        describe('SQL Expression Edge Cases', function() {
            it('should handle empty string uid column', function() {
                // Empty string is technically valid, expression should still be valid SQL
                const result = Identity.getCanonicalExpression('');
                result.should.containEql('coalesce');
            });

            it('should handle special characters in uid column name', function() {
                const result = Identity.getCanonicalExpression('`uid_field`');
                result.should.containEql('`uid_field`');
            });
        });

        describe('Expression Consistency', function() {
            it('should generate same expression for same parameters', function() {
                const result1 = Identity.getCanonicalExpression('uid');
                const result2 = Identity.getCanonicalExpression('uid');
                result1.should.equal(result2);
            });

            it('should generate different expressions for different columns', function() {
                const result1 = Identity.getCanonicalExpression('uid');
                const result2 = Identity.getCanonicalExpression('user_id');
                result1.should.not.equal(result2);
            });
        });
    });
});
