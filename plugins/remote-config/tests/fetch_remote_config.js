const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");

const AMOUNT_OF_KEYS = 5;
const PARAMETER_PREFIX = 'fetch_remote_config_param_';
const VALUE_PREFIX = 'value_';

before(async() => {
    for (let count = 0; count < AMOUNT_OF_KEYS; count += 1) {
        await request
            .post('/i/remote-config/add-parameter')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                parameter: JSON.stringify({
                    parameter_key: `${PARAMETER_PREFIX}${count}`,
                    default_value: `${VALUE_PREFIX}${count}`,
                    description: '-',
                    conditions: [],
                    status: 'Running',
                    expiry_dttm: null,
                }),
            })
            .expect('Content-Type', /json/);
    }
});

describe('Fetch remote config', () => {
    it('Should reject if there is no device_id', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                method: 'fetch_remote_config',
            })
            .expect(400);
    });

    it('Should fetch all known remote configs', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'device_0',
                method: 'fetch_remote_config',
            })
            .expect(200);

        for (let count = 0; count < AMOUNT_OF_KEYS; count += 1) {
            should(resp.body).containEql({ [`${PARAMETER_PREFIX}${count}`]: `${VALUE_PREFIX}${count}`});
        }
    });

    it('Should only fetch remote configs with specified keys', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'device_0',
                method: 'fetch_remote_config',
                keys: JSON.stringify([`${PARAMETER_PREFIX}${2}`, `${PARAMETER_PREFIX}${4}`]),
            })
            .expect(200);

        should(resp.body).be.eql({
            [`${PARAMETER_PREFIX}${2}`]: `${VALUE_PREFIX}${2}`,
            [`${PARAMETER_PREFIX}${4}`]: `${VALUE_PREFIX}${4}`,
        });
    });

    it('Should return nothing if specified keys does not exists', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'device_0',
                method: 'fetch_remote_config',
                keys: JSON.stringify(['totallynotexists']),
            })
            .expect(200);

        should(resp.body).be.eql({});
    });

    it('Should not fetch remote configs with omitted keys', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'device_0',
                method: 'fetch_remote_config',
                omit_keys: JSON.stringify([`${PARAMETER_PREFIX}${1}`, `${PARAMETER_PREFIX}${3}`]),
            })
            .expect(200);

        should(resp.body).not.containEql({ [`${PARAMETER_PREFIX}${1}`]: `${VALUE_PREFIX}${1}`});
        should(resp.body).not.containEql({ [`${PARAMETER_PREFIX}${3}`]: `${VALUE_PREFIX}${3}`});
    });

    it('Should fetch all known remote configs if omitted keys does not exists', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'device_0',
                method: 'fetch_remote_config',
                omit_keys: JSON.stringify(['totallynotexists']),
            })
            .expect(200);

        for (let count = 0; count < AMOUNT_OF_KEYS; count += 1) {
            should(resp.body).containEql({ [`${PARAMETER_PREFIX}${count}`]: `${VALUE_PREFIX}${count}`});
        }
    });
});

