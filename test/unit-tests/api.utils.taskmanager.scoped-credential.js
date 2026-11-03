require("should");
var rights = require("../../api/utils/rights.js");
var taskmanager = require("../../api/utils/taskmanager.js");

// A scoped credential (a token with token_permission or a legacy app restriction) acts for
// its owner, so it is the owner's member id that is compared with task.creator. The token
// must still be held to the apps it was given: a task on another app is out of its reach,
// even when its owner created that task.
describe("taskmanager authorization for scoped credentials", function() {
    var owner = {_id: "owner1", global_admin: true};

    /**
     * Member as rights.applyTokenScope leaves it for a token limited to some apps
     * @param {string[]} apps - apps the token reads core on
     * @returns {object} scoped member
     */
    function scopedMember(apps) {
        var permission = {_: {a: [], u: [apps]}, c: {}, r: {}, u: {}, d: {}};
        apps.forEach(function(appId) {
            permission.r[appId] = {all: false, allowed: {core: true}};
        });
        var member = rights.intersectPermission(owner, permission);
        member.scoped_credential = "ref";
        return member;
    }

    var taskOnA = {_id: "t1", app_id: "appA", creator: "owner1", global: false};
    var taskOnB = {_id: "t2", app_id: "appB", creator: "owner1", global: false};
    var globalTaskOnB = {_id: "t3", app_id: "appB", creator: "someone", global: true};
    var taskWithoutApp = {_id: "t4", app_id: "", creator: "owner1", global: false};

    describe("scopedCredentialApps", function() {
        it("lists the apps of a scoped credential", function() {
            taskmanager.scopedCredentialApps(scopedMember(["appA"])).should.eql(["appA"]);
        });
        it("is null for a member that is not a scoped credential", function() {
            (taskmanager.scopedCredentialApps(owner) === null).should.equal(true);
            (taskmanager.scopedCredentialApps({_id: "m", permission: {_: {a: [], u: [["appA"]]}}}) === null).should.equal(true);
            (taskmanager.scopedCredentialApps(null) === null).should.equal(true);
        });
    });

    describe("isAuthorizedFor", function() {
        it("lets a scoped credential act on its owner's task on a granted app", function() {
            taskmanager.isAuthorizedFor(scopedMember(["appA"]), taskOnA).should.equal(true);
        });
        it("refuses its owner's task on an app the credential was not given", function() {
            taskmanager.isAuthorizedFor(scopedMember(["appA"]), taskOnB).should.equal(false);
        });
        it("refuses its owner's task that has no app", function() {
            taskmanager.isAuthorizedFor(scopedMember(["appA", "appB"]), taskWithoutApp).should.equal(false);
        });
        it("leaves the owner's own credential unchanged", function() {
            taskmanager.isAuthorizedFor(owner, taskOnB).should.equal(true);
            taskmanager.isAuthorizedFor({_id: "owner1", permission: {_: {a: [], u: [["appA"]]}}}, taskOnB).should.equal(true);
        });
    });

    describe("isReadableBy", function() {
        it("refuses a global task on an app the credential was not given", function() {
            taskmanager.isReadableBy(scopedMember(["appA"]), globalTaskOnB).should.equal(false);
        });
        it("allows a global task on a granted app", function() {
            taskmanager.isReadableBy(scopedMember(["appB"]), globalTaskOnB).should.equal(true);
        });
        it("still lets any other member read a global task", function() {
            taskmanager.isReadableBy({_id: "m2", permission: {_: {a: [], u: [["appA"]]}}}, globalTaskOnB).should.equal(true);
        });
    });
});
