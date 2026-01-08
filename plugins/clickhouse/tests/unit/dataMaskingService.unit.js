const DataMaskingService = require('../../api/DataMaskingService');
const should = require("should");

describe('DataMaskingService - top-level fields and aliases (generalized)', function() {
    it('should remove aliases referencing masked top-level fields via top.fields', function() {
        const DataMaskingService = require('../../api/DataMaskingService');
        const svc = new DataMaskingService();

        // Configure masking for top-level 'ts' only through generalized interface
        svc.setPlugins({
            getMaskingSettings: function(appId) {
                if (appId === 'app-2') {
                    return { top: { fields: ['ts'] } };
                }
                return null;
            }
        });
        svc.setAppId('app-2');

        const query = "SELECT ts AS ts_alias, e FROM drill_events";

        // Query-level masking should not modify query here
        const mq = svc.maskQueryString(query, {});
        mq.masked.should.equal(false);
        mq.query.should.equal(query);

        // Result-level masking removes alias referencing masked top-level 'ts'
        const rows = [{ ts_alias: 111, e: 'AnyEvent' }];
        const masked = svc.maskResults(rows, query);
        masked.should.have.length(1);
        should(masked[0].ts_alias).be.undefined();
        masked[0].e.should.equal('AnyEvent');
    });

    it('should remove masked top-level field key directly from result rows', function() {
        const DataMaskingService = require('../../api/DataMaskingService');
        const svc = new DataMaskingService();

        svc.setPlugins({
            getMaskingSettings: function(appId) {
                if (appId === 'app-3') {
                    return { top: { fields: ['ts'] } };
                }
                return null;
            }
        });
        svc.setAppId('app-3');

        const query = "SELECT ts, e FROM drill_events";

        const mq = svc.maskQueryString(query, {});
        mq.masked.should.equal(false);
        mq.query.should.equal(query);

        const rows = [{ ts: 1730280000, e: 'Purchase' }];
        const masked = svc.maskResults(rows, query);
        masked.should.have.length(1);
        should(masked[0].ts).be.undefined();
        masked[0].e.should.equal('Purchase');
    });

    it('should remove a different top-level field alias and an aliased segment in a complex query', function() {
        const DataMaskingService = require('../../api/DataMaskingService');
        const svc = new DataMaskingService();

        // Mask top-level 'uid' and segment 'country' for Purchase
        svc.setPlugins({
            getMaskingSettings: function(appId) {
                if (appId === 'app-4') {
                    return {
                        top: { fields: ['uid'] },
                        events: { Purchase: { sg: { country: true } } }
                    };
                }
                return null;
            }
        });
        svc.setAppId('app-4');

        const query = "SELECT concat(uid, '-x') AS user_id, arrayFilter(x -> x != '', groupArrayDistinct(JSONExtractString(sg, 'country'))) AS countries, formatDate(ts, '%Y-%m-%d') AS day, sum(multiIf(ts > {ts:Int64}, c, 0)) AS c, e FROM drill_events WHERE e = 'Purchase' GROUP BY e, day ORDER BY c DESC LIMIT 10";

        // Complex functions present; query-level masking should not alter the query
        const mq = svc.maskQueryString(query, {});
        mq.masked.should.equal(false);
        mq.query.should.equal(query);

        // Result-level masking should remove 'user_id' (alias of masked uid) and 'countries' (alias of masked sg.country)
        const rows = [{
            e: 'Purchase',
            user_id: 'u1-x',
            countries: ['US', 'TR'],
            day: '2025-10-30',
            c: 100
        }];

        const masked = svc.maskResults(rows, query);
        masked.should.have.length(1);
        should(masked[0].user_id).be.undefined();
        should(masked[0].countries).be.undefined();
        masked[0].day.should.equal('2025-10-30');
        masked[0].c.should.equal(100);
        masked[0].e.should.equal('Purchase');
    });
});

describe("ClickHouse DataMaskingService", function() {
    let maskingService;
    let mockPlugins;

    beforeEach(function() {
        maskingService = new DataMaskingService();

        // Mock plugins with getMaskingSettings method
        mockPlugins = {
            getMaskingSettings: function(appId) {
                if (appId === 'test-app-123') {
                    return {
                        events: {
                            'Purchase': {
                                sg: {
                                    'payment_method': true,
                                    'customer_email': true,
                                    'amount': false
                                }
                            }
                        },
                        prop: {
                            'up': {
                                'did': true,
                                'username': false
                            },
                            'custom': {
                                'sensitive_value': true
                            },
                            'cmp': {
                                'campaign_id': true
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

    describe("maskQueryString", function() {

        it("should mask sg field when event masking is configured", function() {
            const query = 'SELECT a, e, sg, up FROM drill_events WHERE a = {app:String}';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, up FROM drill_events WHERE a = {app:String}');
        });

        it("should mask specific properties in queries", function() {
            const query = 'SELECT a, e, up.did, up.username, custom.sensitive_value FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.containEql('a, e, up.username');
            result.query.should.not.containEql('up.did');
            result.query.should.not.containEql('custom.sensitive_value');
        });

        it("should mask specific segment fields granularly", function() {
            const query = 'SELECT a, e, sg.payment_method, sg.customer_email, sg.amount FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, sg.amount FROM drill_events');
        });

        it("should handle JSONExtract patterns in queries", function() {
            const query = 'SELECT a, e, JSONExtract(sg, \'payment_method\') as payment, JSONExtract(sg, \'amount\') as amount FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, JSONExtract(sg, \'amount\') as amount FROM drill_events');
        });

        it("should handle mixed specific and general sg field", function() {
            const query = 'SELECT a, e, sg, sg.payment_method FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e FROM drill_events');
        });

        it("should handle bracket notation for segments", function() {
            const query = 'SELECT a, e, sg[\'payment_method\'], sg[\'amount\'] FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, sg[\'amount\'] FROM drill_events');
        });

        it("should handle JSONExtractString patterns", function() {
            const query = 'SELECT a, e, JSONExtractString(sg, \'payment_method\') as payment, JSONExtractString(sg, \'amount\') as amount FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, JSONExtractString(sg, \'amount\') as amount FROM drill_events');
        });

        it("should not mask when no segments are configured for masking", function() {
            const query = 'SELECT a, e, sg.product_category, sg.brand FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
        });

        it("should handle property masking with bracket notation", function() {
            const query = 'SELECT a, e, up[\'did\'], up[\'username\'] FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, up[\'username\'] FROM drill_events');
        });

        it("should handle property masking with JSONExtract", function() {
            const query = 'SELECT a, e, JSONExtract(up, \'did\') as device_id, JSONExtract(up, \'username\') as user FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, JSONExtract(up, \'username\') as user FROM drill_events');
        });

        it("should handle complex queries with multiple masked fields", function() {
            const query = 'SELECT a, e, sg.payment_method, up.did, custom.sensitive_value, cmp.campaign_id FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e FROM drill_events');
        });

        it("should handle queries with aliases and complex expressions", function() {
            const query = 'SELECT a, e, JSONExtract(sg, \'payment_method\') as payment_type, up.did as device_id FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e FROM drill_events');
        });
    });

    describe("maskResults", function() {
        it("should mask event segments in drill_events results", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: {
                        'payment_method': 'credit_card',
                        'customer_email': 'user@example.com',
                        'amount': '100'
                    },
                    up: { did: 'device123' }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults[0].sg.should.deepEqual({
                'amount': '100'
            });
            should(maskedResults[0].sg.payment_method).be.undefined();
            should(maskedResults[0].sg.customer_email).be.undefined();
        });

        it("should mask user properties in drill_events results", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    up: {
                        'did': 'device123',
                        'username': 'john_doe',
                        'email': 'john@example.com'
                    },
                    custom: {
                        'sensitive_value': 'secret',
                        'public_value': 'visible'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults[0].up.should.deepEqual({
                'username': 'john_doe',
                'email': 'john@example.com'
            });
            should(maskedResults[0].up.did).be.undefined();

            maskedResults[0].custom.should.deepEqual({
                'public_value': 'visible'
            });
            should(maskedResults[0].custom.sensitive_value).be.undefined();
        });

        it("should remove empty objects after masking", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    up: {
                        'did': 'device123',
                        'username': 'john_doe',
                        'email': 'john@example.com'
                    }
                }
            ];

            // Set up masking to remove all up properties
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'username': true,
                                    'email': true
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const maskedResults = maskingService.maskResults(results, '');

            should(maskedResults[0].up).be.undefined();
        });

        it("should handle results with key field instead of e field", function() {
            const results = [
                {
                    a: 'test-app-123',
                    key: 'Purchase', // Some queries might use 'key' instead of 'e'
                    sg: {
                        'payment_method': 'credit_card',
                        'amount': '100'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults[0].sg.should.deepEqual({
                'amount': '100'
            });
            should(maskedResults[0].sg.payment_method).be.undefined();
        });

        it("should handle multiple result rows", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: {
                        'payment_method': 'credit_card',
                        'amount': '100'
                    }
                },
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: {
                        'payment_method': 'paypal',
                        'amount': '200'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(2);
            should(maskedResults[0].sg.payment_method).be.undefined();
            should(maskedResults[1].sg.payment_method).be.undefined();
            maskedResults[0].sg.amount.should.equal('100');
            maskedResults[1].sg.amount.should.equal('200');
        });

        it("should handle results with no masking configuration", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: {
                        'payment_method': 'credit_card',
                        'amount': '100'
                    }
                }
            ];

            // Set up masking service with no masking configuration
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    return null;
                }
            });

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.deepEqual(results);
        });

        it("should handle results with empty masking configuration", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: {
                        'payment_method': 'credit_card',
                        'amount': '100'
                    }
                }
            ];

            // Set up masking service with empty masking configuration
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    return {
                        events: {},
                        prop: {}
                    };
                }
            });

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.deepEqual(results);
        });
    });

    describe("getMaskingSettings", function() {
        it("should return null when no appId is set", function() {
            maskingService.setAppId(null);
            const result = maskingService.getMaskingSettings('test-app');

            should(result).be.null();
        });

        it("should return masking settings from plugins", function() {
            const mockSettings = {
                events: { 'Purchase': { sg: { 'payment_method': true } } },
                prop: { 'up': { 'did': true } }
            };

            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    return mockSettings;
                }
            });

            const result = maskingService.getMaskingSettings('test-app');

            result.should.deepEqual(mockSettings);
        });

        it("should return null when plugins method is not available", function() {
            maskingService.setPlugins(null);
            const result = maskingService.getMaskingSettings('test-app');

            should(result).be.null();
        });
    });

    describe("Edge cases and error handling", function() {
        it("should handle empty query object", function() {
            const query = '';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
        });

        it("should handle null results", function() {
            const maskedResults = maskingService.maskResults(null, '');

            should(maskedResults).be.null();
        });

        it("should handle empty results array", function() {
            const maskedResults = maskingService.maskResults([], '');

            maskedResults.should.deepEqual([]);
        });

        it("should handle results with null/undefined values", function() {
            const results = [
                {
                    a: 'test-app-123',
                    e: 'Purchase',
                    sg: null,
                    up: undefined
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(1);
            should(maskedResults[0].sg).be.null();
            should(maskedResults[0].up).be.undefined();
        });

        it("should handle malformed query strings gracefully", function() {
            const query = 'INVALID SQL QUERY';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
        });
    });

    describe("Real-world Countly Drill scenarios", function() {
        it("should handle user profile queries with masking", function() {
            const query = 'SELECT a, e, up.cc, up.cty, up.la, up.did FROM drill_events WHERE a = {app:String}';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.containEql('a, e, up.cc, up.cty, up.la');
            result.query.should.not.containEql('up.did');
        });

        it("should handle custom event segmentation queries", function() {
            const query = 'SELECT a, e, sg.Category, sg.Price, sg.payment_method FROM drill_events WHERE e = \'Purchase\'';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, sg.Category, sg.Price FROM drill_events WHERE e = \'Purchase\'');
        });

        it("should handle session duration queries", function() {
            const query = 'SELECT a, e, dur, sc, up.did FROM drill_events WHERE dur > 60';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT a, e, dur, sc FROM drill_events WHERE dur > 60');
        });

        it("should handle complex aggregation queries", function() {
            const query = 'SELECT COUNT(*) as count, AVG(sg.Price) as avg_price, up.did FROM drill_events GROUP BY up.did';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT COUNT(*) as count, AVG(sg.Price) as avg_price FROM drill_events GROUP BY up.did');
        });
    });

    describe("Complex ClickHouse Functions", function() {
        it("should skip query-level masking when it would result in empty SELECT", function() {
            // Set up masking to only mask 'up.p' property
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'p': true // Only mask 'p' property
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
        });

        it("should handle mixed simple and complex fields", function() {
            // Set up masking to mask 'up.did' and 'up.p' properties
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'p': true,
                                    'pv': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT up.did, arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p FROM drill_events');
        });

        it("should handle formatDate and other ClickHouse functions", function() {
            const query = 'SELECT formatDate(ts, \'%Y-%m-%d\') as date, up.did FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT formatDate(ts, \'%Y-%m-%d\') as date FROM drill_events');
        });

        it("should handle multiple complex functions with mixed masking", function() {
            // Set up masking to mask 'up.did' and 'up.p' properties
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'p': true,
                                    'pv': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT formatDate(ts, \'%Y-%m-%d\') as date, up.did, arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p, up.pv FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            // Should remove up.did but keep the complex function and up.pv
            result.query.should.equal('SELECT formatDate(ts, \'%Y-%m-%d\') as date, arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p, up.pv FROM drill_events');
        });

        it("should handle nested JSON functions", function() {
            const query = 'SELECT JSONExtract(up, \'did\') as device_id, JSONExtractString(up, \'username\') as user FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT JSONExtractString(up, \'username\') as user FROM drill_events');
        });

        it("should handle complex nested functions", function() {
            // Set up masking to mask 'up.p' property
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'p': true
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT groupArrayDistinct(tuple(up.p, up.pv)) as combined FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
        });

        it("should handle ClickHouse array functions", function() {
            const query = 'SELECT hasAny(up.tags, [\'premium\', \'vip\']) as is_premium, up.did FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT hasAny(up.tags, [\'premium\', \'vip\']) as is_premium FROM drill_events');
        });

        it("should handle ClickHouse string functions", function() {
            const query = 'SELECT concat(up.first_name, \' \', up.last_name) as full_name, up.did FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT concat(up.first_name, \' \', up.last_name) as full_name FROM drill_events');
        });

        it("should handle ClickHouse conditional functions", function() {
            const query = 'SELECT if(up.age > 18, \'adult\', \'minor\') as age_group, up.did FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(true);
            result.query.should.equal('SELECT if(up.age > 18, \'adult\', \'minor\') as age_group FROM drill_events');
        });

        it("should handle multiIf queries with masked properties", function() {
            // Set up masking to mask 'up.did' property
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'username': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT sum(multiIf(ts > 1234567890, up.did, 0)) AS device_count FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
            result.query.should.containEql('multiIf');
        });

        it("should handle multiIf queries with masked segments", function() {
            // Set up masking to mask 'payment_method' segment
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            events: {
                                'Purchase': {
                                    sg: {
                                        'payment_method': true,
                                        'amount': false
                                    }
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const query = 'SELECT sum(multiIf(ts > 1234567890, sg.payment_method, 0)) AS payment_sum FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.masked.should.equal(false);
            result.query.should.equal(query);
            result.query.should.containEql('multiIf');
            result.query.should.containEql('sg.payment_method');
        });

        it("should handle multiIf queries with parameter placeholders", function() {
            const query = 'SELECT sum(multiIf(ts > ${ts.$gt}, c, 0)) AS c FROM drill_events';
            const result = maskingService.maskQueryString(query, {});

            result.query.should.equal(query);
            result.query.should.containEql('multiIf');
            result.query.should.containEql('${ts.$gt}');
        });

        it("should handle result masking for multiIf aggregation results", function() {
            // Set up masking to mask 'up.did' property
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'username': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const results = [
                {
                    c: 150,
                    device_count: 25,
                    e: 'Purchase',
                    up: {
                        did: 'device123',
                        username: 'john_doe'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(1);
            maskedResults[0].c.should.equal(150); // Aggregation result preserved
            maskedResults[0].device_count.should.equal(25); // Aggregation result preserved
            should(maskedResults[0].up.did).be.undefined(); // Masked property removed
            maskedResults[0].up.username.should.equal('john_doe'); // Unmasked property preserved
        });
    });

    describe("Result Masking Backup for Complex Functions", function() {
        it("should mask results from complex functions that couldn't be masked at query level", function() {
            // Set up masking to mask 'up.p' property
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'p': true,
                                    'pv': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            // Simulate results from: SELECT arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.p, up.pv))) as p FROM drill_events
            const results = [
                {
                    p: [['masked_value', 'visible_value']], // Complex function result
                    up: {
                        p: 'masked_value', // This should be removed
                        pv: 'visible_value' // This should remain
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(1);
            maskedResults[0].p.should.deepEqual([['masked_value', 'visible_value']]); // Complex function result preserved
            should(maskedResults[0].up.p).be.undefined(); // Masked property removed
            maskedResults[0].up.pv.should.equal('visible_value'); // Unmasked property preserved
        });

        it("should handle mixed simple and complex function results", function() {
            // Set up masking to mask 'up.did' and 'up.p' properties
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'p': true,
                                    'pv': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const results = [
                {
                    date: '2024-01-15', // From formatDate
                    p: [['masked_value', 'visible_value']], // From arrayFilter
                    up: {
                        did: 'device123', // This should be removed
                        p: 'masked_value', // This should be removed
                        pv: 'visible_value' // This should remain
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(1);
            maskedResults[0].date.should.equal('2024-01-15'); // formatDate result preserved
            maskedResults[0].p.should.deepEqual([['masked_value', 'visible_value']]); // arrayFilter result preserved
            should(maskedResults[0].up.did).be.undefined(); // Masked property removed
            should(maskedResults[0].up.p).be.undefined(); // Masked property removed
            maskedResults[0].up.pv.should.equal('visible_value'); // Unmasked property preserved
        });

        it("should handle empty up object after masking", function() {
            // Set up masking to mask all up properties
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            prop: {
                                'up': {
                                    'did': true,
                                    'p': true,
                                    'pv': true
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            const results = [
                {
                    p: [['masked_value', 'visible_value']],
                    up: {
                        did: 'device123',
                        p: 'masked_value',
                        pv: 'visible_value'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(results, '');

            maskedResults.should.have.length(1);
            maskedResults[0].p.should.deepEqual([['masked_value', 'visible_value']]); // Complex function result preserved
            should(maskedResults[0].up).be.undefined(); // Empty up object removed
        });

        it("should handle very complex queries with unknown functions", function() {
            // Set up comprehensive masking settings
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            events: {
                                'Purchase': {
                                    sg: {
                                        'payment_method': true,
                                        'customer_email': true,
                                        'amount': false,
                                        'currency': false
                                    }
                                }
                            },
                            prop: {
                                'up': {
                                    'did': true,
                                    'email': true,
                                    'phone': true,
                                    'username': false,
                                    'age': false
                                },
                                'custom': {
                                    'sensitive_data': true,
                                    'preferences': false
                                },
                                'cmp': {
                                    'campaign_id': true,
                                    'source': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            // Very complex query with unknown functions
            const complexQuery = `
                SELECT 
                    formatDate(ts, '%Y-%m-%d') as date,
                    up.did,
                    up.email,
                    up.username,
                    up.age,
                    custom.sensitive_data,
                    custom.preferences,
                    cmp.campaign_id,
                    cmp.source,
                    sg.payment_method,
                    sg.customer_email,
                    sg.amount,
                    sg.currency,
                    arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.phone, up.country))) as contact_info,
                    unknownFunction(up.did, custom.sensitive_data) as mystery_result,
                    JSONExtract(sg, 'payment_method') as payment_type,
                    JSONExtractString(up, 'email') as email_extracted
                FROM drill_events 
                WHERE 
                    ts >= '2024-01-01' 
                    AND unknownFilterFunction(up.did, custom.sensitive_data) = true
                GROUP BY 
                    formatDate(ts, '%Y-%m-%d'),
                    up.username,
                    cmp.source,
                    sg.currency
                ORDER BY 
                    COUNT(*) DESC
                LIMIT 100
            `;

            const queryResult = maskingService.maskQueryString(complexQuery, {});

            queryResult.masked.should.equal(true);

            // Should preserve unmasked fields and complex functions
            queryResult.query.should.containEql('formatDate(ts, \'%Y-%m-%d\') as date');
            queryResult.query.should.containEql('up.username');
            queryResult.query.should.containEql('up.age');
            queryResult.query.should.containEql('custom.preferences');
            queryResult.query.should.containEql('cmp.source');
            queryResult.query.should.containEql('sg.amount');
            queryResult.query.should.containEql('sg.currency');
            queryResult.query.should.containEql('arrayFilter(x -> x IS NOT NULL, groupArrayDistinct(tuple(up.phone, up.country))) as contact_info');
            queryResult.query.should.containEql('JSONExtractString(up, \'email\') as email_extracted');

            // Should remove masked fields from SELECT clause
            const selectClause = queryResult.query.match(/SELECT\s+([^]+?)\s+FROM/i);
            selectClause.should.not.be.null();
            selectClause[1].should.not.containEql('up.did');
            selectClause[1].should.not.containEql('up.email');
            selectClause[1].should.not.containEql('custom.sensitive_data');
            selectClause[1].should.not.containEql('cmp.campaign_id');
            selectClause[1].should.not.containEql('sg.payment_method');
            selectClause[1].should.not.containEql('sg.customer_email');
            selectClause[1].should.not.containEql('JSONExtract(sg, \'payment_method\') as payment_type');
            selectClause[1].should.not.containEql('unknownFunction(up.did, custom.sensitive_data) as mystery_result');
        });

        it("should handle complex query results with unknown function outputs", function() {
            // Set up comprehensive masking settings
            maskingService.setPlugins({
                getMaskingSettings: function(appId) {
                    if (appId === 'test-app-123') {
                        return {
                            events: {
                                'Purchase': {
                                    sg: {
                                        'payment_method': true,
                                        'customer_email': true,
                                        'amount': false,
                                        'currency': false
                                    }
                                }
                            },
                            prop: {
                                'up': {
                                    'did': true,
                                    'email': true,
                                    'phone': true,
                                    'username': false,
                                    'age': false
                                },
                                'custom': {
                                    'sensitive_data': true,
                                    'preferences': false
                                },
                                'cmp': {
                                    'campaign_id': true,
                                    'source': false
                                }
                            }
                        };
                    }
                    return null;
                }
            });

            // Simulate results from complex query with unknown functions
            const complexResults = [
                {
                    date: '2024-01-15',
                    did: 'device123',
                    email: 'user@example.com',
                    username: 'john_doe',
                    age: 25,
                    sensitive_data: 'secret_info',
                    preferences: '{"theme": "dark"}',
                    campaign_id: 'camp_001',
                    source: 'google',
                    payment_method: 'credit_card',
                    customer_email: 'customer@example.com',
                    amount: 99.99,
                    currency: 'USD',
                    contact_info: [['555-1234', 'US']],
                    mystery_result: 'unknown_output',
                    payment_type: 'credit_card',
                    email_extracted: 'user@example.com',
                    e: 'Purchase',
                    sg: {
                        payment_method: 'credit_card',
                        customer_email: 'customer@example.com',
                        amount: 99.99,
                        currency: 'USD'
                    },
                    up: {
                        did: 'device123',
                        email: 'user@example.com',
                        phone: '555-1234',
                        username: 'john_doe',
                        age: 25,
                        country: 'US'
                    },
                    custom: {
                        sensitive_data: 'secret_info',
                        preferences: '{"theme": "dark"}',
                        subscription_type: 'premium'
                    },
                    cmp: {
                        campaign_id: 'camp_001',
                        source: 'google'
                    }
                }
            ];

            const maskedResults = maskingService.maskResults(complexResults, '');

            maskedResults.should.have.length(1);

            // Complex function results should be preserved
            maskedResults[0].contact_info.should.deepEqual([['555-1234', 'US']]);
            maskedResults[0].mystery_result.should.equal('unknown_output');

            // Non-sensitive data should be preserved
            maskedResults[0].date.should.equal('2024-01-15');
            maskedResults[0].username.should.equal('john_doe');
            maskedResults[0].age.should.equal(25);
            maskedResults[0].preferences.should.equal('{"theme": "dark"}');
            maskedResults[0].source.should.equal('google');
            maskedResults[0].amount.should.equal(99.99);
            maskedResults[0].currency.should.equal('USD');

            // Sensitive data should be removed from nested objects
            should(maskedResults[0].up.did).be.undefined();
            should(maskedResults[0].up.email).be.undefined();
            should(maskedResults[0].up.phone).be.undefined();
            maskedResults[0].up.username.should.equal('john_doe');
            maskedResults[0].up.age.should.equal(25);

            should(maskedResults[0].custom.sensitive_data).be.undefined();
            maskedResults[0].custom.preferences.should.equal('{"theme": "dark"}');

            should(maskedResults[0].cmp.campaign_id).be.undefined();
            maskedResults[0].cmp.source.should.equal('google');

            should(maskedResults[0].sg.payment_method).be.undefined();
            should(maskedResults[0].sg.customer_email).be.undefined();
            maskedResults[0].sg.amount.should.equal(99.99);
            maskedResults[0].sg.currency.should.equal('USD');
        });
    });
});