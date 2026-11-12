var request = require('supertest');
var should = require('should');
var testUtils = require('../../../test/testUtils');

request = request(testUtils.url);

// /i/data-manager/category/edit renames categories of the app in app_id and creates
// the ones without an _id. An _id of another app's category is ignored: that category
// is not changed and the rest of the batch is still applied.

describe('Data manager: category edit', function() {
    var API_KEY_ADMIN = '';
    var APP_ID = '';
    var OTHER_APP_ID = '';
    var STAMP = Date.now();

    /**
     * Categories of an app
     * @param {string} appId - app id
     * @returns {Promise<array>} categories
     */
    async function categoriesOf(appId) {
        var res = await request.get('/o/data-manager/category').query({api_key: API_KEY_ADMIN, app_id: appId});
        res.status.should.equal(200, res.text);
        return res.body;
    }

    /**
     * Create a category and return it
     * @param {string} appId - app id
     * @param {string} name - category name
     * @returns {Promise<object>} the category
     */
    async function createCategory(appId, name) {
        var res = await request.get('/i/data-manager/category/create').query({api_key: API_KEY_ADMIN, app_id: appId, categories: JSON.stringify([name])});
        res.status.should.equal(200, res.text);
        var found = null;
        for (var i = 0; i < 20 && !found; i++) {
            found = await testUtils.db.collection('event_categories').findOne({app: appId, name: name});
            if (!found) {
                await new Promise(function(resolve) {
                    setTimeout(resolve, 100);
                });
            }
        }
        should.exist(found);
        return found;
    }

    before(async function() {
        API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
        APP_ID = testUtils.get('APP_ID');
        var res = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify({name: 'dm_category_' + STAMP})});
        res.status.should.equal(200, res.text);
        OTHER_APP_ID = res.body._id;
    });

    after(async function() {
        await testUtils.db.collection('event_categories').deleteMany({name: {$regex: '^dm_cat_' + STAMP}});
        if (OTHER_APP_ID) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: OTHER_APP_ID})});
        }
    });

    it('applies the batch for its own app and leaves another app\'s category alone', async function() {
        var own = await createCategory(APP_ID, 'dm_cat_' + STAMP + '_own');
        var foreign = await createCategory(OTHER_APP_ID, 'dm_cat_' + STAMP + '_foreign');

        var res = await request.get('/i/data-manager/category/edit').query({
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            categories: JSON.stringify([
                {_id: own._id + '', name: 'dm_cat_' + STAMP + '_own_renamed'},
                {_id: foreign._id + '', name: 'dm_cat_' + STAMP + '_renamed_from_other_app'},
                {name: 'dm_cat_' + STAMP + '_new'}
            ])
        });
        res.status.should.equal(200, res.text);

        var ownCategories = (await categoriesOf(APP_ID)).filter(function(c) {
            return c.name.indexOf('dm_cat_' + STAMP) === 0;
        }).map(function(c) {
            return c.name;
        }).sort();
        ownCategories.should.eql(['dm_cat_' + STAMP + '_new', 'dm_cat_' + STAMP + '_own_renamed']);

        var foreignAfter = await testUtils.db.collection('event_categories').findOne({_id: foreign._id});
        foreignAfter.should.have.property('app', OTHER_APP_ID);
        foreignAfter.should.have.property('name', 'dm_cat_' + STAMP + '_foreign');
    });

    it('rejects categories that are not an array', async function() {
        var res = await request.get('/i/data-manager/category/edit').query({
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            categories: JSON.stringify({name: 'dm_cat_' + STAMP + '_object'})
        });
        res.status.should.equal(500, res.text);
        should.not.exist(await testUtils.db.collection('event_categories').findOne({name: 'dm_cat_' + STAMP + '_object'}));
    });
});
