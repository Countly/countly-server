// Proxy file - re-exports from TypeScript implementation
const { ignorePossibleDevices, checksumSaltVerification, validateRedirect } = require('./requestProcessorCommon.ts');
module.exports = { ignorePossibleDevices, checksumSaltVerification, validateRedirect };
