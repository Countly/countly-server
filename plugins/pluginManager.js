/**
 * Proxy module that re-exports from TypeScript implementation.
 * Requires Node.js 22+ with --experimental-transform-types flag.
 * @module "plugins/pluginManager"
 */
const tsModule = require('./pluginManager.ts');
// Handle ES module wrapper - the instance is in .default when ES exports are present
module.exports = tsModule.default || tsModule;
