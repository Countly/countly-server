require("should");
var fs = require("fs");
var path = require("path");
var common = require("../../api/utils/common.js");

// Segmentation values, metric values and event keys all become MongoDB field names.
// A value literally naming an Object.prototype member survives storage as a field and,
// when the stored document is later walked by deepMerge, is written into the prototype
// of the API worker for the rest of its life. #7634 guarded the key path; these cover
// the shared predicate and the two value paths that reach the same field-name position.
//
// recordSegmentMetric and deepMerge are module-private, so the paths through them are
// asserted at the source level. The behavioural proof that deepMerge no longer pollutes
// is in the PR description, produced by lifting the real function and merging a
// document with an own-enumerable __proto__ field.

describe("common.isForbiddenFieldName", function() {
    it("names the three prototype members", function() {
        common.isForbiddenFieldName("__proto__").should.equal(true);
        common.isForbiddenFieldName("constructor").should.equal(true);
        common.isForbiddenFieldName("prototype").should.equal(true);
    });
    it("passes ordinary segment values through", function() {
        common.isForbiddenFieldName("Chrome").should.equal(false);
        common.isForbiddenFieldName("enterprise").should.equal(false);
        common.isForbiddenFieldName("").should.equal(false);
    });
});

describe("the value paths run through the predicate before building a field name", function() {
    it("events.js guards the segmentation value, not only the key", function() {
        var src = fs.readFileSync(path.join(__dirname, "../../api/parts/data/events.js"), "utf8");
        // the value is escaped into tmpSegVal, then must pass the predicate before use
        src.should.match(/isForbiddenFieldName\(tmpSegVal\)/);
    });
    it("common.js recordSegmentMetric guards the metric value", function() {
        var src = fs.readFileSync(path.join(__dirname, "../../api/utils/common.js"), "utf8");
        src.should.match(/isForbiddenFieldName\(escapedMetricVal\)/);
    });
    it("deepMerge skips inherited keys and prototype-member names", function() {
        // via the shared isMergeableKey, which the read-path suite below pins down
        var src = fs.readFileSync(path.join(__dirname, "../../api/parts/data/fetch.js"), "utf8");
        var dm = src.slice(src.indexOf("function deepMerge"));
        dm = dm.slice(0, dm.indexOf("return ob1"));
        dm.should.match(/isMergeableKey\(ob2, i\)/);
    });
});

describe("both read-path merges refuse a prototype key", function() {
    var fetchSrc = fs.readFileSync(path.join(__dirname, "../../api/parts/data/fetch.js"), "utf8");

    it("shares one guard for every walk of a stored document", function() {
        fetchSrc.should.match(/function isMergeableKey\(source, key\)/);
        fetchSrc.should.match(/hasOwnProperty\.call\(source, key\)/);
        fetchSrc.should.match(/isForbiddenFieldName\(key\)/);
    });

    it("guards deepMerge", function() {
        var dm = fetchSrc.slice(fetchSrc.indexOf("function deepMerge"));
        dm.slice(0, dm.indexOf("return ob1")).should.match(/isMergeableKey\(ob2, i\)/);
    });

    it("guards all five levels of getMergedEventData", function() {
        // the second sink: a hand-inlined nested merge, not named "merge" and not
        // recursive, so a grep for merge helpers alone does not find it
        var gme = fetchSrc.slice(fetchSrc.indexOf("fetch.getMergedEventData"));
        gme = gme.slice(0, gme.indexOf("meta = allEventData.map"));
        ["levelOne", "levelTwo", "levelThree", "levelFour", "levelFive"].forEach(function(level) {
            gme.should.match(new RegExp("isMergeableKey\\([^)]*, " + level + "\\)"));
        });
    });

    it("guards the meta reduce, where a prototype key would throw rather than pollute", function() {
        var reduce = fetchSrc.slice(fetchSrc.indexOf("meta = allEventData.map"));
        reduce.slice(0, 400).should.match(/isMergeableKey\(x, key\)/);
    });
});

describe("getMergedObj walks stored days without reaching a prototype", function() {
    var fetchSrc = fs.readFileSync(path.join(__dirname, "../../api/parts/data/fetch.js"), "utf8");

    it("guards the day loop and the segmentation-value loop", function() {
        // the third sink: same file as deepMerge, not named like a merge, and the
        // existing "if (!target[key])" guards cannot help because a prototype is truthy
        fetchSrc.should.match(/isMergeableKey\(dataObjects\[i\]\.d, day\)/);
        fetchSrc.should.match(/isMergeableKey\(dataObjects\[i\]\.d\[day\], prop\)/);
        fetchSrc.should.match(/isMergeableKey\(dataObjects\[i\]\.d\[day\]\[prop\], secondLevel\)/);
    });

    it("guards the meta merges that read the accumulator back", function() {
        fetchSrc.should.match(/isMergeableKey\(dataObjects\[i\]\.meta, metaEl\)/);
        fetchSrc.should.match(/isMergeableKey\(mergedDataObj\.meta, i\)/);
    });
});
