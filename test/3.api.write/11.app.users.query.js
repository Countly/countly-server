var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_1 = "appuser_query_test_1";
var DEVICE_2 = "appuser_query_test_2";

/**
 * Happy-path coverage for the /i/app_users write endpoints that validate a
 * user-supplied Mongo query via common.parseUserQuery. Two dedicated users are
 * seeded so that update/delete match exactly one user (a valid, non-empty,
 * non-near-total query) and return 200.
 */
describe('Testing query-validated app_users write endpoints (happy path)', function() {
    describe('Seed dedicated users', function() {
        it('should create first user', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            var metrics = {"_os": "Android", "_os_version": "9", "_device": "TestDevice"};
            request
                .get('/i?device_id=' + DEVICE_1 + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + JSON.stringify(metrics))
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

        it('should create second user', function(done) {
            var metrics = {"_os": "Android", "_os_version": "9", "_device": "TestDevice"};
            request
                .get('/i?device_id=' + DEVICE_2 + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + JSON.stringify(metrics))
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

    describe('GET /i/app_users/update', function() {
        it('should update the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_1}));
            var update = encodeURIComponent(JSON.stringify({"custom.qtestflag": "1"}));
            request
                .get('/i/app_users/update?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query + '&update=' + update)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User Updated');
                    done();
                });
        });
    });

    describe('GET /i/app_users/export', function() {
        it('should export the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_1}));
            request
                .get('/i/app_users/export?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /i/app_users/delete', function() {
        it('should delete the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_2}));
            request
                .get('/i/app_users/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User deleted');
                    done();
                });
        });
    });
});
