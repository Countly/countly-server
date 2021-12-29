const testUtils = require('../../../test/testUtils'),
    { PLATFORMS_TITLES, FIELDS_TITLES, platforms } = require('../api/send'),
    plugins = require('../../pluginManager'),
    // supertest = require('supertest').agent(testUtils.url),
    supertest = require('supertest').agent('http://localhost:3001'),
    should = require('should');

// let aid,
//     app_key,
//     api_key;
let aid = '617e6cf3cd001aac73834e18',
    app_key = '78fb16cbaa61399d0f13f9e96961bd9983a0a416',
    api_key = '4438dfdece5eaa6b796db9baf58ecbc4',
    users = {
        did0: {device_id: 'did0', tokens: [{ios_token: 'token0', test_mode: 1}], events: [{key: 'cart'}, {key: 'buy'}]},
        did1: {device_id: 'did1', tokens: [{ios_token: 'token0', test_mode: 0}], locale: 'en_US'},
        did2: {device_id: 'did2', tokens: [{android_token: 'token0', test_mode: 2}], locale: 'en_US', events: [{key: 'cart'}, {key: 'buy'}]},
        did3: {device_id: 'did3', tokens: [{ios_token: 'token0', test_mode: 2}, {android_token: 'token0', test_mode: 0}], locale: 'ru_RU', events: [{key: 'subscribe'}]},
    };

describe('PUSH AUDIENCE TESTS', () => {
    it('should reset the app', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/i/apps/reset?api_key=${api_key}&app_id=${aid}&args=${JSON.stringify({app_id: aid, period: 'all'})}`)
            .expect('Content-Type', /json/)
            .expect(200);

        let db = await plugins.dbConnection();
        await db.collection('apps').updateOne({_id: db.ObjectID(aid)}, {
            $set: {
                'plugins.push.t': {
                    _id: db.ObjectID(),
                    type: 'apn_universal',
                    key: 'key',
                    secret: 'secret'
                },
            }
        });

        db.close();

        await new Promise(res => setTimeout(res, 1000));
    }).timeout(2000);
    it('should return 0 dashboard', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/o/push/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 0, i: 0, a: 0, t: 0});
                should.deepEqual(res.body.platforms, PLATFORMS_TITLES);
                should.deepEqual(res.body.tokens, FIELDS_TITLES);
            });
    });
    it('should estimate 0 audience', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                app: aid,
                platforms
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.body.count, 0);
                should.deepEqual(res.body.locales, {default: 0});
            });
    });
    it('should correctly process new tokens', async() => {
        for (let did in users) {
            let user = users[did];
            await supertest.post(`/i?app_key=${app_key}&device_id=${user.device_id}`)
                .send({
                    begin_session: 1,
                    metrics: {
                        _locale: user.locale
                    }
                })
                .expect('Content-Type', /json/)
                .expect(200);

            await new Promise(res => setTimeout(res, 1000));

            for (let token of user.tokens) {
                await supertest.post(`/i?app_key=${app_key}&device_id=${user.device_id}&token_session=1`)
                    .send(Object.assign({
                        device_id: user.device_id,
                        token_session: 1,
                    }, token, user.events ? {events: user.events} : {}))
                    .expect('Content-Type', /json/)
                    .expect(200);
            }
        }
    }).timeout(10000);
    it('should return 4-user dashboard', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/o/push/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 4, i: 3, a: 2, t: 0});
                should.deepEqual(res.body.platforms, PLATFORMS_TITLES);
                should.deepEqual(res.body.tokens, FIELDS_TITLES);
            });
    });

    it('should correctly schedule plain message for all users/tokens', async() => {

    });
});
