var assert = require("assert");
var mongodb = require("mongodb");
var plugins = require("../../plugins/pluginManager.js");

// wrapDatabase caches one wrapper per collection name for the process lifetime; dropping or
// renaming the collection must evict it, or every per-app collection of every deleted app
// stays on the heap. No operation reaches a server: the drivers' calls are stubbed.
describe("pluginManager collection wrapper cache", function() {
    var client;
    var db;

    beforeEach(function() {
        client = new mongodb.MongoClient("mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=1");
        db = plugins.wrapDatabase(client.db("cache_test"), client, "cache_test", "mongodb://127.0.0.1:1", {});
    });

    afterEach(async function() {
        await client.close();
    });

    it("returns the same wrapper until the collection is dropped", async function() {
        var col = db.collection("app_usersabc");
        assert.ok(db.collection("app_usersabc") === col);
        col._drop = function() {
            return Promise.resolve(true);
        };
        assert.strictEqual(await col.drop(), true);
        assert.ok(!("app_usersabc" in db._collection_cache));
        assert.ok(db.collection("app_usersabc") !== col);
    });

    it("evicts the wrapper when the database drops the collection", async function() {
        var col = db.collection("drill_eventsabc");
        db._dropCollection = function(name) {
            return Promise.resolve(name);
        };
        assert.strictEqual(await db.dropCollection("drill_eventsabc"), "drill_eventsabc");
        assert.ok(!("drill_eventsabc" in db._collection_cache));
        assert.ok(db.collection("drill_eventsabc") !== col);
    });

    it("evicts the wrapper when a callback-style drop is used", function(done) {
        var col = db.collection("eventsabc");
        col._drop = function() {
            return Promise.resolve(true);
        };
        col.drop(function(err, res) {
            assert.ifError(err);
            assert.strictEqual(res, true);
            assert.ok(!("eventsabc" in db._collection_cache));
            done();
        });
    });

    it("evicts the old name when a collection is renamed", async function() {
        var col = db.collection("old_nameabc");
        col._rename = function() {
            return Promise.resolve("renamed");
        };
        assert.strictEqual(await col.rename("new_nameabc"), "renamed");
        assert.ok(!("old_nameabc" in db._collection_cache));
        db.collection("other_oldabc");
        db._renameCollection = function() {
            return Promise.resolve("renamed");
        };
        await db.renameCollection("other_oldabc", "other_newabc");
        assert.ok(!("other_oldabc" in db._collection_cache));
    });
});
