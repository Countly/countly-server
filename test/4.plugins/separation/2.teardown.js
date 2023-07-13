var request = require('supertest');
var should = require('should');
var testUtils = require("../../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var TEMP_KEY = "";
var APP_ID = "";
var USER_ID = "";
var ADMIN_ID = "";

describe('Deleting app', function() {
    it('should delete app', function(done) {
        API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
        API_KEY_USER = testUtils.get("API_KEY_USER");
        TEMP_KEY = testUtils.get("TEMP_KEY");
        APP_ID = testUtils.get("APP_ID");
        USER_ID = testUtils.get("USER_ID");
        ADMIN_ID = testUtils.get("ADMIN_ID");
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
        after('Close db connection', async function() {
            testUtils.client.close();
        });
    });
});