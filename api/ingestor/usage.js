/**
 * Usage module for ingestor - handles location, session, and metrics processing
 * This file proxies to the TypeScript implementation
 * @module api/ingestor/usage
 */
const tsModule = require('./usage.ts');
module.exports = tsModule.default || tsModule;
