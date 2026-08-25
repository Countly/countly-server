require("should");
var authz = require("../../plugins/alerts/api/parts/app-authorization.js");
var rights = require("../../api/utils/rights.js");

// These decide whether a member may act on the apps an alert targets. Both directions
// matter equally: too permissive and an alert for a revoked app stays editable and keeps
// being delivered, too strict and members lose the ability to manage alerts they own.
//
// The legacy cases are the ones worth having tests for. Members created before the
// permission object reach apps through user_of, and the right helpers fall through to
// admin_of alone, so a strict reading would judge them unauthorized and both stop their
// alerts and lock them out of their own configuration.
describe("alerts app authorization", function() {
    var modernMember = {
        _id: "m1",
        permission: {
            _: {a: [], u: [["appA"]]},
            c: {appA: {all: false, allowed: {alerts: true}}},
            r: {appA: {all: false, allowed: {alerts: true}}},
            u: {appA: {all: false, allowed: {alerts: true}}},
            d: {}
        }
    };
    var legacyMember = {_id: "m2", user_of: ["appL"], admin_of: []};
    var legacyAdminMember = {_id: "m3", user_of: ["appL2"], admin_of: ["appL2"]};
    var globalAdmin = {_id: "m4", global_admin: true};

    describe("legacyApps", function() {
        it("returns nothing for a member with a permission object", function() {
            authz.legacyApps(modernMember).should.eql([]);
        });
        it("returns user_of for a member without one", function() {
            authz.legacyApps(legacyMember).should.eql(["appL"]);
        });
        it("tolerates a member with neither", function() {
            authz.legacyApps({_id: "x"}).should.eql([]);
            authz.legacyApps(null).should.eql([]);
        });
        it("stringifies ids, since they may be stored as ObjectIds", function() {
            var oid = {
                toString: function() {
                    return "appZ";
                }
            };
            authz.legacyApps({user_of: [oid]}).should.eql(["appZ"]);
        });
    });

    describe("memberHasRightForAllApps", function() {
        it("allows an app the member holds the right on", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, ["appA"]).should.equal(true);
        });
        it("refuses an app the member does not", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, ["appB"]).should.equal(false);
        });
        it("requires every app, not just one of them", function() {
            // an alert targeting two apps is only editable by someone who may touch both
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, ["appA", "appB"]).should.equal(false);
        });
        it("allows a legacy member their user_of app", function() {
            // without this a legacy member could not edit an alert they own
            authz.memberHasRightForAllApps(rights.hasUpdateRight, legacyMember, ["appL"]).should.equal(true);
        });
        it("refuses a legacy member an app outside user_of", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, legacyMember, ["appOther"]).should.equal(false);
        });
        it("allows a legacy admin_of member", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, legacyAdminMember, ["appL2"]).should.equal(true);
        });
        it("allows a global admin anything", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, globalAdmin, ["anything", "else"]).should.equal(true);
        });
        it("refuses an empty or missing target list", function() {
            // an alert that targets nothing is not something to wave through
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, []).should.equal(false);
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, undefined).should.equal(false);
            authz.memberHasRightForAllApps(rights.hasUpdateRight, modernMember, null).should.equal(false);
        });
        it("refuses a missing member", function() {
            authz.memberHasRightForAllApps(rights.hasUpdateRight, null, ["appA"]).should.equal(false);
        });
        it("distinguishes the rights, so read access does not grant update", function() {
            var readOnly = {
                _id: "m5",
                permission: {_: {a: [], u: [["appR"]]}, c: {}, r: {appR: {all: false, allowed: {alerts: true}}}, u: {}, d: {}}
            };
            authz.memberHasRightForAllApps(rights.hasReadRight, readOnly, ["appR"]).should.equal(true);
            authz.memberHasRightForAllApps(rights.hasUpdateRight, readOnly, ["appR"]).should.equal(false);
        });
    });

    describe("memberMayReadApp", function() {
        it("allows the app a member can read", function() {
            authz.memberMayReadApp(rights.hasReadRight, modernMember, "appA").should.equal(true);
        });
        it("refuses an app the member cannot read", function() {
            authz.memberMayReadApp(rights.hasReadRight, modernMember, "appB").should.equal(false);
        });
        it("allows a legacy member their user_of app, so their alerts keep arriving", function() {
            authz.memberMayReadApp(rights.hasReadRight, legacyMember, "appL").should.equal(true);
        });
        it("allows a global admin", function() {
            authz.memberMayReadApp(rights.hasReadRight, globalAdmin, "whatever").should.equal(true);
        });
        it("refuses a missing member, which is how a deleted owner looks", function() {
            authz.memberMayReadApp(rights.hasReadRight, null, "appA").should.equal(false);
        });
    });
});
