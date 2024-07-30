const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");
let countlyDb;

describe('ab and rc Method', () => {

    before(async() => {
        await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'normal_param',
                    default_value: 1,
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/).expect(200);

        await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'ab_param',
                    default_value: 10,
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/).expect(200);

        await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'ab_param_2',
                    default_value: 11,
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/).expect(200);

        await request
            .get('/i/ab-testing/add-experiment')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                experiment: JSON.stringify({
                    name: 'fetch_remote_config_ab_testing',
                    description: '',
                    show_target_users: true,
                    target_users: {
                        byVal: [],
                        byValText: '',
                        percentage: '100',
                        condition: {
                            did: { $in: ['rc_method_ab_target_user', 'ab_method_ab_target_user'] },
                        },
                        condition_definition: 'ID = rc_method_ab_target_user,ab_method_ab_target_user',
                    },
                    goals: [{
                        user_segmentation: "{\"query\":{\"up.sc\":{\"$in\":[1]}},\"queryText\":\"Session Count = 1\"}",
                        steps: '[]',
                    }],
                    variants: [
                        {
                            name: 'Control group',
                            parameters: [
                                {
                                    name: 'ab_param',
                                    description: '',
                                    value: 100,
                                },
                                {
                                    name: 'ab_param_2',
                                    description: '',
                                    value: 101,
                                }],
                        },
                        {
                            name: 'Variant A',
                            parameters: [
                                {
                                    name: 'ab_param',
                                    description: '',
                                    value: 1000,
                                },
                                {
                                    name: 'ab_param_2',
                                    description: '',
                                    value: 1001,
                                }],
                        },
                    ],
                    type: 'remote-config',
                }),
            })
            .expect('Content-Type', /json/);

        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'ab-testing',
                skipCalculation: true,
            })
            .expect('Content-Type', /json/);

        const expId = resp.body.experiments.find((exp) => exp.name === 'fetch_remote_config_ab_testing')._id;

        await request
            .get('/i/ab-testing/start-experiment')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                experiment_id: expId,
            })
            .expect('Content-Type', /json/);
    });

    after(async() => {
        let resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const parameterIds = resp.body?.parameters?.reduce((acc, curr) => {
            const rgx = new RegExp('normal_param|ab_param');

            if (rgx.test(curr.parameter_key)) {
                acc.push(curr._id);
            }

            return acc;
        }, []);

        resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'ab-testing',
                skipCalculation: true,
            })
            .expect('Content-Type', /json/);

        const expIds = resp.body?.experiments?.reduce((acc, curr) => {
            if (curr.name === 'fetch_remote_config_ab_testing') {
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

        for (let idx = 0; idx < expIds?.length; idx += 1) {
            await request
                .post('/i/ab-testing/remove-experiment')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    experiment_id: expIds[idx],
                })
                .expect('Content-Type', /json/);
        }

        await countlyDb.collection('app_users' + APP_ID).deleteMany({
            did: {
                $in: ['ab_method_ab_target_user', 'rc_method_ab_target_user', 'rc_method_ab_target_user_2']
            }
        });
    });

    it('Should reject if there is no device_id', async() => {
        countlyDb = testUtils.client.db();
        await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
            })
            .expect(400);
    });

    it('Should reject if there are no keys', async() => {
        await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
                device_id: 'ab_method_ab_target_user',
            })
            .expect(400);
    });

    it('Should enroll the user for the specific keys', async() => {
        await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: AB_METHOD,
                device_id: 'ab_method_ab_target_user',
                keys: JSON.stringify(['ab_param']),
            })
            .expect(200);

        const user = await countlyDb.collection('app_users' + APP_ID).findOne({ did: 'ab_method_ab_target_user' });
        should(user.ab).not.be.undefined();
    });

    it('Should not enroll the user for the given keys, oi !==1 ', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user',
                oi: 0
            })
            .expect(200);
        should(resp.body.ab_param).be.oneOf(100, 1000);

        const user = await countlyDb.collection('app_users' + APP_ID).findOne({ did: 'rc_method_ab_target_user' });
        should(user.ab).be.undefined();


    });

    it('Should not return parameters in omit Keys', async() => {
        const resp2 = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user',
                oi: 0,
                omit_keys: JSON.stringify(['ab_param_2'])
            });
        should(resp2.body).not.have.keys('ab_param_2');
    });

    it('Should only return anything for invalid parameter', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user',
                oi: 0,
                keys: JSON.stringify(['ab_param_asd'])
            }).expect(200).expect('Content-Type', /json/).timeout(200000);

        should(resp.body).be.empty();
    });

    it('Should return all parameters, ab testing parameters should take priority over remote config parameters', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user',
                oi: 0,
            }).expect(200);

        should(resp.body.ab_param).be.oneOf(100, 1000);
        should(resp.body.ab_param_2).be.oneOf(101, 1001);
        should(resp.body.normal_param).equal(1);
    });

    it('Should return all parameters from only remote config', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user_2',
                oi: 0
            }).expect(200);

        should(resp.body.ab_param).equal(10);
        should(resp.body.ab_param_2).equal(11);
        should(resp.body.normal_param).equal(1);
    });

    it('Should enroll the user for the given keys, oi === 1 ', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'rc',
                device_id: 'rc_method_ab_target_user',
                oi: 1
            })
            .expect(200);

        const user = await countlyDb.collection('app_users' + APP_ID).findOne({ did: 'rc_method_ab_target_user' });
        should(user.ab).not.be.undefined();
    });
});

