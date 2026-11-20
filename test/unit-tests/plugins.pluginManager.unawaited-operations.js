/**
 * A wrapped database operation called without a callback and without awaiting it
 * (fire-and-forget) must not turn a database failure (MongoDB shutting down, a
 * failover, a network error) into an unhandled rejection, which takes the process
 * down. The failure is logged instead. A caller that awaits still gets it.
 */
require("should");
var mongodb = require("mongodb");
var plugins = require("../../plugins/pluginManager.js");

var UNAWAITED = "Unhandled failure of unawaited operation";

/**
 * The error MongoDB returns to operations in flight when it shuts down
 * @returns {Error} error with the server's code
 */
function shutdownError() {
    return Object.assign(new Error("interrupted at shutdown"), {code: 11600});
}

/**
 * Let the (immediate) rejection, its handlers and Node's unhandled-rejection check run:
 * all of them finish before the next turn of the event loop
 * @returns {Promise} resolves two turns of the event loop later
 */
function settle() {
    return new Promise(function(resolve) {
        setImmediate(function() {
            setImmediate(resolve);
        });
    });
}

describe("pluginManager: database operations nobody awaits", function() {
    var client;
    var db;
    var unhandled;
    var errorLines;
    var stderrWrite;

    /**
     * Collect unhandled rejections while a test runs
     * @param {Error} reason - rejection reason
     */
    function onUnhandled(reason) {
        unhandled.push(reason);
    }

    /**
     * Logged lines that report an unawaited operation
     * @returns {Array<string>} lines
     */
    function unawaitedLogs() {
        return errorLines.filter(function(line) {
            return line.indexOf(UNAWAITED) !== -1;
        });
    }

    beforeEach(function() {
        // No operation reaches the server: the operations below are replaced.
        client = new mongodb.MongoClient("mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=1");
        db = plugins.wrapDatabase(client.db("unawaited_test"), client, "unawaited_test", "mongodb://127.0.0.1:1", {});
        unhandled = [];
        errorLines = [];
        // the db loggers write errors through console.error
        stderrWrite = process.stderr.write;
        process.stderr.write = function(chunk) {
            errorLines.push(String(chunk));
            return true;
        };
        process.on("unhandledRejection", onUnhandled);
    });

    afterEach(async function() {
        process.stderr.write = stderrWrite;
        process.removeListener("unhandledRejection", onUnhandled);
        await client.close();
    });

    it("logs a failed insertOne nobody awaits instead of leaving the rejection unhandled", async function() {
        var col = db.collection("logsabc");
        col._insertOne = function() {
            return Promise.reject(shutdownError());
        };

        col.insertOne({a: 1});
        await settle();

        unhandled.should.eql([]);
        unawaitedLogs().length.should.equal(1);
        unawaitedLogs()[0].should.containEql("logsabc");
    });

    it("logs a failed updateOne nobody awaits", async function() {
        var col = db.collection("appsabc");
        col._updateOne = function() {
            return Promise.reject(shutdownError());
        };

        col.updateOne({_id: "x"}, {$set: {a: 1}});
        await settle();

        unhandled.should.eql([]);
        unawaitedLogs().length.should.equal(1);
    });

    it("still rejects for a caller that awaits, and leaves the logging to that caller", async function() {
        var col = db.collection("membersabc");
        col._insertOne = function() {
            return Promise.reject(shutdownError());
        };

        var caught = null;
        try {
            await col.insertOne({a: 1});
        }
        catch (err) {
            caught = err;
        }
        await settle();

        caught.message.should.equal("interrupted at shutdown");
        unhandled.should.eql([]);
        unawaitedLogs().should.eql([]);
    });

    it("still rejects for a caller that chains catch", async function() {
        var col = db.collection("eventsabc");
        col._deleteMany = function() {
            return Promise.reject(shutdownError());
        };

        var caught = await col.deleteMany({a: 1}).catch(function(err) {
            return err;
        });
        await settle();

        caught.code.should.equal(11600);
        unawaitedLogs().should.eql([]);
    });

    it("resolves as before when the operation succeeds", async function() {
        var col = db.collection("okabc");
        col._insertOne = function() {
            return Promise.resolve({acknowledged: true, insertedId: "id1"});
        };

        var res = await col.insertOne({a: 1});

        res.insertedId.should.equal("id1");
        unawaitedLogs().should.eql([]);
    });
});
