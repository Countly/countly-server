var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_USER = "";

describe('Without global permission', function() {
    describe('get all member info', function() {
        it('should not authorize', function(done) {
            API_KEY_USER = testUtils.get("API_KEY_USER");
            request
                .get('/o/users/all?api_key=' + API_KEY_USER)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', "User does not have right");
                    done();
                });
        });
    });
    describe('create user', function() {
        it('should not authorize', function(done) {
            request
                .get('/i/users/create?api_key=' + API_KEY_USER)
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', "User does not have right");
                    done();
                });
        });
    });
    describe('update user', function() {
        it('should not authorize', function(done) {
            var params = {user_id: "123456789012345678901234"};
            request
                .get('/i/users/update?api_key=' + API_KEY_USER + "&args=" + JSON.stringify(params))
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', "User does not have right");
                    done();
                });
        });
    });
    describe('delete user', function() {
        it('should not authorize', function(done) {
            var params = {user_ids: ["123456789012345678901234"]};
            request
                .get('/i/users/delete?api_key=' + API_KEY_USER + "&args=" + JSON.stringify(params))
                .expect(401)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', "User does not have right");
                    done();
                });
        });
    });
});