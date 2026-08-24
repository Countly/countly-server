var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

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
