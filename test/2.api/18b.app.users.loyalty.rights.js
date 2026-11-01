/**
 * /o/app_users/loyalty needs the core read right on the app, the same right as
 * /o/analytics/loyalty: a member whose only feature on the app is another one
 * (reports) is refused, and a core reader gets the buckets for the query as sent.
 *
 * Fixtures: two members through the API and three app users written directly,
 * all removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('App users loyalty rights', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    const MEMBERS = {};
    const USER_IDS = ['loyaltyrights_1', 'loyaltyrights_2', 'loyaltyrights_3'];

    /**
     * Create a member with read on the fixture app for the given features
     * @param {string} name - username prefix
     * @param {object} allowed - features allowed on the app
     * @returns {Promise<object>} the member's id and api key
     */
    async function createMember(name, allowed) {
        const stamp = Date.now();
        const args = {
            full_name: name,
            username: name + '_' + stamp,
            password: testUtils.password,
            email: name + '_' + stamp + '@test.test',
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

    /**
     * Request loyalty buckets
     * @param {string} apiKey - caller's api key
     * @param {object} query - app users query
     * @returns {Promise<object>} the response
     */
    function loyalty(apiKey, query) {
        return request.get('/o/app_users/loyalty').query({ api_key: apiKey, app_id: APP_ID, query: JSON.stringify(query) });
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');
        MEMBERS.reports = await createMember('loyalty_reports_only', { reports: true });
        MEMBERS.core = await createMember('loyalty_core_reader', { core: true });

        const now = Math.round(Date.now() / 1000);
        await testUtils.db.collection('app_users' + APP_ID).insertMany([
            { _id: USER_IDS[0], uid: USER_IDS[0], sc: 1, ls: now, custom: { loyaltyrights: 'alpha' } },
            { _id: USER_IDS[1], uid: USER_IDS[1], sc: 4, ls: now, custom: { loyaltyrights: 'alpine' } },
            { _id: USER_IDS[2], uid: USER_IDS[2], sc: 4, ls: now, custom: { loyaltyrights: 'beta' } },
        ]);
    });

    after(async() => {
        await testUtils.db.collection('app_users' + APP_ID).deleteMany({ _id: { $in: USER_IDS } });
        const ids = Object.values(MEMBERS).map((member) => member.id).filter(Boolean);
        if (ids.length) {
            await request.get('/i/users/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ user_ids: ids }) });
        }
    });

    it('Should have created the fixtures', () => {
        should(MEMBERS.reports.key).be.a.String().and.not.be.empty();
        should(MEMBERS.core.key).be.a.String().and.not.be.empty();
    });

    it('Should refuse a member without the core read right', async() => {
        const res = await loyalty(MEMBERS.reports.key, { 'custom.loyaltyrights': { $regex: '^alp' } });
        res.status.should.equal(401, res.text);
        should(res.body).not.have.property('all');
    });

    it('Should give a core reader the buckets for the query as sent', async() => {
        const res = await loyalty(MEMBERS.core.key, { 'custom.loyaltyrights': { $regex: '^alp' } });
        res.status.should.equal(200, res.text);
        const expected = [{ _id: '1', count: 1, index: 0 }, { _id: '3-5', count: 1, index: 2 }];
        res.body.all.should.eql(expected);
        res.body['7days'].should.eql(expected);
        res.body['30days'].should.eql(expected);
    });

    it('Should give a core reader the same buckets as a global admin', async() => {
        const query = { 'custom.loyaltyrights': { $in: ['alpine', 'beta'] } };
        const asReader = await loyalty(MEMBERS.core.key, query);
        const asAdmin = await loyalty(API_KEY_ADMIN, query);
        asReader.status.should.equal(200, asReader.text);
        asAdmin.status.should.equal(200, asAdmin.text);
        asReader.body.all.should.eql([{ _id: '3-5', count: 2, index: 2 }]);
        asReader.body.should.eql(asAdmin.body);
    });
});
