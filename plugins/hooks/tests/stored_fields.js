var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');
request = request(testUtils.url);

// /i/hook/save stores only name, description, apps, trigger, effects and enabled.
// Any other key the client sends, a dotted path such as "apps.0" included, is
// dropped, and createdBy is always set by the server.

describe('Testing Hooks stored fields', function() {
    var API_KEY_ADMIN = "";
    var OWN_APP_ID = "";
    var OTHER_APP_ID = "";
    var MEMBER_API_KEY = "";
    var MEMBER_ID = "";
    var memberHookId = "";
    var internalHookId = "";
    var globalHookId = "";
    var uniq = Date.now();
    var SOME_OTHER_MEMBER_ID = "0123456789abcdef01234567";

    /**
     * Build a hook config
     * @param {string} name - hook name
     * @param {array} apps - apps of the hook
     * @param {object} trigger - trigger, an API endpoint trigger by default
     * @returns {object} hook config
     */
    function hookFor(name, apps, trigger) {
        return {
            name: name + "-" + uniq,
            description: "stored fields",
            apps: apps,
            trigger: trigger || {type: "APIEndPointTrigger", configuration: {path: "22222222-ea4e-420d-bb7e-b3210e5d8b33", method: "get"}},
            effects: [{type: "CustomCodeEffect", configuration: {code: "params.a = 1;"}}],
            enabled: false
        };
    }

    /**
     * Save a hook
     * @param {string} apiKey - api key to save with
     * @param {object} hookConfig - hook to save
     * @param {number} expected - expected status code
     * @returns {Promise<object>} supertest response
     */
    function saveHook(apiKey, hookConfig, expected) {
        return new Promise(function(resolve, reject) {
            request.post('/i/hook/save?api_key=' + apiKey + '&app_id=' + OWN_APP_ID)
                .send({hook_config: JSON.stringify(hookConfig)})
                .expect(expected)
                .end(function(err, res) {
                    return err ? reject(err) : resolve(res);
                });
        });
    }

    /**
     * Read a hook as stored, through the admin
     * @param {string} id - hook id
     * @returns {Promise<object>} the hook
     */
    function readHook(id) {
        return new Promise(function(resolve, reject) {
            request.get('/o/hook/list?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID + '&id=' + id)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return reject(err);
                    }
                    var list = (res.body && res.body.hooksList) || [];
                    resolve(list.find(function(h) {
                        return String(h._id) === String(id);
                    }));
                });
        });
    }

    /**
     * Create an app as the admin
     * @param {string} name - app name
     * @returns {Promise<string>} app id
     */
    function createApp(name) {
        return new Promise(function(resolve, reject) {
            request.get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({name: name + uniq}))
                .expect(200)
                .end(function(err, res) {
                    return err ? reject(err) : resolve(res.body._id);
                });
        });
    }

    /**
     * Check that a stored hook has no key beyond the writable ones and the server-set ones
     * @param {object} hook - stored hook
     */
    function shouldHaveOnlyStoredKeys(hook) {
        var allowed = ["_id", "name", "description", "apps", "trigger", "effects", "enabled", "createdBy", "created_at",
            //added by the listing, not stored
            "createdByUser"];
        Object.keys(hook).forEach(function(key) {
            allowed.should.containEql(key);
        });
    }

    it('should set up two apps and a member with hooks rights on one of them', async function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        OWN_APP_ID = await createApp("HookFieldsOwn");
        OTHER_APP_ID = await createApp("HookFieldsOther");

        var perm = {};
        ["c", "r", "u", "d"].forEach(function(t) {
            perm[t] = {};
            perm[t][OWN_APP_ID] = {all: false, allowed: {hooks: true}};
        });
        perm._ = {a: [], u: [[OWN_APP_ID]]};
        var userParams = {
            full_name: 'hooksfields' + uniq,
            username: 'hooksfields' + uniq,
            password: 'p4ssw0rD!',
            email: 'hooksfields' + uniq + '@mail.test',
            permission: perm
        };
        var res = await new Promise(function(resolve, reject) {
            request.get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify(userParams))
                .expect(200)
                .end(function(err, r) {
                    return err ? reject(err) : resolve(r);
                });
        });
        MEMBER_API_KEY = res.body.api_key;
        MEMBER_ID = res.body._id;
        should.exist(MEMBER_API_KEY);
        should.exist(MEMBER_ID);
    });

    it('should store only the writable fields of a new hook', async function() {
        var config = hookFor("member-hook", [OWN_APP_ID]);
        config.createdBy = SOME_OTHER_MEMBER_ID;
        config.extraField = "x";
        config["apps.1"] = OTHER_APP_ID;
        var res = await saveHook(MEMBER_API_KEY, config, 200);
        memberHookId = res.body && (res.body._id || res.body);
        should.exist(memberHookId);

        var hook = await readHook(memberHookId);
        should.exist(hook);
        hook.apps.should.eql([OWN_APP_ID]);
        String(hook.createdBy).should.equal(String(MEMBER_ID));
        shouldHaveOnlyStoredKeys(hook);
    });

    it('should not store a dotted apps path or an extra field on update', async function() {
        var update = {_id: memberHookId + "", name: "renamed-" + uniq, extraField: "x", createdBy: SOME_OTHER_MEMBER_ID};
        update["apps.0"] = OTHER_APP_ID;
        await saveHook(MEMBER_API_KEY, update, 200);

        var hook = await readHook(memberHookId);
        should.exist(hook);
        hook.name.should.equal("renamed-" + uniq);
        hook.apps.should.eql([OWN_APP_ID]);
        String(hook.createdBy).should.equal(String(MEMBER_ID));
        shouldHaveOnlyStoredKeys(hook);
    });

    it('should not store a dotted trigger path on update', async function() {
        var res = await saveHook(MEMBER_API_KEY, hookFor("internal-hook", [OWN_APP_ID], {type: "InternalEventTrigger", configuration: {eventType: "/i/app_users/create"}}), 200);
        internalHookId = res.body && (res.body._id || res.body);
        should.exist(internalHookId);

        await saveHook(MEMBER_API_KEY, {_id: internalHookId + "", "trigger.configuration.eventType": "/systemlogs"}, 200);

        var hook = await readHook(internalHookId);
        should.exist(hook);
        hook.trigger.configuration.eventType.should.equal("/i/app_users/create");
        shouldHaveOnlyStoredKeys(hook);
    });

    it('should refuse a member update of a hook on a global event, even one that leaves the trigger out', async function() {
        var res = await saveHook(API_KEY_ADMIN, hookFor("global-hook", [OWN_APP_ID], {type: "InternalEventTrigger", configuration: {eventType: "/systemlogs"}}), 200);
        globalHookId = res.body && (res.body._id || res.body);
        should.exist(globalHookId);

        await saveHook(MEMBER_API_KEY, {_id: globalHookId + "", name: "taken-" + uniq}, 403);

        var hook = await readHook(globalHookId);
        hook.name.should.equal("global-hook-" + uniq);
    });

    it('should still save every field of a full update as the hooks UI sends it', async function() {
        //the UI posts the record it loaded, with the fields the listing added
        var stored = await readHook(memberHookId);
        var record = Object.assign({}, stored, {
            name: "ui-edit-" + uniq,
            description: "edited in the UI",
            trigger: {type: "APIEndPointTrigger", configuration: {path: "33333333-ea4e-420d-bb7e-b3210e5d8b33", method: "post"}},
            effects: [{type: "CustomCodeEffect", configuration: {code: "params.b = 2;"}}],
            enabled: true,
            triggerEffectDom: "<div></div>"
        });
        await saveHook(MEMBER_API_KEY, record, 200);

        var hook = await readHook(memberHookId);
        hook.name.should.equal("ui-edit-" + uniq);
        hook.description.should.equal("edited in the UI");
        hook.apps.should.eql([OWN_APP_ID]);
        hook.trigger.should.eql(record.trigger);
        hook.effects.should.eql(record.effects);
        hook.enabled.should.equal(true);
        String(hook.createdBy).should.equal(String(MEMBER_ID));
        shouldHaveOnlyStoredKeys(hook);
    });

    after(async function() {
        var ids = [memberHookId, internalHookId, globalHookId].filter(Boolean);
        for (var i = 0; i < ids.length; i++) {
            await new Promise(function(resolve) {
                request.post('/i/hook/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + OWN_APP_ID)
                    .send({hookID: ids[i] + ""})
                    .end(function() {
                        resolve();
                    });
            });
        }
        await new Promise(function(resolve) {
            request.get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({user_ids: [MEMBER_ID]}))
                .end(function() {
                    resolve();
                });
        });
        var apps = [OWN_APP_ID, OTHER_APP_ID].filter(Boolean);
        for (var j = 0; j < apps.length; j++) {
            await new Promise(function(resolve) {
                request.get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + JSON.stringify({app_id: apps[j]}))
                    .end(function() {
                        resolve();
                    });
            });
        }
    });
});
