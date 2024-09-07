let request = require('supertest');
const should = require('should');
const testUtils = require("../../testUtils");
const { loadState, clearState } = require('./testState');

request = request(testUtils.url);

let API_KEY_ADMIN = "";
let API_KEY_USER = "";
let TEMP_KEY = "";
let APP_ID = "";
let USER_ID = "";
let ADMIN_ID = "";

describe('Teardown', function() {
    before(function() {
        const state = loadState();
        console.log("--------------", state, "--------------");
        if (state) {
            API_KEY_ADMIN = state.API_KEY_ADMIN;
            API_KEY_USER = state.API_KEY_USER;
            TEMP_KEY = state.TEMP_KEY;
            APP_ID = state.APP_ID;
            USER_ID = state.USER_ID;
            ADMIN_ID = state.ADMIN_ID;
        }
        // If any value is still undefined, try to get it from testUtils
        API_KEY_ADMIN = API_KEY_ADMIN || testUtils.get("API_KEY_ADMIN");
        API_KEY_USER = API_KEY_USER || testUtils.get("API_KEY_USER");
        TEMP_KEY = TEMP_KEY || testUtils.get("TEMP_KEY");
        APP_ID = APP_ID || testUtils.get("APP_ID");
        USER_ID = USER_ID || testUtils.get("USER_ID");
        ADMIN_ID = ADMIN_ID || testUtils.get("ADMIN_ID");
    });

    describe('Deleting app', function() {
        it('should delete app', function(done) {
            if (!APP_ID) {
                return done();
            }
            var params = {app_id: APP_ID};
            request
                .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
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

    describe('Deleting user', function() {
        describe('delete simple user', function() {
            it('should delete successfully', function(done) {
                console.log("-----", USER_ID, "------");
                var params = {user_ids: [USER_ID]};
                request
                    .get('/i/users/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
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
        describe('delete admin', function() {
            it('should delete successfully', function(done) {
                console.log("-------", ADMIN_ID, "------");
                var params = {user_ids: [ADMIN_ID]};
                request
                    .get('/i/users/delete?api_key=' + TEMP_KEY + "&args=" + JSON.stringify(params))
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
            after('Close db connection and clear state', async function() {
                if (testUtils.client) {
                    await testUtils.client.close();
                }
                clearState();
            });
        });
    });
});
