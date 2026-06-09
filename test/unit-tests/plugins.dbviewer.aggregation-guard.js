require("should");
var guard = require("../../plugins/dbviewer/api/parts/aggregation_guard.js");

var USER = guard.ALLOWED_STAGES_USER;
var ADMIN = guard.ALLOWED_STAGES_GLOBAL_ADMIN;

// sanitizeAggregation(pipeline, allowedStages) -> { changes, error }
//  - strips stages not in the role's allow-list (recursively, at every depth)
//  - rejects (error) server-side-JS operators and joins into redacted
//    collections, for any role, at any depth
describe("dbviewer aggregation guard", function() {
    describe("stage allow-list (non-global user)", function() {
        it("keeps allow-listed stages untouched", function() {
            var p = [{$match: {a: 1}}, {$group: {_id: "$x"}}, {$limit: 5}];
            var res = guard.sanitizeAggregation(p, USER);
            (res.error === null).should.equal(true);
            Object.keys(res.changes).length.should.equal(0);
            p.length.should.equal(3);
        });
        it("strips a non-allowed stage ($lookup) for a normal user", function() {
            var p = [{$lookup: {from: "events", as: "e"}}, {$limit: 5}];
            var res = guard.sanitizeAggregation(p, USER);
            (res.error === null).should.equal(true);
            res.changes.should.have.property("$lookup");
            p.length.should.equal(1);
            p[0].should.have.property("$limit");
        });
        it("strips write stages ($out) for everyone (in no list)", function() {
            var p = [{$match: {a: 1}}, {$out: "stolen"}];
            var res = guard.sanitizeAggregation(p, USER);
            (res.error === null).should.equal(true);
            res.changes.should.have.property("$out");
            JSON.stringify(p).indexOf("$out").should.equal(-1);
        });
        it("strips inherited Object.prototype keys (constructor / __proto__)", function() {
            var p = [JSON.parse('{"constructor": {"x": 1}}'), JSON.parse('{"__proto__": {"y": 1}}'), {$limit: 5}];
            guard.sanitizeAggregation(p, USER);
            p.length.should.equal(1);
            p[0].should.have.property("$limit");
        });
    });

    describe("nested stage stripping (structural, any depth)", function() {
        it("strips a non-allowed stage nested in $facet", function() {
            var p = [{$facet: {leak: [{$lookup: {from: "events", as: "e"}}]}}];
            var res = guard.sanitizeAggregation(p, USER);
            res.changes.should.have.property("$lookup");
            JSON.stringify(p).indexOf("$lookup").should.equal(-1);
        });
        it("strips a non-allowed stage in an arbitrary (non-$facet/.pipeline) nested shape", function() {
            var p = [{$facet: {b: [{$set: {ok: 1}}]}}];
            // craft an allowed stage carrying a sub-pipeline under a custom field
            p[0].$facet.b.push({$project: {z: 1}});
            var weird = [{$group: {_id: 1}}];
            weird.push({$lookup: {from: "events", as: "e"}});
            p[0].$facet.b.push({$set: {nested: {anything: weird}}}); // expression object holding a pipeline-shaped array
            var res = guard.sanitizeAggregation(p, USER);
            res.changes.should.have.property("$lookup");
            JSON.stringify(p).indexOf("$lookup").should.equal(-1);
        });
        it("does not mistake an ordinary expression array for a sub-pipeline", function() {
            var p = [{$project: {full: {$concat: ["$a", "$b"]}}}];
            var res = guard.sanitizeAggregation(p, USER);
            Object.keys(res.changes).length.should.equal(0);
            p[0].$project.full.$concat.length.should.equal(2);
        });
        it("drops a $facet branch emptied by stripping", function() {
            var p = [{$facet: {leak: [{$lookup: {from: "events", as: "e"}}]}}];
            guard.sanitizeAggregation(p, USER);
            // leak emptied -> removed; $facet emptied -> stage removed
            p.length.should.equal(0);
        });
    });

    describe("hard rule: server-side JavaScript (any role, any depth)", function() {
        it("rejects $function inside a $project expression", function() {
            var p = [{$project: {x: {$function: {body: "f", args: [], lang: "js"}}}}];
            var res = guard.sanitizeAggregation(p, ADMIN);
            res.error.type.should.equal("operator");
            res.error.name.should.equal("$function");
        });
        it("rejects $accumulator inside $group", function() {
            var p = [{$group: {_id: null, v: {$accumulator: {init: "f", accumulate: "g", accumulateArgs: [], merge: "h", lang: "js"}}}}];
            guard.sanitizeAggregation(p, USER).error.name.should.equal("$accumulator");
        });
        it("rejects $where", function() {
            guard.sanitizeAggregation([{$match: {$where: "this.a==1"}}], USER).error.name.should.equal("$where");
        });
        it("rejects $function nested deep in $facet", function() {
            var p = [{$facet: {f: [{$addFields: {y: {$function: {body: "f", args: [], lang: "js"}}}}]}}];
            guard.sanitizeAggregation(p, ADMIN).error.name.should.equal("$function");
        });
    });

    describe("hard rule: joins into redacted collections (any role, any depth)", function() {
        it("rejects a $lookup into members (even for global admin)", function() {
            var res = guard.sanitizeAggregation([{$lookup: {from: "members", as: "m"}}], ADMIN);
            res.error.type.should.equal("join");
            res.error.name.should.equal("members");
        });
        it("rejects $unionWith (object form) into auth_tokens", function() {
            guard.sanitizeAggregation([{$unionWith: {coll: "auth_tokens", pipeline: []}}], ADMIN).error.name.should.equal("auth_tokens");
        });
        it("rejects $unionWith (string shorthand) into members", function() {
            guard.sanitizeAggregation([{$unionWith: "members"}], ADMIN).error.name.should.equal("members");
        });
        it("rejects $graphLookup into members", function() {
            guard.sanitizeAggregation([{$graphLookup: {from: "members", startWith: "$x", connectFromField: "a", connectToField: "b", as: "m"}}], ADMIN).error.name.should.equal("members");
        });
        it("rejects a join into members nested inside $facet", function() {
            guard.sanitizeAggregation([{$facet: {leak: [{$lookup: {from: "members", as: "m"}}]}}], ADMIN).error.name.should.equal("members");
        });
    });

    describe("global admin allow-list", function() {
        it("allows $lookup into a non-protected collection (kept, no error)", function() {
            var p = [{$lookup: {from: "events", pipeline: [{$match: {a: 1}}], as: "e"}}, {$limit: 5}];
            var res = guard.sanitizeAggregation(p, ADMIN);
            (res.error === null).should.equal(true);
            Object.keys(res.changes).length.should.equal(0);
            p[0].should.have.property("$lookup");
        });
        it("still strips a non-allowed stage ($out) for an admin", function() {
            var p = [{$match: {a: 1}}, {$out: "x"}];
            var res = guard.sanitizeAggregation(p, ADMIN);
            (res.error === null).should.equal(true);
            res.changes.should.have.property("$out");
        });
        it("does NOT allow $lookup for a normal user (stripped)", function() {
            var p = [{$lookup: {from: "events", as: "e"}}];
            var res = guard.sanitizeAggregation(p, USER);
            (res.error === null).should.equal(true);
            res.changes.should.have.property("$lookup");
            p.length.should.equal(0);
        });
    });
});
