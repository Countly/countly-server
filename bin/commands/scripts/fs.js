var countlyFs = require("../../../api/utils/countlyFs");
var pluginManager = require("../../../plugins/pluginManager");
var fs = require("fs");
var path = require("path");
var async = require("async");

//how many files are uploaded at the same time by default, uploading whole folders at once exhausts the host on large folders (crash symbols)
var DEFAULT_CONCURRENCY = 2;
//GridFS stores a second copy of the files in MongoDB, chunk documents and indexes add to their size
var GRIDFS_OVERHEAD = 1.1;
var GB = 1024 * 1024 * 1024;

var FOLDERS = [
    {path: "../../../frontend/express/public/appimages", name: "appimages"},
    {path: "../../../frontend/express/public/userimages", name: "userimages"},
    {path: "../../../plugins/crash_symbolication/crashsymbols", name: "crash_symbols"}
];

function listFiles(dir, prefix) {
    var exclude = [".", "..", ".gitignore"];
    var list = [];
    var files = [];
    try {
        files = fs.readdirSync(dir);
    }
    catch (err) {
        console.log("Cannot read", dir, err.message);
    }
    files.forEach(function(file) {
        if (exclude.indexOf(file) === -1) {
            var cur_path = path.join(dir, file);
            var stats = fs.lstatSync(cur_path);
            if (stats.isDirectory()) {
                console.log("Found directory", file);
                list = list.concat(listFiles(cur_path, file + "/"));
            }
            else {
                list.push({path: cur_path, name: file, id: prefix + file, size: stats.size});
            }
        }
    });
    return list;
}

//bytes of the files in folders that are not stored in GridFS yet
function bytesToStore(folders) {
    var db = countlyFs.getHandler();
    return Promise.all(folders.map(function(folder) {
        return db.collection(folder.name + ".files").find({}, {projection: {length: 1}}).toArray().then(function(stored) {
            var lengths = new Map(stored.map(function(file) {
                return [file._id, file.length];
            }));
            return listFiles(path.resolve(__dirname, folder.path), "").reduce(function(sum, file) {
                return lengths.get(file.id) === file.size ? sum : sum + file.size;
            }, 0);
        });
    })).then(function(sums) {
        return sums.reduce(function(a, b) {
            return a + b;
        }, 0);
    });
}

//error message when the MongoDB disk (dbStats of countly_fs) has no room for needed bytes, null when it has or does not report its size
function freeSpaceError(needed, stats) {
    if (!stats || typeof stats.fsTotalSize !== "number" || typeof stats.fsUsedSize !== "number") {
        console.log("MongoDB does not report its free disk space, not checking it");
        return null;
    }
    var required = needed * GRIDFS_OVERHEAD;
    var free = stats.fsTotalSize - stats.fsUsedSize;
    console.log("Files to store:", (needed / GB).toFixed(1), "GB, free on MongoDB disk:", (free / GB).toFixed(1), "GB");
    if (free < required) {
        return "Not enough free disk space for MongoDB: storing the files needs about " + (required / GB).toFixed(1) +
            " GB, only " + (free / GB).toFixed(1) + " GB is free. Free up space or grow the disk, then run the migration again.";
    }
    return null;
}

function importFiles(pathToFolder, name, callback, concurrency) {
    console.log("Procesing", name);
    var files = listFiles(path.resolve(__dirname, pathToFolder), "");
    var db = countlyFs.getHandler();
    var processed = 0;
    async.eachLimit(files, concurrency || DEFAULT_CONCURRENCY, function(file, done) {
        var progress = "[" + (++processed) + "/" + files.length + "]";
        db.collection(name + ".files").findOne({_id: file.id}, {projection: {length: 1}})
            .then(function(existing) {
                if (existing && existing.length === file.size) {
                    return true;
                }
                //remove partial upload left by an interrupted run, its chunks would block storing the file under the same id
                return db.collection(name + ".files").deleteOne({_id: file.id})
                    .then(function() {
                        return db.collection(name + ".chunks").deleteMany({files_id: file.id});
                    })
                    .then(function() {
                        return false;
                    });
            })
            .then(function(stored) {
                if (stored) {
                    console.log(progress, "File already stored", file.id);
                    return done();
                }
                countlyFs.gridfs.saveFile(name, file.name, file.path, {id: file.id, writeMode: "overwrite"}, function(err) {
                    console.log(progress, "Storing file finished", file.id, err);
                    done();
                });
            }, function(err) {
                console.log(progress, "Storing file failed", file.id, err);
                done();
            });
    }, function() {
        callback();
    });
}

function exportFiles(pathToFolder, name, callback) {
    console.log("Procesing", name);
    var dir = path.resolve(__dirname, pathToFolder);
    countlyFs.getHandler().collection(name + ".files").find({}, {_id: 1, filename: 1}).toArray(function(err, files) {
        if (!err && files) {
            async.each(files, function(file, done) {
                countlyFs.gridfs.getStreamById(name, file._id, function(err, stream) {
                    var dest = path.join(dir, file.filename);
                    if (file._id.indexOf("/") !== -1) {
                        //we found directory
                        console.log("Found directory", file);
                        var id = file._id.split("/").shift();
                        dest = path.join(dir, id, file.filename);
                        //create that directory
                        try {
                            fs.mkdirSync(path.join(dir, id));
                        }
                        catch (err) {
                            console.log(err);
                        }
                    }
                    countlyFs.fs.saveStream(name, dest, stream, function(err) {
                        console.log("Storing file finished", dest, err);
                        done();
                    });
                });
            }, function() {
                callback();
            });
        }
        else {
            callback();
        }
    });
}

function fs2gridfs(concurrency) {
    var db = countlyFs.getHandler();
    Promise.all([bytesToStore(FOLDERS), db.command({dbStats: 1})]).then(function(result) {
        var error = freeSpaceError(result[0], result[1]);
        if (error) {
            console.log(error);
            process.exitCode = 1;
            return db.close();
        }
        async.eachSeries(FOLDERS, function(folder, done) {
            importFiles(folder.path, folder.name, done, concurrency);
        }, function() {
            db.close();
        });
    }).catch(function(err) {
        console.log("Cannot check free disk space", err);
        process.exitCode = 1;
        db.close();
    });
}

function gridfs2fs() {
    exportFiles("../../../frontend/express/public/appimages", "appimages", function() {
        exportFiles("../../../frontend/express/public/userimages", "userimages", function() {
            exportFiles("../../../plugins/crash_symbolication/crashsymbols", "crash_symbols", function() {
                countlyFs.getHandler().close();
            });
        });
    });
}

var conversions = {
    "fs": {"gridfs": fs2gridfs},
    "gridfs": {"fs": gridfs2fs}
};

if (require.main === module) {
    var myArgs = process.argv.slice(2);
    var concurrency = DEFAULT_CONCURRENCY;
    if (typeof myArgs[3] !== "undefined" && myArgs[3] !== "") {
        concurrency = parseInt(myArgs[3], 10);
        if (!(concurrency >= 1) || String(concurrency) !== myArgs[3]) {
            console.log("Concurrency must be a whole number of 1 or more, got", myArgs[3]);
            process.exit(1);
        }
    }
    pluginManager.dbConnection("countly_fs").then((db) => {
        countlyFs.setHandler(db);
        if (myArgs[0] == "migrate") {
            if (myArgs[1] && myArgs[2] && conversions[myArgs[1]] && conversions[myArgs[1]][myArgs[2]]) {
                conversions[myArgs[1]][myArgs[2]](concurrency);
            }
            else {
                console.log("Storage from", myArgs[1], "to", myArgs[2], "not supported");
                countlyFs.getHandler().close();
            }
        }
        else {
            console.log("Command", myArgs[0], "not supported");
            countlyFs.getHandler().close();
        }
    });
}

module.exports = {importFiles: importFiles, bytesToStore: bytesToStore, freeSpaceError: freeSpaceError};