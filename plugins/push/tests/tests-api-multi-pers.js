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
        it('should validate correctly', async() => {
            let [note, prepared, apps] = await E.validate({qstring: {args: note1}});
            (note instanceof N.Note).should.equal(true);
            Array.isArray(apps).should.equal(true);
            should.not.exist(prepared);

            [note, prepared, apps] = await E.validate({qstring: {args: note2}});
            (note instanceof N.Note).should.equal(true);
            Array.isArray(apps).should.equal(true);
            should.not.exist(prepared);

            note1.date = Date.now();
            note2.date = note1.date + 200;
        });

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
            should.exist(note.build.count.es);
            note.test.should.be.false();
            note.apps.length.should.equal(note1.apps.length);
            note.appNames.length.should.equal(note1.apps.length);
            note.appNames[0].should.equal(app.name);
            note.platforms.length.should.equal(note1.platforms.length);
            note.data.a.should.equal(note1.data.a);
            note.result.status.should.equal(N.Status.Created);
            note.result.total.should.equal(0);
            note.build.total.should.equal(6);
            note.build.count.ru.should.equal(1);
            note.build.count.es.should.equal(1);
            note1 = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
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
            should.exist(note.build.count.es);
            note.test.should.be.false();
            note.apps.length.should.equal(note2.apps.length);
            note.appNames.length.should.equal(note2.apps.length);
            note.appNames[0].should.equal(app.name);
            note.platforms.length.should.equal(note2.platforms.length);
            note.data.a.should.equal(note2.data.a);
            note.result.status.should.equal(N.Status.Created);
            note.result.total.should.equal(0);
            note.build.total.should.equal(6);
            note.build.count.ru.should.equal(1);
            note.build.count.es.should.equal(1);
            note2 = json;

            let sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];

            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(0);
        });

        it('should store 6 test users in collections after scheduling 1st job', async() => {
            let note = await N.Note.load(db, note1._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];
            stores.length.should.equal(1);

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

            let count = await collectionCount(store.collectionName);
            count.should.equal(note.build.total);

            let records = await collectionLoad(store.collectionName);
            console.log(records);
            records.filter(r => r.d === records[0].d).length.should.equal(6);
            records.filter(r => r.t === USERS.ru.tkip).length.should.equal(1);
            records.filter(r => r.t === USERS.es.tkip).length.should.equal(1);
        });

        it('should store 12 test users in collections after scheduling 2nd job', async() => {
            let note = await N.Note.load(db, note2._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];
            stores.length.should.equal(1);

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

            let count = await collectionCount(store.collectionName);
            count.should.equal(note.build.total * 2);

            let records = await collectionLoad(store.collectionName);
            console.log(records);
            records.filter(r => r.d <= note.date.getTime()).length.should.equal(12);
            records.filter(r => r.d === records[0].d).length.should.equal(6);
            records.filter(r => r.t === USERS.ru.tkip).length.should.equal(2);
            records.filter(r => r.t === USERS.es.tkip).length.should.equal(2);
        });

        it('should send notifications', async() => {
            let resource = new ResourceMock(),
                RUTOKEN = 'ru2';

            resource.messageMapper = msg => {
                should.exist(msg.m);

                let json = JSON.parse(msg.m);

                if (json.c.i === note1._id.toString()) {
                    should.exist(json.aps.alert.body);
                    should.exist(json.aps.alert.title);

                    if (msg.t === USERS.ru.tkip) {
                        json.aps.alert.title.should.equal('Здравствуйте!');
                        json.aps.alert.body.should.equal('Привет, Артем! Пока Вы сделали 2 сессий, может еще одну?');
                        return [msg._id, -200, '', RUTOKEN];
                    }
                    else if (msg.t === USERS.lv.tkip) {
                        json.aps.alert.title.should.equal('Hello, Arturs!');
                        json.aps.alert.body.should.equal('Arturs! You have made a few sessions so far, how about another one? Countly LTD is waiting for you!');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.tk.tkip) {
                        json.aps.alert.title.should.equal('Hello, my friend!');
                        json.aps.alert.body.should.equal('My friend! You have made 3 sessions so far, how about another one? Your company is waiting for you!');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.gb.tkip) {
                        json.aps.alert.title.should.equal('Hello, my friend!');
                        json.aps.alert.body.should.equal('My friend! You have made 5 sessions so far, how about another one? Your company is waiting for you!');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.us.tkip) {
                        json.aps.alert.title.should.equal('Hello, my friend!');
                        json.aps.alert.body.should.equal('My friend! You have made a few sessions so far, how about another one? Countly LTD is waiting for you!');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.es.tkip) {
                        json.aps.alert.title.should.equal('Hello, my friend!');
                        json.aps.alert.body.should.equal('My friend! You have made a few sessions so far, how about another one? Your company is waiting for you!');
                        return [msg._id, 200];
                    }
                    else {
                        should.fail('wrong token');
                    }
                }
                else if (json.c.i === note2._id.toString()) {
                    (typeof json.aps.alert === 'string').should.be.true();

                    if (msg.t === USERS.ru.tkip) {
                        should.not.exist(json.aps.alert.title);
                        json.aps.alert.should.equal('Hello Артем! How\'s your company?');
                        return [msg._id, -200, '', RUTOKEN];
                    }
                    else if (msg.t === USERS.lv.tkip) {
                        json.aps.alert.should.equal('Hello Arturs! How\'s Countly LTD?');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.tk.tkip) {
                        json.aps.alert.should.equal('Hello my friend! How\'s your company?');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.gb.tkip) {
                        json.aps.alert.should.equal('Hello my friend! How\'s your company?');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.us.tkip) {
                        json.aps.alert.should.equal('Hello my friend! How\'s Countly LTD?');
                        return [msg._id, 200];
                    }
                    else if (msg.t === USERS.es.tkip) {
                        json.aps.alert.should.equal('Hello my friend! How\'s your company?');
                        return [msg._id, 200];
                    }
                    else {
                        should.fail('wrong token');
                    }
                }
                else {
                    should.fail('wrong note id');
                }
            };

            resource.delay = 1000;

            let job = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip'}, ProcessJobMock);
            console.log('Job %s is about to run at %s', job._id, new Date(job.next));
            await job.prepare(null, db);
            job.resource = resource;
            let jobPromise = job._run(db, () => {});

            await new Promise(res => setTimeout(res, 1500));

            let fork = await jobFind('push:process', {cid: credAPN._id, aid: app._id, field: 'ip', fork: 1}, ProcessJobMock);
            console.log('Fork %s is about to run at %s', fork._id, new Date(fork.next));
            await fork.prepare(null, db);
            fork.resource = resource;
            let forkPromise = fork._run(db, () => {});

            await Promise.all([jobPromise, forkPromise]);

            let note = await N.Note.load(db, note1._id),
                sg = new ST.StoreGroup(db),
                stores = await sg.stores(note),
                store = stores[0];
            stores.length.should.equal(1);

            let count = await collectionCount(store.collectionName);
            count.should.equal(0);
            note.result.processed.should.equal(6);
            note.result.sent.should.equal(6);
            note.result.errors.should.equal(0);
            note.result.status.should.equal(N.Status.DONE_SUCCESS);

            note = await N.Note.load(db, note2._id);
            sg = new ST.StoreGroup(db);
            stores = await sg.stores(note);
            store = stores[0];
            stores.length.should.equal(1);

            count = await collectionCount(store.collectionName);
            count.should.equal(0);
            note.result.processed.should.equal(6);
            note.result.sent.should.equal(6);
            note.result.errors.should.equal(0);
            note.result.status.should.equal(N.Status.DONE_SUCCESS);
        }).timeout(5000);
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
            platforms: ['i'],
            data: {a: 'mess'},
            test: false,
            type: 'message',
            messagePerLocale: {
                'default': '! You have made  sessions so far, how about another one?  is waiting for you!',
                'default|p': {
                    0: {
                        f: 'My friend',
                        c: true,
                        k: 'name'
                    },
                    ['! You have made '.length]: {
                        f: 'a few',
                        c: false,
                        k: 'sc'
                    },
                    ['! You have made  sessions so far, how about another one? '.length]: {
                        f: 'Your company',
                        c: true,
                        k: 'custom.company'
                    }
                },
                'default|t': 'Hello, !',
                'default|tp': {
                    ['Hello, '.length]: {
                        f: 'my friend',
                        c: true,
                        k: 'name'
                    }
                },
                'ru': 'Привет, ! Пока Вы сделали  сессий, может еще одну?',
                'ru|p': {
                    ['Привет, '.length]: {
                        f: 'друг',
                        c: true,
                        k: 'name'
                    },
                    ['Привет, ! Пока Вы сделали '.length]: {
                        f: 'немного',
                        c: false,
                        k: 'sc'
                    }
                },
                'ru|t': 'Здравствуйте!',
            }
        };

        note2 = {
            // _id: db.ObjectID(),
            apps: [app._id.toString()],
            appNames: [],
            platforms: ['i'],
            data: {a: 'mess'},
            test: false,
            type: 'message',
            messagePerLocale: {
                'default': 'Hello ! How\'s ?',
                'default|p': {
                    ['Hello '.length]: {
                        f: 'my friend',
                        c: true,
                        k: 'name'
                    },
                    ['Hello ! How\'s '.length]: {
                        f: 'your company',
                        c: true,
                        k: 'custom.company'
                    }
                },
            }
        };

        USERS = {
            // 'Здравствуйте!'
            // 'Привет, Артем! Пока Вы сделали 2 сессий, может еще одну?'
            'ru': {tkip: 'ios_ru', la: 'ru', tz: 180, sc: 2, name: 'Артем'},
            // 'Hello, Arturs!'
            // 'Arturs! You have made a few sessions so far, how about another one? Countly LTD is waiting for you!'
            'lv': {tkip: 'ios_lv', la: 'lv', tz: 120, name: 'Arturs', custom: {company: 'countly LTD'}},
            // 'Hello, my friend!'
            // 'My friend! You have made 3 sessions so far, how about another one? Your company is waiting for you!'
            'tk': {tkip: 'ios_tk', la: 'tk', tz: 180, sc: 3},
            // 'Hello, my friend!'
            // 'My friend! You have made 5 sessions so far, how about another one? Your company is waiting for you!'
            'gb': {tkip: 'ios_gb', la: 'gb', tz: 0, sc: 5},
            // 'Hello, my friend!'
            // 'My friend! You have made a few sessions so far, how about another one? Countly LTD is waiting for you!'
            'us': {tkip: 'ios_us', la: 'us', tz: -420, custom: {company: 'Countly LTD'}},
            // 'Hello, my friend!'
            // 'My friend! You have made a few sessions so far, how about another one? Your company is waiting for you!'
            'es': {tkip: 'ios_es', la: 'es', tz: 60},
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
                    if (USERS[uid].sc) {
                        u.sc = USERS[uid].sc;
                    }
                    if (USERS[uid].name) {
                        u.name = USERS[uid].name;
                    }
                    if (USERS[uid].custom) {
                        u.custom = USERS[uid].custom;
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