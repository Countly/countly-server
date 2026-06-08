var should = require("should");
var rights = require("../../api/utils/rights.js");

// getBaseAppFilter() builds the app-scoping filter applied to events_data /
// drill_events reads and exports in the dbviewer plugin. getUserApps() returns
// an empty array both for a global admin (meaning "all apps") and for a
// non-global member with no app access — these two must produce different
// filters: the admin sees everything, the no-access member must see nothing.
describe("rights.getBaseAppFilter", function() {
    var globalAdmin = { global_admin: true };
    var noAppMember = { global_admin: false, permission: { _: { a: [], u: [] } } };
    var scopedMember = { global_admin: false, permission: { _: { a: ["aaaaaaaaaaaaaaaaaaaaaaaa"], u: [] } } };

    describe("events_data", function() {
        it("returns an empty (all-access) filter for a global admin", function() {
            var f = rights.getBaseAppFilter(globalAdmin, "countly", "events_data");
            Object.keys(f).length.should.equal(0);
        });
        it("scopes a member to their own apps", function() {
            var f = rights.getBaseAppFilter(scopedMember, "countly", "events_data");
            f.should.have.property("_id");
            f._id.should.have.property("$in");
            f._id.$in.length.should.equal(1);
        });
        it("denies a non-global member with no app access (match nothing)", function() {
            var f = rights.getBaseAppFilter(noAppMember, "countly", "events_data");
            f.should.have.property("_id");
            f._id.should.have.property("$in");
            f._id.$in.length.should.equal(0);
        });
    });

    describe("drill_events", function() {
        it("returns an empty (all-access) filter for a global admin", function() {
            var f = rights.getBaseAppFilter(globalAdmin, "countly_drill", "drill_events");
            Object.keys(f).length.should.equal(0);
        });
        it("scopes a member to their own apps", function() {
            var f = rights.getBaseAppFilter(scopedMember, "countly_drill", "drill_events");
            f.should.have.property("a");
            f.a.$in.length.should.equal(1);
        });
        it("denies a non-global member with no app access (match nothing)", function() {
            var f = rights.getBaseAppFilter(noAppMember, "countly_drill", "drill_events");
            f.should.have.property("a");
            f.a.$in.length.should.equal(0);
        });
    });
});
