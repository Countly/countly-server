require("should");
var viewsUtils = require("../../plugins/views/api/parts/viewsUtils.js");

// The heatmap token branch used to serve whatever app the caller's app_key resolved to,
// without consulting the member the token belongs to. It now applies the owner's read
// right - but the api_key path it has to agree with is validateRead, which grants read to
// a legacy member through user_of, and hasReadRight alone does not. A token owner must
// not be refused where the same member's api_key would be accepted.

describe("views: read right of a token owner", function() {
    var APP = "6a41837e902bfd5369ddc610";
    var OTHER = "6a41837e902bfd5369ddc611";
    var FEATURE = "views";

    describe("members carrying a permission object", function() {
        it("allows the feature being explicitly allowed for this app", function() {
            var member = {permission: {r: {}}};
            member.permission.r[APP] = {allowed: {views: true}};
            viewsUtils.ownerCanRead(member, APP, FEATURE).should.equal(true);
        });
        it("allows an app admin, whose read permission is marked all", function() {
            var member = {permission: {r: {}}};
            member.permission.r[APP] = {all: true};
            viewsUtils.ownerCanRead(member, APP, FEATURE).should.equal(true);
        });
        it("refuses the feature being allowed on a different app", function() {
            var member = {permission: {r: {}}};
            member.permission.r[OTHER] = {allowed: {views: true}};
            viewsUtils.ownerCanRead(member, APP, FEATURE).should.equal(false);
        });
        it("refuses a different feature on this app", function() {
            var member = {permission: {r: {}}};
            member.permission.r[APP] = {allowed: {crashes: true}};
            viewsUtils.ownerCanRead(member, APP, FEATURE).should.equal(false);
        });
    });

    describe("legacy members, stored before permission objects existed", function() {
        it("allows one whose user_of carries this app", function() {
            // validateRead grants exactly this, so refusing it here would take away access
            // the same member's api_key still has
            viewsUtils.ownerCanRead({user_of: [OTHER, APP]}, APP, FEATURE).should.equal(true);
        });
        it("refuses one whose user_of does not", function() {
            viewsUtils.ownerCanRead({user_of: [OTHER]}, APP, FEATURE).should.equal(false);
        });
        it("refuses one with no user_of at all", function() {
            viewsUtils.ownerCanRead({}, APP, FEATURE).should.equal(false);
            viewsUtils.ownerCanRead({user_of: "not an array"}, APP, FEATURE).should.equal(false);
        });
        it("does not consult user_of once a permission object is present", function() {
            // a member who has been migrated is governed by the permission object alone
            viewsUtils.ownerCanRead(
                {permission: {r: {}}, user_of: [APP]}, APP, FEATURE).should.equal(false);
        });
    });

    describe("the cases that override everything else", function() {
        it("allows a global admin", function() {
            viewsUtils.ownerCanRead({global_admin: true}, APP, FEATURE).should.equal(true);
        });
        it("refuses a locked account, whatever else it carries", function() {
            viewsUtils.ownerCanRead({global_admin: true, locked: true}, APP, FEATURE).should.equal(false);
            viewsUtils.ownerCanRead({user_of: [APP], locked: true}, APP, FEATURE).should.equal(false);
        });
        it("refuses a missing member rather than throwing", function() {
            viewsUtils.ownerCanRead(null, APP, FEATURE).should.equal(false);
            viewsUtils.ownerCanRead(undefined, APP, FEATURE).should.equal(false);
        });
    });
});
