/**
 * Task manager routes (/i/tasks, /o/tasks).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/tasks
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const countlyCommon = require('../lib/countly.common.js');
const { validateRead, validateUser, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const taskmanager = require('../utils/taskmanager.js');
const plugins = require('../../plugins/pluginManager.ts');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

// --- Write endpoints: /i/tasks ---

router.all('/i/tasks/update', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.task_id) {
        common.returnMessage(params, 400, 'Missing parameter "task_id"');
        return false;
    }
    validateUserForWrite(params, () => {
        taskmanager.rerunTask({
            db: common.db,
            id: params.qstring.task_id
        }, (err, res) => {
            common.returnMessage(params, 200, res);
        });
    });
});

router.all('/i/tasks/delete', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.task_id) {
        common.returnMessage(params, 400, 'Missing parameter "task_id"');
        return false;
    }
    validateUserForWrite(params, () => {
        taskmanager.deleteResult({
            db: common.db,
            id: params.qstring.task_id
        }, (err, task) => {
            plugins.dispatch("/systemlogs", {params: params, action: "task_manager_task_deleted", data: task});
            common.returnMessage(params, 200, "Success");
        });
    });
});

router.all('/i/tasks/name', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.task_id) {
        common.returnMessage(params, 400, 'Missing parameter "task_id"');
        return false;
    }
    validateUserForWrite(params, () => {
        taskmanager.nameResult({
            db: common.db,
            id: params.qstring.task_id,
            name: params.qstring.name
        }, () => {
            common.returnMessage(params, 200, "Success");
        });
    });
});

router.all('/i/tasks/edit', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.task_id) {
        common.returnMessage(params, 400, 'Missing parameter "task_id"');
        return false;
    }
    validateUserForWrite(params, () => {
        const data = {
            "report_name": params.qstring.report_name,
            "report_desc": params.qstring.report_desc,
            "global": params.qstring.global + "" === 'true',
            "autoRefresh": params.qstring.autoRefresh + "" === 'true',
            "period_desc": params.qstring.period_desc
        };
        taskmanager.editTask({
            db: common.db,
            data: data,
            id: params.qstring.task_id
        }, (err, d) => {
            if (err) {
                common.returnMessage(params, 503, "Error");
            }
            else {
                common.returnMessage(params, 200, "Success");
            }
            plugins.dispatch("/systemlogs", {params: params, action: "task_manager_task_updated", data: d});
        });
    });
});

// Catch-all for /i/tasks/* - dispatches to plugins or returns error
router.all('/i/tasks/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/i/tasks';
    const paths = params.paths;
    if (!params.qstring.task_id) {
        common.returnMessage(params, 400, 'Missing parameter "task_id"');
        return false;
    }
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

// --- Read endpoints: /o/tasks ---

router.all('/o/tasks/all', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', () => {
        if (!params.qstring.query) {
            params.qstring.query = {};
        }
        if (typeof params.qstring.query === "string") {
            try {
                params.qstring.query = JSON.parse(params.qstring.query);
            }
            catch (ex) {
                params.qstring.query = {};
            }
        }
        if (params.qstring.query.$or) {
            params.qstring.query.$and = [
                {"$or": Object.assign([], params.qstring.query.$or) },
                {"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]}
            ];
            delete params.qstring.query.$or;
        }
        else {
            params.qstring.query.$or = [{"global": {"$ne": false}}, {"creator": params.member._id + ""}];
        }
        params.qstring.query.subtask = {$exists: false};
        params.qstring.query.app_id = params.qstring.app_id;
        if (params.qstring.app_ids && params.qstring.app_ids !== "") {
            var ll = params.qstring.app_ids.split(",");
            if (ll.length > 1) {
                params.qstring.query.app_id = {$in: ll};
            }
        }
        if (params.qstring.period) {
            countlyCommon.getPeriodObj(params);
            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
        }
        taskmanager.getResults({
            db: common.db,
            query: params.qstring.query
        }, (err, res) => {
            common.returnOutput(params, res || []);
        });
    });
});

router.all('/o/tasks/count', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', () => {
        if (!params.qstring.query) {
            params.qstring.query = {};
        }
        if (typeof params.qstring.query === "string") {
            try {
                params.qstring.query = JSON.parse(params.qstring.query);
            }
            catch (ex) {
                params.qstring.query = {};
            }
        }
        if (params.qstring.query.$or) {
            params.qstring.query.$and = [
                {"$or": Object.assign([], params.qstring.query.$or) },
                {"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]}
            ];
            delete params.qstring.query.$or;
        }
        else {
            params.qstring.query.$or = [{"global": {"$ne": false}}, {"creator": params.member._id + ""}];
        }
        if (params.qstring.period) {
            countlyCommon.getPeriodObj(params);
            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
        }
        taskmanager.getCounts({
            db: common.db,
            query: params.qstring.query
        }, (err, res) => {
            common.returnOutput(params, res || []);
        });
    });
});

router.all('/o/tasks/list', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', () => {
        if (!params.qstring.query) {
            params.qstring.query = {};
        }
        if (typeof params.qstring.query === "string") {
            try {
                params.qstring.query = JSON.parse(params.qstring.query);
            }
            catch (ex) {
                params.qstring.query = {};
            }
        }
        params.qstring.query.$and = [];
        if (params.qstring.query.creator && params.qstring.query.creator === params.member._id) {
            params.qstring.query.$and.push({"creator": params.member._id + ""});
        }
        else {
            params.qstring.query.$and.push({"$or": [{"global": {"$ne": false}}, {"creator": params.member._id + ""}]});
        }

        if (params.qstring.data_source !== "all" && params.qstring.app_id) {
            if (params.qstring.data_source === "independent") {
                params.qstring.query.$and.push({"app_id": "undefined"});
            }
            else {
                params.qstring.query.$and.push({"app_id": params.qstring.app_id});
            }
        }

        if (params.qstring.query.$or) {
            params.qstring.query.$and.push({"$or": Object.assign([], params.qstring.query.$or) });
            delete params.qstring.query.$or;
        }
        params.qstring.query.subtask = {$exists: false};
        if (params.qstring.period) {
            countlyCommon.getPeriodObj(params);
            params.qstring.query.ts = countlyCommon.getTimestampRangeQuery(params, false);
        }
        const skip = params.qstring.iDisplayStart;
        const limit = params.qstring.iDisplayLength;
        const sEcho = params.qstring.sEcho;
        const keyword = params.qstring.sSearch || null;
        const sortBy = params.qstring.iSortCol_0 || null;
        const sortSeq = params.qstring.sSortDir_0 || null;
        taskmanager.getTableQueryResult({
            db: common.db,
            query: params.qstring.query,
            page: {skip, limit},
            sort: {sortBy, sortSeq},
            keyword: keyword,
        }, (err, res) => {
            if (!err) {
                common.returnOutput(params, {aaData: res.list, iTotalDisplayRecords: res.count, iTotalRecords: res.count, sEcho});
            }
            else {
                common.returnMessage(params, 500, '"Query failed"');
            }
        });
    });
});

router.all('/o/tasks/task', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', () => {
        if (!params.qstring.task_id) {
            common.returnMessage(params, 400, 'Missing parameter "task_id"');
            return false;
        }
        taskmanager.getResult({
            db: common.db,
            id: params.qstring.task_id,
            subtask_key: params.qstring.subtask_key
        }, (err, res) => {
            if (res) {
                common.returnOutput(params, res);
            }
            else {
                common.returnMessage(params, 400, 'Task does not exist');
            }
        });
    });
});

router.all('/o/tasks/check', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', () => {
        if (!params.qstring.task_id) {
            common.returnMessage(params, 400, 'Missing parameter "task_id"');
            return false;
        }

        var tasks = params.qstring.task_id;

        try {
            tasks = JSON.parse(tasks);
        }
        catch (e) {
            // ignore
        }

        var isMulti = Array.isArray(tasks);

        taskmanager.checkResult({
            db: common.db,
            id: tasks
        }, (err, res) => {
            if (isMulti && res) {
                common.returnMessage(params, 200, res);
            }
            else if (res) {
                common.returnMessage(params, 200, res.status);
            }
            else {
                common.returnMessage(params, 400, 'Task does not exist');
            }
        });
    });
});

// Catch-all for /o/tasks/* - dispatches to plugins or returns error
router.all('/o/tasks/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/o/tasks';
    const paths = params.paths;
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
