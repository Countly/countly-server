/**
 * /i/apps/update/plugins stores each args key as the field plugins.<key>, so a key
 * has to name one configuration section: a key with a "." or starting with "$" is
 * refused with nothing written. A dedicated app is created and deleted at the end.
 */

require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('App plugin configuration section names', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';

    /**
     * Update the app's plugin configuration
     * @param {object} args - sections to store
     * @returns {Promise<object>} response
     */
    function updatePlugins(args) {
        return request.post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN)
            .send({ app_id: APP_ID, args: JSON.stringify(args) });
    }

    /**
     * The app's stored plugins field
     * @returns {Promise<object>} plugins, {} when unset
     */
    async function storedPlugins() {
        const app = await testUtils.db.collection('apps').findOne({ _id: testUtils.db.ObjectID(APP_ID) }, { projection: { plugins: 1 } });
        return (app && app.plugins) || {};
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        const res = await request.get('/i/apps/create').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ name: 'Test App Plugin Keys ' + Date.now() }) }).expect(200);
        APP_ID = res.body._id;
    });

    after(async() => {
        if (APP_ID) {
            await request.get('/i/apps/delete').query({ api_key: API_KEY_ADMIN, args: JSON.stringify({ app_id: APP_ID }) }).expect(200);
        }
    });

    it('refuses a dotted key and writes nothing', async() => {
        const before = await storedPlugins();
        const res = await updatePlugins({ 'push.a._id': 'value', keysection: { a: 1 } });
        res.status.should.equal(400, res.text);
        (await storedPlugins()).should.eql(before);
    });

    it('refuses a key starting with $ and writes nothing', async() => {
        const before = await storedPlugins();
        const res = await updatePlugins({ '$where': 'value' });
        res.status.should.equal(400, res.text);
        (await storedPlugins()).should.eql(before);
    });

    it('still saves a section that is not a plugin', async() => {
        const res = await updatePlugins({ keysection: { a: 1 } });
        res.status.should.equal(200, res.text);
        (await storedPlugins()).should.have.property('keysection').eql({ a: 1 });
    });
});
