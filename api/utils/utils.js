// Proxy file - re-exports from TypeScript implementation
const { encrypt, decrypt, decrypt_old } = require('./utils.ts');
module.exports = { encrypt, decrypt, decrypt_old };
