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
});
