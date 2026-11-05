require("should");
var common = require("../../api/utils/common.js");
var commonLib = require("../../plugins/alerts/api/parts/common-lib.js");

// trigger() is where both the scheduled job and the event-triggered alerts (crashes,
// nps, rating, survey) end up, so it is where an alert's status and its owner's
// current access are checked. The event path loads alerts by app and type only.
describe("alerts trigger gate", function() {
    var APP = "aaaaaaaaaaaaaaaaaaaaaaaa";
    var log = { w: function() {}, d: function() {}, e: function() {}, i: function() {} };
    var originalDb, originalPlugins, members, dispatched, counted;

    /**
    * A member reading the listed features on the app.
    * @param {object} allowed - features
    * @returns {object} member
    */
    function owner(allowed) {
        return { _id: "o", permission: { _: { a: [], u: [[APP]] }, c: {}, r: { [APP]: { all: false, allowed: allowed } }, u: {}, d: {} } };
    }

    /**
    * Trigger a hook alert for the app.
    * @param {object} alert - alert fields
    * @returns {Promise} resolves when trigger finished
    */
    function fire(alert) {
        return commonLib.trigger({
            alert: Object.assign({ _id: "a", alertBy: "hook", selectedApps: [APP], alertDataType: "crashes" }, alert),
            app: { _id: APP, name: "App", timezone: "UTC" },
            date: new Date()
        }, log);
    }

    beforeEach(function() {
        originalDb = common.db;
        originalPlugins = common.plugins;
        members = {};
        dispatched = 0;
        counted = 0;
        common.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function(name) {
                if (name === "members") {
                    return {
                        findOne: function(query) {
                            return Promise.resolve(members[query._id] || null);
                        }
                    };
                }
                return {
                    findAndModify: function() {
                        counted++;
                        return Promise.resolve({});
                    }
                };
            }
        };
        common.plugins = {
            dispatch: function() {
                dispatched++;
            }
        };
    });

    afterEach(function() {
        common.db = originalDb;
        common.plugins = originalPlugins;
    });

    it("fires an enabled alert whose owner reads the app's alerts", async function() {
        members.o = owner({ alerts: true });
        await fire({ enabled: true, createdBy: "o" });
        dispatched.should.equal(1);
        counted.should.equal(1);
    });

    it("does not fire a disabled alert", async function() {
        members.o = owner({ alerts: true });
        await fire({ enabled: false, createdBy: "o" });
        await fire({ enabled: "false", createdBy: "o" });
        dispatched.should.equal(0);
        counted.should.equal(0);
    });

    it("does not fire when the owner no longer reads the app's alerts", async function() {
        members.o = owner({ core: true });
        await fire({ enabled: true, createdBy: "o" });
        dispatched.should.equal(0);
        counted.should.equal(0);
    });

    it("does not fire when the owner is gone", async function() {
        await fire({ enabled: true, createdBy: "o" });
        dispatched.should.equal(0);
    });

    it("keeps firing an alert that predates createdBy", async function() {
        await fire({ enabled: true });
        dispatched.should.equal(1);
    });
});
