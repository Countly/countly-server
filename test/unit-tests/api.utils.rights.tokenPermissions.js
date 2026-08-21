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
});
