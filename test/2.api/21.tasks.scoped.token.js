/**
 * Tasks reached through a token limited to one app: the token acts on its owner's
 * tasks of that app only, while the owner's own api_key still reaches all of them.
 *
 * Fixtures: a second app (through the API), a token of the admin limited to the fixture
 * app, and three long_tasks documents created by the admin, written directly and
 * removed afterwards: one private and one global task on the other app, and one private
 * task on the fixture app.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('Tasks through an app-scoped token', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    let TOKEN = '';
    const STAMP = Date.now();
    const OWN_TASK = 'scopedtask_own_' + STAMP;
    const OTHER_TASK = 'scopedtask_other_' + STAMP;
    const OTHER_GLOBAL_TASK = 'scopedtask_otherglobal_' + STAMP;
    const TASK_IDS = [OWN_TASK, OTHER_TASK, OTHER_GLOBAL_TASK];

    /**
     * Permission granting everything on one app
     * @param {string} appId - app id
     * @returns {object} permission object
     */
    function adminOf(appId) {
        return {
            _: { a: [appId], u: [[appId]] },
            c: { [appId]: { all: true, allowed: {} } },
            r: { [appId]: { all: true, allowed: {} } },
            u: { [appId]: { all: true, allowed: {} } },
            d: { [appId]: { all: true, allowed: {} } },
        };
    }

    /**
     * Ids of the fixture tasks a task listing answers with
     * @param {object[]} rows - listed tasks
     * @returns {string[]} fixture task ids, sorted
     */
    function fixtureIds(rows) {
        return rows.map((row) => row._id).filter((id) => TASK_IDS.includes(id)).sort();
    }

    /**
     * List tasks through /o/tasks/list across every data source
     * @param {object} credential - api_key or auth_token
     * @returns {Promise<string[]>} fixture task ids listed
     */
    async function listAll(credential) {
        const res = await request.get('/o/tasks/list').query(Object.assign({ app_id: APP_ID, data_source: 'all', iDisplayStart: 0, iDisplayLength: 100 }, credential));
        res.status.should.equal(200, res.text);
        return fixtureIds(res.body.aaData);
    }

    /**
     * Count tasks through /o/tasks/count, limited to the fixtures
     * @param {object} credential - api_key or auth_token
     * @returns {Promise<number>} number of fixture tasks counted
     */
    async function countFixtures(credential) {
        const res = await request.get('/o/tasks/count').query(Object.assign({ app_id: APP_ID, query: JSON.stringify({ _id: { $in: TASK_IDS } }) }, credential));
        res.status.should.equal(200, res.text);
        return res.body.reduce((sum, row) => sum + row.c, 0);
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');

        const app = await request.get('/i/apps/create')
            .query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'Scoped task other app ' + STAMP }) });
        OTHER_APP_ID = app.body._id;

        const admin = await testUtils.db.collection('members').findOne({ api_key: API_KEY_ADMIN }, { projection: { _id: 1 } });
        const creator = admin._id + '';
        const task = (id, appId, global) => ({
            _id: id, app_id: appId, creator: creator, global: global, status: 'completed', type: 'drill',
            report_name: id, name: id, ts: Date.now(), start: Date.now(), end: Date.now(), data: '{}', request: '{}', meta: '{}'
        });
        await testUtils.db.collection('long_tasks').insertMany([
            task(OWN_TASK, APP_ID, false),
            task(OTHER_TASK, OTHER_APP_ID, false),
            task(OTHER_GLOBAL_TASK, OTHER_APP_ID, true),
        ]);

        const token = await request.get('/i/token/create').query({
            api_key: API_KEY_ADMIN, purpose: 'scoped task test', multi: true, ttl: 3600, apps: APP_ID, permission: JSON.stringify(adminOf(APP_ID))
        });
        token.status.should.equal(200, token.text);
        TOKEN = token.body.result;
    });

    after(async() => {
        await testUtils.db.collection('long_tasks').deleteMany({ _id: { $in: TASK_IDS } });
        if (TOKEN) {
            await testUtils.db.collection('auth_tokens').deleteOne({ _id: TOKEN });
        }
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: OTHER_APP_ID }) });
        }
    });

    it('Should have created the fixtures', () => {
        should(OTHER_APP_ID).be.a.String().and.not.be.empty();
        should(TOKEN).be.a.String().and.not.be.empty();
    });

    it('Should list only the token app tasks across every data source', async() => {
        (await listAll({ auth_token: TOKEN })).should.eql([OWN_TASK]);
    });

    it('Should count only the token app tasks', async() => {
        (await countFixtures({ auth_token: TOKEN })).should.equal(1);
    });

    it('Should list no other app tasks through /o/tasks/all', async() => {
        const res = await request.get('/o/tasks/all').query({ auth_token: TOKEN, app_id: APP_ID, app_ids: APP_ID + ',' + OTHER_APP_ID });
        fixtureIds(res.status === 200 ? res.body : []).should.not.containEql(OTHER_TASK);
        fixtureIds(res.status === 200 ? res.body : []).should.not.containEql(OTHER_GLOBAL_TASK);
    });

    it('Should read the token app task', async() => {
        const res = await request.get('/o/tasks/task').query({ auth_token: TOKEN, app_id: APP_ID, task_id: OWN_TASK });
        res.status.should.equal(200, res.text);
    });

    it('Should not read the owner private task of another app', async() => {
        const res = await request.get('/o/tasks/task').query({ auth_token: TOKEN, app_id: APP_ID, task_id: OTHER_TASK });
        res.status.should.equal(400, res.text);
    });

    it('Should not read the owner global task of another app', async() => {
        const res = await request.get('/o/tasks/task').query({ auth_token: TOKEN, app_id: APP_ID, task_id: OTHER_GLOBAL_TASK });
        res.status.should.equal(400, res.text);
    });

    it('Should not report the status of another app task', async() => {
        const res = await request.get('/o/tasks/check').query({ auth_token: TOKEN, app_id: APP_ID, task_id: JSON.stringify([OWN_TASK, OTHER_TASK, OTHER_GLOBAL_TASK]) });
        res.status.should.equal(200, res.text);
        const reported = (res.body.result || []).filter((row) => row.result !== 'deleted').map((row) => row._id);
        reported.should.eql([OWN_TASK]);
    });

    it('Should not download another app task', async() => {
        const res = await request.get('/o/export/download/' + OTHER_TASK).query({ auth_token: TOKEN, app_id: APP_ID });
        res.status.should.equal(403, res.text);
    });

    it('Should not rename or delete another app task', async() => {
        const rename = await request.get('/i/tasks/name').query({ auth_token: TOKEN, app_id: APP_ID, task_id: OTHER_TASK, name: 'renamed' });
        rename.status.should.not.equal(200, rename.text);
        const del = await request.get('/i/tasks/delete').query({ auth_token: TOKEN, app_id: APP_ID, task_id: OTHER_TASK });
        del.status.should.not.equal(200, del.text);
        const stored = await testUtils.db.collection('long_tasks').findOne({ _id: OTHER_TASK });
        should(stored).be.ok();
        stored.name.should.equal(OTHER_TASK);
    });

    it('Should leave the owner own api_key reaching every app task', async() => {
        (await listAll({ api_key: API_KEY_ADMIN })).should.eql(TASK_IDS.slice().sort());
        (await countFixtures({ api_key: API_KEY_ADMIN })).should.equal(3);
        const res = await request.get('/o/tasks/task').query({ api_key: API_KEY_ADMIN, app_id: APP_ID, task_id: OTHER_TASK });
        res.status.should.equal(200, res.text);
    });
});
