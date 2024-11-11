/*global describe,it */
var request = require('supertest');
const should = require('should');

const pluginManager = require('../pluginManager.js');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

const APP_ID = testUtils.get('APP_ID');
const APP_KEY = testUtils.get('APP_KEY');
const API_KEY_ADMIN = testUtils.get('API_KEY_ADMIN');

const credentials = { api_key: API_KEY_ADMIN, app_id: APP_ID, app_key: APP_KEY };

const sleep = (dur) => {
    return new Promise(resolve => setTimeout(resolve, dur));
};

describe('Testing Plugins', function() {
    it('should have plugin', function(done) {
        // API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        // APP_ID = testUtils.get("APP_ID");
        // APP_KEY = testUtils.get("APP_KEY");
        request
            .get('/o/plugins?api_key=' + API_KEY_ADMIN)
            .expect(200)
            .end(function(err, res) {
                //{"name":"countly-plugins","title":"Plugins manager","version":"1.0.0","description":"Plugin manager to view and enable/disable plugins","author":"Count.ly","homepage":"https://count.ly","support":"http://community.count.ly/","keywords":["countly","analytics","mobile","plugins"],"dependencies":{},"private":true,"enabled":true,"code":"plugins"}
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.not.be.empty;
                ob.should.be.an.instanceOf(Array);
                for (var i = 0; i < ob.length; i++) {
                    ob[i].should.have.property("name");
                    if (ob[i].name === "countly-plugins") {
                        ob[i].should.have.property("title", "Plugins manager");
                        ob[i].should.have.property("description", "Plugin manager to view and enable/disable plugins");
                        ob[i].should.have.property("author", "Count.ly");
                        ob[i].should.have.property("homepage", "https://count.ly/plugins");
                        ob[i].should.have.property("enabled", true);
                        ob[i].should.have.property("code", "plugins");
                    }
                }
                done();
            });
    });
});

describe('Make request without crash', function() {
    this.timeout(testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor * testUtils.testScalingFactor);

    describe('GET request', function() {
        it('should success', async() => {
            const events = JSON.stringify([{ key: 'test', count: 1 }]);
            const resp = await request.get('/i')
                .query({
                    ...credentials,
                    begin_session: 1,
                    events,
                    device_id: 'abcd',
                }).expect(200);

            should(resp.body).not.be.empty();

            await sleep(testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor);
        });
    });

    describe('verify event', function() {
        it('should have event', async() => {
            const resp = await request.get('/o')
                .query({ ...credentials, method: 'events', event: 'test' })
                .expect(200);

            should(resp.body).not.be.empty();
        });
    });
});

describe('Make request with crash', function() {
    this.timeout(testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor * 5);

    describe('GET request', function() {
        it('should success', async() => {
            const db = await pluginManager.dbConnection();
            const app = await db.collection('apps').findOne({ _id: db.ObjectID(APP_ID) }, { blocks: 1 });
            should.not.exists(app.blocks);
            db.close();

            const events = JSON.stringify([{ key: 'test', count: 1 }]);
            const crash = JSON.stringify({ _error: 'error', _os: 'android', _name: 'error', _app_version: 'ver', _os_version: '1' });
            const resp = await request.get('/i')
                .query({
                    app_key: APP_KEY,
                    begin_session: 1,
                    events,
                    crash,
                    device_id: 'abcd',
                }).expect(200);

            should(resp.body).not.be.empty();

            await sleep(testUtils.testWaitTimeForDrillEvents * testUtils.testScalingFactor * 3);
        });
    });

    describe('verify crash by db', function() {
        it('should have crash', async() => {
            const db = await pluginManager.dbConnection();
            const crash = await db.collection(`app_crashes${APP_ID}`).findOne({ app_version: 'ver' });
            db.close();

            should.exists(crash);
        });
    });

    describe('verify crash by req', function() {
        it('should have crash', async() => {
            const resp = await request.get('/o')
                .query({ api_key: API_KEY_ADMIN, app_id: APP_ID, method: 'crashes' })
                .expect(200);

            should(resp.body).not.be.empty();
            should(resp.body.aaData.length).equal(1);
        });
    });

    describe('verify event', function() {
        it('should have event', async() => {
            const resp = await request.get('/o')
                .query({ ...credentials, method: 'events', event: 'test' })
                .expect(200);

            should(resp.body).not.be.empty();
        });
    });
});
