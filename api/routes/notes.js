/**
 * Notes routes - graph annotation notes.
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/notes
 */

const express = require('express');
const router = express.Router();
const { validateCreate, validateDelete, validateRead } = require('../utils/rights.js');
const countlyApi = {
    mgmt: {
        users: require('../parts/mgmt/users.js')
    }
};

// Helper: parse JSON args for notes endpoints
function parseArgs(params) {
    if (params.qstring.args) {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            console.log('Parse %s JSON failed %s', params.apiPath, params.req.url, params.req.body);
        }
    }
}

// --- Write endpoints: /i/notes ---

router.all('/i/notes/save', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateCreate(params, 'core', () => {
        countlyApi.mgmt.users.saveNote(params);
    });
});

router.all('/i/notes/delete', (req, res) => {
    const params = req.countlyParams;
    parseArgs(params);
    validateDelete(params, 'core', () => {
        countlyApi.mgmt.users.deleteNote(params);
    });
});

// --- Read endpoints: /o/notes ---

router.all('/o/notes', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', countlyApi.mgmt.users.fetchNotes);
});

module.exports = router;
