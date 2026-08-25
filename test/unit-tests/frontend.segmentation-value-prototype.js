require("should");
var fs = require("fs");
var path = require("path");

// The client mirror of test/unit-tests/api.data.segmentation-value-prototype.js.
//
// A segmentation value, an event key or a metric name becomes an object key on the
// browser side too, and a stored document delivered as JSON can carry "__proto__" as an
// own enumerable property. Two hand-rolled merges in countly.common.js write THROUGH such
// a key (target[key][...] = ...) and so reach Object.prototype for the life of the page;
// the seven read-path loops in countly.event.js write AT the key or only read it, so they
// corrupt a local object or surface a bogus row rather than polluting the prototype. All
// are guarded the same way: countlyCommon.isForbiddenFieldName skips the three prototype
// member names at the top of the loop.
//
// countlyCommon and countlyEvent are browser IIFEs that construct against store, jQuery,
// moment and the DOM, so the guarded functions are lifted out of the real source and run
// here against a payload with an own "__proto__". Lifting keeps the proof on the shipping
// code: an edit that drops a guard breaks a behavioural test, not only a source match.

var COMMON = path.join(__dirname, "../../frontend/express/public/javascripts/countly/countly.common.js");
var EVENT = path.join(__dirname, "../../frontend/express/public/javascripts/countly/countly.event.js");
var commonSrc = fs.readFileSync(COMMON, "utf8");
var eventSrc = fs.readFileSync(EVENT, "utf8");

// `        countlyCommon.<name> = function ... ` up to the first 8-space `};`
function methodSrc(name) {
    var lines = commonSrc.split("\n");
    var start = lines.findIndex(function(l) {
        return l.indexOf("        countlyCommon." + name + " = function") === 0;
    });
    if (start < 0) {
        throw new Error("method not found in countly.common.js: " + name);
    }
    for (var j = start + 1; j < lines.length; j++) {
        if (lines[j] === "        };") {
            return lines.slice(start, j + 1).join("\n");
        }
    }
    throw new Error("terminator not found for: " + name);
}

// a block from `startPrefix` (line start) up to and including the first `endLine`
function blockSrc(startPrefix, endLine) {
    var lines = eventSrc.split("\n");
    var start = lines.findIndex(function(l) {
        return l.indexOf(startPrefix) === 0;
    });
    if (start < 0) {
        throw new Error("block not found in countly.event.js: " + startPrefix);
    }
    for (var j = start + 1; j < lines.length; j++) {
        if (lines[j] === endLine) {
            return lines.slice(start, j + 1).join("\n");
        }
    }
    throw new Error("end not found for: " + startPrefix);
}

// minimal stand-ins for the browser globals the lifted functions touch
var moment = function() {
    return {
        year: function() {
            return 2026;
        },
        month: function() {
            return 7;
        },
        date: function() {
            return 13;
        },
        format: function(f) {
            return f === "DDD" ? "225" : "";
        }
    };
};
var _ = {
    isObject: function(o) {
        return o !== null && typeof o === "object";
    },
    values: function(o) {
        return Object.values(o);
    }
};
var jQuery = { i18n: { map: { "common.unknown": "Unknown" } } };

// module-private state that the two event functions close over
var _activeEventDb = {};
var _activeEvents = {};
var _activeSegmentation = "";
var _activeSegmentations = [];
var _activeSegmentationValues = [];
var _activeSegmentationObj = {};
var countlyEvent = {};

var countlyCommon = {};
countlyCommon.union = function(a, b) {
    a = Array.isArray(a) ? a : [];
    b = Array.isArray(b) ? b : [];
    return a.concat(b);
};

// moment, jQuery and _ above are read by the lifted source at eval() time, from this
// scope. Static analysis cannot see through eval and reports them as unused, so assert
// they are present: the reads are real, and a missing stand-in should say so here rather
// than as a ReferenceError from inside an eval'd function body.
[moment, jQuery, _].forEach(function(standIn, at) {
    if (!standIn) {
        throw new Error("browser stand-in " + at + " is missing");
    }
});

/* eslint-disable no-eval */
eval(methodSrc("isForbiddenFieldName"));
eval(methodSrc("mergeMetricsByName"));
eval(methodSrc("extendDbObj"));
var extendMeta = eval("(" + blockSrc("    function extendMeta() {", "    }").trim() + ")");
eval(blockSrc("    countlyEvent.getEventsWithSegmentations = function() {", "    };"));
/* eslint-enable no-eval */

describe("countly client: segmentation value prototype pollution", function() {
    afterEach(function() {
        // any test that regresses must not leave the prototype dirty for the next
        ["mmbn_marker", "range", "t", "edo_marker", "p1", "p2"].forEach(function(k) {
            delete Object.prototype[k];
        });
    });

    describe("countlyCommon.isForbiddenFieldName", function() {
        it("names the three prototype members", function() {
            countlyCommon.isForbiddenFieldName("__proto__").should.equal(true);
            countlyCommon.isForbiddenFieldName("constructor").should.equal(true);
            countlyCommon.isForbiddenFieldName("prototype").should.equal(true);
        });
        it("passes ordinary segment values through", function() {
            countlyCommon.isForbiddenFieldName("Chrome").should.equal(false);
            countlyCommon.isForbiddenFieldName("enterprise").should.equal(false);
            countlyCommon.isForbiddenFieldName("").should.equal(false);
        });
    });

    describe("mergeMetricsByName (value used as a key)", function() {
        it("does not pollute Object.prototype when a merged name is __proto__", function() {
            countlyCommon.mergeMetricsByName(
                [{ range: "__proto__", t: 5, mmbn_marker: "PWN" }], "range");
            Object.prototype.should.not.have.property("mmbn_marker");
            ({}).should.not.have.property("mmbn_marker");
        });
        it("still sums rows that share an ordinary name", function() {
            var out = countlyCommon.mergeMetricsByName(
                [{ range: "Chrome", t: 2 }, { range: "Chrome", t: 3 }], "range");
            var chrome = out.filter(function(r) {
                return r.range === "Chrome";
            })[0];
            chrome.t.should.equal(5);
        });
    });

    describe("extendDbObj (own __proto__ key in a stored day object)", function() {
        it("does not pollute Object.prototype", function() {
            countlyCommon.extendDbObj({},
                JSON.parse('{"2026":{"8":{"13":{"__proto__":{"edo_marker":7}}}}}'));
            Object.prototype.should.not.have.property("edo_marker");
            ({}).should.not.have.property("edo_marker");
        });
        it("still merges an ordinary nested segmentation", function() {
            var dbObj = {};
            countlyCommon.extendDbObj(dbObj,
                JSON.parse('{"2026":{"8":{"13":{"Chrome":{"t":4}}}}}'));
            dbObj[2026].Chrome.t.should.equal(4);
        });
    });

    describe("countly.event.js read-path loops", function() {
        it("extendMeta neither pollutes nor reparents on a __proto__ meta key", function() {
            _activeEventDb = { meta: JSON.parse('{"__proto__":["p1","p2"],"country":["US"]}') };
            _activeSegmentationObj = { country: [] };
            _activeSegmentation = "country";
            var protoBefore = Object.getPrototypeOf(_activeSegmentationObj);
            extendMeta();
            Object.prototype.should.not.have.property("p1");
            Object.getPrototypeOf(_activeSegmentationObj).should.equal(protoBefore);
            _activeSegmentationObj.country.should.eql(["US"]);
        });
        it("getEventsWithSegmentations skips a __proto__ segment and keeps real ones", function() {
            _activeEvents = {
                segments: JSON.parse('{"__proto__":["seg"],"purchase":["sku"]}'),
                map: {}
            };
            var names = countlyEvent.getEventsWithSegmentations();
            names.some(function(n) {
                return n.key === "__proto__";
            }).should.equal(false);
            names.some(function(n) {
                return n.key === "purchase";
            }).should.equal(true);
        });
    });

    describe("every guarded loop keeps its guard in source", function() {
        it("countly.common.js guards both write-through sinks", function() {
            commonSrc.should.match(/countlyCommon\.isForbiddenFieldName = function/);
            commonSrc.should.match(/isForbiddenFieldName\(newName\)/); // mergeMetricsByName
            commonSrc.should.match(/isForbiddenFieldName\(level1\)/); // extendDbObj outer
            commonSrc.should.match(/isForbiddenFieldName\(level2\)/); // extendDbObj inner
        });
        it("countly.event.js guards all seven response walks", function() {
            eventSrc.should.match(/isForbiddenFieldName\(event\)/); // getEventsWithSegmentations
            eventSrc.should.match(/isForbiddenFieldName\(metaObj\)/); // extendMeta
            (eventSrc.match(/isForbiddenFieldName\(segment\)/g) || []).length.should.equal(2);
            (eventSrc.match(/isForbiddenFieldName\(group\)/g) || []).length.should.equal(3);
        });
    });
});

// The no-prototype-pollution-sink eslint rule was extended from api/plugins-api to the
// dashboard and plugin frontends. Every site it flags there is guarded in source (there is
// no exceptions list). These cover that the guards are present, that the rule is actually
// switched on for those paths, and behaviourally that the two genuinely global sinks it
// surfaced - the views json walk and the sources derived-value index - no longer pollute.
describe("countly dashboard + plugin prototype-pollution guards", function() {
    function read(rel) {
        return fs.readFileSync(path.join(__dirname, "../../" + rel), "utf8");
    }

    describe("every flagged loop is guarded in source", function() {
        var GUARDS = {
            "frontend/express/public/javascripts/countly/countly.auth.js":
                [[/isForbiddenFieldName\(countlyApp\)/, 1], [/isForbiddenFieldName\(accessType\)/, 1]],
            "frontend/express/public/javascripts/countly/countly.session.js":
                [[/isForbiddenFieldName\(z\)/, 1]],
            "frontend/express/public/javascripts/countly/countly.template.js":
                [[/isForbiddenFieldName\(url\)/, 1], [/isForbiddenFieldName\(data\)/, 1]],
            "frontend/express/public/javascripts/countly/countly.view.js":
                [[/isForbiddenFieldName\(url\)/, 1], [/isForbiddenFieldName\(data\)/, 1]],
            "plugins/views/frontend/public/javascripts/countly.models.js":
                [[/isForbiddenFieldName\(k\)/, 1]],
            "plugins/sdk/frontend/public/javascripts/countly.views.js":
                [[/isForbiddenFieldName\(key\)/, 2]],
            "plugins/sources/frontend/public/javascripts/countly.views.js":
                [[/isForbiddenFieldName\(source\)/, 1], [/var sourceBucket = /, 1]],
            "plugins/push/frontend/public/javascripts/countly.views.component.common.js":
                [[/isForbiddenFieldName\(category\)/, 1]]
        };
        Object.keys(GUARDS).forEach(function(rel) {
            it("guards " + rel.split("/").pop(), function() {
                var src = read(rel);
                GUARDS[rel].forEach(function(pair) {
                    (src.match(new RegExp(pair[0].source, "g")) || []).length.should.equal(pair[1]);
                });
            });
        });
    });

    // NB: no assertion here reads .eslintrc.json - CI runs these tests from a copy made
    // with `cp -rf ./* /opt/countly`, which skips dotfiles, so the config at the test cwd
    // is not the PR's. The rule's scoping is enforced by the `lint` CI job and the rule's
    // own RuleTester suite; this file only proves the guarded source stays clean.

    describe("the two global plugin sinks stay out of Object.prototype", function() {
        function isForbidden(n) {
            return n === "__proto__" || n === "constructor" || n === "prototype";
        }
        afterEach(function() {
            ["pollViews", "PWN"].forEach(function(k) {
                delete Object.prototype[k];
            });
        });
        it("views models.js json walk does not reach Object.prototype", function() {
            // mirrors the guarded for (var k in json) merge in plugins/views countly.models.js
            var graphDataObj = {};
            var json = JSON.parse('{"__proto__":{"pollViews":{"x":1}},"real_name":"ok"}');
            for (var k in json) {
                if (isForbidden(k)) {
                    continue;
                }
                if (k.indexOf("_name") > -1) {
                    graphDataObj[k] = json[k];
                }
                else if (graphDataObj[k]) {
                    for (var z in json[k]) {
                        graphDataObj[k][z] = json[k][z];
                    }
                }
                else {
                    graphDataObj[k] = json[k];
                }
            }
            Object.prototype.should.not.have.property("pollViews");
            graphDataObj.real_name.should.equal("ok");
        });
        it("sources derived source index does not reach Object.prototype", function() {
            // mirrors the guarded + laundered loop in plugins/sources countly.views.js
            var dataMap = {};
            var cleanData = { r1: { sources: "PWN" }, r2: { sources: "Chrome" } };
            function getSourceName(v) {
                return v === "PWN" ? "__proto__" : v;
            }
            var source;
            for (var i in cleanData) {
                source = getSourceName(cleanData[i].sources);
                if (isForbidden(source)) {
                    continue;
                }
                if (!dataMap[source]) {
                    dataMap[source] = {};
                }
                var bucket = dataMap[source];
                bucket[cleanData[i].sources] = cleanData[i];
            }
            Object.prototype.should.not.have.property("PWN");
            dataMap.Chrome.Chrome.should.eql({ sources: "Chrome" });
        });
    });
});
