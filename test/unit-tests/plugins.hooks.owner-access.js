/**
 * An app-scoped internal event reaches a hook only while the hook's owner may still read
 * hooks on the event's app. A hook whose owner was deleted stops; a global admin's hook keeps
 * firing. The owner is looked up once per dispatch however many hooks share it.
 *
 * A skipped hook is not changed, but the reason is recorded in its error log (shown in the
 * Hooks UI), at most once per hook and app per hour.
 */
require("should");
var common = require("../../api/utils/common.js");
var InternalEventTrigger = require("../../plugins/hooks/api/parts/triggers/internal_event.js");

describe("hooks internal event: owner access", function() {
    var APP = "6a0000000000000000000001";
    var originalDb, originalWriteBatcher;
    var members, lookups, delivered, trigger, errorRecords;

    beforeEach(function() {
        originalDb = common.db;
        originalWriteBatcher = common.writeBatcher;
        errorRecords = [];
        common.writeBatcher = {add: function(collection, id, update) {
            if (collection === "hooks" && update.$push && update.$push.error_logs) {
                errorRecords.push({hook: id, e: update.$push.error_logs.$each[0].e});
            }
        }};
        InternalEventTrigger.resetOwnerSkipRecords();
        lookups = 0;
        delivered = [];
        common.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function(name) {
                return {
                    findOne: function(query) {
                        if (name === "members") {
                            lookups++;
                            return Promise.resolve(members[query._id] || null);
                        }
                        return Promise.resolve(null);
                    }
                };
            }
        };
        //no constructor, so nothing registers with the plugin manager
        trigger = Object.create(InternalEventTrigger.prototype);
        trigger.pipeline = function(data) {
            delivered.push(data.rule._id);
        };
    });

    afterEach(function() {
        common.db = originalDb;
        common.writeBatcher = originalWriteBatcher;
    });

    /**
     * An app_users hook on APP
     * @param {string} id - hook id
     * @param {string} owner - createdBy
     * @returns {object} rule
     */
    function hook(id, owner) {
        return {_id: id, createdBy: owner, apps: [APP], trigger: {type: "InternalEventTrigger", configuration: {eventType: "/i/app_users/update"}}};
    }

    /**
     * A member with read on APP for the given features
     * @param {object} allowed - features
     * @returns {object} member
     */
    function member(allowed) {
        return {permission: {_: {a: [], u: [[APP]]}, c: {}, r: {[APP]: {all: false, allowed: allowed}}, u: {}, d: {}}};
    }

    /**
     * Dispatch one app user update on APP
     * @returns {Promise<Array>} ids of the hooks it reached
     */
    async function dispatch() {
        delivered = [];
        await trigger.process({app_id: APP, user: {uid: "u1"}, update: {}}, "/i/app_users/update");
        return delivered;
    }

    it("fires for the owner, and stops once the owner's role on the app is removed", async function() {
        members = {owner1: member({hooks: true})};
        trigger._rules = [hook("h1", "owner1")];
        (await dispatch()).should.eql(["h1"]);

        errorRecords.should.eql([]);

        members.owner1 = {permission: {_: {a: [], u: []}, c: {}, r: {}, u: {}, d: {}}};
        (await dispatch()).should.eql([]);
        errorRecords.should.eql([{hook: "h1", e: "Not run: the hook's creator no longer has access to app " + APP}]);
    });

    it("records the skip at most once per hook and app per hour", async function() {
        members = {owner1: member({core: true})};
        trigger._rules = [hook("h1", "owner1"), hook("h2", "owner1")];
        await dispatch();
        await dispatch();
        await dispatch();
        errorRecords.map(function(r) {
            return r.hook;
        }).should.eql(["h1", "h2"]);
    });

    it("records nothing for an event from an app outside the hook's scope", async function() {
        members = {owner1: member({core: true})};
        trigger._rules = [hook("h1", "owner1")];
        await trigger.process({app_id: "6a0000000000000000000002", user: {uid: "u1"}, update: {}}, "/i/app_users/update");
        delivered.should.eql([]);
        errorRecords.should.eql([]);
    });

    it("stops when the owner lost hooks read but kept other rights on the app", async function() {
        members = {owner1: member({core: true})};
        trigger._rules = [hook("h1", "owner1")];
        (await dispatch()).should.eql([]);
    });

    it("stops when the owner no longer exists", async function() {
        members = {};
        trigger._rules = [hook("h1", "owner1")];
        (await dispatch()).should.eql([]);
        errorRecords.should.eql([{hook: "h1", e: "Not run: the hook's creator no longer exists"}]);
    });

    it("keeps firing for a global admin's hook", async function() {
        members = {admin1: {global_admin: true}};
        trigger._rules = [hook("h1", "admin1")];
        (await dispatch()).should.eql(["h1"]);
        errorRecords.should.eql([]);
    });

    it("looks each owner up once per dispatch", async function() {
        members = {owner1: member({hooks: true})};
        trigger._rules = [hook("h1", "owner1"), hook("h2", "owner1"), hook("h3", "owner1")];
        (await dispatch()).should.eql(["h1", "h2", "h3"]);
        lookups.should.equal(1);
    });
});
