var countlyFs = require("../../../api/utils/countlyFs");
var pluginManager = require("../../../plugins/pluginManager");
var fs = require("fs");
var path = require("path");
var async = require("async");

//how many files are uploaded at the same time, uploading whole folders at once exhausts the host on large folders (crash symbols)
var CONCURRENCY = 2;

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

function importFiles(pathToFolder, name, callback) {
    console.log("Procesing", name);
    var files = listFiles(path.resolve(__dirname, pathToFolder), "");
    var db = countlyFs.getHandler();
    var processed = 0;
    async.eachLimit(files, CONCURRENCY, function(file, done) {
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

function fs2gridfs() {
    importFiles("../../../frontend/express/public/appimages", "appimages", function() {
        importFiles("../../../frontend/express/public/userimages", "userimages", function() {
            importFiles("../../../plugins/crash_symbolication/crashsymbols", "crash_symbols", function() {
                countlyFs.getHandler().close();
            });
        });
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
    pluginManager.dbConnection("countly_fs").then((db) => {
        countlyFs.setHandler(db);
        if (myArgs[0] == "migrate") {
            if (myArgs[1] && myArgs[2] && conversions[myArgs[1]] && conversions[myArgs[1]][myArgs[2]]) {
                conversions[myArgs[1]][myArgs[2]]();
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

module.exports = {importFiles: importFiles};