/**
 * /o/export/db on a per-app collection takes the right DB Viewer reads it with:
 * dbviewer read on the app the collection belongs to. A member of the app without
 * it is refused; one with it, and a global admin, still export.
 */

require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('DB export of a per-app collection takes the dbviewer read right', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    const MEMBERS = {};

    /**
     * Create a member reading the listed features on the fixture app
     * @param {string} name - member name
     * @param {object} allowed - features with read
     * @returns {Promise<object>} {id, key}
     */
    async function createMember(name, allowed) {
        const suffix = name + '_' + Date.now();
        const args = {
            full_name: 'Export right ' + name,
            username: 'export_right_' + suffix,
            password: testUtils.password,
            email: 'export_right_' + suffix + '@test.test',
            permission: {
                _: { a: [], u: [[APP_ID]] },
                c: {},
                r: { [APP_ID]: { all: false, allowed: allowed } },
                u: {},
                d: {},
            },
        };
        const res = await request.get('/i/users/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) }).expect(200);
        return { id: res.body._id, key: res.body.api_key };
    }

    /**
     * Export the fixture app's app_users collection
     * @param {string} apiKey - caller's api key
     * @returns {Promise<object>} response
     */
    function exportAppUsers(apiKey) {
        return request.get('/o/export/db').query({
            api_key: apiKey,
            app_id: APP_ID,
            db: 'countly',
            collection: 'app_users' + APP_ID,
            query: JSON.stringify({}),
            limit: 1,
            type: 'json'
        });
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');
        MEMBERS.core = await createMember('core', { core: true });
        MEMBERS.dbviewer = await createMember('dbviewer', { dbviewer: true });
    });

    after(async() => {
        const ids = Object.keys(MEMBERS).map((k) => MEMBERS[k].id).filter(Boolean);
        if (ids.length) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: ids }) });
        }
    });

    it('refuses a member of the app without dbviewer read', async() => {
        const res = await exportAppUsers(MEMBERS.core.key);
        res.status.should.equal(401, res.text);
    });

    it('exports for a member with dbviewer read on the app', async() => {
        const res = await exportAppUsers(MEMBERS.dbviewer.key);
        res.status.should.equal(200, res.text);
        JSON.parse(res.text).should.be.an.Array();
    });

    it('exports for a global admin', async() => {
        const res = await exportAppUsers(API_KEY_ADMIN);
        res.status.should.equal(200, res.text);
        JSON.parse(res.text).should.be.an.Array();
    });
});
