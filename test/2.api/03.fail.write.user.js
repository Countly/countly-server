var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

describe('Fail writing user', function() {
    describe('Writing users without key', function() {
        it('should bad request', function(done) {
            request
                .get('/i/users/update')
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
    describe('Writing users with incorrect key and path', function() {
        it('should bad request', function(done) {
            request
                .get('/i/users?api_key=test')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid path, must be one of /create, /update, /deleteOwnAccount or /delete');
                    done();
                });
        });
    });
    describe('Writing users with incorrect key', function() {
        it('should not authorize', function(done) {
            request
                .get('/i/users/create?api_key=test')
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
});