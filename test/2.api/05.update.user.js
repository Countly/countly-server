var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var API_KEY_ADMIN = "";
var USER_ID = "";

describe('Updating user', function() {
    describe('without args', function() {
        it('should bad request', function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            USER_ID = testUtils.get("USER_ID");
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN)
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
    describe('updating name', function() {
        it('should success', function(done) {
            var params = {user_id: USER_ID, full_name: "Name Surname"};
            request
                .get('/i/users/update?api_key=' + API_KEY_ADMIN + "&args=" + JSON.stringify(params))
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
    describe('verify name update', function() {
        it('should display new name', function(done) {
            request
                .get('/o/users/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property(USER_ID);
                    var user = ob[USER_ID];
                    user.should.have.property('full_name', "Name Surname");
                    done();
                });
        });
    });
});