require("should");
var common = require("../../api/utils/common.js");
var sessions = require("../../plugins/alerts/api/alertModules/sessions.js");
var users = require("../../plugins/alerts/api/alertModules/users.js");

// The session and user alerts read the monthly documents of the shared "users" collection.
// Every app writes its own documents there (a = app id, m = "YYYY:M"), so the alert value
// must come from the alert's app only, not from every app that has data for that month.
describe("alerts session and user metrics are read per app", function() {
    var originalDb;
    var appA = {_id: {toString: () => "app_a"}, timezone: "UTC"};
    var date = new Date(Date.UTC(2026, 9, 15, 10, 30));
    var docs = [
        {_id: "app_a_2026:10_1", a: "app_a", m: "2026:10", d: {15: {t: 3, d: 30, u: 2, 10: {t: 1, u: 1}}}},
        {_id: "app_b_2026:10_1", a: "app_b", m: "2026:10", d: {15: {t: 100, d: 9000, u: 50, 10: {t: 40, u: 20}}}}
    ];
    var queries = [];

    /**
     * Minimal equality matcher, enough for the flat queries these helpers send
     * @param {object} doc - document
     * @param {object} query - query
     * @returns {boolean} true if every query field equals the document's
     */
    function matches(doc, query) {
        return Object.keys(query).every(function(key) {
            return doc[key] === query[key];
        });
    }

    before(function() {
        originalDb = common.db;
        common.db = {
            collection: function(name) {
                name.should.equal("users");
                return {
                    find: function(query) {
                        queries.push(query);
                        return {
                            toArray: function() {
                                return Promise.resolve(docs.filter(function(doc) {
                                    return matches(doc, query);
                                }));
                            }
                        };
                    }
                };
            }
        };
    });

    after(function() {
        common.db = originalDb;
    });

    beforeEach(function() {
        queries = [];
    });

    it("counts only the alert app's sessions", async function() {
        (await sessions.getSessionMetricByDate(appA, "t", date, "daily")).should.equal(3);
        (await sessions.getSessionMetricByDate(appA, "d", date, "monthly")).should.equal(30);
        (await sessions.getSessionMetricByDate(appA, "t", date, "hourly")).should.equal(1);
        queries.forEach(function(query) {
            query.should.have.property("a", "app_a");
        });
    });

    it("counts only the alert app's users", async function() {
        (await users.getUserMetricByDate(appA, "u", date, "daily")).should.equal(2);
        (await users.getUserMetricByDate(appA, "u", date, "hourly")).should.equal(1);
        queries.forEach(function(query) {
            query.should.have.property("a", "app_a");
        });
    });

    it("returns nothing for an app without data that month", async function() {
        var appC = {_id: {toString: () => "app_c"}, timezone: "UTC"};
        (typeof await sessions.getSessionMetricByDate(appC, "t", date, "daily")).should.equal("undefined");
        (typeof await users.getUserMetricByDate(appC, "u", date, "daily")).should.equal("undefined");
    });
});
