require("should");
var rights = require("../../api/utils/rights.js");

// hasAdminAccess used to start from "true" and only clear when an entry for the app
// existed with `all` falsy. An app the member had no entry for never cleared it, so
// every unlisted app came back as one they administer, and every right that falls
// through to it (create/read/update/delete) passed for apps nobody had granted.
//
// The two halves matter equally. Access that was actually granted has to survive, or
// members lose apps they legitimately hold; access that was never expressed has to be
// refused, which is the bug itself.
describe("rights.hasAdminAccess", function() {
    describe("access that was explicitly granted, which must survive", function() {
        it("allows an app listed in the app-admin list", function() {
            // this is what the UI writes when somebody is made an app admin
            var member = {permission: {_: {a: ["appA"]}, c: {}, r: {}, u: {}, d: {}}};
            rights.hasAdminAccess(member, "appA").should.equal(true);
        });
        it("allows an app carrying all:true across all four operations", function() {
            var member = {
                permission: {
                    _: {a: []},
                    c: {appA: {all: true}},
                    r: {appA: {all: true}},
                    u: {appA: {all: true}},
                    d: {appA: {all: true}}
                }
            };
            rights.hasAdminAccess(member, "appA").should.equal(true);
        });
        it("allows a legacy member their admin_of app", function() {
            rights.hasAdminAccess({admin_of: ["appA"], user_of: ["appA"]}, "appA").should.equal(true);
        });
        it("allows a global admin any app", function() {
            rights.hasAdminAccess({global_admin: true}, "whatever").should.equal(true);
        });
    });

    describe("access that was never granted, which must be refused", function() {
        it("refuses an app the member has no entry for", function() {
            // the bug: this returned true, making every unlisted app an admin app
            var member = {permission: {_: {a: []}, c: {}, r: {}, u: {}, d: {}}};
            Boolean(rights.hasAdminAccess(member, "appB")).should.equal(false);
        });
        it("refuses an app granted for only some of the four operations", function() {
            // read-all on an app is not the same as administering it
            var member = {permission: {_: {a: []}, c: {}, r: {appA: {all: true}}, u: {}, d: {}}};
            Boolean(rights.hasAdminAccess(member, "appA")).should.equal(false);
        });
        it("refuses an app whose grants are feature-scoped rather than all", function() {
            var member = {
                permission: {
                    _: {a: []},
                    c: {appA: {all: false, allowed: {alerts: true}}},
                    r: {appA: {all: false, allowed: {alerts: true}}},
                    u: {appA: {all: false, allowed: {alerts: true}}},
                    d: {appA: {all: false, allowed: {alerts: true}}}
                }
            };
            Boolean(rights.hasAdminAccess(member, "appA")).should.equal(false);
        });
        it("refuses a legacy member an app they are only user_of", function() {
            Boolean(rights.hasAdminAccess({admin_of: [], user_of: ["appA"]}, "appA")).should.equal(false);
        });
    });

    // The reason this matters beyond hasAdminAccess itself: the per-feature right
    // helpers fall through to it, so the fail-open silently granted every feature on
    // every unlisted app. Those are what the cross-app authorization fixes are built
    // on, and they were inert on this branch until this was corrected.
    describe("the per-feature rights that fall through to it", function() {
        var member = {
            permission: {
                _: {a: [], u: [["appA"]]},
                c: {appA: {all: false, allowed: {alerts: true}}},
                r: {appA: {all: false, allowed: {alerts: true}}},
                u: {appA: {all: false, allowed: {alerts: true}}},
                d: {}
            }
        };
        it("keeps the right on the app the member holds it for", function() {
            Boolean(rights.hasUpdateRight("alerts", "appA", member)).should.equal(true);
            Boolean(rights.hasReadRight("alerts", "appA", member)).should.equal(true);
            Boolean(rights.hasCreateRight("alerts", "appA", member)).should.equal(true);
        });
        it("refuses the right on an app the member holds nothing for", function() {
            Boolean(rights.hasUpdateRight("alerts", "appB", member)).should.equal(false);
            Boolean(rights.hasReadRight("alerts", "appB", member)).should.equal(false);
            Boolean(rights.hasCreateRight("alerts", "appB", member)).should.equal(false);
        });
        it("refuses a feature the member was not granted on an app they do hold", function() {
            Boolean(rights.hasUpdateRight("dbviewer", "appA", member)).should.equal(false);
        });
    });
});
