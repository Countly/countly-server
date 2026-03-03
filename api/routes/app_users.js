/**
 * App Users routes (/i/app_users, /o/app_users).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/app_users
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForRead, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');
const taskmanager = require('../utils/taskmanager.js');
var countlyFs = require('../utils/countlyFs.js');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

const countlyApi = {
    data: {
        exports: require('../parts/data/exports.js'),
    },
    mgmt: {
        appUsers: require('../parts/mgmt/app_users.js'),
    }
};

// --- Write endpoints: /i/app_users ---

router.all('/i/app_users/create', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    if (!params.qstring.data) {
        common.returnMessage(params, 400, 'Missing parameter "data"');
        return false;
    }
    else if (typeof params.qstring.data === "string") {
        try {
            params.qstring.data = JSON.parse(params.qstring.data);
        }
        catch (ex) {
            console.log("Could not parse data", params.qstring.data);
            common.returnMessage(params, 400, 'Could not parse parameter "data": ' + params.qstring.data);
            return false;
        }
    }
    if (!Object.keys(params.qstring.data).length) {
        common.returnMessage(params, 400, 'Parameter "data" cannot be empty');
        return false;
    }
    validateUserForWrite(params, function() {
        countlyApi.mgmt.appUsers.create(params.qstring.app_id, params.qstring.data, params, function(err, result) {
            if (err) {
                common.returnMessage(params, 400, err);
            }
            else {
                common.returnMessage(params, 200, 'User Created: ' + JSON.stringify(result));
            }
        });
    });
});

router.all('/i/app_users/update', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    if (!params.qstring.update) {
        common.returnMessage(params, 400, 'Missing parameter "update"');
        return false;
    }
    else if (typeof params.qstring.update === "string") {
        try {
            params.qstring.update = JSON.parse(params.qstring.update);
        }
        catch (ex) {
            console.log("Could not parse update", params.qstring.update);
            common.returnMessage(params, 400, 'Could not parse parameter "update": ' + params.qstring.update);
            return false;
        }
    }
    if (!Object.keys(params.qstring.update).length) {
        common.returnMessage(params, 400, 'Parameter "update" cannot be empty');
        return false;
    }
    if (!params.qstring.query) {
        common.returnMessage(params, 400, 'Missing parameter "query"');
        return false;
    }
    else if (typeof params.qstring.query === "string") {
        try {
            params.qstring.query = JSON.parse(params.qstring.query);
        }
        catch (ex) {
            console.log("Could not parse query", params.qstring.query);
            common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
            return false;
        }
    }
    validateUserForWrite(params, function() {
        countlyApi.mgmt.appUsers.count(params.qstring.app_id, params.qstring.query, function(err, count) {
            if (err || count === 0) {
                common.returnMessage(params, 400, 'No users matching criteria');
                return false;
            }
            if (count > 1 && !params.qstring.force) {
                common.returnMessage(params, 400, 'This query would update more than one user');
                return false;
            }
            countlyApi.mgmt.appUsers.update(params.qstring.app_id, params.qstring.query, params.qstring.update, params, function(err2) {
                if (err2) {
                    common.returnMessage(params, 400, err2);
                }
                else {
                    common.returnMessage(params, 200, 'User Updated');
                }
            });
        });
    });
});

router.all('/i/app_users/delete', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    if (!params.qstring.query) {
        common.returnMessage(params, 400, 'Missing parameter "query"');
        return false;
    }
    else if (typeof params.qstring.query === "string") {
        try {
            params.qstring.query = JSON.parse(params.qstring.query);
        }
        catch (ex) {
            console.log("Could not parse query", params.qstring.query);
            common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
            return false;
        }
    }
    if (!Object.keys(params.qstring.query).length) {
        common.returnMessage(params, 400, 'Parameter "query" cannot be empty, it would delete all users. Use clear app instead');
        return false;
    }
    validateUserForWrite(params, function() {
        countlyApi.mgmt.appUsers.count(params.qstring.app_id, params.qstring.query, function(err, count) {
            if (err || count === 0) {
                common.returnMessage(params, 400, 'No users matching criteria');
                return false;
            }
            if (count > 1 && !params.qstring.force) {
                common.returnMessage(params, 400, 'This query would delete more than one user');
                return false;
            }
            countlyApi.mgmt.appUsers.delete(params.qstring.app_id, params.qstring.query, params, function(err2) {
                if (err2) {
                    common.returnMessage(params, 400, err2);
                }
                else {
                    common.returnMessage(params, 200, 'User deleted');
                }
            });
        });
    });
});

/**
 * @api {get} /i/app_users/deleteExport/:id Deletes user export.
 * @apiName Delete user export
 * @apiGroup App User Management
 * @apiDescription Deletes user export.
 *
 * @apiParam {Number} id Id of export.
 *
 * @apiQuery {String} app_id Application id
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "result":"Export deleted"
 * }
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_id\""
 * }
 */
router.all('/i/app_users/deleteExport/:id', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    validateUserForWrite(params, function() {
        countlyApi.mgmt.appUsers.deleteExport(paths[4], params, function(err) {
            if (err) {
                common.returnMessage(params, 400, err);
            }
            else {
                common.returnMessage(params, 200, 'Export deleted');
            }
        });
    });
});

/**
 * @api {get} /i/app_users/export Exports all data collected about app user
 * @apiName Export user data
 * @apiGroup App User Management
 *
 * @apiDescription Creates export and stores in database.
 * @apiQuery {String} app_id Application id
 * @apiQuery {String} query Query to match users to run export on.
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *   "result": "appUser_644658291e95e720503d5087_1.json"
 * }
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_id\""
 * }
 */
router.all('/i/app_users/export', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForWrite(params, function() {
        taskmanager.checkIfRunning({
            db: common.db,
            params: params
        }, function(task_id) {
            if (task_id) {
                common.returnOutput(params, {task_id: task_id});
            }
            else {
                if (!params.qstring.query) {
                    common.returnMessage(params, 400, 'Missing parameter "query"');
                    return false;
                }
                else if (typeof params.qstring.query === "string") {
                    try {
                        params.qstring.query = JSON.parse(params.qstring.query);
                    }
                    catch (ex) {
                        console.log("Could not parse query", params.qstring.query);
                        common.returnMessage(params, 400, 'Could not parse parameter "query": ' + params.qstring.query);
                        return false;
                    }
                }

                var my_name = "";
                if (params.qstring.query) {
                    my_name = JSON.stringify(params.qstring.query);
                }

                countlyApi.mgmt.appUsers.export(params.qstring.app_id, params.qstring.query || {}, params, taskmanager.longtask({
                    db: common.db,
                    threshold: plugins.getConfig("api").request_threshold,
                    force: false,
                    app_id: params.qstring.app_id,
                    params: params,
                    type: "AppUserExport",
                    report_name: "User export",
                    meta: JSON.stringify({
                        "app_id": params.qstring.app_id,
                        "query": params.qstring.query || {}
                    }),
                    name: my_name,
                    view: "#/exportedData/AppUserExport/",
                    processData: function(err, result, callback) {
                        if (!err) {
                            callback(null, result);
                        }
                        else {
                            callback(err, '');
                        }
                    },
                    outputData: function(err, data) {
                        if (err) {
                            common.returnMessage(params, 400, err);
                        }
                        else {
                            common.returnMessage(params, 200, data);
                        }
                    }
                }));
            }
        });
    });
});

// Catch-all for /i/app_users/* - dispatches to plugins
router.all('/i/app_users/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/i/app_users';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
    }
});

// --- Read endpoints: /o/app_users ---

router.all('/o/app_users/loyalty', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForRead(params, countlyApi.mgmt.appUsers.loyalty);
});

/**
 * @api {get} /o/app_users/download/:id Downloads user export.
 * @apiName Download user export
 * @apiGroup App User Management
 * @apiDescription Downloads users export
 *
 * @apiParam {Number} id Id of export.
 *
 * @apiQuery {String} app_id Application id
 *
 * @apiErrorExample {json} Error-Response:
 * HTTP/1.1 400 Bad Request
 * {
 *  "result": "Missing parameter \"app_id\""
 * }
 */
router.all('/o/app_users/download/:id', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    if (paths[4] && paths[4] !== '') {
        validateUserForRead(params, function() {
            var filename = paths[4].split('.');
            new Promise(function(resolve) {
                if (filename[0].startsWith("appUser_")) {
                    filename[0] = filename[0] + '.tar.gz';
                    resolve();
                }
                else { //we have task result. Try getting from there
                    taskmanager.getResult({id: filename[0]}, function(err, result) {
                        if (result && result.data) {
                            filename[0] = result.data;
                            filename[0] = filename[0].replace(/"/g, '');
                        }
                        resolve();
                    });
                }
            }).then(function() {
                var myfile = '../../export/AppUser/' + filename[0];
                countlyFs.gridfs.getSize("appUsers", myfile, {id: filename[0]}, function(error, size) {
                    if (error) {
                        common.returnMessage(params, 400, error);
                    }
                    else if (parseInt(size) === 0) {
                        //export does not exist. lets check out export collection.
                        var eid = filename[0].split(".");
                        eid = eid[0];

                        var cursor = common.db.collection("exports").find({"_eid": eid}, {"_eid": 0, "_id": 0});
                        var options = {"type": "stream", "filename": eid + ".json", params: params};
                        params.res.writeHead(200, {
                            'Content-Type': 'application/x-gzip',
                            'Content-Disposition': 'inline; filename="' + eid + '.json'
                        });
                        options.streamOptions = {};
                        if (options.type === "stream" || options.type === "json") {
                            options.streamOptions.transform = function(doc) {
                                doc._id = doc.__id;
                                delete doc.__id;
                                return JSON.stringify(doc);
                            };
                        }

                        options.output = options.output || function(stream) {
                            countlyApi.data.exports.stream(options.params, stream, options);
                        };
                        options.output(cursor);
                    }
                    else {
                        countlyFs.gridfs.getStream("appUsers", myfile, {id: filename[0]}, function(err, stream) {
                            if (err) {
                                common.returnMessage(params, 400, "Export doesn't exist");
                            }
                            else {
                                params.res.writeHead(200, {
                                    'Content-Type': 'application/x-gzip',
                                    'Content-Length': size,
                                    'Content-Disposition': 'inline; filename="' + filename[0]
                                });
                                stream.pipe(params.res);
                            }
                        });
                    }
                });
            });
        });
    }
    else {
        common.returnMessage(params, 400, 'Missing filename');
    }
});

// Catch-all for /o/app_users/* - dispatches to plugins
router.all('/o/app_users/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/o/app_users';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
    }
});

module.exports = router;
