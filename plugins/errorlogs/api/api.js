var plugin = {},
    fs = require('fs'),
    EOL = require('os').EOL,
    path = require("path"),
    async = require('async'),
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

/**
 * Read from end
 * @param {string} file - File path
 * @param {number} size - Size
 * @return {object} - Promise
 */
const readFromEnd = (file, size) => {
    return common.p((resolve, reject) => {
        let stat = fs.statSync(file);

        fs.open(file, 'r', (err, fd) => {
            if (err) {
                return reject(err);
            }

            let read = size && stat.size > size ? size : stat.size,
                offset = stat.size > read ? stat.size - read : 0;

            fs.read(fd, Buffer.alloc(read), 0, read, offset, (readErr, readRes, buffer) => {
                if (readErr) {
                    return reject(readErr);
                }

                let string = buffer.toString('utf8');
                for (let i = 0; i < string.length; i++) {
                    if (string[i] === EOL[0] && (EOL.length === 1 || (string[i + 1] === EOL[1]))) {
                        return resolve(string.substr(EOL.length === 1 ? i + 1 : i + 2));
                    }
                }

                resolve(string);
            });
        });
    });
};

(function() {
    var logs = {api: "../../../log/countly-api.log", dashboard: "../../../log/countly-dashboard.log"};
    var dir = path.resolve(__dirname, '');
    //write api call
    plugins.register("/o/errorlogs", function(ob) {
        //get parameters
        var obParams = ob.params; //request params
        var validate = ob.validateUserForGlobalAdmin; //user validation
        var bytes = obParams.qstring.bytes ? parseInt(obParams.qstring.bytes) : 0;

        validate(obParams, function(params) {
            walk(dir + "/../../../log", function(errList, logfiles) {
                if (errList) {
                    console.error(errList);
                }
                else {
                    logs = logfiles;
                }
                if (params.qstring.log && logs[params.qstring.log]) {
                    if (params.qstring.download) {
                        if (bytes === 0) {
                            fs.readFile(dir + "/" + logs[params.qstring.log], 'utf8', function(err, data) {
                                if (err) {
                                    data = "";
                                }
                                common.returnRaw(params, 200, data, {'Content-Type': 'plain/text; charset=utf-8', 'Content-disposition': 'attachment; filename=countly-' + params.qstring.log + '.log'});
                            });
                        }
                        else {
                            readFromEnd(dir + "/" + logs[params.qstring.log], bytes)
                                .then(function(data) {
                                    common.returnRaw(params, 200, data, {'Content-Type': 'plain/text; charset=utf-8', 'Content-disposition': 'attachment; filename=countly-' + params.qstring.log + '.log'});
                                }).catch(function() {
                                    if (!params.res.finished) {
                                        common.returnRaw(params, 200, "", {'Content-Type': 'plain/text; charset=utf-8', 'Content-disposition': 'attachment; filename=countly-' + params.qstring.log + '.log'});
                                    }
                                });
                        }
                    }
                    else {
                        if (bytes === 0) {
                            fs.readFile(dir + "/" + logs[params.qstring.log], 'utf8', function(err, data) {
                                if (err) {
                                    data = "";
                                }
                                common.returnOutput(params, data);
                            });
                        }
                        else {
                            readFromEnd(dir + "/" + logs[params.qstring.log], bytes)
                                .then(function(data) {
                                    common.returnOutput(params, data);
                                }).catch(function() {
                                    if (!params.res.finished) {
                                        common.returnOutput(params, "");
                                    }
                                });
                        }
                    }
                }
                else {
                    var readLog = function(key, done) {
                        var finished = false;
                        if (bytes === 0) {
                            fs.readFile(dir + "/" + logs[key], 'utf8', function(err, data) {
                                if (err) {
                                    data = "";
                                }
                                done(null, {key: key, val: data});
                            });
                        }
                        else {
                            readFromEnd(dir + "/" + logs[key], bytes)
                                .then(function(data) {
                                    if (!finished) {
                                        finished = true;
                                        done(null, {key: key, val: data});
                                    }
                                }).catch(function() {
                                    if (!finished) {
                                        finished = true;
                                        done(null, {key: key, val: ""});
                                    }
                                });
                        }
                    };
                    async.map(Object.keys(logs), readLog, function(err, results) {
                        var ret = {};
                        for (var i = 0; i < results.length; i++) {
                            ret[results[i].key] = results[i].val;
                        }
                        common.returnOutput(params, ret);
                    });
                }
            });
        });
        return true;
    });

    plugins.register("/i/errorlogs", function(ob) {
        //get parameters
        var obParams = ob.params; //request params
        var validate = ob.validateUserForGlobalAdmin; //user validation

        validate(obParams, function(params) {
            walk(dir + "/../../../log", function(errList, logfiles) {
                if (errList) {
                    console.error(errList);
                }
                else {
                    logs = logfiles;
                }
                if (params.qstring.log && logs[params.qstring.log]) {
                    plugins.dispatch("/systemlogs", {params: params, action: "errologs_clear", data: {log: params.qstring.log}});
                    fs.truncate(dir + "/" + logs[params.qstring.log], 0, function(err) {
                        if (err) {
                            common.returnMessage(params, 200, err);
                        }
                        else {
                            common.returnMessage(params, 200, 'Success');
                        }
                    });
                }
            });
        });
        return true;
    });

    var walk = function(dir_path, done) {
        var results = {};
        fs.readdir(dir_path, function(err, list) {
            if (err) {
                return done(err);
            }
            var pending = list.length;
            if (!pending) {
                return done(null, results);
            }
            list.forEach(function(file) {
                if (file && file.startsWith("countly-") && file.endsWith(".log")) {
                    results[file.replace("countly-", "").replace(".log", "")] = '../../../log/' + file;
                    if (!--pending) {
                        done(null, results);
                    }
                }
                else
                if (!--pending) {
                    done(null, results);
                }
            });
        });
    };
}(plugin));

module.exports = plugin;
