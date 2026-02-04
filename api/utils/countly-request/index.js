/**
 * Countly request wrapper module using got library
 * @module api/utils/countly-request
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const countlyRequest = require('./index.ts');

module.exports = countlyRequest.default;
module.exports.convertOptionsToGot = countlyRequest.convertOptionsToGot;
