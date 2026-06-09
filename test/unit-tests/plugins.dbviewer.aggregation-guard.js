require("should");
var guard = require("../../plugins/dbviewer/api/parts/aggregation_guard.js");

// The DB Viewer aggregation guard strips any non-whitelisted stage (e.g.
// $lookup / $unionWith / $graphLookup) so cross-collection reads cannot bypass
// the per-collection access check. The key requirement is that this holds at
// EVERY depth, including inside $facet sub-pipelines.
describe("dbviewer aggregation guard", function() {
    describe("top level", function() {
        it("keeps whitelisted stages", function() {
            var pipeline = [{$match: {a: 1}}, {$group: {_id: "$x"}}, {$limit: 5}];
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            Object.keys(changes).length.should.equal(0);
            pipeline.length.should.equal(3);
        });
        it("strips a blocked $lookup at the top level", function() {
            var pipeline = [{$lookup: {from: "members", as: "m"}}, {$limit: 5}];
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            changes.should.have.property("$lookup");
            // the now-empty $lookup stage is removed, $limit remains
            pipeline.length.should.equal(1);
            pipeline[0].should.have.property("$limit");
        });
        it("strips inherited Object.prototype keys (constructor / __proto__) as non-allow-listed", function() {
            // a stage key like "constructor" resolves to a truthy inherited
            // property on the allow-list object; the guard must still strip it
            var pipeline = [JSON.parse('{"constructor": {"x": 1}}'), JSON.parse('{"__proto__": {"y": 1}}'), {$limit: 5}];
            guard.escapeNotAllowedAggregationStages(pipeline);
            // only the legitimate $limit stage survives
            pipeline.length.should.equal(1);
            pipeline[0].should.have.property("$limit");
        });
    });

    describe("nested inside $facet (the bypass)", function() {
        it("strips a $lookup smuggled inside a $facet sub-pipeline", function() {
            var pipeline = [{
                $facet: {
                    leak: [
                        {$lookup: {from: "members", pipeline: [{$project: {email: 1, api_key: 1}}], as: "members"}}
                    ]
                }
            }];
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            changes.should.have.property("$lookup");
            // the $lookup must not survive anywhere in the pipeline
            JSON.stringify(pipeline).indexOf("$lookup").should.equal(-1);
            JSON.stringify(pipeline).indexOf("members").should.equal(-1);
        });

        it("strips blocked stages nested in deeper $facet within $facet", function() {
            var pipeline = [{
                $facet: {
                    outer: [
                        {$match: {a: 1}},
                        {$facet: {inner: [{$unionWith: {coll: "members"}}]}}
                    ]
                }
            }];
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            changes.should.have.property("$unionWith");
            JSON.stringify(pipeline).indexOf("$unionWith").should.equal(-1);
        });

        it("keeps a $facet whose sub-pipeline only uses whitelisted stages", function() {
            var pipeline = [{
                $facet: {
                    counts: [{$match: {a: 1}}, {$count: "n"}]
                }
            }];
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            Object.keys(changes).length.should.equal(0);
            pipeline[0].should.have.property("$facet");
            pipeline[0].$facet.should.have.property("counts");
            pipeline[0].$facet.counts.length.should.equal(2);
        });

        it("drops a facet sub-pipeline emptied by sanitization (no empty $facet pipeline sent to mongo)", function() {
            var pipeline = [{
                $facet: {
                    leak: [{$lookup: {from: "members", as: "m"}}]
                }
            }];
            guard.escapeNotAllowedAggregationStages(pipeline);
            // leak became empty -> removed; $facet became empty -> stage removed
            pipeline.length.should.equal(0);
        });
    });

    // Future-proofing: $facet is the only allow-listed pipeline-bearing stage
    // today, but the sanitizer is structural — any kept stage exposing a
    // `.pipeline` array also has it sanitized. Simulate a future allow-listed
    // pipeline-bearing stage to prove blocked stages can't hide in its pipeline.
    describe("generic nested-pipeline handling (future-proofing)", function() {
        var FAKE = "$fakePipelineStage";
        beforeEach(function() {
            guard.whiteListedAggregationStages[FAKE] = true;
        });
        afterEach(function() {
            delete guard.whiteListedAggregationStages[FAKE];
        });

        it("strips a blocked stage nested in a kept stage's .pipeline", function() {
            var pipeline = [{}];
            pipeline[0][FAKE] = {pipeline: [{$match: {a: 1}}, {$lookup: {from: "members", as: "m"}}]};
            var changes = guard.escapeNotAllowedAggregationStages(pipeline);
            changes.should.have.property("$lookup");
            JSON.stringify(pipeline).indexOf("$lookup").should.equal(-1);
            // the kept stage and its legitimate $match remain
            pipeline[0].should.have.property(FAKE);
            pipeline[0][FAKE].pipeline.length.should.equal(1);
            pipeline[0][FAKE].pipeline[0].should.have.property("$match");
        });
    });

    // Blocks joins into redacted collections (members / auth_tokens) at any
    // depth, for everyone — including global admins, who skip the stage
    // sanitizer but are still denied raw credentials via DB Viewer.
    describe("findProtectedCollectionJoin", function() {
        it("returns null for a pipeline with no joins", function() {
            (guard.findProtectedCollectionJoin([{$match: {a: 1}}, {$group: {_id: "$x"}}]) === null).should.equal(true);
        });
        it("ignores a join into a non-protected collection", function() {
            (guard.findProtectedCollectionJoin([{$lookup: {from: "events", as: "e"}}]) === null).should.equal(true);
        });
        it("detects a top-level $lookup into members", function() {
            guard.findProtectedCollectionJoin([{$lookup: {from: "members", as: "m"}}]).should.equal("members");
        });
        it("detects a $lookup into members nested in $facet", function() {
            guard.findProtectedCollectionJoin([{$facet: {leak: [{$lookup: {from: "members", as: "m"}}]}}]).should.equal("members");
        });
        it("detects a $lookup into members nested in another stage's .pipeline", function() {
            guard.findProtectedCollectionJoin([{$lookup: {from: "events", pipeline: [{$lookup: {from: "members", as: "m"}}], as: "x"}}]).should.equal("members");
        });
        it("detects $unionWith (object form) into auth_tokens", function() {
            guard.findProtectedCollectionJoin([{$unionWith: {coll: "auth_tokens", pipeline: []}}]).should.equal("auth_tokens");
        });
        it("detects $unionWith (string shorthand) into members", function() {
            guard.findProtectedCollectionJoin([{$unionWith: "members"}]).should.equal("members");
        });
        it("detects $graphLookup into members", function() {
            guard.findProtectedCollectionJoin([{$graphLookup: {from: "members", startWith: "$x", connectFromField: "a", connectToField: "b", as: "m"}}]).should.equal("members");
        });
        it("detects a join nested in an arbitrary (non-$facet, non-.pipeline) stage shape", function() {
            // future-proofing: a join smuggled under some unknown stage shape
            // that isn't $facet and doesn't use a .pipeline key must still be found
            var pipeline = [{$someFutureStage: {branches: [[{$lookup: {from: "members", as: "m"}}]]}}];
            guard.findProtectedCollectionJoin(pipeline).should.equal("members");
        });
    });
});
