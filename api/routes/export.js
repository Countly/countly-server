/**
 * Export routes (/o/export).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/export
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForWrite, validateGlobalAdmin, dbUserHasAccessToCollection, getBaseAppFilter } = require('../utils/rights.js');
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
    }
};

// --- /o/export endpoints ---

router.all('/o/export/db', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        if (!params.qstring.collection) {
            common.returnMessage(params, 400, 'Missing parameter "collection"');
            return false;
        }
        if (typeof params.qstring.filter === "string") {
            try {
                params.qstring.query = JSON.parse(params.qstring.filter, common.reviver);
            }
            catch (ex) {
                common.returnMessage(params, 400, "Failed to parse query. " + ex.message);
                return false;
            }
        }
        else if (typeof params.qstring.query === "string") {
            try {
                params.qstring.query = JSON.parse(params.qstring.query, common.reviver);
            }
            catch (ex) {
                common.returnMessage(params, 400, "Failed to parse query. " + ex.message);
                return false;
            }
        }
        if (typeof params.qstring.projection === "string") {
            try {
                params.qstring.projection = JSON.parse(params.qstring.projection);
            }
            catch (ex) {
                params.qstring.projection = null;
            }
        }
        if (typeof params.qstring.project === "string") {
            try {
                params.qstring.projection = JSON.parse(params.qstring.project);
            }
            catch (ex) {
                params.qstring.projection = null;
            }
        }
        if (typeof params.qstring.sort === "string") {
            try {
                params.qstring.sort = JSON.parse(params.qstring.sort);
            }
            catch (ex) {
                params.qstring.sort = null;
            }
        }

        if (typeof params.qstring.formatFields === "string") {
            try {
                params.qstring.formatFields = JSON.parse(params.qstring.formatFields);
            }
            catch (ex) {
                params.qstring.formatFields = null;
            }
        }

        if (typeof params.qstring.get_index === "string") {
            try {
                params.qstring.get_index = JSON.parse(params.qstring.get_index);
            }
            catch (ex) {
                params.qstring.get_index = null;
            }
        }

        dbUserHasAccessToCollection(params, params.qstring.collection, (hasAccess) => {
            if (hasAccess || (params.qstring.db === "countly_drill" && params.qstring.collection === "drill_events") || (params.qstring.db === "countly" && params.qstring.collection === "events_data")) {
                var dbs = { countly: common.db, countly_drill: common.drillDb, countly_out: common.outDb, countly_fs: countlyFs.gridfs.getHandler() };
                var db = "";
                if (params.qstring.db && dbs[params.qstring.db]) {
                    db = dbs[params.qstring.db];
                }
                else {
                    db = common.db;
                }
                if (!params.member.global_admin && params.qstring.collection === "drill_events" || params.qstring.collection === "events_data") {
                    var base_filter = getBaseAppFilter(params.member, params.qstring.db, params.qstring.collection);
                    if (base_filter && Object.keys(base_filter).length > 0) {
                        params.qstring.query = params.qstring.query || {};
                        for (var key in base_filter) {
                            if (params.qstring.query[key]) {
                                params.qstring.query.$and = params.qstring.query.$and || [];
                                params.qstring.query.$and.push({[key]: base_filter[key]});
                                params.qstring.query.$and.push({[key]: params.qstring.query[key]});
                                delete params.qstring.query[key];
                            }
                            else {
                                params.qstring.query[key] = base_filter[key];
                            }
                        }
                    }
                }
                countlyApi.data.exports.fromDatabase({
                    db: db,
                    params: params,
                    collection: params.qstring.collection,
                    query: params.qstring.query,
                    projection: params.qstring.projection,
                    sort: params.qstring.sort,
                    limit: params.qstring.limit,
                    skip: params.qstring.skip,
                    type: params.qstring.type
                });
            }
            else {
                common.returnMessage(params, 401, 'User does not have access right for this collection');
            }
        });
    }, params);
});

router.all('/o/export/request', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        if (!params.qstring.path) {
            common.returnMessage(params, 400, 'Missing parameter "path"');
            return false;
        }
        if (typeof params.qstring.data === "string") {
            try {
                params.qstring.data = JSON.parse(params.qstring.data);
            }
            catch (ex) {
                console.log("Error parsing export request data", params.qstring.data, ex);
                params.qstring.data = {};
            }
        }

        if (params.qstring.projection) {
            try {
                params.qstring.projection = JSON.parse(params.qstring.projection);
            }
            catch (ex) {
                params.qstring.projection = {};
            }
        }

        if (params.qstring.columnNames) {
            try {
                params.qstring.columnNames = JSON.parse(params.qstring.columnNames);
            }
            catch (ex) {
                params.qstring.columnNames = {};
            }
        }
        if (params.qstring.mapper) {
            try {
                params.qstring.mapper = JSON.parse(params.qstring.mapper);
            }
            catch (ex) {
                params.qstring.mapper = {};
            }
        }
        countlyApi.data.exports.fromRequest({
            params: params,
            path: params.qstring.path,
            data: params.qstring.data,
            method: params.qstring.method,
            prop: params.qstring.prop,
            type: params.qstring.type,
            filename: params.qstring.filename,
            projection: params.qstring.projection,
            columnNames: params.qstring.columnNames,
            mapper: params.qstring.mapper,
        });
    }, params);
});

router.all('/o/export/requestQuery', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        if (!params.qstring.path) {
            common.returnMessage(params, 400, 'Missing parameter "path"');
            return false;
        }
        if (typeof params.qstring.data === "string") {
            try {
                params.qstring.data = JSON.parse(params.qstring.data);
            }
            catch (ex) {
                console.log("Error parsing export request data", params.qstring.data, ex);
                params.qstring.data = {};
            }
        }
        var my_name = JSON.stringify(params.qstring);

        var ff = taskmanager.longtask({
            db: common.db,
            threshold: plugins.getConfig("api").request_threshold,
            force: true,
            gridfs: true,
            binary: true,
            app_id: params.qstring.app_id,
            params: params,
            type: params.qstring.type_name || "tableExport",
            report_name: params.qstring.filename + "." + params.qstring.type,
            meta: JSON.stringify({
                "app_id": params.qstring.app_id,
                "query": params.qstring.query || {}
            }),
            name: my_name,
            view: "#/exportedData/tableExport/",
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
        });

        countlyApi.data.exports.fromRequestQuery({
            db_name: params.qstring.db,
            db: (params.qstring.db === "countly_drill") ? common.drillDb : (params.qstring.dbs === "countly_drill") ? common.drillDb : common.db,
            params: params,
            path: params.qstring.path,
            data: params.qstring.data,
            method: params.qstring.method,
            prop: params.qstring.prop,
            type: params.qstring.type,
            filename: params.qstring.filename + "." + params.qstring.type,
            output: function(data) {
                ff(null, data);
            }
        });
    }, params);
});

router.all('/o/export/download/:id', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    validateRead(params, "core", () => {
        if (paths[4] && paths[4] !== '') {
            common.db.collection("long_tasks").findOne({_id: paths[4]}, function(err, data) {
                if (err) {
                    common.returnMessage(params, 400, err);
                }
                else {
                    var filename = data.report_name;
                    var type = filename.split(".");
                    type = type[type.length - 1];
                    var myfile = paths[4];
                    var headers = {};

                    countlyFs.gridfs.getSize("task_results", myfile, {id: paths[4]}, function(err2, size) {
                        if (err2) {
                            common.returnMessage(params, 400, err2);
                        }
                        else if (parseInt(size) === 0) {
                            if (data.type !== "dbviewer") {
                                common.returnMessage(params, 400, "Export size is 0");
                            }
                            //handling older aggregations that aren't saved in countly_fs
                            else if (!data.gridfs && data.data) {
                                type = "json";
                                filename = data.name + "." + type;
                                headers = {};
                                headers["Content-Type"] = countlyApi.data.exports.getType(type);
                                headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename);
                                params.res.writeHead(200, headers);
                                params.res.write(data.data);
                                params.res.end();
                            }
                        }
                        else {
                            countlyFs.gridfs.getStream("task_results", myfile, {id: myfile}, function(err5, stream) {
                                if (err5) {
                                    common.returnMessage(params, 400, "Export stream does not exist");
                                }
                                else {
                                    headers = {};
                                    headers["Content-Type"] = countlyApi.data.exports.getType(type);
                                    headers["Content-Disposition"] = "attachment;filename=" + encodeURIComponent(filename);
                                    params.res.writeHead(200, headers);
                                    stream.pipe(params.res);
                                }
                            });
                        }
                    });
                }
            });
        }
        else {
            common.returnMessage(params, 400, 'Missing filename');
        }
    });
});

router.all('/o/export/data', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        if (!params.qstring.data) {
            common.returnMessage(params, 400, 'Missing parameter "data"');
            return false;
        }
        if (typeof params.qstring.data === "string" && !params.qstring.raw) {
            try {
                params.qstring.data = JSON.parse(params.qstring.data);
            }
            catch (ex) {
                common.returnMessage(params, 400, 'Incorrect parameter "data"');
                return false;
            }
        }
        countlyApi.data.exports.fromData(params.qstring.data, {
            params: params,
            type: params.qstring.type,
            filename: params.qstring.filename
        });
    }, params);
});

// Catch-all for /o/export/* - dispatches to plugins
router.all('/o/export/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/o/export';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path');
    }
});

module.exports = router;
