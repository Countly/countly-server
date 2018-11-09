var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var APP_KEY = "";
var DEVICE_ID = "123456789";
var BASE_PATH = "/o?method=monetization";

describe('Testing Monetization plugin', function() {

    API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    APP_ID = testUtils.get("APP_ID");
    APP_KEY = testUtils.get("APP_KEY");


    describe(BASE_PATH + ' input validation', function() {


        it('should fail (no period)', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Period must be defined.');
                    done();
                });
        });

        it('should fail (invalid period)', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&period=64548&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid period.');
                    done();
                });
        });

        it('should fail (invalid period)', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&period=[]&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid period.');
                    done();
                });
        });

        it('should fail (invalid period)', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&period=[1,]&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid period.');
                    done();
                });
        });


        it('should success', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&period=[12312312312,12312312312]&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('VI_AdClick');
                    ob.should.have.property('VI_AdStart');
                    ob.should.have.property('VI_AdComplete');
                    done();
                });
        });

        it('should success', function(done) {
            APP_ID = testUtils.get("APP_ID") || APP_ID;
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            request.get(BASE_PATH + '&period=60days&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('VI_AdClick');
                    ob.should.have.property('VI_AdStart');
                    ob.should.have.property('VI_AdComplete');
                    done();
                });
        });
    });
});