/**
 * Date presets routes - custom date range presets.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/date_presets
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const plugins = require('../../plugins/pluginManager.ts');
const { validateUser, validateUserForWrite, validateRead, validateGlobalAdmin } = require('../utils/rights.js');
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataReadAPI = validateRead;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;
const countlyApi = {
    mgmt: {
        datePresets: require('../parts/mgmt/date_presets.js')
    }
};

// GET /o/date_presets - fetch date presets
router.all('/o/date_presets', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = params.apiPath;

    switch (paths[3]) {
    case 'getAll':
        validateUserForMgmtReadAPI(countlyApi.mgmt.datePresets.getAll, params);
        break;
    case 'getById':
        validateUserForMgmtReadAPI(countlyApi.mgmt.datePresets.getById, params);
        break;
    default:
        if (!plugins.dispatch(apiPath, {
            params: params,
            validateUserForDataReadAPI: validateUserForDataReadAPI,
            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
            paths: paths,
            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
            validateUserForGlobalAdmin: validateUserForGlobalAdmin
        })) {
            common.returnMessage(params, 400, 'Invalid path, must be one of /getAll /getById');
        }
        break;
    }
});

// POST/GET /i/date_presets - create, update, delete date presets
router.all('/i/date_presets', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = params.apiPath;

    switch (paths[3]) {
    case 'create':
        validateUserForWrite(params, countlyApi.mgmt.datePresets.create);
        break;
    case 'update':
        validateUserForWrite(params, countlyApi.mgmt.datePresets.update);
        break;
    case 'delete':
        validateUserForWrite(params, countlyApi.mgmt.datePresets.delete);
        break;
    default:
        if (!plugins.dispatch(apiPath, {
            params: params,
            validateUserForDataReadAPI: validateUserForDataReadAPI,
            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
            paths: paths,
            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
            validateUserForGlobalAdmin: validateUserForGlobalAdmin
        })) {
            common.returnMessage(params, 400, 'Invalid path, must be one of /create /update or /delete');
        }
        break;
    }
});

module.exports = router;
