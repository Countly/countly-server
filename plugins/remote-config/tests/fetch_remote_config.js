const spt = require('supertest');
const should = require('should');

const testUtils = require('../../../test/testUtils');
const remoteConfig = require('../api/parts/rc');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");

const AMOUNT_OF_KEYS = 5;
const PARAMETER_PREFIX = 'fetch_remote_config_param_';
const CONDITION_PREFIX = 'fetchremoteconfigcond';
const VALUE_PREFIX = 'value_';
const TARGETED_USER_ID = 'targeted_user';

describe('Fetch remote config', () => {
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

    describe('Targeting', () => {
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
                        condition: { did: { $in: [TARGETED_USER_ID] } },
                        condition_definition: `ID = ${TARGETED_USER_ID}`,
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

        it('Should match targeted user (device id)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
            };
            const query = { did: { $in: ['targeted_user'] } };

            should(remoteConfig.processFilter(targetedUser, query)).equal(true);
        });

        it('Should not match non targeted user (device id)', () => {
            const nonTargetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'non_targeted_user',
            };
            const query = { did: { $in: ['targeted_user'] } };

            should(remoteConfig.processFilter(nonTargetedUser, query)).equal(false);
        });

        it('Should match targeted user (country)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
            };
            const query = { 'up.cc': { $exists: true } };

            should(remoteConfig.processFilter(targetedUser, query)).equal(true);
        });

        it('Should match targeted user (app version)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                av: '1:0:0',
            };
            const queryGt = { 'up.av': { $gt: '0:0:0' } };
            const queryGte = { 'up.av': { $gte: '1:0:0' } };
            const queryLt = { 'up.av': { $lt: '2:0:0' } };
            const queryLte = { 'up.av': { $lte: '1:0:0' } };
            const queryIn = { 'up.av': { $in: ['1:0:0'] } };
            const queryNin = { 'up.av': { $nin: ['2:0:0'] } };

            should(remoteConfig.processFilter(targetedUser, queryGt)).equal(true);
            should(remoteConfig.processFilter(targetedUser, queryGte)).equal(true);
            should(remoteConfig.processFilter(targetedUser, queryLt)).equal(true);
            should(remoteConfig.processFilter(targetedUser, queryLte)).equal(true);
            should(remoteConfig.processFilter(targetedUser, queryIn)).equal(true);
            should(remoteConfig.processFilter(targetedUser, queryNin)).equal(true);
        });

        it('Should not match non targeted user (app version)', () => {
            const nonTargetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'non_targeted_user',
                av: '1:0:0',
            };
            const queryGt = { 'up.av': { $gt: '1:0:0' } };
            const queryGte = { 'up.av': { $gte: '2:0:0' } };
            const queryLt = { 'up.av': { $lt: '1:0:0' } };
            const queryLte = { 'up.av': { $lte: '0:0:0' } };
            const queryIn = { 'up.av': { $in: ['2:0:0'] } };
            const queryNin = { 'up.av': { $nin: ['1:0:0'] } };

            should(remoteConfig.processFilter(nonTargetedUser, queryGt)).equal(false);
            should(remoteConfig.processFilter(nonTargetedUser, queryGte)).equal(false);
            should(remoteConfig.processFilter(nonTargetedUser, queryLt)).equal(false);
            should(remoteConfig.processFilter(nonTargetedUser, queryLte)).equal(false);
            should(remoteConfig.processFilter(nonTargetedUser, queryIn)).equal(false);
            should(remoteConfig.processFilter(nonTargetedUser, queryNin)).equal(false);
        });

        it('Should match targeted user ($and query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
            };
            const query = { 'up.cc': { $exists: true }, did: { $in: ['targeted_user'] } };
            const altQuery = {
                $and: [
                    { 'up.cc': { $exists: true } },
                    { did: { $in: ['targeted_user'] } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(true);
            should(remoteConfig.processFilter(targetedUser, altQuery)).equal(true);
        });

        it('Should not match targeted user ($and query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
            };
            const query = { 'up.cc': { $exists: true }, did: { $nin: ['targeted_user'] } };
            const altQuery = {
                $and: [
                    { 'up.cc': { $exists: true } },
                    { did: { $nin: ['targeted_user'] } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(false);
            should(remoteConfig.processFilter(targetedUser, altQuery)).equal(false);
        });

        it('Should match targeted user ($or query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
            };
            const query = {
                $or: [
                    { 'up.cc': { $exists: true }},
                    { did: { $nin: ['targeted_user'] } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(true);
        });

        it('Should not match targeted user ($or query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
            };
            const query = {
                $or: [
                    { 'up.cc': { $exists: false }},
                    { did: { $nin: ['targeted_user'] } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(false);
        });

        it('Should match targeted user (combination query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
                chr: {
                    'chr_id': {
                        i: 123,
                        in: 'true',
                    },
                },
            };
            const query = {
                $or: [
                    { 'up.cc': { $in: ['UK'] }, chr: { $in: ['chr_id'] } },
                    { did: { $nin: ['targeted_user'] } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(true);
        });

        it('Should not match targeted user (combination query)', () => {
            const targetedUser = {
                _id: '1c5c91e1dd594d457a656fad1e55d0cf2a3f0601',
                uid: '13',
                did: 'targeted_user',
                cc: 'UK',
                av: '1:0:0',
                chr: {
                    'chr_id': {
                        i: 123,
                        in: 'true',
                    },
                },
            };
            const query = {
                $or: [
                    { 'up.cc': { $nin: ['UK'] }, chr: { $nin: ['chr_id'] } },
                    { did: { $nin: ['targeted_user'] }, 'up.av': { $gt: '2:0:0' } },
                ],
            };

            should(remoteConfig.processFilter(targetedUser, query)).equal(false);
        });

        it('Should fetch remote config with default value', async() => {
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

            should(resp.body).containEql({ [`${PARAMETER_PREFIX}conditioned`]: `${VALUE_PREFIX}default`});
        });

        it('Should fetch remote config with conditioned value', async() => {
            const resp = await request
                .get('/o/sdk')
                .query({
                    api_key: API_KEY_ADMIN,
                    app_id: APP_ID,
                    app_key: APP_KEY,
                    device_id: TARGETED_USER_ID,
                    method: 'fetch_remote_config',
                })
                .expect(200);

            should(resp.body).containEql({ [`${PARAMETER_PREFIX}conditioned`]: `${VALUE_PREFIX}conditioned`});
        });
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
