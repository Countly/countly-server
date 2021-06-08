var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";

describe('Failing app analytics data reading', function() {
    describe('without api key', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            APP_ID = testUtils.get("APP_ID");
            request
                .get('/o/analytics/dashboard?app_id=' + APP_ID)
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
    describe('without app id', function() {
        it('should bad request', function(done) {
            request
                .get('/o/analytics?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "app_id"');
                    done();
                });
        });
    });
    describe('without method', function() {
        it('should bad request', function(done) {
            request
                .get('/o/analytics?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid path, must be one of /dashboard or /countries');
                    done();
                });
        });
    });
    describe('incorrect api key', function() {
        it('should not authorize', function(done) {
            request
                .get('/o/analytics/dashboard?api_key=1234567890&app_id=123456789012345678901234')
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User does not exist');
                    done();
                });
        });
    });
    describe('incorrect app id', function() {
        it('should not authorize', function(done) {
            request
                .get('/o/analytics/dashboard?api_key=' + API_KEY_ADMIN + '&app_id=123456789012345678901234')
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'App does not exist');
                    done();
                });
        });
    });
    describe('no permission for app', function() {
        it('should not authorize', function(done) {
            request
                .get('/o/analytics/dashboard?api_key=' + API_KEY_USER + '&app_id=' + APP_ID)
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
});