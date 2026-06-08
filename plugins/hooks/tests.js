var request = require('supertest');
var should = require('should');
var http = require('http');
var crypto = require('crypto');
var moment = require('moment-timezone');
var testUtils = require("../../test/testUtils");
var pluginManager = require("../../plugins/pluginManager.js");
var Promise = require("bluebird");
request = request(testUtils.url);


const newHookConfig = {"name": "test", "description": "desc", "apps": [], "trigger": {"type": "APIEndPointTrigger", "configuration": {"path": "54754970-ea4e-420d-bb7e-b3210e5d8b33", "method": "get"}}, "effects": [{"type": "EmailEffect", "configuration": {"address": ["a@test.com"], "emailTemplate": "content"}}, {"type": "CustomCodeEffect", "configuration": {"code": "params.a=1"}}, {"type": "HTTPEffect", "configuration": {"url": "https://google.com", "method": "get", "requestData": "a=1"}}], "enabled": true};
const newHookIds = [];
const mockData = {"qstring": {"paramA": "abc", "paramB": 123, "paramC": [1, 2, 3]}, "paths": ["localhost", "o", "hooks", "54754970-ea4e-420d-bb7e-b3210e5d8b33"]};

function getRequestURL(path) {
    const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    const APP_ID = testUtils.get("APP_ID");
    return path + `?api_key=${API_KEY_ADMIN}&app_id=${APP_ID}`;
}

function getHookRecord(hookId, callback) {
    request.get(getRequestURL('/o/hook/list') + '&id=' + hookId)
        .expect(200)
        .end(function(err, res) {
            callback(err, res);
        });
}

describe('Testing Hooks', function() {
    describe('Testing hook CRUD', function() {

        describe('Create Hook', function() {
            it('should create hook with valid params', function(done) {
                const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
                const APP_ID = testUtils.get("APP_ID");
                const hookConfig = Object.assign({}, newHookConfig, {apps: [APP_ID]});

                request.post(getRequestURL('/i/hook/save'))
                    .send({hook_config: JSON.stringify(hookConfig)})
                    .expect(200)
                    .end(function(err, res) {
                        newHookIds.push(res.body);
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });


            it('should fail to create hook with invalid required params', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const badRequests = [
                    Object.assign({}, newHookConfig, {apps: [APP_ID]}, {trigger: undefined}),
                    Object.assign({}, newHookConfig, {apps: [APP_ID]}, {effects: undefined}),
                    Object.assign({}, newHookConfig, {apps: [APP_ID]}, {name: undefined}),
                    Object.assign({}, newHookConfig, {apps: undefined}),
                ];
                Promise.each(badRequests, function(hookConfig) {
                    return new Promise(function(resolve, reject) {
                        request.post(getRequestURL('/i/hook/save'))
                            .send({hook_config: JSON.stringify(hookConfig)})
                            .expect(200)
                            .end(function(err, res) {
                                res.body.should.have.property('result', 'Not enough args');
                                resolve();
                            });
                    });
                }).then(function() {
                    done();
                });
            });
        });

        describe('Update Hook', function() {
            it('should able to update hook with _id', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const hookId = newHookIds[0];
                const hookConfig = Object.assign({}, newHookConfig, {apps: [APP_ID], _id: hookId});
                hookConfig.name = "test2";
                hookConfig.description = "desc2";
                request.post(getRequestURL('/i/hook/save'))
                    .send({hook_config: JSON.stringify(hookConfig)})
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property('name', 'test2');
                        res.body.should.have.property('description', 'desc2');
                        done();
                    });
            });

            it('should able to update hook status with _id', function(done) {
                const hookId = newHookIds[0];
                const options = {};
                options[hookId] = false;
                request.post(getRequestURL('/i/hook/status'))
                    .send({status: JSON.stringify(options)})
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        getHookRecord(hookId, function(err2, res2) {
                            if (err) {
                                return done(err2);
                            }
                            res2.body.should.have.property('hooksList');
                            res2.body.hooksList[0].should.have.property('enabled', false);
                        });
                        done();
                    });
            });
        });

        describe('Read Hook records', function() {
            it('should able to fetch hook Detail', function(done) {
                request.get(getRequestURL('/o/hook/list') + '&id=' + newHookIds[0])
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
            it('should able to fetch all hooks ', function(done) {
                request.get(getRequestURL('/o/hook/list') + '&id=' + newHookIds[0])
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });


        describe('Test Hook', function() {
            it('should can test hook and return data for each steps', function(done) {
                const APP_ID = testUtils.get("APP_ID");
                const hookConfig = Object.assign({}, newHookConfig, {apps: [APP_ID]});
                request.get(getRequestURL('/i/hook/test') + "&hook_config=" + JSON.stringify(hookConfig) + "&mock_data=" + JSON.stringify(mockData))
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        res.body.should.have.property('result').with.lengthOf(4);
                        done();
                    });
            });
        });

        describe('Delete Hook', function() {
            it('should able to delete hook', function(done) {
                request.post(getRequestURL('/i/hook/delete'))
                    .send({hookID: newHookIds[0]})
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });
            });
        });
    });

    describe('CustomCodeEffect HTTP surface', function() {
        // v8-sandbox enables its built-in httpRequest() by default, which would
        // let custom hook code make server-side requests to internal targets,
        // bypassing the SSRF validation that protects the HTTPEffect path. The
        // sandbox is created with httpEnabled:false, so custom code must not be
        // able to reach any HTTP server via httpRequest().
        //
        // We run a real local server and assert the sandbox never reaches it.
        // This is independent of how /i/hook/test reports the (failed) effect:
        // if httpRequest were enabled the server would be hit; with it disabled
        // the call fails and the hit counter stays at 0.
        var probe, probeHits = 0, probePort;

        before('start local probe server', function(done) {
            probe = http.createServer(function(req, res) {
                probeHits++;
                res.end('PROBE');
            });
            probe.listen(0, '127.0.0.1', function() {
                probePort = probe.address().port;
                done();
            });
        });

        after('stop local probe server', function(done) {
            if (probe) {
                probe.close(function() {
                    done();
                });
            }
            else {
                done();
            }
        });

        it('should not let httpRequest() reach a server from custom code', function(done) {
            const APP_ID = testUtils.get("APP_ID");
            // Try (and tolerate failure of) an httpRequest to our local probe.
            var code = "try { httpRequest({url:'http://127.0.0.1:" + probePort + "/poke'}); }"
                + " catch (e) { /* httpRequest disabled -> call fails, expected */ }";
            var hookConfig = {
                name: "custom-code-no-http",
                description: "verify httpRequest cannot reach a server from the sandbox",
                apps: [APP_ID],
                trigger: {type: "APIEndPointTrigger", configuration: {path: "cc-nohttp-" + crypto.randomBytes(6).toString("hex"), method: "get"}},
                effects: [{type: "CustomCodeEffect", configuration: {code: code}}],
                enabled: true,
            };
            // Status is irrelevant (a disabled httpRequest makes the effect
            // error, which the endpoint may report as non-200). The security
            // assertion is purely that our probe server was never contacted.
            request.get(getRequestURL('/i/hook/test') + "&hook_config=" + JSON.stringify(hookConfig) + "&mock_data=" + JSON.stringify({}))
                .end(function() {
                    probeHits.should.equal(0);
                    done();
                });
        });
    });

});

