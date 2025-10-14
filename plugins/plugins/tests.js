/*global describe,it,before */
var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";

describe('Testing Plugins API', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
    });

    describe('Plugin Management', function() {
        it('should get list of plugins with proper schema', function(done) {
            request
                .get('/o/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var plugins = JSON.parse(res.text);
                    plugins.should.not.be.empty();
                    plugins.should.be.an.instanceOf(Array);

                    // Test plugin schema according to OpenAPI spec
                    for (var i = 0; i < plugins.length; i++) {
                        var plugin = plugins[i];
                        plugin.should.have.property("enabled");
                        plugin.should.have.property("code");
                        plugin.should.have.property("title");
                        plugin.should.have.property("name");
                        plugin.should.have.property("description");
                        plugin.should.have.property("version");
                        plugin.should.have.property("author");
                        plugin.should.have.property("homepage");
                        plugin.should.have.property("cly_dependencies");

                        // Type validation
                        plugin.enabled.should.be.type('boolean');
                        plugin.code.should.be.type('string');
                        plugin.title.should.be.type('string');
                        plugin.name.should.be.type('string');
                        plugin.description.should.be.type('string');
                        plugin.version.should.be.type('string');
                        plugin.author.should.be.type('string');
                        plugin.homepage.should.be.type('string');
                        plugin.cly_dependencies.should.be.type('object');

                        // Test specific plugin properties
                        if (plugin.name === "countly-plugins") {
                            plugin.should.have.property("title", "Plugins manager");
                            plugin.should.have.property("description", "Plugin manager to view and enable/disable plugins");
                            plugin.should.have.property("author", "Count.ly");
                            plugin.should.have.property("enabled", true);
                            plugin.should.have.property("code", "plugins");
                        }
                    }
                    done();
                });
        });

        it('should check plugin installation status', function(done) {
            request
                .get('/o/plugins-check?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var response = JSON.parse(res.text);
                    response.should.have.property("result");
                    response.result.should.be.type('string');
                    // Should be one of the valid statuses
                    ['completed', 'busy', 'failed'].should.containEql(response.result);
                    done();
                });
        });

        it('should reject plugin management without authentication', function(done) {
            request
                .get('/o/plugins')
                .expect(400)
                .end(done);
        });

        it('should reject plugin check without authentication', function(done) {
            request
                .get('/o/plugins-check')
                .expect(400)
                .end(done);
        });
    });

    describe('System Information', function() {
        it('should get internal events list', function(done) {
            request
                .get('/o/internal-events?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var events = JSON.parse(res.text);
                    events.should.be.an.instanceOf(Array);
                    // Each event should be a string
                    for (var i = 0; i < events.length; i++) {
                        events[i].should.be.type('string');
                    }
                    done();
                });
        });

        it('should get available themes list', function(done) {
            request
                .get('/o/themes?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var themes = JSON.parse(res.text);
                    themes.should.be.an.instanceOf(Array);
                    // Each theme should be a string
                    for (var i = 0; i < themes.length; i++) {
                        themes[i].should.be.type('string');
                    }
                    done();
                });
        });

        it('should reject internal events without authentication', function(done) {
            request
                .get('/o/internal-events')
                .expect(400)
                .end(done);
        });

        it('should reject themes without authentication', function(done) {
            request
                .get('/o/themes')
                .expect(400)
                .end(done);
        });
    });

    describe('System Testing', function() {
        it('should test email functionality', function(done) {
            request
                .get('/o/email_test?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(function(res) {
                    // Should be either 200 (OK) or 503 (Failed)
                    [200, 503].should.containEql(res.status);
                })
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var response = JSON.parse(res.text);
                    response.should.have.property("result");
                    response.result.should.be.type('string');
                    if (res.status === 200) {
                        response.result.should.equal("OK");
                    }
                    else if (res.status === 503) {
                        response.result.should.equal("Failed");
                    }
                    done();
                });
        });

        it('should reject email test without authentication', function(done) {
            request
                .get('/o/email_test')
                .expect(400)
                .end(done);
        });
    });
});

describe('Testing Configurations API', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
    });

    describe('System Configuration', function() {
        it('should get system configurations', function(done) {
            request
                .get('/o/configs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var configs = JSON.parse(res.text);
                    configs.should.be.type('object');
                    // Should not contain sensitive services config
                    configs.should.not.have.property('services');
                    done();
                });
        });

        it('should reject system configs without authentication', function(done) {
            request
                .get('/o/configs')
                .expect(400)
                .end(done);
        });

        it('should reject config update with invalid JSON', function(done) {
            request
                .get('/i/configs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&configs=invalid_json')
                .expect(400)
                .end(done);
        });

        it('should reject config update without parameters', function(done) {
            request
                .get('/i/configs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(done);
        });
    });

    describe('User Configuration', function() {
        it('should get user configurations', function(done) {
            request
                .get('/o/userconfigs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var userConfigs = JSON.parse(res.text);
                    userConfigs.should.be.type('object');
                    done();
                });
        });

        it('should reject user configs without authentication', function(done) {
            request
                .get('/o/userconfigs')
                .expect(400)
                .end(done);
        });

        it('should reject user config update with invalid JSON', function(done) {
            request
                .get('/i/userconfigs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&configs=invalid_json')
                .expect(400)
                .end(done);
        });

        it('should reject user config update without parameters', function(done) {
            request
                .get('/i/userconfigs?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(400)
                .end(done);
        });
    });
});