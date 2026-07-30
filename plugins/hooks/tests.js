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


var InternalEventTrigger = require('./api/parts/triggers/internal_event.js');
var hookUtils = require('./api/utils.js');

// Regression tests for app scoping of hooks internal events.
//
// InternalEventTrigger.process() matches a dispatched event against every
// enabled hook subscribed to that event type. Each case must either be listed in
// GLOBAL_EVENT_TYPES (delivered only to global-admin-owned hooks) or check the
// event's app id against the hook's own apps list. Several cases previously did
// neither, so a hook scoped to one app received other apps' data:
//
//   /i/apps/create              the new app document, including its SDK key,
//                               id_key, accepted keys[] and checksum salt
//   /i/remote-config/*          another app's parameter keys, default values and
//                               serialized condition queries
//   /cohort/enter|exit          matched on an unvalidated cohortID from the
//                               hook's own config, then read
//                               app_users<cohort.app_id>
//   /hooks/trigger              matched on an unvalidated hookID, forwarding the
//                               source hook's entire document (every effect
//                               configuration, including HTTP headers and custom
//                               code) plus the data that fired it
//   /alerts/trigger             fired every hook on the instance on any app's
//                               alert
//
// These exercise process() directly rather than over HTTP, because delivery is
// driven by plugins.dispatch from other plugins and "the hook did not fire" is
// not observable through the API.

describe('Testing Hooks internal event app scoping', function() {
    var trigger;
    var delivered;
    var originalUpdateRuleTriggerTime;

    // A well-formed object id that is not a real member, so the global-event
    // owner lookup resolves to nothing and fails closed. Deliberately not
    // stubbing common.db: that is shared state for the whole test process, and
    // replacing it even briefly can break unrelated suites with in-flight work.
    var UNKNOWN_OWNER_ID = '0123456789abcdef01234567';

    before(function() {
        // updateRuleTriggerTime writes through a db batcher that is not available
        // in the test process; the scoping decision is what is under test
        originalUpdateRuleTriggerTime = hookUtils.updateRuleTriggerTime;
        hookUtils.updateRuleTriggerTime = function() {};
    });

    after(function() {
        hookUtils.updateRuleTriggerTime = originalUpdateRuleTriggerTime;
    });

    beforeEach(function() {
        delivered = [];
        trigger = new InternalEventTrigger({
            pipeline: function(data) {
                delivered.push(data);
            }
        });
    });

    /**
     * Build a single hook rule scoped to the given apps
     * @param {string} eventType - internal event type to subscribe to
     * @param {Array} apps - app ids the hook is scoped to
     * @param {object} extraConfig - extra trigger configuration fields
     * @returns {object} hook rule
     */
    function ruleFor(eventType, apps, extraConfig) {
        return {
            _id: 'hook-under-test',
            createdBy: UNKNOWN_OWNER_ID,
            apps: apps,
            trigger: {
                type: 'InternalEventTrigger',
                configuration: Object.assign({eventType: eventType}, extraConfig || {})
            }
        };
    }

    describe('/i/apps/create', function() {
        it('should be a global event type', function() {
            InternalEventTrigger.GLOBAL_EVENT_TYPES.should.have.property('/i/apps/create', true);
        });

        it('should not deliver to a hook whose owner is not a global admin', async function() {
            trigger._rules = [ruleFor('/i/apps/create', ['appA'])];
            await trigger.process({
                appId: 'appB',
                data: {_id: 'appB', name: 'Victim App', key: 'victim-sdk-key', id_key: 'victim-sdk-key'}
            }, '/i/apps/create');
            delivered.length.should.eql(0);
        });

    });

    describe('/i/remote-config/*', function() {
        it('should not deliver a parameter change from another app', async function() {
            trigger._rules = [ruleFor('/i/remote-config/add-parameter', ['appA'])];
            await trigger.process({
                params: {appId: 'appB', parameter_key: 'paywall_variant', default_value: 'premium'}
            }, '/i/remote-config/add-parameter');
            delivered.length.should.eql(0);
        });

        it('should deliver a parameter change from an app the hook is scoped to', async function() {
            trigger._rules = [ruleFor('/i/remote-config/add-parameter', ['appA'])];
            await trigger.process({
                params: {appId: 'appA', parameter_key: 'paywall_variant', default_value: 'premium'}
            }, '/i/remote-config/add-parameter');
            delivered.length.should.eql(1);
        });

        it('should not deliver when the dispatch carries no app id', async function() {
            trigger._rules = [ruleFor('/i/remote-config/update-condition', ['appA'])];
            await trigger.process({
                params: {condition_name: 'segment', condition: '{}'}
            }, '/i/remote-config/update-condition');
            delivered.length.should.eql(0);
        });
    });

    describe('/cohort/enter', function() {
        it('should not deliver a cohort from an app the hook is not scoped to', async function() {
            trigger._rules = [ruleFor('/cohort/enter', ['appA'], {cohortID: 'cohort-1'})];
            await trigger.process({
                cohort: {_id: 'cohort-1', app_id: 'appB', name: 'Victim cohort'},
                uids: ['1']
            }, '/cohort/enter');
            delivered.length.should.eql(0);
        });
    });

    describe('/hooks/trigger', function() {
        it('should not deliver another app hook payload even when hookID matches', async function() {
            trigger._rules = [ruleFor('/hooks/trigger', ['appA'], {hookID: 'victim-hook'})];
            await trigger.process({
                rule: {
                    _id: 'victim-hook',
                    apps: ['appB'],
                    effects: [{type: 'HTTPEffect', configuration: {url: 'https://victim.example', headers: {Authorization: 'Bearer secret'}}}]
                },
                params: {some: 'data'},
                eventType: '/hooks/trigger'
            }, '/hooks/trigger');
            delivered.length.should.eql(0);
        });

        it('should deliver when the source hook is within the same apps', async function() {
            trigger._rules = [ruleFor('/hooks/trigger', ['appA'], {hookID: 'sibling-hook'})];
            await trigger.process({
                rule: {_id: 'sibling-hook', apps: ['appA'], effects: []},
                params: {some: 'data'},
                eventType: '/hooks/trigger'
            }, '/hooks/trigger');
            delivered.length.should.eql(1);
        });
    });

    describe('/alerts/trigger', function() {
        it('should not fire for an alert belonging to another app', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appB', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(0);
        });

        it('should fire for an alert belonging to a scoped app', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appA', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(1);
        });

        it('should not forward the scoping fields to the effect payload', async function() {
            trigger._rules = [ruleFor('/alerts/trigger', ['appA'])];
            await trigger.process({appId: 'appA', alertID: 'alert-1'}, '/alerts/trigger');
            delivered.length.should.eql(1);
            Object.keys(delivered[0].params).length.should.eql(0);
        });
    });

    describe('already scoped events', function() {
        it('should still deliver /crashes/new for a scoped app', async function() {
            trigger._rules = [ruleFor('/crashes/new', ['appA'])];
            await trigger.process({data: {app: {_id: 'appA'}, crash: {}}}, '/crashes/new');
            delivered.length.should.eql(1);
        });

        it('should not deliver /crashes/new for another app', async function() {
            trigger._rules = [ruleFor('/crashes/new', ['appA'])];
            await trigger.process({data: {app: {_id: 'appB'}, crash: {}}}, '/crashes/new');
            delivered.length.should.eql(0);
        });
    });
});

// End-to-end delivery test for internal event app scoping.
//
// internal_event_scope.js covers the scoping decision in process() for every
// event family, quickly and precisely. What it cannot cover is the wiring around
// that decision: that the event is registered and dispatched at all, that
// fetchRules picks a newly saved hook up, and - most importantly - that the
// dispatch sites actually carry the app id the scoping now depends on. Five of
// the six /i/remote-config/* dispatches previously sent no app identifier, so
// they were changed to include one. If that plumbing were wrong the scoping check
// would silently drop every event and the unit tests would still pass, because
// they feed the dispatch object in directly.
//
// So this drives a real remote-config change through the real HTTP endpoints and
// observes the hook's own triggerCount.
//
// Timing: fetchRules refreshes every refreshRulesPeriod (3s), the pipeline batches
// on pipelineInterval (1s), and triggerCount is written through writeBatcher,
// which flushes on batch_period (10s). Delivery is therefore only observable
// about 11 seconds after the event. The positive case runs first and polls, which
// establishes that delivery works and how long it takes; the negative case then
// waits at least as long before asserting nothing arrived, so it cannot pass just
// by being read too early.

var HOOK_PICKUP_MS = 5000; // > refreshRulesPeriod
var DELIVERY_TIMEOUT_MS = 25000; // > pipelineInterval + batch_period, with room

describe('Testing Hooks internal event delivery scoping', function() {
    var API_KEY_ADMIN = "";
    var OWN_APP_ID = "";
    var OTHER_APP_ID = "";
    var hookId = "";
    var uniq = Date.now();

    /**
     * Read this hook's triggerCount
     * @returns {Promise<number>} current triggerCount, 0 when unset
     */
    function readTriggerCount() {
        return new Promise(function(resolve, reject) {
            request.get('/o/hook/list?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID + '&id=' + hookId)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return reject(err);
                    }
                    var list = (res.body && res.body.hooksList) || [];
                    var hook = list.filter(function(h) {
                        return h._id + '' === hookId + '';
                    })[0];
                    resolve((hook && hook.triggerCount) || 0);
                });
        });
    }

    /**
     * Poll until triggerCount reaches at least want, or time out
     * @param {number} want - triggerCount to wait for
     * @param {number} timeoutMs - how long to keep polling
     * @returns {Promise<number>} the last observed triggerCount
     */
    async function waitForTriggerCount(want, timeoutMs) {
        var deadline = Date.now() + timeoutMs;
        var seen = 0;
        while (Date.now() < deadline) {
            seen = await readTriggerCount();
            if (seen >= want) {
                return seen;
            }
            await new Promise(function(r) {
                setTimeout(r, 1000);
            });
        }
        return seen;
    }

    /**
     * Add a remote config parameter to an app, which dispatches the internal event
     * @param {string} appId - app to add the parameter to
     * @param {string} key - parameter key
     * @returns {Promise<void>} resolves when the request completes
     */
    function addRemoteConfigParameter(appId, key) {
        var parameter = {parameter_key: key, default_value: "v", description: "", conditions: []};
        return new Promise(function(resolve, reject) {
            request.get('/i/remote-config/add-parameter?api_key=' + API_KEY_ADMIN + '&app_id=' + appId
                + '&parameter=' + encodeURIComponent(JSON.stringify(parameter)))
                .end(function(err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
        });
    }

    it('should create a second app to act as the unrelated app', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        OWN_APP_ID = testUtils.get("APP_ID");
        request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: "HooksScopeOther" + uniq}))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                OTHER_APP_ID = res.body._id;
                should.exist(OTHER_APP_ID);
                done();
            });
    });

    it('should create a hook scoped to one app that listens for remote config changes', function(done) {
        var hookConfig = {
            name: "rc-scope-" + uniq,
            description: "delivery scoping check",
            apps: [OWN_APP_ID],
            trigger: {
                type: "InternalEventTrigger",
                configuration: {eventType: "/i/remote-config/add-parameter"}
            },
            effects: [{type: "CustomCodeEffect", configuration: {code: "params.seen = true;"}}],
            enabled: true
        };
        request.post('/i/hook/save?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID)
            .send({hook_config: JSON.stringify(hookConfig)})
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                hookId = res.body && (res.body._id || res.body);
                should.exist(hookId);
                done();
            });
    });

    it('should wait for the hook to be picked up by the rule refresh', function(done) {
        setTimeout(done, HOOK_PICKUP_MS * testUtils.testScalingFactor);
    });

    it('should deliver a remote config change from the app the hook is scoped to', async function() {
        this.timeout(DELIVERY_TIMEOUT_MS * 2 * testUtils.testScalingFactor);
        var before = await readTriggerCount();
        await addRemoteConfigParameter(OWN_APP_ID, "scoped_param_" + uniq);
        var after = await waitForTriggerCount(before + 1, DELIVERY_TIMEOUT_MS * testUtils.testScalingFactor);
        // if this fails the pipeline never ran, which would make the negative
        // case below meaningless rather than passing
        after.should.be.above(before);
    });

    it('should not deliver a remote config change from an unrelated app', async function() {
        this.timeout(DELIVERY_TIMEOUT_MS * 2 * testUtils.testScalingFactor);
        var before = await readTriggerCount();
        await addRemoteConfigParameter(OTHER_APP_ID, "unrelated_param_" + uniq);
        // wait the full window that the positive case needed, then confirm nothing
        // was delivered
        await new Promise(function(r) {
            setTimeout(r, DELIVERY_TIMEOUT_MS * testUtils.testScalingFactor);
        });
        var after = await readTriggerCount();
        after.should.eql(before);
    });

    after(function(done) {
        request.get('/i/hook/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID + '&hookID=' + hookId)
            .end(function() {
                request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: OTHER_APP_ID}))
                    .end(function() {
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
