var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
var agent = request.agent(testUtils.url);

describe('Accessing without login', function() {
    describe('GET /', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
    describe('GET /login', function() {
        it('should display login page', function(done) {
            agent
                .get('/login')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200, done);
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
        it('should not find', function(done) {
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
        it('should redirect to login', function(done) {
            agent
                .get('/setup')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
});

describe('Login in', function() {
    describe('Getting CSRF', function() {
        it('should display login page', function(done) {
            agent
                .get('/login')
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
        it('should redirect back to login with bad token message', function(done) {
            agent
                .post('/login')
                .send({username: testUtils.username, password: testUtils.password})
                .expect('location', '/login?message=login.token-expired')
                .expect(302)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();

                });
        });
    });
    describe('Missing username', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should display login page', function(done) {
            agent
                .post('/login')
                .send({password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect(302, done);
        });
    });
    describe('Missing password', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should display login page', function(done) {
            agent
                .post('/login')
                .send({username: testUtils.username, _csrf: testUtils.getCSRF()})
                .expect(302, done);
        });
    });
    describe('Login with username', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to dashboard', function(done) {
            agent
                .post('/login')
                .send({username: testUtils.username, password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect('location', '/dashboard')
                .expect(302, done);
        });
    });
    describe('Login out', function() {
        beforeEach(function(done) {
            testUtils.loadCSRF(agent, function() {
                done();
            });
        });

        it('should not logout by get method, bu simply redirect to login', function(done) {
            agent
                .get('/logout')
                .expect('location', '/login')
                .expect(302, done);
        });

        it('should return 302 & redirect to /login', function(done) {
            agent
                .post('/logout?message=content')
                .send({_csrf: testUtils.getCSRF()})
                .expect(302, done)
                .expect('location', '/login?message=content');
        });
    });
    describe('Getting new CSRF', function() {
        before(function(done) {
            //clear old csrf
            testUtils.setCSRF(null);
            done();
        });
        it('should display login page', function(done) {
            agent
                .get('/login')
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
    describe('Login with email', function() {
        before(function(done) {
            testUtils.waitCSRF(done);
        });
        it('should redirect to dashboard', function(done) {
            agent
                .post('/login')
                .send({username: testUtils.email, password: testUtils.password, _csrf: testUtils.getCSRF()})
                .expect('location', '/dashboard')
                .expect(302, done);
        });
    });
});

describe('Accessing with login', function() {
    describe('GET /', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
    describe('GET /login', function() {
        it('should redirect to dashboard', function(done) {
            agent
                .get('/login')
                .expect('location', '/dashboard')
                .expect(302, done);
        });
    });
    describe('GET /dashboard', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/dashboard')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200, done);
        });
    });
    describe('GET /forgot', function() {
        it('should redirect to dashboard', function(done) {
            agent
                .get('/forgot')
                .expect('location', '/dashboard')
                .expect(302, done);
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
        it('should not find', function(done) {
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
        it('should redirect to login', function(done) {
            agent
                .get('/setup')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
});

describe('Login out', function() {
    describe('Post /logout', function() {
        before(function(done) {
            testUtils.loadCSRF(agent, function() {
                done();
            });
        });

        it('should return 302 & redirect to /login', function(done) {
            agent
                .post('/logout?message=content')
                .send({_csrf: testUtils.getCSRF()})
                .expect(302, done)
                .expect('location', '/login?message=content');
        });
    });
});

describe('Accessing after logout', function() {
    describe('GET /', function() {
        it('should redirect to login', function(done) {
            agent
                .get('/')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
    describe('GET /login', function() {
        it('should display login page', function(done) {
            agent
                .get('/login')
                .expect('Content-Type', "text/html; charset=utf-8")
                .expect(200, done);
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
        it('should not find', function(done) {
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
        it('should redirect to login', function(done) {
            agent
                .get('/setup')
                .expect('location', '/login')
                .expect(302, done);
        });
    });
});

describe('Getting API KEY', function() {
    describe('GET /api-key', function() {
        it('should return API KEY', function(done) {
            agent
                .get('/api-key')
                .auth(testUtils.username, testUtils.password)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.text.should.be.an.instanceOf(String).and.have.lengthOf(32);
                    done();
                });
        });
    });
});