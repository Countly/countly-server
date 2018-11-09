const should = require('should'),
    ST = require('../api/parts/store.js'),
    J = require('../../../api/parts/jobs/job.js'),
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
    noteMess,
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

describe('PUSH API: resuming message after 1 timeout', () => {
    it('should check note date datatype', async() => {
        let json = JSON.parse(JSON.stringify(noteMess));
        json.date = 'wrong';
        let [note] = await E.validate({qstring: {args: json}});
        note.should.be.Object();
        should.exist(note.error);
        note.error.should.equal('Only long (ms since Epoch) is supported as date format');
    });

    it('should validate correctly', async() => {
        let [note, prepared, apps] = await E.validate({qstring: {args: noteMess}});
        (note instanceof N.Note).should.equal(true);
        Array.isArray(apps).should.equal(true);
        should.not.exist(prepared);
    });

    it('should create & schedule note correctly without preparation', async() => {
        noteMess.date = Date.now() + 3000;
        await E.create({qstring: {args: noteMess}, res: {}, member: {global_admin: [app._id.toString()]}});
        let json = common.returnOutput;
        json.should.be.Object();
        should.exist(json._id);
        should.not.exist(json.error);
        json.result.status.should.equal(N.Status.Created);

        let note = await N.Note.load(db, json._id);
        should.exist(note);
        should.exist(note.date);
        should.exist(note.result);
        should.exist(note.build.count);
        should.exist(note.build.count.es);
        note.date.getTime().should.equal(noteMess.date);
        note.test.should.be.false();
        note.apps.length.should.equal(noteMess.apps.length);
        note.appNames.length.should.equal(noteMess.apps.length);
        note.appNames[0].should.equal(app.name);
        note.platforms.length.should.equal(noteMess.platforms.length);
        note.data.a.should.equal(noteMess.data.a);
        note.result.total.should.equal(0);
        note.result.status.should.equal(N.Status.Created);
        note.build.total.should.equal(7);
        note.build.count.ru.should.equal(1);
        note.build.count.es.should.equal(1);
        note.build.count.unknown.should.equal(1);
        noteMess = json;

        let sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            store = stores[0];

        stores.length.should.equal(1);

        let count = await collectionCount(store.collectionName);
        count.should.equal(0);
    });

    it('should store 4 test users in collections', async() => {
        let note = await N.Note.load(db, noteMess._id),
            sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            store = stores[0];
        stores.length.should.equal(1);

        let job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob),
            hasBeenRun = false;
        should.exist(job);
        job.next.should.equal(noteMess.date.getTime());
        await job.prepare(null, db);

        await job.run(db, err => {
            hasBeenRun = err;
        });
        (hasBeenRun === undefined).should.be.true();
        await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

        note = await N.Note.load(db, note._id);
        note.result.status.should.equal(N.Status.READY);

        job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        should.exist(job);
        (job.next > Date.now()).should.be.true();

        let count = await collectionCount(store.collectionName);
        count.should.equal(note.build.total);

        let records = await collectionLoad(store.collectionName);
        records.filter(r => r.d === noteMess.date.getTime()).length.should.equal(7);
        records.filter(r => r.t === USERS.ru.tkip).length.should.equal(1);
        records.filter(r => r.t === USERS.no.tkip).length.should.equal(1);
    });

    it('should record resource error in message', async() => {
        let resource = new ResourceMock(),
            now = noteMess.date.getTime() + 200;

        resource.messageMapper = msg => {
            return [msg._id, 200];
        };

        let job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        console.log('Job %s is about to run at %s', job._id, new Date(job.next));
        await job.prepare(null, db);
        job.resource = resource;
        job.resource.failImmediately = 'timeout';
        job.now = () => {
            return now;
        };
        await job._run(db, () => {});
        await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

        let note = await N.Note.load(db, noteMess._id),
            sg = new ST.StoreGroup(db),
            stores = await sg.stores(note),
            store = stores[0];
        stores.length.should.equal(1);

        let count = await collectionCount(store.collectionName);
        count.should.equal(7);
        note.result.processed.should.equal(0);
        note.result.sent.should.equal(0);
        note.result.errors.should.equal(0);
        should.exist(note.result.resourceErrors);
        note.result.resourceErrors.length.should.equal(1);
        should.exist(note.result.resourceErrors[0].date);
        should.exist(note.result.resourceErrors[0].field);
        should.exist(note.result.resourceErrors[0].error);
        note.result.resourceErrors[0].error.should.equal(job.resource.failImmediately);
        note.result.status.should.equal(N.Status.PAUSED_FAILURE);

        // should reschedule to 1 minute later
        job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
        console.log('Job %s is about to run at %s', job._id, new Date(job.next));
        (job.next - now < 1.5 * 60000).should.be.true();
        (job.next - now > 0.5 * 60000).should.be.true();

        // run it second time
        now = job.next + 200;
        await job.prepare(null, db);
        job.resource = resource;
        delete job.resource.failImmediately;
        job.now = () => {
            return now;
        };
        await job._run(db, () => {});

        note = await N.Note.load(db, noteMess._id);
        count = await collectionCount(store.collectionName);
        count.should.equal(0);
        note.result.processed.should.equal(7);
        note.result.sent.should.equal(7);
        note.result.errors.should.equal(0);
        should.exist(note.result.resourceErrors);
        note.result.resourceErrors.length.should.equal(1);
        should.exist(note.result.resourceErrors[0].date);
        should.exist(note.result.resourceErrors[0].field);
        should.exist(note.result.resourceErrors[0].error);
        note.result.resourceErrors[0].error.should.equal('timeout');
        note.result.status.should.equal(N.Status.DONE_MIXED);

        count = await collectionCount(store.collectionName);
        count.should.equal(0);
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

        // locales, timezones
        noteMess = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()], appNames: [], platforms: ['i'], data: {a: 'mess'}, test: false, type: 'message', messagePerLocale: {default: 'test', ru: 'тест'}, date: Date.now()
        };

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
                    return u;
                }), done);
            });
        });
    });

    after(done => {
        Promise.all([
            noteMess._id ? new ST.StoreGroup(db).clear(noteMess) : Promise.resolve(),
            new Promise((res, rej) => {
                db.collection('messages').deleteMany({_id: {$in: [noteMess].map(x => x && x._id).filter(x => !!x)}}, (err) => {
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
                                    db.collection(`app_users${app._id}`).drop(res);
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