const testUtils = require('../../../test/testUtils'),
    { PLATFORMS_TITLES, FIELDS_TITLES } = require('../api/send'),
    plugins = require('../../pluginManager'),
    // supertest = require('supertest').agent(testUtils.url),
    supertest = require('supertest').agent('http://localhost:3001'),
    should = require('should'),
    { onAppPluginsUpdate } = require('../api/api-push'),
    platforms = ['i', 'a'];

// let aid,
//     app_key,
//     api_key,
let aid = '617e6cf3cd001aac73834e18',
    app_key = '78fb16cbaa61399d0f13f9e96961bd9983a0a416',
    api_key = '4e170a5da90fdf5afd94f85eefdb015b',
    users = {
        did0: {device_id: 'did0', tokens: [{ios_token: 'token_id0', test_mode: 1}], events: [{key: 'push_cart'}, {key: 'push_buy', count: 1, sum: 200, segmentation: {product: 'carrot'}}]},
        did1: {device_id: 'did1', tokens: [{ios_token: 'token_ip1', test_mode: 0}], locale: 'en_US'},
        did2: {device_id: 'did2', tokens: [{android_token: 'token_at2', test_mode: 2}], locale: 'en_US', events: [{key: 'push_cart'}, {key: 'push_buy', count: 1, sum: 200, segmentation: {product: 'carrot'}}]},
        did3: {device_id: 'did3', tokens: [{ios_token: 'token_ia3', test_mode: 2}, {android_token: 'token_ap0', test_mode: 0}], locale: 'ru_RU', events: [{key: 'push_subscribe', segmentation: {topic: 'carrots'}}]},
        did4: {device_id: 'did4', tokens: [{ios_token: 'token_ip4', test_mode: 0}], locale: 'de_DE'}
    };

async function find_pushes(ids) {
    let db = await plugins.dbConnection(),
        pushes = await db.collection('push').find().toArray(),
        filtered = ids.map(id => pushes.filter(p => p.m.toString() === id));
    db.close();
    return filtered;
}

describe('PUSH INTEGRATION TESTS', () => {
    let cohort,
        d1, d2,
        m1, m2, m3, m4, m5;

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
                'plugins.push.i': {
                    _id: db.ObjectID(),
                    type: 'apn_universal',
                    key: 'key',
                    secret: 'secret'
                },
                'plugins.push.a': {
                    _id: db.ObjectID(),
                    type: 'fcm',
                    key: 'key',
                    secret: 'secret'
                },
            }
        });

        db.close();

        await new Promise(res => setTimeout(res, 1000));
    }).timeout(2000);
    // it('mime works with 200', async() => {
    //     await supertest.get(`/o/push/mime?api_key=${api_key}&app_id=${aid}&url=${encodeURIComponent('https://count.ly/images/plugins/push-approver/screenshots/1_push-approver.png')}`)
    //         .expect('Content-Type', /json/)
    //         .expect(res => {
    //             should.equal(res.status, 200);
    //             should.ok(res.body.media);
    //             should.ok(res.body.mediaMime);
    //             should.ok(res.body.mediaSize);
    //             should.equal(res.body.media, 'https://count.ly/images/plugins/push-approver/screenshots/1_push-approver.png');
    //             should.equal(res.body.mediaMime, 'image/png');
    //         });

    //     await new Promise(res => setTimeout(res, 1000));
    // });
    // it('mime follows redirects', async() => {
    //     await supertest.get(`/o/push/mime?api_key=${api_key}&app_id=${aid}&url=${encodeURIComponent('http://count.ly/images/plugins/push-approver/screenshots/1_push-approver.png')}`)
    //         .expect('Content-Type', /json/)
    //         .expect(res => {
    //             should.equal(res.status, 200);
    //             should.ok(res.body.media);
    //             should.ok(res.body.mediaMime);
    //             should.ok(res.body.mediaSize);
    //             should.equal(res.body.media, 'https://count.ly/images/plugins/push-approver/screenshots/1_push-approver.png');
    //             should.equal(res.body.mediaMime, 'image/png');
    //         });

    //     await new Promise(res => setTimeout(res, 1000));
    // });
    // it('mime works with 404', async() => {
    //     await supertest.get(`/o/push/mime?api_key=${api_key}&app_id=${aid}&url=${encodeURIComponent('https://count.ly/images/plugins/push-approver/screenshots/INVALID.png')}`)
    //         .expect('Content-Type', /json/)
    //         .expect(res => {
    //             should.equal(res.status, 400);
    //             should.deepEqual(res.body.errors, ['Invalid status 404']);
    //         });

    //     await new Promise(res => setTimeout(res, 1000));
    // });
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
    if (plugins.isPluginEnabled('cohorts')) {
        it('should create push_cohort cohort', async() => {
            await supertest
                .get(`/i/cohorts/add?api_key=${api_key}&app_id=${aid}&cohort_name=push_cohort&steps=${JSON.stringify([
                    {event: 'push_cohort', type: 'did', period: '7days'}
                ])}`)
                .expect('Content-Type', /json/)
                .expect(res => {
                    should.equal(res.status, 200);
                    cohort = res.body.result;
                });
        });
    }
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
    it('should estimate 5-user audience', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.body.count, 5);
                should.deepEqual(res.body.locales, {default: 1, en: 2, ru: 1, de: 1});
            });
    });
    it('should estimate 3-user audience with user query', async() => {
        await supertest.post(`/o/push/message/estimate?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
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
                demo: 'no-data',
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
                demo: 'no-data',
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
                should.equal(res.status, 200);
                should.equal(res.body.count, 3);
                should.deepEqual(res.body.locales, {default: 0, ru: 1, en: 2});
            });
    });
    it('should create, update, delete & send a draft', async() => {
        let now = Date.now();

        // it shouldn't allow draft creation without app or platforms
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                status: 'draft',
                filter: {
                    user: JSON.stringify({la: {$in: ['ru']}})
                },
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 400);
                should.deepEqual(res.body.errors, ['Missing platforms argument']);
            });

        // ... or with malformed inner fields
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                status: 'draft',
                filter: {
                    user: 2
                },
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 400);
                should.ok(res.body.errors);
            });

        // create a draft without a few fields
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                status: 'draft',
                filter: {
                    user: JSON.stringify({la: {$in: ['ru']}})
                },
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                should.deepEqual(res.body.platforms, platforms);
                should.ok(res.body.filter);
                should.equal(res.body.filter.user, JSON.stringify({la: {$in: ['ru']}}));
                should.ok(res.body.triggers);
                should.equal(res.body.triggers.length, 1);
                should.ok(res.body.contents);
                should.equal(res.body.contents.length, 0);
                should.ok(res.body.info);
                should.ok(res.body.info.appName);
                d1 = res.body;
                console.log('d1 %j', res.body);
            });

        // modify it
        await supertest.post(`/i/push/message/update?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                _id: d1._id,
                status: 'draft',
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en']}})
                },
                contents: [
                    {message: 'message', expiration: 120000},
                ],
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600000)}
                ],
                info: Object.assign(d1.info, {title: 'test message'})
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body._id, d1._id);
                should.equal(res.body.app, aid);
                should.deepEqual(res.body.platforms, platforms);
                should.ok(res.body.filter);
                should.equal(res.body.filter.user, JSON.stringify({la: {$in: ['en']}}));
                should.ok(res.body.triggers);
                should.equal(res.body.triggers.length, 1);
                should.ok(res.body.contents);
                should.equal(res.body.contents.length, 1);
                should.ok(res.body.info);
                should.ok(res.body.info.appName);
                should.equal(res.body.info.title, 'test message');
                d1 = res.body;
                console.log('d1 %j', res.body);
            });


        // delete it
        await supertest.get(`/i/push/message/remove?api_key=${api_key}&app_id=${aid}&_id=${d1._id}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
            });

        // create another draft
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                status: 'draft',
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en']}})
                },
                contents: [
                    {message: 'message', expiration: 120000},
                ],
                triggers: [
                    {kind: 'plain', start: new Date(now + 3400000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                should.deepEqual(res.body.platforms, platforms);
                should.ok(res.body.filter);
                should.equal(res.body.filter.user, JSON.stringify({la: {$in: ['en']}}));
                should.ok(res.body.triggers);
                should.equal(res.body.triggers.length, 1);
                should.ok(res.body.contents);
                should.equal(res.body.contents.length, 1);
                d2 = res.body;
                console.log('d2 %j', res.body);
            });

        // schedule d2
        d2.demo = true;
        d2.status = 'created';
        d2.filter.user = JSON.stringify({la: {$in: ['es']}});
        delete d2.result;
        delete d2.info;
        await supertest.post(`/i/push/message/update?api_key=${api_key}&app_id=${aid}&id=${d2._id}`)
            .send(d2)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body._id, d2._id);
                should.equal(res.body.status, 'created');
                should.equal(res.body.filter.user, JSON.stringify({la: {$in: ['es']}}));
            });
    });
    // it('should send test messages', async() => {
    //     // test message
    //     await supertest.post(`/i/push/message/test?api_key=${api_key}&app_id=${aid}`)
    //         .send({
    //             demo: 'no-data',
    //             app: aid,
    //             platforms,
    //             filter: {
    //                 user: JSON.stringify({la: {$in: ['de']}})
    //             },
    //             contents: [
    //                 {message: 'asd', title: 'asd', expiration: 120000},
    //             ],
    //             triggers: [
    //                 {kind: 'plain', start: new Date(Date.now() + 5000)},
    //             ]
    //         })
    //         .expect('Content-Type', /json/)
    //         .expect(res => {
    //             should.equal(res.status, 200);
    //             should.ok(res.body.result, 1);
    //             should.equal(res.body.result.total, 1);
    //             should.equal(res.body.result.processed, 1);
    //             should.equal(res.body.result.errored, 1);
    //             should.equal(res.body.result.subs.i.total, 1);
    //             should.equal(res.body.result.subs.i.errored, 1);
    //             should.equal(res.body.result.subs.i.subs.en.total, 1);
    //             should.equal(res.body.result.subs.i.subs.en.errored, 1);
    //         });

    //     // // test message
    //     // await supertest.post(`/i/push/message/test?api_key=${api_key}&app_id=${aid}`)
    //     //     .send({
    //     //         demo: 'no-data',
    //     //         app: aid,
    //     //         platforms,
    //     //         filter: {
    //     //             user: JSON.stringify({la: {$in: ['de']}})
    //     //         },
    //     //         contents: [
    //     //             {message: 'asd', title: 'asd', expiration: 120000},
    //     //         ],
    //     //         triggers: [
    //     //             {kind: 'plain', start: new Date(Date.now() + 5000)},
    //     //         ]
    //     //     })
    //     //     .expect('Content-Type', /json/)
    //     //     .expect(res => {
    //     //         should.equal(res.status, 400);
    //     //         should.deepEqual(res.body.errors, ['Please define test users in Push plugin configuration']);
    //     //     });
    // }).timeout(100000);
    it('should create a few simple messages', async() => {
        let now = Date.now();

        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en']}})
                },
                contents: [
                    {message: 'message', expiration: 120000},
                ],
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                m1 = res.body;
                console.log('m1 %s', res.body._id);
            });
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['en', 'ru']}})
                },
                contents: [
                    {message: 'notification', expiration: 120000},
                    {la: 'ru', title: 'Заголовок'}
                ],
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600001)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                m2 = res.body;
                console.log('m2 %s', res.body._id);
            });
        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                filter: {},
                contents: [
                    {message: 'notification', title: 'title', expiration: 120000},
                ],
                triggers: [
                    {kind: 'api', start: new Date(now), end: new Date(now + 3600000)},
                    {kind: 'cohort', start: new Date(now), cohorts: [cohort], entry: true},
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                m3 = res.body;
                console.log('m3 %s', res.body._id);
            });

        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
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
                        queryObject: JSON.stringify({'up.x': {$in: ['non', 'existant']}})
                    })
                },
                contents: [
                    {message: 'notification', title: 'title', expiration: 120000},
                ],
                triggers: [
                    {kind: 'plain', start: new Date(now + 3600002)},
                    {kind: 'event', start: new Date(now + 100), events: ['push_buy']},
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                m4 = res.body;
                console.log('m4 %s', res.body._id);
            });

        await supertest.post(`/i/push/message/create?api_key=${api_key}&app_id=${aid}`)
            .send({
                demo: 'no-data',
                app: aid,
                platforms,
                filter: {
                    user: JSON.stringify({la: {$in: ['de']}})
                },
                contents: [
                    {message: 'asd', title: 'asd', expiration: 120000},
                ],
                triggers: [
                    {kind: 'plain', start: new Date(Date.now() + 5000)},
                ]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.ok(res.body._id);
                should.equal(res.body.app, aid);
                m5 = res.body;
                console.log('m5 %s', res.body._id);
            });

        // wait for schedule jobs to run
        await new Promise(res => setTimeout(res, 5000));

        let db = await plugins.dbConnection(),
            users = await db.collection(`app_users${aid}`).find().toArray(),
            uids = {},
            [pushes1, pushes2, pushes3, pushes4, pushes5] = await find_pushes([m1._id, m2._id, m3._id, m4._id, m5._id]);

        should.equal(users.length, 5);
        users.forEach(u => uids[u.did] = u.uid);

        should.equal(pushes1.length, 2);
        should.equal(pushes1.filter(p => p.u === uids.did1 || p.u === uids.did2).length, 2);

        should.equal(pushes2.length, 4);
        should.equal(pushes2.filter(p => p.u === uids.did1 || p.u === uids.did2 || p.u === uids.did3).length, 4);
        should.equal(pushes2.filter(p => p.u === uids.did3).length, 2);

        should.equal(pushes3.length, 0);
        should.equal(pushes4.length, 0);
        should.equal(pushes5.length, 1);

        let txDate = now + 1000;
        await supertest.post(`/i/push/message/push?api_key=${api_key}&app_id=${aid}`)
            .send({
                _id: m3._id,
                start: txDate + 3600000,
                filter: {
                    user: JSON.stringify({uid: uids.did0})
                },
                contents: [{
                    message: 'hello'
                }]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 400);
                should.deepEqual(res.body.errors, ['Message end date is earlier than push date']);
            });
        // push tx message
        await supertest.post(`/i/push/message/push?api_key=${api_key}&app_id=${aid}`)
            .send({
                _id: m3._id,
                start: txDate,
                filter: {
                    user: JSON.stringify({uid: uids.did0})
                },
                contents: [{
                    message: 'hello'
                }]
            })
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.total, 1);
                should.equal(res.body.next, new Date(Math.floor(txDate / 1000) * 1000).toISOString());
            });

        [pushes1, pushes2, pushes3, pushes4] = await find_pushes([m1._id, m2._id, m3._id, m4._id]);
        should.equal(pushes1.length, 2);
        should.equal(pushes2.length, 4);
        should.equal(pushes3.length, 1);
        should.equal(pushes4.length, 0);

        // push evented push
        await supertest.post(`/i?app_key=${app_key}&device_id=did1`)
            .send({
                device_id: 'did1',
                events: [
                    {key: 'push_buy', timestamp: Math.ceil((now + 1000) / 1000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(200);

        // wait for event hook to insert
        await new Promise(res => setTimeout(res, 1000));

        [pushes1, pushes2, pushes3, pushes4] = await find_pushes([m1._id, m2._id, m3._id, m4._id]);
        should.equal(pushes1.length, 2);
        should.equal(pushes2.length, 4);
        should.equal(pushes3.length, 1);
        should.equal(pushes4.length, 1);

        // push cohorted push
        await supertest.post(`/i?app_key=${app_key}&device_id=did1`)
            .send({
                device_id: 'did1',
                events: [
                    {key: 'push_cohort', timestamp: Math.ceil((now + 1000) / 1000)}
                ]
            })
            .expect('Content-Type', /json/)
            .expect(200);

        // regenerate cohort
        await supertest
            .get(`/o?method=cohort&generate=1&cohort=${cohort}&api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                cohort = res.body.result;
            });
        // wait for cohort task to finish
        await new Promise(res => setTimeout(res, 1000));

        [pushes1, pushes2, pushes3, pushes4] = await find_pushes([m1._id, m2._id, m3._id, m4._id]);
        should.equal(pushes1.length, 2);
        should.equal(pushes2.length, 4);
        should.equal(pushes3.length, 2);
        should.equal(pushes4.length, 1);

        // simulate actioned for m5
        await supertest.post(`/i?app_key=${app_key}&device_id=${uids.did4.device_id}`)
            .send({
                device_id: uids.did4.device_id,
                events: [
                    {key: '[CLY]_push_action', count: 1, segmentation: {i: m5._id, p: 'i', b: 0}, timestamp: Date.now()}
                ],
            })
            .expect('Content-Type', /json/)
            .expect(200);

        await new Promise(res => setTimeout(res, 20000));

        await supertest.get(`/o/push/message/${m5._id}?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body._id, m5._id);
                should.equal(res.body.app, aid);
                should.equal(res.body.result.total, 1);
                should.equal(res.body.result.actioned, 1);
                should.equal(res.body.result.subs.i.total, 1);
                should.equal(res.body.result.subs.i.actioned, 1);
                m5 = res.body;
                console.log('m4 %s', res.body._id);
            });

        // [pushes1, pushes2, pushes3, pushes4] = await find_pushes([m1._id, m2._id, m3._id, m4._id]);
        // should.equal(pushes1.length, 2);
        // should.equal(pushes2.length, 4);
        // should.equal(pushes3.length, 1);
        // should.equal(pushes4.length, 1);

        db.close();
    }).timeout(100000);

    it('should return 5-user dashboard with actioned', async() => {
        await supertest.get(`/o/push/dashboard?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.deepEqual(res.body.enabled, {total: 5, i: 4, a: 2, t: 0, h: 0});
                should.deepEqual(res.body.platforms, PLATFORMS_TITLES);
                should.deepEqual(res.body.tokens, FIELDS_TITLES);
                should.deepEqual(res.body.actions.total, 1);
                should.deepEqual(res.body.actions.monthly.data.reduce((a, b) => a + b), 1);
                should.deepEqual(res.body.actions.weekly.data.reduce((a, b) => a + b), 1);
                should.deepEqual(res.body.actions.platforms.a.total, 0);
                should.deepEqual(res.body.actions.platforms.t.total, 0);
                should.deepEqual(res.body.actions.platforms.i.total, 1);
                should.deepEqual(res.body.actions.platforms.i.monthly.data.reduce((a, b) => a + b), 1);
                should.deepEqual(res.body.actions.platforms.i.weekly.data.reduce((a, b) => a + b), 1);
            });
    });

    it('should return message table', async() => {
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 5);
                should.equal(res.body.iTotalDisplayRecords, 5);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 5);
                should.equal(res.body.aaData.filter(m => m._id === m1._id).length, 1);
                should.equal(res.body.aaData.filter(m => m._id === m2._id).length, 1);
                should.equal(res.body.aaData.filter(m => m._id === m4._id).length, 1);
                should.equal(res.body.aaData.filter(m => m._id === m5._id).length, 1);
                should.equal(res.body.aaData.filter(m => m._id === d2._id).length, 1);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&auto=true`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 2);
                should.equal(res.body.iTotalDisplayRecords, 2);
                should.equal(res.body.aaData[0]._id, m4._id);
                should.equal(res.body.aaData[1]._id, m3._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&api=true`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 1);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, m3._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&iDisplayStart=1`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 5);
                should.equal(res.body.iTotalDisplayRecords, 5);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 4);
                should.equal(res.body.aaData[0]._id, m2._id);
                should.equal(res.body.aaData[1]._id, m1._id);
                should.equal(res.body.aaData[2]._id, d2._id);
                should.equal(res.body.aaData[3]._id, m5._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=message`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 5);
                should.equal(res.body.iTotalDisplayRecords, 2);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 2);
                should.equal(res.body.aaData[0]._id, m1._id);
                should.equal(res.body.aaData[1]._id, d2._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=${encodeURIComponent('заголо')}`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 5);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, m2._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&sSearch=notif`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 5);
                should.equal(res.body.iTotalDisplayRecords, 2);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 2);
                should.equal(res.body.aaData[0]._id, m4._id);
                should.equal(res.body.aaData[1]._id, m2._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&api=true&sSearch=notif`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 1);
                should.equal(res.body.iTotalDisplayRecords, 1);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 1);
                should.equal(res.body.aaData[0]._id, m3._id);
            });
        await supertest.get(`/o/push/message/all?api_key=${api_key}&app_id=${aid}&api=true&sSearch=notiffffffff`)
            .expect('Content-Type', /json/)
            .expect(res => {
                should.equal(res.status, 200);
                should.equal(res.body.iTotalRecords, 1);
                should.equal(res.body.iTotalDisplayRecords, 0);
                should.ok(res.body.aaData);
                should.equal(res.body.aaData.length, 0);
            });
    });
});

