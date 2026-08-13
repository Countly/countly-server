require("should");
var path = require("path");
var { RuleTester } = require("eslint");
var rule = require("../../bin/eslint-rules/no-prototype-pollution-sink.js");

// A key taken from a mongo document or from JSON.parse can be the literal "__proto__".
// Writing THROUGH such a key reaches Object.prototype when the target has no own
// property of that name, and the pollution lasts the life of the worker. Writing AT it
// is harmless: the setter fires and reparents the local object.
//
// The rule exists because naming is no guide: the sinks it was written for were called
// deepMerge, getMergedEventData, an unnamed inline loop, an `action` loop and a
// `summed` loop.

var ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2022, sourceType: "script" } });

describe("no-prototype-pollution-sink", function() {
    it("reports writes through an enumerated key and allows writes at it", function() {
        ruleTester.run("no-prototype-pollution-sink", rule, {
            valid: [
                // writing AT the key: the setter reparents a local object, no pollution
                { code: "for (var k in doc) { acc[k] = doc[k]; }" },
                // guarded the way the fixed merges are
                {
                    code: "for (var k in doc) { if (k === '__proto__') { continue; } acc[k].x = 1; }",
                },
                // a second guard style: hasOwnProperty plus the names, as the merges use
                {
                    code: "for (var k in doc) { if (!isMergeableKey(doc, k)) { continue; } acc[k].x = 1; }",
                },
                // a plain indexed loop is not this shape
                { code: "for (var i = 0; i < n; i++) { acc[i].x = 1; }" },
            ],
            invalid: [
                {
                    code: "for (var k in doc) { acc[k].x = 1; }",
                    errors: [{ messageId: "sink" }],
                },
                {
                    code: "for (var k in doc) { acc[k][j] += doc[k][j]; }",
                    errors: [{ messageId: "sink" }],
                },
                // for-of over Object.keys is the same enumeration
                {
                    code: "for (const k of Object.keys(doc)) { acc[k].x = 1; }",
                    errors: [{ messageId: "sink" }],
                },
                // nested loops must not report the same write twice
                {
                    code: "for (var a in doc) { for (var b in doc[a]) { out[a][b] = 1; } }",
                    errors: 1,
                },
            ],
        });
    });

    it("points at guarding the loop, there being no exceptions list to add to", function() {
        var linter = new (require("eslint").Linter)();
        linter.defineRule("t", rule);
        var messages = linter.verify("for (var k in doc) { acc[k].x = 1; }", {
            parserOptions: { ecmaVersion: 2022 },
            rules: { t: "error" },
        }, path.join(process.cwd(), "api/zz.js"));
        messages[0].message.should.match(/Skip the prototype member names/);
    });
});
