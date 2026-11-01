/**
 * App scope of /o/export/db on events_data, the collection every app
 * shares: a member gets the rows of their own apps only, whatever conditions the query
 * carries for the /drill/preprocess_query listeners (push), and a global admin is not scoped.
 *
 * Fixtures: a second app and a member with read on the fixture app, both through the API,
 * and four events_data rows (two per app) written directly and removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('DB export app scope', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    let READER = { id: '', key: '' };
    let ROW_IDS = [];

    /**
     * Export events_data through /o/export/db
     * @param {string} apiKey - caller's api key
     * @param {object} query - query
     * @returns {Promise<string[]>} the exported row ids, sorted
     */
    async function exportV1(apiKey, query) {
        const res = await request.get('/o/export/db').query({
            api_key: apiKey,
            app_id: APP_ID,
            db: 'countly',
            collection: 'events_data',
            query: JSON.stringify(query),
            type: 'json'
        });
        res.status.should.equal(200, res.text);
        return JSON.parse(res.text).map((row) => row._id).sort();
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');

        const app = await request.get('/i/apps/create')
            .query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'Export scope other app ' + Date.now() }) });
        OTHER_APP_ID = app.body._id;

        const args = {
            full_name: 'Export scope reader',
            username: 'export_scope_reader_' + Date.now(),
            password: testUtils.password,
            email: 'export_scope_reader_' + Date.now() + '@test.test',
            permission: {
                _: { a: [], u: [[APP_ID]] },
                c: {},
                r: { [APP_ID]: { all: true, allowed: {} } },
                u: {},
                d: {},
            },
        };
        const member = await request.get('/i/users/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify(args) });
        READER = { id: member.body._id, key: member.body.api_key };

        const rows = [
            { _id: APP_ID + '_scopetest_1', tkip: true },
            { _id: APP_ID + '_scopetest_2' },
            { _id: OTHER_APP_ID + '_scopetest_1', tkip: true },
            { _id: OTHER_APP_ID + '_scopetest_2' },
        ];
        ROW_IDS = rows.map((row) => row._id);
        await testUtils.db.collection('events_data').insertMany(rows);
    });

    after(async() => {
        if (ROW_IDS.length) {
            await testUtils.db.collection('events_data').deleteMany({ _id: { $in: ROW_IDS } });
        }
        if (READER.id) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: [READER.id] }) });
        }
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: OTHER_APP_ID }) });
        }
    });

    it('Should have created the fixtures', () => {
        should(OTHER_APP_ID).be.a.String().and.not.be.empty();
        should(READER.key).be.a.String().and.not.be.empty();
    });

    [['/o/export/db', exportV1]].forEach(([name, exportRows]) => {
        describe(name, () => {
            it('Should give a member no other app rows with a push condition and an _id clause', async() => {
                const ids = await exportRows(READER.key, { _id: { $regex: '_scopetest_' }, push: { $nin: ['tkip'] } });
                ids.should.eql([APP_ID + '_scopetest_2']);
            });

            it('Should give a member no other app rows with a push condition and a $or', async() => {
                const ids = await exportRows(READER.key, { $or: [{ _id: { $regex: '_scopetest_1$' } }, { _id: { $regex: '_scopetest_2$' } }], push: { $in: ['tkip'] } });
                ids.should.eql([APP_ID + '_scopetest_1']);
            });

            it('Should give a member no rows when the query names the other app', async() => {
                const ids = await exportRows(READER.key, { _id: { $regex: '^' + OTHER_APP_ID + '_scopetest_' } });
                ids.should.eql([]);
            });

            it('Should give a member their own rows, with push filters applied', async() => {
                (await exportRows(READER.key, { _id: { $regex: '_scopetest_' } })).should.eql([APP_ID + '_scopetest_1', APP_ID + '_scopetest_2']);
                (await exportRows(READER.key, { _id: { $regex: '_scopetest_' }, push: { $in: ['tkip'] } })).should.eql([APP_ID + '_scopetest_1']);
            });

            it('Should leave a global admin unscoped', async() => {
                (await exportRows(API_KEY_ADMIN, { _id: { $regex: '_scopetest_' } })).should.eql(ROW_IDS.slice().sort());
                (await exportRows(API_KEY_ADMIN, { _id: { $regex: '_scopetest_' }, push: { $in: ['tkip'] } })).should.eql([APP_ID + '_scopetest_1', OTHER_APP_ID + '_scopetest_1'].sort());
            });
        });
    });
});
