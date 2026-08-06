require("should");
var guard = require("../../plugins/dbviewer/api/parts/aggregation_guard.js");

var USER = guard.ALLOWED_OPERATORS_USER;
var ADMIN = guard.ALLOWED_OPERATORS_GLOBAL_ADMIN;

// sanitizeAggregation(pipeline, allowedOperators) -> { changes, error }
//
// The pipeline is never modified. Every "$"-prefixed KEY, at any depth, must be on
// the role's allow-list, or the request is rejected. Values are never inspected,
// and matching is exact.
//
// The guard used to strip disallowed stages instead, which required guessing which
// nested arrays were sub-pipelines. That guess is what the reported bypass defeated:
// one unrecognised sibling stage made a whole branch invisible to the filter.
describe("dbviewer aggregation guard", function() {
    describe("the reported bypass", function() {
        it("rejects a $lookup hidden behind an unrecognised sibling stage", function() {
            // $_internalInhibitOptimization is a real but undocumented MongoDB
            // stage. Because it was not in the old list of known stage names, the
            // old guard stopped treating this array as a pipeline and left the
            // sibling $lookup in place.
            var p = [
                {$limit: 1},
                {
                    $facet: {
                        leak: [
                            {$lookup: {from: "password_reset", pipeline: [{$project: {prid: 1}}], as: "docs"}},
                            {$_internalInhibitOptimization: {}},
                            {$unwind: "$docs"},
                            {$replaceRoot: {newRoot: "$docs"}}
                        ]
                    }
                }
            ];
            // Two independent checks now catch this. The join check runs first and
            // reports the collection, since password_reset is protected for every
            // role; the operator check would reject it anyway.
            var res = guard.sanitizeAggregation(p, USER);
            res.error.type.should.equal("join");
            res.error.name.should.equal("password_reset");
        });
        it("rejects the same shape aimed at an unprotected collection, on the operator", function() {
            var p = [
                {$limit: 1},
                {
                    $facet: {
                        leak: [
                            {$lookup: {from: "apps", pipeline: [{$project: {key: 1}}], as: "docs"}},
                            {$_internalInhibitOptimization: {}},
                            {$unwind: "$docs"},
                            {$replaceRoot: {newRoot: "$docs"}}
                        ]
                    }
                }
            ];
            var res = guard.sanitizeAggregation(p, USER);
            res.error.type.should.equal("operator");
            res.error.name.should.equal("$lookup");
            res.error.where.should.containEql("$facet");
        });
        it("rejects the unrecognised stage on its own too", function() {
            var res = guard.sanitizeAggregation([{$limit: 1}, {$_internalInhibitOptimization: {}}], USER);
            res.error.name.should.equal("$_internalInhibitOptimization");
        });
        it("rejects a $lookup nested arbitrarily deep", function() {
            var p = [{$facet: {a: [{$facet: {b: [{$lookup: {from: "apps", as: "d"}}]}}]}}];
            guard.sanitizeAggregation(p, USER).error.name.should.equal("$lookup");
        });
        it("leaves the pipeline untouched when rejecting", function() {
            var p = [{$lookup: {from: "apps", as: "d"}}, {$limit: 5}];
            guard.sanitizeAggregation(p, USER);
            p.length.should.equal(2);
            p[0].should.have.property("$lookup");
        });
    });

    describe("operator allow-list (non-global user)", function() {
        it("accepts allow-listed stages", function() {
            var res = guard.sanitizeAggregation([{$match: {a: 1}}, {$group: {_id: "$x"}}, {$limit: 5}], USER);
            (res.error === null).should.equal(true);
        });
        it("rejects $lookup", function() {
            guard.sanitizeAggregation([{$lookup: {from: "events", as: "e"}}], USER).error.name.should.equal("$lookup");
        });
        it("rejects write stages ($out, $merge) for everyone", function() {
            guard.sanitizeAggregation([{$match: {a: 1}}, {$out: "stolen"}], USER).error.name.should.equal("$out");
            guard.sanitizeAggregation([{$merge: {into: "stolen"}}], ADMIN).error.name.should.equal("$merge");
        });
        it("rejects server introspection stages", function() {
            guard.sanitizeAggregation([{$currentOp: {}}], USER).error.name.should.equal("$currentOp");
            guard.sanitizeAggregation([{$collStats: {}}], ADMIN).error.name.should.equal("$collStats");
        });
        it("rejects a stage element that names no operator", function() {
            var res = guard.sanitizeAggregation([JSON.parse('{"constructor": {"x": 1}}')], USER);
            res.error.type.should.equal("stage");
        });
        it("rejects an own __proto__ key used as a stage name", function() {
            var res = guard.sanitizeAggregation([JSON.parse('{"__proto__": {"y": 1}}')], USER);
            res.error.type.should.equal("stage");
        });
    });

    describe("does not reject legitimate queries", function() {
        it("accepts expression operators inside stages", function() {
            var p = [{$project: {t: {$add: ["$a", "$b"]}, m: {$mergeObjects: [{x: 1}, {y: 2}]}}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts $mergeObjects, which must not be confused with $merge", function() {
            var p = [{$project: {m: {$mergeObjects: [{a: 1}, {b: 2}]}}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts a value that looks like a disallowed operator", function() {
            // {$literal: "$lookup"} returns the STRING "$lookup". Only keys are
            // checked, so this is fine.
            var p = [{$project: {lit: {$literal: "$lookup"}}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts $setField naming a $-prefixed field", function() {
            // MongoDB allows documents with $-prefixed field names, reachable only
            // through $getField / $setField where the name is a value.
            var p = [{$project: {b: {$setField: {field: {$literal: "$lookup"}, input: {}, value: 1}}}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts complex $match operators", function() {
            var p = [{$match: {$and: [{a: {$gt: 1}}, {b: {$in: [1, 2]}}], c: {$elemMatch: {d: 1}}}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts accumulators and window operators", function() {
            var p = [
                {$group: {_id: "$a", n: {$sum: 1}, all: {$push: "$b"}}},
                {$setWindowFields: {sortBy: {a: 1}, output: {r: {$rank: {}}}}}
            ];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
        it("accepts a real $facet", function() {
            var p = [{$facet: {byA: [{$group: {_id: "$a", n: {$sum: 1}}}], byB: [{$sortByCount: "$b"}]}}];
            (guard.sanitizeAggregation(p, USER).error === null).should.equal(true);
        });
    });

    describe("server-side JavaScript (any role, any depth)", function() {
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

    describe("joins into redacted collections (any role, any depth)", function() {
        it("rejects a $lookup into members even for a global admin", function() {
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
        it("rejects a $lookup into members via the cross-db object form", function() {
            var res = guard.sanitizeAggregation([{$lookup: {from: {db: "countly", coll: "members"}, as: "m"}}], ADMIN);
            res.error.type.should.equal("join");
            res.error.name.should.equal("members");
        });
        it("rejects a $lookup into password_reset, whose prid is a reset token", function() {
            var res = guard.sanitizeAggregation([{$lookup: {from: "password_reset", as: "d"}}], ADMIN);
            res.error.type.should.equal("join");
            res.error.name.should.equal("password_reset");
        });
        it("rejects a $graphLookup into members via the cross-db object form", function() {
            var res = guard.sanitizeAggregation([{$graphLookup: {from: {db: "countly", coll: "members"}, startWith: "$x", connectFromField: "a", connectToField: "b", as: "m"}}], ADMIN);
            res.error.type.should.equal("join");
            res.error.name.should.equal("members");
        });
    });

    describe("global admin allow-list", function() {
        it("allows $lookup into a non-protected collection", function() {
            var p = [{$lookup: {from: "events", pipeline: [{$match: {a: 1}}], as: "e"}}, {$limit: 5}];
            (guard.sanitizeAggregation(p, ADMIN).error === null).should.equal(true);
        });
        it("allows $unionWith into a non-protected collection", function() {
            var p = [{$unionWith: {coll: "events", pipeline: [{$limit: 1}]}}];
            (guard.sanitizeAggregation(p, ADMIN).error === null).should.equal(true);
        });
        it("rejects the same $lookup for a non-global user", function() {
            guard.sanitizeAggregation([{$lookup: {from: "events", as: "e"}}], USER).error.name.should.equal("$lookup");
        });
    });

    describe("allow-list integrity", function() {
        it("does not contain the operators it is meant to exclude", function() {
            ["$out", "$merge", "$function", "$accumulator", "$where", "$currentOp",
                "$collStats", "$indexStats", "$planCacheStats", "$listSessions",
                "$mergeCursors", "$documents", "$changeStream"].forEach(function(op) {
                (ADMIN[op] === true).should.equal(false);
            });
        });
        it("does not carry the misspelling the previous version had", function() {
            // the real stage is $shardedDataDistribution; the old list said
            // $sharedDataDistribution, so the real one was never recognised
            (ADMIN.$sharedDataDistribution === true).should.equal(false);
            (ADMIN.$shardedDataDistribution === true).should.equal(false);
        });
        it("gives non-global users no join operators", function() {
            ["$lookup", "$graphLookup", "$unionWith"].forEach(function(op) {
                (USER[op] === true).should.equal(false);
            });
        });
    });
});
