var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";
var DEVICE_ID = "1234567890";

describe('Testing Populator plugin', function() {
    describe('Testing enviroment endpoint ', function() {
        it('Set params', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            done();
        });

        it('Try without any params', function(done) {
            request
                .get('/i/populator/environment/save')
                .expect(400)
                .end(function(err, res) {
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Missing parameter \"api_key\" or \"auth_token\"");
                    done();
                });

        });

        it('Try without "users"', function(done) {
            request
                .get('/i/populator/environment/save?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    var ob = JSON.parse(res.text);
                    ob.result.should.eql("Missing params: users");
                    done();
                });
        });
    });


});