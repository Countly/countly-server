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

// --- Read endpoints: /o/date_presets ---

router.all('/o/date_presets/getAll', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(countlyApi.mgmt.datePresets.getAll, params);
});

router.all('/o/date_presets/getById', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(countlyApi.mgmt.datePresets.getById, params);
});

// Catch-all for /o/date_presets/* - dispatches to plugins or returns error
router.all('/o/date_presets/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/o/date_presets';
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
});

// --- Write endpoints: /i/date_presets ---

router.all('/i/date_presets/create', (req, res) => {
    const params = req.countlyParams;
    validateUserForWrite(params, countlyApi.mgmt.datePresets.create);
});

router.all('/i/date_presets/update', (req, res) => {
    const params = req.countlyParams;
    validateUserForWrite(params, countlyApi.mgmt.datePresets.update);
});

router.all('/i/date_presets/delete', (req, res) => {
    const params = req.countlyParams;
    validateUserForWrite(params, countlyApi.mgmt.datePresets.delete);
});

// Catch-all for /i/date_presets/* - dispatches to plugins or returns error
router.all('/i/date_presets/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/i/date_presets';
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
});

module.exports = router;
