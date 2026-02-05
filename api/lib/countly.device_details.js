/**
 * This module defines default model to handle device_details data
 * @module "api/lib/countly.device_details"
 * @extends module:api/lib/countly.model~countlyMetric
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const create = require('./countly.device_details.ts').default;

module.exports = create;
