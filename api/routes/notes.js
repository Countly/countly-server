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

// POST/GET /i/notes - create or delete notes
router.all('/i/notes', (req, res) => {
    const params = req.countlyParams;

    if (params.qstring.args) {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            console.log('Parse %s JSON failed %s', params.apiPath, params.req.url, params.req.body);
        }
    }

    const paths = params.paths;
    switch (paths[3]) {
    case 'save':
        validateCreate(params, 'core', () => {
            countlyApi.mgmt.users.saveNote(params);
        });
        break;
    case 'delete':
        validateDelete(params, 'core', () => {
            countlyApi.mgmt.users.deleteNote(params);
        });
        break;
    }
});

// GET /o/notes - fetch notes
router.all('/o/notes', (req, res) => {
    const params = req.countlyParams;
    validateRead(params, 'core', countlyApi.mgmt.users.fetchNotes);
});

module.exports = router;
