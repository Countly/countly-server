/**
 * Every alert goes out through common-lib trigger(), both from the scheduled job and from the
 * event path (crashes, nps, rating, survey), which reads alerts by type and app only. trigger()
 * therefore sends nothing for a disabled alert, or when the alert's owner may no longer read the
 * app or the data the alert sends.
 */
require("should");
var common = require("../../api/utils/common.js");
var commonLib = require("../../plugins/alerts/api/parts/common-lib.js");

describe("alerts trigger gate", function() {
    var OWNER_ID = "5f0000000000000000000001";
    var originalDb, originalDispatch;
    var owner, dispatched;
    var quietLog = {d: function() {}, w: function() {}, e: function() {}};

    beforeEach(function() {
        originalDb = common.db;
        originalDispatch = common.plugins.dispatch;
        dispatched = [];
        common.plugins.dispatch = function(event, ob) {
            dispatched.push({event: event, ob: ob});
        };
        common.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function(name) {
                return {
                    findOne: function() {
                        return Promise.resolve(name === "members" ? owner : null);
                    },
                    findAndModify: function() {
                        return Promise.resolve({});
                    }
                };
            }
        };
    });

    afterEach(function() {
        common.db = originalDb;
        common.plugins.dispatch = originalDispatch;
    });

    /**
     * A hook alert on appA, so a trigger shows up as a dispatch instead of an e-mail
     * @param {object} fields - fields to override
     * @returns {object} alert
     */
    function alert(fields) {
        return Object.assign({_id: "alert1", alertBy: "hook", alertDataType: "crashes", selectedApps: ["appA"], createdBy: OWNER_ID, enabled: true}, fields || {});
    }

    /**
     * Owner with read on appA for the given features
     * @param {object} allowed - features allowed on appA
     * @returns {object} member
     */
    function member(allowed) {
        return {_id: OWNER_ID, permission: {_: {a: [], u: [["appA"]]}, c: {}, r: {appA: {all: false, allowed: allowed}}, u: {}, d: {}}};
    }

    /**
     * Run trigger for an alert
     * @param {object} a - alert
     * @returns {Promise<boolean>} whether the alert was sent
     */
    async function send(a) {
        await commonLib.trigger({alert: a, app: {_id: "appA", name: "A", timezone: "UTC"}, date: new Date()}, quietLog);
        return dispatched.length > 0;
    }

    it("sends an enabled alert whose owner reads the app and its data", async function() {
        owner = member({alerts: true, crashes: true});
        (await send(alert())).should.be.true();
    });

    it("sends nothing for a disabled alert", async function() {
        owner = member({alerts: true, crashes: true});
        (await send(alert({enabled: false}))).should.be.false();
        (await send(alert({enabled: undefined}))).should.be.false();
    });

    it("sends nothing when the owner lost read on the alert's data", async function() {
        owner = member({alerts: true});
        (await send(alert())).should.be.false();
    });

    it("sends nothing when the owner lost read on the app's alerts", async function() {
        owner = member({crashes: true});
        (await send(alert())).should.be.false();
    });

    it("sends nothing when the owner no longer exists", async function() {
        owner = null;
        (await send(alert())).should.be.false();
    });

    it("authorizes the app being reported, not the alert's first app", async function() {
        owner = member({alerts: true, crashes: true});
        var multiApp = alert({selectedApps: ["appB", "appA"]});
        (await send(multiApp)).should.be.true();
        dispatched = [];
        await commonLib.trigger({alert: multiApp, app: {_id: "appB", name: "B", timezone: "UTC"}, date: new Date()}, quietLog);
        dispatched.length.should.equal(0);
    });

    it("sends for a global admin owner", async function() {
        owner = {_id: OWNER_ID, global_admin: true};
        (await send(alert())).should.be.true();
    });
});
