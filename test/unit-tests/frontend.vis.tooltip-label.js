require("should");
var fs = require("fs");
var path = require("path");

// Chart tooltips are built by concatenating values into an html string, so whatever is
// interpolated has to be escaped, and the escaping has to be the last thing done to it.
//
// sanitizeHtml used to encode and then immediately unescape, which returns the input
// unchanged, so a label containing markup went into the template as markup. The order is
// the whole point, which is what this pins down.
//
// The suite has no DOM, and countlyCommon.encodeHtml is implemented as
// `div.innerText = value; return div.innerHTML`. Its documented effect on element content
// is to escape & < >, so that is substituted here. Everything else under test, the
// composition order and the decode step, is the real source lifted out of the files.
describe("chart tooltip label rendering", function() {
    var visPath = path.join(__dirname, "../../frontend/express/public/javascripts/countly/vue/components/vis.js");
    var commonPath = path.join(__dirname, "../../frontend/express/public/javascripts/countly/countly.common.js");

    /**
     * Lift a function body out of a source file and make it callable.
     * @param {string} src - file contents
     * @param {string} marker - text immediately preceding the function's brace
     * @param {string} arg - the function's parameter name
     * @returns {function} the extracted function
     */
    function lift(src, marker, arg) {
        var at = src.indexOf(marker);
        if (at === -1) {
            throw new Error("could not find " + marker + "; if it moved, update this test rather than deleting it");
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
                    return new Function("countlyCommon", arg,
                        "return (function(" + arg + ")" + src.slice(open, i + 1) + ")(" + arg + ");");
                    /*eslint-enable no-new-func*/
                }
            }
        }
        throw new Error("unbalanced braces after " + marker);
    }

    var visSrc = fs.readFileSync(visPath, "utf8");
    var commonSrc = fs.readFileSync(commonPath, "utf8");

    var rawSanitize = lift(visSrc, "sanitizeHtml: function", "value");
    var rawDecode = lift(commonSrc, "countlyCommon.decode = function", "str");
    var rawUnescape = lift(commonSrc, "countlyCommon.unescapeHtml = function", "htmlStr");

    var countlyCommon = {
        decode: function(s) {
            return rawDecode(null, s);
        },
        unescapeHtml: function(s) {
            return rawUnescape(null, s);
        },
        encodeHtml: function(h) {
            return String(h).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    };

    /**
     * Call the lifted sanitizeHtml with the stubbed countlyCommon.
     * @param {any} value - the label value
     * @returns {any} sanitized value
     */
    function sanitize(value) {
        return rawSanitize(countlyCommon, value);
    }

    /**
     * Whether an html string would open a tag when parsed as element content.
     *
     * A character reference is resolved into text during tokenization, so only a literal
     * `<` followed by a name or a slash can start one.
     *
     * @param {string} html - the html string
     * @returns {boolean} true when the string contains a tag
     */
    function opensATag(html) {
        return (/<[a-zA-Z/]/).test(String(html));
    }

    /**
     * What a browser shows for an html string in element content.
     * @param {string} html - the html string
     * @returns {string} the visible text
     */
    function shows(html) {
        // one left-to-right pass, so a reference produced by decoding an earlier one is
        // not decoded again: "&amp;lt;" has to come out as "&lt;", not as "<"
        var named = {lt: "<", gt: ">", quot: "\"", amp: "&", apos: "'"};
        return String(html).replace(/&(lt|gt|quot|amp|apos|#\d+);?/g, function(match, entity) {
            if (entity.charAt(0) === "#") {
                return String.fromCharCode(parseInt(entity.slice(1), 10));
            }
            return named[entity];
        });
    }

    describe("values that must not become markup", function() {
        [
            ["a decoded segment value, which is how the events chart supplies them", "<img src=x onerror=alert(1)>"],
            ["a value still carrying the api's escaping", "&lt;img src=x onerror=alert(1)&gt;"],
            ["a closing tag", "</span><script>alert(1)</script>"],
            ["an unquoted attribute payload", "<svg onload=alert(1)>"]
        ].forEach(function(c) {
            it("does not open a tag for " + c[0], function() {
                opensATag(sanitize(c[1])).should.equal(false);
            });
        });

        it("shows the markup to the user as text instead of running it", function() {
            shows(sanitize("<img src=x onerror=alert(1)>")).should.equal("<img src=x onerror=alert(1)>");
        });
    });

    describe("values that must still read normally", function() {
        [
            ["a dotted key", "price&#46;usd", "price.usd"],
            ["a dollar-prefixed key", "&#36;price", "$price"],
            ["a url encoded dotted key", "price&amp;#46;usd", "price.usd"],
            ["an ampersand from the api", "A &amp; B", "A & B"],
            ["quotes from the api", "say &quot;hi&quot;", "say \"hi\""],
            ["plain text", "checkout_button", "checkout_button"]
        ].forEach(function(c) {
            it("shows " + c[0] + " as " + JSON.stringify(c[2]), function() {
                shows(sanitize(c[1])).should.equal(c[2]);
            });
        });
    });

    describe("values that are not strings", function() {
        it("passes falsy values straight through, as before", function() {
            (sanitize(0) === 0).should.equal(true);
            (sanitize("") === "").should.equal(true);
            (sanitize(null) === null).should.equal(true);
            (sanitize(undefined) === undefined).should.equal(true);
        });
        it("returns a number as a string, as before, since callers isNaN the result", function() {
            sanitize(1234).should.equal("1234");
        });
    });
});
