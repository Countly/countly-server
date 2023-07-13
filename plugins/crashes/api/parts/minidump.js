/**
* Module to process native minidumps
* @module plugins/crashes/api/parts/minidump
*/

var fs = require('fs'),
    cp = require('child_process'),
    path = require('path');

/** @lends module:plugins/crashes/api/parts/minidump */
var dump = {
    readMinidump: function(minidumpFile, symbolPath, callback) {
        var args = [path.resolve(minidumpFile)];
        if (typeof symbolPath === "function") {
            callback = symbolPath;
            symbolPath = null;
        }

        if (typeof symbolPath === "string") {
            args.push(symbolPath);
        }
        var m = cp.spawn(path.resolve(__dirname + "../../../bin/minidump_stackwalk"), args);

        var stdout = "", stderror = "";
        m.stdout.on('data', (data) => {
            stdout += data;
        });

        m.stderr.on('data', (data) => {
            stderror += data;
        });

        m.on('close', (code) => {
            callback(parseInt(code), stdout, stderror);
        });
    },
    /**
     *  Process the minidump from string by creating temp file, processing and deleting temp file
     *  @param {string} minidump - minidump data
     *  @param {string=} symbolPath - path to directory with symbols
     *  @param {function} callback - to call when minidump is processed
     */
    processMinidump: function(minidump, symbolPath, callback) {
        if (typeof symbolPath === "function") {
            callback = symbolPath;
            symbolPath = null;
        }

        var tempPath = path.join(path.resolve(__dirname + "../../../bin/dumps"), 'dump-');
        fs.mkdtemp(tempPath, function(err, folder) {
            if (err) {
                callback(err);
            }
            else {
                var filePath = path.join(folder, "d.dmp");
                fs.writeFile(filePath, minidump, "base64", function(err2) {
                    if (err2) {
                        callback(err2);
                    }
                    else {
                        dump.readMinidump(filePath, symbolPath, function(err3, stdout/*, stderr*/) {
                            if (err3) {
                                callback(err3);
                            }
                            else {
                                callback(null, stdout);
                            }
                            fs.unlink(filePath, function() {
                                fs.rmdir(path.dirname(filePath), function() {});
                            });
                        });
                    }
                });
            }
        });
    }
};

module.exports = dump;