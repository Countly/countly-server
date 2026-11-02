var assert = require("assert");
var mongodb = require("mongodb");
var common = require("../../api/utils/common.js");

// common.stringifyEscaped replaced JSON.stringify(output, escape_html_entities), which re-copied
// and re-escaped every subtree at every depth. The output must stay byte identical, so this
// runs the previous implementation (copied below as it was) and the new one over random
// payloads. Two inputs differ on purpose and are not generated: an own __proto__ key (now
// dropped) and a toJSON hook on a plain object (now escaped); escape-output.js covers those.

/**
 * Previous replacer, verbatim apart from the names
 * @param {string} key - key
 * @param {any} value - value
 * @param {boolean} more - escape quotes and ampersands too
 * @returns {any} escaped copy
 */
function oldEscape(key, value, more) {
    if (typeof value === 'object' && value && oldIsPlainContainer(value)) {
        var replacement;
        if (Array.isArray(value)) {
            replacement = [];
            for (let k = 0; k < value.length; k++) {
                if (typeof value[k] === "string") {
                    let ob = common.getJSON(value[k]);
                    if (ob.valid) {
                        replacement[common.escape_html(k, more)] = JSON.stringify(oldEscape(k, ob.data, more));
                    }
                    else {
                        replacement[k] = common.escape_html(value[k], more);
                    }
                }
                else {
                    replacement[k] = oldEscape(k, value[k], more);
                }
            }
            return replacement;
        }
        replacement = {};
        for (let k in value) {
            if (Object.hasOwnProperty.call(value, k)) {
                if (typeof value[k] === "string") {
                    let ob = common.getJSON(value[k]);
                    if (ob.valid) {
                        replacement[common.escape_html(k, more)] = JSON.stringify(oldEscape(k, ob.data, more));
                    }
                    else {
                        replacement[common.escape_html(k, more)] = common.escape_html(value[k], more);
                    }
                }
                else {
                    replacement[common.escape_html(k, more)] = oldEscape(k, value[k], more);
                }
            }
        }
        return replacement;
    }
    return value;
}

/**
 * Previous container check
 * @param {any} value - value
 * @returns {boolean} plain object or array
 */
function oldIsPlainContainer(value) {
    if (Array.isArray(value)) {
        return true;
    }
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

var seed = 20261101;
/**
 * Deterministic pseudo random number
 * @returns {number} 0..1
 */
function rnd() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
}
var pieces = ["a", "b c", "<b>", "</script>", "&", "&amp;", "&lt;i&gt;", "\"", "'", "ünï", "日本", "x>y", " ", "{", "[", "1"];
/**
 * Random string from the pieces above
 * @returns {string} string
 */
function rstr() {
    var n = Math.floor(rnd() * 5), s = "";
    for (var i = 0; i < n; i++) {
        s += pieces[Math.floor(rnd() * pieces.length)];
    }
    return s;
}
/**
 * Random value, nested up to depth
 * @param {number} depth - remaining depth
 * @returns {any} value
 */
function rval(depth) {
    var t = Math.floor(rnd() * (depth > 0 ? 12 : 8));
    switch (t) {
    case 0: return rstr();
    case 1: return Math.floor(rnd() * 1000) - 500;
    case 2: return rnd() > 0.5;
    case 3: return null;
    case 4: return new Date(1700000000000 + Math.floor(rnd() * 1e9));
    case 5: return new mongodb.ObjectId();
    case 6: return JSON.stringify(rval(Math.max(depth - 1, 0)));
    case 7: return undefined;
    case 8: case 9: {
        var o = rnd() > 0.85 ? Object.create(null) : {};
        var n = Math.floor(rnd() * 4);
        for (var i = 0; i < n; i++) {
            o[rnd() > 0.7 ? rstr() : "k" + i] = rval(depth - 1);
        }
        return o;
    }
    default: {
        var a = [], m = Math.floor(rnd() * 4);
        for (var j = 0; j < m; j++) {
            a.push(rval(depth - 1));
        }
        return a;
    }
    }
}

describe("stringifyEscaped matches the previous escaping", function() {
    it("on 4000 random payloads, with and without escaping quotes", function() {
        for (var i = 0; i < 4000; i++) {
            var payload = {result: rval(4)};
            var more = i % 2 === 0 ? true : undefined;
            var expected = JSON.stringify(payload, function(k, v) {
                return oldEscape(k, v, more);
            });
            assert.strictEqual(common.stringifyEscaped(payload, more), expected, "payload " + i);
        }
    });
});
