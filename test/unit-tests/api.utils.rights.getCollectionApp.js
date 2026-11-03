var should = require("should");
var crypto = require("crypto");
var common = require("../../api/utils/common.js");
var rights = require("../../api/utils/rights.js");

// getCollectionApp() names the app whose data a collection holds, so that a DB Viewer
// task is filed under that app rather than the app selected in the dashboard. Per-app
// collections end with the app id; event and view collections are mapped by the events
// data; the collections all apps share and the global ones belong to no app.
describe("rights.getCollectionApp", function() {
    var APP = "5f0c0d0e0f1a2b3c4d5e6f91";
    var savedDb;

    /**
     * sha1 hex digest
     * @param {string} value - input
     * @returns {string} digest
     */
    function sha1(value) {
        return crypto.createHash("sha1").update(value).digest("hex");
    }

    before(function(done) {
        savedDb = common.db;
        common.db = {
            collection: function(name) {
                return {
                    find: function() {
                        return {
                            toArray: function(cb) {
                                cb(null, name === "events" ? [{_id: APP, list: ["purchase"]}] : []);
                            }
                        };
                    }
                };
            },
            ObjectID: function(id) {
                return id;
            }
        };
        rights.dbLoadEventsData({member: {}}, [{_id: APP, name: "app"}], function() {
            done();
        });
    });

    after(function() {
        common.db = savedDb;
    });

    it("reads the app id a per-app collection ends with", function() {
        rights.getCollectionApp("app_users" + APP).should.equal(APP);
        rights.getCollectionApp("metric_changes" + APP).should.equal(APP);
        rights.getCollectionApp("app_users" + APP.toUpperCase()).should.equal(APP);
    });

    it("maps an event collection to its app", function() {
        rights.getCollectionApp("events" + sha1("purchase" + APP)).should.equal(APP);
        rights.getCollectionApp("drill_events" + sha1("purchase" + APP)).should.equal(APP);
    });

    it("maps a view collection to its app", function() {
        rights.getCollectionApp("app_viewdata" + sha1(APP)).should.equal(APP);
    });

    it("never reads an event hash as an app id", function() {
        should(rights.getCollectionApp("events" + sha1("unknown" + APP))).equal(null);
    });

    it("gives no app to the collections all apps share", function() {
        should(rights.getCollectionApp("events_data")).equal(null);
        should(rights.getCollectionApp("drill_events")).equal(null);
    });

    it("gives no app to global collections", function() {
        should(rights.getCollectionApp("members")).equal(null);
        should(rights.getCollectionApp("apps")).equal(null);
        should(rights.getCollectionApp("events")).equal(null);
        should(rights.getCollectionApp("long_tasks")).equal(null);
    });
});
