/**
 * Version route - returns Countly version information.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/version
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser } = require('../utils/rights.js');
const fs = require('fs');
const path = require('path');
const packageJson = require('../../package.json');

/**
 * Fetches version mark history (filesystem)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadFsVersionMarks(callback) {
    fs.readFile(path.resolve(__dirname, "./../../countly_marked_version.json"), function(err, data) {
        if (err) {
            callback(err, []);
        }
        else {
            var olderVersions = [];
            try {
                olderVersions = JSON.parse(data);
            }
            catch (parseErr) { //unable to parse file
                console.log(parseErr);
                callback(parseErr, []);
            }
            if (Array.isArray(olderVersions)) {
                //sort versions here.
                olderVersions.sort(function(a, b) {
                    if (typeof a.updated !== "undefined" && typeof b.updated !== "undefined") {
                        return a.updated - b.updated;
                    }
                    else {
                        return 1;
                    }
                });
                callback(null, olderVersions);
            }
        }
    });
}

/**
 * Fetches version mark history (database)
 * @param {function} callback - callback when response is ready
 * @returns {void} void
 */
function loadDbVersionMarks(callback) {
    common.db.collection('plugins').find({'_id': 'version'}, {"history": 1}).toArray(function(err, versionDocs) {
        if (err) {
            console.log(err);
            callback(err, []);
            return;
        }
        var history = [];
        if (versionDocs[0] && versionDocs[0].history) {
            history = versionDocs[0].history;
        }
        callback(null, history);
    });
}

// GET /o/countly_version - return version info
router.all('/o/countly_version', (req, res) => {
    const params = req.countlyParams;

    validateUser(params, () => {
        //load previos version info if exist
        loadFsVersionMarks(function(errFs, fsValues) {
            loadDbVersionMarks(function(errDb, dbValues) {
                //load mongodb version
                common.db.command({ buildInfo: 1 }, function(errorV, info) {
                    var response = {};
                    if (errorV) {
                        response.mongo = errorV;
                    }
                    else {
                        if (info && info.version) {
                            response.mongo = info.version;
                        }
                    }

                    if (errFs) {
                        response.fs = errFs;
                    }
                    else {
                        response.fs = fsValues;
                    }
                    if (errDb) {
                        response.db = errDb;
                    }
                    else {
                        response.db = dbValues;
                    }
                    response.pkg = packageJson.version || "";
                    var statusCode = (errFs && errDb) ? 400 : 200;
                    common.returnMessage(params, statusCode, response);
                });
            });
        });
    });
});

module.exports = router;
