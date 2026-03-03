/**
 * CMS routes - content management system entries and cache.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/cms
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
        cms: require('../parts/mgmt/cms.js')
    }
};

// --- Read endpoints: /o/cms ---

router.all('/o/cms/entries', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(countlyApi.mgmt.cms.getEntries, params);
});

// --- Write endpoints: /i/cms ---

router.all('/i/cms/save_entries', (req, res) => {
    const params = req.countlyParams;
    validateUserForWrite(params, countlyApi.mgmt.cms.saveEntries);
});

router.all('/i/cms/clear', (req, res) => {
    const params = req.countlyParams;
    validateUserForWrite(countlyApi.mgmt.cms.clearCache, params);
});

// Catch-all for /i/cms/* - dispatches to plugins or returns error
router.all('/i/cms/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/i/cms';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /save_entries or /clear');
    }
});

module.exports = router;
