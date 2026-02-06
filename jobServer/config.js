/**
 * Configuration for job runners
 * @module jobServer/config
 *
 * Proxy file - re-exports from TypeScript implementation
 */

const config = require('./config.ts').default;

module.exports = {
    PULSE: config.PULSE,
    BULL: config.BULL
};
