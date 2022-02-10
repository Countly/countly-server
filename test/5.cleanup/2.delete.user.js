var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var USER_ID = "";
var ADMIN_ID = "";

describe('Deleting user', function() {
    describe('without key', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            USER_ID = testUtils.get("USER_ID");
            request
                .get('/i/users/delete')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "api_key" or "auth_token"');
                    done();
                });
        });
    });
    describe('without args', function() {
        it('should bad request', function(done) {
            request
                .get('/i/users/delete?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Error: Missing \'args\' parameter');
                    done();
                });
        });
    });
    describe('delete', function() {
        it('should not authorize', function(done) {
            var params = {user_ids: [USER_ID]};
            request
                .get('/i/users/delete?api_key=' + API_KEY_USER)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User does not have right');
                    done();
                });
        });
    });
    describe('delete', function() {
        it('should delete successfully', function(done) {
            var params = {user_ids: [USER_ID]};
            request
                .get('/i/users/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
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
    describe('Verify user deletion', function() {
        it('should return one user', function(done) {
            request
                .get('/o/users/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    var keys = Object.keys(ob);
                    ob.should.have.property(keys[0]);
                    keys.should.have.lengthOf(1);
                    var user = ob[keys[0]];
                    user.should.have.property('api_key', API_KEY_ADMIN);
                    user.should.have.property('email', testUtils.email);
                    user.should.have.property('full_name', testUtils.name);
                    user.should.have.property('global_admin', true);
                    user.should.have.property('username', testUtils.username);
                    user.should.have.property('_id');
                    ADMIN_ID = user._id;
                    done();
                    //deferred to insert test in queue after authentication for crawler completed
                    tearDown();
                });
        });
    });
});

function tearDown() {
    describe('delete admin', function() {
        it('should delete successfully', function(done) {
            var params = {user_ids: [ADMIN_ID]};
            request
                .get('/i/users/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    done();
                });
        });
    });
}