/**
 * Render/screenshot routes (/o/render).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/render
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUserForRead } = require('../utils/rights.js');
const authorize = require('../utils/authorizer.js');
const render = require('../utils/render.js');
var path = require('path');

// --- Read endpoints: /o/render ---

router.all('/o/render', (req, res) => {
    const params = req.countlyParams;
    validateUserForRead(params, function() {
        var options = {};
        var view = params.qstring.view || "";
        var route = params.qstring.route || "";
        var id = params.qstring.id || "";

        options.view = view + "#" + route;
        options.id = id ? "#" + id : "";

        var imageName = "screenshot_" + common.crypto.randomBytes(16).toString("hex") + ".png";

        options.savePath = path.resolve(__dirname, "../../frontend/express/public/images/screenshots/" + imageName);
        options.source = "core";

        authorize.save({
            db: common.db,
            multi: false,
            owner: params.member._id,
            ttl: 300,
            purpose: "LoginAuthToken",
            callback: function(err2, token) {
                if (err2) {
                    common.returnMessage(params, 400, 'Error creating token: ' + err2);
                    return false;
                }
                options.token = token;
                render.renderView(options, function(err3) {
                    if (err3) {
                        common.returnMessage(params, 400, 'Error creating screenshot. Please check logs for more information.');
                        return false;
                    }
                    common.returnOutput(params, {path: common.config.path + "/images/screenshots/" + imageName});
                });
            }
        });
    });
});

module.exports = router;
