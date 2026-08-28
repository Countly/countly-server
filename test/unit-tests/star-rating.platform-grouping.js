require("should");
var fs = require("fs");
var path = require("path");

// /o/feedback/multiple/versions groups stored ratings by platform, using the platform
// name as an object key. That name arrives on the PUBLIC star-rating event, in the
// platform_version_rate segmentation, so anyone who can write to the app decides it.
//
// On a plain object, reading back a key such as "__proto__", "constructor" or "toString"
// returns an inherited member rather than undefined, so the "not seen yet" branch never
// runs, the array is never created, and the .indexOf() on the next line throws. The read
// then fails for every authorized caller until the seeded rows age out - the endpoint is
// denied by data someone else planted.
//
// The accumulation is an inline callback, so it is lifted out of the real source and run
// here. Lifting keeps the proof on the shipping code: dropping Object.create(null) breaks
// a behavioural test, not only a source match.

var API = path.join(__dirname, "../../plugins/star-rating/api/api.js");
var src = fs.readFileSync(API, "utf8");
var lines = src.split("\n");

/**
 * Lift the statement starting at the first line ending with `head`, through the first
 * following line whose text is `close` at the same indentation
 * @param {string} head - how the statement's first line ends
 * @param {string} close - the closing text, without indentation
 * @returns {string} the lifted statement, left trimmed
 */
function lift(head, close) {
    var start = lines.findIndex(function(l) {
        return l.trimEnd().endsWith(head);
    });
    if (start < 0) {
        throw new Error("not found in star-rating api.js: " + head);
    }
    var indent = lines[start].match(/^\s*/)[0];
    for (var j = start + 1; j < lines.length; j++) {
        if (lines[j] === indent + close) {
            return lines.slice(start, j + 1).map(function(l) {
                return l.slice(indent.length);
            }).join("\n");
        }
    }
    throw new Error("close not found for: " + head);
}

var LIFTED = lift("doc.meta.platform_version_rate.forEach(function(item) {", "});");

// the accumulator's declaration is lifted too, not written here: which object it is IS
// the fix, so a test that built its own would pass either way
var LIFTED_INIT = (function() {
    var at = lines.findIndex(function(l) {
        return l.trimEnd().endsWith("doc.meta.platform_version_rate.forEach(function(item) {");
    });
    for (var j = at; j >= 0; j--) {
        if (/^\s*var result = .+;\s*$/.test(lines[j])) {
            return lines[j].trim();
        }
    }
    throw new Error("accumulator declaration not found in star-rating api.js");
}());

/**
 * Run the real accumulation over the given rating segmentation values
 * @param {Array} values - platform_version_rate entries as stored
 * @returns {object} the grouping the endpoint would return
 */
function accumulate(values) {
    var result;
    var doc = {meta: {platform_version_rate: values}};
    /* eslint-disable no-eval, security/detect-eval-with-expression */
    eval(LIFTED_INIT);
    eval(LIFTED);
    /* eslint-enable no-eval, security/detect-eval-with-expression */
    return result;
}

describe("star-rating platform grouping", function() {
    it("builds its accumulator with a null prototype", function() {
        // asserted on the source as well, because the whole defect is which object the
        // accumulator is: an edit back to {} would be invisible in a diff review
        var accumulators = lines.filter(function(l) {
            return l.indexOf("var result = Object.create(null);") > -1;
        });
        accumulators.length.should.be.above(0);
        lines.filter(function(l, at) {
            return /^\s*var result = \{\};\s*$/.test(l)
                && lines.slice(at, at + 45).join("\n").indexOf("result[data[0]]") > -1;
        }).should.eql([]);
    });

    it("groups ordinary platforms by name", function() {
        var out = accumulate([
            "Android**1.0**5**w1**",
            "Android**1.1**4**w1**",
            "iOS**2.0**5**w1**",
            "Android**1.0**3**w1**"
        ]);
        Object.keys(out).sort().should.eql(["Android", "iOS"]);
        out.Android.should.eql(["1.0", "1.1"]);
        out.iOS.should.eql(["2.0"]);
    });

    it("survives a platform named after a prototype member", function() {
        // each of these read back as an inherited member on a plain object: an object,
        // the Object function, and a function respectively. None is undefined, so the
        // array was never created and .indexOf threw a TypeError on the next line.
        ["__proto__", "constructor", "toString", "valueOf", "hasOwnProperty"].forEach(function(name) {
            var out = null;
            var thrown = null;
            try {
                out = accumulate([name + "**1.0**5**w1**"]);
            }
            catch (e) {
                thrown = e;
            }
            (thrown === null).should.equal(true, name + " threw: " + (thrown && thrown.message));
            out[name].should.eql(["1.0"]);
        });
    });

    it("still answers about the other platforms when one is seeded", function() {
        // the point of the fix: one planted row must not deny the whole read
        var out = accumulate([
            "Android**1.0**5**w1**",
            "__proto__**9.9**1**w1**",
            "iOS**2.0**5**w1**"
        ]);
        out.Android.should.eql(["1.0"]);
        out.iOS.should.eql(["2.0"]);
    });

    it("serialises to the response the caller expects", function() {
        // returnOutput stringifies it, and a null prototype object stringifies the same
        var out = accumulate(["__proto__**1.0**5**w1**", "Android**1.0**5**w1**"]);
        JSON.parse(JSON.stringify(out)).should.have.property("Android");
    });
});
