var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";

// Regression test: the SDK fetch path must treat app_key strictly as a string.
// A non-string app_key (for example an object) must not be interpreted as a
// query and must not match an existing app by prefix; the response must be the
// same "App does not exist" as for any other unknown key.
describe('SDK app_key type handling', function() {
    describe('non-string app_key on /o/sdk fetch', function() {
        it('should not match an app by prefix', function(done) {
            APP_KEY = testUtils.get("APP_KEY");
            // ^<first char of the real app key> would match the real app only if
            // the value were honored as a query rather than a plain string.
            var prefix = "^" + (APP_KEY ? APP_KEY.charAt(0) : "a");
            request
                .get('/o/sdk?method=fetch_remote_config&device_id=type_probe&app_key[$regex]=' + encodeURIComponent(prefix))
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
