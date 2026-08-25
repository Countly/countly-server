require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");

// The upgrade script edits configuration an operator may have customised, so the two
// things that matter are that it removes exactly what it should and preserves everything
// else. Loading it normally would open a database connection, so only the pure rewrite
// function is lifted out.
describe("upgrade: standardize security headers", function() {
    var rewrite;

    before(function() {
        var file = path.join(__dirname, "../../bin/upgrade/DEV/scripts/standardize_security_headers.js");
        var src = fs.readFileSync(file, "utf8");
        // drop the db-connecting tail, keep the declarations and rewrite()
        var cut = src.indexOf("pluginManager.dbConnection()");
        (cut > -1).should.equal(true, "script shape changed; update this test");
        var sandbox = {
            module: {exports: {}},
            console: {log: function() {}, error: function() {}},
            require: function() {
                return {};
            }
        };
        sandbox.exports = sandbox.module.exports;
        vm.createContext(sandbox);
        vm.runInContext(src.slice(0, cut) + "\nmodule.exports = {rewrite: rewrite};", sandbox);
        rewrite = sandbox.module.exports.rewrite;
    });

    describe("what it removes", function() {
        it("drops X-XSS-Protection", function() {
            var out = rewrite("X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nX-Content-Type-Options: nosniff");
            out.should.not.match(/X-XSS-Protection/i);
            out.should.match(/X-Frame-Options:deny/);
        });

        it("drops only the preload token from HSTS, keeping the rest", function() {
            var out = rewrite("Strict-Transport-Security:max-age=31536000; includeSubDomains; preload");
            out.should.match(/max-age=31536000/);
            out.should.match(/includeSubDomains/);
            out.should.not.match(/preload/);
        });

        it("leaves an HSTS line that never had preload untouched", function() {
            var out = rewrite("Strict-Transport-Security:max-age=600; includeSubDomains\nX-Content-Type-Options: nosniff\nReferrer-Policy: no-referrer\nPermissions-Policy: camera=()");
            (out === null).should.equal(true);
        });
    });

    describe("what it leaves to the operator", function() {
        it("keeps preload on an HSTS line that is not the one we seeded", function() {
            // an operator who added preload has the domain on the browser preload list;
            // dropping the token does not undo that and can cost them their place
            var out = rewrite("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
            out.should.match(/preload/);
        });
        it("still drops it from the seeded line whatever the spacing", function() {
            var out = rewrite("Strict-Transport-Security: max-age=31536000;  includeSubDomains;  preload");
            out.should.not.match(/preload/);
            out.should.match(/max-age=31536000/);
        });
    });

    describe("the dashboard block only", function() {
        it("adds Cross-Origin-Opener-Policy when rewriting the dashboard headers", function() {
            var out = rewrite("X-Frame-Options:deny\nX-XSS-Protection:1", "dashboard_additional_headers");
            out.should.match(/Cross-Origin-Opener-Policy: same-origin-allow-popups/);
        });
        it("does not add it to the api headers", function() {
            var out = rewrite("X-Frame-Options:deny\nX-XSS-Protection:1", "api_additional_headers");
            out.should.not.match(/Cross-Origin-Opener-Policy/i);
        });
        it("does not duplicate one the operator already set", function() {
            var out = rewrite("X-XSS-Protection:1\nCross-Origin-Opener-Policy: same-origin", "dashboard_additional_headers");
            (out.match(/Cross-Origin-Opener-Policy/gi) || []).length.should.equal(1);
            out.should.match(/Cross-Origin-Opener-Policy: same-origin\b/);
        });
    });

    describe("what it adds", function() {
        it("appends the three missing headers", function() {
            var out = rewrite("X-Frame-Options:deny");
            out.should.match(/X-Content-Type-Options: nosniff/);
            out.should.match(/Referrer-Policy: strict-origin-when-cross-origin/);
            out.should.match(/Permissions-Policy: camera=\(\)/);
        });

        it("does not duplicate a header the operator already set, whatever its value", function() {
            // their choice of value wins; we only ensure the header is present
            var out = rewrite("Referrer-Policy: no-referrer\nX-Content-Type-Options: nosniff\nPermissions-Policy: geolocation=()");
            (out === null).should.equal(true);
        });

        it("matches header names case-insensitively when deciding what is missing", function() {
            var out = rewrite("referrer-policy: no-referrer\nx-content-type-options: nosniff\npermissions-policy: camera=()");
            (out === null).should.equal(true);
        });
    });

    describe("what it preserves", function() {
        it("keeps headers it knows nothing about", function() {
            var out = rewrite("X-XSS-Protection:1; mode=block\nX-Custom-Operator-Header: keep-me\nAccess-Control-Allow-Origin:*");
            out.should.match(/X-Custom-Operator-Header: keep-me/);
            out.should.match(/Access-Control-Allow-Origin:\*/);
            out.should.not.match(/X-XSS-Protection/i);
        });

        it("keeps the order of what was already there", function() {
            var out = rewrite("A-One: 1\nX-XSS-Protection:1\nB-Two: 2");
            out.indexOf("A-One").should.be.below(out.indexOf("B-Two"));
        });

        it("is idempotent", function() {
            var once = rewrite("X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000; includeSubDomains; preload");
            (rewrite(once) === null).should.equal(true);
        });

        it("handles CRLF input without leaving stray carriage returns", function() {
            var out = rewrite("X-Frame-Options:deny\r\nX-XSS-Protection:1\r\n");
            out.indexOf("\r").should.equal(-1);
            out.should.not.match(/X-XSS-Protection/i);
        });

        it("drops blank lines rather than emitting empty header entries", function() {
            var out = rewrite("X-Frame-Options:deny\n\n\nX-XSS-Protection:1");
            out.split("\n").every(function(l) {
                return l.trim().length > 0;
            }).should.equal(true);
        });
    });

    describe("inputs that are not strings", function() {
        it("returns null rather than throwing", function() {
            (rewrite(undefined) === null).should.equal(true);
            (rewrite(null) === null).should.equal(true);
            (rewrite(42) === null).should.equal(true);
        });
    });
});
