/**
 * A logger in the shape nodemailer (and bunyan) expect, writing through Countly's logger
 * @module api/utils/mailLogger
 */
const util = require('node:util');
const log = require('./log.js')('mail');

/**
 * Create a nodemailer logger: trace/debug/info/warn/error/fatal(data, message, ...args).
 * Its output goes to Countly's "mail" logger, so the log level set for mail controls it.
 * @returns {object} logger
 */
function createMailLogger() {
    const logger = {};
    for (let level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
        logger[level] = (data, message, ...args) => {
            if (args && args.length) {
                message = util.format(message, ...args);
            }
            if (level === 'error' || level === 'fatal') {
                log.e(message, data || '');
            }
            else if (level === 'warn') {
                log.w(message, data || '');
            }
            else if (level === 'info') {
                log.i(message, data || '');
            }
            else {
                log.d(message, data || '');
            }
        };
    }
    //bunyan loggers have these too; nodemailer may call child()
    logger.child = () => logger;
    logger.level = () => undefined;
    return logger;
}

module.exports = createMailLogger;
