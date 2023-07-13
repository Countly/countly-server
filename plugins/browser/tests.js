var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Browser metrics', function() {
    describe('Empty browser', function() {
        it('should have no browsers', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    done();
                });
        });
    });
    describe('Writing Browser', function() {
        it('should success', function(done) {
            var params = {"_browser": "Chrome"};
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 300 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Verify browser', function() {
        it('should have browser', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"browser": ['Chrome']}, "Chrome": {"n": 1, "t": 1, "u": 1}});
                });
        });
    });
    describe('write bulk browser', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID + "1", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_browser": "Chrome"}},
                {"device_id": DEVICE_ID + "2", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_browser": "Opera"}},
                {"device_id": DEVICE_ID + "3", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_browser": "Safari"}},
                {"device_id": DEVICE_ID + "4", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_browser": "Firefox"}},
                {"device_id": DEVICE_ID + "5", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_browser": "IE"}}
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
                    setTimeout(done, testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
                });
        });
    });
    describe('Verify bulk browser', function() {
        it('should match provided browser', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"browser": ["Chrome", "Opera", "Safari", "Firefox", "IE"]}, "Chrome": {"n": 2, "t": 2, "u": 2}, "Opera": {"n": 1, "t": 1, "u": 1}, "Safari": {"n": 1, "t": 1, "u": 1}, "Firefox": {"n": 1, "t": 1, "u": 1}, "IE": {"n": 1, "t": 1, "u": 1}});
                });
        });
    });
    describe('reset app', function() {
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
                    setTimeout(done, 10 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verify empty browser', function() {
        it('should have no browsers', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=browser')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    done();
                });
        });
    });
});