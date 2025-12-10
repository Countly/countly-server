var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var drill_db = testUtils.drillDb;

describe('Testing Language metrics', function() {
    describe('Empty language', function() {
        it('should have no languages', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            drill_db = testUtils.client.db("countly_drill");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=langs')
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
    describe('Writing Language', function() {
        it('should success', function(done) {
            var params = {"_locale": "en_GB"};
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + APP_KEY + "&begin_session=1&metrics=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 2000); //we need some time for aggregator to work if replia set is not working and we process via iterations.
                });
        });
    });
    describe('Verify Language', function() {
        it('should have language', function(done) {
            testUtils.validateTotalsInDrillData(drill_db, {app_id: APP_ID, event: "[CLY]_session", query: {"up.la": "en", "up.lo": "en_GB"}, values: {u: 1, t: 1, n: 1}}, done);
        });
    });
    describe('write bulk language', function() {
        it('should success', function(done) {
            var params = [
                {"device_id": DEVICE_ID + "1", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "en_CA"}},
                {"device_id": DEVICE_ID + "2", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "fr_FR"}},
                {"device_id": DEVICE_ID + "3", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "zh_CN"}},
                {"device_id": DEVICE_ID + "4", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "de_DE"}},
                {"device_id": DEVICE_ID + "5", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "it_IT"}},
                {"device_id": DEVICE_ID + "6", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "ja_JP"}},
                {"device_id": DEVICE_ID + "7", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "ko_KR"}},
                {"device_id": DEVICE_ID + "8", "app_key": APP_KEY, "begin_session": 1, "metrics": {"_locale": "en_US"}}
            ];
            request
                .get('/i/bulk?safe_api_response=true&requests=' + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 2000);
                });
        });
    });
    describe('Verify bulk language', function() {
        it('should match provided language', function(done) {
            testUtils.validateBreakdownTotalsInDrillData(drill_db, {
                app_id: APP_ID,
                event: "[CLY]_session",
                breakdownKeys: ["up.la"],
                values: {
                    "en": {u: 3, t: 3, n: 3},
                    "fr": {u: 1, t: 1, n: 1},
                    "zh_hans": {u: 1, t: 1, n: 1},
                    "de": {u: 1, t: 1, n: 1},
                    "it": {u: 1, t: 1, n: 1},
                    "ja": {u: 1, t: 1, n: 1},
                    "ko": {u: 1, t: 1, n: 1}
                }
            }, done);
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
        it('Trigger deletion job to run', function(done) {
            testUtils.triggerJobToRun("api:mutationManagerJob", done);
        });
    });
    describe('verify empty language', function() {
        it('should have no languages', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=langs')
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