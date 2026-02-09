/**
 * Manages job configurations, scheduling, and lifecycle
 * @module jobServer/JobManager
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const JobManager = require('./JobManager.ts').default;

module.exports = JobManager;
