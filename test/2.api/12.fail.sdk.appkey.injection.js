var request = require('supertest');
var should = require('should');
var testUtils = require("../testUtils");
request = request(testUtils.url);

var APP_KEY = "";

// Regression test for the NoSQL operator-injection / boolean-oracle on the
// SDK fetch path. Passing app_key as a Mongo operator object (e.g.
// {"$regex":"^a"}) must NOT be honored as a query operator: the value is cast
// to a string before the apps lookup, so an operator can never match a real
// app_key and the response must not differ based on a matching prefix.
describe('SDK app_key NoSQL injection', function() {
    describe('app_key as $regex operator on /o/sdk fetch', function() {
        it('should not be treated as a query operator (no boolean oracle)', function(done) {
            APP_KEY = testUtils.get("APP_KEY");
            // ^<first char of the real app key> would match the real app if the
            // operator were honored. After casting it must never match.
            var prefix = "^" + (APP_KEY ? APP_KEY.charAt(0) : "a");
            request
                .get('/o/sdk?method=fetch_remote_config&device_id=injection_probe&app_key[$regex]=' + encodeURIComponent(prefix))
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
