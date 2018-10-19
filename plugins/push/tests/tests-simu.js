const should = require('should'),
    ST = require('../api/parts/store.js'),
    common = require('../../../api/utils/common.js'),
    J = require('../../../api/parts/jobs/job.js'),
    pluginManager = require('../../pluginManager.js'),
    db = pluginManager.singleDefaultConnection(),
    N = require('../api/parts/note.js'),
    C = require('../api/parts/credentials.js'),
    E = require('../api/parts/endpoints.js'),
    ProcessJob = require('../api/jobs/process.js'),
    ScheduleJob = require('../api/jobs/schedule.js'),
    momenttz = require('moment-timezone');

let app, credAPN, credFCM, USERS,
    note1, note2,
    returnOutput, returnMessage;

class ResourceMock {
    constructor(/*_id, name, args, db */) {
    }

    async send(msgs) {
        if (this.delay) {
            await new Promise(res => setTimeout(res, this.delay));
        }
        return [
            msgs.map(m => [m._id, 200])
        ];
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

describe('PUSH API', () => {
    describe('message note', async() => {
        it('should create & schedule 1st note correctly without preparation', async() => {
            await E.create({qstring: {args: note1}, res: {}, member: {global_admin: [app._id.toString()]}});
            let json = common.returnOutput;
            json.should.be.Object();
            should.exist(json._id);
            should.not.exist(json.error);
            json.result.status.should.equal(N.Status.Created);

            let note = await N.Note.load(db, json._id);
            should.exist(note);
            should.exist(note.date);
            should.exist(note.result);
            should.exist(note.build);
            should.exist(note.build.count);
            note.test.should.be.false();
            note.apps.length.should.equal(note1.apps.length);
            note.appNames.length.should.equal(note1.apps.length);
            note.appNames[0].should.equal(app.name);
            note.platforms.length.should.equal(note1.platforms.length);
            note.data.a.should.equal(note1.data.a);
            note.result.status.should.equal(N.Status.Created);
            note.result.total.should.equal(0);
            note.build.total.should.equal(12);
            note1 = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store1 = stores[0],
                store2 = stores[1];

            stores.length.should.equal(2);

            let count = await collectionCount(store1.collectionName);
            count.should.equal(0);

            count = await collectionCount(store2.collectionName);
            count.should.equal(0);
        });

        it('should create & schedule 2nd note correctly without preparation', async() => {
            await E.create({qstring: {args: note2}, res: {}, member: {global_admin: [app._id.toString()]}});
            let json = common.returnOutput;
            json.should.be.Object();
            should.exist(json._id);
            should.not.exist(json.error);
            json.result.status.should.equal(N.Status.Created);

            let note = await N.Note.load(db, json._id);
            should.exist(note);
            should.exist(note.date);
            should.exist(note.result);
            should.exist(note.build);
            should.exist(note.build.count);
            note.test.should.be.false();
            note.apps.length.should.equal(note2.apps.length);
            note.appNames.length.should.equal(note2.apps.length);
            note.appNames[0].should.equal(app.name);
            note.platforms.length.should.equal(note2.platforms.length);
            note.data.a.should.equal(note2.data.a);
            note.result.status.should.equal(N.Status.Created);
            note.result.total.should.equal(0);
            note.build.total.should.equal(12);
            note2 = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store1 = stores[0],
                store2 = stores[1];

            stores.length.should.equal(2);

            let count = await collectionCount(store1.collectionName);
            count.should.equal(0);

            count = await collectionCount(store2.collectionName);
            count.should.equal(0);
        });

        it('should store 12 test users in collections after scheduling 1st job', async() => {
            let note = await N.Note.load(db, note1._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store1 = stores[0],
                store2 = stores[1];
            stores.length.should.equal(2);

            let job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob),
                hasBeenRun = false;
            should.exist(job);
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

            let count = await collectionCount(store1.collectionName);
            count.should.equal(6);
            count = await collectionCount(store2.collectionName);
            count.should.equal(6);
        });

        it('should store 12 test users totalling 24 in collections after scheduling 2nd job', async() => {
            let note = await N.Note.load(db, note2._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store1 = stores[0],
                store2 = stores[1];
            stores.length.should.equal(2);

            let job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob),
                hasBeenRun = false;
            should.exist(job);
            await job.prepare(null, db);
            await job.run(db, err => {
                hasBeenRun = err;
            });
            (hasBeenRun === undefined).should.be.true();
            await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

            note = await N.Note.load(db, note._id);
            note.result.status.should.equal(N.Status.READY);

            job = await jobFind('push:process', {cid: credFCM._id, aid: app._id, field: 'ap'}, ProcessJobMock);
            should.exist(job);

            let count = await collectionCount(store1.collectionName);
            count.should.equal(12);
            count = await collectionCount(store2.collectionName);
            count.should.equal(12);
        });


        it('should send notifications', async() => {
            let resource = new ResourceMock(),
                RUTOKEN = 'ru2';

            resource.delay = 1000;

            let jobI = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('APN job %s is about to run at %s', jobI._id, new Date(jobI.next));
            await jobI.prepare(null, db);
            jobI.resource = resource;

            let jobA = await jobFind('push:process', {cid: credFCM._id, aid: app._id, field: 'ap'}, ProcessJobMock);
            console.log('FCM job %s is about to run at %s', jobA._id, new Date(jobA.next));
            await jobA.prepare(null, db);
            jobA.resource = resource;

            let jobPromises = [jobI._run(db, () => {}), jobA._run(db, () => {})];

            await new Promise(res => setTimeout(res, 2000));

            let forkI = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip', fork: 1}, ProcessJobMock);
            let forkA = await jobFind('push:process', {cid: credFCM._id, aid: app._id, field: 'ap', fork: 1}, ProcessJobMock);

            console.log('APN fork %s are about to run at %s', forkI._id, new Date(forkI.next));
            console.log('FCM fork %s are about to run at %s', forkA._id, new Date(forkA.next));

            await forkI.prepare(null, db);
            await forkA.prepare(null, db);
            forkI.resource = resource;
            forkA.resource = resource;

            let forkPromises = [forkI._run(db, () => {}), forkA._run(db, () => {})];

            await Promise.all([Promise.all(jobPromises), Promise.all(forkPromises)]);

            let note = await N.Note.load(db, note1._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store1 = stores[0],
                store2 = stores[1];
            stores.length.should.equal(2);

            let count = await collectionCount(store1.collectionName);
            count.should.equal(0);
            note.result.processed.should.equal(12);
            note.result.sent.should.equal(12);
            note.result.errors.should.equal(0);
            note.result.status.should.equal(N.Status.DONE_SUCCESS);

            count = await collectionCount(store2.collectionName);
            count.should.equal(0);
            note = await N.Note.load(db, note2._id);
            note.result.processed.should.equal(12);
            note.result.sent.should.equal(12);
            note.result.errors.should.equal(0);
            note.result.status.should.equal(N.Status.DONE_SUCCESS);
        }).timeout(50000);
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

        note1 = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()],
            appNames: [],
            platforms: ['i', 'a'],
            data: {a: 'd1'},
            test: false,
            type: 'message',
            messagePerLocale: {
                'default': 'smth',
            }
        };

        note2 = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()],
            appNames: [],
            platforms: ['i', 'a'],
            data: {a: 'd2'},
            test: false,
            type: 'message',
            messagePerLocale: {
                'default': 'smth else',
            }
        };

        USERS = {
            'ru': {tkip: 'ios_ru', tkap: 'android_ru', la: 'ru'},
            'lv': {tkip: 'ios_lv', tkap: 'android_lv', la: 'lv'},
            'tk': {tkip: 'ios_tk', tkap: 'android_tk', la: 'tk'},
            'gb': {tkip: 'ios_gb', tkap: 'android_gb', la: 'gb'},
            'us': {tkip: 'ios_us', tkap: 'android_us', la: 'us'},
            'es': {tkip: 'ios_es', tkap: 'android_es', la: 'es'},
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
                    if (USERS[uid].tkap) {
                        u.tk.ap = USERS[uid].tkap;
                        u.tkap = true;
                    }
                    return u;
                }), done);
            });
        });
    });

    after(done => {
        Promise.all([
            note1._id ? new ST.StoreGroup(db).clear(note1) : Promise.resolve(),
            note2._id ? new ST.StoreGroup(db).clear(note2) : Promise.resolve(),
            new Promise((res, rej) => {
                db.collection('messages').deleteMany({_id: {$in: [note1, note2].map(x => x && x._id).filter(x => !!x)}}, (err) => {
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