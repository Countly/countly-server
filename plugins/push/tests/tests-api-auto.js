const should = require('should'),
    ST = require('../api/parts/store.js'),
    common = require('../../../api/utils/common.js'),
    pluginManager = require('../../pluginManager.js'),
    db = pluginManager.singleDefaultConnection(),
    N = require('../api/parts/note.js'),
    C = require('../api/parts/credentials.js'),
    E = require('../api/parts/endpoints.js'),
    ProcessJob = require('../api/jobs/process.js'),
    ScheduleJob = require('../api/jobs/schedule.js'),
    momenttz = require('moment-timezone');

let app, credAPN, credFCM, USERS,
    cohort,
    noteAuto,
    sendingDate,
    returnOutput, returnMessage;

class ResourceMock {
    constructor(/*_id, name, args, db*/) {
    }

    async send(msgs) {
        if (this.failImmediately) {
            throw new Error(this.failImmediately);
        }
        else if (this.failAt !== undefined) {
            return [
                msgs.slice(0, this.failAt).map(this.messageMapper),
                this.failAtError || new Error('failAt')
            ];
        }
        else if (this.messageMapper) {
            return [
                msgs.map(this.messageMapper)
            ];
        }
        else {
            return [
                msgs.map(m => [m._id, 200])
            ];
        }
    }
}

class ProcessJobMock extends ProcessJob {
    _run(db) {
        return new Promise(res => {
            this.run(db, res);
        });
    }
}

let jobFind = (name, data, Constr) => {
    return new Promise((res, rej) => {
        let q = {name: name, status: 0};
        if (data) {
            q.data = data;
        }
        db.collection('jobs').findOne(q, (err, job) => err ? rej(err) : res(job ? new Constr(job) : undefined));
    });
};

let collectionCount = (name) => {
    return new Promise((res, rej) => {
        db.collection(name).count((err, count) => err ? rej(err) : res(count));
    });
};

let collectionLoad = (name) => {
    return new Promise((res, rej) => {
        db.collection(name).find().toArray((err, records) => err ? rej(err) : res(records));
    });
};

describe('PUSH API: auto messages', () => {
    it('should require note cohorts', async() => {
        noteAuto.date = Date.now() - 3600000 * 24;
        let json = JSON.parse(JSON.stringify(noteAuto));
        delete json.autoCohorts;
        let [note, prepared, apps] = await E.validate({qstring: {args: json}});
        note.should.be.Object();
        should.exist(note.error);
        note.error.should.equal('Cohorts are required for auto messages');
    });

    it('should check note cohorts for existence', async() => {
        let json = JSON.parse(JSON.stringify(noteAuto));
        json.autoCohorts[0] = 'wrong';
        let [note, prepared, apps] = await E.validate({qstring: {args: json}});
        note.should.be.Object();
        should.exist(note.error);
        note.error.should.equal('Cohort not found');
    });

    it('should validate correctly', async() => {
        let [note, prepared, apps] = await E.validate({qstring: {args: noteAuto}});
        (note instanceof N.Note).should.equal(true);
        Array.isArray(apps).should.equal(true);
        should.not.exist(prepared);
    });

    it('should create & schedule note correctly without preparation', async() => {
        await E.create({qstring: {args: noteAuto}, res: {}, member: {global_admin: [app._id.toString()]}});
        let json = common.returnOutput;
        json.should.be.Object();
        should.exist(json._id);
        should.not.exist(json.error);
        json.result.status.should.equal(N.Status.READY);

        let note = await N.Note.load(db, json._id);
        should.exist(note);
        should.exist(note.date);
        should.exist(note.result);
        note.test.should.be.false();
        note.auto.should.be.true();
        note.apps.length.should.equal(noteAuto.apps.length);
        note.appNames.length.should.equal(noteAuto.apps.length);
        note.appNames[0].should.equal(app.name);
        note.platforms.length.should.equal(noteAuto.platforms.length);
        note.data.a.should.equal(noteAuto.data.a);
        note.result.total.should.equal(0);
        note.result.status.should.equal(N.Status.READY);

        let sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            store = stores[0];

        let counts = await Promise.all(stores.map(store => collectionCount(store.collectionName)));
        counts.reduce((a, b) => a + b, 0).should.equal(0);
    });

    it('should store 3 users in ip collection', async() => {
        let note = await N.Note.load(db, noteAuto._id),
            sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            storeI = stores.filter(s => s.field === 'ip')[0],
            storeA = stores.filter(s => s.field === 'ap')[0];
        stores.length.should.equal(2);

        // check some validation logic
        let count = await E.onCohort(false, cohort, ['ru']);
        count.should.equal(0);
        count = await E.onCohort(false, {_id: 'some', app_id: new db.ObjectID()}, ['ru']);
        count.should.equal(0);
        count = await E.onCohort(true, {_id: 'some', app_id: app._id}, ['ru']);
        count.should.equal(0);

        // add ru
        count = await E.onCohort(true, cohort, ['ru']);
        count.should.equal(1);

        let users = await collectionLoad(storeI.collectionName);
        users.length.should.equal(1);
        note = await N.Note.load(db, noteAuto._id);
        note.result.total.should.equal(1);
        let ru = users[0];
        ru._id.should.equal(0);
        ru.u.should.equal('ru');
        ru.t.should.equal(USERS.ru.tkip);
        ru.n.toString().should.equal(note._id.toString());
        (ru.d > Date.now()).should.be.true();
        (ru.d > Date.now() + noteAuto.autoDelay - 60000).should.be.true();
        (ru.d < Date.now() + noteAuto.autoDelay + 60000).should.be.true();
        sendingDate = ru.d;

        // try adding ru again - shouldn't do it
        count = await E.onCohort(true, cohort, ['ru']);
        count.should.equal(0);
        note = await N.Note.load(db, noteAuto._id);
        note.result.total.should.equal(1);
        users = await collectionLoad(storeI.collectionName);
        users.length.should.equal(1);
        (users[0].d > ru.d).should.be.true();
        (users[0].d - ru.d < 1000).should.be.true();
        ru = users[0];
        ru._id.should.equal(1);

        // add gb & es
        count = await E.onCohort(true, cohort, ['gb', 'es']);
        count.should.equal(2);
        note = await N.Note.load(db, noteAuto._id);
        note.result.total.should.equal(3);

        users = await collectionLoad(storeI.collectionName);
        users.length.should.equal(3);
        let gb = users.filter(u => u.u === 'gb')[0],
            es = users.filter(u => u.u === 'es')[0];
        gb._id.should.equal(2);
        gb.u.should.equal('gb');
        gb.t.should.equal(USERS.gb.tkip);
        gb.n.toString().should.equal(note._id.toString());
        (gb.d > Date.now()).should.be.true();
        (gb.d > Date.now() + noteAuto.autoDelay - 60000).should.be.true();
        (gb.d < Date.now() + noteAuto.autoDelay + 60000).should.be.true();
        es._id.should.equal(3);
        es.u.should.equal('es');
        es.t.should.equal(USERS.es.tkip);
        es.n.toString().should.equal(note._id.toString());
        (es.d > Date.now()).should.be.true();
        (es.d > Date.now() + noteAuto.autoDelay - 60000).should.be.true();
        (es.d < Date.now() + noteAuto.autoDelay + 60000).should.be.true();

        (es.d > ru.d).should.be.true();

        let job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob);
        should.not.exist(job);
        job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        should.exist(job);
        job.next.should.equal(sendingDate);
    });

    it('should send to 2 of 3 users, then to 3 more', async() => {
        let note = await N.Note.load(db, noteAuto._id),
            sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            storeI = stores.filter(s => s.field === 'ip')[0],
            storeA = stores.filter(s => s.field === 'ap')[0],
            resource = new ResourceMock(),
            now;
        stores.length.should.equal(2);

        resource.messageMapper = msg => {
            if (msg.t === USERS.ru.tkip) {
                return [msg._id, -200];
            }
            else {
                return [msg._id, 200];
            }
        };

        // first run, ru & tk should be sent
        let job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        now = job.next + 200;
        console.log('Job %s is about to run at %s', job._id, new Date(job.next));
        await job.prepare(null, db);
        job.resource = resource;
        job.now = () => {
            return now;
        };
        await job._run(db, () => {});

        note = await N.Note.load(db, noteAuto._id);

        let count = await collectionCount(storeI.collectionName);
        count.should.equal(0);
        note.result.total.should.equal(3);
        note.result.processed.should.equal(3);
        note.result.sent.should.equal(2);
        note.result.errors.should.equal(0);
        note.result.status.should.equal(N.Status.PAUSED_SUCCESS);

        let users = await collectionLoad('app_users' + app._id),
            ru = users.filter(u => u.uid === 'ru')[0],
            gb = users.filter(u => u.uid === 'gb')[0],
            es = users.filter(u => u.uid === 'es')[0];

        should.not.exist(ru.msgs);
        should.exist(gb.msgs);
        should.exist(es.msgs);
        gb.msgs.length.should.equal(2);
        es.msgs.length.should.equal(1);
        (Math.abs(now - gb.msgs[1][1]) < 1000).should.be.true();
        (Math.abs(now - es.msgs[0][1]) < 1000).should.be.true();

        // add 2 for ruboth & 1 for no, es is ignored due to autoCapSleep
        count = await E.onCohort(true, cohort, ['ruboth', 'es', 'no']);
        count.should.equal(3);
        note = await N.Note.load(db, noteAuto._id);
        note.result.total.should.equal(6);

        count = await collectionCount(storeI.collectionName);
        count.should.equal(2);
        count = await collectionCount(storeA.collectionName);
        count.should.equal(1);

        // should reschedule to 2 hours later
        job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        now = job.next;
        console.log('Job %s is about to run at %s', job._id, new Date(job.next));
        await job.prepare(null, db);
        job.resource = resource;
        job.now = () => {
            return now;
        };
        await job._run(db, () => {});

        job = await jobFind('push:process', {cid: credFCM._id, aid: app._id, field: 'ap'}, ProcessJobMock);
        now = job.next;
        console.log('Job %s is about to run at %s', job._id, new Date(job.next));
        await job.prepare(null, db);
        job.resource = resource;
        job.now = () => {
            return now;
        };
        await job._run(db, () => {});

        note = await N.Note.load(db, noteAuto._id);
        count = await collectionCount(storeI.collectionName);
        count.should.equal(0);
        count = await collectionCount(storeA.collectionName);
        count.should.equal(0);
        note.result.total.should.equal(6);
        note.result.processed.should.equal(6);
        note.result.sent.should.equal(5);
        note.result.errors.should.equal(0);
        note.result.status.should.equal(N.Status.PAUSED_SUCCESS);

        job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob);
        should.not.exist(job);
    });

    beforeEach(() => {
        returnOutput = common.returnOutput;
        returnMessage = common.returnMessage;

        common.returnOutput = (params, out) => {
            common.returnOutput = out;
            params.res.finished = true;
        };
        common.returnMessage = (params, code, message) => {
            common.returnMessage = [code, message];
            params.res.finished = true;
        };
    });

    afterEach(() => {
        common.returnOutput = returnOutput;
        common.returnMessage = returnMessage;
    });

    before((done) => {

        common.db = db;

        credAPN = new C.Credentials(new db.ObjectID());
        credAPN.platform = N.Platform.IOS;
        credAPN.type = C.CRED_TYPE[N.Platform.IOS].TOKEN;
        credAPN.key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ1N1V2xDdU1QR2JTRkpvWXE3bjQwdmh1d1lBc0dpZDAybDRUbWcxcHN1U09nQ2dZSUtvWkl6ajBEQVFlaFJBTkNBQVFqUm9YZDN3TEk4cE0wWStCbTRqVGFZMG11REpQd0IzekF4M3RYQ043SWFpS1lmTzJNSkZIZmI0cEhJMnZVTWI5a3dPa0VHckNObVc0UklvdGh5dnhQCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';
        credAPN.secret = '7GH992U9Z7[CLY]EQ43JUC8GV[CLY]ly.count.Countly-Tester';

        credFCM = new C.Credentials(new db.ObjectID());
        credFCM.platform = N.Platform.ANDROID;
        credFCM.type = C.CRED_TYPE[N.Platform.ANDROID].FCM;
        credFCM.key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ1N1V2xDdU1QR2JTRkpvWXE3bjQwdmh1d1lBc0dpZDAybDRUbWcxcHN1U09nQ2dZSUtvWkl6ajBEQVFlaFJBTkNBQVFqUm9YZDN3TEk4cE0wWStCbTRqVGFZMG11REpQd0IzekF4M3RYQ043SWFpS1lmTzJNSkZIZmI0cEhJMnZVTWI5a3dPa0VHckNObVc0UklvdGh5dnhQCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';

        app = {_id: db.ObjectID(), name: 'push test', timezone: 'Europe/Berlin', plugins: {push: {i: {_id: credAPN._id.toString(), type: 'apn_token'}, a: {_id: credFCM._id.toString(), type: 'fcm'}}}};

        cohort = {_id: app._id.toString(), app_id: app._id.toString(), name: "test", type: "manual", steps: [ ]};

        // auto messages (just scheduling fact/sending fact, other features are in store tests)
        noteAuto = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()], appNames: [], platforms: ['i', 'a'], data: {a: 'auto'}, test: false, type: 'data', date: momenttz.tz('2017-12-01 15:00', 'Europe/Moscow').toDate().getTime(), auto: true, autoCohorts: [cohort._id], autoOnEntry: true, autoDelay: 3600000, autoCapMessages: 2, autoCapSleep: 7200000
        };

        USERS = {
            'ru': {tkip: 'ios_ru', la: 'ru', tz: 180},
            'lv': {tkip: 'ios_lv', la: 'lv', tz: 120},
            'tk': {tkip: 'ios_tk', la: 'tk', tz: 180},
            'gb': {tkip: 'ios_gb', la: 'gb', tz: 0, msgs: {'0': [123, '123132']}},
            'us': {tkip: 'ios_us', la: 'us', tz: -420},
            'es': {tkip: 'ios_es', la: 'es', tz: 60},
            'no': {tkip: 'ios_no'},
            'tk_a': {tkap: 'android_tk', la: 'tk', tz: 180},
            'gb_a': {tkap: 'android_gb', la: 'gb', tz: 0},
            'us_a': {tkap: 'android_us', la: 'us', tz: -420},
            'ruboth': {tkap: 'adnroid_ru', tkip: 'ios_ruboth', la: 'ru', tz: 180},
            // test
            'ca_a': {tkat: 'android_ca', la: 'ca', tz: -420},
            'cu_a': {tkat: 'android_cu', la: 'cu', tz: -360},
            'ca_id': {tkid: 'ios_dev_ca', la: 'ca', tz: -420},
            'ca_ia': {tkia: 'ios_adh_ca', la: 'ca', tz: -420},
        };

        db.collection('apps').insertOne(app, (err) => {
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
                    if (USERS[uid].tkid) {
                        u.tk.id = USERS[uid].tkid;
                        u.tkid = true;
                    }
                    if (USERS[uid].tkia) {
                        u.tk.ia = USERS[uid].tkia;
                        u.tkia = true;
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
                    if (USERS[uid].msgs !== undefined) {
                        u.msgs = USERS[uid].msgs;
                    }
                    return u;
                }), err => {
                    err ? done(err) : db.collection('cohorts').insertOne(cohort, done);
                });
            });
        });
    });

    after(done => {
        Promise.all([
            noteAuto._id ? new ST.StoreGroup(db).clear(noteAuto) : Promise.resolve(),
            new Promise((res, rej) => {
                db.collection('messages').deleteMany({_id: {$in: [noteAuto].map(x => x && x._id).filter(x => !!x)}}, (err) => {
                    if (err) {
                        rej(err);
                    }
                    else {
                        db.collection('credentials').deleteMany({_id: {$in: [credAPN._id, credFCM._id]}}, err => {
                            if (err) {
                                rej(err);
                            }
                            else {
                                db.collection('apps').deleteOne({_id: app._id}, () => {
                                    err ? rej(err) : db.collection('cohorts').deleteOne({_id: cohort._id}, err => err ? rej(err) : db.collection(`app_users${app._id}`).drop(res));
                                });
                            }
                        });

                    }
                });
            })
        ]).then(() => {
            db.close();
            common.db && common.db.close();
            done();
        });
    });
});