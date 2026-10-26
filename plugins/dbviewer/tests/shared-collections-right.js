/**
 * The shared event collections (`events_data`, `drill_events`) need the
 * dbviewer read right like every other collection, and their rows are scoped
 * to the apps the member holds that right on, not to every app they belong to.
 * The DB export (/o/export/db) follows the same rule.
 *
 * This server has no `countly_drill` database (it is connected only when the
 * drill plugin is installed), so the DB Viewer reads are checked on
 * `events_data`, and `drill_events` only through the export access rule.
 *
 * THE ORDER IS THE TEST: the setup case creates a second app, the limited
 * members and one row per app in events_data; every case after it reads
 * against them.
 */
const should = require('should');
let request = require('supertest');
const testUtils = require('../../../test/testUtils');

request = request(testUtils.url);

describe('DBViewer shared collections right', () => {
    const uniq = Date.now();

    let API_KEY_ADMIN = '';
    /** The test app. */
    let APP_A = '';
    /** A second app both members belong to without the dbviewer right. */
    let APP_B = '';
    /** events read on APP_A and APP_B, no dbviewer anywhere. */
    let noViewerKey = '';
    /** dbviewer read on APP_A, events read on APP_B. */
    let viewerKey = '';
    /** drill read on APP_A, no dbviewer anywhere. */
    let drillKey = '';
    /** users read on APP_A, no dbviewer anywhere. */
    let usersKey = '';
    const memberIds = [];
    let countlyDb;

    const marker = 'dbv_shared_' + uniq;

    /**
     * A permission object granting, per app, the given features for the read verb.
     * @param {Object<string, string[]>} featuresByApp app id → feature names
     * @returns {object} permission object accepted by /i/users/create
     */
    function readPermission(featuresByApp) {
        const apps = Object.keys(featuresByApp);
        const perm = { _: { a: [], u: [apps] }, c: {}, r: {}, u: {}, d: {} };
        apps.forEach((app) => {
            perm.r[app] = { all: false, allowed: {} };
            featuresByApp[app].forEach((feature) => {
                perm.r[app].allowed[feature] = true;
            });
        });
        return perm;
    }

    /**
     * A management call taking its payload as JSON `args`, as the global admin.
     * @param {string} path endpoint
     * @param {object} args payload
     * @returns {Promise<object>} supertest response
     */
    function manage(path, args) {
        return request.get(path).query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) });
    }

    /**
     * Create a member and return its api key.
     * @param {string} name username prefix
     * @param {object} perm permission object
     * @returns {Promise<string>} the new member's api key
     */
    async function createMember(name, perm) {
        const res = await manage('/i/users/create', {
            full_name: `${name}${uniq}`,
            username: `${name}${uniq}`,
            password: 'p4ssw0rD!',
            email: `${name}${uniq}@mail.test`,
            permission: perm,
        });
        should(res.status).equal(200);
        should(res.body.api_key).be.ok();
        memberIds.push(res.body._id);
        return res.body.api_key;
    }

    /**
     * Read a shared collection as a member.
     * @param {string} key api key
     * @param {string} dbs database name
     * @param {string} collection collection name
     * @param {object} [extra] further query parameters
     * @returns {Promise<object>} supertest response
     */
    function readCollection(key, dbs, collection, extra) {
        return request.get('/o/db').query(Object.assign({ api_key: key, app_id: APP_A, dbs, collection, limit: 100 }, extra || {}));
    }

    /**
     * Export a shared collection as a member.
     * @param {string} key api key
     * @param {string} db database name
     * @param {string} collection collection name
     * @param {object} [query] export query, the seeded rows by default
     * @returns {Promise<object>} supertest response
     */
    function exportCollection(key, db, collection, query) {
        return request.get('/o/export/db').query({ api_key: key, app_id: APP_A, db, collection, type: 'json', query: JSON.stringify(query || { marker }) });
    }

    /**
     * The collection names the database list shows a member for APP_A.
     * @param {string} key api key
     * @returns {Promise<string[]>} collection names across all listed databases
     */
    async function listedCollections(key) {
        const res = await request.get('/o/db').query({ api_key: key, app_id: APP_A });
        should(res.status).equal(200);
        return res.body.reduce((names, db) => names.concat(Object.values(db.collections || {})), []);
    }

    /**
     * Read one events_data document as a member.
     * @param {string} key api key
     * @param {string} app app id the document belongs to
     * @returns {Promise<object>} supertest response
     */
    function readDocument(key, app) {
        return request.get('/o/db').query({ api_key: key, app_id: APP_A, dbs: 'countly', collection: 'events_data', document: app + '_' + marker });
    }

    after(async() => {
        if (countlyDb) {
            await countlyDb.collection('events_data').deleteMany({ marker });
        }
        if (memberIds.length) {
            await manage('/i/users/delete', { user_ids: memberIds });
        }
        if (APP_B) {
            await manage('/i/apps/delete', { app_id: APP_B });
        }
    });

    it('should set up a second app, two limited members and one row per app', async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_A = testUtils.get('APP_ID');
        countlyDb = testUtils.client.db('countly');

        const appRes = await manage('/i/apps/create', {
            name: `dbvSharedB${uniq}`,
            country: 'TR',
            type: 'mobile',
            category: '6',
            timezone: 'Europe/Istanbul',
        });
        should(appRes.status).equal(200);
        APP_B = appRes.body._id;
        should(APP_B).be.ok();

        noViewerKey = await createMember('dbvnoviewer', readPermission({ [APP_A]: ['events'], [APP_B]: ['events'] }));
        viewerKey = await createMember('dbvviewer', readPermission({ [APP_A]: ['dbviewer'], [APP_B]: ['events'] }));
        drillKey = await createMember('dbvdrill', readPermission({ [APP_A]: ['drill'] }));
        usersKey = await createMember('dbvusers', readPermission({ [APP_A]: ['users'] }));

        await countlyDb.collection('events_data').insertMany([
            { _id: APP_A + '_' + marker, marker },
            { _id: APP_B + '_' + marker, marker },
        ]);
    });

    // ── No dbviewer right anywhere ───────────────────────────────────────────

    it('should refuse events_data to a member without the dbviewer right', async() => {
        const res = await readCollection(noViewerKey, 'countly', 'events_data');
        should(res.status).equal(401);
    });

    it('should refuse an events_data aggregation to a member without the dbviewer right', async() => {
        const res = await readCollection(noViewerKey, 'countly', 'events_data', { aggregation: JSON.stringify([{ $match: { marker } }]) });
        should(res.status).equal(401);
    });

    // ── dbviewer right on one app, membership of another ─────────────────────

    it('should return only the rows of the apps with the dbviewer right from events_data', async() => {
        const res = await readCollection(viewerKey, 'countly', 'events_data', { filter: JSON.stringify({ marker }) });
        should(res.status).equal(200);
        const ids = res.body.collections.map((row) => row._id);
        should(ids).eql([APP_A + '_' + marker]);
    });

    it('should aggregate only the events_data rows of the apps with the dbviewer right', async() => {
        const res = await readCollection(viewerKey, 'countly', 'events_data', { aggregation: JSON.stringify([{ $match: { marker } }]) });
        should(res.status).equal(200);
        const ids = res.body.aaData.map((row) => row._id);
        should(ids).eql([APP_A + '_' + marker]);
    });

    // ── DB export ────────────────────────────────────────────────────────────

    it('should refuse the shared collections to an export without the right', async() => {
        should((await exportCollection(noViewerKey, 'countly_drill', 'drill_events')).status).equal(401);
        should((await exportCollection(noViewerKey, 'countly', 'events_data')).status).equal(401);
    });

    it('should export only the events_data rows of the apps with the dbviewer right', async() => {
        const res = await exportCollection(viewerKey, 'countly', 'events_data');
        should(res.status).equal(200);
        should(JSON.parse(res.text).map((row) => row._id)).eql([APP_A + '_' + marker]);
    });

    // ── Collection list and single documents ─────────────────────────────────

    it('should leave events_data out of the database list without the dbviewer right', async() => {
        const names = await listedCollections(noViewerKey);
        should(names).not.containEql('events_data');
    });

    it('should list events_data with the dbviewer right', async() => {
        const names = await listedCollections(viewerKey);
        should(names).containEql('events_data');
    });

    it('should refuse an events_data document without the dbviewer right', async() => {
        const res = await readDocument(noViewerKey, APP_A);
        should(res.status).equal(401);
    });

    it('should return an events_data document only of an app with the dbviewer right', async() => {
        const own = await readDocument(viewerKey, APP_A);
        should(own.status).equal(200);
        should(own.body._id).equal(APP_A + '_' + marker);
        const other = await readDocument(viewerKey, APP_B);
        should(other.status).equal(200);
        should(other.body).eql({});
    });

    // ── drill_events exports with the drill or users right ───────────────────
    // Without a countly_drill database there are no rows to compare, so these
    // check the access rule: the export is accepted, not refused.

    it('should accept a drill_events export with the drill right, and refuse events_data to it', async() => {
        should((await exportCollection(drillKey, 'countly_drill', 'drill_events')).status).equal(200);
        should((await exportCollection(drillKey, 'countly', 'events_data')).status).equal(401);
    });

    it('should accept a drill_events export with the users right', async() => {
        should((await exportCollection(usersKey, 'countly_drill', 'drill_events')).status).equal(200);
    });
});
