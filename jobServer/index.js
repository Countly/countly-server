/**
 * Entry point for Countly's job management system
 * @module jobServer
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const indexModule = require('./index.ts');

module.exports = {
    Job: indexModule.Job
};
