require("should");
var fs = require("fs");
var path = require("path");

// A wrong one-time code counts as a failed login. The login handlers and the
// bruteforce check read the counter under preventBruteforce.loginKey(username)
// (trimmed, lower-cased for an email), so the second factor has to count under
// that same key or its failures are never read.
describe("two-factor-auth: a wrong code counts under the login key", function() {
    var src = fs.readFileSync(path.join(__dirname, "../../plugins/two-factor-auth/frontend/app.js"), "utf8");
    var calls = src.match(/preventBruteforce\.fail\(\s*"login"\s*,[^;]*;/g) || [];

    it("counts failed codes", function() {
        calls.length.should.be.above(0);
    });

    it("passes every login failure through preventBruteforce.loginKey", function() {
        calls.forEach(function(call) {
            /preventBruteforce\.fail\(\s*"login"\s*,\s*preventBruteforce\.loginKey\(/.test(call).should.equal(true, call);
        });
    });
});
