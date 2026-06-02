var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";

// Regression test: the SDK fetch path must treat app_key strictly as a string.
// The vector is a JSON request body whose app_key is an object rather than a
// string (the legacy query-string parser would not produce a nested object, so
// the body is what allows a non-string value to reach the apps lookup). A
// prefix that matches the real app_key must not match when supplied this way;
// the response must be the same "App does not exist" as for any unknown key.
describe('SDK app_key type handling', function() {
    describe('non-string app_key in JSON body on /o/sdk fetch', function() {
        it('should not match an app by prefix', function(done) {
            APP_KEY = testUtils.get("APP_KEY");
            // "^<first char of the real app key>" would match the real app only
            // if the value were honored as a query rather than a plain string.
            var prefix = "^" + (APP_KEY ? APP_KEY.charAt(0) : "a");
            request
                .post('/o/sdk')
                .send({
                    method: "fetch_remote_config",
                    device_id: "type_probe",
                    app_key: { "$regex": prefix }
                })
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob.should.have.property('result', 'App does not exist');
                    done();
                });
        });
    });
});
