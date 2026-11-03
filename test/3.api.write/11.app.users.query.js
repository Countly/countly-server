var request = require('supertest');
require('should');
var fs = require('fs');
var path = require('path');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_KEY = "";
var APP_ID = "";
var DEVICE_1 = "appuser_query_test_1";
var DEVICE_2 = "appuser_query_test_2";
var DEVICE_3 = "appuser_query_test_3";
var DEVICE_4 = "appuser_query_test_4";
var DEVICE_UID_TEST = "appuser_query_test_uid";
var UID_1 = "";
var SIBLING_NAME = "appuser_query_sibling_" + Date.now();
var SIBLING_DIR = path.resolve(__dirname, '../../export/' + SIBLING_NAME);

/**
 * Happy-path coverage for the /i/app_users write endpoints that validate a
 * user-supplied Mongo query via common.parseUserQuery. A dedicated app is
 * created (and deleted at the end) so the seeded users do not pollute the
 * shared test app used by the ordered, count-based write suites. Two users are
 * seeded so update/delete match exactly one user (a valid, non-empty,
 * non-near-total query) and return 200.
 */
describe('Testing query-validated app_users write endpoints (happy path)', function() {
    describe('Create dedicated app', function() {
        it('should create app', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            var params = {name: "Test App AppUsers Query"};
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
                    APP_KEY = ob.key;
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe('Seed dedicated users', function() {
        it('should create first user', function(done) {
            var metrics = {"_os": "Android", "_os_version": "9", "_device": "TestDevice"};
            request
                .get('/i?device_id=' + DEVICE_1 + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + JSON.stringify(metrics))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('should create second user', function(done) {
            var metrics = {"_os": "Android", "_os_version": "9", "_device": "TestDevice"};
            request
                .get('/i?device_id=' + DEVICE_2 + '&app_key=' + APP_KEY + '&begin_session=1&metrics=' + JSON.stringify(metrics))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });

    describe('uid on create and update', function() {
        it('should refuse a uid that is not in the generated format on create', function(done) {
            var data = encodeURIComponent(JSON.stringify({did: DEVICE_3, uid: "/../../" + SIBLING_NAME}));
            request
                .get('/i/app_users/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&data=' + data)
                .expect(400)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_3}, function(e, user) {
                        if (e) {
                            return done(e);
                        }
                        (user === null).should.be.true();
                        done();
                    });
                });
        });

        it('should create a user and generate the uid when none is given', function(done) {
            var data = encodeURIComponent(JSON.stringify({did: DEVICE_3}));
            request
                .get('/i/app_users/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&data=' + data)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_3}, function(e, user) {
                        if (e) {
                            return done(e);
                        }
                        user.should.have.property('uid').match(/^[0-9a-zA-Z]+$/);
                        done();
                    });
                });
        });

        it('should create a user with a uid in the generated format', function(done) {
            var data = encodeURIComponent(JSON.stringify({did: DEVICE_UID_TEST, uid: "zzQ9"}));
            request
                .get('/i/app_users/create?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&data=' + data)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_UID_TEST}, function(e, user) {
                        if (e) {
                            return done(e);
                        }
                        user.should.have.property('uid', 'zzQ9');
                        done();
                    });
                });
        });

        var refusedUpdates = [
            ['$set', {"$set": {"uid": "../x"}}],
            ['$set with a non-string', {"$set": {"uid": {"a": 1}}}],
            ['$rename into uid', {"$rename": {"custom.qtestflag": "uid"}}],
            ['$unset', {"$unset": {"uid": ""}}]
        ];
        refusedUpdates.forEach(function(entry) {
            it('should refuse a uid change with ' + entry[0], function(done) {
                var query = encodeURIComponent(JSON.stringify({did: DEVICE_UID_TEST}));
                var update = encodeURIComponent(JSON.stringify(entry[1]));
                request
                    .get('/i/app_users/update?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query + '&update=' + update)
                    .expect(400)
                    .end(function(err) {
                        if (err) {
                            return done(err);
                        }
                        testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_UID_TEST}, function(e, user) {
                            if (e) {
                                return done(e);
                            }
                            user.should.have.property('uid', 'zzQ9');
                            done();
                        });
                    });
            });
        });

        it('should allow setting a uid in the generated format', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_UID_TEST}));
            var update = encodeURIComponent(JSON.stringify({"$set": {"uid": "zzQ8"}}));
            request
                .get('/i/app_users/update?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query + '&update=' + update)
                .expect(200)
                .end(function(err) {
                    if (err) {
                        return done(err);
                    }
                    testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_UID_TEST}, function(e, user) {
                        if (e) {
                            return done(e);
                        }
                        user.should.have.property('uid', 'zzQ8');
                        done();
                    });
                });
        });
    });

    describe('Export of a stored uid outside the generated format', function() {
        it('should refuse the export and leave other export folders alone', function(done) {
            fs.mkdirSync(path.join(SIBLING_DIR, 'keep'), {recursive: true});
            fs.writeFileSync(path.join(SIBLING_DIR, 'keep', 'file.txt'), 'keep');
            testUtils.db.collection('app_users' + APP_ID).insertOne({_id: APP_ID + "_" + DEVICE_4, did: DEVICE_4, uid: "/../../" + SIBLING_NAME}, function(insertErr) {
                if (insertErr) {
                    return done(insertErr);
                }
                var query = encodeURIComponent(JSON.stringify({did: DEVICE_4}));
                request
                    .get('/i/app_users/export?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query)
                    .expect(400)
                    .end(function(err) {
                        setTimeout(function() {
                            var kept = fs.existsSync(path.join(SIBLING_DIR, 'keep', 'file.txt'));
                            testUtils.db.collection('app_users' + APP_ID).deleteOne({_id: APP_ID + "_" + DEVICE_4}, function() {
                                fs.rmSync(SIBLING_DIR, {recursive: true, force: true});
                                if (err) {
                                    return done(err);
                                }
                                kept.should.be.true();
                                done();
                            });
                        }, 1000 * testUtils.testScalingFactor);
                    });
            });
        });
    });

    describe('GET /i/app_users/update', function() {
        it('should update the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_1}));
            var update = encodeURIComponent(JSON.stringify({"$set": {"custom.qtestflag": "1"}}));
            request
                .get('/i/app_users/update?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query + '&update=' + update)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User Updated');
                    done();
                });
        });
    });

    describe('GET /i/app_users/export', function() {
        it('should export the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_1}));
            request
                .get('/i/app_users/export?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /i/app_users/deleteExport', function() {
        it('should delete the export of the matching user', function(done) {
            testUtils.db.collection('app_users' + APP_ID).findOne({did: DEVICE_1}, function(e, user) {
                if (e) {
                    return done(e);
                }
                UID_1 = user.uid;
                var exportId = 'appUser_' + APP_ID + '_' + UID_1;
                request
                    .get('/i/app_users/deleteExport/' + exportId + '?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                    .expect(200)
                    .end(function(err, res) {
                        if (err) {
                            return done(err);
                        }
                        var ob = JSON.parse(res.text);
                        ob.should.have.property('result', 'Export deleted');
                        fs.existsSync(path.resolve(__dirname, '../../export/AppUser/' + exportId)).should.be.false();
                        fs.existsSync(path.resolve(__dirname, '../../export/AppUser/' + exportId + '.tar.gz')).should.be.false();
                        done();
                    });
            });
        });
    });

    describe('GET /i/app_users/delete', function() {
        it('should delete the matching user with a valid query', function(done) {
            var query = encodeURIComponent(JSON.stringify({did: DEVICE_2}));
            request
                .get('/i/app_users/delete?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + query)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User deleted');
                    done();
                });
        });
    });

    describe('Delete dedicated app', function() {
        it('should delete app', function(done) {
            request
                .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify({app_id: APP_ID}))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Success');
                    done();
                });
        });
    });
});
