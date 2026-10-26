require("should");
var rights = require("../../api/utils/rights.js");
var common = require("../../api/utils/common.js");
var plugins = require("../../plugins/pluginManager.js");
var usersApi = require("../../api/parts/mgmt/users.js");

var APP_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
var MEMBER_ID = "cccccccccccccccccccccccc";

// A permission with the four rights and no "_" section: the shape a permission-only member update sent
var RIGHTS_ONLY = {
    c: {[APP_A]: {all: true, allowed: {}}},
    r: {[APP_A]: {all: true, allowed: {}}},
    u: {[APP_A]: {all: true, allowed: {}}},
    d: {[APP_A]: {all: true, allowed: {}}}
};

describe("rights with a permission that has no app lists", function() {
    var originalDb, originalDispatch, originalReturnMessage;
    var member, answered;

    beforeEach(function() {
        originalDb = common.db;
        originalDispatch = plugins.dispatch;
        originalReturnMessage = common.returnMessage;
        common.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function(name) {
                return {
                    findOne: function(query, options, callback) {
                        callback = typeof options === "function" ? options : callback;
                        if (name === "members") {
                            return callback(null, JSON.parse(JSON.stringify(member)));
                        }
                        if (name === "apps") {
                            return callback(null, {_id: APP_A, timezone: "UTC"});
                        }
                        callback(null, null);
                    }
                };
            }
        };
        plugins.dispatch = function() {
            return false;
        };
        answered = [];
        common.returnMessage = function(params, code, message) {
            answered.push([code, message]);
        };
    });

    afterEach(function() {
        common.db = originalDb;
        plugins.dispatch = originalDispatch;
        common.returnMessage = originalReturnMessage;
    });

    /**
    * Run an app admin validation with an api_key
    * @returns {Promise<string>} "passed", or the reason it was refused
    */
    function asAppAdmin() {
        var params = {qstring: {api_key: "KEY", app_id: APP_A}, req: {headers: {}}, res: {}, fullPath: "/i/apps/update"};
        return rights.validateAppAdmin(params).then(function() {
            return "passed";
        }, function(reason) {
            return reason;
        });
    }

    it("refuses app admin calls cleanly, without throwing, for a stored permission with no _", async function() {
        member = {_id: MEMBER_ID, api_key: "KEY", permission: JSON.parse(JSON.stringify(RIGHTS_ONLY))};
        (await asAppAdmin()).should.equal("User does not have right");
        answered.should.eql([[401, "User does not have right"]]);
    });

    it("refuses app admin calls cleanly for a _ with no a list", async function() {
        member = {_id: MEMBER_ID, api_key: "KEY", permission: Object.assign({_: {u: [[APP_A]]}}, RIGHTS_ONLY)};
        (await asAppAdmin()).should.equal("User does not have right");
        answered.should.eql([[401, "User does not have right"]]);
    });

    it("still lets an app admin through", async function() {
        member = {_id: MEMBER_ID, api_key: "KEY", permission: Object.assign({_: {a: [APP_A], u: []}}, RIGHTS_ONLY)};
        (await asAppAdmin()).should.equal("passed");
        answered.should.eql([]);
    });

    it("reads the app lists of such a member as empty", function() {
        var stored = {_id: MEMBER_ID, permission: JSON.parse(JSON.stringify(RIGHTS_ONLY))};
        rights.getAdminApps(stored).should.eql([]);
        rights.getUserApps(stored).should.eql([]);
    });

    it("stores a permission-only member update with its app lists, as creation does", async function() {
        var saved = null;
        member = {_id: MEMBER_ID, api_key: "KEY", permission: {_: {a: [APP_A], u: []}, c: {}, r: {}, u: {}, d: {}}};
        var membersCollection = common.db.collection("members");
        common.db.collection = function(name) {
            if (name !== "members") {
                return {
                    findOne: function(query, options, callback) {
                        (typeof options === "function" ? options : callback)(null, null);
                    },
                    remove: function() {}
                };
            }
            return {
                findOne: membersCollection.findOne,
                update: function(query, change, options, callback) {
                    saved = change.$set;
                    member = Object.assign({}, member, saved);
                    callback(null, {});
                }
            };
        };
        plugins.dispatch = function(event, ob, callback) {
            if (typeof callback === "function") {
                callback();
            }
            return false;
        };
        var params = {qstring: {args: {user_id: MEMBER_ID, permission: JSON.parse(JSON.stringify(RIGHTS_ONLY))}}, member: {_id: "dddddddddddddddddddddddd", global_admin: true}, res: {}};
        await usersApi.updateUser(params);
        await new Promise(function(resolve) {
            setImmediate(resolve);
        });
        saved.permission._.should.eql({a: [], u: []});
        saved.permission.r.should.eql(RIGHTS_ONLY.r);

        // the member saved this way is answered by their rights, not locked out
        common.db.collection = function(name) {
            return {
                findOne: function(query, options, callback) {
                    callback = typeof options === "function" ? options : callback;
                    callback(null, name === "members" ? JSON.parse(JSON.stringify(member)) : {_id: APP_A, timezone: "UTC"});
                }
            };
        };
        plugins.dispatch = function() {
            return false;
        };
        answered = [];
        (await asAppAdmin()).should.equal("User does not have right");
        answered.should.eql([[401, "User does not have right"]]);
        member.permission._.a = [APP_A];
        answered = [];
        (await asAppAdmin()).should.equal("passed");
    });
});
