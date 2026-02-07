/**
 * Request processor module for jobServer
 * @module jobServer/requestProcessor
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const requestProcessor = require('./requestProcessor.ts');

module.exports = { processRequest: requestProcessor.processRequest };
