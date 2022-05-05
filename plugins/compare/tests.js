var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var compareApps = [];

describe('Testing Compare Plugin', function() {
    describe("Testing Compare Apps", function() {
        before(function() {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            compareApps.push(APP_ID);
        });
        describe('Get compare data', function() {
            it('should return 200 with relevant data', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps) + '&api_key=' + API_KEY_ADMIN)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        if (ob.length > 0 && ob[0].id.should.equal(APP_ID)) {
                            done();
                        }
                        else {
                            done("Invalid response");
                        }
                    });
            });
        });
        describe('Check by sending invalid params', function() {
            it('Try getting with invalid api key', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps) + '&api_key=kkkk')
                    .expect(401)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("User does not exist");
                        done();
                    });
            });
            it('Try getting without api key', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&apps=' + JSON.stringify(compareApps))
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });
            it('Try getting without apps', function(done) {
                request.get('/o/compare/apps?period=' + "30days" + '&api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter: apps");
                        done();
                    });
            });
        });
    });
});
