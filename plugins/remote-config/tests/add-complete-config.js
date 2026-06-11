const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");

const PARAMETER_PREFIX = 'add_complete_config_param_';

describe('Add complete config', () => {
    it('Should add a complete config', async() => {
        await request
            .post('/i/remote-config/add-complete-config')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                config: JSON.stringify({
                    parameters: [{
                        parameter_key: `${PARAMETER_PREFIX}feature`,
                        exp_value: true,
                        description: '-',
                    }],
                }),
            })
            .expect(200);
    });

    after(async() => {
        // remove all parameters created by this test file
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const parameterIds = resp.body?.parameters?.reduce((acc, curr) => {
            const rgx = new RegExp(`^${PARAMETER_PREFIX}`);

            if (rgx.test(curr.parameter_key)) {
                acc.push(curr._id);
            }

            return acc;
        }, []);

        for (let idx = 0; idx < parameterIds?.length; idx += 1) {
            await request
                .post('/i/remote-config/remove-parameter')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    parameter_id: parameterIds[idx],
                })
                .expect('Content-Type', /json/);
        }

        should(true).be.ok();
    });
});
