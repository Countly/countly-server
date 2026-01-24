/**
 * DictionaryManager Unit Tests
 *
 * Tests all DictionaryManager methods including:
 * - Constructor initialization
 * - CREATE DICTIONARY query building
 * - Source clause building (CLICKHOUSE, FILE, HTTP)
 * - Layout clause building
 * - dictGet expression generation
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/dictionaryManager.unit.js'
 */
const should = require('should');
const path = require('path');


const { setupMocking, resetMocking, createMockClickHouseClient } = require('./helpers/mockSetup');

// Direct require of DictionaryManager (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const DictionaryManager = require(path.join(PLUGIN_ROOT, 'api/managers/DictionaryManager'));

describe('DictionaryManager Unit Tests', function() {
    before(function() {
        setupMocking();
    });
    after(function() {
        resetMocking();
    });
    let mockClient;
    let dictManager;

    beforeEach(function() {
        mockClient = createMockClickHouseClient();
        dictManager = new DictionaryManager(mockClient, 'test_db', 'test_dict');
    });

    // ========================================================================
    // Constructor
    // ========================================================================
    describe('Constructor', function() {
        it('should initialize with client, database, and name', function() {
            dictManager.client.should.equal(mockClient);
            dictManager.database.should.equal('test_db');
            dictManager.name.should.equal('test_dict');
        });

        it('should set fullName correctly', function() {
            dictManager.fullName.should.equal('test_db.test_dict');
        });

        it('should handle special characters in names', function() {
            const dm = new DictionaryManager(mockClient, 'my_database', 'my_dictionary');
            dm.fullName.should.equal('my_database.my_dictionary');
        });
    });

    // ========================================================================
    // _buildCreateQuery()
    // ========================================================================
    describe('_buildCreateQuery()', function() {
        it('should build basic dictionary CREATE statement', function() {
            const config = {
                structure: [
                    { name: 'id', type: 'UInt64' },
                    { name: 'value', type: 'String' }
                ],
                primaryKey: 'id',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'source_table' } },
                layout: { type: 'HASHED' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('CREATE DICTIONARY test_db.test_dict');
            result.should.containEql('id UInt64');
            result.should.containEql('value String');
        });

        it('should include structure columns', function() {
            const config = {
                structure: [
                    { name: 'key', type: 'String' },
                    { name: 'val1', type: 'Int32' },
                    { name: 'val2', type: 'Float64' }
                ],
                primaryKey: 'key',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'FLAT' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('key String');
            result.should.containEql('val1 Int32');
            result.should.containEql('val2 Float64');
        });

        it('should include single primary key', function() {
            const config = {
                structure: [{ name: 'id', type: 'UInt64' }],
                primaryKey: 'id',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'HASHED' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('PRIMARY KEY id');
        });

        it('should include array primary key', function() {
            const config = {
                structure: [
                    { name: 'app_id', type: 'String' },
                    { name: 'uid', type: 'String' }
                ],
                primaryKey: ['app_id', 'uid'],
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'COMPLEX_KEY_HASHED' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('PRIMARY KEY app_id, uid');
        });

        it('should include lifetime settings', function() {
            const config = {
                structure: [{ name: 'id', type: 'UInt64' }],
                primaryKey: 'id',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'HASHED' },
                lifetime: { min: 60, max: 120 }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('LIFETIME(MIN 60 MAX 120)');
        });

        it('should use default lifetime when not specified', function() {
            const config = {
                structure: [{ name: 'id', type: 'UInt64' }],
                primaryKey: 'id',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'HASHED' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('LIFETIME(MIN 0 MAX 0)');
        });

        it('should include range settings when provided', function() {
            const config = {
                structure: [
                    { name: 'id', type: 'UInt64' },
                    { name: 'start_date', type: 'Date' },
                    { name: 'end_date', type: 'Date' }
                ],
                primaryKey: 'id',
                source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                layout: { type: 'RANGE_HASHED' },
                range: { min: 'start_date', max: 'end_date' }
            };

            const result = dictManager._buildCreateQuery(config);
            result.should.containEql('RANGE(MIN start_date MAX end_date)');
        });
    });

    // ========================================================================
    // _buildSourceClause()
    // ========================================================================
    describe('_buildSourceClause()', function() {
        it('should build CLICKHOUSE source with local table', function() {
            const source = {
                type: 'CLICKHOUSE',
                params: { useLocalTable: true, table: 'my_table' }
            };

            const result = dictManager._buildSourceClause(source);
            result.should.containEql('SOURCE(CLICKHOUSE');
            result.should.containEql("TABLE 'my_table'");
        });

        it('should build CLICKHOUSE source with network params', function() {
            const source = {
                type: 'CLICKHOUSE',
                params: {
                    host: 'localhost',
                    port: 9000,
                    user: 'default',
                    db: 'test_db',
                    table: 'my_table'
                }
            };

            const result = dictManager._buildSourceClause(source);
            result.should.containEql('SOURCE(CLICKHOUSE');
            result.should.containEql("HOST 'localhost'");
            result.should.containEql('PORT 9000');
        });

        it('should build FILE source', function() {
            const source = {
                type: 'FILE',
                params: { path: '/data/dict.csv', format: 'CSV' }
            };

            const result = dictManager._buildSourceClause(source);
            result.should.containEql('SOURCE(FILE');
            result.should.containEql("PATH '/data/dict.csv'");
            result.should.containEql('FORMAT CSV');
        });

        it('should throw for FILE source without path', function() {
            const source = {
                type: 'FILE',
                params: { format: 'CSV' }
            };

            should.throws(() => {
                dictManager._buildSourceClause(source);
            }, /FILE source requires path and format/);
        });

        it('should throw for FILE source without format', function() {
            const source = {
                type: 'FILE',
                params: { path: '/data/dict.csv' }
            };

            should.throws(() => {
                dictManager._buildSourceClause(source);
            }, /FILE source requires path and format/);
        });

        it('should build HTTP source', function() {
            const source = {
                type: 'HTTP',
                params: { url: 'http://example.com/data', format: 'JSONEachRow' }
            };

            const result = dictManager._buildSourceClause(source);
            result.should.containEql('SOURCE(HTTP');
            result.should.containEql("URL 'http://example.com/data'");
            result.should.containEql('FORMAT JSONEachRow');
        });

        it('should throw for HTTP source without url', function() {
            const source = {
                type: 'HTTP',
                params: { format: 'JSONEachRow' }
            };

            should.throws(() => {
                dictManager._buildSourceClause(source);
            }, /HTTP source requires url and format/);
        });

        it('should throw for unsupported source type', function() {
            const source = {
                type: 'UNSUPPORTED',
                params: {}
            };

            should.throws(() => {
                dictManager._buildSourceClause(source);
            }, /Unsupported source type/);
        });
    });

    // ========================================================================
    // _buildLayoutClause()
    // ========================================================================
    describe('_buildLayoutClause()', function() {
        it('should build FLAT layout', function() {
            const layout = { type: 'FLAT' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(FLAT())');
        });

        it('should build HASHED layout', function() {
            const layout = { type: 'HASHED' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(HASHED())');
        });

        it('should build SPARSE_HASHED layout', function() {
            const layout = { type: 'SPARSE_HASHED' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(SPARSE_HASHED())');
        });

        it('should build DIRECT layout', function() {
            const layout = { type: 'DIRECT' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(DIRECT())');
        });

        it('should build COMPLEX_KEY_HASHED layout', function() {
            const layout = { type: 'COMPLEX_KEY_HASHED' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(COMPLEX_KEY_HASHED())');
        });

        it('should build COMPLEX_KEY_DIRECT layout', function() {
            const layout = { type: 'COMPLEX_KEY_DIRECT' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(COMPLEX_KEY_DIRECT())');
        });

        it('should build RANGE_HASHED layout', function() {
            const layout = { type: 'RANGE_HASHED' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(RANGE_HASHED())');
        });

        it('should build CACHE layout with size_in_cells', function() {
            const layout = { type: 'CACHE', params: { size_in_cells: 1000 } };
            const result = dictManager._buildLayoutClause(layout);
            result.should.containEql('LAYOUT(CACHE');
            result.should.containEql('SIZE_IN_CELLS 1000');
        });

        it('should build COMPLEX_KEY_CACHE layout', function() {
            const layout = { type: 'COMPLEX_KEY_CACHE', params: { size_in_cells: 500 } };
            const result = dictManager._buildLayoutClause(layout);
            result.should.containEql('LAYOUT(COMPLEX_KEY_CACHE');
            result.should.containEql('SIZE_IN_CELLS 500');
        });

        it('should build IP_TRIE layout', function() {
            const layout = { type: 'IP_TRIE' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(IP_TRIE())');
        });

        it('should handle lowercase layout type', function() {
            const layout = { type: 'hashed' };
            const result = dictManager._buildLayoutClause(layout);
            result.should.equal('LAYOUT(HASHED())');
        });
    });

    // ========================================================================
    // getDictGetExpression()
    // ========================================================================
    describe('getDictGetExpression()', function() {
        it('should return dictGet expression without default', function() {
            const result = dictManager.getDictGetExpression('value', 'key_column');
            result.should.equal("dictGet('test_db.test_dict', 'value', key_column)");
        });

        it('should return dictGetOrDefault with default expression', function() {
            const result = dictManager.getDictGetExpression('value', 'key_column', "'default_val'");
            result.should.equal("dictGetOrDefault('test_db.test_dict', 'value', key_column, 'default_val')");
        });

        it('should handle tuple key expression', function() {
            const result = dictManager.getDictGetExpression('canon', '(app_id, uid)');
            result.should.equal("dictGet('test_db.test_dict', 'canon', (app_id, uid))");
        });

        it('should handle numeric default', function() {
            const result = dictManager.getDictGetExpression('count', 'id', '0');
            result.should.equal("dictGetOrDefault('test_db.test_dict', 'count', id, 0)");
        });
    });

    // ========================================================================
    // Async Methods (with mock client)
    // ========================================================================
    describe('Async Methods', function() {

        describe('create()', function() {
            it('should execute CREATE DICTIONARY query', async function() {
                const config = {
                    structure: [{ name: 'id', type: 'UInt64' }],
                    primaryKey: 'id',
                    source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                    layout: { type: 'HASHED' }
                };

                await dictManager.create(config);
                // No error means success with mock client
            });

            it('should not throw on "already exists" error', async function() {
                const config = {
                    structure: [{ name: 'id', type: 'UInt64' }],
                    primaryKey: 'id',
                    source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                    layout: { type: 'HASHED' }
                };

                // Create client that throws "already exists"
                const errorClient = createMockClickHouseClient({
                    execError: new Error('Dictionary already exists')
                });
                const dm = new DictionaryManager(errorClient, 'test', 'dict');

                // Should not throw
                await dm.create(config);
            });

            it('should throw on other errors', async function() {
                const config = {
                    structure: [{ name: 'id', type: 'UInt64' }],
                    primaryKey: 'id',
                    source: { type: 'CLICKHOUSE', params: { useLocalTable: true, table: 'src' } },
                    layout: { type: 'HASHED' }
                };

                const errorClient = createMockClickHouseClient({
                    execError: new Error('Connection failed')
                });
                const dm = new DictionaryManager(errorClient, 'test', 'dict');

                await should(dm.create(config)).be.rejectedWith(/Connection failed/);
            });
        });

        describe('drop()', function() {
            it('should execute DROP DICTIONARY query', async function() {
                await dictManager.drop(true);
                // No error means success
            });

            it('should build DROP IF EXISTS by default', async function() {
                await dictManager.drop();
                // No error means success
            });
        });

        describe('reload()', function() {
            it('should execute SYSTEM RELOAD DICTIONARY', async function() {
                await dictManager.reload();
                // No error means success
            });
        });

        describe('exists()', function() {
            it('should return true when dictionary exists', async function() {
                const clientWithResult = createMockClickHouseClient({
                    queryResults: [{ count: 1 }]
                });
                const dm = new DictionaryManager(clientWithResult, 'test', 'dict');

                const result = await dm.exists();
                result.should.be.true();
            });

            it('should return false when dictionary does not exist', async function() {
                const clientWithResult = createMockClickHouseClient({
                    queryResults: [{ count: 0 }]
                });
                const dm = new DictionaryManager(clientWithResult, 'test', 'dict');

                const result = await dm.exists();
                result.should.be.false();
            });
        });
    });
});
