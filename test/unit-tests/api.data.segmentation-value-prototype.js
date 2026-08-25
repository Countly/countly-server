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
    it("events.js mergeEvents guards its outer key, hasOwnProperty not being enough", function() {
        // hasOwnProperty is TRUE for a stored document's own "__proto__", so it lets the
        // key through; firstObj[firstLevel] is then Object.prototype, which is truthy, so
        // the "if (!firstObj[firstLevel])" branch does not fire either and both writes
        // below land on the prototype. Confirmed by lifting the function and merging such
        // a document: before the guard Object.prototype gained the field, after it did
        // not and the legitimate segment still summed.
        var src = fs.readFileSync(path.join(__dirname, "../../api/parts/data/events.js"), "utf8");
        var fn = src.slice(src.indexOf("function mergeEvents"));
        fn = fn.slice(0, fn.indexOf("\n}"));
        fn.should.match(/isForbiddenFieldName\(firstLevel\)/);
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

describe("common.fixEventKey keeps a prototype member name out of the stored path", function() {
    // the returned key becomes d.<day>.<key>.<metric> on the totals document and part of
    // the per-event collection hash, so it is a field-name position like a segmentation
    // value. Guarding only the read-side merge would leave every new write re-poisoning
    // the document it lands in.
    it("prefixes the three prototype member names", function() {
        common.fixEventKey("__proto__").should.equal("[CLY]__proto__");
        common.fixEventKey("constructor").should.equal("[CLY]constructor");
        common.fixEventKey("prototype").should.equal("[CLY]prototype");
    });
    it("leaves an ordinary event key untouched", function() {
        common.fixEventKey("Purchase").should.equal("Purchase");
        common.fixEventKey("[CLY]_session").should.equal("[CLY]_session");
    });
    it("still strips the characters it stripped before, and still rejects a long key", function() {
        common.fixEventKey("system.Purchase").should.equal("Purchase");
        common.fixEventKey(new Array(140).join("a")).should.equal(false);
    });
});

describe("common.mergeQuery refuses a prototype member name in every operator", function() {
    // The payloads are parsed rather than written as literals on purpose. In an object
    // literal, "__proto__": x is the prototype-setting form and creates no own key at
    // all, so a literal-built test passes whether or not the guard exists. JSON.parse
    // and the BSON decoder both produce a real own enumerable "__proto__" - which is
    // what an update assembled from a request or read back from a document looks like.
    var poisoned = function(json) {
        var ob = JSON.parse(json);
        Object.keys(ob).forEach(function(op) {
            Object.prototype.hasOwnProperty.call(ob[op], "__proto__")
                .should.equal(true, "payload must carry an own __proto__ to be a test at all");
        });
        return ob;
    };

    afterEach(function() {
        ["pwn", "$each"].forEach(function(k) {
            delete Object.prototype[k];
        });
    });

    it("does not throw when $addToSet carries __proto__", function() {
        // ob1.$addToSet.__proto__ resolves to Object.prototype, which is an object, so
        // the "create as object if it is single value" initializer is skipped and the
        // .$each.indexOf below threw on undefined. Verified against the unguarded loop:
        // TypeError: Cannot read properties of undefined (reading 'indexOf').
        var ob1 = {$addToSet: {tags: {$each: ["a"]}}};
        var thrown = null;
        try {
            common.mergeQuery(ob1, poisoned('{"$addToSet":{"__proto__":{"$each":["b"]}}}'));
        }
        catch (e) {
            thrown = e;
        }
        (thrown === null).should.equal(true, "mergeQuery threw: " + (thrown && thrown.message));
        // not should.not.have.property: every object "has" __proto__ through the chain
        Object.prototype.hasOwnProperty.call(ob1.$addToSet, "__proto__").should.equal(false);
        ob1.$addToSet.tags.$each.should.eql(["a"]);
        Object.prototype.should.not.have.property("$each");
    });

    it("drops a prototype member name from $set, $inc and $max alike", function() {
        var ob1 = {$set: {a: 1}, $inc: {b: 1}, $max: {c: 1}};
        common.mergeQuery(ob1, poisoned('{"$set":{"__proto__":{"pwn":1},"a":2},' +
            '"$inc":{"__proto__":5,"b":2},"$max":{"__proto__":9,"c":3}}'));
        ob1.$set.should.eql({a: 2});
        ob1.$inc.should.eql({b: 3});
        ob1.$max.should.eql({c: 3});
        ({}).should.not.have.property("pwn");
    });

    it("drops constructor too, which reaches the Object function rather than its prototype", function() {
        var ob1 = {$inc: {b: 1}};
        common.mergeQuery(ob1, JSON.parse('{"$inc":{"constructor":5,"b":2}}'));
        ob1.$inc.should.eql({b: 3});
        Object.should.not.have.property("constructor_polluted");
        (typeof ({}).constructor).should.equal("function");
    });

    it("drops it at the top level too, where it would replace the whole update", function() {
        var ob1 = {$set: {a: 1}};
        common.mergeQuery(ob1, JSON.parse('{"__proto__":{"pwn":1}}'));
        Object.getPrototypeOf(ob1).should.equal(Object.prototype);
        ({}).should.not.have.property("pwn");
    });

    it("still merges ordinary operators", function() {
        var ob1 = {$set: {a: 1}, $addToSet: {tags: {$each: ["a"]}}, $push: {log: {$each: [1]}}};
        common.mergeQuery(ob1, {
            $set: {b: 2},
            $addToSet: {tags: {$each: ["a", "b"]}},
            $push: {log: {$each: [2]}},
            $inc: {n: 4}
        });
        ob1.$set.should.eql({a: 1, b: 2});
        ob1.$addToSet.tags.$each.should.eql(["a", "b"]);
        ob1.$push.log.$each.should.eql([1, 2]);
        ob1.$inc.should.eql({n: 4});
    });

    it("skips keys inherited by the source rather than owned by it", function() {
        var source = Object.create({$set: {leaked: 1}});
        source.$inc = {n: 1};
        var ob1 = {$inc: {n: 1}};
        common.mergeQuery(ob1, source);
        ob1.should.not.have.property("$set");
        ob1.$inc.should.eql({n: 2});
    });
});
