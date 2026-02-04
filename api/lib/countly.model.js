/**
 * This module loads existing model or create one from default module if it does not exist
 * @module "api/lib/countly.model"
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const countlyModel = require('./countly.model.ts').default;

module.exports = countlyModel;
