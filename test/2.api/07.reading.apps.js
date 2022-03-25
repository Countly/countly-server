var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";

describe('Reading apps', function() {
    describe('without api key', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            request
                .get('/o/apps/all')
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
    describe('without path', function() {
        it('should bad request', function(done) {
            request
                .get('/o/apps?api_key=' + API_KEY_USER)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid path, must be one of /all, /mine, /details or /plugins');
                    done();
                });
        });
    });
    describe('without permission', function() {
        it('should not authorize', function(done) {
            request
                .get('/o/apps/all?api_key=' + API_KEY_USER)
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
    describe('no all apps', function() {
        it('should return no apps', function(done) {
            request
                .get('/o/apps/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('user_of');
                    ob.should.have.property('admin_of');
                    done();
                });
        });
    });
    describe('no mine apps', function() {
        it('should return no apps', function(done) {
            request
                .get('/o/apps/mine?api_key=' + API_KEY_USER)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('user_of');
                    ob.should.have.property('admin_of');
                    done();
                });
        });
    });
});