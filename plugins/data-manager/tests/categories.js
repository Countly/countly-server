/**
 * /i/data-manager/category/edit renames this app's categories and adds new ones.
 * An _id that belongs to another app's category is skipped, and the app's own
 * edits in the same request still apply.
 *
 * Fixtures: a second app and categories written directly, removed afterwards.
 */

const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../test/testUtils');

const request = supertest(testUtils.url);

describe('Data manager category edit', function() {
    const STAMP = Date.now();
    let API_KEY_ADMIN = '';
    let APP_ID = '';
    let OTHER_APP_ID = '';
    let OWN_CATEGORY = null;
    let OTHER_CATEGORY = null;

    before(async function() {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');
        const app = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify({name: 'dm_category_other_' + STAMP})});
        app.status.should.equal(200, app.text);
        OTHER_APP_ID = app.body._id;

        OWN_CATEGORY = testUtils.db.ObjectID();
        OTHER_CATEGORY = testUtils.db.ObjectID();
        await testUtils.db.collection('event_categories').insertMany([
            {_id: OWN_CATEGORY, app: APP_ID + '', name: 'dm_own_' + STAMP},
            {_id: OTHER_CATEGORY, app: OTHER_APP_ID + '', name: 'dm_other_' + STAMP}
        ]);
    });

    after(async function() {
        await testUtils.db.collection('event_categories').deleteMany({
            $or: [
                {_id: {$in: [OWN_CATEGORY, OTHER_CATEGORY]}},
                {name: {$regex: '^dm_.*_' + STAMP + '$'}}
            ]
        });
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: OTHER_APP_ID})});
        }
    });

    it('skips another app\'s category and applies the app\'s own edits', async function() {
        const categories = [
            {_id: OTHER_CATEGORY + '', name: 'dm_taken_' + STAMP},
            {_id: OWN_CATEGORY + '', name: 'dm_renamed_' + STAMP},
            {name: 'dm_added_' + STAMP}
        ];
        const res = await request.post('/i/data-manager/category/edit')
            .type('form')
            .send({api_key: API_KEY_ADMIN, app_id: APP_ID, categories: JSON.stringify(categories)});
        res.status.should.equal(200, res.text);

        const other = await testUtils.db.collection('event_categories').findOne({_id: OTHER_CATEGORY});
        other.should.have.property('app', OTHER_APP_ID + '');
        other.should.have.property('name', 'dm_other_' + STAMP);

        const own = await testUtils.db.collection('event_categories').findOne({_id: OWN_CATEGORY});
        own.should.have.property('app', APP_ID + '');
        own.should.have.property('name', 'dm_renamed_' + STAMP);

        const added = await testUtils.db.collection('event_categories').findOne({app: APP_ID + '', name: 'dm_added_' + STAMP});
        should.exist(added);

        const taken = await testUtils.db.collection('event_categories').countDocuments({name: 'dm_taken_' + STAMP});
        taken.should.equal(0);
    });
});
