const { Kafka, logLevel } = require('kafkajs');
const logFactory = require('../../../../api/utils/log.js');
const log = logFactory('kafka:client');
const countlyConfig = require('../../../../api/config');
const kafkaRequestQueueFix = require('./kafkaRequestQueueFix');

/**
 * Map Countly log level string to KafkaJS numeric logLevel
 * @param {string} countlyLevel - Countly level ('debug','info','warn','error')
 * @returns {number} KafkaJS logLevel enum value
 */
const COUNTLY_TO_KAFKA_LEVEL = {
    debug: logLevel.DEBUG,
    info: logLevel.INFO,
    warn: logLevel.WARN,
    error: logLevel.ERROR,
};

/**
 * Convert Countly log level string to KafkaJS numeric logLevel
 * Defaults to WARN if level is unrecognized or not set to avoid excessive KafkaJS logging
 * @param {string} countlyLevel - Countly log level string
 * @return {number} Corresponding KafkaJS logLevel enum value
 */
function countlyLevelToKafkaLevel(countlyLevel) {
    return COUNTLY_TO_KAFKA_LEVEL[countlyLevel] ?? logLevel.WARN;
}

/**
 * Map KafkaJS numeric level to Countly logger method name
 */
const KAFKA_LEVEL_TO_METHOD = {
    [logLevel.ERROR]: 'e',
    [logLevel.WARN]: 'w',
    [logLevel.INFO]: 'i',
    [logLevel.DEBUG]: 'd',
};

/**
 * Create a KafkaJS logCreator that routes internal KafkaJS logging
 * through Countly's logger.
 *
 * KafkaJS namespaces (e.g. "Consumer", "Producer", "Admin") become
 * sub-loggers: 'kafka:client:Consumer', 'kafka:client:Producer', etc.
 *
 * @returns {Function} KafkaJS logCreator function
 */
function createCountlyLogCreator() {
    const subLoggers = {};

    return () => {
        return ({ namespace, level, log: logEntry }) => {
            const subLog = namespace
                ? (subLoggers[namespace] ??= log.sub(namespace))
                : log;

            // eslint-disable-next-line no-unused-vars
            const { message, timestamp: _ts, logger: _lgr, ...extra } = logEntry;
            const method = KAFKA_LEVEL_TO_METHOD[level] || 'd';
            const hasExtra = Object.keys(extra).length > 0;

            if (hasExtra) {
                subLog[method](message, extra);
            }
            else {
                subLog[method](message);
            }
        };
    };
}

/**
 * @typedef {Object} ConnectionConfig
 * @property {string[]} brokers - List of Kafka broker addresses
 * @property {string} clientId - Unique client identifier
 * @property {boolean} [ssl] - SSL/TLS encryption enabled
 * @property {Object} [sasl] - SASL authentication configuration
 * @property {string} sasl.mechanism - Authentication mechanism (plain, scram-sha-256, etc.)
 * @property {string} sasl.username - SASL username
 * @property {string} sasl.password - SASL password
 * @property {number} requestTimeout - Request timeout in milliseconds
 * @property {number} connectionTimeout - Connection timeout in milliseconds
 */

/**
 * KafkaClient - Thin wrapper around KafkaJS for connection management
 *
 * Provides:
 * - Configuration mapping from librdkafka to KafkaJS format
 * - Connection timeout bounds to prevent negative timeout warnings
 * - SSL/SASL security protocol mapping
 * - Shared KafkaJS instance for producers, consumers, and admin
 *
 * @example
 * const client = new KafkaClient();
 * const kafka = client.createKafkaInstance();
 * const producer = kafka.producer();
 * const consumer = kafka.consumer({ groupId: 'my-group' });
 * const admin = client.createAdmin();
 */
class KafkaClient {
    /** @type {ConnectionConfig} */
    #connectionConfig;

    /** @type {import('kafkajs').Kafka} */
    #kafka;

    /**
     * Create a new KafkaClient instance with configuration from countlyConfig
     *
     * Maps librdkafka-style configuration to KafkaJS:
     * - rdkafka.brokers → brokers
     * - rdkafka.clientId → clientId
     * - rdkafka.requestTimeoutMs → requestTimeout (bounded 1s-5min)
     * - rdkafka.connectionTimeoutMs → connectionTimeout (bounded 1s-1min)
     * - rdkafka.securityProtocol → ssl (SSL/SASL_SSL)
     * - rdkafka.saslMechanism → sasl.mechanism
     */
    constructor() {
        const kafkaConfig = countlyConfig.kafka || {};
        const rdkafkaConfig = kafkaConfig.rdkafka || {};

        const brokers = Array.isArray(rdkafkaConfig.brokers) && rdkafkaConfig.brokers.length > 0
            ? rdkafkaConfig.brokers
            : ['localhost:9092'];
        const clientId = rdkafkaConfig.clientId || 'countly-kafka-client';

        // Map librdkafka-style security to KafkaJS
        const mechanismMap = {
            'PLAIN': 'plain',
            'SCRAM-SHA-256': 'scram-sha-256',
            'SCRAM-SHA-512': 'scram-sha-512',
            'OAUTHBEARER': 'oauthbearer',
            'AWS_MSK_IAM': 'aws'
        };
        const securityProtocol = rdkafkaConfig.securityProtocol;
        const ssl = securityProtocol && ['SSL', 'SASL_SSL'].includes(String(securityProtocol).toUpperCase()) ? true : undefined;
        const saslMechanism = rdkafkaConfig.saslMechanism ? mechanismMap[String(rdkafkaConfig.saslMechanism).toUpperCase()] : undefined;
        const sasl = saslMechanism ? {
            mechanism: saslMechanism,
            username: rdkafkaConfig.saslUsername,
            password: rdkafkaConfig.saslPassword,
            authenticationTimeout: rdkafkaConfig.saslAuthenticationTimeout || 10000
        } : undefined;

        // Ensure timeout values are reasonable and positive
        const requestTimeout = Math.max(1000, Math.min(300000, rdkafkaConfig.requestTimeoutMs ?? 30000));
        const connectionTimeout = Math.max(1000, Math.min(60000, rdkafkaConfig.connectionTimeoutMs ?? 10000));

        this.#connectionConfig = Object.freeze({
            brokers,
            clientId,
            ssl,
            sasl,
            requestTimeout,
            connectionTimeout,
        });

        // Assert patch is applied before creating any Kafka instance
        if (!kafkaRequestQueueFix.isPatched()) {
            throw new Error(
                'KafkaJS RequestQueue patch not applied. ' +
                'Ensure kafkaRequestQueueFix.js is imported before any KafkaJS usage.'
            );
        }

        // Translate Countly log level to KafkaJS so it does not emit suppressed messages
        const kafkaJsLogLevel = countlyLevelToKafkaLevel(logFactory.getLevel('kafka:client'));

        this.#kafka = new Kafka({
            clientId,
            brokers,
            ssl,
            sasl,
            requestTimeout,
            connectionTimeout,
            // Request timeout enforcement enabled - RequestQueue patch prevents negative timeout issues
            // See: kafkaRequestQueueFix.js, https://github.com/tulios/kafkajs/issues/1704
            enforceRequestTimeout: true,
            // Use config values for retry settings
            retry: {
                initialRetryTime: rdkafkaConfig.initialRetryTime || 100,
                retries: rdkafkaConfig.retries || 8
            },
            logLevel: kafkaJsLogLevel,
            logCreator: createCountlyLogCreator()
        });

        log.i('KafkaClient initialized with brokers:', brokers.join(','));
    }

    /**
     * Get the connection configuration used by this client
     *
     * @returns {ConnectionConfig} Frozen connection configuration object
     *
     * @example
     * const config = client.getConnectionConfig();
     * console.log('Brokers:', config.brokers);
     * console.log('Client ID:', config.clientId);
     */
    getConnectionConfig() {
        return this.#connectionConfig;
    }

    /**
     * Create a KafkaJS admin client for cluster management operations
     *
     * Use for:
     * - Creating/deleting topics
     * - Listing topics and metadata
     * - Managing consumer groups
     * - Cluster health checks
     *
     * @returns {Admin} KafkaJS admin client instance
     *
     * @example
     * const admin = client.createAdmin();
     * await admin.connect();
     * const topics = await admin.listTopics();
     * await admin.disconnect();
     */
    createAdmin() {
        return this.#kafka.admin();
    }

    /**
     * Get the shared KafkaJS client instance
     *
     * Returns the same Kafka instance used by all producers, consumers, and admin clients
     * created from this KafkaClient. This ensures connection pooling and consistent
     * configuration across all Kafka operations.
     *
     * @returns {Kafka} Shared KafkaJS client instance
     *
     * @example
     * const kafka = client.createKafkaInstance();
     * const producer = kafka.producer();
     * const consumer = kafka.consumer({ groupId: 'my-group' });
     */
    createKafkaInstance() {
        return this.#kafka;
    }

    /**
     * Fetch cluster metadata from Kafka Admin API
     *
     * Retrieves the actual Kafka cluster ID assigned by the cluster itself.
     * This is used for state versioning to detect cluster migrations.
     *
     * @returns {Promise<{clusterId: string, brokers: Array<{nodeId: number, host: string, port: number}>}>} returns cluster metadata
     * @throws {Error} If unable to connect to cluster or fetch metadata
     *
     * @example
     * const metadata = await client.getClusterMetadata();
     * console.log('Cluster ID:', metadata.clusterId);
     * console.log('Brokers:', metadata.brokers);
     */
    async getClusterMetadata() {
        const admin = this.createAdmin();
        try {
            await admin.connect();
            const cluster = await admin.describeCluster();
            log.d(`Fetched cluster metadata: clusterId=${cluster.clusterId}, brokers=${cluster.brokers.length}`);
            return {
                clusterId: cluster.clusterId,
                brokers: cluster.brokers
            };
        }
        finally {
            await admin.disconnect();
        }
    }

    /**
     * Fetch topic metadata including partition count and replication factor
     *
     * @param {string} topic - Topic name to fetch metadata for
     * @returns {Promise<{partitions: number, replicationFactor: number}>} returns topic metadata
     * @throws {Error} If topic doesn't exist or unable to fetch metadata
     *
     * @example
     * const metadata = await client.getTopicMetadata('drill-events');
     * console.log('Partitions:', metadata.partitions);
     */
    async getTopicMetadata(topic) {
        const admin = this.createAdmin();
        try {
            await admin.connect();
            const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
            const topicMeta = metadata.topics[0];
            if (!topicMeta || topicMeta.name !== topic) {
                throw new Error(`Topic '${topic}' not found`);
            }
            return {
                partitions: topicMeta.partitions.length,
                replicationFactor: topicMeta.partitions[0]?.replicas?.length || 1
            };
        }
        finally {
            await admin.disconnect();
        }
    }
}

module.exports = KafkaClient;