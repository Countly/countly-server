const common = require('../../../api/utils/common'),
    testUtils = require('../../../test/testUtils'),
    { PLATFORMS_TITLES, FIELDS_TITLES } = require('../api/send'),
    // supertest = require('supertest').agent(testUtils.url),
    supertest = require('supertest').agent('http://localhost:3001'),
    moment = require('moment-timezone'),
    should = require('should'),
    log = common.log('push:test');

// let aid,
//     app_key,
//     api_key;
let aid = '5fbb72974e19c6614411d95f',
    app_key = 'baf539442a65f09c3d180ad83b7d3c3160172381',
    api_key = '4438dfdece5eaa6b796db9baf58ecbc4';

async function test_data(plfs) {
    let app,
        uids = [];
    // Create app

    // Upload platform credentials

    // Create users

    return {
        app,
        uids
    };
}

describe('PUSH INTEGRATION TESTS', () => {
    it('should return initial dashboard', async() => {
        aid = testUtils.get('APP_ID');
        api_key = testUtils.get('API_KEY_ADMIN');
        app_key = testUtils.get('APP_KEY');

        await supertest.get(`/o/pushes/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 0, i: 0, a: 0, h: 0});
                should.deepEqual(res.body.platforms, PLATFORMS_TITLES);
                should.equal(res.body.tokens, FIELDS_TITLES);
            });
    });
    // it('should estimate audience', () => {
    //     let audience;
    //     should.equal(audience.total, 5);
    // });
    // it('should create a push', () => {
    //     let dashboard;
    //     should.equal(dashboard.total, 5);
    // });
});

