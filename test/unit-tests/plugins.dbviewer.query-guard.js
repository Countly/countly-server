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
        it("drops numeric values that are not strictly 0 or 1", function() {
            var p = {a: 2, b: NaN, c: -1, ok: 1, off: 0, t: true, f: false};
            var changes = qguard.sanitizeProjection(p);
            changes.should.have.property("a");
            changes.should.have.property("b");
            changes.should.have.property("c");
            p.should.not.have.property("a");
            p.should.not.have.property("b");
            p.should.not.have.property("c");
            p.should.have.property("ok", 1);
            p.should.have.property("off", 0);
            p.should.have.property("t", true);
            p.should.have.property("f", false);
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

    describe("findServerSideJs", function() {
        it("returns null when no server-side-JS operator is present", function() {
            (aguard.findServerSideJs([{$project: {x: 1}}, {$group: {_id: "$a", n: {$sum: 1}}}]) === null).should.equal(true);
        });
        it("detects $function inside a $project expression", function() {
            aguard.findServerSideJs([{$project: {x: {$function: {body: "f", args: [], lang: "js"}}}}]).should.equal("$function");
        });
        it("detects $accumulator inside a $group", function() {
            aguard.findServerSideJs([{$group: {_id: null, v: {$accumulator: {init: "f", accumulate: "g", accumulateArgs: [], merge: "h", lang: "js"}}}}]).should.equal("$accumulator");
        });
        it("detects $where", function() {
            aguard.findServerSideJs([{$match: {$where: "this.a==1"}}]).should.equal("$where");
        });
        it("detects a server-side-JS operator nested deep inside $facet", function() {
            aguard.findServerSideJs([{$facet: {f: [{$addFields: {y: {$function: {body: "f", args: [], lang: "js"}}}}]}}]).should.equal("$function");
        });
    });
});
