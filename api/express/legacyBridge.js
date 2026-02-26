/**
 * Legacy bridge middleware for the Countly API server.
 * Catch-all middleware that delegates unhandled requests to the existing
 * processRequest() function. This ensures all existing routes (both core
 * switch/case and plugin dispatch) continue to work unchanged during the
 * incremental migration to Express-style routing.
 * @module api/express/legacyBridge
 */

/**
 * Create the legacy bridge middleware
 * @param {Function} processRequest - The legacy processRequest function from requestProcessor.js
 * @returns {Function} Express middleware
 */
function createLegacyBridge(processRequest) {
    return function legacyBridgeMiddleware(req, res, next) {
        const params = req.countlyParams;
        if (!params) {
            return next();
        }

        // Mark that params were pre-parsed by Express middleware,
        // so processRequest can skip its own URL parsing
        params._expressParsed = true;

        processRequest(params);
    };
}

module.exports = {createLegacyBridge};
