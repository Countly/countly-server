const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../test/testUtils');
const remoteConfig = require('../api/parts/rc');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");

const ADD_CONDITION_PREFIX = 'addconditionendpoint';
const UPDATE_CONDITION_PREFIX = 'updateconditionendpoint';
const REMOVE_CONDITION_PREFIX = 'removeconditionendpoint';
const PARAMETER_PREFIX = 'condition_endpoint_param_';
const VALUE_PREFIX = 'value_';
const TARGETTED_USER_ID = 'targetted_user';

describe('Add condition', () => {
    it('Should not accept invalid condition name', async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}_`,
                }),
            })
            .expect(400);
    });

    it('Should not accept empty condition color', async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}`,
                }),
            })
            .expect(400);
    });

    it('Should not accept empty condition', async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}`,
                    condition_color: 1,
                }),
            })
            .expect(400);
    });

    it('Should add a condition', async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}0`,
                    condition_color: 1,
                    condition: { did: { $in: 'someId' } },
                    condition_definition: 'ID = someId',
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect(200);
    });

    it('Should not accept a condition with duplicate name', async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}1`,
                    condition_color: 1,
                    condition: { did: { $in: 'someId' } },
                    condition_definition: 'ID = someId',
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect(200);

        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${ADD_CONDITION_PREFIX}1`,
                    condition_color: 1,
                    condition: { did: { $in: 'someId' } },
                    condition_definition: 'ID = someId',
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect(500);
    });

    after(async() => {
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const conditionIds = resp.body?.conditions?.reduce((acc, curr) => {
            const rgx = new RegExp(`^${ADD_CONDITION_PREFIX}`);

            if (rgx.test(curr.condition_name)) {
                acc.push(curr._id);
            }

            return acc;
        }, []);

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

describe('Update condition', () => {
    before(async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${UPDATE_CONDITION_PREFIX}0`,
                    condition_color: 1,
                    condition: { did: { $in: [TARGETTED_USER_ID] } },
                    condition_definition: `ID = ${TARGETTED_USER_ID}`,
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect('Content-Type', /json/);
    });

    it('Should not accept invalid condition name', async() => {
        await request
            .post('/i/remote-config/update-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${UPDATE_CONDITION_PREFIX}_`,
                }),
            })
            .expect(400);
    });

    it('Should not accept empty condition color', async() => {
        await request
            .post('/i/remote-config/update-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${UPDATE_CONDITION_PREFIX}`,
                }),
            })
            .expect(400);
    });

    it('Should not accept empty condition', async() => {
        await request
            .post('/i/remote-config/update-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${UPDATE_CONDITION_PREFIX}`,
                    condition_color: 1,
                }),
            })
            .expect(400);
    });

    it('Should update condition', async() => {
        let resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const condition_id = resp.body.conditions.find((condition) => condition.condition_name === `${UPDATE_CONDITION_PREFIX}0`)._id;

        await request
            .post('/i/remote-config/update-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition_id,
                condition: JSON.stringify({
                    condition_name: `${UPDATE_CONDITION_PREFIX}1`,
                    condition_color: 1,
                    condition: { did: { $in: [TARGETTED_USER_ID] } },
                    condition_definition: `ID = ${TARGETTED_USER_ID}`,
                    condition_description: '-',
                    seed_value: '',
                }),
            })
            .expect(200);

        resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const updatedCondition = resp.body.conditions.find((condition) => condition._id === condition_id);

        should(updatedCondition.condition_name).be.eql(`${UPDATE_CONDITION_PREFIX}1`);
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

        const conditionIds = resp.body?.conditions?.reduce((acc, curr) => {
            const rgx = new RegExp(`^${UPDATE_CONDITION_PREFIX}`);

            if (rgx.test(curr.condition_name)) {
                acc.push(curr._id);
            }

            return acc;
        }, []);

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

describe('Remove condition', () => {
    before(async() => {
        await request
            .post('/i/remote-config/add-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition: JSON.stringify({
                    condition_name: `${REMOVE_CONDITION_PREFIX}0`,
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

        const condition_id = resp.body.conditions.find((condition) => condition.condition_name === `${REMOVE_CONDITION_PREFIX}0`)._id;

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

    it('Should be alright if id is not found', async() => {
        await request
            .post('/i/remote-config/remove-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition_id: 'notexists',
            })
            .expect(200);
    });

    it('Should remove condition', async() => {
        let resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const condition_id = resp.body.conditions.find((condition) => condition.condition_name === `${REMOVE_CONDITION_PREFIX}0`)._id;

        await request
            .post('/i/remote-config/remove-condition')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                condition_id,
            })
            .expect(200);

        resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const removedCondition = resp.body.conditions.find((condition) => condition.condition_name === `${REMOVE_CONDITION_PREFIX}0`);

        should(removedCondition).not.be.ok();

        const parameter = resp.body.parameters.find((param) => param.parameter_key === `${PARAMETER_PREFIX}conditioned`);

        should(parameter.conditions).be.eql([]);
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
            const rgx = new RegExp(`^${REMOVE_CONDITION_PREFIX}`);

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
