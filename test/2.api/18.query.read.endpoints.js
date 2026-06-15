var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var APP_ID = "";
var emptyQuery = encodeURIComponent("{}");

/**
 * Happy-path coverage for read endpoints that validate a user-supplied Mongo
 * query/filter via common.parseUserQuery / common.findUnsafeMongoOperator.
 * Each test sends a valid (empty) query and expects a 200 response, ensuring
 * the validation does not reject legitimate input.
 */
describe('Testing query-validated read endpoints (happy path)', function() {
    before(function() {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        APP_ID = testUtils.get("APP_ID");
    });

    describe('GET /o/tasks/all', function() {
        it('should list tasks with a valid query', function(done) {
            request
                .get('/o/tasks/all?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text);
                    done();
                });
        });
    });

    describe('GET /o/tasks/count', function() {
        it('should count tasks with a valid query', function(done) {
            request
                .get('/o/tasks/count?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text);
                    done();
                });
        });
    });

    describe('GET /o/tasks/list', function() {
        it('should return a task list with a valid query', function(done) {
            request
                .get('/o/tasks/list?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text);
                    done();
                });
        });
    });

    describe('GET /o (method=geodata, loadFor=cities)', function() {
        it('should load city coordinates with a valid query', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=geodata&loadFor=cities&query=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /o/app_users/loyalty', function() {
        it('should return loyalty data with a valid query', function(done) {
            request
                .get('/o/app_users/loyalty?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('GET /o/export/db', function() {
        it('should export a collection with a valid filter', function(done) {
            request
                .get('/o/export/db?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&collection=apps&type=json&filter=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it('should not export the session store collection', function(done) {
            request
                .get('/o/export/db?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&collection=sessions_&type=json&filter=' + emptyQuery)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User does not have access right for this collection');
                    done();
                });
        });

        it('should not export system index metadata', function(done) {
            request
                .get('/o/export/db?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&collection=system.indexes&type=json&filter=' + emptyQuery)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User does not have access right for this collection');
                    done();
                });
        });
    });

    describe('GET /o (method=all_apps)', function() {
        it('should read all apps with a valid filter', function(done) {
            //app_id is required by the /o dispatcher even though all_apps spans apps
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=all_apps&period=month&filter=' + emptyQuery)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    JSON.parse(res.text);
                    done();
                });
        });
    });

    describe('GET /o/tasks/all multi-app permission', function() {
        var victimAppId = "";
        var scopedApiKey = "";
        var scopedUserId = "";
        var uniq = Date.now();

        it('should create a second app and a user scoped to the base app only', function(done) {
            request
                .get('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({name: "TasksVictimApp", type: "mobile"})))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    victimAppId = res.body._id;
                    var perm = { _: {a: [], u: [APP_ID]}, c: {}, r: {}, u: {}, d: {} };
                    ["c", "r", "u", "d"].forEach(function(t) {
                        perm[t][APP_ID] = {all: false, allowed: {core: true}};
                    });
                    var userParams = {full_name: "tasksuser" + uniq, username: "tasksuser" + uniq, password: "p4ssw0rD!", email: "tasksuser" + uniq + "@mail.test", permission: perm};
                    request
                        .get('/i/users/create?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify(userParams)))
                        .expect(200)
                        .end(function(err2, res2) {
                            if (err2) {
                                return done(err2);
                            }
                            scopedApiKey = res2.body.api_key;
                            scopedUserId = res2.body._id;
                            done();
                        });
                });
        });

        it('should reject an app_ids list containing an unauthorized app', function(done) {
            request
                .get('/o/tasks/all?api_key=' + scopedApiKey + '&app_id=' + APP_ID + '&app_ids=' + APP_ID + ',' + victimAppId + '&query=' + emptyQuery)
                .expect(401)
                .end(function(err) {
                    return done(err);
                });
        });

        it('should allow an app_ids list of only authorized apps', function(done) {
            request
                .get('/o/tasks/all?api_key=' + scopedApiKey + '&app_id=' + APP_ID + '&app_ids=' + APP_ID + ',' + APP_ID + '&query=' + emptyQuery)
                .expect(200)
                .end(function(err) {
                    return done(err);
                });
        });

        after(function(done) {
            request
                .get('/i/users/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({user_ids: [scopedUserId]})))
                .end(function() {
                    request
                        .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args=' + encodeURIComponent(JSON.stringify({app_id: victimAppId})))
                        .end(function() {
                            done();
                        });
                });
        });
    });
});
