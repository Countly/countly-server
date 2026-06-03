var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

// Regression tests for cross-app authorization on hook write endpoints.
// A user holding the `hooks` permission on app A must not be able to edit,
// toggle, or delete a hook that belongs to app B.

var baseHookConfig = {
    "name": "authz-test",
    "description": "desc",
    "apps": [],
    "trigger": {"type": "APIEndPointTrigger", "configuration": {"path": "11111111-ea4e-420d-bb7e-b3210e5d8b33", "method": "get"}},
    "effects": [{"type": "CustomCodeEffect", "configuration": {"code": "params.a=1"}}],
    "enabled": true
};

describe('Testing Hooks cross-app authorization', function() {
    var VICTIM_APP_ID = "";
    var ATTACKER_APP_ID = "";
    var ATTACKER_API_KEY = "";
    var victimHookId = "";

    it('should create a victim app with a hook (as admin)', function(done) {
        var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Hooks Victim App"}))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                VICTIM_APP_ID = res.body._id;
                var hookConfig = Object.assign({}, baseHookConfig, {apps: [VICTIM_APP_ID]});
                request.post('/i/hook/save?api_key=' + API_KEY_ADMIN + '&app_id=' + VICTIM_APP_ID)
                    .send({hook_config: JSON.stringify(hookConfig)})
                    .expect(200)
                    .end(function(err2, res2) {
                        if (err2) {
                            return done(err2);
                        }
                        victimHookId = res2.body && (res2.body._id || res2.body);
                        should.exist(victimHookId);
                        done();
                    });
            });
    });

    it('should create an attacker app and a user with hooks rights on it only', function(done) {
        var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "Hooks Attacker App"}))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                ATTACKER_APP_ID = res.body._id;
                var perm = {};
                ["c", "r", "u", "d"].forEach(function(t) {
                    perm[t] = {};
                    perm[t][ATTACKER_APP_ID] = {all: false, allowed: {hooks: true}};
                });
                perm._ = {a: [], u: [ATTACKER_APP_ID]};
                var userParams = {
                    full_name: 'hooksattacker',
                    username: 'hooksattacker',
                    password: 'p4ssw0rD!',
                    email: 'hooksattacker@mail.test',
                    permission: perm
                };
                request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(userParams))
                    .expect(200)
                    .end(function(err2, res2) {
                        if (err2) {
                            return done(err2);
                        }
                        ATTACKER_API_KEY = res2.body && res2.body.api_key;
                        should.exist(ATTACKER_API_KEY);
                        done();
                    });
            });
    });

    it('should reject deleting another app\'s hook', function(done) {
        request.post('/i/hook/delete?api_key=' + ATTACKER_API_KEY + '&app_id=' + ATTACKER_APP_ID)
            .send({hookID: victimHookId})
            .expect(403)
            .end(function(err) {
                return done(err);
            });
    });

    it('should reject toggling another app\'s hook status', function(done) {
        var status = {};
        status[victimHookId] = false;
        request.post('/i/hook/status?api_key=' + ATTACKER_API_KEY + '&app_id=' + ATTACKER_APP_ID)
            .send({status: JSON.stringify(status)})
            .expect(403)
            .end(function(err) {
                return done(err);
            });
    });

    it('should reject editing another app\'s hook', function(done) {
        var edit = Object.assign({}, baseHookConfig, {apps: [ATTACKER_APP_ID], _id: victimHookId, name: "hijacked"});
        request.post('/i/hook/save?api_key=' + ATTACKER_API_KEY + '&app_id=' + ATTACKER_APP_ID)
            .send({hook_config: JSON.stringify(edit)})
            .expect(403)
            .end(function(err) {
                return done(err);
            });
    });

    it('should reject creating a hook targeting another app', function(done) {
        var hookConfig = Object.assign({}, baseHookConfig, {apps: [VICTIM_APP_ID]});
        request.post('/i/hook/save?api_key=' + ATTACKER_API_KEY + '&app_id=' + ATTACKER_APP_ID)
            .send({hook_config: JSON.stringify(hookConfig)})
            .expect(403)
            .end(function(err) {
                return done(err);
            });
    });

    it('should confirm the victim hook still exists and is unchanged', function(done) {
        var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request.get('/o/hook/list?api_key=' + API_KEY_ADMIN + '&app_id=' + VICTIM_APP_ID + '&id=' + victimHookId)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var list = res.body && res.body.hooksList ? res.body.hooksList : res.body;
                var hook = Array.isArray(list) ? list.find(function(h) {
                    return String(h._id) === String(victimHookId);
                }) : null;
                should.exist(hook);
                hook.name.should.eql(baseHookConfig.name);
                done();
            });
    });

    it('should clean up created apps', function(done) {
        var API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: VICTIM_APP_ID}))
            .expect(200)
            .end(function() {
                request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: ATTACKER_APP_ID}))
                    .expect(200)
                    .end(function() {
                        done();
                    });
            });
    });
});
