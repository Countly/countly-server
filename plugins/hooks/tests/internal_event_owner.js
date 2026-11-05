var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

// An app-scoped internal event reaches a hook only while the hook's owner may
// still read hooks on the event's app. A hook saved by an app admin fires; once
// that member's role on the app is removed, the same event no longer fires it
// and the hook's error log says why (once, not per event), while a global
// admin's hook on the same event keeps firing.
//
// Timing as in internal_event_delivery.js: rules refresh every 3s and
// triggerCount is written through writeBatcher (10s), so delivery is observable
// about 11 seconds after the event.

var HOOK_PICKUP_MS = 5000;
var DELIVERY_TIMEOUT_MS = 25000;

describe('Testing Hooks internal event owner access', function() {
    var API_KEY_ADMIN = "";
    var APP_ID = "";
    var uniq = Date.now();
    var member = {id: "", key: ""};
    var hooks = {member: "", admin: ""};

    /**
     * Read a hook's triggerCount
     * @param {string} hookId - hook id
     * @returns {Promise<number>} current triggerCount, 0 when unset
     */
    async function readTriggerCount(hookId) {
        return ((await readHook(hookId)) || {}).triggerCount || 0;
    }

    /**
     * Read a hook as the hooks list returns it
     * @param {string} hookId - hook id
     * @returns {Promise<object>} the hook, undefined when not listed
     */
    async function readHook(hookId) {
        var res = await request.get('/o/hook/list').query({api_key: API_KEY_ADMIN, app_id: APP_ID, id: hookId}).expect(200);
        return ((res.body && res.body.hooksList) || []).filter(function(h) {
            return h._id + '' === hookId + '';
        })[0];
    }

    /**
     * Poll until a hook's triggerCount reaches at least want, or time out
     * @param {string} hookId - hook id
     * @param {number} want - triggerCount to wait for
     * @returns {Promise<number>} the last observed triggerCount
     */
    async function waitForTriggerCount(hookId, want) {
        var deadline = Date.now() + DELIVERY_TIMEOUT_MS * testUtils.testScalingFactor;
        var seen = 0;
        while (Date.now() < deadline) {
            seen = await readTriggerCount(hookId);
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
     * Save a hook on the app listening for app user creation
     * @param {string} apiKey - api key of the member saving it
     * @param {string} name - hook name
     * @returns {Promise<string>} hook id
     */
    async function saveHook(apiKey, name) {
        var hookConfig = {
            name: name + "-" + uniq,
            description: "owner access check",
            apps: [APP_ID],
            trigger: {type: "InternalEventTrigger", configuration: {eventType: "/i/app_users/create"}},
            effects: [{type: "CustomCodeEffect", configuration: {code: "params.seen = true;"}}],
            enabled: true
        };
        var res = await request.post('/i/hook/save?api_key=' + apiKey + '&app_id=' + APP_ID)
            .send({hook_config: JSON.stringify(hookConfig)})
            .expect(200);
        var id = res.body && (res.body._id || res.body);
        should.exist(id);
        return id + "";
    }

    /**
     * Create an app user, which dispatches /i/app_users/create
     * @param {string} did - device id
     * @returns {Promise} resolves when created
     */
    function createAppUser(did) {
        return request.get('/i/app_users/create')
            .query({api_key: API_KEY_ADMIN, app_id: APP_ID, data: JSON.stringify({did: did})})
            .expect(200);
    }

    before(async function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
        var args = {
            full_name: "Hook owner",
            username: "hook_owner_" + uniq,
            password: testUtils.password,
            email: "hook_owner_" + uniq + "@test.test",
            permission: {
                _: {a: [APP_ID], u: [[APP_ID]]},
                c: {[APP_ID]: {all: true, allowed: {}}},
                r: {[APP_ID]: {all: true, allowed: {}}},
                u: {[APP_ID]: {all: true, allowed: {}}},
                d: {[APP_ID]: {all: true, allowed: {}}}
            }
        };
        var res = await request.get('/i/users/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)}).expect(200);
        member = {id: res.body._id, key: res.body.api_key};
        should.exist(member.key);
    });

    it('should save one hook as the app admin and one as a global admin', async function() {
        hooks.member = await saveHook(member.key, "owner-member");
        hooks.admin = await saveHook(API_KEY_ADMIN, "owner-admin");
        await new Promise(function(r) {
            setTimeout(r, HOOK_PICKUP_MS * testUtils.testScalingFactor);
        });
    });

    it('should fire both hooks while the owner has access', async function() {
        this.timeout(DELIVERY_TIMEOUT_MS * 3 * testUtils.testScalingFactor);
        await createAppUser("hook_owner_first_" + uniq);
        (await waitForTriggerCount(hooks.member, 1)).should.be.above(0);
        (await waitForTriggerCount(hooks.admin, 1)).should.be.above(0);
    });

    it('should stop firing the hook once its owner loses the app, and record why', async function() {
        this.timeout(DELIVERY_TIMEOUT_MS * 3 * testUtils.testScalingFactor);
        var memberBefore = await readTriggerCount(hooks.member);
        var adminBefore = await readTriggerCount(hooks.admin);
        var args = {user_id: member.id, permission: {_: {a: [], u: []}, c: {}, r: {}, u: {}, d: {}}};
        await request.get('/i/users/update').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)}).expect(200);

        await createAppUser("hook_owner_second_" + uniq);
        await createAppUser("hook_owner_third_" + uniq);
        // the global admin's hook proves both events were delivered and flushed
        (await waitForTriggerCount(hooks.admin, adminBefore + 2)).should.be.above(adminBefore + 1);
        await new Promise(function(r) {
            setTimeout(r, 2000);
        });
        var hook = await readHook(hooks.member);
        (hook.triggerCount || 0).should.eql(memberBefore);
        hook.enabled.should.equal(true);
        // recorded on the hook itself, once for both skipped events
        var expected = "Not run: the hook's creator no longer has access to app " + APP_ID;
        var recorded = (hook.error_logs || []).filter(function(entry) {
            return typeof entry.e === "string" && entry.e.indexOf(expected) === 0;
        });
        recorded.length.should.eql(1, JSON.stringify(hook.error_logs || []));
    });

    after(async function() {
        for (var key of ["member", "admin"]) {
            if (hooks[key]) {
                await request.get('/i/hook/delete').query({api_key: API_KEY_ADMIN, app_id: APP_ID, hookID: hooks[key]});
            }
        }
        if (member.id) {
            await request.get('/i/users/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({user_ids: [member.id]})});
        }
        await request.get('/i/app_users/delete').query({
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            query: JSON.stringify({did: {$in: ["hook_owner_first_" + uniq, "hook_owner_second_" + uniq, "hook_owner_third_" + uniq]}}),
            force: true
        });
    });
});
