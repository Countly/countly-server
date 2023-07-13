var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var API_KEY_USER = "";
var APP_ID = "";

describe('Deleting app', function() {
    describe('without permission', function() {
        it('should not authorized', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            API_KEY_USER = testUtils.get("API_KEY_USER");
            APP_ID = testUtils.get("APP_ID");
            var params = {app_id: APP_ID};
            request
                .get('/i/apps/delete?api_key=' + API_KEY_USER + "&args=" + JSON.stringify(params))
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'User does not have right');
                    done();
                });
        });
    });
    describe('without args', function() {
        it('should bad request', function(done) {
            request
                .get('/i/apps/delete?api_key=' + API_KEY_ADMIN)
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Error: Missing \'args\' parameter');
                    done();
                });
        });
    });
    describe('incorrect app id', function() {
        it('should error', function(done) {
            var params = {app_id: "123456789012345678901234"};
            request
                .get('/i/apps/delete?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
                .expect(500)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'Error deleting app');
                    done();
                });
        });
    });
    describe('deleting app', function() {
        it('should delete app', function(done) {
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
    describe('verify app deletion in all', function() {
        it('should return no apps', function(done) {
            request
                .get('/o/apps/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('admin_of').be.empty;
                    ob.should.have.property('user_of').be.empty;
                    done();
                });
        });
    });
    describe('verify app deletion in mine', function() {
        it('should return no apps', function(done) {
            request
                .get('/o/apps/mine?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('admin_of').be.empty;
                    ob.should.have.property('user_of').be.empty;
                    done();
                });
        });
    });
});