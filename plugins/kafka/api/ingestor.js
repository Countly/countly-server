/**
 * Kafka Plugin - Ingestor Entry Point
 *
 * This file is loaded by the ingestor process via plugins.init({filename: "ingestor"})
 * Its primary purpose is to:
 * 1. Apply the KafkaJS RequestQueue fix before any Kafka clients are created
 * 2. Create TTL index for Kafka Connect status collection
 *
 * The fix MUST be applied before any code imports kafkajs, as it patches the
 * RequestQueue prototype to prevent the infinite scheduling loop bug (issues #1704, #1751).
 */

// Apply KafkaJS RequestQueue fix - MUST be first
require('./lib/kafkaRequestQueueFix');

const common = require('../../../api/utils/common.js');
const log = require('../../../api/utils/log.js')('kafka:ingestor');

/**
 * Create TTL index for Kafka Connect status collection
 * Called after DB connection is established
 */
function ensureKafkaIndexes() {
    // TTL index for connect status (7 days)
    common.db.collection('kafka_connect_status').createIndex(
        { updatedAt: 1 },
        { expireAfterSeconds: 604800, background: true }
    ).then(() => {
        log.i('Kafka connect status TTL index ensured');
    }).catch((e) => {
        log.d('Kafka connect status index creation:', e.message);
    });
}

// Create indexes when this module is loaded
// Note: This file is loaded AFTER plugins.connectToAllDatabases() completes,
// so common.db is already available at this point
// Adding a small delay for extra safety to ensure DB connection is fully ready
setTimeout(() => {
    if (common.db) {
        ensureKafkaIndexes();
    }
    else {
        log.w('common.db not available when kafka/ingestor.js loaded - TTL index not created');
    }
}, 1000);
