/**
 * Kafka Plugin
 * Provides Kafka client management and exports for use by other modules
 */

const plugins = require('../../pluginManager.js');
const log = require('../../../api/utils/log.js')('kafka');
const common = require('../../../api/utils/common.js');
const countlyConfig = require('../../../api/config');

// Fix KafkaJS infinite loop bug - MUST be before any kafkajs imports
// See: https://github.com/tulios/kafkajs/issues/1704
require('./lib/kafkaRequestQueueFix');

const kafkajs = require('kafkajs');

// Import Kafka components
const KafkaClient = require('./lib/kafkaClient');
const KafkaProducer = require('./lib/kafkaProducer');
const KafkaConsumer = require('./lib/KafkaConsumer');
const KafkaBootstrapper = require('./lib/kafkaBootstrapper');

/** @type {KafkaClient|null} */
let kafkaClient = null;
/** @type {KafkaBootstrapper|null} */
let kafkaBootstrapper = null;


/**
 * Validate critical Kafka configuration to prevent system breakage
 * Only validates configs that would cause immediate failures
 * @param {Object} kafkaConfig - Kafka configuration object
 * @throws {Error} If configuration would break the system
 */
function validateKafkaConfig(kafkaConfig) {
    const errors = [];
    const warnings = [];

    // Critical: Must have brokers to connect
    if (!kafkaConfig.rdkafka?.brokers || !Array.isArray(kafkaConfig.rdkafka.brokers) || kafkaConfig.rdkafka.brokers.length === 0) {
        errors.push('kafka.rdkafka.brokers must be a non-empty array');
    }

    // Critical: Transaction timeout required when transactions enabled
    if (kafkaConfig.enableTransactions === true && !kafkaConfig.transactionTimeout) {
        errors.push('kafka.transactionTimeout is required when enableTransactions is true');
    }

    // Critical: Replication factor must be positive (0 would break topic creation)
    if (kafkaConfig.replicationFactor !== undefined && kafkaConfig.replicationFactor <= 0) {
        errors.push('kafka.replicationFactor must be greater than 0');
    }

    // Critical: Invalid JSON behavior must be valid option
    if (kafkaConfig.consumer?.invalidJsonBehavior && !['skip', 'fail'].includes(kafkaConfig.consumer.invalidJsonBehavior)) {
        errors.push('kafka.consumer.invalidJsonBehavior must be "skip" or "fail"');
    }

    // Critical: Auto offset reset must be valid
    if (kafkaConfig.consumer?.autoOffsetReset && !['earliest', 'latest'].includes(kafkaConfig.consumer.autoOffsetReset)) {
        errors.push('kafka.consumer.autoOffsetReset must be "earliest" or "latest"');
    }

    // Critical: SASL config completeness - if mechanism is set, credentials must be set
    const rdkafka = kafkaConfig.rdkafka || {};
    if (rdkafka.saslMechanism) {
        if (!rdkafka.saslUsername || !rdkafka.saslPassword) {
            errors.push('kafka.rdkafka.saslUsername and saslPassword are required when saslMechanism is set');
        }
        // Also require SSL or SASL_SSL security protocol when using SASL
        const secProto = String(rdkafka.securityProtocol || '').toUpperCase();
        if (!['SASL_PLAINTEXT', 'SASL_SSL'].includes(secProto)) {
            errors.push('kafka.rdkafka.securityProtocol must be SASL_PLAINTEXT or SASL_SSL when saslMechanism is set');
        }
    }

    // Warning: Heartbeat should be 1/3 to 1/6 of session timeout for stable consumer groups
    const consumer = kafkaConfig.consumer || {};
    const sessionTimeout = consumer.sessionTimeoutMs || 60000;
    const heartbeatInterval = consumer.heartbeatIntervalMs || 10000;
    const ratio = sessionTimeout / heartbeatInterval;
    if (ratio < 3 || ratio > 6) {
        warnings.push(`sessionTimeoutMs/heartbeatIntervalMs ratio is ${ratio.toFixed(1)} (recommended: 3-6). Current: ${sessionTimeout}ms/${heartbeatInterval}ms`);
    }

    // Log warnings but don't fail
    for (const warning of warnings) {
        log.w('Kafka config warning:', warning);
    }

    if (errors.length > 0) {
        throw new Error(`Kafka configuration validation failed: ${errors.join('; ')}`);
    }

    log.i('Kafka configuration validation passed');
}

/**
 * Handle Kafka initialization errors consistently
 * When Kafka is enabled, it's treated as a hard dependency - failures are fatal
 * @param {Error} error - The error that occurred
 * @param {string} context - Context where the error occurred
 * @throws {Error} Always throws the error when Kafka is enabled
 */
function handleKafkaError(error, context) {
    log.e(`Kafka initialization failed ${context}. Since Kafka is enabled, this is a fatal error.`, error);
    throw error;
}

/**
 * Initialize Kafka infrastructure and register with common object
 */
async function initializeKafka() {
    try {
        // Only initialize if Kafka is configured
        if (!countlyConfig.kafka || !countlyConfig.kafka.rdkafka || !countlyConfig.kafka.rdkafka.brokers) {
            log.i('Kafka not configured, skipping initialization');
            return;
        }

        // Check if Kafka is enabled
        if (countlyConfig.kafka.enabled === false) {
            log.i('Kafka is disabled in configuration, skipping initialization');
            return;
        }

        // Validate configuration before proceeding
        validateKafkaConfig(countlyConfig.kafka);

        // Create Kafka client from configuration
        kafkaClient = new KafkaClient();
        kafkaBootstrapper = new KafkaBootstrapper(kafkaClient);

        // Run bootstrap to ensure topics exist
        log.i('Running Kafka infrastructure bootstrap...');
        const bootstrapResult = await kafkaBootstrapper.bootstrap();

        if (!bootstrapResult.success) {
            log.e('Kafka bootstrap failed:', bootstrapResult.errors);
            throw new Error(`Kafka bootstrap failed: ${bootstrapResult.errors.join('; ')}`);
        }

        log.i('Kafka bootstrap completed successfully:', bootstrapResult.topics);

        // Add Kafka components to common object for use by other plugins
        common.kafkaClient = kafkaClient;
        common.KafkaProducer = KafkaProducer;
        common.KafkaConsumer = KafkaConsumer;

        // Register with plugin system
        plugins.dispatch('/database/register', {
            name: 'kafka',
            client: kafkaClient,
            producer: KafkaProducer,
            consumer: KafkaConsumer,
            type: 'kafka',
            description: 'Kafka event streaming platform'
        });

        onReady();

        log.i('Kafka client and components initialized and registered');
    }
    catch (error) {
        handleKafkaError(error, 'during initialization');
    }
    finally {
        // Clean up bootstrapper admin connection
        if (kafkaBootstrapper) {
            try {
                await kafkaBootstrapper.disconnect();
            }
            catch (err) {
                log.e('Error disconnecting bootstrapper:', err);
            }
        }
    }
}

/**
 * Get Kafka client instance
 * @returns {Object|null} Kafka client or null if not available
 */
function getClient() {
    return kafkaClient;
}

/**
 * @typedef {(kafkaClient: KafkaClient) => void} ReadyCallback
 * Callbacks to be executed when Kafka client is ready
 * @type {ReadyCallback[]}
 */
const onReadyCallbacks = [];

let initializationCompleted = false;

/**
 * Register/trigger callbacks when Kafka client is ready
 * NOTE: Temporary solution for push until kafka is fully integrated into core
 * @param {ReadyCallback=} callback - Callback to execute when Kafka client is ready. If omitted, just triggers existing callbacks if ready.
 */
function onReady(callback) {
    if (callback) {
        onReadyCallbacks.push(callback);
    }
    else {
        initializationCompleted = true;
    }
    if (initializationCompleted) {
        while (onReadyCallbacks.length) {
            const cb = onReadyCallbacks.shift();
            if (cb) {
                try {
                    cb(/** @type {KafkaClient} */(kafkaClient));
                }
                catch (err) {
                    log.e('Error in onReady callback:', err);
                }
            }
        }
    }
}

// Initialize on plugin load
initializeKafka().catch(error => {
    handleKafkaError(error, 'during plugin load');
});

// Export raw classes and utilities
module.exports = {
    KafkaClient,
    KafkaProducer,
    KafkaConsumer,
    KafkaBootstrapper,

    // Instance getter
    getClient,

    // Initialization
    initializeKafka,

    kafkajs,
    onReady
};