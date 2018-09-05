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
    noteTx,
    returnOutput, returnMessage,
    date1, date2;

class ResourceMock {
    constructor(/*_id, name, args, db */) {
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

describe('PUSH API', () => {
    describe('message note', async() => {
        it('should create & schedule note correctly without preparation', async() => {
            await E.create({qstring: {args: noteTx}, res: {}, member: {global_admin: [app._id.toString()]}});
            let json = common.returnOutput;
            json.should.be.Object();
            should.exist(json._id);
            should.not.exist(json.error);
            json.result.status.should.equal(N.Status.READY);

            let note = await N.Note.load(db, json._id);
            should.exist(note);
            should.exist(note.date);
            should.exist(note.result);
            should.not.exist(note.build);
            note.tx.should.be.true();
            note.test.should.be.false();
            note.apps.length.should.equal(noteTx.apps.length);
            note.appNames.length.should.equal(noteTx.apps.length);
            note.appNames[0].should.equal(app.name);
            note.platforms.length.should.equal(noteTx.platforms.length);
            note.data.a.should.equal(noteTx.data.a);
            note.result.total.should.equal(0);
            note.result.status.should.equal(N.Status.READY);
            noteTx = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(0);
        });

        it('should store 1 test user with current date', async() => {
            await E.push({qstring: {args: {_id: noteTx._id.toString(), userConditions: {uid: 'ru'}}}, res: {}, member: {global_admin: [app._id.toString()]}});
            let res = common.returnOutput;
            console.log(res);
            should.exist(res);
            should.not.exist(res.error);

            res.total.should.equal(1);
            (Math.abs(Date.now() - res.next) < 500).should.be.true();

            let note = await N.Note.load(db, noteTx._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            note.result.total.should.equal(1);
            note.result.processed.should.equal(0);
            note.result.status.should.equal(N.Status.READY);

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(1);
        });

        it('should store 2 test users with specified date', async() => {
            date1 = Date.now() + 3600000;
            await E.push({qstring: {args: {_id: noteTx._id.toString(), date: date1, userConditions: {uid: {$in: ['us', 'gb']}}}}, res: {}, member: {global_admin: [app._id.toString()]}});
            let res = common.returnOutput;
            console.log(res);
            should.exist(res);
            should.not.exist(res.error);

            res.total.should.equal(2);
            res.next.should.equal(date1);

            let note = await N.Note.load(db, noteTx._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            note.result.total.should.equal(3);
            note.result.processed.should.equal(0);
            note.result.status.should.equal(N.Status.READY);

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(3);
        });

        it('should not store same 2 test users with same date', async() => {
            await E.push({qstring: {args: {_id: noteTx._id.toString(), date: date1, userConditions: {uid: {$in: ['us', 'gb']}}}}, res: {}, member: {global_admin: [app._id.toString()]}});
            let res = common.returnOutput;
            console.log(res);
            should.exist(res);
            should.not.exist(res.error);

            res.total.should.equal(0);
            (res.next === null).should.be.true();

            let note = await N.Note.load(db, noteTx._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            note.result.total.should.equal(3);
            note.result.processed.should.equal(0);
            note.result.status.should.equal(N.Status.READY);

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(3);
        });

        it('should store same 2 test users with different date', async() => {
            date2 = date1 + 3600000;
            await E.push({qstring: {args: {_id: noteTx._id.toString(), date: date2, userConditions: {uid: {$in: ['us', 'gb']}}}}, res: {}, member: {global_admin: [app._id.toString()]}});
            let res = common.returnOutput;
            console.log(res);
            should.exist(res);
            should.not.exist(res.error);

            res.total.should.equal(2);
            res.next.should.equal(date2);

            let note = await N.Note.load(db, noteTx._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            note.result.total.should.equal(5);
            note.result.processed.should.equal(0);
            note.result.status.should.equal(N.Status.READY);

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(5);
        });
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
        noteTx = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()], appNames: [], platforms: ['i'], data: {a: 'tx'}, test: false, type: 'message', messagePerLocale: {default: 'test', ru: 'тест'}, tx: true
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
            noteTx._id ? new ST.StoreGroup(db).clear(noteTx) : Promise.resolve(),
            new Promise((res, rej) => {
                db.collection('messages').deleteMany({_id: {$in: [noteTx].map(x => x && x._id).filter(x => !!x)}}, (err) => {
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