var request = require('supertest');
var should = require('should');
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

});

