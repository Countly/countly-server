const should = require('should'),
    ST = require('../api/parts/store.js'),
    pluginManager = require('../../pluginManager.js'),
    db = pluginManager.singleDefaultConnection(),
    N = require('../api/parts/note.js'),
    C = require('../api/parts/credentials.js'),
    momenttz = require('moment-timezone');

let app = {_id: db.ObjectID(), timezone: 'Europe/Berlin'},
    note = new N.Note({
        _id: db.ObjectID(),
        apps: [app._id],
        appNames: [],
        platforms: ['i', 'a'],
        data: {a: 1},
        date: momenttz.tz('2017-12-01 15:10', 'Europe/Moscow').toDate(),
        tz: -180
    }),
    cred = new C.Credentials(new db.ObjectID()),
    jobId = new db.ObjectID();

cred.platform = N.Platform.IOS;
cred.type = C.CRED_TYPE[N.Platform.IOS].TOKEN;
cred.key = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR1RBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJIa3dkd0lCQVFRZ1N1V2xDdU1QR2JTRkpvWXE3bjQwdmh1d1lBc0dpZDAybDRUbWcxcHN1U09nQ2dZSUtvWkl6ajBEQVFlaFJBTkNBQVFqUm9YZDN3TEk4cE0wWStCbTRqVGFZMG11REpQd0IzekF4M3RYQ043SWFpS1lmTzJNSkZIZmI0cEhJMnZVTWI5a3dPa0VHckNObVc0UklvdGh5dnhQCi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0=';
cred.secret = '7GH992U9Z7[CLY]EQ43JUC8GV[CLY]ly.count.Countly-Tester';

describe('STORE', () => {
    let store, loader;

    it('should make correct collections', () => {
        store = new ST.Store(cred, 'ip', db);
        store.collectionName.should.equal('push_ip_' + cred._id);
        return store.clear();
    });

    it('should store & load array of users', async() => {
        store = new ST.Store(cred, 'ip', db);
        loader = new ST.Loader(cred, 'ip', db);

        let users = [
            {uid: '1', tkip: true, tk: {ip: 'tkiptoken1'}},
            {uid: '2', tkip: true, tk: {ip: 'tkiptoken2'}, tz: 180},
            {uid: '3', tkip: true, tk: {ip: 'tkiptoken3'}, tz: -60},
        ];

        let stored = await store.pushUsers(note, app, users);
        stored.inserted.should.equal(users.length);
        stored.next.should.equal(note.date.getTime());

        let saved = await loader.count();
        saved.should.equal(users.length);

        let loaded = await loader.load(jobId, Date.now());
        loaded.length.should.equal(users.length);

        (loaded[0].n + '').should.equal(note._id + '');
        (loaded[1].n + '').should.equal(note._id + '');
        (loaded[2].n + '').should.equal(note._id + '');

        loaded[0].t.should.equal(users[0].tk.ip);
        loaded[1].t.should.equal(users[1].tk.ip);
        loaded[2].t.should.equal(users[2].tk.ip);

        loaded[0].d.should.equal(note.date.getTime() - (note.tz || 0) * 60000 - (users[0].tz || 120) * 60000);
        loaded[1].d.should.equal(note.date.getTime() - (note.tz || 0) * 60000 - (users[1].tz || 120) * 60000);
        loaded[2].d.should.equal(note.date.getTime() - (note.tz || 0) * 60000 - (users[2].tz || 120) * 60000);

        // loaded[0].d.should.equal(new Date("2018-01-01T15:00:00+02:00").getTime());
        // loaded[1].d.should.equal(new Date("2018-01-01T15:00:00+03:00").getTime());
        // loaded[2].d.should.equal(new Date("2018-01-01T15:00:00-01:00").getTime());

        loaded[0].u.should.equal(users[0].uid);
        loaded[1].u.should.equal(users[1].uid);
        loaded[2].u.should.equal(users[2].uid);

        loaded = await loader.count(note.date.getTime() - (note.tz || 0) * 60000 - 120 * 60000);
        loaded.should.equal(0);
    });

    it('should discard tokens based on date', async() => {
        store = new ST.Store(cred, 'ip', db);
        loader = new ST.Loader(cred, 'ip', db);

        let users = [
            {uid: '1', tkip: true, tk: {ip: 'tkiptoken1'}},
            {uid: '2', tkip: true, tk: {ip: 'tkiptoken2'}, tz: 180},
            {uid: '3', tkip: true, tk: {ip: 'tkiptoken3'}, tz: -60},
        ];

        let stored = await store.pushUsers(note, app, users);
        stored.inserted.should.equal(users.length);
        stored.next.should.equal(note.date.getTime());

        let loaded = await loader.discard(note.date.getTime() - (note.tz || 0) * 60000 - 120 * 60000, note.date.getTime() - (note.tz || 0) * 60000 - 120 * 60000);
        loaded.total.should.equal(2);
        loaded[note._id.toString()].should.equal(2);

        loaded = await loader.count(Date.now());
        loaded.should.equal(1);

        loaded = await loader.load(jobId, Date.now());
        loaded[0].u.should.equal(users[2].uid);

        loaded = await loader.count(Date.now());
        loaded.should.equal(0);
    });

    beforeEach(() => {
        return Promise.all([
            db.collection('messages').insertOne(note.toJSON()),
            db.collection('credentials').insertOne(cred.toJSON())
        ]);
    });

    afterEach(() => {
        return Promise.all([
            store ? store.clear() : Promise.resolve(),
            db.collection('messages').deleteOne({_id: note._id}),
            db.collection('credentials').deleteOne({_id: cred._id})
        ]);
    });

    after(() => db.close());
});