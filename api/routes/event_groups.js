/**
 * Event groups management routes (/i/event_groups).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/event_groups
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateCreate, validateUpdate, validateDelete } = require('../utils/rights.js');

const countlyApi = {
    mgmt: {
        eventGroups: require('../parts/mgmt/event_groups.js'),
    }
};

// --- Write endpoints: /i/event_groups ---

router.all('/i/event_groups/create', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.args) {
        common.returnMessage(params, 400, 'Error: args not found');
        return false;
    }
    try {
        params.qstring.args = JSON.parse(params.qstring.args);
        params.qstring.app_id = params.qstring.args.app_id;
    }
    catch (SyntaxError) {
        console.log('Parse /i/event_groups JSON failed %s', params.req.url, params.req.body);
        common.returnMessage(params, 400, 'Error: could not parse args');
        return false;
    }
    validateCreate(params, 'core', countlyApi.mgmt.eventGroups.create);
});

router.all('/i/event_groups/update', (req, res) => {
    const params = req.countlyParams;
    validateUpdate(params, 'core', countlyApi.mgmt.eventGroups.update);
});

router.all('/i/event_groups/delete', (req, res) => {
    const params = req.countlyParams;
    validateDelete(params, 'core', countlyApi.mgmt.eventGroups.remove);
});

module.exports = router;
