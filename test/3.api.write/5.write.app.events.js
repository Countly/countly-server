var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Writing app events', function() {
    describe('Empty events', function() {
        describe('no events', function() {
            it('should success', function(done) {
                API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                APP_ID = testUtils.get("APP_ID");
                APP_KEY = testUtils.get("APP_KEY");
                var params = [];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('event without key', function() {
            it('should success', function(done) {
                var params = [{
                    "count": 1
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('event without count', function() {
            it('should success', function(done) {
                API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                APP_ID = testUtils.get("APP_ID");
                APP_KEY = testUtils.get("APP_KEY");
                var params = [{
                    "key": "test"
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('Empty events', function() {
            it('should have 1 event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 1});
                    });
            });
        });
        describe('Empty get_events', function() {
            it('should have event data', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        var ob = JSON.parse(res.text);
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test"]);
                        ob.should.not.have.property("segments");
                        ob.should.have.property("limits", {
                            event_limit: 500,
                            event_segmentation_limit: 100,
                            event_segmentation_value_limit: 1000
                        });
                        done();
                    });
            });
        });
    });
    describe('Event with key and 1 count', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test",
                    "count": 1
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        /*{"2015":{"1":{"6":{"17":{"c":1},"c":1},"c":1},"c":1}}
		*/
        describe('verify events without params', function() {
            it('should have 2 event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2});
                    });
            });
        });
        describe('verify specific event', function() {
            it('should have 2 event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2});
                    });
            });
        });
        //{"2015":{"1":{"6":{"17":{"c":1},"c":1}}}}
        describe('verify daily refresh event', function() {
            it('should have 2 event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have 2 event', function(done) {
                var events = ["test"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2});
                    });
            });
        });
        //{"_id":"5419c3ff01f67bb2400000a7","list":["in_app_purchase"],"segments":{"in_app_purchase":["app_version","country"]}}
        describe('verify get_events', function() {
            it('should have test event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Same event with key and 2 count', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test",
                    "count": 2
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify events without params', function() {
            it('should have 4 test events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4});
                    });
            });
        });
        describe('verify specific event', function() {
            it('should have 4 test events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have 4 test events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have 4 test events', function(done) {
                var events = ["test"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should have test event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_events')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Another event with key and 1 count', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 1
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify events without params', function() {
            it('should 1 test1 and 4 test events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4});
                    });
            });
        });
        describe('verify specific event', function() {
            it('should 1 test event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 1});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should 1 test event', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 1}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should 4 total events', function(done) {
                var events = ["test", "test1"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 5});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should test and test1', function(done) {
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
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test", "test1"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Passing two events', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{"key": "test1", "count": 3}, {"key": "test2", "count": 2}];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify first event', function() {
            it('should have 4 events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4});
                    });
            });
        });
        describe('verify first daily refresh event', function() {
            it('should have 4 events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 4}, true);
                    });
            });
        });
        describe('verify second event', function() {
            it('should have 2 events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2});
                    });
            });
        });
        describe('verify second daily refresh event', function() {
            it('should have 2 events', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 2}, true);
                    });
            });
        });
        describe('verify merged two events', function() {
            it('should have 6 events', function(done) {
                var events = ["test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 6});
                    });
            });
        });
        describe('verify merged all events', function() {
            it('should have 10 events', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 10});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should test, test1 and test2', function(done) {
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
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Event with sum', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 1,
                    "sum": 2.97,
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have 5 events and 2.97 sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 5, s: 2.97});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have 5 events and 2.97 sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 5, s: 2.97}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have 11 events and 2.97 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 11, s: 2.97});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should test, test1 and test2', function(done) {
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
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Event with more sum', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 1,
                    "sum": 1.03,
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have 6 events and 4 sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 6, s: 4});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have 6 events and 4 sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 6, s: 4}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have 12 events and 4 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 12, s: 4});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should test, test1, test2', function(done) {
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
                        ob.should.not.eql({});
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.not.have.property("segments");
                        done();
                    });
            });
        });
    });
    describe('Event with segmentation', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 1,
                    "segmentation": {
                        "version": "1.0",
                        "country": "Turkey"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have country and version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, c: 7, s: 4});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, "Turkey": {"c": 1}});
                    });
            });
        });
        describe('verify specific event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, "1:0": {"c": 1}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have country and version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, c: 7, s: 4}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, "Turkey": {"c": 1}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "segments": ["country", "version"]}, "1:0": {"c": 1}}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should 13 events and 4 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 13, s: 4});
                    });
            });
        });
        describe('verify get_events', function() {
            it('should have test, test1, test2 and test1 have version, country segments', function(done) {
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
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "version"]});
                        done();
                    });
            });
        });
    });
    describe('Adding segmentation count and new segment', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 2,
                    "segmentation": {
                        "version": "1.0",
                        "country": "Turkey",
                        "market": "amazon"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have count 3 for previous segments and one new', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, c: 9, s: 4});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}});
                    });
            });
        });
        describe('verify specific event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}});
                    });
            });
        });
        describe('verify specific event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have count 3 for previous segments and one new', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, c: 9, s: 4}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0"], "country": ["Turkey"], "market": ["amazon"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should have 15 events and 4 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 15, s: 4});
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
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "market", "version"]});
                        done();
                    });
            });
        });
    });
    describe('Adding new segmentation values and sum', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test1",
                    "count": 2,
                    "sum": 1.50,
                    "segmentation": {
                        "version": "1.2",
                        "country": "Latvia",
                        "market": "googleplay"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify specific event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify specific event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should 17 events and 5.5 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 17, s: 5.5});
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
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "market", "version"]});
                        done();
                    });
            });
        });
    });
    describe('Adding segmentation for other event', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test2",
                    "count": 2,
                    "sum": 1.50,
                    "segmentation": {
                        "country": "Latvia",
                        "market": "googleplay"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have segmentation and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 4, s: 1.5});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify specific event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "googleplay": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 4, s: 1.5}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "googleplay": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify merged event', function() {
            it('should 19 events and 5.5 sum', function(done) {
                var events = ["test", "test1", "test2"];
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&events=' + JSON.stringify(events))
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {c: 19, s: 7});
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
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "market", "version"], "test2": ["country", "market"]});
                        done();
                    });
            });
        });
    });
    describe('Adding event for other user', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "test2",
                    "count": 2,
                    "sum": 1.50,
                    "segmentation": {
                        "country": "Latvia",
                        "market": "googleplay"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + 'A&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have add count and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 6, s: 3});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 4, "s": 3}});
                    });
            });
        });
        describe('verify specific event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "googleplay": {"c": 4, "s": 3}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have add count and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, c: 6, s: 3}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test2&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"country": ["Latvia"], "market": ["googleplay"], "segments": ["country", "market"]}, "Latvia": {"c": 4, "s": 3}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment market', function() {
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
                        testUtils.validateEvents(err, res, done, {c: 21, s: 8.5});
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
                        ob.should.have.property("list", ["test", "test1", "test2"]);
                        ob.should.have.property("segments", {"test1": ["country", "market", "version"], "test2": ["country", "market"]});
                        done();
                    });
            });
        });
    });
    describe('Verifying other event is unchanged', function() {
        describe('verify specific event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5});
                    });
            });
        });
        describe('verify specific event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify specific event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify specific event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}});
                    });
            });
        });
        describe('verify daily refresh event', function() {
            it('should have new segment values and sum updated', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, c: 11, s: 5.5}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment country', function() {
            it('should have country segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=country&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "Turkey": {"c": 3}, "Latvia": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment version', function() {
            it('should have version segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=version&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "1:0": {"c": 3}, "1:2": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
        describe('verify daily refresh event with segment market', function() {
            it('should have market segments', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=test1&segmentation=market&action=refresh')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"version": ["1:0", "1:2"], "country": ["Latvia", "Turkey"], "market": ["amazon", "googleplay"], "segments": ["country", "market", "version"]}, "amazon": {"c": 2}, "googleplay": {"c": 2, "s": 1.5}}, true);
                    });
            });
        });
    });
    describe('Verifying array values are skipped', function() {
        describe('creating event', function() {
            it('should success', function(done) {
                var params = [{
                    "key": "testArray",
                    "count": 1,
                    "sum": 5,
                    "segmentation": {
                        "arrayValues": ["Ping", "Pong"],
                        "test": "bat"
                    }
                }];
                request
                    .get('/i?device_id=' + DEVICE_ID + 'A&app_key=' + APP_KEY + "&events=" + JSON.stringify(params))
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
        describe('verify specific event', function() {
            it('should have add count and sum', function(done) {
                request
                    .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=events&event=testArray')
                    .expect(200)
                    .end(function(err, res) {
                        testUtils.validateEvents(err, res, done, {meta: {"test": ["bat"], "segments": ["test"]}, c: 1, s: 5});
                    });
            });
        });
    });
    describe('reset app', function() {
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
                        setTimeout(done, 100 * testUtils.testScalingFactor);
                    });
            });
        });
    });
});
