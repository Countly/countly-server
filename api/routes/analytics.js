/**
 * Analytics and aggregate data routes (/o/analytics, /o/aggregate).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/analytics
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const calculatedDataManager = require('../utils/calculatedDataManager.js');
const plugins = require('../../plugins/pluginManager.ts');
const log = require('../utils/log.js')('core:api');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

const countlyApi = {
    data: {
        fetch: require('../parts/data/fetch.js'),
    }
};

// --- Read endpoints: /o/analytics ---

router.all('/o/analytics/dashboard', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchDashboard);
});

router.all('/o/analytics/countries', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchCountries);
});

router.all('/o/analytics/sessions', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    //takes also bucket=daily || monthly. extends period to full months if monthly
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchSessions);
});

router.all('/o/analytics/metric', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchMetric);
});

router.all('/o/analytics/tops', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTops);
});

router.all('/o/analytics/loyalty', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchLoyalty);
});

router.all('/o/analytics/frequency', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchFrequency);
});

router.all('/o/analytics/durations', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchDurations);
});

router.all('/o/analytics/events', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    //takes also bucket=daily || monthly. extends period to full months if monthly
    validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchEvents);
});

// Catch-all for /o/analytics/* - dispatches to plugins or returns error
router.all('/o/analytics/:action', (req, res) => {
    const params = req.countlyParams;
    const apiPath = '/o/analytics';
    const paths = params.paths;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
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
        common.returnMessage(params, 400, 'Invalid path, must be one of /dashboard,  /countries, /sessions, /metric, /tops, /loyalty, /frequency, /durations, /events');
    }
});

// --- Read endpoints: /o/aggregate ---

router.all('/o/aggregate', (req, res) => {
    const params = req.countlyParams;
    validateUser(params, () => {
        //Long task to run specific drill query. Give back task_id if running, result if done.
        if (params.qstring.query) {

            try {
                params.qstring.query = JSON.parse(params.qstring.query);
            }
            catch (ee) {
                log.e(ee);
                common.returnMessage(params, 400, 'Invalid query parameter');
                return;
            }

            if (params.qstring.query.appID) {
                if (Array.isArray(params.qstring.query.appID)) {
                    //make sure member has access to all apps in this list
                    for (var i = 0; i < params.qstring.query.appID.length; i++) {
                        if (!params.member.global_admin && params.member.user_of && params.member.user_of.indexOf(params.qstring.query.appID[i]) === -1) {
                            common.returnMessage(params, 401, 'User does not have access right for this app');
                            return;
                        }
                    }
                }
                else {
                    if (!params.member.global_admin && params.member.user_of && params.member.user_of.indexOf(params.qstring.query.appID) === -1) {
                        common.returnMessage(params, 401, 'User does not have access right for this app');
                        return;
                    }
                }
            }
            else {
                params.qstring.query.appID = params.qstring.app_id;
            }
            if (params.qstring.period) {
                params.qstring.query.period = params.qstring.query.period || params.qstring.period || "30days";
            }
            if (params.qstring.periodOffset) {
                params.qstring.query.periodOffset = params.qstring.query.periodOffset || params.qstring.periodOffset || 0;
            }

            calculatedDataManager.longtask({
                db: common.db,
                no_cache: params.qstring.no_cache,
                threshold: plugins.getConfig("api").request_threshold,
                app_id: params.qstring.query.app_id,
                query_data: params.qstring.query,
                outputData: function(err, data) {
                    if (err) {
                        common.returnMessage(params, 400, err);
                    }
                    else {
                        common.returnMessage(params, 200, data);
                    }
                }
            });
        }
        else {
            common.returnMessage(params, 400, 'Missing parameter "query"');
        }

    });
});

module.exports = router;
