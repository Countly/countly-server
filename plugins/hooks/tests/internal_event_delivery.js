var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

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
