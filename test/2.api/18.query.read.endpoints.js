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

    describe('GET /o (method=all_apps)', function() {
        it('should read all apps with a valid filter', function(done) {
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&method=all_apps&filter=' + emptyQuery)
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

    describe('GET /o/cms/entries', function() {
        it('should return CMS entries with a valid query', function(done) {
            request
                .get('/o/cms/entries?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&query=' + emptyQuery)
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
    });
});
