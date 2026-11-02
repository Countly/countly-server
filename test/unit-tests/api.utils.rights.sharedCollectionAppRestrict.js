var should = require("should");
var rights = require("../../api/utils/rights.js");

// The collections every app shares (events_data, drill_events) are scoped to the
// apps a member reads them through. An app whose DB Viewer the member's
// app_restrict closes ("#/manage/db") is left out of the DB Viewer's scope, as
// dbUserHasAccessToCollection leaves it out for the per-app collections; another
// feature that reads drill_events (drill, users) still counts on it.
describe("shared collections and app_restrict", function() {
    var A = "aaaaaaaaaaaaaaaaaaaaaaa1";
    var B = "aaaaaaaaaaaaaaaaaaaaaaa2";

    /**
     * Member with read rights per app.
     * @param {object} featuresByApp - app id to feature names
     * @param {object=} appRestrict - app_restrict
     * @returns {object} member
     */
    function member(featuresByApp, appRestrict) {
        var apps = Object.keys(featuresByApp);
        var m = {_id: "m", permission: {_: {a: [], u: [apps]}, c: {}, r: {}, u: {}, d: {}}};
        apps.forEach(function(app) {
            m.permission.r[app] = {all: false, allowed: {}};
            featuresByApp[app].forEach(function(f) {
                m.permission.r[app].allowed[f] = true;
            });
        });
        if (appRestrict) {
            m.app_restrict = appRestrict;
        }
        return m;
    }

    var restricted = member({[A]: ["dbviewer"], [B]: ["dbviewer"]}, {[B]: ["#/manage/db"]});
    var restrictedWithDrill = member({[A]: ["dbviewer"], [B]: ["dbviewer", "drill"]}, {[B]: ["#/manage/db"]});
    var otherRestriction = member({[A]: ["dbviewer"], [B]: ["dbviewer"]}, {[B]: ["#/crashes"]});

    describe("getSharedCollectionApps", function() {
        it("leaves out an app whose DB Viewer app_restrict closes", function() {
            rights.getSharedCollectionApps(restricted, "dbviewer").should.eql([A]);
            rights.getSharedCollectionApps(restricted, ["dbviewer", "drill", "users"]).should.eql([A]);
        });
        it("keeps that app through another feature that reads the collection", function() {
            rights.getSharedCollectionApps(restrictedWithDrill, "dbviewer").should.eql([A]);
            rights.getSharedCollectionApps(restrictedWithDrill, ["dbviewer", "drill", "users"]).sort().should.eql([A, B]);
        });
        it("ignores restrictions of other pages", function() {
            rights.getSharedCollectionApps(otherRestriction, "dbviewer").should.eql([A, B]);
        });
        it("answers as before for a member without app_restrict", function() {
            var plain = member({[A]: ["dbviewer"], [B]: ["drill"]});
            rights.getSharedCollectionApps(plain, "dbviewer").should.eql(rights.getUserAppsWithReadRight(plain, "dbviewer"));
            rights.getSharedCollectionApps(plain, ["dbviewer", "drill"]).sort().should.eql([A, B]);
        });
    });

    describe("getBaseAppFilter", function() {
        it("scopes DB Viewer reads of events_data to the apps app_restrict leaves open", function() {
            var f = rights.getBaseAppFilter(restricted, "countly", "events_data", "dbviewer");
            f._id.$in.map(String).should.eql([String(new RegExp("^" + A + "_.*"))]);
        });
        it("scopes DB Viewer reads of drill_events to the apps app_restrict leaves open", function() {
            rights.getBaseAppFilter(restricted, "countly_drill", "drill_events", "dbviewer").should.eql({a: {$in: [A]}});
        });
        it("matches nothing when app_restrict closes the DB Viewer on every app with the right", function() {
            var closed = member({[A]: ["dbviewer"]}, {[A]: ["#/manage/db"]});
            rights.getBaseAppFilter(closed, "countly_drill", "drill_events", "dbviewer").should.eql({a: {$in: []}});
            rights.getBaseAppFilter(closed, "countly", "events_data", "dbviewer").should.eql({_id: {$in: []}});
        });
    });

    describe("getExportAppFilter", function() {
        it("scopes an events_data export to the apps app_restrict leaves open", function() {
            var f = rights.getExportAppFilter(restricted, "countly", "events_data");
            f._id.$in.map(String).should.eql([String(new RegExp("^" + A + "_.*"))]);
        });
        it("keeps drill_events of an app read through the drill right", function() {
            var f = rights.getExportAppFilter(restrictedWithDrill, "countly_drill", "drill_events");
            f.a.$in.sort().should.eql([A, B]);
        });
        it("leaves a global admin unscoped", function() {
            should(rights.getExportAppFilter({global_admin: true, app_restrict: {[A]: ["#/manage/db"]}}, "countly", "events_data")).equal(null);
        });
    });
});
