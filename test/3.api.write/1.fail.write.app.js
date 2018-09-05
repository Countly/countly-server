var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";
var DEVICE_ID = "1234567890";

describe('Failing writing app data', function() {
    describe('without params', function() {
        it('should bad request', function(done) {
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/i')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "app_key" or "device_id"');
                    done();
                });
        });
    });
    describe('without app_key', function() {
        it('should bad request', function(done) {
            request
                .get('/i?device_id=' + DEVICE_ID)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "app_key" or "device_id"');
                    done();
                });
        });
    });
    describe('without device_id', function() {
        it('should bad request', function(done) {
            request
                .get('/i?app_key=' + APP_KEY)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Missing parameter "app_key" or "device_id"');
                    done();
                });
        });
    });
});