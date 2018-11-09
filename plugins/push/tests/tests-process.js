const should = require('should'),
    ST = require('../api/parts/store.js'),
    pluginManager = require('../../pluginManager.js'),
    db = pluginManager.singleDefaultConnection(),
    M = require('../../../api/parts/jobs/manager.js'),
    N = require('../api/parts/note.js'),
    C = require('../api/parts/credentials.js'),
    ProcessJob = require('../api/jobs/process.js'),
    ScheduleJob = require('../api/jobs/schedule.js'),
    momenttz = require('moment-timezone');

let app, note1, note2, note3, credAPN, credFCM, USERS;

class ResourceMock {
    constructor(_id, name, args, db) {
    }

    async send(msgs) {
        if (this.failImmediately) {
            throw new Error('failImmediately');
        }
        else if (this.failAt !== undefined) {
            return [
                msgs.slice(0, this.failAt).map(this.messageMapper),
                this.failAtError || new Error('failAt')
            ];
        }
        else {
            return [
                msgs.map(this.messageMapper)
            ];
        }
    }
}

class ProcessJobMock extends ProcessJob {
    reschedule(date) {
        this.rescheduled = date;
    }

    _runWithRetries(db) {
        return this.retryPolicy().run(this._run.bind(this, db));
    }

    _run(db) {
        return new Promise((res, rej) => {
            this.run(db, (err) => {
                err ? rej(err) : res();
            });
        });
    }
}

describe('PROCESS', () => {
    let store, loader,
        date = momenttz.tz('2017-12-01 15:00', 'Europe/Moscow').toDate();

    it('should store full app with tz correctly', async() => {
        store = new ST.Store(credAPN, 'ip', db, app);
        loader = new ST.Loader(credAPN, 'ip', db, app);

        note1.date = date;
        note1.tz = -180;

        await store.pushApp(note1);

        let now = momenttz.tz('2017-12-01 14:15', 'Europe/Moscow').toDate();

        let count = await loader.count(now.getTime());
        count.should.equal(0);

        now = momenttz.tz('2017-12-01 15:15', 'Europe/Moscow').toDate(),
        count = await loader.count(now.getTime());
        count.should.equal(2);

        now = momenttz.tz('2017-12-01 16:15', 'Europe/Moscow').toDate(),
        count = await loader.count(now.getTime());
        count.should.equal(4);
    });

    it('should process full app with tz for one message', async() => {
        store = new ST.Store(credAPN, 'ip', db, app);
        loader = new ST.Loader(credAPN, 'ip', db, app);

        note1.date = date;
        note1.tz = -180;

        await store.pushApp(note1);

        let now = momenttz.tz('2017-12-01 16:01', 'Europe/Moscow').toDate(),
            job = new ProcessJobMock('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}),
            doneRun = false;

        console.log(job.data, app._id, credAPN._id);

        job._json._id = new db.ObjectID();

        // run first time
        job.now = () => now.getTime();
        job.resource = new ResourceMock();
        job.resource.messageMapper = msg => [msg._id, 200];

        let count = await loader.count(now.getTime());
        count.should.equal(4);

        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);

        note1 = (await loader.notes([note1._id]))[note1._id.toString()];
        note1.result.processed.should.equal(4);
        note1.result.sent.should.equal(2);
        note1.result.errors.should.equal(2);
        note1.result.errorCodes.skiptz.should.equal(2);
        note1.result.status.should.equal(N.Status.NotCreated);

        // run second time with the same date
        count = await loader.count(now.getTime());
        count.should.equal(0);

        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);

        note1 = (await loader.notes([note1._id]))[note1._id.toString()];
        note1.result.processed.should.equal(4);
        note1.result.sent.should.equal(2);
        note1.result.errors.should.equal(2);
        note1.result.errorCodes.skiptz.should.equal(2);
        note1.result.status.should.equal(N.Status.NotCreated);

        // run third time with the date +1 hour
        now = momenttz.tz('2017-12-01 17:01', 'Europe/Moscow').toDate(),
        count = await loader.count(now.getTime());
        count.should.equal(1);

        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);

        note1 = (await loader.notes([note1._id]))[note1._id.toString()];
        note1.result.processed.should.equal(5);
        note1.result.sent.should.equal(3);
        note1.result.errors.should.equal(2);
        note1.result.errorCodes.skiptz.should.equal(2);
        note1.result.status.should.equal(N.Status.NotCreated);
    });

    it('should process multiple notes & expired tokens', async() => {
        store = new ST.Store(credAPN, 'ip', db, app);
        loader = new ST.Loader(credAPN, 'ip', db, app);

        // ru is invalidated at first sent
        // tk is sent at first
        // --- rescheduled at 15:20 ---
        // --- but running at 15:35 ---
        // lv is sent at tk time, but token is reset
        // ru 2 is invalidated again at second time
        // tk 2 i sent again
        await store.pushFetched(note1, ['ru', 'tk'], momenttz.tz('2017-12-01 15:10', 'Europe/Moscow').toDate().getTime());
        await store.pushFetched(note2, ['lv'], 	 	momenttz.tz('2017-12-01 15:20', 'Europe/Moscow').toDate().getTime());
        await store.pushFetched(note3, ['ru', 'tk'], momenttz.tz('2017-12-01 15:30', 'Europe/Moscow').toDate().getTime());

        let now = momenttz.tz('2017-12-01 15:10:01', 'Europe/Moscow').toDate(),
            job = new ProcessJobMock('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}),
            doneRun = false;

        job._json._id = new db.ObjectID();

        job.now = () => now.getTime();
        job.resource = new ResourceMock();

        let TKLV = 'ios_lv_2';
        job.resource.messageMapper = msg => {
            if (msg.t === USERS.ru.tkip) {
                return [msg._id, -200];
            }
            if (msg.t === USERS.lv.tkip) {
                return [msg._id, -200, '', TKLV];
            }
            return [msg._id, 200];
        };

        let count = await loader.count(now.getTime() + 3600000);
        count.should.equal(5);

        // run first time
        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);
        doneRun = false;

        let notes = await loader.notes([note1._id, note2._id, note3._id]),
            users = await loader.users({uid: {$in: ['ru', 'tk', 'lv']}}),
            uru = users.filter(u => u.uid === 'ru')[0], utk = users.filter(u => u.uid === 'tk')[0], ulv = users.filter(u => u.uid === 'lv')[0];

        note1 = notes[note1._id.toString()];
        note1.result.processed.should.equal(2);
        note1.result.sent.should.equal(1);
        note1.result.errors.should.equal(0);
        note1.result.status.should.equal(N.Status.Done);

        note2 = notes[note2._id.toString()];
        note2.result.processed.should.equal(0);
        note2.result.sent.should.equal(0);
        note2.result.errors.should.equal(0);
        note2.result.status.should.equal(N.Status.NotCreated);

        note3 = notes[note3._id.toString()];
        note3.result.processed.should.equal(0);
        note3.result.sent.should.equal(0);
        note3.result.errors.should.equal(0);
        note3.result.status.should.equal(N.Status.NotCreated);

        should.not.exist(uru.tkip);
        utk.tkip.should.equal(true);
        utk.tk.ip.should.equal(USERS.tk.tkip);
        ulv.tk.ip.should.equal(USERS.lv.tkip);
        // uru.messages[0][1].should.equal()
        // 

        now = momenttz.tz('2017-12-01 15:30:01', 'Europe/Moscow').toDate();
        count = await loader.count(now.getTime() + 3600000);
        count.should.equal(3);

        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);
        doneRun = false;

        notes = await loader.notes([note1._id, note2._id, note3._id]);
        users = await loader.users({uid: {$in: ['ru', 'tk', 'lv']}});
        uru = users.filter(u => u.uid === 'ru')[0], utk = users.filter(u => u.uid === 'tk')[0], ulv = users.filter(u => u.uid === 'lv')[0];

        note1 = notes[note1._id.toString()];
        note1.result.processed.should.equal(2);
        note1.result.sent.should.equal(1);
        note1.result.errors.should.equal(0);
        note1.result.status.should.equal(N.Status.Done);

        note2 = notes[note2._id.toString()];
        note2.result.processed.should.equal(1);
        note2.result.sent.should.equal(1);
        note2.result.errors.should.equal(0);
        note2.result.status.should.equal(N.Status.Done);

        note3 = notes[note3._id.toString()];
        note3.result.processed.should.equal(2);
        note3.result.sent.should.equal(1);
        note3.result.errors.should.equal(0);
        note3.result.status.should.equal(N.Status.Done);

        should.not.exist(uru.tkip);
        utk.tkip.should.equal(true);
        ulv.tkip.should.equal(true);
        utk.tk.ip.should.equal(USERS.tk.tkip);
        ulv.tk.ip.should.equal(TKLV);

        await store.pushFetched(new N.Note(note3), ['lv'], momenttz.tz('2017-12-01 15:40', 'Europe/Moscow').toDate().getTime());
        notes = await loader.notes([note3._id]);
        note3 = notes[note3._id.toString()];
        note3.result.status.should.equal(N.Status.InProcessing);
        note3.result.processed.should.equal(2);
        note3.result.sent.should.equal(1);
        note3.result.errors.should.equal(0);

        now = momenttz.tz('2017-12-01 15:40:01', 'Europe/Moscow').toDate();
        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.equal(true);

        notes = await loader.notes([note3._id]);
        note3 = notes[note3._id.toString()];
        note3.result.status.should.equal(N.Status.Done);
        note3.result.processed.should.equal(3);
        note3.result.sent.should.equal(2);
        note3.result.errors.should.equal(0);

    });


    it('should handle errors without retries', async() => {
        store = new ST.Store(credAPN, 'ip', db, app);
        loader = new ST.Loader(credAPN, 'ip', db, app);

        // ru is sent
        // tk is sent with error 400
        // gb is not sent with resource error
        // gb is not sent with resource error
        await store.pushFetched(note1, ['ru', 'tk', 'gb', 'es'], momenttz.tz('2017-12-01 15:10', 'Europe/Moscow').toDate().getTime());

        let now = momenttz.tz('2017-12-01 15:10:01', 'Europe/Moscow').toDate(),
            job = new ProcessJobMock('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}),
            doneRun = false;

        job._json._id = new db.ObjectID();

        job.now = () => now.getTime();
        job.resource = new ResourceMock();

        job.resource.messageMapper = msg => {
            if (msg.t === USERS.ru.tkip) {
                return [msg._id, 200];
            }
            if (msg.t === USERS.tk.tkip) {
                return [msg._id, 400, 'InvalidMessage'];
            }
            if (msg.t === USERS.gb.tkip) {
                return new Error('badthing');
            }
            if (msg.t === USERS.es.tkip) {
                return new Error('badthing');
            }
            return [msg._id, 200];
        };
        job.resource.failAt = 2;

        let count = await loader.count(now.getTime() + 3600000);
        count.should.equal(4);

        // run first time
        await job.prepare(null, db);
        await job.run(db, (err) => {
            if (err) {
                console.log(err);
            }
            doneRun = err || true;
        });

        doneRun.should.be.Object();
        doneRun = false;

        let notes = await loader.notes([note1._id, note2._id, note3._id]),
            users = await loader.users({uid: {$in: ['ru', 'tk', 'lv']}}),
            uru = users.filter(u => u.uid === 'ru')[0], utk = users.filter(u => u.uid === 'tk')[0], ulv = users.filter(u => u.uid === 'lv')[0];

        note1 = notes[note1._id.toString()];
        note1.result.processed.should.equal(2);
        note1.result.sent.should.equal(1);
        note1.result.errors.should.equal(1);
        note1.result.errorCodes.i['400+InvalidMessage'].should.equal(1);
        note1.result.status.should.equal(N.Status.NotCreated);

        count = await loader.count(now.getTime() + 3600000);
        count.should.equal(2);
    });


    it('should count with StoreGroup', async() => {
        let sg = new ST.StoreGroup(db),
            count = await sg.count(note1, [app]);

        count.length.should.equal(2);
        Object.keys(count[0]).length.should.equal(1);
        Object.keys(count[1]).length.should.equal(7);
        count[0].ip.should.equal(7);
        count[1].unknown.should.equal(1);
    });

    it('should count test users with StoreGroup', async() => {
        note1.test = true;
        app.plugins.push.a = {_id: credFCM._id, type: 'fcm'};

        let sg = new ST.StoreGroup(db),
            count = await sg.count(note1, [app]);

        count.length.should.equal(2);
        Object.keys(count[0]).length.should.equal(3);
        Object.keys(count[1]).length.should.equal(1);
        count[0].at.should.equal(1);
        count[0].ia.should.equal(0);
        count[0].id.should.equal(0);
        count[1].ca.should.equal(1);
    });


    it('should count with StoreGroup & multiple creds', async() => {
        app.plugins.push.a = {_id: credFCM._id, type: 'fcm'};

        let sg = new ST.StoreGroup(db),
            count = await sg.count(note1, [app]);

        count.length.should.equal(2);
        Object.keys(count[0]).length.should.equal(2);
        Object.keys(count[1]).length.should.equal(7);
        count[0].ip.should.equal(7);
        count[0].ap.should.equal(3);
        count[1].unknown.should.equal(1);
        count[1].us.should.equal(2);
        Object.values(count[1]).reduce((a, b) => a + b).should.equal(10);
    });

    it('should schedule correctly', async() => {
        app.plugins.push.a = {_id: credFCM._id, type: 'fcm'};

        let schedule = new ScheduleJob('push:schedule', {mid: note1._id});

        await schedule.prepare(null, db, [app]);
        await schedule.run(db, () => {});
    });

    beforeEach((done) => {
        credAPN = new C.Credentials(new db.ObjectID());
        credFCM = new C.Credentials(new db.ObjectID());
        app = {_id: db.ObjectID(), timezone: 'Europe/Berlin', plugins: {push: {i: {_id: credAPN._id.toString(), type: 'apn_token'}}}};
        note1 = new N.Note({
            _id: db.ObjectID(),
            apps: [app._id],
            appNames: [],
            platforms: ['i', 'a'],
            data: {a: 1},
            test: false
        });
        note2 = new N.Note({
            _id: db.ObjectID(),
            apps: [app._id],
            appNames: [],
            platforms: ['i', 'a'],
            data: {a: 2},
            test: false
        });
        note3 = new N.Note({
            _id: db.ObjectID(),
            apps: [app._id],
            appNames: [],
            platforms: ['i', 'a'],
            data: {a: 3},
            test: false
        });
        USERS = {
            'ru': {tkip: 'ios_ru', la: 'ru', tz: 180},
            'lv': {tkip: 'ios_lv', la: 'lv', tz: 120},
            'tk': {tkip: 'ios_tk', la: 'tk', tz: 180},
            'gb': {tkip: 'ios_gb', la: 'gb', tz: 0},
            'us': {tkip: 'ios_us', la: 'us', tz: -420},
            'es': {tkip: 'ios_es', la: 'es', tz: 60},
            'no': {tkip: 'ios_no'},
            'tk_a': {tkap: 'android_tk', la: 'tk', tz: 180},
            'gb_a': {tkap: 'android_gb', la: 'gb', tz: 0},
            'us_a': {tkap: 'android_us', la: 'us', tz: -420},
            'ca_a': {tkat: 'android_ca', la: 'ca', tz: -420},
        };

        credAPN.platform = N.Platform.IOS;
        credAPN.type = C.CRED_TYPE[N.Platform.IOS].TOKEN;
        credAPN.key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ1N1V2xDdU1QR2JTRkpvWXE3bjQwdmh1d1lBc0dpZDAybDRUbWcxcHN1U09nQ2dZSUtvWkl6ajBEQVFlaFJBTkNBQVFqUm9YZDN3TEk4cE0wWStCbTRqVGFZMG11REpQd0IzekF4M3RYQ043SWFpS1lmTzJNSkZIZmI0cEhJMnZVTWI5a3dPa0VHckNObVc0UklvdGh5dnhQCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';
        credAPN.secret = '7GH992U9Z7[CLY]EQ43JUC8GV[CLY]ly.count.Countly-Tester';

        credFCM.platform = N.Platform.ANDROID;
        credFCM.type = C.CRED_TYPE[N.Platform.ANDROID].FCM;
        credFCM.key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ1N1V2xDdU1QR2JTRkpvWXE3bjQwdmh1d1lBc0dpZDAybDRUbWcxcHN1U09nQ2dZSUtvWkl6ajBEQVFlaFJBTkNBQVFqUm9YZDN3TEk4cE0wWStCbTRqVGFZMG11REpQd0IzekF4M3RYQ043SWFpS1lmTzJNSkZIZmI0cEhJMnZVTWI5a3dPa0VHckNObVc0UklvdGh5dnhQCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';

        db.collection('messages').insertMany([note1.toJSON(), note2.toJSON(), note3.toJSON()], (err) => {
            err ? done(err) : db.collection('credentials').insertMany([credAPN, credFCM], err => {
                if (err) {
                    return done(err);
                }
                db.collection(`app_users${app._id}`).insertMany(Object.keys(USERS).map(uid => {
                    let u = {
                        uid: uid,
                        tk: {
                        },
                        la: USERS[uid].la
                    };

                    if (USERS[uid].tkip) {
                        u.tk.ip = USERS[uid].tkip;
                        u.tkip = true;
                    }
                    if (USERS[uid].tkap) {
                        u.tk.ap = USERS[uid].tkap;
                        u.tkap = true;
                    }
                    if (USERS[uid].tkat) {
                        u.tk.at = USERS[uid].tkat;
                        u.tkat = true;
                    }
                    if (USERS[uid].tz !== undefined) {
                        u.tz = USERS[uid].tz;
                    }
                    return u;
                }), err => {
                    if (err) {
                        return done(err);
                    }
                    db.collection('apps').insertOne(app, done);
                });
            });
        });
    });

    afterEach(() => {
        return Promise.all([
            store ? store.clear() : Promise.resolve(),
            loader ? loader.clear() : Promise.resolve(),
            new Promise((res, rej) => {
                db.collection('messages').deleteMany({_id: {$in: [note1._id, note2._id, note3._id]}}, (err) => {
                    if (err) {
                        rej(err);
                    }
                    else {
                        db.collection('credentials').deleteMany({_id: {$in: [credAPN._id, credFCM._id]}}, err => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                db.collection(`app_users${app._id}`).drop(() => {
                                    db.collection('apps').deleteOne({_id: app._id}, res);
                                });
                            }
                        });

                    }
                });
            })
            // Promise.resolve()
        ]);
    });

    before(() => {
        // await wait(1000);
        M.classes['push:process'] = ProcessJobMock;
        M.types.push('push:process');
    });

    after(done => {
        Promise.all([
            store ? store.clear() : Promise.resolve(),
            loader ? loader.clear() : Promise.resolve()
        ]).then(() => {
            db.close();
            done();
        });
    });

});