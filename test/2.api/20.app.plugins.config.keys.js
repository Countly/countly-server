/**
 * /i/apps/update/plugins stores each args key as one plugins.<key> section of the app.
 * A key containing "." or starting with "$" is refused with 400 and nothing is written;
 * an ordinary section key still saves.
 *
 * A dedicated app is created and deleted at the end.
 */
const should = require('should');
const supertest = require('supertest');

const testUtils = require('../testUtils');

const request = supertest(testUtils.url);

describe('App plugin configuration keys', () => {
    let API_KEY_ADMIN = '';
    let APP_ID = '';

    /**
     * Read the app document
     * @returns {Promise<object>} app
     */
    function readApp() {
        return testUtils.db.collection('apps').findOne({_id: testUtils.db.ObjectID(APP_ID)});
    }

    /**
     * Save plugin configuration for the app
     * @param {object} args - configuration by section
     * @returns {Promise<object>} the response
     */
    function save(args) {
        return request.post('/i/apps/update/plugins?api_key=' + API_KEY_ADMIN).send({app_id: APP_ID, args: JSON.stringify(args)});
    }

    before(async() => {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        const res = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify({name: 'Plugin config keys ' + Date.now()})});
        res.status.should.equal(200, res.text);
        APP_ID = res.body._id;
    });

    after(async() => {
        if (APP_ID) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: APP_ID})});
        }
    });

    it('Should save an ordinary section key', async() => {
        const res = await save({configkeystest: {enabled: true}});
        res.status.should.equal(200, res.text);
        const app = await readApp();
        app.plugins.configkeystest.should.eql({enabled: true});
    });

    ['push.a._id', 'configkeystest.enabled', '$set'].forEach((key) => {
        it('Should refuse the key ' + key + ' and write nothing', async() => {
            const before = await readApp();
            const res = await save({[key]: 'changed'});
            res.status.should.equal(400, res.text);
            const after = await readApp();
            should(after.plugins).eql(before.plugins);
        });
    });

    it('Should refuse the whole request when one key is invalid', async() => {
        const before = await readApp();
        const res = await save({configkeystest: {enabled: false}, 'push.a._id': 'changed'});
        res.status.should.equal(400, res.text);
        const after = await readApp();
        should(after.plugins).eql(before.plugins);
    });
});
