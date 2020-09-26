var request = require('supertest');
var should = require('should');
var plugins = require("../../plugins/pluginManager");
var testUtils = require("../testUtils");
var agent = request.agent(testUtils.url);

describe('Accessing without setup', function() {
    describe('GET /i', function() {
        it('should bad request', function(done) {
            agent
                .get('/i')
                .expect(400, done);
        });
    });
    describe('GET /o', function() {
        it('should bad request', function(done) {
            agent
                .get('/o')
                .expect(400, done);
        });
    });
    describe('GET /', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
    describe('GET /login', function() {
        it('should redirect to setup', function(done) {
            agent
                .get('/login')
                .expect('location', '/setup')
                .expect(302, done);
        });
    });
    describe('GET /dashboard', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/dashboard')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
    describe('GET /forgot', function() {
        it('should display forgot page', function(done) {
            agent
                .get('/forgot')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200, done);
        });
    });
    describe('GET /reset', function() {
        it('should not find', function(done) {
            agent
                .get('/reset')
                .expect(404, done);
        });
    });
    describe('GET /reset/:prid', function() {
        it('should redirect to forgot', function(done) {
            agent
                .get('/reset/1')
                .expect('location', '/forgot')
                .expect(302, done);
        });
    });
    describe('GET /api-key', function() {
        it('should not authorize', function(done) {
            agent
                .get('/api-key')
                .expect(401, done);
        });
    });
    describe('GET /setup', function() {
        it('should display setup page', function(done) {
            agent
                .get('/setup')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200, done);
        });
    });
});

describe('Setting Up', function() {
    describe('Getting CSRF', function() {
        it('should display setup page', function(done) {
            agent
                .get('/setup')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var csrf = testUtils.CSRFfromBody(res.text);
                    csrf.should.be.an.instanceOf(String).and.have.lengthOf(36);
                    done();
                });
        });
    });
    describe('Missing CSRF', function() {
        it('should forbid', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, username: testUtils.username, password: testUtils.password, email: testUtils.email})
                .expect(403, done);
        });
    });
    describe('Missing name', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({username: testUtils.username, email: testUtils.email, password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect(200, done);
        });
    });
    describe('Missing username', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, email: testUtils.email, password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect(200, done);
        });
    });
    describe('Missing email', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, username: testUtils.username, password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect(200, done);
        });
    });
    describe('Missing password', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, username: testUtils.username, email: testUtils.email, _csrf: testUtils.getCSRF()})
                .expect(200, done);
        });
    });
    describe('password is not match requirement', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, username: testUtils.username, email: testUtils.email, password: testUtils.weakPassword, _csrf: testUtils.getCSRF()})
                .expect(200, done);
        });
    });
    describe('Register user', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to setup', function(done) {
            agent
                .post('/setup')
                .send({full_name: testUtils.name, username: testUtils.username, password: testUtils.password, email: testUtils.email, _csrf: testUtils.getCSRF()})
                .expect('location', '/dashboard')
                .expect(302, done);
        });
    });
});