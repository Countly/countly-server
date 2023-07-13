var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Store metrics', function() {
    describe('Empty sources', function() {
        it('should have no sources', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sources')
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
    describe('Writing sources', function() {
        it('should success', function(done) {
            var params = {"_store": "com.android.vending"};
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

    describe('Verify sources', function() {
        it('should have sources', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sources')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"sources": ['com&#46;android&#46;vending']}, "com&#46;android&#46;vending": {"n": 1, "t": 1, "u": 1}});
                });
        });
    });
    describe('write bulk sources', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID + "1", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_store": "com.android.vending"}},
                {"device_id": DEVICE_ID + "2", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_store": "com.google.android.feedback"}},
                {"device_id": DEVICE_ID + "3", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_store": "com.slideme.sam.manager"}},
                {"device_id": DEVICE_ID + "4", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_store": "com.amazon.venezia"}},
                {"device_id": DEVICE_ID + "5", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_store": "iOS"}}
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
    describe('Verify bulk sources', function() {
        it('should match provided sources', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sources')
                .expect(200)
                .end(function(err, res) {
                    testUtils.validateMetrics(err, res, done, {meta: {"sources": ["com&#46;android&#46;vending", "com&#46;google&#46;android&#46;feedback", "com&#46;slideme&#46;sam&#46;manager", "com&#46;amazon&#46;venezia", "iOS"]}, "com&#46;android&#46;vending": {"n": 2, "t": 2, "u": 2}, "com&#46;google&#46;android&#46;feedback": {"n": 1, "t": 1, "u": 1}, "com&#46;slideme&#46;sam&#46;manager": {"n": 1, "t": 1, "u": 1}, "com&#46;amazon&#46;venezia": {"n": 1, "t": 1, "u": 1}, "iOS": {"n": 1, "t": 1, "u": 1}});
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
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verify empty sources', function() {
        it('should have no sources', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=sources')
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