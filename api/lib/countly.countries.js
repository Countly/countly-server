/**
 * This module defines default model to handle country/location data
 * @module "api/lib/countly.countries"
 * @extends module:api/lib/countly.model~countlyMetric
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const create = require('./countly.countries.ts').default;

module.exports = create;
