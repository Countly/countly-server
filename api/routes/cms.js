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

// GET /o/cms - fetch CMS entries
router.all('/o/cms', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;

    switch (paths[3]) {
    case 'entries':
        validateUserForMgmtReadAPI(countlyApi.mgmt.cms.getEntries, params);
        break;
    }
});

// POST/GET /i/cms - save entries, clear cache
router.all('/i/cms', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = params.apiPath;

    switch (paths[3]) {
    case 'save_entries':
        validateUserForWrite(params, countlyApi.mgmt.cms.saveEntries);
        break;
    case 'clear':
        validateUserForWrite(countlyApi.mgmt.cms.clearCache, params);
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
            common.returnMessage(params, 400, 'Invalid path, must be one of /save_entries or /clear');
        }
        break;
    }
});

module.exports = router;
