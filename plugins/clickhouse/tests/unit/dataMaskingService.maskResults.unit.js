/**
 * DataMaskingService maskResults Unit Tests for drill_snapshots
 *
 * Tests maskResults function with different bucket_kind formats:
 * - snapshot, seg, d, m, w, h, tot, null, undefined
 * - Different s column indices (s0-s4)
 * - Mixed bucket types
 * - Fallback behavior
 *
 * Usage:
 *   NODE_PATH=./node_modules npx mocha 'plugins/clickhouse/tests/unit/dataMaskingService.maskResults.unit.js'
 */
const should = require('should');
const path = require('path');

// Setup module mocking BEFORE requiring DataMaskingService
require('./helpers/mockSetup');

// Direct require of DataMaskingService (after mocking is set up)
const PLUGIN_ROOT = path.resolve(__dirname, '../..');
const DataMaskingService = require(path.join(PLUGIN_ROOT, 'api/DataMaskingService'));

describe('DataMaskingService - maskResults for drill_snapshots with different bucket_kind formats', function() {
    let maskingService;
    let mockPlugins;

    beforeEach(function() {
        maskingService = new DataMaskingService();

        // Mock plugins with getMaskingSettings method
        mockPlugins = {
            getMaskingSettings: function(appId) {
                if (appId === 'test-app-123') {
                    return {
                        prop: {
                            'up': {
                                'cc': true, // Mask country code
                                'os': false, // Don't mask OS
                                'did': true // Mask device ID
                            },
                            'custom': {
                                'sensitive_value': true
                            }
                        }
                    };
                }
                return null;
            }
        };

        maskingService.setPlugins(mockPlugins);
        maskingService.setAppId('test-app-123');
    });

    describe('bucket_kind: snapshot', function() {
        it('should mask only s1 (up.cc) in snapshot bucket_kind results', function() {
            const query = `WITH Source AS (
                SELECT bucket_kind,s0,s1,s2,s3,s4, u, t, s, dur, lu FROM countly_drill.drill_snapshots WHERE \`_id\`::String = {p0:String}
            )
                SELECT 'snapshot' as bucket_kind, 't' as prop, s0,s1,s2,s3,s4, t as val, toFloat64(0) as val_float, lu FROM Source`;

            const projectionKey = ['up.os', 'up.cc', 'up.did'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    prop: 't',
                    s0: 'iOS', // up.os - should NOT be masked
                    s1: 'US', // up.cc - should be masked
                    s2: 'device123', // up.did - should be masked
                    s3: null,
                    s4: null,
                    val: 100,
                    val_float: 0,
                    lu: new Date('2024-01-01')
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('snapshot');
            maskedResults[0].s0.should.equal('iOS'); // Not masked
            maskedResults[0].s1.should.equal(''); // Masked (up.cc)
            maskedResults[0].s2.should.equal(''); // Masked (up.did)
            maskedResults[0].val.should.equal(100);
        });

        it('should handle multiple snapshot rows with different props', function() {
            const query = `WITH Source AS (
                SELECT bucket_kind,s0,s1,s2,s3,s4, u, t, s, dur, lu FROM countly_drill.drill_snapshots
            )
                SELECT 'snapshot' as bucket_kind, 't' as prop, s0,s1,s2,s3,s4, t as val, toFloat64(0) as val_float, lu FROM Source
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'u' as prop, s0,s1,s2,s3,s4, u as val, toFloat64(0) as val_float, lu FROM Source`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    prop: 't',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    val: 100,
                    val_float: 0,
                    lu: new Date('2024-01-01')
                },
                {
                    bucket_kind: 'snapshot',
                    prop: 'u',
                    s0: 'Android',
                    s1: 'TR', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    val: 50,
                    val_float: 0,
                    lu: new Date('2024-01-01')
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(2);
            maskedResults[0].bucket_kind.should.equal('snapshot');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
            maskedResults[1].bucket_kind.should.equal('snapshot');
            maskedResults[1].s0.should.equal('Android');
            maskedResults[1].s1.should.equal('');
        });
    });

    describe('bucket_kind: seg (segment)', function() {
        it('should mask s0-s4 columns in seg bucket_kind results', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots WHERE bucket_kind = 'seg'`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'seg',
                    s0: 'iOS', // up.os - should NOT be masked
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('seg');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].u.should.equal(100);
        });
    });

    describe('bucket_kind: d (day)', function() {
        it('should mask s0-s4 columns in d bucket_kind results', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur, period FROM drill_snapshots WHERE bucket_kind = 'd'`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'd',
                    period: '2024-01-15',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('d');
            maskedResults[0].period.should.equal('2024-01-15');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('bucket_kind: m (month)', function() {
        it('should mask s0-s4 columns in m bucket_kind results', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur, period FROM drill_snapshots WHERE bucket_kind = 'm'`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'm',
                    period: '2024:01',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('m');
            maskedResults[0].period.should.equal('2024:01');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('bucket_kind: w (week)', function() {
        it('should mask s0-s4 columns in w bucket_kind results', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur, period FROM drill_snapshots WHERE bucket_kind = 'w'`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'w',
                    period: '2024:w03',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('w');
            maskedResults[0].period.should.equal('2024:w03');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('bucket_kind: h (hour)', function() {
        it('should mask s0-s4 columns in h bucket_kind results', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur, period FROM drill_snapshots WHERE bucket_kind = 'h'`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'h',
                    period: '2024:01:15:h10',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('h');
            maskedResults[0].period.should.equal('2024:01:15:h10');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('bucket_kind: tot (totals)', function() {
        it('should NOT mask s0-s4 columns in tot bucket_kind results (totals row)', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'tot',
                    s0: '',
                    s1: '',
                    s2: '',
                    s3: '',
                    s4: '',
                    u: 1000,
                    t: 2000,
                    s: 3000,
                    dur: 4000
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].bucket_kind.should.equal('tot');
            // Totals row should NOT be masked (even if properties are masked)
            // The values remain as empty strings (as they were in the original)
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].u.should.equal(1000);
        });
    });

    describe('bucket_kind: NULL', function() {
        it('should mask s0-s4 columns when bucket_kind is NULL', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: null,
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            should(maskedResults[0].bucket_kind).be.null();
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('bucket_kind: undefined', function() {
        it('should mask s0-s4 columns when bucket_kind is undefined', function() {
            const query = `SELECT s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    // bucket_kind is undefined
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            should(maskedResults[0].bucket_kind).be.undefined();
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
        });
    });

    describe('row.row: total', function() {
        it('should NOT mask s0-s4 columns when row.row is "total"', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'seg',
                    row: 'total',
                    s0: '',
                    s1: '',
                    s2: '',
                    s3: '',
                    s4: '',
                    u: 1000,
                    t: 2000,
                    s: 3000,
                    dur: 4000
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].row.should.equal('total');
            // Total row should NOT be masked
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].u.should.equal(1000);
        });
    });

    describe('Mixed bucket_kind values', function() {
        it('should handle mixed bucket_kind values in the same result set', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t, s, dur FROM drill_snapshots`;

            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'iOS',
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200,
                    s: 300,
                    dur: 400
                },
                {
                    bucket_kind: 'd',
                    period: '2024-01-15',
                    s0: 'Android',
                    s1: 'TR', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 50,
                    t: 100,
                    s: 150,
                    dur: 200
                },
                {
                    bucket_kind: 'tot',
                    s0: '',
                    s1: '',
                    s2: '',
                    s3: '',
                    s4: '',
                    u: 150,
                    t: 300,
                    s: 450,
                    dur: 600
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(3);
            // First row (snapshot) - should be masked
            maskedResults[0].bucket_kind.should.equal('snapshot');
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
            // Second row (d) - should be masked
            maskedResults[1].bucket_kind.should.equal('d');
            maskedResults[1].s0.should.equal('Android');
            maskedResults[1].s1.should.equal('');
            // Third row (tot) - should NOT be masked
            maskedResults[2].bucket_kind.should.equal('tot');
            maskedResults[2].s0.should.equal('');
            maskedResults[2].s1.should.equal('');
        });
    });

    describe('Different s column indices', function() {
        it('should mask s0 when projectionKey maps masked property to s0', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t FROM drill_snapshots`;
            // projectionKey maps: s0='up.cc', s1='up.os'
            const projectionKey = ['up.cc', 'up.os'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'US', // up.cc - should be masked
                    s1: 'iOS', // up.os - should NOT be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('iOS');
        });

        it('should mask s4 when projectionKey maps masked property to s4', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t FROM drill_snapshots`;
            // projectionKey maps: s0='up.os', s1='up.did', s2='up.username', s3='up.email', s4='up.cc'
            const projectionKey = ['up.os', 'up.did', 'up.username', 'up.email', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'iOS',
                    s1: 'device123',
                    s2: 'john_doe',
                    s3: 'john@example.com',
                    s4: 'US', // up.cc - should be masked
                    u: 100,
                    t: 200
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal(''); // up.did is masked
            maskedResults[0].s2.should.equal('john_doe');
            maskedResults[0].s3.should.equal('john@example.com');
            maskedResults[0].s4.should.equal(''); // up.cc is masked
        });
    });

    describe('Fallback behavior', function() {
        it('should mask all s0-s4 when projectionKey is not provided', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t FROM drill_snapshots`;
            const projectionKey = null;

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'iOS',
                    s1: 'US',
                    s2: 'device123',
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            // All s0-s4 should be masked (fallback)
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].s2.should.equal('');
            maskedResults[0].s3.should.equal('');
            maskedResults[0].s4.should.equal('');
        });

        it('should mask all s0-s4 when projectionKey is empty array', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t FROM drill_snapshots`;
            const projectionKey = [];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'iOS',
                    s1: 'US',
                    s2: 'device123',
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            // All s0-s4 should be masked (fallback)
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].s2.should.equal('');
            maskedResults[0].s3.should.equal('');
            maskedResults[0].s4.should.equal('');
        });
    });

    describe('Custom property groups', function() {
        it('should mask s columns for custom property group', function() {
            const query = `SELECT bucket_kind, s0,s1,s2,s3,s4, u, t FROM drill_snapshots`;
            // projectionKey maps: s0='custom.sensitive_value', s1='up.os'
            const projectionKey = ['custom.sensitive_value', 'up.os'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    s0: 'secret123', // custom.sensitive_value - should be masked
                    s1: 'iOS', // up.os - should NOT be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    u: 100,
                    t: 200
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(1);
            maskedResults[0].s0.should.equal('');
            maskedResults[0].s1.should.equal('iOS');
        });
    });

    describe('Exact query format from user example', function() {
        it('should handle the exact query format from user example', function() {
            const query = `WITH Source AS (
                SELECT bucket_kind,s0,s1,s2,s3,s4, u, t, s, dur, lu FROM countly_drill.drill_snapshots WHERE \`_id\`::String = {p0:String} AND \`cd\`::String = {p1:String}
            )
                SELECT 'snapshot' as bucket_kind, 't' as prop, s0,s1,s2,s3,s4, t as val, toFloat64(0) as val_float, lu FROM Source order BY val ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'u' as prop, s0,s1,s2,s3,s4, u as val, toFloat64(0) as val_float, lu FROM Source order BY val ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'dur' as prop, s0,s1,s2,s3,s4,toUInt32(0) as val, dur as val_float, lu FROM Source order BY val_float ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 's' as prop, s0,s1,s2,s3,s4, toUInt32(0) as val,s as val_float, lu FROM Source order BY val_float ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'a' as prop , s0,s1,s2,s3,s4,toUInt32(0) as val, (toUInt8(u) ? toFloat64(t) / toFloat64(u) : toFloat64(0)) as val_float, lu FROM Source order BY val_float ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'dur_at' as prop, s0,s1,s2,s3,s4,toUInt32(0) as val, (toUInt8(t) ? dur / toFloat64(t) : toFloat64(0)) as val_float, lu FROM Source order BY val_float ASC LIMIT 10
                UNION ALL
                SELECT 'snapshot' as bucket_kind, 'adur' as prop, s0,s1,s2,s3,s4, toUInt32(0) as val, (toUInt8(u) ? dur / toFloat64(u) : toFloat64(0)) as val_float, lu FROM Source order BY val_float ASC LIMIT 10`;

            // Assume projectionKey maps: s0='up.os', s1='up.cc' (cc is in s1)
            const projectionKey = ['up.os', 'up.cc'];

            const results = [
                {
                    bucket_kind: 'snapshot',
                    prop: 't',
                    s0: 'iOS', // up.os - should NOT be masked
                    s1: 'US', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    val: 100,
                    val_float: 0,
                    lu: new Date('2024-01-01')
                },
                {
                    bucket_kind: 'snapshot',
                    prop: 'u',
                    s0: 'Android', // up.os - should NOT be masked
                    s1: 'TR', // up.cc - should be masked
                    s2: null,
                    s3: null,
                    s4: null,
                    val: 50,
                    val_float: 0,
                    lu: new Date('2024-01-01')
                }
            ];

            const maskedResults = maskingService.maskResults(results, query, projectionKey);

            maskedResults.should.have.length(2);
            // First result
            maskedResults[0].s0.should.equal('iOS');
            maskedResults[0].s1.should.equal('');
            maskedResults[0].val.should.equal(100);
            // Second result
            maskedResults[1].s0.should.equal('Android');
            maskedResults[1].s1.should.equal('');
            maskedResults[1].val.should.equal(50);
        });
    });
});
