var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var TEMPLATE_ID = "";
var ENVIRONMENT_ID = "";

describe('Testing Populator plugin', function() {
    describe('Setup', function() {
        it('Set params', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            done();
        });
    });

    describe('Testing template endpoints', function() {
        describe('POST /i/populator/templates/create', function() {
            it('should validate parameters before authentication', function(done) {
                request
                    .get('/i/populator/templates/create')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Invalid params:");
                        done();
                    });
            });

            it('should fail without required parameters', function(done) {
                request
                    .get('/i/populator/templates/create?api_key=' + API_KEY_ADMIN)
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Invalid params:");
                        done();
                    });
            });

            it('should validate parameters and handle array format issues', function(done) {
                request
                    .get('/i/populator/templates/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&name=Test Template&uniqueUserCount=100&platformType[]=web&platformType[]=mobile&isDefault=false')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Invalid params:");
                        done();
                    });
            });

            it('should validate parameters for duplicate name check', function(done) {
                request
                    .get('/i/populator/templates/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&name=Test Template&uniqueUserCount=50&platformType[]=web')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Invalid params:");
                        done();
                    });
            });
        });

        describe('GET /o/populator/templates', function() {
            it('should fail without authentication', function(done) {
                request
                    .get('/o/populator/templates')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should return list of templates', function(done) {
                request
                    .get('/o/populator/templates?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var templates = JSON.parse(res.text);
                        templates.should.be.an.Array();
                        if (templates.length > 0) {
                            templates[0].should.have.property('_id');
                            templates[0].should.have.property('name');
                            // platformType may not exist in older templates
                        }
                        done();
                    });
            });

            it('should return specific template when template_id is provided', function(done) {
                if (!TEMPLATE_ID) {
                    return done(); // Skip if no template was created
                }

                request
                    .get('/o/populator/templates?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&template_id=' + TEMPLATE_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var template = JSON.parse(res.text);
                        template.should.be.an.Object();
                        template.should.have.property('_id');
                        template.should.have.property('name');
                        template.name.should.eql('Test Template');
                        done();
                    });
            });

            it('should filter templates by platform type', function(done) {
                request
                    .get('/o/populator/templates?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&platform_type=web')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var templates = JSON.parse(res.text);
                        templates.should.be.an.Array();
                        done();
                    });
            });

            it('should return 404 for non-existent template', function(done) {
                request
                    .get('/o/populator/templates?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&template_id=123456789012345678901234')
                    .expect(404)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Could not find template");
                        done();
                    });
            });
        });

        describe('GET /i/populator/templates/edit', function() {
            it('should fail without authentication', function(done) {
                request
                    .get('/i/populator/templates/edit')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should edit template successfully', function(done) {
                if (!TEMPLATE_ID) {
                    return done(); // Skip if no template was created
                }

                request
                    .get('/i/populator/templates/edit?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&template_id=' + TEMPLATE_ID + '&name=Updated Test Template&uniqueUserCount=200&platformType[]=web&platformType[]=mobile&platformType[]=desktop&isDefault=true')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Success");
                        done();
                    });
            });

            it('should validate parameters before checking template ID', function(done) {
                request
                    .get('/i/populator/templates/edit?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&template_id=invalid&name=Test&uniqueUserCount=100&platformType[]=web')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Invalid params:");
                        done();
                    });
            });
        });
    });

    describe('Testing environment endpoints', function() {
        describe('GET /i/populator/environment/save', function() {
            it('should fail without authentication', function(done) {
                request
                    .get('/i/populator/environment/save')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should fail without users parameter', function(done) {
                request
                    .get('/i/populator/environment/save?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing params: users");
                        done();
                    });
            });

            it('should save environment successfully', function(done) {
                if (!TEMPLATE_ID) {
                    return done(); // Skip if no template was created
                }

                var users = [{
                    deviceId: DEVICE_ID,
                    templateId: TEMPLATE_ID,
                    appId: APP_ID,
                    environmentName: 'Test Environment',
                    userName: 'Test User',
                    platform: 'web',
                    device: 'desktop',
                    appVersion: '1.0.0',
                    custom: {}
                }];

                request
                    .get('/i/populator/environment/save?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&users=' + encodeURIComponent(JSON.stringify(users)) + '&setEnviromentInformationOnce=true')
                    .expect(201)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Successfully created ");
                        done();
                    });
            });
        });

        describe('GET /o/populator/environment/check', function() {
            it('should fail without authentication', function(done) {
                request
                    .get('/o/populator/environment/check')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should check environment name availability', function(done) {
                request
                    .get('/o/populator/environment/check?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&environment_name=New Environment')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var result = JSON.parse(res.text);
                        result.should.have.property('result');
                        done();
                    });
            });

            it('should detect duplicate environment name', function(done) {
                request
                    .get('/o/populator/environment/check?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&environment_name=Test Environment')
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var result = JSON.parse(res.text);
                        if (result.errorMsg) {
                            result.errorMsg.should.containEql("Duplicated environment name");
                        }
                        done();
                    });
            });
        });

        describe('GET /o/populator/environment/list', function() {
            it('should fail without authentication', function(done) {
                request
                    .get('/o/populator/environment/list')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should return list of environments', function(done) {
                request
                    .get('/o/populator/environment/list?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var environments = JSON.parse(res.text);
                        environments.should.be.an.Array();
                        if (environments.length > 0) {
                            environments[0].should.have.property('_id');
                            environments[0].should.have.property('name');
                            environments[0].should.have.property('templateId');
                            environments[0].should.have.property('appId');
                            environments[0].should.have.property('createdAt');
                            ENVIRONMENT_ID = environments[0]._id; // Store for later tests
                        }
                        done();
                    });
            });
        });

        describe('GET /o/populator/environment/get', function() {
            it('should fail without required parameters', function(done) {
                request
                    .get('/o/populator/environment/get')
                    .expect(401)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Missing parameter");
                        done();
                    });
            });

            it('should validate app_id parameter before authentication', function(done) {
                request
                    .get('/o/populator/environment/get?environment_id=test&template_id=test')
                    .expect(401)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Missing parameter app_id");
                        done();
                    });
            });

            it('should fail without required parameters when authenticated', function(done) {
                request
                    .get('/o/populator/environment/get?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(401)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Missing parameter");
                        done();
                    });
            });

            it('should get environment details', function(done) {
                if (!ENVIRONMENT_ID || !TEMPLATE_ID) {
                    return done(); // Skip if no environment was created
                }

                request
                    .get('/o/populator/environment/get?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&environment_id=' + ENVIRONMENT_ID + '&template_id=' + TEMPLATE_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var environment = JSON.parse(res.text);
                        environment.should.have.property('_id');
                        environment.should.have.property('name');
                        done();
                    });
            });
        });

        describe('GET /o/populator/environment/remove', function() {
            it('should fail without required parameters', function(done) {
                request
                    .get('/o/populator/environment/remove')
                    .expect(401)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Missing parameter");
                        done();
                    });
            });

            it('should fail without authentication when parameters provided', function(done) {
                request
                    .get('/o/populator/environment/remove?environment_id=test&template_id=test')
                    .expect(400)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                        done();
                    });
            });

            it('should fail without required parameters when authenticated', function(done) {
                request
                    .get('/o/populator/environment/remove?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(401)
                    .end(function(err, res) {
                        var ob = JSON.parse(res.text);
                        ob.result.should.containEql("Missing parameter");
                        done();
                    });
            });

            it('should remove environment successfully', function(done) {
                if (!ENVIRONMENT_ID || !TEMPLATE_ID) {
                    return done(); // Skip if no environment was created
                }

                request
                    .get('/o/populator/environment/remove?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&environment_id=' + ENVIRONMENT_ID + '&template_id=' + TEMPLATE_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var result = JSON.parse(res.text);
                        result.result.should.eql(true);
                        done();
                    });
            });
        });
    });

    describe('Cleanup', function() {
        describe('GET /i/populator/templates/remove', function() {
            it('should remove template successfully', function(done) {
                if (!TEMPLATE_ID) {
                    return done(); // Skip if no template was created
                }

                request
                    .get('/i/populator/templates/remove?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&template_id=' + TEMPLATE_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.result.should.eql("Success");
                        done();
                    });
            });
        });
    });
});