/**
 * Request processor module for jobServer
 * Initializes the API and re-exports processRequest
 * @module jobServer/requestProcessor
 */

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

// Initialize the API
require('./api');

// Import and re-export processRequest
const { processRequest } = require('../api/utils/requestProcessor');

/**
 * Process request function type
 */
export type ProcessRequestFunction = typeof processRequest;

export { processRequest };
export default { processRequest };
