const spt = require('supertest');
const should = require('should');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
const API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
const APP_KEY = testUtils.get('APP_KEY');
const APP_ID = testUtils.get("APP_ID");
const AB_METHOD = 'ab';
describe('Ab Enroll Test', () => {
    it('Should reject if there is no device_id', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: testUtils.get('APP_KEY'),
                app_key: APP_KEY,
                method: AB_METHOD,
            })
            .expect(400);
    });

    it('Should reject if there are no keys', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: testUtils.get('APP_KEY'),
                method: AB_METHOD,
                device_id: 'device_0',
            })
            .expect(400);
    });

    it('Should not enroll the user for the given keys', async() => {
        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: testUtils.get('APP_KEY'),
                method: AB_METHOD,
                device_id: 'device_0',
                keys: JSON.stringify(['header_color', 'background', 'showBanner'])
            })
            .expect(200);

        //TODO: check app_user

    });

    it('Should not enroll the user for the given keys', async() => {

        const resp = await request
            .get('/o/sdk')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: testUtils.get('APP_KEY'),
                method: AB_METHOD,
                device_id: 'device_0',
                keys: JSON.stringify(['header_color', 'background', 'showBanner']),
                oi: 1
            })
            .expect(200);
        //TODO: check app_user
    });

});

