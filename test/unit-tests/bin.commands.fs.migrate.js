require("should");
var fs = require("fs");
var os = require("os");
var path = require("path");
var mongodb = require("mongodb");
var plugins = require("../../plugins/pluginManager.js");
var countlyFs = require("../../api/utils/countlyFs");
var migrate = require("../../bin/commands/scripts/fs.js");

// `countly fs migrate fs gridfs` stores every file of a folder in GridFS under "<file>" or "<sub folder>/<file>",
// the id format plugins read files back with (crash_symbolication: "<app_id>/<symbol_id>.cly_symbol").
var BUCKET = "test_fs_migrate";

function importFiles(dir) {
    return new Promise(function(resolve) {
        migrate.importFiles(dir, BUCKET, resolve);
    });
}

function readFile(db, id) {
    return new Promise(function(resolve, reject) {
        var data = [];
        new mongodb.GridFSBucket(db, {bucketName: BUCKET}).openDownloadStream(id)
            .on("data", function(chunk) {
                data.push(chunk);
            })
            .on("error", reject)
            .on("end", function() {
                resolve(Buffer.concat(data).toString());
            });
    });
}

describe("countly fs migrate fs gridfs", function() {
    var db;
    var dir;
    var originalSaveFile = countlyFs.gridfs.saveFile;

    before(async function() {
        db = await plugins.dbConnection("countly_fs");
        countlyFs.setHandler(db);
    });

    beforeEach(async function() {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-migrate-"));
        fs.mkdirSync(path.join(dir, "app1"));
        fs.writeFileSync(path.join(dir, ".gitignore"), "*");
        fs.writeFileSync(path.join(dir, "icon.png"), "icon");
        for (var i = 0; i < 10; i++) {
            fs.writeFileSync(path.join(dir, "app1", "symbol" + i + ".cly_symbol"), "symbol" + i);
        }
        await db.collection(BUCKET + ".files").deleteMany({});
        await db.collection(BUCKET + ".chunks").deleteMany({});
    });

    afterEach(function() {
        countlyFs.gridfs.saveFile = originalSaveFile;
        fs.rmSync(dir, {recursive: true, force: true});
    });

    after(async function() {
        await db.collection(BUCKET + ".files").drop().catch(function() {});
        await db.collection(BUCKET + ".chunks").drop().catch(function() {});
        await db.client.close();
    });

    it("stores every file under its folder id and skips .gitignore", async function() {
        await importFiles(dir);
        var ids = (await db.collection(BUCKET + ".files").find({}, {projection: {_id: 1}}).toArray()).map(function(f) {
            return f._id;
        }).sort();
        var expected = ["icon.png"];
        for (var i = 0; i < 10; i++) {
            expected.push("app1/symbol" + i + ".cly_symbol");
        }
        ids.should.eql(expected.sort());
        (await readFile(db, "icon.png")).should.equal("icon");
        (await readFile(db, "app1/symbol7.cly_symbol")).should.equal("symbol7");
    });

    it("uploads at most 2 files at the same time", async function() {
        var running = 0;
        var maxRunning = 0;
        countlyFs.gridfs.saveFile = function(category, dest, source, options, callback) {
            running++;
            maxRunning = Math.max(maxRunning, running);
            originalSaveFile.call(countlyFs.gridfs, category, dest, source, options, function(err) {
                running--;
                callback(err);
            });
        };
        await importFiles(dir);
        maxRunning.should.equal(2);
        (await db.collection(BUCKET + ".files").countDocuments()).should.equal(11);
    });

    it("skips files already stored when run again", async function() {
        await importFiles(dir);
        var saved = [];
        countlyFs.gridfs.saveFile = function(category, dest, source, options, callback) {
            saved.push(options.id);
            originalSaveFile.call(countlyFs.gridfs, category, dest, source, options, callback);
        };
        fs.writeFileSync(path.join(dir, "app1", "symbol3.cly_symbol"), "symbol3 changed");
        await importFiles(dir);
        saved.should.eql(["app1/symbol3.cly_symbol"]);
        (await readFile(db, "app1/symbol3.cly_symbol")).should.equal("symbol3 changed");
        (await db.collection(BUCKET + ".files").countDocuments()).should.equal(11);
    });

    it("replaces a partial upload left by an interrupted run", async function() {
        // an upload killed midway leaves chunks without a files document
        await db.collection(BUCKET + ".chunks").insertOne({files_id: "app1/symbol5.cly_symbol", n: 0, data: new mongodb.Binary(Buffer.from("partial"))});
        await importFiles(dir);
        (await readFile(db, "app1/symbol5.cly_symbol")).should.equal("symbol5");
        (await db.collection(BUCKET + ".chunks").countDocuments({files_id: "app1/symbol5.cly_symbol"})).should.equal(1);
        (await db.collection(BUCKET + ".files").countDocuments()).should.equal(11);
    });
});
