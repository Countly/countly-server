var request = require('supertest');
var should = require('should');
var testUtils = require('../../test/testUtils');

request = request(testUtils.url);

// /i/apps/update/plugins with a consolidate config changes plugins.consolidate on the
// source apps in selectedApps (added) and initialApps (removed). A member who is not a
// global admin may only name apps they have access to, in either list, and the answer
// carries only the fields the setting changes.

describe('Consolidate app settings', function() {
    var API_KEY_ADMIN = '';
    var APPS = {};
    var MEMBER = null;

    /**
     * Create an app
     * @param {string} name - app name
     * @returns {Promise<string>} app id
     */
    async function createApp(name) {
        var res = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify({name: name + '_' + Date.now()})});
        res.status.should.equal(200, res.text);
        return res.body._id;
    }

    /**
     * Save the consolidate setting of the target app
     * @param {string} apiKey - caller's api key
     * @param {array} selectedApps - source apps after the change
     * @param {array} initialApps - source apps before the change
     * @returns {object} supertest request
     */
    function save(apiKey, selectedApps, initialApps) {
        return request.get('/i/apps/update/plugins').query({
            api_key: apiKey,
            app_id: APPS.target,
            args: JSON.stringify({consolidate: {selectedApps: selectedApps, initialApps: initialApps}})
        });
    }

    /**
     * plugins.consolidate of an app
     * @param {string} appId - app id
     * @returns {Promise<array>} source app config
     */
    async function consolidateOf(appId) {
        var app = await testUtils.db.collection('apps').findOne({_id: testUtils.db.ObjectID(appId)}, {projection: {plugins: 1}});
        return (app && app.plugins && app.plugins.consolidate) || [];
    }

    before(async function() {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APPS.target = await createApp('consolidate_target');
        APPS.own = await createApp('consolidate_own');
        APPS.foreign = await createApp('consolidate_foreign');

        var stamp = Date.now();
        var res = await request.get('/i/users/create').query({
            api_key: API_KEY_ADMIN,
            args: JSON.stringify({
                full_name: 'consolidate_member',
                username: 'consolidate_member_' + stamp,
                password: testUtils.password,
                email: 'consolidate_member_' + stamp + '@test.test',
                permission: {_: {a: [APPS.target, APPS.own], u: []}}
            })
        });
        res.status.should.equal(200, res.text);
        MEMBER = {id: res.body._id, key: res.body.api_key};

        // the foreign app already sends its data to the target, set up by a global admin
        await testUtils.db.collection('apps').updateOne({_id: testUtils.db.ObjectID(APPS.foreign)}, {$set: {'plugins.consolidate': [APPS.target]}});
    });

    after(async function() {
        if (MEMBER && MEMBER.id) {
            await request.get('/i/users/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({user_ids: [MEMBER.id]})});
        }
        for (var key in APPS) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: APPS[key]})});
        }
    });

    it('refuses a member who names an app they cannot access in initialApps', async function() {
        var res = await save(MEMBER.key, [APPS.own], [APPS.own, APPS.foreign]);
        res.status.should.equal(400, res.text);
        res.text.should.match(/No access to source app/);
        (await consolidateOf(APPS.foreign)).should.eql([APPS.target]);
        (await consolidateOf(APPS.own)).should.eql([]);
    });

    it('refuses a member who names an app they cannot access in selectedApps', async function() {
        var res = await save(MEMBER.key, [APPS.own, APPS.foreign], []);
        res.status.should.equal(400, res.text);
        res.text.should.match(/No access to source app/);
        (await consolidateOf(APPS.own)).should.eql([]);
    });

    it('refuses lists that are not arrays', async function() {
        var res = await save(MEMBER.key, APPS.own, []);
        res.status.should.equal(400, res.text);
        (await consolidateOf(APPS.own)).should.eql([]);
    });

    it('applies a member\'s change to their own apps and answers with only the changed fields', async function() {
        var res = await save(MEMBER.key, [APPS.own], []);
        res.status.should.equal(200, res.text);
        (await consolidateOf(APPS.own)).should.eql([APPS.target]);
        (await consolidateOf(APPS.foreign)).should.eql([APPS.target]);

        var apps = res.body.plugins.consolidate;
        apps.should.be.an.Array();
        apps.length.should.be.above(0);
        apps.forEach(function(app) {
            Object.keys(app).sort().should.eql(['_id', 'name', 'plugins']);
            Object.keys(app.plugins).should.eql(['consolidate']);
        });
    });

    it('lets the member remove their own app again', async function() {
        var res = await save(MEMBER.key, [], [APPS.own]);
        res.status.should.equal(200, res.text);
        (await consolidateOf(APPS.own)).should.eql([]);
        (await consolidateOf(APPS.foreign)).should.eql([APPS.target]);
    });

    it('lets a global admin change any app', async function() {
        var res = await save(API_KEY_ADMIN, [APPS.own], [APPS.foreign]);
        res.status.should.equal(200, res.text);
        (await consolidateOf(APPS.own)).should.eql([APPS.target]);
        (await consolidateOf(APPS.foreign)).should.eql([]);
        should.exist(res.body.plugins.consolidate);
    });
});
