// Proxy file - re-exports from TypeScript implementation
const { getTimeZones, timezoneValidation } = require('./timezones.ts');
module.exports = { getTimeZones, timezoneValidation };
