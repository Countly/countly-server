let request = require('supertest');
const should = require('should');
const testUtils = require("../../../../test/testUtils");

request = request(testUtils.url);

describe('Testing Consolidation Plugin', async() => {
    it('create 2 new apps consolidate them, then delete the apps ', async() => {
        const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");

        //create apps
        const APP_ID_1_CreateResponse = await request
            .post('/i/apps/create?args={"timezone":"Asia/Calcutta","key":"TestAppKey1","name":"APP 1","type":"web","country":"IN"}')
            .send(`api_key=${API_KEY_ADMIN}`);
        APP_ID_1_CreateResponse.status.should.equal(200);
        const APP_ID_1 = APP_ID_1_CreateResponse.body.app_id;

        const APP_ID_2_CreateResponse = await request
            .post('/i/apps/create?args={"timezone":"Asia/Calcutta","key":"TestAppKey2","name":"APP 2","type":"web","country":"IN"}')
            .send(`api_key=${API_KEY_ADMIN}`);
        APP_ID_2_CreateResponse.status.should.equal(200);
        const APP_ID_2 = APP_ID_2_CreateResponse.body.app_id;

        //consolidate apps
        const consolidateParam = {
            consolidate: {
                selectedApps: [ APP_ID_2],
                initialApps: []
            }
        };
        const consolidateRequest = await request
            .post('/i/apps/update/plugins?args=' + JSON.stringify(consolidateParam))
            .send(`api_key=${API_KEY_ADMIN}&app_id=${APP_ID_1}`);
        consolidateRequest.status.should.equal(200);

        //verify the app is consolidated
        const consolidateResponse = consolidateRequest.body.plugins.consolidate[0];
        should(consolidateResponse._id).equal(APP_ID_2);
        should(consolidateResponse.plugins.consolidate[0]).equal(APP_ID_1);

        //delete apps
        const APP_ID_1_DeleteResponse = await request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID_1}));
        APP_ID_1_DeleteResponse.status.should.equal(200);

        const APP_ID_2_DeleteResponse = await request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID_2}));
        APP_ID_2_DeleteResponse.status.should.equal(200);
    });
});
describe('Consolidation source apps and response', () => {
    const STAMP = Date.now();
    const APPS = {};
    let API_KEY_ADMIN = '';
    let MEMBER = null;

    /**
     * Create an app through the API
     * @param {string} name - app name, also used for the app key
     * @returns {Promise<string>} the app id
     */
    async function createApp(name) {
        const args = {name: name + '_' + STAMP, key: name + '_key_' + STAMP, type: 'web', timezone: 'Europe/Berlin', country: 'DE'};
        const res = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)});
        res.status.should.equal(200, res.text);
        return res.body._id;
    }

    /**
     * Update the consolidate setting of an app
     * @param {string} apiKey - caller's api key
     * @param {string} appId - target app
     * @param {Array<string>} selectedApps - source apps after the change
     * @param {Array<string>} initialApps - source apps before the change
     * @returns {Promise<object>} the response
     */
    function updateConsolidate(apiKey, appId, selectedApps, initialApps) {
        return request.post('/i/apps/update/plugins')
            .type('form')
            .send({api_key: apiKey, app_id: appId, args: JSON.stringify({consolidate: {selectedApps, initialApps}})});
    }

    /**
     * Read an app's consolidate setting straight from the database
     * @param {string} appId - app id
     * @returns {Promise<Array<string>>} the setting, or undefined
     */
    async function consolidateOf(appId) {
        const doc = await testUtils.db.collection('apps').findOne({_id: testUtils.db.ObjectID(appId)}, {projection: {'plugins.consolidate': 1}});
        return doc && doc.plugins && doc.plugins.consolidate;
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APPS.target = await createApp('consolidate_target');
        APPS.own = await createApp('consolidate_own');
        APPS.other = await createApp('consolidate_other');

        const args = {
            full_name: 'consolidate_member',
            username: 'consolidate_member_' + STAMP,
            password: testUtils.password,
            email: 'consolidate_member_' + STAMP + '@test.test',
            permission: {_: {a: [APPS.target, APPS.own], u: []}, c: {}, r: {}, u: {}, d: {}},
        };
        const member = await request.get('/i/users/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify(args)});
        member.status.should.equal(200, member.text);
        MEMBER = {id: member.body._id, key: member.body.api_key};

        // the global admin consolidates the other app into the target
        const res = await updateConsolidate(API_KEY_ADMIN, APPS.target, [APPS.other], []);
        res.status.should.equal(200, res.text);
    });

    after(async() => {
        if (MEMBER && MEMBER.id) {
            await request.get('/i/users/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({user_ids: [MEMBER.id]})});
        }
        for (const appId of Object.values(APPS)) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: appId})});
        }
    });

    it('should return only the id, name and consolidate setting of the updated apps', async() => {
        const res = await updateConsolidate(API_KEY_ADMIN, APPS.target, [APPS.other], []);
        res.status.should.equal(200, res.text);
        const apps = res.body.plugins.consolidate;
        apps.should.be.an.Array().and.have.length(1);
        Object.keys(apps[0]).sort().should.eql(['_id', 'name', 'plugins']);
        Object.keys(apps[0].plugins).should.eql(['consolidate']);
        apps[0]._id.should.equal(APPS.other);
        apps[0].plugins.consolidate.should.containEql(APPS.target);
    });

    it('should refuse a member whose initialApps names an app they cannot access', async() => {
        const res = await updateConsolidate(MEMBER.key, APPS.target, [], [APPS.other]);
        res.status.should.equal(400, res.text);
        res.text.should.not.containEql('consolidate_other_key_' + STAMP);
        (await consolidateOf(APPS.other)).should.eql([APPS.target]);
    });

    it('should refuse a member whose selectedApps names an app they cannot access', async() => {
        const res = await updateConsolidate(MEMBER.key, APPS.target, [APPS.other], []);
        res.status.should.equal(400, res.text);
        (await consolidateOf(APPS.other)).should.eql([APPS.target]);
    });

    it('should let a member consolidate their own app and return the projected document', async() => {
        const res = await updateConsolidate(MEMBER.key, APPS.target, [APPS.own], []);
        res.status.should.equal(200, res.text);
        const apps = res.body.plugins.consolidate;
        apps.should.have.length(1);
        apps[0]._id.should.equal(APPS.own);
        Object.keys(apps[0]).sort().should.eql(['_id', 'name', 'plugins']);
        (await consolidateOf(APPS.own)).should.eql([APPS.target]);
        (await consolidateOf(APPS.other)).should.eql([APPS.target]);
    });
});
