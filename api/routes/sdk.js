/**
 * SDK routes - SDK data fetch and ingest endpoints.
 * Migrated from the legacy switch/case in requestProcessor.js.
 *
 * NOTE: These routes require validateAppForFetchAPI which is defined
 * locally in requestProcessor.js. It must be exported from there for
 * these routes to function.
 * @module api/routes/sdk
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const log = require('../utils/log.js')('core:api');
const { validateAppForFetchAPI } = require('../utils/requestProcessor.js');

/**
 * Shared SDK request handler for both /o/sdk and /i/sdk.
 * Both endpoints have identical logic.
 * @param {object} params - Countly params object
 * @returns {boolean|void} false on validation failure
 */
function handleSdkRequest(params) {
    params.ip_address = params.qstring.ip_address || common.getIpAddress(params.req);
    params.user = {};

    if (!params.qstring.app_key || !params.qstring.device_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
        return false;
    }
    else {
        params.qstring.device_id += "";
        params.app_user_id = common.crypto.createHash('sha1')
            .update(params.qstring.app_key + params.qstring.device_id + "")
            .digest('hex');
    }

    log.d('processing request %j', params.qstring);

    params.promises = [];

    validateAppForFetchAPI(params, () => { });
}

// GET /o/sdk - SDK data fetch
router.all('/o/sdk', (req, res) => {
    handleSdkRequest(req.countlyParams);
});

// POST/GET /i/sdk - SDK data ingest
router.all('/i/sdk', (req, res) => {
    handleSdkRequest(req.countlyParams);
});

module.exports = router;
