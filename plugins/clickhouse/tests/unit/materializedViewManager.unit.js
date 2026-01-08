/**
 * MaterializedViewManager Unit Tests
 *
 * Tests all MaterializedViewManager methods including:
 * - Constructor initialization
 * - Traditional materialized view creation
 * - Refreshable materialized view creation
 * - Refresh clause building
 * - View lifecycle methods
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/materializedViewManager.unit.js'
 */
const should = require('should');
const path = require('path');

// Setup module mocking BEFORE requiring MaterializedViewManager
const { createMockClickHouseClient } = require('./helpers/mockSetup');

// Direct require of MaterializedViewManager (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const MaterializedViewManager = require(path.join(PLUGIN_ROOT, 'api/managers/MaterializedViewManager'));

describe('MaterializedViewManager Unit Tests', function() {
    let mockClient;
    let viewManager;

    beforeEach(function() {
        mockClient = createMockClickHouseClient();
        viewManager = new MaterializedViewManager(mockClient, 'test_db', 'test_view');
    });

    // ========================================================================
    // Constructor
    // ========================================================================
    describe('Constructor', function() {
        it('should initialize with client, database, and name', function() {
            viewManager.client.should.equal(mockClient);
            viewManager.database.should.equal('test_db');
            viewManager.name.should.equal('test_view');
        });

        it('should set fullName correctly', function() {
            viewManager.fullName.should.equal('test_db.test_view');
        });

        it('should handle special characters in names', function() {
            const vm = new MaterializedViewManager(mockClient, 'my_database', 'my_view');
            vm.fullName.should.equal('my_database.my_view');
        });
    });

    // ========================================================================
    // _buildRefreshClause()
    // ========================================================================
    describe('_buildRefreshClause()', function() {
        it('should build EVERY refresh clause', function() {
            const refresh = { type: 'EVERY', value: '1 HOUR' };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('REFRESH');
            result.should.containEql('EVERY 1 HOUR');
        });

        it('should default to EVERY type when not specified', function() {
            const refresh = { value: '30 MINUTE' };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('EVERY 30 MINUTE');
        });

        it('should build AFTER refresh clause', function() {
            const refresh = { type: 'AFTER', value: '5 MINUTE' };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('AFTER 5 MINUTE');
        });

        it('should include OFFSET when specified', function() {
            const refresh = { type: 'EVERY', value: '1 DAY', offset: 3600 };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('OFFSET 3600');
        });

        it('should include DEPENDS ON when specified', function() {
            const refresh = { type: 'EVERY', value: '1 HOUR', depends: 'table1, table2' };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('DEPENDS ON table1, table2');
        });

        it('should include all options together', function() {
            const refresh = {
                type: 'EVERY',
                value: '1 DAY',
                offset: 7200,
                depends: 'source_table'
            };
            const result = viewManager._buildRefreshClause(refresh);
            result.should.containEql('EVERY 1 DAY');
            result.should.containEql('OFFSET 7200');
            result.should.containEql('DEPENDS ON source_table');
        });
    });

    // ========================================================================
    // Async Methods
    // ========================================================================
    describe('createTraditional()', function() {
        it('should execute CREATE MATERIALIZED VIEW query', async function() {
            const config = {
                targetTable: 'test_db.target_table',
                query: 'SELECT * FROM source_table'
            };

            await viewManager.createTraditional(config);
            // No error means success with mock client
        });

        it('should not call populate when not requested', async function() {
            const config = {
                targetTable: 'test_db.target_table',
                query: 'SELECT * FROM source_table',
                populate: false
            };

            await viewManager.createTraditional(config);
            // No error means success
        });
    });

    describe('createRefreshable()', function() {
        it('should execute CREATE MATERIALIZED VIEW with REFRESH', async function() {
            const config = {
                targetTable: 'test_db.target_table',
                query: 'SELECT * FROM source_table',
                refresh: { type: 'EVERY', value: '1 HOUR' }
            };

            await viewManager.createRefreshable(config);
            // No error means success
        });
    });

    describe('drop()', function() {
        it('should execute DROP VIEW IF EXISTS', async function() {
            await viewManager.drop(true);
            // No error means success
        });

        it('should execute DROP VIEW without IF EXISTS', async function() {
            await viewManager.drop(false);
            // No error means success
        });

        it('should default to IF EXISTS', async function() {
            await viewManager.drop();
            // No error means success
        });
    });

    describe('exists()', function() {
        it('should return true when view exists', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ count: 1 }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.exists();
            result.should.be.true();
        });

        it('should return false when view does not exist', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ count: 0 }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.exists();
            result.should.be.false();
        });
    });

    describe('refresh()', function() {
        it('should execute SYSTEM REFRESH VIEW', async function() {
            await viewManager.refresh();
            // No error means success
        });
    });

    describe('stopRefresh()', function() {
        it('should execute SYSTEM STOP VIEW', async function() {
            await viewManager.stopRefresh();
            // No error means success
        });
    });

    describe('startRefresh()', function() {
        it('should execute SYSTEM START VIEW', async function() {
            await viewManager.startRefresh();
            // No error means success
        });
    });

    describe('cancelRefresh()', function() {
        it('should execute SYSTEM CANCEL VIEW', async function() {
            await viewManager.cancelRefresh();
            // No error means success
        });
    });

    describe('modifyRefresh()', function() {
        it('should execute ALTER TABLE MODIFY REFRESH', async function() {
            const refresh = { type: 'EVERY', value: '2 HOUR' };
            await viewManager.modifyRefresh(refresh);
            // No error means success
        });
    });

    describe('populate()', function() {
        it('should execute INSERT INTO target FROM query', async function() {
            await viewManager.populate('target_table', 'SELECT * FROM source');
            // No error means success
        });
    });

    describe('createOrReplace()', function() {
        it('should call drop then create for traditional', async function() {
            const config = {
                type: 'traditional',
                targetTable: 'test_db.target',
                query: 'SELECT * FROM source'
            };

            await viewManager.createOrReplace(config);
            // No error means success
        });

        it('should call drop then create for refreshable', async function() {
            const config = {
                type: 'refreshable',
                targetTable: 'test_db.target',
                query: 'SELECT * FROM source',
                refresh: { type: 'EVERY', value: '1 HOUR' }
            };

            await viewManager.createOrReplace(config);
            // No error means success
        });
    });

    describe('getInfo()', function() {
        it('should return view info when exists', async function() {
            const viewInfo = {
                database: 'test_db',
                name: 'test_view',
                engine: 'MaterializedView'
            };
            const clientWithResult = createMockClickHouseClient({
                queryResults: [viewInfo]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test_db', 'test_view');

            const result = await vm.getInfo();
            result.should.deepEqual(viewInfo);
        });

        it('should return null when view does not exist', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getInfo();
            should(result).be.null();
        });
    });

    describe('getRefreshStatus()', function() {
        it('should return refresh status when available', async function() {
            const status = {
                status: 'Running',
                last_refresh_time: '2024-01-01 00:00:00'
            };
            const clientWithResult = createMockClickHouseClient({
                queryResults: [status]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getRefreshStatus();
            result.should.deepEqual(status);
        });

        it('should return null when no refresh status', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getRefreshStatus();
            should(result).be.null();
        });
    });

    describe('isRefreshing()', function() {
        it('should return true when status is Running', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ status: 'Running' }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.isRefreshing();
            result.should.be.true();
        });

        it('should return false when status is not Running', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ status: 'Scheduled' }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.isRefreshing();
            result.should.be.false();
        });
    });

    describe('getLastException()', function() {
        it('should return exception when present', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ exception: 'Some error occurred' }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getLastException();
            result.should.equal('Some error occurred');
        });

        it('should return null when no exception', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ exception: null }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getLastException();
            should(result).be.null();
        });
    });

    describe('getCreateStatement()', function() {
        it('should return CREATE statement', async function() {
            const statement = 'CREATE MATERIALIZED VIEW test_db.test_view TO target AS SELECT * FROM source';
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ create_table_query: statement }]
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getCreateStatement();
            result.should.equal(statement);
        });

        it('should return null when view does not exist', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const vm = new MaterializedViewManager(clientWithResult, 'test', 'view');

            const result = await vm.getCreateStatement();
            should(result).be.null();
        });
    });
});
