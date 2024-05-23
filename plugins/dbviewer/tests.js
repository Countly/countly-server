var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_NAME = "Test";
var APP_ID = "";
var DEVICE_ID = "1234567890";
var db = "";

describe('Testing DBViewer', function() {
    describe('Checking database and collections', function() {
        it('should have countly db', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o/db?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.not.be.empty;
                    ob.should.be.an.instanceOf(Array);
                    ob[0].should.have.property("name", "countly");
                    ob[0].should.have.property("collections");
                    ob[0].collections.should.have.property("apps");
                    ob[0].collections.should.have.property("members");
                    ob[0].collections.should.have.property("plugins");
                    ob[0].collections.should.have.property("jobs");
                    done();
                });
        });
        it('Collection information is cached. Wait to make sure that all basic collections are created', function(done) {
            setTimeout(done, 5000);

        });
    });
    describe('Checking apps collections contents', function() {
        it('should have our test app', function(done) {
            request
                .get('/o/db?dbs=countly&collection=apps&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.not.be.empty;
                    ob.should.be.an.instanceOf(Object);
                    ob.should.have.property("limit", 20);
                    ob.should.have.property("start", 1);
                    ob.should.have.property("end");
                    ob.should.have.property("total");
                    ob.should.have.property("pages");
                    ob.should.have.property("curPage", 1);
                    ob.should.have.property("collections").and.be.an.instanceOf(Array);
                    done();
                });
        });
    });
    describe('Checking apps document contents', function() {
        it('should have our test app', function(done) {
            request
                .get('/o/db?dbs=countly&collection=apps&document=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.not.be.empty;
                    ob.should.be.an.instanceOf(Object);
                    ob.should.have.property("_id", 'ObjectId(' + APP_ID + ')');
                    ob.should.have.property("key", APP_KEY);
                    ob.should.have.property("name");
                    ob.should.have.property("country");
                    ob.should.have.property("category");
                    ob.should.have.property("timezone");
                    done();
                });
        });
    });

    describe('Checking collection list when specific app_id selected', function() {
        it('getting app name', function(done) {
            db = testUtils.client.db("countly");
            db.collection("apps").findOne({ _id: db.ObjectID(APP_ID) }, function(err, app) {
                if (app) {
                    APP_NAME = app.name;
                }
                done();
            });
        });
        it('should have our test app', function(done) {
            request
                .get('/o/db?dbs=countly&app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    console.log(res.text);
                    ob.should.not.be.empty;
                    ob.should.be.an.instanceOf(Object);
                    ob[0].should.have.property("name", "countly");
                    ob[0].should.have.property("collections");
                    ob[0].collections.should.not.have.property("apps");
                    ob[0].collections.should.not.have.property("members");
                    ob[0].collections.should.not.have.property("plugins");
                    ob[0].collections.should.not.have.property("jobs");
                    ob[0].collections.should.have.property("app_crashes(Test App)", "app_crashes" + APP_ID);
                    ob[0].collections.should.have.property("app_users(Test App)", "app_users" + APP_ID);
                    done();
                });
        });
    });
});