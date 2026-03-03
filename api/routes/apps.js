/**
 * App management routes (/i/apps, /o/apps).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/apps
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateAppAdmin, validateUser, validateRead, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

const countlyApi = {
    mgmt: {
        apps: require('../parts/mgmt/apps.js'),
    }
};

// Helper: parse JSON args for /i/apps endpoints
function parseArgs(params) {
    if (params.qstring.args) {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            console.log('Parse /i/apps JSON failed %s', params.req.url, params.req.body);
        }
    }
}

// --- Write endpoints: /i/apps ---

router.all('/i/apps/create', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.createApp);
});

// /i/apps/update/plugins - must come before the generic /i/apps/update route
router.all('/i/apps/update/plugins', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateAppAdmin(params, countlyApi.mgmt.apps.updateAppPlugins);
});

router.all('/i/apps/update', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    if (params.qstring.app_id) {
        validateAppAdmin(params, countlyApi.mgmt.apps.updateApp);
    }
    else {
        validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.updateApp);
    }
});

router.all('/i/apps/delete', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.deleteApp);
});

router.all('/i/apps/reset', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.resetApp);
});

// Catch-all for /i/apps/* - dispatches to plugins or returns error
router.all('/i/apps/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/i/apps';
    const paths = params.paths;
    parseArgs(params);
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /create, /update, /delete or /reset');
    }
});

// --- Read endpoints: /o/apps ---

router.all('/o/apps/all', (req, res) => {
    const params = req.countlyParams;
    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.getAllApps);
});

router.all('/o/apps/mine', (req, res) => {
    const params = req.countlyParams;
    validateUser(params, countlyApi.mgmt.apps.getCurrentUserApps);
});

router.all('/o/apps/details', (req, res) => {
    const params = req.countlyParams;
    validateAppAdmin(params, countlyApi.mgmt.apps.getAppsDetails);
});

router.all('/o/apps/plugins', (req, res) => {
    const params = req.countlyParams;
    validateUserForGlobalAdmin(params, countlyApi.mgmt.apps.getAppPlugins);
});

// Catch-all for /o/apps/* - dispatches to plugins or returns error
router.all('/o/apps/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/o/apps';
    const paths = params.paths;
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /all, /mine, /details or /plugins');
    }
});

module.exports = router;
