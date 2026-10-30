var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Populator plugin', function() {
    describe('Testing enviroment endpoint ', function() {
        it('Set params', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            done();
        });

        it('Try without any params', function(done) {
            request
                .get('/i/populator/environment/save')
                .expect(400)
                .end(function(err, res) {
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                    done();
                });

        });

        it('Try without "users"', function(done) {
            request
                .get('/i/populator/environment/save?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Missing params: users");
                    done();
                });
        });
    });

    describe('Environment users stay within their app', function() {
        var TEMPLATE_ID = "65f0a1b2c3d4e5f6a7b8c9d0";
        var ENV_NAME = "Scoped Environment";
        var DEVICES = ["dev-1", "dev-2"];
        var APP_A = "";
        var APP_B = "";
        var ENV_A = "";
        var ENV_B = "";
        var MEMBER_ID = "";
        var MEMBER_KEY = "";

        /**
         * Create an app as admin
         * @param {string} name - app name
         * @param {function} callback - called with the app id
         */
        function createApp(name, callback) {
            request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: name}))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, res.body._id);
                });
        }

        /**
         * Generate an environment on an app as admin
         * @param {string} appId - app id
         * @param {function} callback - called when done
         */
        function saveEnvironment(appId, callback) {
            var users = DEVICES.map(function(deviceId) {
                return {deviceId: deviceId, templateId: TEMPLATE_ID, appId: appId, environmentName: ENV_NAME, userName: "user " + deviceId, platform: "Android"};
            });
            request.get('/i/populator/environment/save?api_key=' + API_KEY_ADMIN + '&app_id=' + appId + '&setEnviromentInformationOnce=true&users=' + encodeURIComponent(JSON.stringify(users)))
                .expect(201)
                .end(callback);
        }

        /**
         * Read environment users
         * @param {string} apiKey - api key
         * @param {string} appId - app id
         * @param {string} templateId - template id
         * @param {string} environmentId - environment id
         * @param {number} status - expected status
         * @param {function} callback - called with the response
         */
        function getEnvironment(apiKey, appId, templateId, environmentId, status, callback) {
            request.get('/o/populator/environment/get?api_key=' + apiKey + '&app_id=' + appId + '&template_id=' + encodeURIComponent(templateId) + '&environment_id=' + encodeURIComponent(environmentId))
                .expect(status)
                .end(callback);
        }

        it('should create two apps with an environment each', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            createApp("Populator App A", function(errA, idA) {
                if (errA) {
                    return done(errA);
                }
                APP_A = idA;
                ENV_A = crypto.createHash('sha1').update(APP_A + ENV_NAME).digest('hex');
                createApp("Populator App B", function(errB, idB) {
                    if (errB) {
                        return done(errB);
                    }
                    APP_B = idB;
                    ENV_B = crypto.createHash('sha1').update(APP_B + ENV_NAME).digest('hex');
                    saveEnvironment(APP_A, function(err1) {
                        if (err1) {
                            return done(err1);
                        }
                        saveEnvironment(APP_B, done);
                    });
                });
            });
        });

        it('should create a member with populator rights on app A only', function(done) {
            var perm = {};
            ["c", "r", "u", "d"].forEach(function(t) {
                perm[t] = {};
                perm[t][APP_A] = {all: false, allowed: {populator: true}};
            });
            perm._ = {a: [], u: [APP_A]};
            var userParams = {
                full_name: 'populatormember',
                username: 'populatormember',
                password: 'p4ssw0rD!',
                email: 'populatormember@mail.test',
                permission: perm
            };
            request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(userParams))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    MEMBER_ID = res.body._id;
                    MEMBER_KEY = res.body.api_key;
                    should.exist(MEMBER_KEY);
                    done();
                });
        });

        it('should return the member\'s own environment users', function(done) {
            getEnvironment(MEMBER_KEY, APP_A, TEMPLATE_ID, ENV_A, 200, function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.iTotalRecords.should.eql(DEVICES.length);
                res.body.aaData.forEach(function(row) {
                    row._id.indexOf(APP_A + "_").should.eql(0);
                });
                done();
            });
        });

        it('should reject an environment_id that is not an environment id', function(done) {
            getEnvironment(MEMBER_KEY, APP_A, TEMPLATE_ID, ENV_A + "|.", 400, function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.result.should.eql("Invalid parameter environment_id");
                done();
            });
        });

        it('should reject a template_id that is not a template id', function(done) {
            getEnvironment(MEMBER_KEY, APP_A, "x|.", ENV_A, 400, function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.result.should.eql("Invalid parameter template_id");
                done();
            });
        });

        it('should reject removing with an environment_id that is not an environment id', function(done) {
            request.get('/o/populator/environment/remove?api_key=' + MEMBER_KEY + '&app_id=' + APP_A + '&template_id=' + TEMPLATE_ID + '&environment_id=' + encodeURIComponent("x|."))
                .expect(400)
                .end(done);
        });

        it('should keep app B\'s environment users', function(done) {
            getEnvironment(API_KEY_ADMIN, APP_B, TEMPLATE_ID, ENV_B, 200, function(err, res) {
                if (err) {
                    return done(err);
                }
                res.body.iTotalRecords.should.eql(DEVICES.length);
                done();
            });
        });

        it('should remove the member\'s own environment', function(done) {
            request.get('/o/populator/environment/remove?api_key=' + MEMBER_KEY + '&app_id=' + APP_A + '&template_id=' + TEMPLATE_ID + '&environment_id=' + ENV_A)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    res.body.result.should.eql(true);
                    getEnvironment(API_KEY_ADMIN, APP_A, TEMPLATE_ID, ENV_A, 200, function(err2, res2) {
                        if (err2) {
                            return done(err2);
                        }
                        res2.body.iTotalRecords.should.eql(0);
                        getEnvironment(API_KEY_ADMIN, APP_B, TEMPLATE_ID, ENV_B, 200, function(err3, res3) {
                            if (err3) {
                                return done(err3);
                            }
                            res3.body.iTotalRecords.should.eql(DEVICES.length);
                            done();
                        });
                    });
                });
        });

        it('should clean up the member and apps', function(done) {
            request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({user_ids: [MEMBER_ID]}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: APP_A}))
                        .expect(200)
                        .end(function(errA) {
                            if (errA) {
                                return done(errA);
                            }
                            request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: APP_B}))
                                .expect(200)
                                .end(done);
                        });
                });
        });
    });
});
