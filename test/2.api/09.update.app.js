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
                    ob.should.have.property('result', 'User does not have admin rights for this app');
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
});