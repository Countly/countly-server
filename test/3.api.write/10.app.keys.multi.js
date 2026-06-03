var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

// Covers multiple-accepted-keys support for app key rotation:
//  - rotation keeps the old key working (grace), both keys in `keys`
//  - per-key last_data is recorded on ingestion
//  - key uniqueness is enforced across current and old keys of all apps
//  - old keys can be retired; the current key cannot be removed
//  - lazy materialization for apps that predate the `keys` array

var API_KEY_ADMIN = "";
var APP_ID = "";
var ORIGINAL_KEY = "";
var NEW_KEY = "multikey00000000000000000000000000000new";
var DEVICE_ID = "multikey-device-1";
var METRICS = {"_os": "Android", "_os_version": "10", "_device": "Pixel 4"};

var OTHER_APP_ID = "";
var LEGACY_APP_ID = "";
var LEGACY_KEY = "";

function appByKey(key, cb) {
    testUtils.db.collection('apps').findOne({'key': key}, cb);
}

describe('App multiple keys (rotation grace)', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
    });

    describe('create app', function() {
        it('should initialize keys with the current key', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({name: "Multi Key App"}))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    APP_ID = ob._id;
                    ORIGINAL_KEY = ob.key;
                    ob.should.have.property('keys');
                    ob.keys.length.should.equal(1);
                    ob.keys[0].should.have.property('key', ORIGINAL_KEY);
                    done();
                });
        });
    });

    describe('rotate the key', function() {
        it('should set the new key and keep the old one in keys', function(done) {
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID, key: NEW_KEY}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    appByKey(NEW_KEY, function(e, app) {
                        should.not.exist(e);
                        should.exist(app);
                        app.should.have.property('key', NEW_KEY);
                        var keyValues = (app.keys || []).map(function(k) {
                            return k.key;
                        });
                        keyValues.should.containEql(NEW_KEY);
                        keyValues.should.containEql(ORIGINAL_KEY);
                        done();
                    });
                });
        });

        it('should still accept data on the OLD key (grace)', function(done) {
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

        it('should accept data on the NEW key', function(done) {
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

        it('should record last_data for the old key that received data', function(done) {
            appByKey(NEW_KEY, function(e, app) {
                should.not.exist(e);
                var entry = (app.keys || []).filter(function(k) {
                    return k.key === ORIGINAL_KEY;
                })[0];
                should.exist(entry);
                entry.last_data.should.be.above(0);
                done();
            });
        });
    });

    describe('key uniqueness across apps', function() {
        it('should reject creating another app with an in-use OLD key', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({name: "Dup Key App", key: ORIGINAL_KEY}))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'App key already in use');
                    done();
                });
        });

        it('should create a second app to test update collision', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({name: "Other App"}))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    OTHER_APP_ID = JSON.parse(res.text)._id;
                    done();
                });
        });

        it('should reject updating the second app to an in-use key', function(done) {
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: OTHER_APP_ID, key: NEW_KEY}))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'App key already in use');
                    done();
                });
        });
    });

    describe('retiring an old key', function() {
        it('should not remove the current key when asked', function(done) {
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID, remove_keys: [NEW_KEY]}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    appByKey(NEW_KEY, function(e, app) {
                        should.not.exist(e);
                        should.exist(app);
                        (app.keys || []).map(function(k) {
                            return k.key;
                        }).should.containEql(NEW_KEY);
                        done();
                    });
                });
        });

        it('should remove the old key', function(done) {
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID, remove_keys: [ORIGINAL_KEY]}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    appByKey(NEW_KEY, function(e, app) {
                        should.not.exist(e);
                        (app.keys || []).map(function(k) {
                            return k.key;
                        }).should.not.containEql(ORIGINAL_KEY);
                        done();
                    });
                });
        });

        it('should reject data on the retired key', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID + '&app_key=' + ORIGINAL_KEY + '&begin_session=1&metrics=' + JSON.stringify(METRICS))
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'App does not exist');
                    done();
                });
        });
    });

    describe('lazy materialization for legacy apps', function() {
        it('should create an app then simulate a legacy doc (no keys array)', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({name: "Legacy App"}))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    LEGACY_APP_ID = ob._id;
                    LEGACY_KEY = ob.key;
                    testUtils.db.collection('apps').update({'key': LEGACY_KEY}, {$unset: {keys: ""}}, function(e) {
                        should.not.exist(e);
                        done();
                    });
                });
        });

        it('should still resolve ingestion via the key field', function(done) {
            request
                .get('/i?device_id=legacy-device&app_key=' + LEGACY_KEY + '&begin_session=1&metrics=' + JSON.stringify(METRICS))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text).should.have.property('result', 'Success');
                    done();
                });
        });

        it('should materialize keys on the next app update', function(done) {
            request
                .get('/i/apps/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: LEGACY_APP_ID, name: "Legacy App Renamed"}))
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    appByKey(LEGACY_KEY, function(e, app) {
                        should.not.exist(e);
                        should.exist(app.keys);
                        app.keys.map(function(k) {
                            return k.key;
                        }).should.containEql(LEGACY_KEY);
                        done();
                    });
                });
        });
    });

    after(function(done) {
        var ids = [APP_ID, OTHER_APP_ID, LEGACY_APP_ID].filter(Boolean);
        var i = 0;
        function next() {
            if (i >= ids.length) {
                return done();
            }
            request
                .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: ids[i++]}))
                .end(next);
        }
        next();
    });
});
