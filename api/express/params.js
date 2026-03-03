/**
 * Params construction middleware for the Countly API server.
 * Builds the Countly `params` object from an Express request and attaches
 * it as `req.countlyParams`. This replicates the URL parsing and qstring
 * construction logic from processRequest() lines 113-173 of requestProcessor.js.
 * @module api/express/params
 */

const url = require('url');
const common = require('../utils/common.js');

/**
 * Express middleware that constructs the Countly params object
 */
function paramsMiddleware(req, res, next) {
    // Set keep-alive headers (previously in handleRequest)
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');

    const urlParts = url.parse(req.url, true);
    const queryString = urlParts.query;
    const paths = urlParts.pathname.split("/");

    const params = {
        qstring: {},
        res: res,
        req: req,
        href: urlParts.href,
        urlParts: urlParts,
        paths: paths
    };

    // Fill in request object defaults (same as processRequest)
    params.req.method = params.req.method || "custom";
    params.req.headers = params.req.headers || {};
    params.req.socket = params.req.socket || {};
    params.req.connection = params.req.connection || {};

    // Copy query string params
    if (queryString) {
        for (let i in queryString) {
            params.qstring[i] = queryString[i];
        }
    }

    // Copy parsed body fields (from bodyParser middleware)
    if (req.countlyFields) {
        for (let i in req.countlyFields) {
            params.qstring[i] = req.countlyFields[i];
        }
    }

    // Copy body as qstring param (for programmatic/raw body access)
    if (params.req.body && typeof params.req.body === "object" && !req.countlyFields) {
        for (let i in params.req.body) {
            params.qstring[i] = params.req.body[i];
        }
    }

    // Transfer files and formDataUrl from body parser
    if (req.countlyFiles) {
        params.files = req.countlyFiles;
    }
    if (req.countlyFormDataUrl) {
        params.formDataUrl = req.countlyFormDataUrl;
    }

    // Validate app_id and user_id length early
    if (params.qstring.app_id && params.qstring.app_id.length !== 24) {
        return common.returnMessage(params, 400, 'Invalid parameter "app_id"');
    }

    if (params.qstring.user_id && params.qstring.user_id.length !== 24) {
        return common.returnMessage(params, 400, 'Invalid parameter "user_id"');
    }

    // Remove countly path prefix if configured
    if (common.config.path === "/" + paths[1]) {
        paths.splice(1, 1);
    }

    // Compute apiPath (first 2 path segments)
    let apiPath = '';
    for (let i = 1; i < paths.length; i++) {
        if (i > 2) {
            break;
        }
        apiPath += "/" + paths[i];
    }

    params.apiPath = apiPath;
    params.fullPath = paths.join("/");

    req.countlyParams = params;
    next();
}

module.exports = paramsMiddleware;
