var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Compliance Hub', function() {
    describe('Check Empty Data', function() {
        it('should have empty data', function(done) {

            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            DEVICE_ID = testUtils.get("DEVICE_ID");

            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });
    describe('Check consent_history', function() {
        it('should take timestamp in milliseconds', function(done) {
            var timestamp = "1234567890123";
            request
                .post('/i?app_key=' + APP_KEY + '&device_id=' + DEVICE_ID + '&consent={"session":true}' + '&timestamp=' + timestamp)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Success");
                    setTimeout(done, 100 * testUtils.testScalingFactor);
                });
        });
        it('should update timestamp values as milliseconds on the db', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    const tsControl = ob.aaData.every(item => {
                        const tsString = String(item.ts);
                        if (tsString.length === 13) {
                            return done();
                        }
                        else {
                            return done(err);
                        }
                    });
                });
        });
    });

    describe('Reset App', function() {
        it('should reset data', function(done) {
            var params = {app_id: APP_ID, period: "reset"};
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
    describe('Verify Empty Data', function() {
        it('should have empty data', function(done) {
            request
                .get('/o/consent/search?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.be.empty;
                    setTimeout(done, 100);
                });
        });
    });
});