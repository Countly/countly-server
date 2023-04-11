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