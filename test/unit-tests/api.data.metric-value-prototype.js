require("should");
var fs = require("fs");
var path = require("path");
var countlyCommon = require("../../api/lib/countly.common.js");

// Metric values (os, device, carrier, ...) become field names in meta_v2 and the
// metric documents. A value naming an Object.prototype member is dropped at ingestion,
// and the chart merge keyed by metric values keeps its keys off the prototype.

describe("metric values that name a prototype member", function() {
    describe("usage.js drops them before building a field name", function() {
        var src = fs.readFileSync(path.join(__dirname, "../../api/parts/data/usage.js"), "utf8");

        it("in the metric processing that feeds meta_v2", function() {
            var fn = src.slice(src.indexOf("function processMetrics("));
            fn = fn.slice(0, fn.indexOf("tmpSet[\"meta_v2.\""));
            /isForbiddenFieldName\(escapedMetricVal\)/.test(fn).should.equal(true, "processMetrics checks the value");
        });

        it("in the processed metrics stored on the user", function() {
            var fn = src.slice(src.indexOf("var escapedMetricVal ="));
            fn = fn.slice(0, fn.indexOf("processedMetrics[tmpMetric.short_code]"));
            /isForbiddenFieldName\(escapedMetricVal\)/.test(fn).should.equal(true, "processedMetrics checks the value");
        });
    });

    describe("countlyCommon.mergeMetricsByName", function() {
        afterEach(function() {
            ["metric", "t", "u", "polluted"].forEach(function(key) {
                delete Object.prototype[key];
            });
        });

        it("does not write into Object.prototype for a __proto__ value", function() {
            countlyCommon.mergeMetricsByName([
                {metric: "__proto__", t: 1, u: 1, polluted: "yes"},
                {metric: "__proto__", t: 2, u: 1}
            ], "metric");
            ({}).should.not.have.property("polluted");
            ({}).should.not.have.property("t");
            ({}).should.not.have.property("metric");
        });

        it("still sums rows with the same name", function() {
            var merged = countlyCommon.mergeMetricsByName([
                {metric: "Android", t: 1, u: 1},
                {metric: "iOS", t: 5, u: 4},
                {metric: "Android", t: 2, u: 3},
                {metric: "constructor", t: 1, u: 1}
            ], "metric");
            merged.length.should.equal(3);
            merged[0].should.eql({metric: "Android", t: 3, u: 4});
            merged[1].should.eql({metric: "iOS", t: 5, u: 4});
            merged[2].should.eql({metric: "constructor", t: 1, u: 1});
        });
    });
});
