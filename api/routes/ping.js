/**
 * Ping route - health check endpoint.
 * First route migrated from the legacy switch/case in requestProcessor.js
 * to Express-style routing as a proof of concept.
 * @module api/routes/ping
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');

router.all('/o/ping', (req, res) => {
    const params = req.countlyParams;
    common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}, (err) => {
        if (err) {
            return common.returnMessage(params, 404, 'DB Error');
        }
        else {
            return common.returnMessage(params, 200, 'Success');
        }
    });
});

module.exports = router;
