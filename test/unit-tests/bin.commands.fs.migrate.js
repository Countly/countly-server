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

function importFiles(dir, concurrency) {
    return new Promise(function(resolve) {
        migrate.importFiles(dir, BUCKET, resolve, concurrency);
    });
}

function countUploads(counter) {
    var originalSaveFile = countlyFs.gridfs.saveFile;
    counter.running = 0;
    counter.max = 0;
    countlyFs.gridfs.saveFile = function(category, dest, source, options, callback) {
        counter.running++;
        counter.max = Math.max(counter.max, counter.running);
        originalSaveFile.call(countlyFs.gridfs, category, dest, source, options, function(err) {
            counter.running--;
            callback(err);
        });
    };
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

    it("uploads at most 2 files at the same time by default", async function() {
        var uploads = {};
        countUploads(uploads);
        await importFiles(dir);
        uploads.max.should.equal(2);
        (await db.collection(BUCKET + ".files").countDocuments()).should.equal(11);
    });

    it("uploads one file at a time with concurrency 1", async function() {
        var uploads = {};
        countUploads(uploads);
        await importFiles(dir, 1);
        uploads.max.should.equal(1);
        (await db.collection(BUCKET + ".files").countDocuments()).should.equal(11);
    });

    it("counts only bytes of files not stored yet", async function() {
        var folders = [{path: dir, name: BUCKET}];
        // icon.png (4 bytes) + symbol0..9 (7 bytes each)
        (await migrate.bytesToStore(folders)).should.equal(74);
        await importFiles(dir);
        (await migrate.bytesToStore(folders)).should.equal(0);
        fs.writeFileSync(path.join(dir, "app1", "symbol3.cly_symbol"), "symbol3 changed");
        (await migrate.bytesToStore(folders)).should.equal(15);
    });

    describe("free disk space check", function() {
        var GB = 1024 * 1024 * 1024;

        it("refuses when MongoDB disk has less free space than the files plus 10%", function() {
            var error = migrate.freeSpaceError(100 * GB, {fsTotalSize: 200 * GB, fsUsedSize: 95 * GB});
            error.should.equal("Not enough free disk space for MongoDB: storing the files needs about 110.0 GB, only 105.0 GB is free. Free up space or grow the disk, then run the migration again.");
        });

        it("passes when the files plus 10% fit", function() {
            (migrate.freeSpaceError(100 * GB, {fsTotalSize: 200 * GB, fsUsedSize: 89 * GB}) === null).should.be.true();
        });

        it("passes when MongoDB does not report its disk size", function() {
            (migrate.freeSpaceError(100 * GB, {db: "countly_fs"}) === null).should.be.true();
        });
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
