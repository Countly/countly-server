var should = require("should");
var common = require("../../api/utils/common.js");
var commonLib = require("../../plugins/alerts/api/parts/common-lib.js");
var sessionsModule = require("../../plugins/alerts/api/alertModules/sessions.js");
var usersModule = require("../../plugins/alerts/api/alertModules/users.js");
var revenueModule = require("../../plugins/alerts/api/alertModules/revenue.js");

// Session, user and revenue alerts read the `users` collection, which holds one
// document per app per month (split further by a device-id postfix). An alert
// must count only its own app's documents, never those of every app on the server.
describe("alerts: session and user metrics are read per app", function() {
    var APP_A = "5f0c0d0e0f1a2b3c4d5e6f01";
    var APP_B = "5f0c0d0e0f1a2b3c4d5e6f02";
    var DATE = new Date(Date.UTC(2026, 9, 15, 12, 0, 0));
    var MONTH = "2026:10";
    var docs = [
        {_id: APP_A + "_2026:10_a", m: MONTH, a: APP_A, d: {15: {t: 3, u: 2, n: 1, p: 1}}},
        {_id: APP_A + "_2026:10_b", m: MONTH, a: APP_A, d: {15: {t: 4, u: 3, n: 2, p: 1}}},
        {_id: APP_B + "_2026:10_a", m: MONTH, a: APP_B, d: {15: {t: 100, u: 50, n: 40, p: 30}}}
    ];
    var savedDb;
    var savedTrigger;
    var triggered;
    var queries;

    /**
     * Whether a document matches an equality-only filter.
     * @param {object} doc - document
     * @param {object} query - filter
     * @returns {boolean} true on a match
     */
    function matches(doc, query) {
        return Object.keys(query).every(function(key) {
            return doc[key] === query[key];
        });
    }

    before(function() {
        savedDb = common.db;
        savedTrigger = commonLib.trigger;
        common.db = {
            collection: function(name) {
                return {
                    find: function(query) {
                        queries.push({collection: name, query: query});
                        return {
                            toArray: function() {
                                return Promise.resolve(name === "users" ? docs.filter(function(doc) {
                                    return matches(doc, query);
                                }) : []);
                            }
                        };
                    }
                };
            }
        };
        commonLib.trigger = function(result) {
            triggered.push(result);
            return Promise.resolve();
        };
    });

    after(function() {
        common.db = savedDb;
        commonLib.trigger = savedTrigger;
    });

    beforeEach(function() {
        triggered = [];
        queries = [];
    });

    /**
     * Run an alert check that triggers on any positive value, and return the value it saw.
     * @param {object} mod - alert module
     * @param {string} subType - alertDataSubType
     * @returns {Promise<number|undefined>} metric value, undefined when not triggered
     */
    function valueSeenBy(mod, subType) {
        var alert = {_id: "alert1", alertDataSubType: subType, period: "daily", compareType: commonLib.COMPARE_TYPE_ENUM.MORE_THAN, compareValue: "0"};
        var app = {
            _id: {
                toString: function() {
                    return APP_A;
                }
            },
            timezone: "UTC"
        };
        return mod.check({alert: alert, app: app, done: function() {}, scheduledTo: DATE}).then(function() {
            return triggered.length ? triggered[0].metricValue : undefined;
        });
    }

    it("counts only the alert app's sessions", function() {
        return valueSeenBy(sessionsModule, "# of sessions").then(function(value) {
            should(value).equal(7);
            queries.forEach(function(q) {
                q.query.should.have.property("a", APP_A);
            });
        });
    });

    it("averages session duration over the alert app's sessions only", function() {
        docs[0].d[15].d = 7 * 60;
        docs[2].d[15].d = 10000 * 60;
        return valueSeenBy(sessionsModule, "average session duration").then(function(value) {
            delete docs[0].d[15].d;
            delete docs[2].d[15].d;
            should(value).equal(1);
        });
    });

    it("counts only the alert app's users", function() {
        return valueSeenBy(usersModule, "# of users").then(function(value) {
            should(value).equal(5);
        });
    });

    it("counts only the alert app's new users", function() {
        return valueSeenBy(usersModule, "# of new users").then(function(value) {
            should(value).equal(3);
        });
    });

    it("scopes the shared user metric reader that revenue alerts reuse", function() {
        return usersModule.getUserMetricByDate({_id: APP_A, timezone: "UTC"}, "p", DATE, "daily").then(function(value) {
            should(value).equal(2);
            queries.length.should.equal(1);
            queries[0].query.should.eql({m: MONTH, a: APP_A});
        });
    });

    it("counts only the alert app's paying users in a revenue alert", function() {
        return valueSeenBy(revenueModule, "# of paying users").then(function(value) {
            should(value).equal(2);
        });
    });
});
