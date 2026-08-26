require("should");
var fs = require("fs");
var path = require("path");
var apiCommon = require("../../api/lib/countly.common.js");

// Mongo will not accept $ or . in a key, so keys are substituted on the way in and undone
// on the way out. There are two implementations of that pair: the api one, which produces
// every value in the database, and the dashboard one, which consumes them.
//
// They had drifted. The dashboard decoder undid only $ and . while the api encoder also
// substitutes NUL, and the api decoder also accepts the url encoded forms, so &#9647,
// &amp;#36; and &amp;#46; reached the dashboard still encoded. That normally hides itself,
// because the result is interpolated into html and the browser resolves the leftovers as
// character references, but it surfaces anywhere that is not html, and it made a tooltip
// sanitizer look like it needed to undo html escaping when it did not.
//
// This asserts the two agree on behaviour rather than on source text, so reformatting one
// of them does not fail the test but changing what either substitutes does.
describe("key escaping parity between the api and the dashboard", function() {
    var frontendCommonPath = path.join(__dirname, "../../frontend/express/public/javascripts/countly/countly.common.js");

    /**
     * Lift a single function body out of a source file and make it callable.
     *
     * The dashboard file cannot be required here: it expects a browser. Only these two
     * functions are needed and both are pure string transforms, so they are extracted
     * rather than pulling in a DOM implementation for the whole suite.
     *
     * @param {string} src - file contents
     * @param {string} marker - text that immediately precedes the function's brace
     * @returns {function} the extracted function
     */
    function liftFunction(src, marker) {
        var at = src.indexOf(marker);
        if (at === -1) {
            throw new Error("could not find " + marker + "; if it was renamed, update this test rather than deleting it");
        }
        var open = src.indexOf("{", at);
        var depth = 0;
        for (var i = open; i < src.length; i++) {
            if (src[i] === "{") {
                depth++;
            }
            else if (src[i] === "}") {
                depth--;
                if (depth === 0) {
                    /*eslint-disable no-new-func*/
                    return new Function("str", "return (function(str)" + src.slice(open, i + 1) + ")(str);");
                    /*eslint-enable no-new-func*/
                }
            }
        }
        throw new Error("unbalanced braces after " + marker);
    }

    var frontendSrc = fs.readFileSync(frontendCommonPath, "utf8");
    var frontendEncode = liftFunction(frontendSrc, "countlyCommon.encode = function");
    var frontendDecode = liftFunction(frontendSrc, "countlyCommon.decode = function");

    var NUL = String.fromCharCode(0);

    var keys = [
        "plain_key",
        "price.usd",
        "$price",
        "a.b.c",
        "$",
        ".",
        "x" + NUL + "y",
        "mixed$.value",
        "trailing.",
        ""
    ];

    // A key whose text already looks like a substitution is not round-trippable, since
    // nothing distinguishes it from an encoded dot. Kept out of the round trip list and
    // asserted on its own below: it is a property of the scheme, shared by both
    // implementations, not something either side gets wrong.
    var LOOKS_ENCODED = "already&#46;encoded";

    describe("encode", function() {
        keys.forEach(function(k) {
            it("agrees with the api for " + JSON.stringify(k), function() {
                frontendEncode(k).should.equal(apiCommon.encode(k));
            });
        });
    });

    describe("decode", function() {
        var encoded = [
            "price&#46;usd",
            "&#36;price",
            "price&amp;#46;usd",
            "&amp;#36;price",
            "x&#9647y",
            "nothing_to_undo",
            ""
        ];
        encoded.forEach(function(e) {
            it("agrees with the api for " + JSON.stringify(e), function() {
                frontendDecode(e).should.equal(apiCommon.decode(e));
            });
        });
    });

    describe("round trip", function() {
        keys.forEach(function(k) {
            it("returns the original key for " + JSON.stringify(k), function() {
                // the substitutions exist to survive a trip through mongo, so encoding
                // and decoding has to be lossless on both sides
                frontendDecode(frontendEncode(k)).should.equal(k);
                apiCommon.decode(apiCommon.encode(k)).should.equal(k);
            });
        });
    });

    describe("a key that already looks encoded", function() {
        it("is not round-trippable, and both sides are wrong about it identically", function() {
            // documenting the limitation rather than asserting it away: the point of this
            // suite is that the two implementations agree, and here they do
            frontendEncode(LOOKS_ENCODED).should.equal(apiCommon.encode(LOOKS_ENCODED));
            frontendDecode(frontendEncode(LOOKS_ENCODED)).should.equal("already.encoded");
            apiCommon.decode(apiCommon.encode(LOOKS_ENCODED)).should.equal("already.encoded");
        });
    });

    describe("the substitutions the dashboard used to leave behind", function() {
        it("undoes the NUL placeholder", function() {
            frontendDecode("x&#9647y").should.equal("x" + NUL + "y");
        });
        it("undoes the url encoded dollar and dot forms", function() {
            frontendDecode("&amp;#36;price").should.equal("$price");
            frontendDecode("price&amp;#46;usd").should.equal("price.usd");
        });
    });
});
