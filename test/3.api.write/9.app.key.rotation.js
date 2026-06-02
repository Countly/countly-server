var request = require('supertest');
var should = require('should');
var crypto = require('crypto');
var testUtils = require("../testUtils");
request = request(testUtils.url);

// Verifies that rotating an app's key does NOT re-key existing users: the
// app user id is derived from the app's immutable identity key (id_key), which
// is frozen from the original key. So after a key change, the same device
// resolves to the same app_users document and no duplicate user is created.

var API_KEY_ADMIN = "";
var APP_ID = "";
var ORIGINAL_KEY = "";
var NEW_KEY = "rotated0000000000000000000000000000test1";
var DEVICE_ID = "rotation-device-1";
var METRICS = {"_os": "Android", "_os_version": "9", "_device": "Pixel"};

/**
* Legacy/identity derivation of the app user id (_id of app_users document).
* @param {string} key - identity key (original app key)
* @param {string} deviceId - device id
* @returns {string} sha1 hex id
*/
function userId(key, deviceId) {
    return crypto.createHash('sha1').update(key + deviceId + "").digest('hex');
}

describe('App key rotation keeps user identity stable', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    });

    describe('create a dedicated app', function() {
        it('should create the app and return its key', function(done) {
            var params = {name: "Key Rotation Test App"};
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('_id');
                    ob.should.have.property('key');
                    APP_ID = ob._id;
                    ORIGINAL_KEY = ob.key;
                    // id_key is frozen at creation, equal to the key
                    ob.should.have.property('id_key', ORIGINAL_KEY);
                    done();
                });
        });
    });

    describe('first session with the original key', function() {
        it('should accept the session', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + ORIGINAL_KEY + '&begin_session=1&metrics=' + JSON.stringify(METRICS))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'Success');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('should create exactly one user under the original-key id', function(done) {
            var id = userId(ORIGINAL_KEY, DEVICE_ID);
            testUtils.db.collection('app_users' + APP_ID).findOne({'_id': id}, function(err, user) {
                should.not.exist(err);
                should.exist(user);
                user.should.have.property('did', DEVICE_ID);
                user.should.have.property('uid', '1');
                testUtils.db.collection('app_users' + APP_ID).count({did: {$exists: true}}, function(err2, count) {
                    should.not.exist(err2);
                    count.should.equal(1);
                    done();
                });
            });
        });
    });

    describe('rotate the app key', function() {
        it('should update the app key', function(done) {
            var params = {app_id: APP_ID, key: NEW_KEY};
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('should have frozen id_key to the original key and set the new key', function(done) {
            testUtils.db.collection('apps').findOne({'key': NEW_KEY}, function(err, app) {
                should.not.exist(err);
                should.exist(app);
                app.should.have.property('key', NEW_KEY);
                app.should.have.property('id_key', ORIGINAL_KEY);
                done();
            });
        });
    });

    describe('same device with the new key', function() {
        it('should accept the session', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + NEW_KEY + '&begin_session=1&metrics=' + JSON.stringify(METRICS))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'Success');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('should resolve to the SAME user (no duplicate created)', function(done) {
            var sameId = userId(ORIGINAL_KEY, DEVICE_ID);
            var newKeyId = userId(NEW_KEY, DEVICE_ID);
            testUtils.db.collection('app_users' + APP_ID).findOne({'_id': sameId}, function(err, user) {
                should.not.exist(err);
                should.exist(user);
                user.should.have.property('uid', '1');
                // no user should have been created under a new-key-derived id
                testUtils.db.collection('app_users' + APP_ID).findOne({'_id': newKeyId}, function(err2, ghost) {
                    should.not.exist(err2);
                    should.not.exist(ghost);
                    // still exactly one user in total
                    testUtils.db.collection('app_users' + APP_ID).count({did: {$exists: true}}, function(err3, count) {
                        should.not.exist(err3);
                        count.should.equal(1);
                        done();
                    });
                });
            });
        });
    });

    after(function(done) {
        var params = {app_id: APP_ID};
        request
            .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .end(function() {
                done();
            });
    });
});
