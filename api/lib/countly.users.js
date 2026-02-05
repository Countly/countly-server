/**
 * This module defines default model to handle users collection data
 * @module "api/lib/countly.users"
 * @extends module:api/lib/countly.model~countlyMetric
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const create = require('./countly.users.ts').default;

module.exports = create;
