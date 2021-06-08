var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";
var APP_KEY = "";

describe('Create app', function() {
    describe('without permission', function() {
        it('should not authorized', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            request
                .get('/i/apps/create?api_key=' + API_KEY_USER)
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
    describe('without args', function() {
        it('should bad request', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN)
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
    describe('creating app', function() {
        it('should create app', function(done) {
            var appName = "Test App";
            var params = {name: appName};
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('name', appName);
                    APP_ID = ob._id;
                    APP_KEY = ob.key;
                    testUtils.set("APP_ID", APP_ID);
                    testUtils.set("APP_KEY", APP_KEY);
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
                    app.should.have.property("name", "Test App");

                    ob.should.have.property('user_of');
                    var apps = ob["user_of"];
                    apps.should.have.property(APP_ID);
                    var app = apps[APP_ID];
                    app.should.have.property("name", "Test App");

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
                    app.should.have.property("name", "Test App");

                    ob.should.have.property('user_of');
                    var apps = ob["user_of"];
                    apps.should.have.property(APP_ID);
                    var app = ob["user_of"][APP_ID];
                    app.should.have.property("name", "Test App");

                    done();
                });
        });
    });

    describe("GET /i/apps/plugins application level plugins configurations", () => {
        const loggerPluginAppConfig = { state: 'automatic', limit: 1000};
        const apiPluginAppConfig = { session_cooldown_period: 15 };

        before((done) => {
            request
                .post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN)
                .send({
                    app_id: APP_ID,
                    args: JSON.stringify({
                        logger: loggerPluginAppConfig,
                        api: apiPluginAppConfig
                    })
                })
                .expect(200)
                .then(() => {
                    done();
                });
        });

        it('should return app level plugins configurations', (done) => {
            request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end((error, response) => {
                    if (error) {
                        return done(error);
                    }
                    const responseJson = JSON.parse(response.text);
                    responseJson.should.have.property('plugins');
                    responseJson.plugins.should.eql({logger: loggerPluginAppConfig, api: apiPluginAppConfig});
                    done();
                });
        });

        it('should return specific app level plugin configuration when plugin name is correct', (done) => {
            request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&name=logger')
                .expect(200)
                .end((error, response) => {
                    if (error) {
                        return done(error);
                    }
                    const responseJson = JSON.parse(response.text);
                    responseJson.plugins.should.have.property('logger');
                    responseJson.plugins.should.not.have.property('api');
                    responseJson.plugins.logger.should.eql(loggerPluginAppConfig);
                    done();
                });
        });

        it('should return app level plugins configurations when plugin name is incorrect', (done) => {
            request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&name=invalidName')
                .expect(200)
                .end((error, response) => {
                    if (error) {
                        return done(error);
                    }
                    const responseJson = JSON.parse(response.text);
                    responseJson.should.have.property('plugins');
                    responseJson.plugins.should.eql({logger: loggerPluginAppConfig, api: apiPluginAppConfig});
                    done();
                });
        });

        it('should fail to return app level plugins configurations when app id is missing', (done) => {
            request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end((error, response) => {
                    if (error) {
                        return done(error);
                    }
                    const responseJson = JSON.parse(response.text);
                    responseJson.should.have.property('result');
                    responseJson.result.should.equal('Error: Missing app_id argument');
                    done();
                });
        });
    });
});