/**
 * This module defines preset configurations for user properties and event segments
 * @module "api/lib/countly.preset"
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const presetModule = require('./countly.preset.ts').default;
const { preset } = require('./countly.preset.ts');

module.exports = presetModule;
module.exports.preset = preset;
