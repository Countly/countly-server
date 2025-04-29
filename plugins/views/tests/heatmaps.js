const crypto = require('crypto');

const moment = require('moment');
const should = require('should');
const spt = require('supertest');

const pluginManager = require('../../pluginManager.js');
const testUtils = require('../../../test/testUtils');

const request = spt(testUtils.url);
const APP_ID = testUtils.get('APP_ID');
const API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');
const APP_KEY = testUtils.get('APP_KEY');

describe('Heatmap', async() => {
    const clickData = {
        type: 'click',
        x: 1353,
        y: 230,
        width: 1440,
        height: 3586,
    };

    before(async() => {
        await request
            .get('/i')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'heatmap_test',
                events: JSON.stringify([
                    {
                        key: '[CLY]_view',
                        count: 1,
                        timestamp: moment('2010-01-02').valueOf(),
                        hour: 21,
                        segmentation: {
                            name: 'Home',
                            visit: 1,
                            start: 1,
                            exit: 1,
                            bounce: 0,
                        },
                    },
                ]),
            })
            .expect(200);

        await request
            .get('/i')
            .query({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                device_id: 'heatmap_test',
                events: JSON.stringify([
                    {
                        key: '[CLY]_action',
                        count: 1,
                        timestamp: moment('2010-01-02').valueOf(),
                        hour: 21,
                        segmentation: {
                            ...clickData,
                            domain: 'https://doma.in',
                            view: 'Home',
                        },
                    },
                ]),
            })
            .expect(200);
    });

    it('gets heatmap data from drill_events collection', async() => {
        const { body } = await request.post('/o/actions')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                view: 'Home',
                period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
                device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
                actionType: 'click',
            });

        const { data } = body;
        should(data.length).equal(1);
        should(data[0].sg).eql(clickData);
    });

    it('gets heatmap data from old drill_events collection if union_with is true', async() => {
        const db = await pluginManager.dbConnection('countly_drill');
        const oldCollectionName = 'drill_events' + crypto.createHash('sha1').update('[CLY]_action' + APP_ID).digest('hex');

        const resp = await request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID);
        const drillConfig = resp.body.plugins.drill;

        drillConfig.use_union_with = true;

        await request.post('/i/apps/update/plugins')
            .send({
                app_id: APP_ID,
                api_key: API_KEY_ADMIN,
                args: { drill: drillConfig },
            });

        await db.collection(oldCollectionName).insertOne({
            did: 'heatmap_test',
            sg: {
                ...clickData,
                domain: 'https://doma.in',
                view: 'Home',
            },
            ts: moment('2010-01-02').valueOf(),
            up: { lv: 'Home' },
        });

        const { body } = await request.post('/o/actions')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                view: 'Home',
                period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
                device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
                actionType: 'click',
            });

        const { data } = body;
        should(data.length).equal(2);
        should(data[0].sg).eql(clickData);
        should(data[1].sg).eql(clickData);

        await db.collection(oldCollectionName).remove({ did: 'heatmap_test' });

        db.close();
    });

    it('does not get heatmap data from old drill_events collection if union_with is false', async() => {
        const db = await pluginManager.dbConnection('countly_drill');
        const oldCollectionName = 'drill_events' + crypto.createHash('sha1').update('[CLY]_action' + APP_ID).digest('hex');

        const resp = await request.get('/o/apps/plugins?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID);
        const drillConfig = resp.body.plugins.drill;

        drillConfig.use_union_with = false;

        await request.post('/i/apps/update/plugins')
            .send({
                app_id: APP_ID,
                api_key: API_KEY_ADMIN,
                args: { drill: drillConfig },
            });

        await db.collection(oldCollectionName).insertOne({
            did: 'heatmap_test',
            sg: {
                ...clickData,
                domain: 'https://doma.in',
                view: 'Home',
            },
            ts: moment('2010-01-02').valueOf(),
            up: { lv: 'Home' },
        });

        const { body } = await request.post('/o/actions')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                view: 'Home',
                period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
                device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
                actionType: 'click',
            });

        const { data } = body;
        should(data.length).equal(1);
        should(data[0].sg).eql(clickData);

        drillConfig.use_union_with = true;

        await request.post('/i/apps/update/plugins')
            .send({
                app_id: APP_ID,
                api_key: API_KEY_ADMIN,
                args: { drill: drillConfig },
            });

        await db.collection(oldCollectionName).remove({ did: 'heatmap_test' });

        db.close();
    });

    after(async() => {
        const db = await pluginManager.dbConnection('countly_drill');

        await db.collection('drill_events').remove({ did: 'heatmap_test' });

        db.close();
    });
});
