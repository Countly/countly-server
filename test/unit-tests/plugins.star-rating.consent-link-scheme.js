require("should");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

// A consent link's destination is rendered into an anchor's href, in the widget drawer and
// in the public popup. HTML escaping is applied in both places and is no protection for
// this: `javascript:alert(1)` contains no HTML metacharacter, so it passes through
// unchanged and the browser runs it when the link is clicked. The scheme has to be checked
// as a scheme.
//
// There are three copies of that check, in three separate runtime contexts: the widget
// endpoint, the dashboard drawer, and the standalone popup page, which shares no code with
// the dashboard. They have to agree, or a value refused in one place renders in another,
// so every case below is asserted against all three.
describe("star-rating consent link destinations", function() {
    var root = path.join(__dirname, "../..");

    /**
     * Lift a function out of a source file by name and make it callable.
     *
     * These files cannot be required here: the api pulls in plugin dependencies that are
     * absent in a bare checkout, and the popup is an html template. The checks are pure,
     * so they are extracted instead.
     *
     * @param {string} file - path relative to the repo root
     * @param {string} needle - text just before the function's opening brace
     * @param {string} name - identifier to return
     * @returns {function} the extracted function
     */
    function lift(file, needle, name) {
        var src = fs.readFileSync(path.join(root, file), "utf8");
        var at = src.indexOf(needle);
        if (at === -1) {
            throw new Error("could not find " + needle + " in " + file + "; if it moved, update this test rather than deleting it");
        }
        var open = src.indexOf("{", at);
        var depth = 0, end = -1;
        for (var i = open; i < src.length; i++) {
            if (src[i] === "{") {
                depth++;
            }
            else if (src[i] === "}") {
                depth--;
                if (depth === 0) {
                    end = i + 1;
                    break;
                }
            }
        }
        var decl = src.slice(at, end);
        var sandbox = {module: {exports: {}}};
        vm.createContext(sandbox);
        // the api version reads a const declared above it, so pull that in when present
        var reLine = src.match(/const SAFE_LINK_URL = .*;/);
        vm.runInContext((reLine ? reLine[0] + "\n" : "") + decl + "\nmodule.exports = " + name + ";", sandbox);
        return sandbox.module.exports;
    }

    var checks = {
        "widget endpoint": lift("plugins/star-rating/api/api.js", "function isSafeLinkUrl", "isSafeLinkUrl"),
        "dashboard drawer": lift("plugins/star-rating/frontend/public/javascripts/countly.views.js", "function isSafeConsentLink", "isSafeConsentLink"),
        "public popup": lift("plugins/star-rating/frontend/public/templates/feedback-popup.html", "var isSafeLinkUrl = function", "isSafeLinkUrl")
    };

    var TAB = String.fromCharCode(9);
    var NEWLINE = String.fromCharCode(10);

    var allowed = [
        ["an https url", "https://example.com/terms"],
        ["an http url", "http://example.com"],
        ["a root-relative path", "/terms"],
        ["a fragment", "#terms"],
        ["an https url with a query", "https://example.com/t?a=1&b=2"],
        ["mixed case scheme", "HTTPS://example.com"]
    ];

    var refused = [
        ["a javascript url", "javascript:alert(document.domain)//"],
        ["mixed case javascript", "JaVaScRiPt:alert(1)"],
        ["javascript with leading spaces", "   javascript:alert(1)"],
        ["javascript split by a tab", "java" + TAB + "script:alert(1)"],
        ["javascript split by a newline", "java" + NEWLINE + "script:alert(1)"],
        ["a data url", "data:text/html,<script>alert(1)</script>"],
        ["a vbscript url", "vbscript:msgbox(1)"],
        ["a protocol-relative url", "//evil.example.com"],
        ["an empty string", ""],
        ["a bare scheme name", "javascript:"],
        ["some other scheme", "ftp://example.com"]
    ];

    Object.keys(checks).forEach(function(where) {
        describe(where, function() {
            allowed.forEach(function(c) {
                it("allows " + c[0], function() {
                    checks[where](c[1]).should.equal(true);
                });
            });
            refused.forEach(function(c) {
                it("refuses " + c[0], function() {
                    checks[where](c[1]).should.equal(false);
                });
            });
            it("refuses a value that is not a string", function() {
                checks[where](undefined).should.equal(false);
                checks[where](null).should.equal(false);
                checks[where]({}).should.equal(false);
            });
        });
    });

    // textValue is interpolated into a RegExp in the drawer. Unescaped, the value IS a
    // pattern rather than a literal, so a link label can turn matching into catastrophic
    // backtracking.
    describe("regex metacharacters in a link label", function() {
        var escapeForRegExp = lift("plugins/star-rating/frontend/public/javascripts/countly.views.js", "function escapeForRegExp", "escapeForRegExp");

        it("matches a metacharacter-laden label literally", function() {
            var label = "(a+)+$";
            new RegExp(escapeForRegExp(label)).test(label).should.equal(true);
        });

        it("does not let a label behave as a pattern", function() {
            new RegExp(escapeForRegExp("(a+)+$")).test("aaaaaaaaaaaaaaaa!").should.equal(false);
        });

        it("leaves an ordinary label untouched", function() {
            escapeForRegExp("Terms and Conditions").should.equal("Terms and Conditions");
        });

        it("still produces a valid pattern from a lone bracket or backslash", function() {
            var built = true;
            try {
                new RegExp(escapeForRegExp("["));
                new RegExp(escapeForRegExp(String.fromCharCode(92)));
            }
            catch (e) {
                built = false;
            }
            built.should.equal(true);
        });
    });
});
