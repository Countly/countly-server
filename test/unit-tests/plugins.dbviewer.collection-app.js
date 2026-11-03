require("should");
var common = require("../../api/utils/common.js");
var rights = require("../../api/utils/rights.js");
var collectionApp = require("../../plugins/dbviewer/api/parts/collection_app.js");

// A DB Viewer aggregation that runs long becomes a long task, and the task is filed under an
// app: it is listed, counted and authorized by that app. That has to be the app whose data
// the collection holds, whatever app the request was sent with, and no app at all for a
// collection every app shares.
describe("dbviewer collection app", function() {
    var APP = "0123456789abcdef01234567";
    var OTHER_APP = "fedcba9876543210fedcba98";
    var originals = {};
    var appQueries = [];

    before(function() {
        originals.db = common.db;
        originals.dbLoadEventsData = rights.dbLoadEventsData;
        originals.getHashedCollectionAppId = rights.getHashedCollectionAppId;
        common.db = {
            ObjectID: function(id) {
                return "oid:" + id;
            },
            collection: function(name) {
                name.should.equal("apps");
                return {
                    find: function(query) {
                        appQueries.push(query);
                        return {
                            toArray: function(cb) {
                                cb(null, [{_id: APP, name: "A"}]);
                            }
                        };
                    }
                };
            }
        };
        rights.dbLoadEventsData = function(params, apps, cb) {
            cb(null, {}, {});
        };
        rights.getHashedCollectionAppId = function(collection) {
            return collection === "events" + "a".repeat(40) || collection === "drill_events" + "b".repeat(40) ? APP : null;
        };
    });

    after(function() {
        common.db = originals.db;
        rights.dbLoadEventsData = originals.dbLoadEventsData;
        rights.getHashedCollectionAppId = originals.getHashedCollectionAppId;
    });

    beforeEach(function() {
        appQueries = [];
    });

    /**
     * Resolves a collection's app for a member
     * @param {object} member - member
     * @param {string} collection - collection name
     * @returns {Promise<string>} app id
     */
    function resolve(member, collection) {
        return new Promise(function(res) {
            collectionApp.resolveCollectionApp({member: member, qstring: {app_id: OTHER_APP}}, collection, res);
        });
    }

    it("takes the app from a per-app collection name", async function() {
        (await resolve({global_admin: true}, "app_users" + APP)).should.equal(APP);
        (await resolve({global_admin: true}, "app_crashes" + OTHER_APP)).should.equal(OTHER_APP);
        appQueries.length.should.equal(0);
    });

    it("records no app for a shared collection, not the request's app", async function() {
        (await resolve({global_admin: true}, "plugins")).should.equal(collectionApp.NO_APP);
        (await resolve({global_admin: true}, "long_tasks")).should.equal(collectionApp.NO_APP);
        (await resolve({global_admin: true}, "events")).should.equal(collectionApp.NO_APP);
    });

    it("looks up the app of a hashed event collection", async function() {
        (await resolve({global_admin: true}, "events" + "a".repeat(40))).should.equal(APP);
        (await resolve({global_admin: true}, "drill_events" + "b".repeat(40))).should.equal(APP);
        appQueries[0].should.eql({});
    });

    it("loads only the member's own apps for a member that is not a global admin", async function() {
        var member = {_id: "m", permission: {_: {a: [], u: [[APP]]}, c: {}, r: {}, u: {}, d: {}}};
        (await resolve(member, "events" + "a".repeat(40))).should.equal(APP);
        appQueries[0].should.eql({_id: {$in: ["oid:" + APP]}});
    });

    it("records no app for an unknown hashed collection", async function() {
        (await resolve({global_admin: true}, "events" + "c".repeat(40))).should.equal(collectionApp.NO_APP);
    });

    it("does not read a hash as an app id", function() {
        (collectionApp.suffixAppId("events" + "0123456789abcdef0123456789abcdef01234567") === null).should.equal(true);
        (collectionApp.suffixAppId("app_viewdata" + "0123456789abcdef0123456789abcdef01234567") === null).should.equal(true);
    });

    it("records no app for a pipeline that joins other collections", async function() {
        var join = function(pipeline) {
            return new Promise(function(res) {
                collectionApp.resolveAggregationApp({member: {global_admin: true}, qstring: {}}, "app_users" + APP, pipeline, res);
            });
        };
        (await join([{$match: {}}])).should.equal(APP);
        (await join([{$lookup: {from: "app_users" + OTHER_APP, as: "x"}}])).should.equal(collectionApp.NO_APP);
        (await join([{$unionWith: {coll: "apps"}}])).should.equal(collectionApp.NO_APP);
        (await join([{$facet: {a: [{$graphLookup: {from: "apps"}}]}}])).should.equal(collectionApp.NO_APP);
    });
});
