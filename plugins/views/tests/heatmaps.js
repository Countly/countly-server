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

    it('does not widen the match when view is not a scalar', async() => {
        const db = await pluginManager.dbConnection('countly_drill');
        const baseQuery = {
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            app_key: APP_KEY,
            period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
            device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
            actionType: 'click',
        };

        // a second action on a different view, so a widened match would return
        // two rows where a match on one view returns one
        await db.collection('drill_events').insertOne({
            did: 'heatmap_test',
            a: APP_ID,
            e: '[CLY]_action',
            sg: { ...clickData, domain: 'https://doma.in', view: 'About' },
            ts: moment('2010-01-02').valueOf(),
            up: { lv: 'About' },
        });

        // a string view still returns only that view's action
        const scoped = await request.post('/o/actions').send({ ...baseQuery, view: 'Home' });
        should(scoped.status).equal(200);
        should(scoped.body.data.length).equal(1);
        should(scoped.body.data[0].sg).eql(clickData);

        // an object view is refused rather than run as a query expression
        const widened = await request.post('/o/actions').send({ ...baseQuery, view: { $ne: null } });
        should(widened.status).equal(400);
        should(widened.body.result).equal('Bad request parameter: view');
        should.not.exist(widened.body.data);

        await db.collection('drill_events').remove({ did: 'heatmap_test', 'up.lv': 'About' });

        db.close();
    });

    it('refuses a non-scalar actionType or segment', async() => {
        const baseQuery = {
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            app_key: APP_KEY,
            view: 'Home',
            period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
            device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
        };

        const badActionType = await request.post('/o/actions')
            .send({ ...baseQuery, actionType: { $ne: 'scroll' } });
        should(badActionType.status).equal(400);
        should(badActionType.body.result).equal('Bad request parameter: actionType');

        const badSegment = await request.post('/o/actions')
            .send({ ...baseQuery, actionType: 'click', segment: { $ne: null } });
        should(badSegment.status).equal(400);
        should(badSegment.body.result).equal('Bad request parameter: segment');

        // a string segment is still accepted, it just matches nothing here
        const goodSegment = await request.post('/o/actions')
            .send({ ...baseQuery, actionType: 'click', segment: 'nosuchsegment' });
        should(goodSegment.status).equal(200);
        should(goodSegment.body.data.length).equal(0);
    });

    it('requires a concrete actionType and view, not merely a scalar one', async() => {
        // being a scalar is not enough for these two: both are assigned into the match
        // unconditionally, and an equality predicate against null also matches every
        // document where the field is absent. Ingestion accepts [CLY]_action events with
        // no sg.type and users with no up.lv, so omitting either selects those rows over
        // the caller's whole period rather than selecting nothing.
        const baseQuery = {
            api_key: API_KEY_ADMIN,
            app_id: APP_ID,
            app_key: APP_KEY,
            view: 'Home',
            period: JSON.stringify([moment('2010-01-01').valueOf(), moment('2010-01-31').valueOf()]),
            device: JSON.stringify({ type: 'all', displayText: 'All', minWidth: 0, maxWidth: 10240 }),
        };

        const omitted = await request.post('/o/actions').send({ ...baseQuery });
        should(omitted.status).equal(400);
        should(omitted.body.result).equal('Bad request parameter: actionType');

        const nulled = await request.post('/o/actions').send({ ...baseQuery, actionType: null });
        should(nulled.status).equal(400);
        should(nulled.body.result).equal('Bad request parameter: actionType');

        // and only the two the client actually sends
        const unsupported = await request.post('/o/actions').send({ ...baseQuery, actionType: 'swipe' });
        should(unsupported.status).equal(400);
        should(unsupported.body.result).equal('Bad request parameter: actionType');

        const noView = await request.post('/o/actions')
            .send({
                api_key: API_KEY_ADMIN,
                app_id: APP_ID,
                app_key: APP_KEY,
                actionType: 'click',
                period: baseQuery.period,
                device: baseQuery.device
            });
        should(noView.status).equal(400);
        should(noView.body.result).equal('Bad request parameter: view');

        const emptyView = await request.post('/o/actions').send({ ...baseQuery, actionType: 'click', view: '' });
        should(emptyView.status).equal(400);
        should(emptyView.body.result).equal('Bad request parameter: view');

        // both supported types are still accepted
        for (const actionType of ['click', 'scroll']) {
            const good = await request.post('/o/actions').send({ ...baseQuery, actionType });
            should(good.status).equal(200);
        }
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
