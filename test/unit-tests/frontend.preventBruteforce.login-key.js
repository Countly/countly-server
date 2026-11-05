/**
 * Login trims the identifier and matches an email in lower case, so every spelling that
 * reaches one account must count against one login failure counter. Otherwise each spelling,
 * including a wrong second-factor code sent with it, gets its own allowance.
 *
 * The counter behaviour is checked against a fake failed_logins collection. The call sites
 * live in the dashboard and in the two-factor-auth plugin, which cannot be loaded here, so
 * their sources are checked for the normalized key.
 */
require("should");
var fs = require("fs");
var path = require("path");
var preventBruteforce = require("../../frontend/express/libs/preventBruteforce.js");

describe("login failure counter key", function() {
    var originalDb, originalFails, docs;

    beforeEach(function() {
        originalDb = preventBruteforce.db;
        originalFails = preventBruteforce.fails;
        preventBruteforce.fails = 3;
        docs = {};
        preventBruteforce.db = {
            collection: function() {
                return {
                    findOne: function(query, cb) {
                        cb(null, docs[query._id] || null);
                    },
                    update: function(query, update, options, cb) {
                        var doc = docs[query._id] || {_id: query._id, fails: 0};
                        doc.fails += update.$inc.fails;
                        doc.lastFail = update.$set.lastFail;
                        docs[query._id] = doc;
                        cb && cb();
                    },
                    remove: function(query, cb) {
                        delete docs[query._id];
                        cb && cb();
                    }
                };
            }
        };
    });

    afterEach(function() {
        preventBruteforce.db = originalDb;
        preventBruteforce.fails = originalFails;
    });

    it("trims and lower-cases an email, trims a username", function() {
        preventBruteforce.loginKey("  Admin@Example.COM ").should.equal("admin@example.com");
        preventBruteforce.loginKey(" Admin ").should.equal("Admin");
        preventBruteforce.loginKey(undefined).should.equal("undefined");
    });

    it("blocks every spelling of an account once its failures add up", function(done) {
        ["admin@example.com", " Admin@example.com", "ADMIN@EXAMPLE.COM "].forEach(function(spelling) {
            preventBruteforce.fail("login", preventBruteforce.loginKey(spelling));
        });
        preventBruteforce.isBlocked("login", preventBruteforce.loginKey("Admin@Example.com"), function(isBlocked) {
            isBlocked.should.be.true();
            done();
        });
    });

    /**
     * Source of a file in the repository
     * @param {string} file - path relative to the repository root
     * @returns {string} contents
     */
    function source(file) {
        return fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
    }

    it("counts and checks every login failure under the normalized key", function() {
        var sources = [source("frontend/express/app.js"), source("plugins/two-factor-auth/frontend/app.js")];
        sources.forEach(function(src) {
            var calls = src.match(/preventBruteforce\.(fail|reset|isBlocked)\("login", [^\n]*/g) || [];
            calls.length.should.be.above(0);
            calls.forEach(function(call) {
                call.should.match(/^preventBruteforce\.(fail|reset|isBlocked)\("login", preventBruteforce\.loginKey\(/);
            });
        });
        sources[0].should.match(/userIdentifiers\[absPath\] = \(req\) => preventBruteforce\.loginKey\(req\.body\.username\)/);
    });

    it("counts a wrong second-factor code under the normalized key", function() {
        source("plugins/two-factor-auth/frontend/app.js").should.match(/otp is wrong, increase fails\s*\n\s*preventBruteforce\.fail\("login", preventBruteforce\.loginKey\(req\.body\.username\)\)/);
    });
});
