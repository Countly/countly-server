const testUtils = require('../../../test/testUtils'),
    { PLATFORMS_TITLES, FIELDS_TITLES, platforms } = require('../api/send'),
    plugins = require('../../pluginManager'),
    // supertest = require('supertest').agent(testUtils.url),
    supertest = require('supertest').agent('http://localhost:3001'),
    should = require('should');

// let aid = testUtils.get('APP_ID'),
//     app_key = testUtils.get('APP_ID'),
//     api_key = testUtils.get('APP_ID');
let aid = '617e6cf3cd001aac73834e18',
    app_key = '78fb16cbaa61399d0f13f9e96961bd9983a0a416',
    api_key = '4e170a5da90fdf5afd94f85eefdb015b',
    users = {
        did0: {device_id: 'did0', tokens: [{ios_token: 'token0', test_mode: 1}], events: [{key: 'cart'}, {key: 'buy'}]},
        did1: {device_id: 'did1', tokens: [{ios_token: 'token1', test_mode: 0}], locale: 'en_US'},
        did2: {device_id: 'did2', tokens: [{android_token: 'token2', test_mode: 2}], locale: 'en_US', events: [{key: 'cart'}, {key: 'buy'}]},
        did3: {device_id: 'did3', tokens: [{ios_token: 'token3', test_mode: 2}, {android_token: 'token4', test_mode: 0}], locale: 'ru_RU', events: [{key: 'subscribe'}]},
        anonymous0: {device_id: 'anon0', auth_device_id: 'did4', tokens: [{ios_token: 'tokenanon0', test_mode: 1}], events: [{key: 'cart'}, {key: 'buy'}]}, // merges into new user
        anonymous1: {device_id: 'anon1', auth_device_id: 'did1', tokens: [{ios_token: 'tokenanon1', test_mode: 1}], events: [{key: 'cart'}, {key: 'buy'}]}, // merges into existing user with different token mode
        anonymous2: {device_id: 'anon2', auth_device_id: 'did3', tokens: [{ios_token: 'tokenanon2', test_mode: 2}], events: [{key: 'cart'}, {key: 'buy'}]}, // merges into existing user with existing token mode
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
                should.deepEqual(res.body.enabled, {total: 0, i: 0, a: 0, t: 0, h: 0});
                should.deepEqual(res.body.platforms.a, PLATFORMS_TITLES.a);
                should.deepEqual(res.body.platforms.i, PLATFORMS_TITLES.i);
                should.not.exist(res.body.platforms.t);
                should.not.exist(res.body.platforms.h);
                should.ok(res.body.tokens);
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
    it('should return 7-user dashboard', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/o/push/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 7, i: 6, a: 2, t: 0, h: 0});
                should.deepEqual(res.body.platforms.a, PLATFORMS_TITLES.a);
                should.deepEqual(res.body.platforms.i, PLATFORMS_TITLES.i);
                should.not.exist(res.body.platforms.t);
                should.not.exist(res.body.platforms.h);
                should.ok(res.body.tokens);
            });
    });

    it('should do user merging', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        let db = await plugins.dbConnection(),
            old = await db.collection(`push_${aid}`).find().toArray();
        should.equal(old.length, 7);
        should.equal(old.filter(u => u.tk.id === users.anonymous0.tokens[0].ios_token).length, 1);
        should.equal(old.filter(u => u.tk.ip === users.did1.tokens[0].ios_token).length, 1);
        should.equal(old.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token).length, 1);
        should.ok(old.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token)[0] !== old.filter(u => u.tk.ip === users.did1.tokens[0].ios_token)[0]);
        should.equal(old.filter(u => u.tk.ia === users.did3.tokens[0].ios_token).length, 1);

        await supertest.get(`/i?app_key=${app_key}&device_id=${users.anonymous0.auth_device_id}&old_device_id=${users.anonymous0.device_id}`)
            .expect('Content-Type', /json/)
            .expect(200);
        await new Promise(res => setTimeout(res, 1000));

        let neo = await db.collection(`push_${aid}`).find().toArray();
        should.equal(neo.length, 7);
        should.equal(neo.filter(u => u.tk.id === users.anonymous0.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token).length, 1);
        should.ok(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token)[0] !== neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token)[0]);
        should.equal(neo.filter(u => u.tk.ia === users.did3.tokens[0].ios_token).length, 1);

        await supertest.get(`/i?app_key=${app_key}&device_id=${users.anonymous1.auth_device_id}&old_device_id=${users.anonymous1.device_id}`)
            .expect('Content-Type', /json/)
            .expect(200);
        await new Promise(res => setTimeout(res, 1000));

        neo = await db.collection(`push_${aid}`).find().toArray();
        should.equal(neo.length, 6);
        should.equal(neo.filter(u => u.tk.id === users.anonymous0.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token).length, 1);
        should.ok(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token)[0] === neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token)[0]);
        should.equal(neo.filter(u => u.tk.ia === users.did3.tokens[0].ios_token).length, 1);

        await supertest.get(`/i?app_key=${app_key}&device_id=${users.anonymous2.auth_device_id}&old_device_id=${users.anonymous2.device_id}`)
            .expect('Content-Type', /json/)
            .expect(200);
        await new Promise(res => setTimeout(res, 1000));

        neo = await db.collection(`push_${aid}`).find().toArray();
        should.equal(neo.length, 5);
        should.equal(neo.filter(u => u.tk.id === users.anonymous0.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token).length, 1);
        should.equal(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token).length, 1);
        should.ok(neo.filter(u => u.tk.id === users.anonymous1.tokens[0].ios_token)[0] === neo.filter(u => u.tk.ip === users.did1.tokens[0].ios_token)[0]);
        should.equal(neo.filter(u => u.tk.ia === users.did3.tokens[0].ios_token).length, 0);

        await db.close();
    });

    it('should return 5-user dashboard', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/o/push/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 5, i: 4, a: 2, t: 0, h: 0});
                should.deepEqual(res.body.platforms.a, PLATFORMS_TITLES.a);
                should.deepEqual(res.body.platforms.i, PLATFORMS_TITLES.i);
                should.not.exist(res.body.platforms.t);
                should.not.exist(res.body.platforms.h);
                should.ok(res.body.tokens);
            });
    });

    it('should correctly schedule plain message for all users/tokens', async() => {

    });
});
