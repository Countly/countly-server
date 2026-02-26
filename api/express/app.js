/**
 * Express app factory for the Countly API server.
 * Creates and configures an Express application that replaces the raw
 * http.createServer() handler, while preserving all existing behavior
 * through a middleware stack that bridges to the legacy request processor.
 * @module api/express/app
 */

const express = require('express');

/**
 * Create and configure the Express app for the API server
 * @param {object} options - Configuration options
 * @param {object} options.countlyConfig - Countly API config
 * @param {Function} options.processRequest - Legacy processRequest function
 * @param {object} options.plugins - Plugin manager instance
 * @param {Function} options.rateLimitMiddleware - Express rate limiting middleware
 * @returns {express.Application} Configured Express app
 */
function createApiApp({countlyConfig, processRequest, plugins, rateLimitMiddleware}) {
    const app = express();

    app.enable('trust proxy');

    // Disable express default headers we don't need
    app.disable('x-powered-by');
    app.disable('etag');

    // CORS for OPTIONS requests (replaces handleRequest OPTIONS block)
    app.options('*', (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "countly-token, Content-Type, Authorization");
        res.status(200).end();
    });

    // Body parser - formidable-based, replicates handleRequest POST parsing
    app.use(require('./bodyParser').createBodyParser(countlyConfig));

    // Params middleware - builds req.countlyParams from parsed request
    app.use(require('./params'));

    // Rate limiting (same logic as before, now as Express middleware)
    app.use(rateLimitMiddleware);

    // Core routes migrated from requestProcessor.js switch/case
    app.use(require('../routes/ping'));
    app.use(require('../routes/jwt'));
    app.use(require('../routes/token'));
    app.use(require('../routes/notes'));
    app.use(require('../routes/cms'));
    app.use(require('../routes/date_presets'));
    app.use(require('../routes/version'));
    app.use(require('../routes/sdk'));
    app.use(require('../routes/users'));
    app.use(require('../routes/apps'));
    app.use(require('../routes/event_groups'));
    app.use(require('../routes/tasks'));
    app.use(require('../routes/render'));
    app.use(require('../routes/app_users'));
    app.use(require('../routes/events'));
    app.use(require('../routes/system'));
    app.use(require('../routes/export'));
    app.use(require('../routes/analytics'));
    // /o with method-based dispatch - must come after specific /o/* routes
    app.use(require('../routes/data'));

    // Express router for plugin routes registered via plugins.apiRoute()
    const apiRouter = express.Router();
    plugins.mountApiRoutes(apiRouter);
    app.use(apiRouter);

    // Store router on app for later access (e.g., adding routes after init)
    app.set('apiRouter', apiRouter);

    // Legacy bridge - catch-all that delegates to processRequest
    app.use(require('./legacyBridge').createLegacyBridge(processRequest));

    return app;
}

module.exports = {createApiApp};
