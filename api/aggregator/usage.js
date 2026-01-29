/**
 * Usage aggregation module for processing session and event data
 * This file proxies to the TypeScript implementation
 * @module api/aggregator/usage
 */
const tsModule = require('./usage.ts');
module.exports = tsModule.default || tsModule;
