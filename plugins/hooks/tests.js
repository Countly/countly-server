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


// Regression tests for validation of an InternalEventTrigger's configuration.
//
// The event type was never checked, so any string was accepted and stored. The
// events that name a target object - cohortID, hookID, alertID - matched on that
// id alone at delivery time, with nothing tying the target to the hook's own apps,
// so a hook scoped to one app could name another app's object.
//
// Delivery is scoped now, so these rejections are a second line of defence. Their
// practical value is that a hook which would silently never fire is refused at
// save time with a reason, instead of being stored and quietly doing nothing.
//
// Deliberately not exempt for global admins: the delivery-side check is not
// exempt either, so exempting save would let a global admin store a hook that can
// never fire, which is the failure mode this is meant to remove.

describe('Testing Hooks trigger configuration validation', function() {
    var API_KEY_ADMIN = "";
    var OWN_APP_ID = "";
    var OTHER_APP_ID = "";
    var foreignHookId = "";
    var siblingHookId = "";
    var createdHookIds = [];
    var uniq = Date.now();

    /**
     * Build a hook config
     * @param {string} name - hook name
     * @param {array} apps - apps the hook is scoped to
     * @param {object} triggerConfiguration - trigger configuration to use
     * @returns {object} hook config
     */
    function hookFor(name, apps, triggerConfiguration) {
        return {
            name: name + "-" + uniq,
            description: "trigger config validation",
            apps: apps,
            trigger: {type: "InternalEventTrigger", configuration: triggerConfiguration},
            effects: [{type: "CustomCodeEffect", configuration: {code: "params.a = 1;"}}],
            enabled: true
        };
    }

    /**
     * Save a hook
     * @param {object} hookConfig - hook to save
     * @param {number} expected - expected status code
     * @returns {Promise<object>} supertest response
     */
    function saveHook(hookConfig, expected) {
        return new Promise(function(resolve, reject) {
            request.post('/i/hook/save?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID)
                .send({hook_config: JSON.stringify(hookConfig)})
                .expect(expected)
                .end(function(err, res) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(res);
                });
        });
    }

    it('should set up a second app and a hook belonging only to it', async function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        OWN_APP_ID = testUtils.get("APP_ID");

        var appRes = await new Promise(function(resolve, reject) {
            request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "HookCfgOther" + uniq}))
                .expect(200)
                .end(function(err, res) {
                    return err ? reject(err) : resolve(res);
                });
        });
        OTHER_APP_ID = appRes.body._id;
        should.exist(OTHER_APP_ID);

        var foreign = await saveHook(hookFor("foreign-source", [OTHER_APP_ID], {eventType: "/crashes/new"}), 200);
        foreignHookId = foreign.body && (foreign.body._id || foreign.body);
        should.exist(foreignHookId);
        createdHookIds.push(foreignHookId);

        var sibling = await saveHook(hookFor("sibling-source", [OWN_APP_ID], {eventType: "/crashes/new"}), 200);
        siblingHookId = sibling.body && (sibling.body._id || sibling.body);
        should.exist(siblingHookId);
        createdHookIds.push(siblingHookId);
    });

    it('should reject an event type that is not a real internal event', async function() {
        await saveHook(hookFor("bogus-event", [OWN_APP_ID], {eventType: "/i/not/an/event"}), 400);
    });

    it('should reject a hook chained to a hook belonging to another app', async function() {
        await saveHook(hookFor("cross-app-chain", [OWN_APP_ID], {
            eventType: "/hooks/trigger",
            hookID: foreignHookId + ""
        }), 400);
    });

    it('should reject a hook chain with no source hook named', async function() {
        await saveHook(hookFor("chain-no-target", [OWN_APP_ID], {eventType: "/hooks/trigger"}), 400);
    });

    it('should allow a hook chained to a hook in the same app', async function() {
        var res = await saveHook(hookFor("same-app-chain", [OWN_APP_ID], {
            eventType: "/hooks/trigger",
            hookID: siblingHookId + ""
        }), 200);
        var id = res.body && (res.body._id || res.body);
        should.exist(id);
        createdHookIds.push(id);
    });

    it('should allow an event type that carries no target id', async function() {
        var res = await saveHook(hookFor("plain-event", [OWN_APP_ID], {eventType: "/i/app_users/create"}), 200);
        var id = res.body && (res.body._id || res.body);
        should.exist(id);
        createdHookIds.push(id);
    });

    it('should reject retargeting an existing hook chain to another app hook', async function() {
        var res = await saveHook(hookFor("retarget-me", [OWN_APP_ID], {
            eventType: "/hooks/trigger",
            hookID: siblingHookId + ""
        }), 200);
        var id = res.body && (res.body._id || res.body);
        createdHookIds.push(id);

        // update only the trigger, leaving apps to come from the stored hook
        await new Promise(function(resolve, reject) {
            request.post('/i/hook/save?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID)
                .send({
                    hook_config: JSON.stringify({
                        _id: id + "",
                        trigger: {type: "InternalEventTrigger", configuration: {eventType: "/hooks/trigger", hookID: foreignHookId + ""}}
                    })
                })
                .expect(400)
                .end(function(err) {
                    return err ? reject(err) : resolve();
                });
        });
    });

    after(function(done) {
        var pending = createdHookIds.length;
        /**
         * Remove the second app once hooks are gone
         * @returns {void}
         */
        function removeApp() {
            request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: OTHER_APP_ID}))
                .end(function() {
                    done();
                });
        }
        if (!pending) {
            return removeApp();
        }
        createdHookIds.forEach(function(id) {
            request.get('/i/hook/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID + '&hookID=' + id)
                .end(function() {
                    pending--;
                    if (!pending) {
                        removeApp();
                    }
                });
        });
    });
});
