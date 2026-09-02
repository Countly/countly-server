require("should");
var rights = require("../../api/utils/rights.js");

var APP_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
var APP_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

/**
* Build a permission object of the shape the permission editor and the token manager produce.
* @param {object} spec - {adminApps, userApps, grants:[{type, app, all, allowed}]}
* @returns {object} permission object
*/
function permission(spec) {
    var perm = {_: {a: spec.adminApps || [], u: [spec.userApps || []]}, c: {}, r: {}, u: {}, d: {}};
    (spec.grants || []).forEach(function(grant) {
        perm[grant.type][grant.app] = grant.all ? {all: true, allowed: {}} : {all: false, allowed: grant.allowed};
    });
    return perm;
}

var globalAdmin = {global_admin: true};

//can create+read core on A, read core and events on A, read core on B
var member = {
    global_admin: false,
    permission: permission({
        userApps: [APP_A, APP_B],
        grants: [
            {type: "c", app: APP_A, allowed: {core: true}},
            {type: "r", app: APP_A, allowed: {core: true, events: true}},
            {type: "r", app: APP_B, allowed: {core: true}}
        ]
    })
};

var adminOfA = {global_admin: false, permission: permission({adminApps: [APP_A]})};

var readCoreOnA = permission({userApps: [APP_A], grants: [{type: "r", app: APP_A, allowed: {core: true}}]});

describe("token permissions", function() {
    describe("isPermissionSubset", function() {
        it("allows a grant the ceiling holds", function() {
            rights.isPermissionSubset(readCoreOnA, member).should.equal(true);
        });

        it("refuses a grant on an app the ceiling cannot reach", function() {
            //the escalation this model exists to prevent: the owner has A and B, but a token
            //scoped to A must not be able to produce a child that reaches B
            var childOnB = permission({userApps: [APP_B], grants: [{type: "r", app: APP_B, allowed: {core: true}}]});
            rights.isPermissionSubset(childOnB, {permission: readCoreOnA}).should.equal(false);
            rights.isPermissionSubset(childOnB, member).should.equal(true);
        });

        it("refuses a feature the ceiling does not hold", function() {
            var update = permission({userApps: [APP_A], grants: [{type: "u", app: APP_A, allowed: {core: true}}]});
            rights.isPermissionSubset(update, member).should.equal(false);
        });

        it("refuses an all grant from a ceiling that holds only named features", function() {
            //"all" covers features that do not exist yet, so only an "all" holder may pass it on
            var readAll = permission({userApps: [APP_A], grants: [{type: "r", app: APP_A, all: true}]});
            rights.isPermissionSubset(readAll, member).should.equal(false);
            rights.isPermissionSubset(readAll, adminOfA).should.equal(true);
            rights.isPermissionSubset(readAll, globalAdmin).should.equal(true);
        });

        it("refuses app administration unless the ceiling administers that app", function() {
            var adminChild = permission({adminApps: [APP_A]});
            rights.isPermissionSubset(adminChild, member).should.equal(false);
            rights.isPermissionSubset(adminChild, adminOfA).should.equal(true);
        });

        it("ignores entries that grant nothing", function() {
            //the permission editor emits an entry for every visible app, most of them empty
            var editorShaped = permission({userApps: [APP_A], grants: [{type: "r", app: APP_A, allowed: {core: true}}]});
            editorShaped.d[APP_B] = {all: false, allowed: {}};
            editorShaped.c[APP_B] = {all: false, allowed: {core: false}};
            rights.isPermissionSubset(editorShaped, {permission: readCoreOnA}).should.equal(true);
        });

        it("refuses membership of an app the ceiling merely has an empty entry for", function() {
            //the permission editor writes an entry for every app it could see, so a member
            //routinely carries empty entries for apps it has no access to at all. Naming one
            //as a user app grants membership, and validateUserForRead authorizes on membership
            //alone, so accepting this would hand the token an app its own owner is refused on
            var ownerWithEmptyEntry = {
                global_admin: false,
                permission: permission({
                    userApps: [APP_A],
                    grants: [{type: "r", app: APP_A, allowed: {core: true}}]
                })
            };
            ownerWithEmptyEntry.permission.r[APP_B] = {all: false, allowed: {}};
            var membershipOfB = permission({userApps: [APP_B]});
            rights.isPermissionSubset(membershipOfB, ownerWithEmptyEntry).should.equal(false);
        });

        it("refuses membership of an app the ceiling only holds one feature on", function() {
            //holding a feature on an app is not the same as being a member of it
            var featureOnly = {
                global_admin: false,
                permission: permission({grants: [{type: "r", app: APP_A, allowed: {core: true}}]})
            };
            rights.isPermissionSubset(permission({userApps: [APP_A]}), featureOnly).should.equal(false);
            //the feature grant itself is still passed on, because that the ceiling does hold
            rights.isPermissionSubset(
                permission({grants: [{type: "r", app: APP_A, allowed: {core: true}}]}),
                featureOnly).should.equal(true);
        });

        it("refuses administering an app the ceiling holds every feature on but is not a member of", function() {
            //four all:true entries satisfy hasAdminAccess, yet the app is absent from the member's
            //own _.u/_.a. A child naming it under _.a would gain admin membership of an app its
            //owner is not a member of - the same escalation as the user-app case, one level up
            var featuresOnly = {
                global_admin: false,
                permission: permission({
                    userApps: [APP_A],
                    grants: [
                        {type: "c", app: APP_B, all: true},
                        {type: "r", app: APP_B, all: true},
                        {type: "u", app: APP_B, all: true},
                        {type: "d", app: APP_B, all: true}
                    ]
                })
            };
            rights.isPermissionSubset(permission({adminApps: [APP_B]}), featuresOnly).should.equal(false);
            //the four all grants themselves are still passed on, since the ceiling does hold them
            var allFour = permission({grants: [
                {type: "c", app: APP_B, all: true}, {type: "r", app: APP_B, all: true},
                {type: "u", app: APP_B, all: true}, {type: "d", app: APP_B, all: true}
            ]});
            rights.isPermissionSubset(allFour, featuresOnly).should.equal(true);
        });

        it("refuses anything that is not a permission object", function() {
            rights.isPermissionSubset(undefined, member).should.equal(false);
            rights.isPermissionSubset([], member).should.equal(false);
        });
    });

    describe("intersectPermission", function() {
        it("strips global admin, so a scoped token cannot act as one", function() {
            var scoped = rights.intersectPermission(globalAdmin, readCoreOnA);
            scoped.global_admin.should.equal(false);
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            rights.hasReadRight("core", APP_B, scoped).should.equal(false);
        });

        it("keeps only what the token and the owner both allow", function() {
            //the token asks for everything; the owner has only named features
            var wide = permission({
                userApps: [APP_A],
                grants: [
                    {type: "r", app: APP_A, all: true},
                    {type: "d", app: APP_A, all: true}
                ]
            });
            var scoped = rights.intersectPermission(member, wide);
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            rights.hasReadRight("events", APP_A, scoped).should.equal(true);
            rights.hasDeleteRight("core", APP_A, scoped).should.equal(false);
        });

        it("drops access the owner lost after the token was created", function() {
            var reduced = {
                global_admin: false,
                permission: permission({
                    userApps: [APP_A],
                    grants: [{type: "r", app: APP_A, allowed: {core: true}}]
                })
            };
            var tokenOnBoth = permission({
                userApps: [APP_A, APP_B],
                grants: [
                    {type: "r", app: APP_A, allowed: {core: true}},
                    {type: "r", app: APP_B, allowed: {core: true}}
                ]
            });
            var scoped = rights.intersectPermission(reduced, tokenOnBoth);
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            rights.hasReadRight("core", APP_B, scoped).should.equal(false);
            rights.getUserApps(scoped).indexOf(APP_B).should.equal(-1);
        });

        it("does not leave an app administrator administering it through a narrower token", function() {
            var scoped = rights.intersectPermission(adminOfA, readCoreOnA);
            rights.hasAdminAccess(scoped, APP_A).should.equal(false);
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            rights.hasDeleteRight("core", APP_A, scoped).should.equal(false);
        });

        it("never grants membership of an app the owner is not a member of", function() {
            //enforcement side of the same rule: even a token that was somehow stored with a
            //wider membership claim is bounded on every request by the owner's own membership
            var ownerWithEmptyEntry = {
                global_admin: false,
                permission: permission({
                    userApps: [APP_A],
                    grants: [{type: "r", app: APP_A, allowed: {core: true}}]
                })
            };
            ownerWithEmptyEntry.permission.r[APP_B] = {all: false, allowed: {}};
            var scoped = rights.intersectPermission(ownerWithEmptyEntry, permission({userApps: [APP_B]}));
            rights.getUserApps(scoped).indexOf(APP_B).should.equal(-1);
        });

        it("does not turn four all grants into admin membership", function() {
            var featuresOnly = {
                global_admin: false,
                permission: permission({
                    userApps: [APP_A],
                    grants: [
                        {type: "c", app: APP_B, all: true}, {type: "r", app: APP_B, all: true},
                        {type: "u", app: APP_B, all: true}, {type: "d", app: APP_B, all: true}
                    ]
                })
            };
            var scoped = rights.intersectPermission(featuresOnly, permission({adminApps: [APP_B]}));
            rights.getAdminApps(scoped).indexOf(APP_B).should.equal(-1);
            rights.getUserApps(scoped).indexOf(APP_B).should.equal(-1);
        });

        it("does not turn a feature grant into app membership", function() {
            //the owner may read core on A without being a member of A, so a token carrying
            //that same read must not come out a member of A either
            var featureOnly = {
                global_admin: false,
                permission: permission({grants: [{type: "r", app: APP_A, allowed: {core: true}}]})
            };
            var scoped = rights.intersectPermission(featureOnly, readCoreOnA);
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            rights.getUserApps(scoped).indexOf(APP_A).should.equal(-1);
        });

        it("reports only the apps the token reaches", function() {
            var scoped = rights.intersectPermission(member, readCoreOnA);
            rights.getUserApps(scoped).should.eql([APP_A]);
        });
    });

    describe("isScopedCredential", function() {
        it("treats an api_key request as unscoped", function() {
            rights.isScopedCredential({}).should.equal(false);
        });

        it("treats a session style token as unscoped", function() {
            rights.isScopedCredential({token_data: {app: "", endpoint: ""}}).should.equal(false);
            rights.isScopedCredential({token_data: {app: [], endpoint: []}}).should.equal(false);
        });

        it("treats a permission scoped or legacy restricted token as scoped", function() {
            rights.isScopedCredential({token_data: {token_permission: readCoreOnA}}).should.equal(true);
            rights.isScopedCredential({token_data: {app: [APP_A], endpoint: ""}}).should.equal(true);
            rights.isScopedCredential({token_data: {app: "", endpoint: ["^/o/users"]}}).should.equal(true);
        });
    });

    describe("applyTokenScope, for a route that resolves its own token", function() {
        // Most routes never call this directly: rights.js bounds the member before any
        // handler runs. /o/actions is the exception - it takes the countly-token header,
        // calls authorize.verify_return itself and never reaches a rights validator - so
        // it has to apply the same bounding, or the token's permissions are simply not
        // consulted and only its app restriction is.
        var scopedToRead = permission({
            adminApps: [],
            userApps: [APP_A],
            grants: [{type: "r", app: APP_A, allowed: {core: true}}]
        });

        it("returns the member unchanged when the token carries no permissions", function() {
            // a legacy token inherits its owner's authority, which is the documented
            // absent-means-unrestricted behaviour
            rights.applyTokenScope({token_data: {app: [APP_A]}}, member).should.equal(member);
            rights.applyTokenScope({}, member).should.equal(member);
            rights.applyTokenScope({token_data: null}, member).should.equal(member);
        });

        it("bounds the member by the token when it does", function() {
            var scoped = rights.applyTokenScope({token_data: {token_permission: scopedToRead}}, member);
            scoped.should.not.equal(member);
            // core read on A survives, because both allow it
            rights.hasReadRight("core", APP_A, scoped).should.equal(true);
            // events read on A does not, though the OWNER has it: the token does not
            rights.hasReadRight("events", APP_A, scoped).should.equal(false);
            // and nothing at all on B, which the token never mentions
            rights.hasReadRight("core", APP_B, scoped).should.equal(false);
        });

        it("cannot widen a member, only narrow it", function() {
            var wider = permission({
                adminApps: [APP_A, APP_B],
                userApps: [APP_A, APP_B],
                grants: [
                    {type: "r", app: APP_A, all: true},
                    {type: "r", app: APP_B, all: true},
                    {type: "d", app: APP_A, all: true}
                ]
            });
            var scoped = rights.applyTokenScope({token_data: {token_permission: wider}}, member);
            rights.hasDeleteRight("core", APP_A, scoped).should.equal(false);
        });

        it("leaves a global admin's own token scope in force", function() {
            var scoped = rights.applyTokenScope(
                {token_data: {token_permission: scopedToRead}}, globalAdmin);
            rights.hasReadRight("events", APP_A, scoped).should.equal(false);
        });
    });

});
