var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";

describe('Updating app', function() {
    describe('without args', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            APP_ID = testUtils.get("APP_ID");
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN)
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
    describe('without permission', function() {
        it('should not authorize', function(done) {
            var params = {app_id: APP_ID, name: "Test"};
            request
                .get('/i/apps/update?api_key=' + API_KEY_USER + "&args=" + JSON.stringify(params))
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
    describe('not updating app', function() {
        it('should change nothing', function(done) {
            var params = {app_id: APP_ID};
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Nothing changed');
                    done();
                });
        });
    });
    describe('updating app', function() {
        it('should update app', function(done) {
            var appName = "Test";
            var params = {name: appName, app_id: APP_ID};
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('name', appName);
                    done();
                });
        });
    });
    describe('verify all app created', function() {
        it('should return app info', function(done) {
            request
                .get('/o/apps/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('admin_of');
                    var apps = ob["admin_of"];
                    apps.should.have.property(APP_ID);
                    var app = apps[APP_ID];
                    app.should.have.property("name", "Test");

                    ob.should.have.property('user_of');
                    var apps = ob["user_of"];
                    apps.should.have.property(APP_ID);
                    var app = apps[APP_ID];
                    app.should.have.property("name", "Test");

                    done();
                });
        });
    });
    describe('verify mine app created', function() {
        it('should return app info', function(done) {
            request
                .get('/o/apps/mine?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('admin_of');
                    var apps = ob["admin_of"];
                    apps.should.have.property(APP_ID);
                    var app = ob["admin_of"][APP_ID];
                    app.should.have.property("name", "Test");

                    ob.should.have.property('user_of');
                    var apps = ob["user_of"];
                    apps.should.have.property(APP_ID);
                    var app = ob["user_of"][APP_ID];
                    app.should.have.property("name", "Test");

                    done();
                });
        });
    });
    describe('App details', async() => {
        it('Should contain correct admins and users', async() => {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");

            // Create new user with access to app
            const userParams = JSON.stringify({
                full_name: 'testappdetails',
                username: 'testappdetails',
                password: 'p4ssw0rD!',
                email: 'mail@mail.com',
                permission: {
                    _: {
                        a: [APP_ID],
                        u: [[APP_ID]],
                    },
                },
            });
            let sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', userParams);

            const userResponse = await request.get(`/i/users/create?${sp.toString()}`);
            const userId = userResponse.body._id;

            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('app_id', APP_ID);

            // Check that user is in app details result
            const appResponse = await request.get(`/o/apps/details?${sp.toString()}`);
            should(appResponse.status).equal(200);

            const userInAdmin = appResponse.body.admin.findIndex((item) => item.username === 'testappdetails');
            const userInUser = appResponse.body.user.findIndex((item) => item.username === 'testappdetails');

            should(userInAdmin >= 0).be.true();
            should(userInUser >= 0).be.true();

            // delete user
            sp = new URLSearchParams();
            sp.append('api_key', API_KEY_ADMIN);
            sp.append('args', JSON.stringify({ user_ids: [userId] }));

            const userResponses = await request.get(`/i/users/delete?${sp.toString()}`);
        });
    });
});