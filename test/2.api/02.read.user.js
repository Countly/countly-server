var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);
var API_KEY_ADMIN = "";

describe('Getting API KEY', function() {
    describe('GET /api-key', function() {
        it('should return API KEY', function(done) {
            request
                .get('/api-key')
                .auth(testUtils.username, testUtils.password)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    API_KEY_ADMIN = res.text;
                    testUtils.set("API_KEY_ADMIN", API_KEY_ADMIN);
                    API_KEY_ADMIN.should.be.an.instanceOf(String).and.have.lengthOf(32);
                    done();
                });
        });
    });
});

describe('Initial reading', function() {
    describe('Reading users without key', function() {
        it('should bad request', function(done) {
            request
                .get('/o/users/all')
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
    describe('Reading users with incorrect key and path', function() {
        it('should bad request', function(done) {
            request
                .get('/o/users?api_key=test')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid path, must be one of /all or /me');
                    done();
                });
        });
    });
    describe('Reading users with incorrect key', function() {
        it('should not authorize', function(done) {
            request
                .get('/o/users/me?api_key=test')
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
    describe('Reading users with key', function() {
        it('should bad request', function(done) {
            request
                .get('/o/users?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Invalid path, must be one of /all or /me');
                    done();
                });
        });
    });
    describe('Reading users /me', function() {
        it('should return information', function(done) {
            request
                .get('/o/users/me?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('email', testUtils.email);
                    ob.should.have.property('full_name', testUtils.name);
                    ob.should.have.property('global_admin', true);
                    ob.should.have.property('username', testUtils.username);
                    done();
                });
        });
    });
    describe('Reading users /all', function() {
        it('should return information', function(done) {
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
                    var user = ob[keys[0]];
                    user.should.have.property('email', testUtils.email);
                    user.should.have.property('full_name', testUtils.name);
                    user.should.have.property('global_admin', true);
                    user.should.have.property('username', testUtils.username);
                    done();
                });
        });
    });
});
