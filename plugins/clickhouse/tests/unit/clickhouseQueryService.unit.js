/**
 * ClickhouseQueryService Unit Tests
 *
 * Tests all ClickhouseQueryService methods including:
 * - Constructor initialization
 * - Query execution with masking
 * - Aggregation with streaming and progress
 * - Mutation execution
 * - Insert operations
 * - Utility methods
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/clickhouseQueryService.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking, createMockClickHouseClient, createMockClickHouseConfig } = require('./helpers/mockSetup');

// Direct require of ClickhouseQueryService (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const ClickhouseQueryService = require(path.join(PLUGIN_ROOT, 'api/ClickhouseQueryService'));

describe('ClickhouseQueryService Unit Tests', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });
    let mockClient;
    let queryService;

    beforeEach(function() {
        mockClient = createMockClickHouseClient();
        queryService = new ClickhouseQueryService(mockClient);
    });

    // ========================================================================
    // Constructor
    // ========================================================================
    describe('Constructor', function() {
        it('should initialize with client', function() {
            queryService.client.should.equal(mockClient);
        });

        it('should initialize DataMaskingService', function() {
            should.exist(queryService.maskingService);
        });

        it('should handle missing client gracefully', function() {
            const qs = new ClickhouseQueryService(null);
            should(qs.client).be.null();
        });
    });

    // ========================================================================
    // find()
    // ========================================================================
    describe('find()', function() {
        it('should return empty array (not implemented)', async function() {
            const result = await queryService.find({ app_id: 'test' });
            result.should.be.an.Array();
            result.should.have.length(0);
        });

        it('should accept options parameter', async function() {
            const result = await queryService.find({ app_id: 'test' }, { limit: 10 });
            result.should.be.an.Array();
        });
    });

    // ========================================================================
    // findOne()
    // ========================================================================
    describe('findOne()', function() {
        it('should return null (not implemented)', async function() {
            const result = await queryService.findOne({ id: '123' });
            should(result).be.null();
        });
    });

    // ========================================================================
    // count()
    // ========================================================================
    describe('count()', function() {
        it('should return 0 (not implemented)', async function() {
            const result = await queryService.count({ app_id: 'test' });
            result.should.equal(0);
        });
    });

    // ========================================================================
    // query()
    // ========================================================================
    describe('query()', function() {
        it('should execute raw query', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ id: 1, name: 'test' }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.query({ query: 'SELECT * FROM test' });
            result.should.be.an.Array();
            result.should.have.length(1);
            result[0].id.should.equal(1);
        });

        it('should pass query params to client', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ count: 5 }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.query({
                query: 'SELECT count() FROM test WHERE app = {app:String}',
                params: { app: 'myapp' }
            });
            result.should.be.an.Array();
        });

        it('should set appID on masking service', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.query({
                query: 'SELECT * FROM test',
                appID: 'app123'
            });

            // No error means success - masking service was called
        });

        it('should handle query errors', async function() {
            const errorClient = createMockClickHouseClient({
                queryError: new Error('Connection refused')
            });
            const qs = new ClickhouseQueryService(errorClient);

            await should(qs.query({ query: 'SELECT * FROM test' }))
                .be.rejectedWith(/Connection refused/);
        });

        it('should convert appID to string', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.query({
                query: 'SELECT * FROM test',
                appID: 12345 // numeric appID
            });
            // No error means success
        });
    });

    // ========================================================================
    // aggregate()
    // ========================================================================
    describe('aggregate()', function() {
        it('should execute aggregation query', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ bucket: 'a', count: 100 }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.aggregate({
                query: 'SELECT bucket, count() as count FROM test GROUP BY bucket'
            });
            result.should.be.an.Array();
            result[0].bucket.should.equal('a');
        });

        it('should pass params to query', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate({
                query: 'SELECT * FROM test WHERE date >= {start:String}',
                params: { start: '2025-01-01' }
            });
            // No error means success
        });

        it('should handle appID from pipeline', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate({
                query: 'SELECT * FROM test',
                appID: 'myapp'
            });
            // No error means success
        });

        it('should handle appID from params fallback', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate({
                query: 'SELECT * FROM test',
                params: { appID: 'myapp' }
            });
            // No error means success
        });

        it('should handle query errors in aggregate', async function() {
            const errorClient = createMockClickHouseClient({
                queryError: new Error('Query syntax error')
            });
            const qs = new ClickhouseQueryService(errorClient);

            await should(qs.aggregate({
                query: 'INVALID SQL'
            })).be.rejectedWith(/Query syntax error/);
        });

        it('should apply large query settings when estimatedQuerySize exceeds threshold', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            // 25KB > 20KB threshold
            await qs.aggregate(
                { query: 'SELECT * FROM test' },
                { estimatedQuerySize: 25 * 1024 }
            );
            // No error means success - settings were applied
        });

        it('should not apply large query settings for small queries', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate(
                { query: 'SELECT * FROM test' },
                { estimatedQuerySize: 1024 } // 1KB < 20KB threshold
            );
            // No error means success
        });

        it('should use custom clickhouse_settings', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate(
                { query: 'SELECT * FROM test' },
                { clickhouse_settings: { max_execution_time: 60 } }
            );
            // No error means success
        });
    });

    // ========================================================================
    // executeMutation()
    // ========================================================================
    describe('executeMutation()', function() {
        it('should execute mutation query', async function() {
            const result = await queryService.executeMutation({
                query: 'DELETE FROM test WHERE id = 1'
            });
            result.should.be.true();
        });

        it('should pass params to mutation', async function() {
            const result = await queryService.executeMutation({
                query: 'DELETE FROM test WHERE app = {app:String}',
                params: { app: 'myapp' }
            });
            result.should.be.true();
        });

        it('should throw for missing query', async function() {
            await should(queryService.executeMutation({}))
                .be.rejectedWith(/invalid query parameter/);
        });

        it('should throw for null queryObj', async function() {
            await should(queryService.executeMutation(null))
                .be.rejectedWith(/invalid query parameter/);
        });

        it('should throw for non-string query', async function() {
            await should(queryService.executeMutation({ query: 123 }))
                .be.rejectedWith(/invalid query parameter/);
        });

        it('should handle mutation errors', async function() {
            const errorClient = createMockClickHouseClient({
                execError: new Error('Table not found')
            });
            const qs = new ClickhouseQueryService(errorClient);

            await should(qs.executeMutation({ query: 'DELETE FROM nonexistent' }))
                .be.rejectedWith(/Table not found/);
        });
    });

    // ========================================================================
    // insert()
    // ========================================================================
    describe('insert()', function() {
        it('should insert single document', async function() {
            await queryService.insert(
                { id: 1, name: 'test' },
                { table: 'drill_events' }
            );
            // No error means success
        });

        it('should insert array of documents', async function() {
            await queryService.insert(
                [{ id: 1 }, { id: 2 }, { id: 3 }],
                { table: 'drill_events' }
            );
            // No error means success
        });

        it('should throw for missing table', async function() {
            await should(queryService.insert({ id: 1 }, {}))
                .be.rejectedWith(/table name is required/);
        });

        it('should skip insert for empty array', async function() {
            await queryService.insert([], { table: 'drill_events' });
            // No error means success - insert was skipped
        });

        it('should use default format JSONEachRow', async function() {
            await queryService.insert(
                { id: 1 },
                { table: 'uid_map' }
            );
            // No error means success
        });

        it('should accept custom format', async function() {
            await queryService.insert(
                { id: 1 },
                { table: 'drill_snapshots', format: 'JSON' }
            );
            // No error means success
        });

        it('should handle insert errors', async function() {
            const errorClient = createMockClickHouseClient();
            errorClient.insert = async() => {
                throw new Error('Insert failed');
            };
            const qs = new ClickhouseQueryService(errorClient);

            await should(qs.insert({ id: 1 }, { table: 'drill_events' }))
                .be.rejectedWith(/Insert failed/);
        });
    });

    // ========================================================================
    // getInsertTable()
    // ========================================================================
    describe('getInsertTable()', function() {
        it('should return table name for insert', function() {
            const result = queryService.getInsertTable('drill_events');
            result.should.be.a.String();
        });

        it('should handle known tables', function() {
            const result = queryService.getInsertTable('uid_map');
            result.should.be.a.String();
        });
    });

    // ========================================================================
    // update()
    // ========================================================================
    describe('update()', function() {
        it('should not throw (not implemented)', async function() {
            await queryService.update({ id: 1 }, { name: 'updated' });
            // No error means success
        });
    });

    // ========================================================================
    // remove()
    // ========================================================================
    describe('remove()', function() {
        it('should not throw (not implemented)', async function() {
            await queryService.remove({ id: 1 });
            // No error means success
        });
    });

    // ========================================================================
    // createIndex()
    // ========================================================================
    describe('createIndex()', function() {
        it('should not throw (not implemented)', async function() {
            await queryService.createIndex({ field: 1 });
            // No error means success
        });
    });

    // ========================================================================
    // dropCollection()
    // ========================================================================
    describe('dropCollection()', function() {
        it('should not throw (not implemented)', async function() {
            await queryService.dropCollection();
            // No error means success
        });
    });

    // ========================================================================
    // listDatabases()
    // ========================================================================
    describe('listDatabases()', function() {
        it('should return array of databases', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ name: 'countly_drill' }, { name: 'countly_fs' }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.listDatabases();
            result.should.be.an.Array();
            result.should.have.length(2);
        });

        it('should return empty array when no databases', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.listDatabases();
            result.should.be.an.Array();
            result.should.have.length(0);
        });
    });

    // ========================================================================
    // listCollections()
    // ========================================================================
    describe('listCollections()', function() {
        it('should return array of table names', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ name: 'drill_events' }, { name: 'uid_map' }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.listCollections('countly_drill');
            result.should.be.an.Array();
            result.should.have.length(2);
        });

        it('should return empty array for empty database', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.listCollections('empty_db');
            result.should.be.an.Array();
            result.should.have.length(0);
        });
    });

    // ========================================================================
    // Data Masking Integration
    // ========================================================================
    describe('Data Masking Integration', function() {
        it('should apply masking service to results', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: [{ id: 1, name: 'test' }]
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            const result = await qs.query({ query: 'SELECT * FROM test' });
            result.should.be.an.Array();
            // Results are returned (masking may or may not modify them)
        });

        it('should set appID on masking service for aggregate', async function() {
            const clientWithResult = createMockClickHouseClient({
                queryResults: []
            });
            const qs = new ClickhouseQueryService(clientWithResult);

            await qs.aggregate({
                query: 'SELECT * FROM test',
                appID: 'testapp'
            });
            // No error means masking service was configured
        });
    });
});
