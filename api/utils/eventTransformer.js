// Proxy file - re-exports from TypeScript implementation
const { transformToKafkaEventFormat } = require('./eventTransformer.ts');
module.exports = { transformToKafkaEventFormat };
