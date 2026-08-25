require("should");
var qguard = require("../../plugins/dbviewer/api/parts/query_guard.js");

// findDisallowedProjectionValue(projection) -> { name } | null
//
// A find() projection may only include or exclude fields. It used to have offending
// entries deleted and the query run anyway, which returned something other than what
// was asked for without saying so. It now returns the first offending field and the
// caller rejects the request, matching the aggregation guard.
describe("dbviewer query guard", function() {
    describe("findDisallowedProjectionValue", function() {
        it("accepts plain include/exclude projections", function() {
            var p = {name: 1, _id: 0, "a.b": 1, ok: true, no: false};
            (qguard.findDisallowedProjectionValue(p) === null).should.equal(true);
        });
        it("rejects a field-path alias value (e.g. {leak: \"$password\"})", function() {
            qguard.findDisallowedProjectionValue({leak: "$password", name: 1}).name.should.equal("leak");
            qguard.findDisallowedProjectionValue({name: 1, k: "$api_key"}).name.should.equal("k");
        });
        it("rejects an expression-object value (e.g. {x: {$function: ...}})", function() {
            qguard.findDisallowedProjectionValue({x: {$function: {body: "f", args: [], lang: "js"}}, name: 1}).name.should.equal("x");
            qguard.findDisallowedProjectionValue({y: {$concat: ["$password", ""]}}).name.should.equal("y");
        });
        it("rejects numeric values that are not strictly 0 or 1", function() {
            [2, NaN, -1, "1"].forEach(function(bad) {
                qguard.findDisallowedProjectionValue({ok: 1, a: bad}).name.should.equal("a");
            });
        });
        it("does not modify the projection it rejects", function() {
            var p = {leak: "$password", name: 1};
            qguard.findDisallowedProjectionValue(p);
            p.should.have.property("leak", "$password");
            Object.keys(p).length.should.equal(2);
        });
        it("accepts a missing or non-object projection", function() {
            (qguard.findDisallowedProjectionValue(undefined) === null).should.equal(true);
            (qguard.findDisallowedProjectionValue(null) === null).should.equal(true);
            (qguard.findDisallowedProjectionValue({}) === null).should.equal(true);
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
});
