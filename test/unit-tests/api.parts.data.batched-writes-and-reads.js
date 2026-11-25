/**
 * Batched writes merge a later update into a queued one with common.mergeQuery, and batched
 * reads call back through the read batcher. Two crashes came from these paths:
 * - a queued $addToSet / $push value that is a single object, array or null (not {$each: [...]})
 *   made mergeQuery read $each of it and throw inside event processing;
 * - a read batcher callback that threw was called again with its own error, which async
 *   reported as "Callback was already called" in an unhandled rejection.
 */
require("should");
var common = require("../../api/utils/common.js");
var plugins = require("../../plugins/pluginManager.js");
var {ReadBatcher} = require("../../api/parts/data/batcher.js");

var DOC = {_id: "app1", name: "App"};

describe("Batched writes and reads", function() {
    describe("common.mergeQuery", function() {
        it("wraps a queued object, array or null value instead of reading $each of it", function() {
            var update = {$addToSet: {"obj": {a: 1}, "list": [1, 2], "none": null}, $push: {"pobj": {b: 2}, "pnone": null}};
            common.mergeQuery(update, {$addToSet: {"obj": {a: 2}, "list": {$each: [3]}, "none": "x"}, $push: {"pobj": {b: 3}, "pnone": {$each: [4]}}});
            update.$addToSet.should.eql({"obj": {$each: [{a: 1}, {a: 2}]}, "list": {$each: [[1, 2], 3]}, "none": {$each: [null, "x"]}});
            update.$push.should.eql({"pobj": {$each: [{b: 2}, {b: 3}]}, "pnone": {$each: [null, 4]}});
        });

        it("adds a field that only the later update sets without an empty value", function() {
            var update = {$addToSet: {"meta.type": {$each: ["hc"]}}};
            common.mergeQuery(update, {$addToSet: {"meta.code": "w202"}});
            update.$addToSet.should.eql({"meta.type": {$each: ["hc"]}, "meta.code": {$each: ["w202"]}});
        });
    });

    describe("ReadBatcher callbacks", function() {
        var getConfig, loadConfigs;
        before(function() {
            getConfig = plugins.getConfig;
            loadConfigs = plugins.loadConfigs;
            plugins.getConfig = function() {
                return {batch_read_period: 60, batch_read_ttl: 600, batch_read_processing: true};
            };
            plugins.loadConfigs = function(db, callback) {
                if (callback) {
                    callback();
                }
            };
        });
        after(function() {
            plugins.getConfig = getConfig;
            plugins.loadConfigs = loadConfigs;
        });

        /**
         * A read batcher over a database whose findOne calls back with the given error and document
         * @param {Error} err - error to call back with
         * @param {object} doc - document to call back with
         * @returns {ReadBatcher} batcher
         */
        function batcherWith(err, doc) {
            var db = {
                collection: function() {
                    return {
                        findOne: function(query, projection, callback) {
                            callback(err, doc);
                        }
                    };
                }
            };
            var batcher = new ReadBatcher(db);
            batcher.loadConfig();
            return batcher;
        }

        it("calls a callback that throws once, and settles without rejecting", async function() {
            var calls = [];
            await batcherWith(null, DOC).getOne("apps", {_id: "app1"}, function(err, doc) {
                calls.push([err, doc]);
                throw new Error("callback failed");
            });
            calls.should.eql([[null, DOC]]);
        });

        it("still passes a read failure to the callback once", async function() {
            var calls = [];
            await batcherWith(new Error("read failed"), null).getOne("apps", {_id: "app1"}, function(err, doc) {
                calls.push([err && err.message, doc]);
            });
            calls.should.eql([["read failed", null]]);
        });
    });
});
