const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../test/testUtils');
const remoteConfig = require('../api/parts/rc');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");

const PARAMETER_PREFIX = 'remote_config_param_';
const CONDITION_PREFIX = 'remoteconfigcond';
const VALUE_PREFIX = 'value_';
const TARGETTED_USER_ID = 'targetted_user';

describe('Empty remote-config endpoint', () => {
    it('Should return empty parameters and conditions', async() => {
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        should(resp.body.parameters).be.eql([]);
        should(resp.body.conditions).be.eql([]);
    });
});

describe('Non empty remote-config endpoint', () => {
    before(async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${CONDITION_PREFIX}0`,
                    condition_color: 1,
                    condition: { did: { $in: [TARGETTED_USER_ID] } },
                    condition_definition: `ID = ${TARGETTED_USER_ID}`,
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect('Content-Type', /json/);

        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const condition_id = resp.body.conditions.find((condition) => condition.condition_name === `${CONDITION_PREFIX}0`)._id;

        await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: `${PARAMETER_PREFIX}conditioned`,
                    default_value: `${VALUE_PREFIX}default`,
                    description: '-',
                    conditions: [{
                        condition_id,
                        value: `${VALUE_PREFIX}conditioned`,
                    }],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/);
    });

    it('Should return parameters', async() => {
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        should(resp.body?.parameters?.length).be.above(0);

        const parameter = resp.body?.parameters?.find((param) => param.parameter_key === `${PARAMETER_PREFIX}conditioned`);

        should(parameter.default_value).be.eql(`${VALUE_PREFIX}default`);
    });

    it('Should return conditions', async() => {
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        should(resp.body?.conditions?.length).be.above(0);

        const condition = resp.body?.conditions?.find((cond) => cond.condition_name === `${CONDITION_PREFIX}0`);

        should(condition).be.ok();
    });

    it('Should update used_in_parameters count', async() => {
        await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: TARGETTED_USER_ID,
                method: 'fetch_remote_config',
            })
            .expect(200);

        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const condition = resp.body?.conditions?.find((cond) => cond.condition_name === `${CONDITION_PREFIX}0`);

        should(condition.used_in_parameters).be.eql(1);
    });

    after(async() => {
        // remove all remote configs and conditions that are created by this test file
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

        const conditionIds = resp.body?.conditions?.reduce((acc, curr) => {
            const rgx = new RegExp(`^${CONDITION_PREFIX}`);

            if (rgx.test(curr.condition_name)) {
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

        for (let idx = 0; idx < conditionIds?.length; idx += 1) {
            await request
                .post('/i/remote-config/remove-condition')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    condition_id: conditionIds[idx],
                })
                .expect('Content-Type', /json/);
        }
    });
});
