/**
 * Countly no longer depends on bunyan. Copies of extend/mail.debug.example.js made before that
 * still require('bunyan') to create the nodemailer logger; this keeps them working and sends
 * their output through Countly's mail logger instead.
 * @module api/utils/bunyan-compat
 */
const createMailLogger = require('../mailLogger.js');

module.exports = {
    createLogger: function() {
        return createMailLogger();
    }
};
