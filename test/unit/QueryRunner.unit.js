/**
 * QueryRunner Unit Tests
 *
 * Tests the QueryRunner class that provides unified query execution
 * across multiple database adapters (MongoDB, ClickHouse).
 */

const should = require('should');

// Direct require of QueryRunner
const QueryRunner = require('../../api/parts/data/QueryRunner');

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock handler that returns proper QueryResult structure
 */
function createMockHandler(returnData, options = {}) {
    const handler = async(params, opts) => {
        if (options.delay) {
            await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        if (options.throwError) {
            throw new Error(options.throwError);
        }
        return {
            _queryMeta: {
                adapter: options.adapter || 'mongodb',
                query: options.query || { mock: true }
            },
            data: returnData
        };
    };

    // Wrap to track calls
    const wrappedHandler = async(params, opts) => {
        wrappedHandler.calls.push({ params, opts });
        return handler(params, opts);
    };
    wrappedHandler.calls = [];
    return wrappedHandler;
}

// ============================================================================
// Tests
// ============================================================================

describe('QueryRunner', function() {
    let queryRunner;

    beforeEach(function() {
        queryRunner = new QueryRunner();
    });

    // ========================================================================
    // isAdapterAvailable
    // ========================================================================
    describe('isAdapterAvailable', function() {
        it('should return true for mongodb (default enabled)', function() {
            // MongoDB is enabled by default in QueryRunner
            queryRunner.isAdapterAvailable('mongodb').should.be.true();
        });

        it('should return false for non-configured adapter', function() {
            // Random adapter name should not be available
            queryRunner.isAdapterAvailable('redis').should.be.false();
        });

        it('should return false for undefined adapter', function() {
            queryRunner.isAdapterAvailable(undefined).should.be.false();
        });

        it('should return false for null adapter', function() {
            queryRunner.isAdapterAvailable(null).should.be.false();
        });
    });

    // ========================================================================
    // selectAdapterForDef
    // ========================================================================
    describe('selectAdapterForDef', function() {
        it('should return forced adapter when specified and available', function() {
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler: createMockHandler([]) }
                }
            };
            const selected = queryRunner.selectAdapterForDef(queryDef, 'mongodb');
            selected.should.equal('mongodb');
        });

        it('should throw when forced adapter not available in config', function() {
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler: createMockHandler([]) }
                }
            };

            should(() => {
                queryRunner.selectAdapterForDef(queryDef, 'nonexistent');
            }).throw(/not available/);
        });

        it('should throw when forced adapter not supported by query', function() {
            // Create query that only supports clickhouse, but clickhouse not enabled
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    clickhouse: {
                        handler: createMockHandler([])
                    }
                }
            };

            // MongoDB is forced but query doesn't support it
            should(() => {
                queryRunner.selectAdapterForDef(queryDef, 'mongodb');
            }).throw(/not supported by query/);
        });

        it('should select first available adapter from query definition', function() {
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler: createMockHandler([]) }
                }
            };
            const selected = queryRunner.selectAdapterForDef(queryDef);
            // Should select mongodb as it's the default enabled adapter
            selected.should.equal('mongodb');
        });

        it('should throw when no suitable adapter found', function() {
            // Create query with only unsupported adapters
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    redis: { handler: createMockHandler([]) },
                    postgres: { handler: createMockHandler([]) }
                }
            };

            should(() => {
                queryRunner.selectAdapterForDef(queryDef);
            }).throw(/No suitable adapter found/);
        });

        it('should handle query with available=false', function() {
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: {
                        handler: createMockHandler([]),
                        available: false
                    }
                }
            };

            should(() => {
                queryRunner.selectAdapterForDef(queryDef);
            }).throw(/No suitable adapter found/);
        });

        it('should skip adapters marked as unavailable', function() {
            const mongoHandler = createMockHandler([{ source: 'mongo' }]);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    clickhouse: {
                        handler: createMockHandler([]),
                        available: false
                    },
                    mongodb: {
                        handler: mongoHandler
                    }
                }
            };

            const selected = queryRunner.selectAdapterForDef(queryDef);
            selected.should.equal('mongodb');
        });
    });

    // ========================================================================
    // executeOnAdapter
    // ========================================================================
    describe('executeOnAdapter', function() {
        it('should call handler with params and options', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };
            const params = { appId: '123' };
            const options = { limit: 10 };

            await queryRunner.executeOnAdapter(queryDef, 'mongodb', params, options);

            handler.calls.length.should.equal(1);
            handler.calls[0].params.should.deepEqual(params);
            handler.calls[0].opts.should.deepEqual(options);
        });

        it('should return handler result', async function() {
            const expectedData = [{ id: 1 }, { id: 2 }];
            const handler = createMockHandler(expectedData);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };

            const result = await queryRunner.executeOnAdapter(queryDef, 'mongodb', {});

            result.data.should.deepEqual(expectedData);
            result._queryMeta.should.have.property('adapter', 'mongodb');
        });

        it('should throw when handler not found', async function() {
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: {} // no handler
                }
            };

            let threw = false;
            try {
                await queryRunner.executeOnAdapter(queryDef, 'mongodb', {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('No handler found');
            }
            threw.should.be.true();
        });

        it('should propagate handler errors', async function() {
            const handler = createMockHandler([], { throwError: 'Database connection failed' });
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };

            let threw = false;
            try {
                await queryRunner.executeOnAdapter(queryDef, 'mongodb', {});
            }
            catch (e) {
                threw = true;
                e.message.should.equal('Database connection failed');
            }
            threw.should.be.true();
        });

        it('should handle empty params', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeOnAdapter(queryDef, 'mongodb', {});
            result.data.should.deepEqual([{ id: 1 }]);
        });
    });

    // ========================================================================
    // executeQuery
    // ========================================================================
    describe('executeQuery', function() {
        it('should throw if queryDef is null', async function() {
            let threw = false;
            try {
                await queryRunner.executeQuery(null, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('Invalid query definition');
            }
            threw.should.be.true();
        });

        it('should throw if queryDef is undefined', async function() {
            let threw = false;
            try {
                await queryRunner.executeQuery(undefined, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('Invalid query definition');
            }
            threw.should.be.true();
        });

        it('should throw if queryDef has no adapters', async function() {
            let threw = false;
            try {
                await queryRunner.executeQuery({ name: 'TEST' }, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('must have adapters');
            }
            threw.should.be.true();
        });

        it('should throw if queryDef has no name', async function() {
            let threw = false;
            try {
                await queryRunner.executeQuery({ adapters: {} }, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql('must have a name');
            }
            threw.should.be.true();
        });

        it('should select adapter and execute handler', async function() {
            const expectedData = [{ id: 1, value: 'test' }];
            const handler = createMockHandler(expectedData);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, { filter: {} });

            result.should.deepEqual(expectedData);
            handler.calls.length.should.equal(1);
        });

        it('should apply transform function when provided', async function() {
            const rawData = [{ raw: 'value1' }, { raw: 'value2' }];
            const handler = createMockHandler(rawData);
            const transform = async(data) => data.map(d => ({ transformed: d.raw }));

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler, transform }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, {});

            result.should.deepEqual([
                { transformed: 'value1' },
                { transformed: 'value2' }
            ]);
        });

        it('should pass transformOptions to transform function', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            let receivedOptions = null;
            const transform = async(data, opts) => {
                receivedOptions = opts;
                return data;
            };

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler, transform }
                }
            };

            const transformOptions = { format: 'drill', timezone: 'UTC' };
            await queryRunner.executeQuery(queryDef, {}, {}, transformOptions);

            should(receivedOptions).deepEqual(transformOptions);
        });

        it('should return only data (not _queryMeta)', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, {});

            // Result should be the data array, not the full QueryResult
            Array.isArray(result).should.be.true();
            should(result._queryMeta).be.undefined();
        });

        it('should propagate transform errors', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const transform = async() => {
                throw new Error('Transform failed');
            };

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler, transform }
                }
            };

            let threw = false;
            try {
                await queryRunner.executeQuery(queryDef, {});
            }
            catch (e) {
                threw = true;
                e.message.should.equal('Transform failed');
            }
            threw.should.be.true();
        });

        it('should use forced adapter from options', async function() {
            const mongoHandler = createMockHandler([{ source: 'mongo' }], { adapter: 'mongodb' });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: {
                    mongodb: { handler: mongoHandler }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, {}, { adapter: 'mongodb' });

            result.should.deepEqual([{ source: 'mongo' }]);
            mongoHandler.calls.length.should.equal(1);
        });

        it('should pass options to handler', async function() {
            let receivedOpts = null;
            const handler = async(params, opts) => {
                receivedOpts = opts;
                return {
                    _queryMeta: { adapter: 'mongodb', query: {} },
                    data: []
                };
            };

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            await queryRunner.executeQuery(queryDef, { appId: '123' }, { customOption: true });

            should(receivedOpts).have.property('customOption', true);
        });
    });

    // ========================================================================
    // Handler Contract Validation
    // ========================================================================
    describe('Handler Contract Validation', function() {
        it('should accept valid { _queryMeta, data } structure', async function() {
            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: [{ id: 1 }]
            });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.should.deepEqual([{ id: 1 }]);
        });

        it('should throw if handler returns null', async function() {
            const handler = async() => null;

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            let threw = false;
            try {
                await queryRunner.executeQuery(queryDef, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql("must return object with '_queryMeta' and 'data'");
            }
            threw.should.be.true();
        });

        it('should throw if handler returns non-object', async function() {
            const handler = async() => 'string result';

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            let threw = false;
            try {
                await queryRunner.executeQuery(queryDef, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql("must return object with '_queryMeta' and 'data'");
            }
            threw.should.be.true();
        });

        it('should throw if _queryMeta missing', async function() {
            const handler = async() => ({ data: [] });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            let threw = false;
            try {
                await queryRunner.executeQuery(queryDef, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql("must return object with '_queryMeta' and 'data'");
            }
            threw.should.be.true();
        });

        it('should throw if data missing', async function() {
            const handler = async() => ({ _queryMeta: { adapter: 'mongodb' } });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            let threw = false;
            try {
                await queryRunner.executeQuery(queryDef, {});
            }
            catch (e) {
                threw = true;
                e.message.should.containEql("must return object with '_queryMeta' and 'data'");
            }
            threw.should.be.true();
        });

        it('should accept handler with empty data array', async function() {
            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: []
            });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.should.deepEqual([]);
        });

        it('should accept handler with null data value', async function() {
            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: null
            });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            should(result).be.null();
        });

        it('should accept handler returning array result', async function() {
            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: [1, 2, 3]
            });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.should.deepEqual([1, 2, 3]);
        });

        it('should accept handler returning object result', async function() {
            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: { total: 100, items: [] }
            });

            const queryDef = {
                name: 'TEST_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.should.deepEqual({ total: 100, items: [] });
        });
    });

    // ========================================================================
    // Integration-style tests
    // ========================================================================
    describe('Integration Scenarios', function() {
        it('should handle complete query flow with transform', async function() {
            const rawData = [
                { _id: '1', count: 100, timestamp: 1234567890 },
                { _id: '2', count: 200, timestamp: 1234567891 }
            ];

            const handler = createMockHandler(rawData, {
                adapter: 'mongodb',
                query: [{ $match: {} }]
            });

            const transform = async(data) => {
                return data.map(d => ({
                    id: d._id,
                    value: d.count,
                    date: new Date(d.timestamp * 1000).toISOString()
                }));
            };

            const queryDef = {
                name: 'ANALYTICS_QUERY',
                adapters: {
                    mongodb: { handler, transform }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, { appId: '123' });

            result.length.should.equal(2);
            result[0].should.have.property('id', '1');
            result[0].should.have.property('value', 100);
            result[0].should.have.property('date');
        });

        it('should work with only one adapter configured', async function() {
            const handler = createMockHandler([{ single: true }]);
            const queryDef = {
                name: 'SINGLE_ADAPTER_QUERY',
                adapters: {
                    mongodb: { handler }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, {});

            result.should.deepEqual([{ single: true }]);
        });

        it('should handle async transform function', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const transform = async(data) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return data.map(d => ({ ...d, transformed: true }));
            };

            const queryDef = {
                name: 'ASYNC_TRANSFORM_QUERY',
                adapters: {
                    mongodb: { handler, transform }
                }
            };

            const result = await queryRunner.executeQuery(queryDef, {});

            result.should.deepEqual([{ id: 1, transformed: true }]);
        });

        it('should handle handler that returns complex nested data', async function() {
            const complexData = {
                summary: { total: 1000, unique: 500 },
                breakdown: [
                    { date: '2024-01-01', count: 100 },
                    { date: '2024-01-02', count: 200 }
                ],
                metadata: {
                    query: 'events',
                    duration: 50
                }
            };

            const handler = async() => ({
                _queryMeta: { adapter: 'mongodb', query: {} },
                data: complexData
            });

            const queryDef = {
                name: 'COMPLEX_DATA_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});

            result.should.deepEqual(complexData);
            result.summary.total.should.equal(1000);
            result.breakdown.length.should.equal(2);
        });

        it('should handle multiple sequential queries', async function() {
            const handler1 = createMockHandler([{ query: 1 }]);
            const handler2 = createMockHandler([{ query: 2 }]);

            const queryDef1 = {
                name: 'QUERY_1',
                adapters: { mongodb: { handler: handler1 } }
            };

            const queryDef2 = {
                name: 'QUERY_2',
                adapters: { mongodb: { handler: handler2 } }
            };

            const result1 = await queryRunner.executeQuery(queryDef1, {});
            const result2 = await queryRunner.executeQuery(queryDef2, {});

            result1.should.deepEqual([{ query: 1 }]);
            result2.should.deepEqual([{ query: 2 }]);
            handler1.calls.length.should.equal(1);
            handler2.calls.length.should.equal(1);
        });

        it('should pass different params to same query definition', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'PARAMETERIZED_QUERY',
                adapters: { mongodb: { handler } }
            };

            await queryRunner.executeQuery(queryDef, { appId: 'app1' });
            await queryRunner.executeQuery(queryDef, { appId: 'app2' });
            await queryRunner.executeQuery(queryDef, { appId: 'app3' });

            handler.calls.length.should.equal(3);
            handler.calls[0].params.appId.should.equal('app1');
            handler.calls[1].params.appId.should.equal('app2');
            handler.calls[2].params.appId.should.equal('app3');
        });
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================
    describe('Edge Cases', function() {
        it('should handle empty adapters object in forced selection', async function() {
            const queryDef = {
                name: 'EMPTY_ADAPTERS',
                adapters: {}
            };

            should(() => {
                queryRunner.selectAdapterForDef(queryDef, 'mongodb');
            }).throw(/not supported by query/);
        });

        it('should handle query name with special characters', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'QUERY_WITH-SPECIAL.CHARS:123',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.should.deepEqual([{ id: 1 }]);
        });

        it('should handle transform returning undefined', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const transform = async() => undefined;

            const queryDef = {
                name: 'UNDEFINED_TRANSFORM',
                adapters: { mongodb: { handler, transform } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            should(result).be.undefined();
        });

        it('should handle very large result sets', async function() {
            const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item-${i}` }));
            const handler = createMockHandler(largeData);

            const queryDef = {
                name: 'LARGE_RESULT_QUERY',
                adapters: { mongodb: { handler } }
            };

            const result = await queryRunner.executeQuery(queryDef, {});
            result.length.should.equal(10000);
        });

        it('should handle params with circular references safely', async function() {
            const handler = createMockHandler([{ id: 1 }]);
            const queryDef = {
                name: 'CIRCULAR_PARAMS_QUERY',
                adapters: { mongodb: { handler } }
            };

            const params = { appId: '123' };
            params.self = params; // Circular reference

            // Should not throw during execution
            const result = await queryRunner.executeQuery(queryDef, params);
            result.should.deepEqual([{ id: 1 }]);
        });
    });
});
