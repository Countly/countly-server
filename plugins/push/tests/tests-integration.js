const testUtils = require('../../../test/testUtils'),
    { PLATFORMS_TITLES, FIELDS_TITLES, platforms } = require('../api/send'),
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

describe('PUSH INTEGRATION TESTS', () => {
    it('should reset the app', async() => {
        aid = aid || testUtils.get('APP_ID');
        api_key = api_key || testUtils.get('API_KEY_ADMIN');
        app_key = app_key || testUtils.get('APP_KEY');

        await supertest.get(`/i/apps/reset?api_key=${api_key}&app_id=${aid}&args=${JSON.stringify({app_id: aid, period: 'all'})}`)
            .expect('Content-Type', /json/)
            .expect(200);

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
            for (let token of user.tokens) {
                await supertest.post(`/i?app_key=${app_key}&device_id=${user.device_id}&token_session=1`)
                    .send({
                        begin_session: 1,
                        metrics: {
                            _locale: user.locale
                        }
                    })
                    .expect('Content-Type', /json/)
                    .expect(200);

                await supertest.post(`/i?app_key=${app_key}&device_id=${user.device_id}&token_session=1`)
                    .send(Object.assign({
                        device_id: user.device_id,
                        token_session: 1,
                    }, token, user.events ? {events: user.events} : {}))
                    .expect('Content-Type', /json/)
                    .expect(200);
            }
        }
        await new Promise(res => setTimeout(res, 2000));
    }).timeout(4000);

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
    it('should estimate 4-user audience', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                app: aid,
                platforms
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.body.count, 4);
                should.deepEqual(res.body.locales, {default: 1, en: 2, ru: 1});
            });
    });
    it('should estimate 3-user audience with user query', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en', 'ru']}})
                }
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.body.count, 3);
                should.deepEqual(res.body.locales, {default: 0, en: 2, ru: 1});
            });
    });
    it('should validate estimate params', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                app: aid.substr(0, 10),
                platforms: ['x'],
                filter: {
                    user: JSON.stringify({la: {$in: ['en', 'ru']}}).substr(0, 10)
                }
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.errors, ['Incorrect ObjectID for app', 'Value of platforms is invalid', 'filter: Invalid JSON for user']);
            });
    });

    it('should estimate 3-user audience with drill query', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                app: aid,
                platforms,
                filter: {
                    drill: JSON.stringify({
                        app_id: aid,
                        bucket: 'daily',
                        event: '[CLY]_session',
                        method: 'segmentation_users',
                        period: '30days',
                        projectionKey: '',
                        queryObject: JSON.stringify({'up.la': {$in: ['ru', 'en']}})
                    })
                }
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.body.count, 3);
                should.deepEqual(res.body.locales, {default: 0, ru: 1, en: 2});
            });
    });
    it('should create a few simple messages', async() => {
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: true,
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en', 'ru']}})
                },
                contents: [
                    {message: 'message'}
                ],
                triggers: [
                    {kind: 'plain', start: new Date(Date.now() + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
            });
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: true,
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en', 'ru']}})
                },
                contents: [
                    {message: 'notification'},
                    {la: 'ru', title: 'Заголовок'}
                ],
                triggers: [
                    {kind: 'plain', start: new Date(Date.now() + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
            });
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: true,
                app: aid,
                platforms,
                filter: {},
                contents: [
                    {message: 'notification', title: 'title'},
                ],
                triggers: [
                    {kind: 'api', start: new Date(Date.now() + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
            });
    });

    it('should return message table', async() => {
        let message, title, api;

        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 2);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 2);
                message = res.body.aaData.filter(m => m.contents.length === 1 && m.filter.user)[0]._id;
                title = res.body.aaData.filter(m => m.contents.length === 2)[0]._id;
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&auto=true`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 0);
                should.equal(res.body.iTotalDisplayRecords, 0);
                should.deepEqual(res.body.aaData, []);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&api=true`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 1);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                api = res.body.aaData[0]._id;
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&iDisplayStart=1`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 2);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, title);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=message`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, message);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=${encodeURIComponent('заголо')}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, title);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=notif`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, title);
            });
    });
});

