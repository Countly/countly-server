/**
 * This module defines default model to handle event data
 * @module "api/lib/countly.event"
 * @extends module:api/lib/countly.model~countlyMetric
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const create = require('./countly.event.ts').default;

module.exports = create;
