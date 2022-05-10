var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";

describe('Testing Active Users', function() {
    describe('Reset app', function() {
        it('should reset data', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
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

    describe('Empty active users', function() {
        it('should have no active users', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o/active_users?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
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

    describe('Verify active users data', function() {
        it('should return 200 for request list of active users', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            var ob;
            request.get('/o/active_users?period=60days&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID).end(function(err, res) {
                if (err) {
                    return done(err);
                }
                res.statusCode.should.equal(200);
                ob = JSON.parse(res.text);
                ob.should.not.be.empty;
                ob.should.have.property('calculating');
                ob.should.have.property("data");
                done();
            });
        });
    });

    describe('Verify clear cache', function() {
        it('should clear cache for active users', function(done) {
            APP_ID = testUtils.get("APP_ID");
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var ob;
            request.get('/i/active_users/clear_active_users_cache?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN).end(function(err, res) {
                if (err) {
                    return done(err);
                }
                res.statusCode.should.equal(200);
                ob = JSON.parse(res.text);
                ob.should.not.be.empty;
                ob.should.have.property('result', 'Success');
                done();
            });
        });
    });
});