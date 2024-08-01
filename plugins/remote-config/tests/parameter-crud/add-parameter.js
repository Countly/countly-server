const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../../test/testUtils');

const request = spt(testUtils.url);
let API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
let APP_KEY = testUtils.get('APP_KEY');
let APP_ID = testUtils.get("APP_ID");

describe('Remote Config - Add Parameter', () => {
    let stockConfig = {};

    before(async() => {
        //save the current config
        const res1 = await request.get(`/o/configs?${new URLSearchParams({ api_key: API_KEY_ADMIN, app_id: APP_ID })}`);
        stockConfig = res1.body['remote-config'];
    });

    it('Should reject if parameter_key is invalid', (done) => {
        request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: '123invalid',
                    default_value: 'test',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/)
            .expect(400)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                should(res.body).have.property('result', 'Invalid parameter: parameter_key');
                done();
            });
    });

    it('Should reject if default_value is missing', (done) => {
        request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'valid_key',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/)
            .expect(400)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                should(res.body).have.property('result', 'Invalid parameter: default_value');
                done();
            });
    });

    it('Should successfully add a valid parameter', (done) => {
        request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'valid_key',
                    default_value: 'test_value',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) {
                    return done(err);
                }
                done();
            });
    });

    it('Should reject if parameter already exists', (done) => {
        // First, add a parameter
        request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'existing_key',
                    default_value: 'test_value',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .end((err, res) => {
                if (err) {
                    return done(err);
                }

                // Then, try to add the same parameter again
                request
                    .post('/i/remote-config/add-parameter')
                    .send({
                        api_key: API_KEY_ADMIN,
                        app_id: APP_ID,
                        app_key: APP_KEY,
                        parameter: JSON.stringify({
                            parameter_key: 'existing_key',
                            default_value: 'new_value',
                            description: '-',
                            conditions: [],
                            status: 'Running',
                            expiry_dttm: null,
                        }),
                    })
                    .expect('Content-Type', /json/)
                    .expect(500)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }
                        should(res.body).have.property('result', 'The parameter already exists');
                        done();
                    });
            });
    });

    it('Should reject if maximum number of parameter limit is exceeded', async() => {
        // First, get the current number of parameters
        const initialResp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const initialParameterCount = initialResp.body.parameters.length;
        const maxAllowedParameters = 4;

        const config = {
            'remote-config': {
                maximum_allowed_parameters: maxAllowedParameters,
            },
        };
        const configs = { configs: JSON.stringify(config) };

        await request.get(`/i/configs?${new URLSearchParams({ ...configs, api_key: API_KEY_ADMIN }).toString()}`).expect(200);
        // request config here to make sure that config has changed
        const res = await request.get(`/o/configs?${new URLSearchParams({ api_key: API_KEY_ADMIN, app_id: APP_ID })}`).expect(200);
        const newConfig = res.body['remote-config'];
        should(newConfig).have.property('maximum_allowed_parameters', maxAllowedParameters);

        // Add parameters until we reach the limit
        for (let i = initialParameterCount; i < maxAllowedParameters; i++) {
            await request
                .post('/i/remote-config/add-parameter')
                .send({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    parameter: JSON.stringify({
                        parameter_key: `test_key_${i}`,
                        default_value: 'test_value',
                        description: '-',
                        conditions: [],
                        status: 'Running',
                        expiry_dttm: null,
                    }),
                })
                .expect(200);
        }

        // Now try to add one more parameter, which should be rejected
        const finalResp = await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: 'one_too_many',
                    default_value: 'test_value',
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect(500);

        should(finalResp.body).have.property('result', 'Maximum parameters limit reached');
    });

    after(async() => {
        // Restore the original config
        const config = { 'remote-config': stockConfig };
        const configs = { configs: JSON.stringify(config) };
        await request.get(`/i/configs?${new URLSearchParams({ ...configs, api_key: API_KEY_ADMIN }).toString()}`).expect(200);

        // Clean up: remove all parameters created during tests
        const resp = await request
            .get('/o')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'remote-config',
            })
            .expect(200);

        const parameterIds = resp.body?.parameters?.filter(param =>
            param.parameter_key.startsWith('test_key_') ||
            ['valid_key', 'existing_key'].includes(param.parameter_key)
        ).map(param => param._id);

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
    });
});