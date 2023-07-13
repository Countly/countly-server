var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Density metrics', function() {
    describe('Empty density', function() {
        it('should have no densities', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=density')
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
    describe('Writing Density', function() {
        it('should success', function(done) {
            var params = {"_density": "400dpi"};
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
    //{"2015":{"1":{"15":{"400dpi":{"t":1,"n":1,"u":1}},"400dpi":{"u":1,"t":1,"n":1}},"400dpi":{"u":1,"t":1,"n":1},"w3":{"400dpi":{"u":1}}},"meta":{"density":["400dpi"]}}
    describe('Verify density', function() {
        it('should have density', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=density')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"density": ['400dpi']}, "400dpi": {"n": 1, "t": 1, "u": 1}});
                });
        });
    });
    describe('write bulk density', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID + "1", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "100dpi"}},
                {"device_id": DEVICE_ID + "2", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "200dpi"}},
                {"device_id": DEVICE_ID + "3", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "300dpi"}},
                {"device_id": DEVICE_ID + "4", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "400dpi"}},
                {"device_id": DEVICE_ID + "5", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "500dpi"}},
                {"device_id": DEVICE_ID + "6", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "600dpi"}},
                {"device_id": DEVICE_ID + "7", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "700dpi"}},
                {"device_id": DEVICE_ID + "8", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "800dpi"}},
                {"device_id": DEVICE_ID + "9", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_density": "900dpi"}}
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
    describe('Verify bulk density', function() {
        it('should match provided density', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=density')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"density": ["100dpi", "200dpi", "300dpi", "400dpi", "500dpi", "600dpi", "700dpi", "800dpi", "900dpi"]}, "100dpi": {"n": 1, "t": 1, "u": 1}, "200dpi": {"n": 1, "t": 1, "u": 1}, "300dpi": {"n": 1, "t": 1, "u": 1}, "400dpi": {"n": 2, "t": 2, "u": 2}, "500dpi": {"n": 1, "t": 1, "u": 1}, "600dpi": {"n": 1, "t": 1, "u": 1}, "700dpi": {"n": 1, "t": 1, "u": 1}, "800dpi": {"n": 1, "t": 1, "u": 1}, "900dpi": {"n": 1, "t": 1, "u": 1}});
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
    describe('verify empty density', function() {
        it('should have no densities', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=density')
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