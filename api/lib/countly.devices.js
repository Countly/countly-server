/**
 * This module defines default model to handle devices data
 * @module "api/lib/countly.devices"
 * @extends module:api/lib/countly.model~countlyMetric
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const create = require('./countly.devices.ts').default;

module.exports = create;
