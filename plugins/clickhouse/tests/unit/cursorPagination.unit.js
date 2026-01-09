/**
 * CursorPagination Unit Tests
 *
 * Tests all CursorPagination static methods including:
 * - Date formatting for ClickHouse
 * - Cursor encoding/decoding
 * - WHERE clause building
 * - Pagination response building
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/cursorPagination.unit.js'
 */
const should = require('should');
const path = require('path');

// Setup module mocking BEFORE requiring CursorPagination
require('./helpers/mockSetup');

// Direct require of CursorPagination (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const CursorPagination = require(path.join(PLUGIN_ROOT, 'api/CursorPagination'));

describe('CursorPagination Unit Tests', function() {

    // ========================================================================
    // Date Formatting
    // ========================================================================
    describe('Date Formatting', function() {

        describe('formatDateForClickHouse()', function() {
            it('should format date as YYYY-MM-DD HH:MM:SS.mmm', function() {
                const date = new Date('2024-06-15T14:30:45.123Z');
                const result = CursorPagination.formatDateForClickHouse(date);
                // Note: Result depends on local timezone, so check format
                result.should.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
            });

            it('should handle midnight correctly', function() {
                const date = new Date('2024-01-01T00:00:00.000Z');
                const result = CursorPagination.formatDateForClickHouse(date);
                result.should.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.000$/);
            });

            it('should handle end of day correctly', function() {
                const date = new Date('2024-12-31T23:59:59.999Z');
                const result = CursorPagination.formatDateForClickHouse(date);
                result.should.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.999$/);
            });

            it('should preserve milliseconds', function() {
                const date = new Date('2024-06-15T10:20:30.456Z');
                const result = CursorPagination.formatDateForClickHouse(date);
                result.should.containEql('.456');
            });
        });

        describe('formatTimestampForClickHouse()', function() {
            it('should format Date object', function() {
                const date = new Date('2024-06-15T14:30:45.123Z');
                const result = CursorPagination.formatTimestampForClickHouse(date);
                result.should.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
            });

            it('should pass through already-formatted string', function() {
                const formatted = '2024-06-15 14:30:45.123';
                const result = CursorPagination.formatTimestampForClickHouse(formatted);
                result.should.equal(formatted);
            });

            it('should handle ISO string with Z suffix', function() {
                const isoString = '2024-06-15T14:30:45.123Z';
                const result = CursorPagination.formatTimestampForClickHouse(isoString);
                result.should.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
            });

            it('should return null for null input', function() {
                const result = CursorPagination.formatTimestampForClickHouse(null);
                should(result).be.null();
            });

            it('should return null for undefined input', function() {
                const result = CursorPagination.formatTimestampForClickHouse(undefined);
                should(result).be.null();
            });

            it('should return null for invalid date string', function() {
                const result = CursorPagination.formatTimestampForClickHouse('invalid');
                should(result).be.null();
            });
        });
    });

    // ========================================================================
    // Cursor Encoding/Decoding
    // ========================================================================
    describe('Cursor Encoding/Decoding', function() {

        describe('encodeCursor()', function() {
            it('should return Base64 encoded string', function() {
                const cursorData = { ts: '2024-06-15 14:30:45.123', _id: 'abc123' };
                const result = CursorPagination.encodeCursor(cursorData);
                result.should.be.a.String();
                // Verify it's valid base64
                const decoded = Buffer.from(result, 'base64').toString();
                JSON.parse(decoded).should.deepEqual(cursorData);
            });

            it('should return null for null input', function() {
                const result = CursorPagination.encodeCursor(null);
                should(result).be.null();
            });

            it('should return null for undefined input', function() {
                const result = CursorPagination.encodeCursor(undefined);
                should(result).be.null();
            });

            it('should return null for empty object', function() {
                const result = CursorPagination.encodeCursor({});
                should(result).be.null();
            });

            it('should handle complex cursor data', function() {
                const cursorData = {
                    ts: '2024-06-15 14:30:45.123',
                    _id: 'abc123',
                    mode: 'snapshot',
                    snapshotTs: '2024-06-15 14:30:00.000'
                };
                const result = CursorPagination.encodeCursor(cursorData);
                result.should.be.a.String();
                const decoded = JSON.parse(Buffer.from(result, 'base64').toString());
                decoded.should.deepEqual(cursorData);
            });
        });

        describe('decodeCursor()', function() {
            it('should decode Base64 cursor', function() {
                const cursorData = { ts: '2024-06-15 14:30:45.123', _id: 'abc123' };
                const encoded = CursorPagination.encodeCursor(cursorData);
                const result = CursorPagination.decodeCursor(encoded);
                result.should.deepEqual(cursorData);
            });

            it('should return null for null input', function() {
                const result = CursorPagination.decodeCursor(null);
                should(result).be.null();
            });

            it('should return null for undefined input', function() {
                const result = CursorPagination.decodeCursor(undefined);
                should(result).be.null();
            });

            it('should return null for empty string', function() {
                const result = CursorPagination.decodeCursor('');
                should(result).be.null();
            });

            it('should return null for invalid cursor', function() {
                const result = CursorPagination.decodeCursor('not-valid-base64-json');
                should(result).be.null();
            });

            it('should roundtrip encode/decode', function() {
                const original = {
                    ts: '2024-06-15 14:30:45.123',
                    _id: 'test-id',
                    mode: 'snapshot',
                    snapshotTs: '2024-06-15 14:00:00.000'
                };
                const encoded = CursorPagination.encodeCursor(original);
                const decoded = CursorPagination.decodeCursor(encoded);
                decoded.should.deepEqual(original);
            });
        });
    });

    // ========================================================================
    // WHERE Clause Building
    // ========================================================================
    describe('buildCursorWhere()', function() {

        it('should return empty for null cursorData', function() {
            const result = CursorPagination.buildCursorWhere(null, 'DESC');
            result.sql.should.equal('');
            result.params.should.deepEqual({});
        });

        it('should return empty for undefined cursorData', function() {
            const result = CursorPagination.buildCursorWhere(undefined, 'DESC');
            result.sql.should.equal('');
            result.params.should.deepEqual({});
        });

        it('should return empty for cursorData without ts or _id', function() {
            const result = CursorPagination.buildCursorWhere({ mode: 'live' }, 'DESC');
            result.sql.should.equal('');
        });

        it('should build ts condition for DESC sort', function() {
            const cursorData = { ts: '2024-06-15 14:30:45.123' };
            const result = CursorPagination.buildCursorWhere(cursorData, 'DESC');
            result.sql.should.containEql('ts <');
            result.params.should.have.property('cursor_ts');
        });

        it('should build ts condition for ASC sort', function() {
            const cursorData = { ts: '2024-06-15 14:30:45.123' };
            const result = CursorPagination.buildCursorWhere(cursorData, 'ASC');
            result.sql.should.containEql('ts >');
            result.params.should.have.property('cursor_ts');
        });

        it('should include _id tiebreaker when provided', function() {
            const cursorData = { ts: '2024-06-15 14:30:45.123', _id: 'abc123' };
            const result = CursorPagination.buildCursorWhere(cursorData, 'DESC');
            result.sql.should.containEql('_id');
            result.params.should.have.property('cursor_id', 'abc123');
        });

        it('should add snapshot boundary when in SNAPSHOT mode', function() {
            const cursorData = {
                ts: '2024-06-15 14:30:45.123',
                snapshotTs: '2024-06-15 14:00:00.000'
            };
            const result = CursorPagination.buildCursorWhere(cursorData, 'DESC', CursorPagination.MODES.SNAPSHOT);
            result.sql.should.containEql('snapshot_ts');
            result.params.should.have.property('snapshot_ts');
        });

        it('should not add snapshot boundary in LIVE mode', function() {
            const cursorData = {
                ts: '2024-06-15 14:30:45.123',
                snapshotTs: '2024-06-15 14:00:00.000'
            };
            const result = CursorPagination.buildCursorWhere(cursorData, 'DESC', CursorPagination.MODES.LIVE);
            result.sql.should.not.containEql('snapshot_ts');
        });

        it('should handle _id only cursor', function() {
            const cursorData = { _id: 'abc123' };
            const result = CursorPagination.buildCursorWhere(cursorData, 'DESC');
            result.sql.should.containEql('_id');
            result.params.should.have.property('cursor_id', 'abc123');
        });
    });

    // ========================================================================
    // Cursor Extraction
    // ========================================================================
    describe('extractCursorFromRow()', function() {

        it('should extract ts and _id from last row', function() {
            const data = [
                { ts: '2024-06-15 14:30:45.123', _id: 'id1' },
                { ts: '2024-06-15 14:30:46.456', _id: 'id2' }
            ];
            const result = CursorPagination.extractCursorFromRow(data);
            result.should.have.property('ts', '2024-06-15 14:30:46.456');
            result.should.have.property('_id', 'id2');
        });

        it('should return null for empty data', function() {
            const result = CursorPagination.extractCursorFromRow([]);
            should(result).be.null();
        });

        it('should return null for null data', function() {
            const result = CursorPagination.extractCursorFromRow(null);
            should(result).be.null();
        });

        it('should return null for undefined data', function() {
            const result = CursorPagination.extractCursorFromRow(undefined);
            should(result).be.null();
        });

        it('should include snapshotTs in SNAPSHOT mode', function() {
            const data = [{ ts: '2024-06-15 14:30:45.123', _id: 'id1' }];
            const result = CursorPagination.extractCursorFromRow(
                data,
                CursorPagination.MODES.SNAPSHOT,
                '2024-06-15 14:00:00.000'
            );
            result.should.have.property('snapshotTs', '2024-06-15 14:00:00.000');
            result.should.have.property('mode', 'snapshot');
        });

        it('should include mode in result', function() {
            const data = [{ ts: '2024-06-15 14:30:45.123', _id: 'id1' }];
            const result = CursorPagination.extractCursorFromRow(data, CursorPagination.MODES.LIVE);
            result.should.have.property('mode', 'live');
        });
    });

    // ========================================================================
    // Pagination Response Building
    // ========================================================================
    describe('buildPaginationResponse()', function() {

        it('should return hasNextPage=true when data length exceeds limit', function() {
            const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const countResult = { total: 100, isApproximate: false };
            const result = CursorPagination.buildPaginationResponse(data, 2, countResult);
            result.hasNextPage.should.be.true();
            result.data.should.have.length(2);
        });

        it('should return hasNextPage=false when data length equals limit', function() {
            const data = [{ id: 1 }, { id: 2 }];
            const countResult = { total: 2, isApproximate: false };
            const result = CursorPagination.buildPaginationResponse(data, 2, countResult);
            result.hasNextPage.should.be.false();
        });

        it('should include total from countResult', function() {
            const data = [{ id: 1 }];
            const countResult = { total: 100, isApproximate: false };
            const result = CursorPagination.buildPaginationResponse(data, 10, countResult);
            result.total.should.equal(100);
        });

        it('should include isApproximate from countResult', function() {
            const data = [{ id: 1 }];
            const countResult = { total: 100, isApproximate: true };
            const result = CursorPagination.buildPaginationResponse(data, 10, countResult);
            result.isApproximate.should.be.true();
        });

        it('should include paginationMode', function() {
            const data = [{ id: 1 }];
            const countResult = { total: 1, isApproximate: false };
            const result = CursorPagination.buildPaginationResponse(
                data, 10, countResult, CursorPagination.MODES.SNAPSHOT
            );
            result.paginationMode.should.equal('snapshot');
        });
    });

    // ========================================================================
    // Pagination Mode
    // ========================================================================
    describe('Pagination Modes', function() {

        describe('MODES', function() {
            it('should have SNAPSHOT mode', function() {
                CursorPagination.MODES.should.have.property('SNAPSHOT', 'snapshot');
            });

            it('should have LIVE mode', function() {
                CursorPagination.MODES.should.have.property('LIVE', 'live');
            });
        });

        describe('determinePaginationMode()', function() {
            it('should return SNAPSHOT by default', function() {
                const result = CursorPagination.determinePaginationMode({});
                result.should.equal('snapshot');
            });

            it('should use explicit paginationMode if valid', function() {
                const result = CursorPagination.determinePaginationMode({ paginationMode: 'live' });
                result.should.equal('live');
            });

            it('should ignore invalid paginationMode', function() {
                const result = CursorPagination.determinePaginationMode({ paginationMode: 'invalid' });
                result.should.equal('snapshot');
            });
        });
    });
});
