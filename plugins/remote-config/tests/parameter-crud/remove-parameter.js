const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../../test/testUtils');

const request = spt(testUtils.url);
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");

describe('Remote Config - Remove Parameter', () => {
    let existingParameterId;

    before(async() => {
        // Create a parameter to remove in our tests
        const resp = await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'test_remove_key',
                    default_value: 'test_value',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect(200);

        // Fetch the created parameter's ID
        const getResp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        existingParameterId = getResp.body.parameters.find(p => p.parameter_key === 'test_remove_key')._id;
    });

    it('Should successfully remove an existing parameter', async() => {
        const resp = await request
            .post('/i/remote-config/remove-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter_id: existingParameterId,
            })
            .expect(200);

        should(resp.body).have.property('result', 'Success');

        // Verify the parameter was removed
        const getResp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        should(getResp.body.parameters.find(p => p._id === existingParameterId)).be.undefined();
    });

    it('Should handle removing a non-existent parameter', async() => {
        const nonExistentId = 'deadbeefdeadbeefdeadbeef'; // A fake ObjectId

        const resp = await request
            .post('/i/remote-config/remove-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter_id: nonExistentId,
            })
            .expect(200);

        should(resp.body).have.property('result', 'Success');
        // The behavior here matches the function, which doesn't distinguish between
        // removing an existing parameter and attempting to remove a non-existent one.
        // Both cases return a 200 status with 'Success'.
    });

    // No need for an after hook since we've removed the parameter in our test
});