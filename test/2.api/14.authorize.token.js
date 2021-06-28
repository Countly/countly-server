var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");


var agent = request.agent(testUtils.url);

request = request(testUtils.url);
var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

var authorize = require('../../api/utils/authorizer.js');

var testowner = "";
var testkey = "";
var testtoken = "";

describe('create test user', function() {
    it('creating test user', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        APP_KEY = testUtils.get("APP_KEY");

        var params = {full_name: "Cool guy", permission: testUtils.permission, username: testUtils.username + "2", password: testUtils.password, email: testUtils.email + ".test2", global_admin: true};
        request
            .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('full_name', "Cool guy");
                ob.should.have.property('username', testUtils.username + "2");
                ob.should.have.property('email', testUtils.email + ".test2");
                ob.should.have.property('api_key');
                testkey = ob["api_key"];
                testowner = ob["_id"];
                done();
            });
    });
});

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

describe('Test if token is created on login', function() {
    before(function(done) {
        testUtils.waitCSRF(done);
    });
    it('should redirect to dashboard', function(done) {
        agent
            .post('/login')
            .send({username: testUtils.username + "2", password: testUtils.password, _csrf: testUtils.getCSRF()})
            .expect('location', '/dashboard')
            .expect(302, done);
    });

    after(function(done) {
        testUtils.db.collection("auth_tokens").find({owner: testowner}).toArray(function(err, res) {
            if (err) {
                done(err);
            }
            if (res && res.length == 1) {
                testtoken = res[0]._id;
                res[0].multi.should.be.exactly(true);
                res[0].ttl.should.be.exactly(1800);
                done();
            }
            else {
                done('invalid token count');
            }
        });
    });
});

describe('Test if token is deleted on logout', function() {
    beforeEach(function(done) {
        testUtils.loadCSRF(agent, function() {
            done();
        });
    });

    it('should redirect to login', function(done) {
        agent
            .post('/logout')
            .send({_csrf: testUtils.getCSRF()})
            .expect('location', '/login')
            .expect(302, done);
    });

    after(function(done) {
        testUtils.db.collection("auth_tokens").find({owner: testowner}).toArray(function(err, res) {
            if (err) {
                done(err);
            }

            if (res && res.length == 0) {
                done();
            }
            else {
                done('invalid token count');
            }

        });
    });
});

describe('Testing global admin user token', function() {
/*
    it('cleaning up previous token for this user', function(done) {
        testUtils.db.collection("auth_tokens").remove({owner: testowner}, function(err, res) {
            done();
        });
    });
*/
    it('creating token for user', function(done) {

        authorize.save({
            db: testUtils.db,
            multi: true,
            owner: testowner,
            callback: function(err, token) {
                if (err) {
                    done(err);
                }
                if (token) {
                    testtoken = token;
                    done();
                }
                else {
                    done("token not created");
                }
            }
        });
    });

    it('Try getting user info(validate user)', function(done) {
        request
            .get('/o/users/me?auth_token=' + testtoken)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('email', testUtils.email + '.test2');
                ob.should.have.property('full_name', 'Cool guy');
                ob.should.have.property('global_admin', true);
                done();
            });
    });

    it('Try getting dashboard(validate for read)', function(done) {
        request
            .get('/o/analytics/dashboard?app_id=' + APP_ID + '&auth_token=' + testtoken)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                done();
            });
    });

    it('Plugins, validate for write', function(done) {
        request
            .get('/i/plugins?app_id=' + APP_ID + '&auth_token=' + testtoken)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.be.exactly("Not enough parameters");
                done();
            });
    });

    it('Try getting all users list(validate for global admin)', function(done) {
        request
            .get('/o/users/all?api_key=fakekey&auth_token=' + testtoken)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);

                done();
            });
    });
/*
    it('cleaning up previous token for this user', function(done) {
        testUtils.db.collection("auth_tokens").remove({owner: testowner}, function(err, res) {
            done();
        });
    });
*/
});

describe('Creating token to allow only paths under /o/users/', function() {
    it('creating token for user', function(done) {
        authorize.save({
            db: testUtils.db,
            endpoint: "^/o/users/",
            multi: true,
            owner: testowner,
            callback: function(err, token) {
                if (err) {
                    done(err);
                }
                if (token) {
                    testtoken = token;
                    done();
                }
                else {
                    done("token not created");
                }
            }
        });
    });

    it('Try getting all users list', function(done) {
        request
            .get('/o/users/all?api_key=fakekey&auth_token=' + testtoken)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                done();
            });
    });

    it('Try getting dashboard(should fail)', function(done) {
        request
            .get('/o/analytics/dashboard?app_id=' + APP_ID + '&auth_token=' + testtoken)
            .expect(400)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.result.should.be.exactly('Token not valid');
                done();
            });
    });

});


describe("cleaning up", function() {
    it('remove token and user', function(done) {
        var params = {user_ids: [testowner]};
        request
            .get('/i/users/delete?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('check if token deleted when user deleted', function(done) {
        testUtils.db.collection("auth_tokens").find({owner: testowner}).toArray(function(err, res) {
            if (err) {
                done(err);
            }
            if (res && res.length == 0) {
                done();
            }
            else {
                testUtils.db.collection("auth_tokens").remove({owner: testowner});//clean up for other tests
                done('invalid token count');
            }
        });
    });
});