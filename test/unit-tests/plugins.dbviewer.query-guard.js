require("should");
var qguard = require("../../plugins/dbviewer/api/parts/query_guard.js");
var aguard = require("../../plugins/dbviewer/api/parts/aggregation_guard.js");

describe("dbviewer query guard", function() {
    describe("sanitizeProjection", function() {
        it("keeps plain include/exclude projections", function() {
            var p = {name: 1, _id: 0, "a.b": 1, ok: true, no: false};
            var changes = qguard.sanitizeProjection(p);
            Object.keys(changes).length.should.equal(0);
            p.should.have.property("name", 1);
            p.should.have.property("a.b", 1);
        });
        it("drops a field-path alias value (e.g. {leak: \"$password\"})", function() {
            var p = {leak: "$password", k: "$api_key", name: 1};
            var changes = qguard.sanitizeProjection(p);
            changes.should.have.property("leak");
            changes.should.have.property("k");
            p.should.not.have.property("leak");
            p.should.not.have.property("k");
            p.should.have.property("name", 1);
        });
        it("drops an expression-object value (e.g. {x: {$function: ...}})", function() {
            var p = {x: {$function: {body: "f", args: [], lang: "js"}}, y: {$concat: ["$password", ""]}, name: 1};
            var changes = qguard.sanitizeProjection(p);
            changes.should.have.property("x");
            changes.should.have.property("y");
            p.should.not.have.property("x");
            p.should.not.have.property("y");
            p.should.have.property("name", 1);
        });
    });

    describe("escapeRegExp", function() {
        it("escapes regex metacharacters", function() {
            qguard.escapeRegExp("(a+)+$").should.equal("\\(a\\+\\)\\+\\$");
        });
        it("leaves a plain id untouched", function() {
            qguard.escapeRegExp("abc123").should.equal("abc123");
        });
        it("produces a literal-matching RegExp (no catastrophic pattern)", function() {
            var re = new RegExp(qguard.escapeRegExp("(a+)+"));
            re.test("(a+)+").should.equal(true);
            re.test("aaaa").should.equal(false);
        });
    });

    describe("findWriteStage", function() {
        it("returns null when no write stage is present", function() {
            (aguard.findWriteStage([{$match: {a: 1}}, {$group: {_id: "$x"}}]) === null).should.equal(true);
        });
        it("detects a top-level $out", function() {
            aguard.findWriteStage([{$match: {a: 1}}, {$out: "stolen"}]).should.equal("$out");
        });
        it("detects a top-level $merge", function() {
            aguard.findWriteStage([{$merge: {into: "members"}}]).should.equal("$merge");
        });
        it("detects a write stage nested in $facet", function() {
            aguard.findWriteStage([{$facet: {w: [{$out: "x"}]}}]).should.equal("$out");
        });
    });
});
