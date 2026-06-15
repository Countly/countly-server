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

    describe("Testing Compare Apps per-app permission", function() {
        var API_KEY_ADMIN = "";
        var BASE_APP_ID = "";
        var victimAppId = "";
        var scopedApiKey = "";
        var scopedUserId = "";
        var uniq = Date.now();

        before(function() {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            BASE_APP_ID = testUtils.get("APP_ID");
        });

        it('should create a victim app and a user with compare read on the base app only', function(done) {
            request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({name: "CompareVictimApp", type: "mobile"})))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    victimAppId = res.body._id;
                    var perm = { _: {a: [], u: [BASE_APP_ID]}, c: {}, r: {}, u: {}, d: {} };
                    ["c", "r", "u", "d"].forEach(function(t) {
                        perm[t][BASE_APP_ID] = {all: false, allowed: {compare: true}};
                    });
                    var userParams = {full_name: "compareuser" + uniq, username: "compareuser" + uniq, password: "p4ssw0rD!", email: "compareuser" + uniq + "@mail.test", permission: perm};
                    request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
                        .expect(200)
                        .end(function(err2, res2) {
                            if (err2) {
                                return done(err2);
                            }
                            scopedApiKey = res2.body.api_key;
                            scopedUserId = res2.body._id;
                            should.exist(scopedApiKey);
                            done();
                        });
                });
        });

        it('should reject comparing apps when one app lacks compare permission', function(done) {
            request.get('/o/compare/apps?period=30days&apps=' + encodeURIComponent(JSON.stringify([BASE_APP_ID, victimAppId])) + '&api_key=' + scopedApiKey)
                .expect(401)
                .end(function(err) {
                    return done(err);
                });
        });

        it('should allow comparing only apps the member can read with compare', function(done) {
            request.get('/o/compare/apps?period=30days&apps=' + encodeURIComponent(JSON.stringify([BASE_APP_ID])) + '&api_key=' + scopedApiKey)
                .expect(200)
                .end(function(err) {
                    return done(err);
                });
        });

        after(function(done) {
            request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [scopedUserId]})))
                .end(function() {
                    request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({app_id: victimAppId})))
                        .end(function() {
                            done();
                        });
                });
        });
    });
});
