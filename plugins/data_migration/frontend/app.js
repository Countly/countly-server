var pluginOb = {},
    countlyConfig = require("../../../frontend/express/config");
const fs = require('fs');
const path = require('path');
const common = require('../../../api/utils/common.js');

/**
 * Validate a filename before using it as a path segment.
 * @param {string} filename - filename
 * @returns {string|null} safe filename or null
 */
function safeFilename(filename) {
    filename = filename + "";
    if (filename && common.sanitizeFilename(filename) === filename) {
        return filename;
    }
    return null;
}

/**
 * Resolve a filename under a base path after filename validation.
 * @param {string} basePath - base directory
 * @param {string} filename - filename to resolve under base directory
 * @returns {string|null} contained path or null
 */
function safePathIn(basePath, filename) {
    filename = safeFilename(filename);
    if (!filename) {
        return null;
    }
    basePath = path.resolve(basePath);
    var resolvedPath = path.resolve(basePath, filename);
    if (resolvedPath.indexOf(basePath + path.sep) === 0) {
        return resolvedPath;
    }
    return null;
}

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        app.get(countlyConfig.path + '/data-migration/download', function(req, res) {
            if (req.session && req.session.gadm) {
                //asked by query id
                if (req.query && req.query.id) {
                    var exportid = safeFilename(req.query.id);
                    if (!exportid) {
                        res.status(400).send('Invalid export file');
                        return;
                    }
                    countlyDb.collection("data_migrations").findOne({_id: exportid}, function(err, data) {
                        if (!err && data) {
                            var myfile = safePathIn(path.resolve(__dirname, './../export'), exportid + '.tar.gz');
                            if (data.export_path && data.export_path !== '') {
                                myfile = data.export_path;
                            }
                            if (fs.existsSync(myfile)) {
                                res.set('Content-Type', 'application/x-gzip');
                                res.download(myfile, req.query.id + '.tar.gz');
                                return;
                            }
                            else {
                                res.status(404).send('Export file not found');
                                return;
                            }
                        }
                    });
                }
                if (req.query && req.query.logfile) {
                    var logFilePath = safePathIn(path.resolve(__dirname, '../../../log'), req.query.logfile);
                    if (!logFilePath) {
                        res.status(400).send('Invalid log file');
                        return;
                    }
                    if (fs.existsSync(logFilePath)) {
                        res.set('Content-Type', 'text/plain');
                        res.download(logFilePath, req.query.logfile);
                        return;
                    }
                    else {
                        res.status(404).send('Log file not found');
                        return;
                    }

                }
            }
        });
    };
}(pluginOb));

module.exports = pluginOb;
