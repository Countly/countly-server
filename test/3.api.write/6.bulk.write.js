var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "1234567890";

describe('Bulk writing', function() {
    describe('without args', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/i/bulk')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "requests"');
                    done();
                });
        });
    });
    describe('using session tests', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID, "app_key": APP_KEY, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 6)},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "begin_session": 1, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 5)},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "begin_session": 1, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 4)},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "session_duration": 60, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 60 * 3)},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "end_session": 1, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 60 * 2)},
                {"device_id": DEVICE_ID + "new", "app_key": APP_KEY, "begin_session": 1, timestamp: parseInt(new Date().getTime() / 1000 - 60 * 60 * 1)},
            ];
            request
                .get('/i/bulk?requests=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, testUtils.testWaitTimeForDrillEvents * 3 * testUtils.testScalingFactor);
                });
        });
    });
    describe('Verify bulk session write', function() {
        describe('Verify sessions', function() {
            it('should match sessions tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sessions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": ["0", "2"]}, f: { '0': 2, '1': 1 }, ds: {'0': 1, '2': 1}, u: 2, n: 2, t: 3, e: 6, d: 60, Unknown: true});
                    });
            });
        });
        describe('verify users', function() {
            it('should match sessions tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=users')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": ["0", "2"]}, f: { '0': 2, '1': 1 }, ds: {'0': 1, '2': 1}, u: 2, n: 2, t: 3, e: 6, d: 60, Unknown: true});
                    });
            });
        });
        describe('verify locations', function() {
            it('should match sessions tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=locations')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateSessionData(err, res, done, {meta: {"countries": ["Unknown"], "f-ranges": ["0", "1"], "d-ranges": ["0", "2"]}, f: { '0': 2, '1': 1 }, ds: {'0': 1, '2': 1}, u: 2, n: 2, t: 3, e: 6, d: 60, Unknown: true});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should match sessions tests end result', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 3, total_users: 2, new_users: 2, total_time: "1.0 min", avg_time: "0.3 min", avg_requests: "3.0", platforms: [], carriers: [], resolutions: []});
                    });
            });
        });
        describe('verify countries', function() {
            it('should match sessions tests end result', function(done) {
                request
                    .get('/o/analytics/countries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateCountries(err, res, done, {country: "Unknown", code: "unknown", t: 3, u: 2, u2: 6, n: 2});
                    });
            });
        });
        describe('reseting data', function() {
            it('should reset data', function(done) {
                var params = {app_id: APP_ID, "period": "reset"};
                request
                    .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });
        });
    });
    describe('using metric tests', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID + "1", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_os": "Android"}},
                {"device_id": DEVICE_ID + "2", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_os_version": "4.4"}},
                {"device_id": DEVICE_ID + "4", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_resolution": "1200x800"}},
                {"device_id": DEVICE_ID + "5", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_os": "Android", "_os_version": "4.4"}},
                {"device_id": DEVICE_ID + "6", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_device": "Nexus 5"}},
                {"device_id": DEVICE_ID + "7", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_carrier": "Vodafone"}},
                {"device_id": DEVICE_ID + "8", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_app_version": "1.0"}},
                {"device_id": DEVICE_ID + "9", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_os": "IOS", "_os_version": "7.1", "_resolution": "2048x1536", "_device": "iPod", "_carrier": "Telecom", "_app_version": "1.2"}},
                {"device_id": DEVICE_ID + "10", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_os": "IOS", "_os_version": "7.1", "_resolution": "2048x1536", "_device": "iPod", "_carrier": "Telecom", "_app_version": "1.2"}}
            ];
            request
                .get('/i/bulk?requests=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verify bulk metrics write', function() {
        describe('Verify device_details', function() {
            it('should match metrics tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=device_details')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 2, "t": 2, "u": 2}, "i7:1": {"n": 2, "t": 2, "u": 2}, "2048x1536": {"n": 2, "t": 2, "u": 2}, "1:2": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify devices', function() {
            it('should match metrics tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=devices')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"devices": ["Nexus 5", "iPod"]}, "Nexus 5": {"n": 1, "t": 1, "u": 1}, "iPod": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify carriers', function() {
            it('should match metrics tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=carriers')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"carriers": ["Vodafone", "Telecom"]}, "Vodafone": {"n": 1, "t": 1, "u": 1}, "Telecom": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('Verify app_versions', function() {
            it('should match metrics tests end result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=app_versions')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateMetrics(err, res, done, {meta: {"os": ["Android", "IOS"], "os_versions": ["4:4", "a4:4", "i7:1"], "resolutions": ["1200x800", "2048x1536"], "app_versions": ["1:0", "1:2"]}, Android: {"n": 2, "t": 2, "u": 2}, "a4:4": {"n": 1, "t": 1, "u": 1}, "4:4": {"n": 1, "t": 1, "u": 1}, "1200x800": {"n": 1, "t": 1, "u": 1}, "1:0": {"n": 1, "t": 1, "u": 1}, "IOS": {"n": 2, "t": 2, "u": 2}, "i7:1": {"n": 2, "t": 2, "u": 2}, "2048x1536": {"n": 2, "t": 2, "u": 2}, "1:2": {"n": 2, "t": 2, "u": 2}});
                    });
            });
        });
        describe('verify dashboard', function() {
            it('should match metrics tests end result', function(done) {
                request
                    .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateDashboard(err, res, done, {total_sessions: 9, total_users: 9, new_users: 9, total_time: "0.0 min", avg_time: "0.0 min", avg_requests: "1.0", platforms: [{"name": "Android", "value": 2, "percent": 50}, {"name": "IOS", "value": 2, "percent": 50}], resolutions: [{"name": "2048x1536", "value": 2, "percent": 66.7}, {"name": "1200x800", "value": 1, "percent": 33.3}], carriers: [{"name": "Telecom", "value": 2, "percent": 66.7}, {"name": "Vodafone", "value": 1, "percent": 33.3}]});
                    });
            });
        });
        describe('reseting data', function() {
            it('should reset data', function(done) {
                var params = {app_id: APP_ID, "period": "reset"};
                request
                    .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });
        });
    });
    describe('using event tests', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test", "count": 1 }]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test", "count": 2 }]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 1 }]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 3}, {"key": "test2", "count": 2}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 1, "sum": 2.97}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 1, "sum": 1.03}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 1, "segmentation": {"version": "1.0", "country": "Turkey"}}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 2, "segmentation": {"version": "1.0", "country": "Turkey", "market": "amazon"}}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test1", "count": 2, "sum": 1.50, "segmentation": {"version": "1.2", "country": "Latvia", "market": "googleplay"}}]},
                {"device_id": DEVICE_ID, "app_key": APP_KEY, "events": [{"key": "test2", "count": 2, "sum": 1.50, "segmentation": {"country": "Latvia", "market": "googleplay"}}]},
                {"device_id": DEVICE_ID + "A", "app_key": APP_KEY, "events": [{"key": "test2", "count": 2, "sum": 1.50, "segmentation": {"country": "Latvia", "market": "googleplay"}}]},
            ];
            request
                .get('/i/bulk?requests=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 500 * testUtils.testScalingFactor);
                });
        });
    });

    describe('verify bulk events write', function() {
        describe('verify events without param', function() {
            it('should display first event data', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 3});
                    });
            });
        });
        describe('verify test event', function() {
            it('should match event tests test result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 3});
                    });
            });
        });
        describe('verify daily refresh test event', function() {
            it('should match event tests test daily result', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 3}, true);
                    });
            });
        });
        describe('verify test1 event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5});
                    });
            });
        });
        describe('verify test1 event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify test1 event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify test1 event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify test1 daily refresh event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5}, true);
                    });
            });
        });
        describe('verify test1 daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify test1 daily refresh event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify test1 daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify test2 event', function() {
            it('should have add count and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 6, s: 3});
                    });
            });
        });
        describe('verify test2 event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 4, "s": 3}});
                    });
            });
        });
        describe('verify test2 event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "googleplay": {"c": 4, "s": 3}});
                    });
            });
        });
        describe('verify test2 daily refresh event', function() {
            it('should have add count and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 6, s: 3}, true);
                    });
            });
        });
        describe('verify test2 daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 4, "s": 3}}, true);
                    });
            });
        });
        describe('verify test2 daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "googleplay": {"c": 4, "s": 3}}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have add count and sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 20, s: 8.5});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should test, test1, test2 and version, country, market segments for test1', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        if (ob.list) {
                            ob.list.sort();
                        }
                        if (ob.segments) {
                            for (var i in ob.segments) {
                                ob.segments[i].sort();
                            }
                        }
                        ob.should.not.eql({});
                        ob.should.have.property("list");
                        ob.list.should.eql(["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "market", "version"], "test2": ["country", "market"]});
                        done();
                    });
            });
        });
        describe('reseting data', function() {
            it('should reset data', function(done) {
                var params = {app_id: APP_ID, "period": "reset"};
                request
                    .get('/i/apps/reset?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Success');
                        setTimeout(done, 1000 * testUtils.testScalingFactor);
                    });
            });
        });
    });
});