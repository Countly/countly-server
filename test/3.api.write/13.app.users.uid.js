var request = require('supertest');
require('should');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_KEY = "";
var APP_ID = "";
var DEVICE_OK = "appuser_uid_test_ok";
var DEVICE_STORED = "appuser_uid_test_stored";
var COUNTLY_ROOT = path.resolve(__dirname, '../..');
var EXPORT_ROOT = path.join(COUNTLY_ROOT, 'export');
var MARKER_PARENT_NAME = "uid_marker_" + crypto.randomBytes(8).toString("hex");
var MARKER_PARENT = path.join(COUNTLY_ROOT, MARKER_PARENT_NAME);
var MARKER_DIR = path.join(MARKER_PARENT, "marker");
var MARKER_FILE = path.join(MARKER_DIR, "keep.txt");
// Resolves from export/AppUser/appUser_<app>_<uid> to the marker directory
var UNSAFE_UID = "x/../../../" + MARKER_PARENT_NAME + "/marker";

/**
 * Wait for a number of milliseconds
 * @param {number} ms - milliseconds
 * @returns {Promise} resolves after the delay
 */
function wait(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * App user uids must have the format the server generates, and the app user
 * export only ever creates and removes folders inside export/AppUser.
 * A dedicated app is created and deleted at the end.
 */
describe('Testing app user uid format and export folder', function() {
    before(async function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        var res = await request.get('/i/apps/create').query({api_key: API_KEY_ADMIN, args: JSON.stringify({name: "Test App AppUsers Uid"})}).expect(200);
        var ob = JSON.parse(res.text);
        APP_ID = ob._id;
        APP_KEY = ob.key;
        // The API may run as a different user than the tests, so the marker must be
        // removable by it: only the API's own checks may keep it in place
        fs.mkdirSync(MARKER_DIR, {recursive: true});
        fs.chmodSync(MARKER_PARENT, 0o777);
        fs.chmodSync(MARKER_DIR, 0o777);
        fs.writeFileSync(MARKER_FILE, "marker");
    });

    after(async function() {
        fs.rmSync(MARKER_PARENT, {recursive: true, force: true});
        if (APP_ID) {
            await request.get('/i/apps/delete').query({api_key: API_KEY_ADMIN, args: JSON.stringify({app_id: APP_ID})}).expect(200);
        }
    });

    describe('GET /i/app_users/create', function() {
        it('should refuse a uid with path characters', async function() {
            var res = await request.get('/i/app_users/create').query({api_key: API_KEY_ADMIN, app_id: APP_ID, data: JSON.stringify({did: "appuser_uid_test_bad", uid: UNSAFE_UID})}).expect(400);
            JSON.parse(res.text).should.have.property('result');
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({uid: UNSAFE_UID});
            (stored === null).should.be.true();
        });

        it('should refuse a non-string uid', async function() {
            await request.get('/i/app_users/create').query({api_key: API_KEY_ADMIN, app_id: APP_ID, data: JSON.stringify({did: "appuser_uid_test_obj", uid: {"$gt": ""}})}).expect(400);
        });

        it('should accept an alphanumeric uid', async function() {
            await request.get('/i/app_users/create').query({api_key: API_KEY_ADMIN, app_id: APP_ID, data: JSON.stringify({did: DEVICE_OK, uid: "uidTest1"})}).expect(200);
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({did: DEVICE_OK});
            stored.should.have.property('uid', 'uidTest1');
        });

        it('should generate a uid when none is given', async function() {
            await request.get('/i/app_users/create').query({api_key: API_KEY_ADMIN, app_id: APP_ID, data: JSON.stringify({did: "appuser_uid_test_gen"})}).expect(200);
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({did: "appuser_uid_test_gen"});
            stored.uid.should.match(/^[0-9A-Za-z]+$/);
        });
    });

    describe('GET /i/app_users/update', function() {
        it('should refuse setting a uid with path characters', async function() {
            await request.get('/i/app_users/update').query({api_key: API_KEY_ADMIN, app_id: APP_ID, query: JSON.stringify({did: DEVICE_OK}), update: JSON.stringify({"$set": {uid: UNSAFE_UID}})}).expect(400);
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({did: DEVICE_OK});
            stored.should.have.property('uid', 'uidTest1');
        });

        it('should refuse renaming another field to uid', async function() {
            await request.get('/i/app_users/update').query({api_key: API_KEY_ADMIN, app_id: APP_ID, query: JSON.stringify({did: DEVICE_OK}), update: JSON.stringify({"$rename": {did: "uid"}})}).expect(400);
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({did: DEVICE_OK});
            stored.should.have.property('uid', 'uidTest1');
        });

        it('should still update other fields', async function() {
            await request.get('/i/app_users/update').query({api_key: API_KEY_ADMIN, app_id: APP_ID, query: JSON.stringify({did: DEVICE_OK}), update: JSON.stringify({"$set": {"custom.uidflag": "1"}})}).expect(200);
            var stored = await testUtils.db.collection("app_users" + APP_ID).findOne({did: DEVICE_OK});
            stored.should.have.property('custom');
            stored.custom.should.have.property('uidflag', '1');
        });
    });

    describe('GET /i/app_users/export', function() {
        it('should not remove anything outside export/AppUser for a stored unsafe uid', async function() {
            // A uid that is already stored (written before the format was enforced)
            await testUtils.db.collection("app_users" + APP_ID).insertOne({_id: "uid_test_stored", did: DEVICE_STORED, uid: UNSAFE_UID});
            await request.get('/i/app_users/export').query({api_key: API_KEY_ADMIN, app_id: APP_ID, query: JSON.stringify({did: DEVICE_STORED})});
            await wait(2000 * testUtils.testScalingFactor);
            fs.existsSync(MARKER_FILE).should.be.true();
            await testUtils.db.collection("app_users" + APP_ID).deleteOne({_id: "uid_test_stored"});
        });

        it('should export a user with a valid uid and delete the export', async function() {
            var res = await request.get('/i/app_users/export').query({api_key: API_KEY_ADMIN, app_id: APP_ID, query: JSON.stringify({did: DEVICE_OK})}).expect(200);
            var ob = JSON.parse(res.text);
            ob.should.have.property('result', 'appUser_' + APP_ID + '_uidTest1.json');
            res = await request.get('/i/app_users/deleteExport/appUser_' + APP_ID + '_uidTest1').query({api_key: API_KEY_ADMIN, app_id: APP_ID}).expect(200);
            JSON.parse(res.text).should.have.property('result', 'Export deleted');
            fs.existsSync(path.join(EXPORT_ROOT, 'AppUser', 'appUser_' + APP_ID + '_uidTest1')).should.be.false();
            fs.existsSync(MARKER_FILE).should.be.true();
        });
    });
});
