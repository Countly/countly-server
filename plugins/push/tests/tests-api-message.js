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
    noteMess,
    returnOutput, returnMessage;

process.on('uncaughtException', (err) => {
    console.log('Caught exception: %j', err, err.stack);
    console.trace();
    process.exit(1);
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
    console.trace();
});


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
            console.log(json);
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
            note.build.total.should.equal(9);
            note.build.count.ru.should.equal(1);
            note.build.count.es.should.equal(1);
            note.build.count.unknown.should.equal(3);
            noteMess = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(0);
        });

        it('should store 7 test users in collections', async() => {
            let note = await N.Note.load(db, noteMess._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];
            stores.length.should.equal(1);

            let job = await jobFind('push:schedule', {mid: note._id}, ScheduleJob),
                hasBeenRun = false;
            should.exist(job);
            job.next.should.equal(noteMess.date.getTime() - 24 * 3600 * 1000);
            await job.prepare(null, db);

            await job.run(db, err => {
                hasBeenRun = err;
            });
            (hasBeenRun === undefined).should.be.true();

            note = await N.Note.load(db, note._id);
            note.build.total.should.equal(9);
            note.result.total.should.equal(7);
            note.result.processed.should.equal(0);
            note.result.status.should.equal(N.Status.READY);

            job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            should.exist(job);
            (job.next > Date.now()).should.be.true();

            let count = await collectionCount(store.collectionName);
            count.should.equal(note.result.total);

            let records = await collectionLoad(store.collectionName);
            records.filter(r => r.d === noteMess.date.getTime()).length.should.equal(2);
            records.filter(r => r.t === USERS.ru.tkip).length.should.equal(1);
            records.filter(r => r.t === USERS.no.tkip).length.should.equal(1);
        });

        it('should send notifications', async() => {
            let resource = new ResourceMock(),
                RUTOKEN = 'ru2';

            resource.messageMapper = msg => {
                if (msg.t === USERS.ru.tkip) {
                    msg.m.indexOf('{"aps":{"alert":"тест"').should.equal(0);
                    return [msg._id, -200, '', RUTOKEN];
                }
                else if (msg.t === USERS.tk.tkip) {
                    msg.m.indexOf('{"aps":{"alert":"test"').should.equal(0);
                    return [msg._id, 400, '{"reason":"InvalidSomething"}'];
                }
                else {
                    msg.m.indexOf('{"aps":{"alert":"test"').should.equal(0);
                    return [msg._id, 200];
                }
            };

            // first run, ru & tk should be sent
            let job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('Job %s is about to run at %s', job._id, new Date(job.next));
            await job.prepare(null, db);
            job.resource = resource;
            job.now = () => noteMess.date.getTime() + 200;
            await job._run(db, () => {});
            await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

            let note = await N.Note.load(db, noteMess._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];
            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(5);
            note.result.processed.should.equal(2);
            note.result.sent.should.equal(1);
            note.result.errors.should.equal(1);
            note.result.status.should.equal(N.Status.PAUSED_SUCCESS);
            note.result.errorCodes['i400+InvalidSomething'].should.equal(1);

            // second run 1 hour later, lv & no should be sent
            job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('Job %s is about to run at %s', job._id, new Date(job.next));
            should.exist(job);
            // process.exit(1);
            (job.next - noteMess.date.getTime() > 55 * 60 * 1000).should.be.true();
            (job.next - noteMess.date.getTime() < 65 * 60 * 1000).should.be.true();
            await job.prepare(null, db);
            job.resource = resource;
            job.now = () => job.next + 200;
            await job._run(db, () => {});
            await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

            count = await collectionCount(store.collectionName);
            count.should.equal(3);

            note = await N.Note.load(db, noteMess._id);
            note.result.processed.should.equal(4);
            note.result.sent.should.equal(3);
            note.result.errors.should.equal(1);
            note.result.status.should.equal(N.Status.PAUSED_SUCCESS);
            note.result.errorCodes['i400+InvalidSomething'].should.equal(1);

            // third run at T + 20 minutes GMT, es should be discarded, gb sent
            job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('Job %s is about to run at %s', job._id, new Date(job.next));
            should.exist(job);
            (job.next - noteMess.date.getTime() > 115 * 60 * 1000).should.be.true();
            (job.next - noteMess.date.getTime() < 125 * 60 * 1000).should.be.true();
            await job.prepare(null, db);
            job.resource = resource;
            job.now = () => noteMess.date.getTime() + 200 * 60 * 1000;
            await job._run(db, () => {});
            await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

            count = await collectionCount(store.collectionName);
            count.should.equal(1);

            note = await N.Note.load(db, noteMess._id);
            note.result.processed.should.equal(6);
            note.result.sent.should.equal(4);
            note.result.errors.should.equal(2);
            note.result.status.should.equal(N.Status.PAUSED_SUCCESS);
            note.result.errorCodes['i400+InvalidSomething'].should.equal(1);
            note.result.errorCodes.skiptz.should.equal(1);

            // last run at us time, us should be sent
            job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('Job %s is about to run at %s', job._id, new Date(job.next));
            should.exist(job);
            (job.next - noteMess.date.getTime() > (180 + 415) * 60 * 1000).should.be.true();
            (job.next - noteMess.date.getTime() < (180 + 425) * 60 * 1000).should.be.true();
            await job.prepare(null, db);
            job.resource = resource;
            job.now = () => noteMess.date.getTime() + (180 + 421) * 60 * 1000;
            await job._run(db, () => {});
            await J.Job.update(db, {_id: job._id}, {$set: {status: J.STATUS.DONE}});

            count = await collectionCount(store.collectionName);
            count.should.equal(0);

            note = await N.Note.load(db, noteMess._id);
            note.result.processed.should.equal(7);
            note.result.sent.should.equal(5);
            note.result.errors.should.equal(2);
            note.result.status.should.equal(N.Status.DONE_SUCCESS);
            note.result.errorCodes['i400+InvalidSomething'].should.equal(1);
            note.result.errorCodes.skiptz.should.equal(1);
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
        noteMess = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()], appNames: [], platforms: ['i'], data: {a: 'mess'}, test: false, type: 'message', userConditions: {uid: {$in: ['ru', 'lv', 'tk', 'gb', 'us', 'es', 'no', 'no2', 'no3']}}, messagePerLocale: {default: 'test', ru: 'тест'}, tz: -180, date: Date.now()
        };

        USERS = {
            'ru': {tkip: 'ios_ru', la: 'ru', tz: 180},
            'lv': {tkip: 'ios_lv', la: 'lv', tz: 120},
            'tk': {tkip: 'ios_tk', la: 'tk', tz: 180},
            'gb': {tkip: 'ios_gb', la: 'gb', tz: 0},
            'us': {tkip: 'ios_us', la: 'us', tz: -420},
            'es': {tkip: 'ios_es', la: 'es', tz: 60},
            'no': {tkip: 'ios_no'},
            'no2': {tkip: 'ios_no'},
            'no3': {tkip: 'ios_no'},
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