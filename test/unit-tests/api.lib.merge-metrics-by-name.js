/**
 * mergeMetricsByName groups chart rows by a metric value, and metric values come from SDK
 * requests. A value naming an Object.prototype member must group like any other value and
 * must not write into the prototype of the process.
 */
var should = require("should");
var countlyCommon = require("../../api/lib/countly.common.js");

describe("countlyCommon.mergeMetricsByName", function() {
    afterEach(function() {
        delete Object.prototype.t;
        delete Object.prototype.os;
    });

    it("merges rows with the same metric value", function() {
        var merged = countlyCommon.mergeMetricsByName([
            {os: "Android", t: 1},
            {os: "iOS", t: 2},
            {os: "Android", t: 3}
        ], "os");
        merged.should.eql([{os: "Android", t: 4}, {os: "iOS", t: 2}]);
    });

    it("keeps __proto__, constructor and prototype values as ordinary rows", function() {
        var merged = countlyCommon.mergeMetricsByName([
            {os: "__proto__", t: 1},
            {os: "__proto__", t: 5},
            {os: "constructor", t: 2},
            {os: "constructor", t: 3},
            {os: "prototype", t: 4}
        ], "os");
        should(Object.prototype.t).be.undefined();
        should(Object.prototype.os).be.undefined();
        ({}).should.not.have.property("t");
        merged.map(function(row) {
            return row.os + ":" + row.t;
        }).should.eql(["__proto__:6", "constructor:5", "prototype:4"]);
    });
});
