let request = require('supertest');
const should = require('should');
const testUtils = require("../../testUtils");
const plugins = require("../../../plugins/pluginManager");
const { saveState, loadState, clearState } = require('./testState');

request = request(testUtils.url);

let TEMP_KEY = "";
let API_KEY_ADMIN = "";
let APP_ID = "";
let APP_KEY = "";

describe('Retrieve API-KEY', function() {
    before('Create db connection', async function() {
        // Clear any existing state
        clearState();

        testUtils.db = await plugins.dbConnection("countly");
        testUtils.client = testUtils.db.client;
    });

    it('should create user', function(done) {
        testUtils.db.collection("members").findOne({global_admin: true}, function(err, member) {
            if (err) {
                return done(err);
            }
            member.should.have.property('api_key');
            TEMP_KEY = member["api_key"];
            testUtils.set("TEMP_KEY", member["api_key"]);
            //generate data for new user, to tear it down later
            testUtils.username = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
            testUtils.email = testUtils.username + "@test.test";
            done();
        });
    });
});

// Save state after each test
afterEach(function() {
    const state = {
        TEMP_KEY,
        API_KEY_ADMIN,
        API_KEY_USER: testUtils.get("API_KEY_USER"),
        APP_ID,
        APP_KEY,
        USER_ID: testUtils.get("USER_ID"),
        ADMIN_ID: testUtils.get("ADMIN_ID"),
        username: testUtils.username,
        email: testUtils.email
    };
    saveState(state);
});

describe('Creating users', function() {
    describe('global admin', function() {
        it('should create user', function(done) {
            var params = {full_name: testUtils.name, username: testUtils.username, password: testUtils.password, email: testUtils.email, global_admin: true};
            request
                .get('/i/users/create?&api_key=' + TEMP_KEY + "&args=" + JSON.stringify(params))
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('api_key');
                    API_KEY_ADMIN = ob["api_key"];
                    testUtils.set("API_KEY_ADMIN", ob["api_key"]);
                    testUtils.set("ADMIN_ID", ob["_id"]);
                    done();
                });
        });
    });
    describe('simple user', function() {
        it('should create user', function(done) {
            var params = {full_name: testUtils.name, username: testUtils.username + "1", password: testUtils.password, email: testUtils.email + ".test"};
            request
                .get('/i/users/create?&api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('api_key');
                    testUtils.set("API_KEY_USER", ob["api_key"]);
                    testUtils.set("USER_ID", ob["_id"]);
                    done();
                });
        });
    });
});
describe('Create app', function() {
    it('should create app', function(done) {
        var appName = "Test App";
        var params = {name: appName};
        request
            .get('/i/apps/create?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                ob.should.have.property('name', appName);
                APP_ID = ob._id;
                APP_KEY = ob.key;
                testUtils.set("APP_ID", APP_ID);
                testUtils.set("APP_KEY", APP_KEY);
                done();
            });
    });
});
