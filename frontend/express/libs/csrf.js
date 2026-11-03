/**
 * CSRF protection for dashboard requests, as the csurf package did in session mode
 * @module frontend/express/libs/csrf
 */

const Tokens = require("csrf");

const tokens = new Tokens();
const IGNORED_METHODS = {GET: true, HEAD: true, OPTIONS: true};

/**
 * Read the submitted token from the places csurf read it from
 * @param {object} req - request
 * @returns {*} token as submitted, not necessarily a string
 */
function submittedToken(req) {
    return (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        req.headers["csrf-token"] ||
        req.headers["xsrf-token"] ||
        req.headers["x-csrf-token"] ||
        req.headers["x-xsrf-token"];
}

/**
 * Create an error with csurf's fields, so existing error handlers keep working
 * @param {string} message - error message
 * @param {string} [code] - error code
 * @returns {Error} error with a 403 status
 */
function forbidden(message, code) {
    const err = new Error(message);
    err.status = err.statusCode = 403;
    err.expose = true;
    if (code) {
        err.code = code;
    }
    return err;
}

/**
 * Express middleware. The secret is kept in req.session.csrfSecret and tokens are salted per
 * response, so secrets and tokens created by csurf stay valid. Sets req.csrfToken() and rejects
 * any method other than GET, HEAD and OPTIONS without a valid token (code EBADCSRFTOKEN).
 * @param {object} req - request
 * @param {object} res - response
 * @param {Function} next - next middleware
 * @returns {void}
 */
function csrf(req, res, next) {
    if (!req.session) {
        return next(forbidden("misconfigured csrf"));
    }
    let secret = req.session.csrfSecret;
    let token;
    req.csrfToken = function() {
        let current = req.session && req.session.csrfSecret;
        if (token && current === secret) {
            return token;
        }
        if (current === undefined) {
            current = tokens.secretSync();
            req.session.csrfSecret = current;
        }
        secret = current;
        token = tokens.create(secret);
        return token;
    };
    if (!secret) {
        secret = tokens.secretSync();
        req.session.csrfSecret = secret;
    }
    if (!IGNORED_METHODS[req.method] && !tokens.verify(secret, submittedToken(req))) {
        return next(forbidden("invalid csrf token", "EBADCSRFTOKEN"));
    }
    next();
}

module.exports = csrf;
