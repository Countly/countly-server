/**
 * TTL Cleanup Job
 * Cleans expired records inside TTL collections
 * This file proxies to the TypeScript implementation
 * @module api/jobs/ttlCleanup
 */
module.exports = require('./ttlCleanup.ts').default;
