var countlyFs = require("../../../api/utils/countlyFs");
var pluginManager = require("../../../plugins/pluginManager");
var fs = require("fs");
var path = require("path");
var async = require("async");

function importFiles(pathToFolder, name, callback, prefix) {
    prefix = prefix || "";
    console.log("Procesing", name);
    var dir = path.resolve(__dirname, pathToFolder);

    fs.readdir(dir, function(err, files) {
        var exclude = [".", "..", ".gitignore"];
        async.each(files, function(file, done) {
            if (exclude.indexOf(file) === -1) {
                var cur_path = path.join(dir, file);
                fs.lstat(cur_path, function(err, stats) {
                    if (stats.isDirectory()) {
                        console.log("Found directory", file);
                        importFiles(cur_path, name, function() {
                            done();
                        }, file + "/");
                    }
                    else {
                        countlyFs.gridfs.saveFile(name, file, cur_path, {id: prefix + file, writeMode: "overwrite"}, function(err) {
                            console.log("Storing file finished", prefix + file, err);
                            done();
                        });
                    }
                });
            }
            else {
                done();
            }
        }, function() {
            callback();
        });
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

var myArgs = process.argv.slice(2);

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