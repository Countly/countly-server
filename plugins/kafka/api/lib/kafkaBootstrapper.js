const log = require('../../../../api/utils/log.js')('kafka:bootstrapper');
const countlyConfig = require('../../../../api/config');

/**
 * @typedef {Object} TopicOptions
 * @property {number} [partitions] - Number of partitions (defaults to config)
 * @property {number} [replicationFactor] - Replication factor (defaults to config)
 * @property {number} [retentionMs] - Message retention in milliseconds (defaults to config)
 */

/**
 * @typedef {Object} BootstrapResult
 * @property {boolean} success - Whether bootstrap completed successfully
 * @property {string[]} topics - Array of topic names that were created/verified
 * @property {string[]} errors - Array of error messages if any failures occurred
 */

/**
 * @typedef {Object} TopicInfo
 * @property {string} name - Topic name
 * @property {number} partitions - Number of partitions
 * @property {number} replicationFactor - Replication factor
 * @property {Array} partitionDetails - Detailed partition information
 * @property {number} partitionDetails[].partition - Partition ID
 * @property {number} partitionDetails[].leader - Leader broker ID
 * @property {number[]} partitionDetails[].replicas - Replica broker IDs
 * @property {number[]} partitionDetails[].isr - In-sync replica broker IDs
 */

/**
 * KafkaBootstrapper - Infrastructure setup and management for Kafka clusters
 * 
 * Provides comprehensive Kafka cluster management capabilities:
 * - Cluster health monitoring and connectivity testing
 * - Topic creation with production-ready defaults
 * - Topic existence verification and metadata inspection
 * - Automatic configuration adjustment based on environment
 * - Error handling for common cluster setup scenarios
 * 
 * Features:
 * - Environment-aware defaults (dev vs prod replication factors)
 * - Robust topic creation with conflict resolution
 * - Health checks before infrastructure operations
 * - Comprehensive error reporting and recovery
 * 
 * @example
 * const bootstrapper = new KafkaBootstrapper(kafkaClient);
 * 
 * // Check cluster connectivity
 * const healthy = await bootstrapper.checkClusterHealth();
 * 
 * // Bootstrap all required infrastructure
 * const result = await bootstrapper.bootstrap();
 * if (result.success) {
 *   console.log('Created topics:', result.topics);
 * }
 * 
 * // Get detailed topic information
 * const topicInfo = await bootstrapper.getTopicInfo('user-events');
 * console.log(`Topic has ${topicInfo.partitions} partitions`);
 */
class KafkaBootstrapper {

    /** @type {import('./kafkaClient')} */
    #kafkaClient;

    /** @type {import('kafkajs').Admin|null} */
    #admin = null;

    /**
     * Create a KafkaBootstrapper instance for cluster infrastructure management
     * 
     * @param {kafkaClient} kafkaClient - KafkaClient instance for connection management
     * 
     * @throws {Error} If kafkaClient is not provided
     * 
     * @example
     * const bootstrapper = new KafkaBootstrapper(kafkaClient);
     */
    constructor(kafkaClient) {
        if (!kafkaClient) {
            throw new Error('KafkaClient is required for KafkaBootstrapper');
        }
        this.#kafkaClient = kafkaClient;
    }

    /**
     * Initialize the KafkaJS admin client connection
     * 
     * Creates and connects the admin client for cluster management operations.
     * Uses lazy initialization - only connects when first needed.
     * 
     * @private
     * @returns {Promise<void>} Promise that resolves when admin client is connected
     */
    async #initAdmin() {
        if (this.#admin) {
            return;
        }

        this.#admin = this.#kafkaClient.createAdmin();
        await this.#admin.connect();
        log.i('Kafka admin client connected');
    }

    /**
     * Check if Kafka cluster is reachable and healthy
     * 
     * Performs a basic connectivity test by attempting to list topics.
     * This verifies that the cluster is accessible and responsive.
     * 
     * @returns {Promise<boolean>} True if cluster is healthy and reachable, false otherwise
     * 
     * @example
     * const healthy = await bootstrapper.checkClusterHealth();
     * if (!healthy) {
     *   console.error('Kafka cluster is not accessible');
     * }
     */
    async checkClusterHealth() {
        try {
            await this.#initAdmin();

            // Try to list topics to test cluster connectivity
            const topics = await this.#admin.listTopics();
            log.i(`Cluster health check passed. Found ${topics.length} topics`);
            return true;
        }
        catch (error) {
            log.e('Cluster health check failed:', error.message);
            return false;
        }
    }

    /**
     * Check if a specific topic exists in the cluster
     * 
     * @param {string} topicName - Name of the topic to check
     * 
     * @returns {Promise<boolean>} True if topic exists, false if not found or error occurred
     * 
     * @example
     * const exists = await bootstrapper.topicExists('user-events');
     * if (!exists) {
     *   console.log('Topic needs to be created');
     * }
     */
    async topicExists(topicName) {
        try {
            await this.#initAdmin();
            const topics = await this.#admin.listTopics();
            return topics.includes(topicName);
        }
        catch (error) {
            log.e(`Error checking if topic ${topicName} exists:`, error.message);
            return false;
        }
    }

    /**
     * Create a topic with production-ready configuration
     *
     * Replication factor precedence (highest to lowest):
     * 1. options.replicationFactor (explicit parameter)
     * 2. kafkaConfig.replicationFactor (from config)
     * 3. Production default: 2, Development default: 1
     *
     * Automatically configures topic settings based on environment:
     * - Production: min.insync.replicas=2 (or replicationFactor if lower)
     * - Development: min.insync.replicas=1
     *
     * Applies sensible defaults:
     * - LZ4 compression for efficiency
     * - Delete cleanup policy for analytics data
     * - Unclean leader election disabled for data integrity
     * - 7-day retention (configurable)
     *
     * @param {string} topicName - Name of the topic to create
     * @param {TopicOptions} [options={}] - Topic creation options
     *
     * @returns {Promise<boolean>} True if topic was created or already exists, false if creation failed
     *
     * @example
     * // Create topic with default settings (respects config replication factor)
     * const success = await bootstrapper.createTopic('user-events');
     *
     * // Create topic with explicit replication factor
     * const success = await bootstrapper.createTopic('high-volume-events', {
     *   partitions: 50,
     *   replicationFactor: 2
     * });
     */
    async createTopic(topicName, options = {}) {
        try {
            await this.#initAdmin();

            const exists = await this.topicExists(topicName);
            if (exists) {
                log.i(`Topic ${topicName} already exists`);
                return true;
            }

            // Get configuration from countlyConfig
            const kafkaConfig = countlyConfig.kafka || {};

            const isProd = process.env.NODE_ENV === 'production';
            // Use configured replication factor, with production default of 3 only if not configured
            const replicationFactor = options.replicationFactor ?? kafkaConfig.replicationFactor ?? (isProd ? 2 : 1);

            const topicConfig = {
                topic: topicName,
                numPartitions: options.partitions ?? kafkaConfig.partitions ?? 10,
                replicationFactor: replicationFactor,
                configEntries: [
                    { name: 'retention.ms', value: String(options.retentionMs ?? kafkaConfig.retentionMs ?? 604800000) },
                    { name: 'compression.type', value: 'lz4' },
                    { name: 'cleanup.policy', value: 'delete' },
                    { name: 'min.insync.replicas', value: String(Math.min(isProd ? 2 : 1, Math.max(1, replicationFactor))) },
                    { name: 'unclean.leader.election.enable', value: 'false' }
                ]
            };

            log.i(`Creating topic ${topicName} with ${topicConfig.numPartitions} partitions`);
            const created = await this.#admin.createTopics({ topics: [topicConfig] });
            if (!created) {
                log.i(`Topic ${topicName} already exists`);
            }
            else {
                log.i(`Topic ${topicName} created successfully`);
            }
            return true;

        }
        catch (error) {
            // Check for topic already exists error by multiple indicators
            const isTopicExists = error.code === 'TOPIC_ALREADY_EXISTS' ||
                                error.name === 'TopicExistsError' ||
                                error.type === 'TOPIC_ALREADY_EXISTS' ||
                                (error.message && (
                                    error.message.includes('already exists') ||
                                    error.message.includes('TopicExistsException') ||
                                    error.message.includes('Topic already exists')
                                ));

            if (isTopicExists) {
                log.i(`Topic ${topicName} already exists`);
                return true;
            }
            log.e(`Failed to create topic ${topicName}:`, error.message);
            return false;
        }
    }

    /**
     * Bootstrap all required Kafka infrastructure for Countly
     * 
     * Performs a complete infrastructure setup:
     * 1. Cluster health verification
     * 2. Creation of drill events topic
     * 3. Comprehensive error reporting
     * 
     * The bootstrap process is idempotent - safe to run multiple times.
     * Existing topics are left unchanged.
     * 
     * @returns {Promise<BootstrapResult>} Result object with success status, created topics, and any errors
     * 
     * @example
     * const result = await bootstrapper.bootstrap();
     * 
     * if (result.success) {
     *   console.log('Infrastructure ready. Topics:', result.topics);
     * } else {
     *   console.error('Bootstrap failed:', result.errors);
     * }
     */
    async bootstrap() {
        const result = {
            success: true,
            topics: [],
            errors: []
        };

        try {
            log.i('Starting Kafka infrastructure bootstrap...');

            // Check cluster health
            const healthy = await this.checkClusterHealth();
            if (!healthy) {
                result.success = false;
                result.errors.push('Cluster health check failed');
                return result;
            }

            // Create drill events topic
            const kafkaConfig = countlyConfig.kafka || {};
            const topicName = kafkaConfig.drillEventsTopic || 'countly-drill-events';
            const drillEventsCreated = await this.createTopic(topicName);
            if (drillEventsCreated) {
                result.topics.push(topicName);
            }
            else {
                result.success = false;
                result.errors.push(`Failed to create topic: ${topicName}`);
            }

            if (result.success) {
                log.i('Kafka infrastructure bootstrap completed successfully');
            }
            else {
                log.e('Kafka infrastructure bootstrap failed');
            }

        }
        catch (error) {
            log.e('Bootstrap failed with error:', error.message);
            result.success = false;
            result.errors.push(error.message);
        }

        return result;
    }

    /**
     * Get detailed information about a specific topic
     * 
     * Retrieves comprehensive topic metadata including:
     * - Partition count and distribution
     * - Replication factor
     * - Leader assignments and in-sync replicas
     * - Replica distribution across brokers
     * 
     * @param {string} topicName - Name of the topic to inspect
     * 
     * @returns {Promise<TopicInfo|null>} Detailed topic information or null if topic not found
     * 
     * @example
     * const info = await bootstrapper.getTopicInfo('user-events');
     * if (info) {
     *   console.log(`Topic: ${info.name}`);
     *   console.log(`Partitions: ${info.partitions}`);
     *   console.log(`Replication: ${info.replicationFactor}`);
     *   
     *   info.partitionDetails.forEach(p => {
     *     console.log(`Partition ${p.partition}: leader=${p.leader}, replicas=[${p.replicas.join(',')}]`);
     *   });
     * }
     */
    async getTopicInfo(topicName) {
        try {
            await this.#initAdmin();
            const metadata = await this.#admin.fetchTopicMetadata({ topics: [topicName] });
            const topic = metadata.topics.find(t => t.name === topicName);

            if (!topic || topic.error) {
                return null;
            }

            return {
                name: topic.name,
                partitions: topic.partitions.length,
                replicationFactor: topic.partitions[0]?.replicas?.length || 0,
                partitionDetails: topic.partitions.map(p => ({
                    partition: p.partitionId,
                    leader: p.leader,
                    replicas: p.replicas,
                    isr: p.isr
                }))
            };
        }
        catch (error) {
            log.e(`Error getting topic info for ${topicName}:`, error.message);
            return null;
        }
    }

    /**
     * Disconnect the admin client and clean up resources
     * 
     * Safely disconnects from the Kafka cluster and resets internal state.
     * Should be called when the bootstrapper is no longer needed to free
     * network connections and resources.
     * 
     * @returns {Promise<void>} Promise that resolves when disconnected
     * 
     * @example
     * // After bootstrapping is complete
     * await bootstrapper.disconnect();
     * console.log('Bootstrapper disconnected');
     */
    async disconnect() {
        try {
            if (this.#admin) {
                await this.#admin.disconnect();
                this.#admin = null;
                log.i('Kafka admin client disconnected');
            }
        }
        catch (error) {
            log.e('Error disconnecting admin client:', error);
        }
    }
}

module.exports = KafkaBootstrapper;