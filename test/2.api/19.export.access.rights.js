/**
 * /o/export/db reads a per-app collection only for a member with the dbviewer read right on
 * that app, as DB Viewer does. /o/app_users/download/<task id> serves a task result only to a
 * member who may read the task, and only an export of the app the request is for.
 *
 * Fixtures: two members through the API, a second app and two long_tasks documents written
 * directly, all removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('Export access rights', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    const MEMBERS = {};
    const STAMP = Date.now();
    const TASK_OTHER_APP = 'exportrights_other_' + STAMP;
    const TASK_NOT_READABLE = 'exportrights_private_' + STAMP;

    /**
     * Create a member with read on the fixture app for the given features
     * @param {string} name - username prefix
     * @param {object} allowed - features allowed on the app
     * @returns {Promise<object>} the member's id and api key
     */
    async function createMember(name, allowed) {
        const args = {
            full_name: name,
            username: name + '_' + STAMP,
            password: testUtils.password,
            email: name + '_' + STAMP + '@test.test',
            permission: {
                _: { a: [], u: [[APP_ID]] },
                c: {},
                r: { [APP_ID]: { all: false, allowed: allowed } },
                u: {},
                d: {},
            },
        };
        const res = await request.get('/i/users/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) });
        res.status.should.equal(200, res.text);
        return { id: res.body._id, key: res.body.api_key };
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');
        MEMBERS.core = await createMember('exportrights_core', { core: true });
        MEMBERS.dbviewer = await createMember('exportrights_dbviewer', { core: true, dbviewer: true });

        const app = await request.get('/i/apps/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'Export rights other app ' + STAMP }) });
        app.status.should.equal(200, app.text);
        OTHER_APP_ID = app.body._id;

        await testUtils.db.collection('long_tasks').insertMany([
            {
                _id: TASK_OTHER_APP,
                type: 'AppUserExport',
                status: 'completed',
                app_id: APP_ID,
                creator: MEMBERS.core.id + '',
                global: false,
                data: '"appUser_' + OTHER_APP_ID + '_1.tar.gz"',
            },
            {
                _id: TASK_NOT_READABLE,
                type: 'AppUserExport',
                status: 'completed',
                app_id: APP_ID,
                creator: 'someone_else',
                global: false,
                data: '"appUser_' + APP_ID + '_1.tar.gz"',
            },
        ]);
    });

    after(async() => {
        await testUtils.db.collection('long_tasks').deleteMany({ _id: { $in: [TASK_OTHER_APP, TASK_NOT_READABLE] } });
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: OTHER_APP_ID }) });
        }
        const ids = Object.values(MEMBERS).map((member) => member.id).filter(Boolean);
        if (ids.length) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: ids }) });
        }
    });

    describe('/o/export/db', () => {
        /**
         * Export the app's app_users collection
         * @param {string} apiKey - caller's api key
         * @returns {Promise<object>} the response
         */
        function exportAppUsers(apiKey) {
            return request.get('/o/export/db').query({ api_key: apiKey, app_id: APP_ID, collection: 'app_users' + APP_ID, type: 'json', limit: 1 });
        }

        it('Should refuse a member without the dbviewer read right', async() => {
            const res = await exportAppUsers(MEMBERS.core.key);
            res.status.should.equal(401, res.text);
        });

        it('Should export for a member with the dbviewer read right', async() => {
            const res = await exportAppUsers(MEMBERS.dbviewer.key);
            res.status.should.equal(200, res.text);
        });

        it('Should export for a global admin', async() => {
            const res = await exportAppUsers(API_KEY_ADMIN);
            res.status.should.equal(200, res.text);
        });
    });

    describe('/o/app_users/download/<task id>', () => {
        it('Should refuse a task the member may not read', async() => {
            const res = await request.get('/o/app_users/download/' + TASK_NOT_READABLE).query({ api_key: MEMBERS.core.key, app_id: APP_ID });
            res.status.should.equal(403, res.text);
        });

        it('Should refuse a task whose export belongs to another app', async() => {
            const res = await request.get('/o/app_users/download/' + TASK_OTHER_APP).query({ api_key: MEMBERS.core.key, app_id: APP_ID });
            res.status.should.equal(403, res.text);
        });

        it('Should answer 404 for an unknown task', async() => {
            const res = await request.get('/o/app_users/download/exportrights_missing_' + STAMP).query({ api_key: MEMBERS.core.key, app_id: APP_ID });
            res.status.should.equal(404, res.text);
            should(res.headers['content-disposition']).be.undefined();
        });
    });
});
