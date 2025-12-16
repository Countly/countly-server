/**
* Module for user provided API configurations
* @module api/config
*/

/**
 * @typedef {import('../types/config').CountlyAPIConfig} CountlyAPIConfig
 */

/** @type {CountlyAPIConfig} */
var countlyConfig = {

    /**
     * Database connection and adapter configuration
     * @type {object}
     * @property {boolean} [failOnConnectionError=true] - whether to kill process if non-MongoDB database adapters fail connection on startup (MongoDB fallback behavior unchanged)
     * @property {boolean} [debug=false] - enables db_override toggle and related debugging features in UI and backend for drill
     * @property {array} [adapterPreference=['mongodb', 'clickhouse']] - Adapter preference order for QueryRunner (first match wins)
     * @property {object} adapters - Adapter availability settings for QueryRunner
     * @property {object} adapters.mongodb - MongoDB adapter settings
     * @property {boolean} [adapters.mongodb.enabled=true] - Enable MongoDB adapter
     * @property {object} adapters.clickhouse - ClickHouse adapter settings
     * @property {boolean} [adapters.clickhouse.enabled=true] - Enable ClickHouse adapter
     * @property {object} comparisonLogs - Configuration for QueryRunner comparison logging (DEVELOPMENT ONLY - disable in production)
     * @property {string} [comparisonLogs.mode='disabled'] - Comparison logs mode: 'disabled' (no logging), 'files' (write to comparison_logs directory), 'logs' (write to application logs), or 'both'. WARNING: Should be disabled in production environments for performance reasons.
     */
    database: {
        failOnConnectionError: true,
        debug: false,
        adapterPreference: ['mongodb'],
        adapters: {
            mongodb: {
                enabled: true
            },
            clickhouse: {
                enabled: false
            }
        },
        comparisonLogs: {
            mode: 'disabled' // Options: 'disabled', 'files', 'logs', 'both' - WARNING: DEVELOPMENT ONLY, use 'disabled' in production
        }
    },

    /**
    * MongoDB connection definition and options
    * @type {object} 
    * @property {string} [host=localhost] - host where to connect to mongodb, default localhost
    * @property {array=} replSetServers - array with multiple hosts, if you are connecting to replica set, provide this instead of host
    * @property {string=} replicaName - replica name, must provide for replica set connection to work
    * @property {string} [db=countly] - countly database name, default countly
    * @property {number} [port=27017] - port to use for mongodb connection, default 27017
    * @property {number} [max_pool_size=500] - how large pool size connection per process to create, default 500 per process, not recommended to be more than 1000 per server
    * @property {string=} username - username for authenticating user, if mongodb supports authentication
    * @property {string=} password - password for authenticating user, if mongodb supports authentication
    * @property {object=} dbOptions - provide raw driver database options
    * @property {object=} serverOptions - provide raw driver server options, used for all, single, mongos and replica set servers
    */
    mongodb: {
        host: "localhost",
        db: "countly",
        port: 27017,
        max_pool_size: 500,
        replicaName: "rs0",
        serverOptions: {
            directConnection: true
        }
        //username: test,
        //password: test,
        //mongos: false,
        /*
        dbOptions:{
            //db options
        }
        */
    },
    /*  or for a replica set
    mongodb: {
        replSetServers : [
            '192.168.3.1:27017',
            '192.168.3.2:27017'
        ],
		replicaName: "test",
        db: "countly",
		username: test,
		password: test,
        max_pool_size: 100,
        dbOptions:{
            //db options
        }
    },
    */
    /*  or define as a url
 //mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
 mongodb: "mongodb://localhost:27017/countly",
    */
    /**
    * ClickHouse connection definition and options
    * @type {object|string}
    * @property {string} [url=http://localhost:8123] - ClickHouse server URL
    * @property {string} [username=default] - username for authenticating user
    * @property {string} [password=] - password for authenticating user
    * @property {string} [database=countly_drill] - ClickHouse database name
    * @property {object} [compression] - compression settings
    * @property {string} [application] - application name for connection
    * @property {number} [request_timeout=1200000] - request timeout in milliseconds
    * @property {object} [keep_alive] - keep alive settings
    * @property {number} [max_open_connections=10] - maximum number of open connections
    * @property {object} [dictionary] - dictionary configuration
    * @property {boolean} [dictionary.enableMongoDBSource=true] - enable MongoDB as a dictionary source (requires mongodb driver)
    * @property {object} [clickhouse_settings] - ClickHouse specific settings
    */
    clickhouse: {
        url: "http://localhost:8123",
        username: "default",
        password: "",
        database: "countly_drill",
        compression: {
            request: false,
            response: false,
        },
        application: "countly_drill",
        request_timeout: 1200_000,
        keep_alive: {
            enabled: true,
            idle_socket_ttl: 10000,
        },
        max_open_connections: 10,
        // Dictionary configuration for DictionaryManager
        dictionary: {
            enableMongoDBSource: true, // Enable/disable MongoDB as a dictionary source (auto-disabled if mongodb driver not available)
            nativePort: 9000, // Native TCP port for dictionary connections (use 9440 for Cloud with TLS)
            host: null, // Override host for dictionary connections (defaults to ClickHouse URL host)
            secure: false // Enable TLS for dictionary connections (required for ClickHouse Cloud)
        },
        // Identity configuration for user merging and dictionary data retention
        identity: {
            daysOld: 30 // Number of days after which identity mappings are baked into cold partitions.
            // Dictionary only loads mappings from the last (daysOld + 1) days.
            // Used by both identity dictionary and ColdPartitionMerging job.
        },
        clickhouse_settings: {
            idle_connection_timeout: 11000 + '',
            async_insert: 1,
            wait_for_async_insert: 1,
            wait_end_of_query: 1,
            optimize_on_insert: 1,
            allow_suspicious_types_in_group_by: 1,
            allow_suspicious_types_in_order_by: 1,
            optimize_move_to_prewhere: 1,
            query_plan_optimize_lazy_materialization: 1
        },
        // Cluster configuration for distributed ClickHouse deployments
        // Supports: single (default), sharded, replicated, ha modes
        cluster: {
            enabled: false,
            name: 'countly_cluster',
            mode: 'single', // 'single' | 'sharded' | 'replicated' | 'ha'
            isCloud: false // Set to true for ClickHouse Cloud or externally managed schemas (skips DDL, validates schema exists)
        },
        // Replication configuration (for 'replicated' and 'ha' modes)
        replication: {
            coordinatorType: 'keeper', // 'keeper' (ClickHouse Keeper) or 'zookeeper'
            zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
            replicaName: '{replica}'
        },
        // Parallel replicas configuration for query acceleration
        parallelReplicas: {
            enabled: false,
            maxParallelReplicas: 2,
            clusterForParallelReplicas: null // null = auto-detect from cluster.name
        },
        // Distributed table configuration
        distributed: {
            writeThrough: true, // Write through distributed tables (not direct to local)
            insertDistributedSync: true // Wait for data to be written to all shards
        }
    },
    /**
    * Kafka connection definition and options
    * 
    * ⚠️  IMPORTANT: When Kafka is enabled, it is treated as a HARD DEPENDENCY.
    * Any connection failures during startup will cause the application to exit.
    * 
    * ⚠️  DATA LOSS WARNINGS:
    * - acks=0 or acks=1: Can lose data on broker failures
    * - messageTimeoutMs too low: Messages dropped after timeout
    * - deliveryTimeoutMs too low: Messages lost when retries exhausted  
    * - retries too low: Data lost on temporary network issues
    * - enableAutoCommit=true: Data lost if consumer crashes before processing
    * - sessionTimeoutMs too low: Rebalances lose in-flight messages
    * - maxPollIntervalMs too low: Consumer kicked out, loses uncommitted offsets
    * 
    * @type {object}
    * @property {boolean} [enabled=false] - Enable Kafka integration (when true, Kafka becomes a hard dependency)
    * @property {string} [drillEventsTopic=countly-drill-events] - Topic name for drill events
    * @property {string} [groupIdPrefix=cly_] - Prefix for consumer group IDs
    * @property {number} [partitions=10] - Default number of partitions for topics
    * @property {number} [replicationFactor=1] - Default replication factor for topics
    * @property {number} [retentionMs=604800000] - Message retention time in milliseconds (7 days)
    * @property {boolean} [enableTransactions=false] - Enable transactional producers
    * @property {string} [transactionalId] - Custom transactional ID prefix
    * @property {number} [transactionTimeout=60000] - Transaction timeout in milliseconds
    * @property {object} rdkafka - librdkafka configuration settings
    */
    kafka: {
        enabled: false, // Enable/disable Kafka integration globally (when true, becomes hard dependency)
        drillEventsTopic: "drill-events", // Default topic name for event data
        groupIdPrefix: "cly_", // Prefix added to all consumer group IDs

        // Kafka Connect monitoring (for Health Manager Ingestion Status)
        connectApiUrl: "http://localhost:8083", // Kafka Connect REST API URL
        connectConsumerGroupId: "connect-clickhouse-sink", // Kafka Connect consumer group ID for sink lag monitoring

        partitions: 10, // Default number of partitions for new topics
        replicationFactor: 1, // Default replication factor for new topics (use 3+ in production)
        retentionMs: 604800000, // Message retention time in milliseconds (default: 7 days)
        enableTransactions: false, // Enable transactional producers (set per producer instance)
        transactionTimeout: 60000, // Transaction timeout in milliseconds (default: 60 seconds)
        batchDeduplication: true, // Enable batch-level deduplication to prevent reprocessing on rebalance (default: true)

        // Basic connection and security settings (used by KafkaClient)
        rdkafka: {
            brokers: ["localhost:9092"], // List of Kafka broker addresses
            clientId: "countly-kafka-client", // Client identifier for Kafka connections
            requestTimeoutMs: 30000, // Request timeout for Kafka operations (default: 30 seconds)
            connectionTimeoutMs: 10000, // Connection timeout for initial broker connections (default: 10 seconds)

            // Security settings
            securityProtocol: null, // Security protocol (PLAINTEXT, SSL, SASL_PLAINTEXT, SASL_SSL)
            saslMechanism: null, // SASL mechanism (PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, GSSAPI)
            saslUsername: null, // SASL username for authentication
            saslPassword: null, // SASL password for authentication

            // Common producer settings
            lingerMs: 5, // Time to wait for more messages before sending batch (default: 5ms)
            retries: 8, // Number of retries for failed requests (default: 8) - WARNING: Too low can cause data loss on temporary network issues
            initialRetryTime: 100, // Initial retry backoff time in milliseconds (default: 100ms)
            maxRetryTime: 30000, // Maximum retry backoff time in milliseconds (default: 30 seconds)
            acks: -1 // Acknowledgment level (-1: all replicas, 1: leader only, 0: no acks) - WARNING: 0=no wait (data loss if broker fails), 1=leader only (data loss if leader fails before replication)
        },

        // Producer-specific settings (handled by KafkaProducer)
        producer: {
            // Batch size controls for throughput optimization
            batchSize: 1048576, // Maximum batch size in bytes (default: 1MB)
            batchNumMessages: 10000, // Maximum number of messages per batch (default: 10,000)

            // Queue buffering for high throughput
            queueBufferingMaxMessages: 100000, // Maximum messages to buffer in producer queue (default: 100,000)
            queueBufferingMaxKbytes: 1048576, // Maximum memory for buffering in KB (default: 1GB)

            // Compression and timeouts
            compressionLevel: 1, // LZ4 compression level 1-12 (default: 1, balanced speed/compression)
            messageTimeoutMs: 300000, // Maximum time to deliver a message in milliseconds (default: 5 minutes) - WARNING: Too low causes data loss when message drops after timeout
            deliveryTimeoutMs: 300000 // Total time for delivery including retries in milliseconds (default: 5 minutes) - WARNING: Too low causes data loss when all retries exhausted
        },

        // Consumer-specific settings (handled by KafkaConsumer)
        consumer: {
            // Fetch size controls for batch processing optimization
            fetchMinBytes: 262144, // Minimum bytes to fetch per request (default: 256KB, better than 1KB for throughput)
            fetchMaxWaitMs: 1000, // Maximum wait time for fetch requests in milliseconds (default: 1000ms, better than 500ms)
            fetchMaxBytes: 52428800, // Maximum bytes to fetch per request (default: 50MB)
            maxPartitionFetchBytes: 1048576, // Maximum bytes per partition per fetch (default: 1MB)

            // Queue controls for memory management
            queuedMinMessages: 50000, // Minimum messages to queue before consuming (default: 50,000, lower memory usage)
            queuedMaxMessagesKbytes: 524288, // Maximum memory for message queue in KB (default: 512MB, lower memory usage)

            // Concurrency and performance settings
            partitionsConsumedConcurrently: 4, // Number of partitions to consume concurrently per process (default: 4)

            // Consumer group settings (conservative defaults to reduce rebalancing)
            sessionTimeoutMs: 60000, // Consumer session timeout in milliseconds (default: 60 seconds) - WARNING: Too low causes rebalances, potentially losing in-flight messages
            heartbeatInterval: 10000, // Heartbeat interval in milliseconds (default: 10 seconds, should be ~1/6 of sessionTimeout)
            rebalanceTimeout: 120000, // Rebalance timeout in milliseconds (default: 2 minutes)
            maxPollIntervalMs: 600000, // Maximum time between polls in milliseconds (default: 10 minutes) - WARNING: Too low causes consumer to be kicked out, losing uncommitted offsets
            autoOffsetReset: 'earliest', // Where to start reading when no offset exists (latest/earliest)
            enableAutoCommit: false, // Disable auto-commit for exactly-once processing (default: false) - WARNING: true can cause data loss on consumer crash before processing

            // Error handling settings
            invalidJsonBehavior: "skip", // How to handle invalid JSON messages: 'skip' or 'fail' (default: skip)
            invalidJsonMetrics: true // Whether to log metrics for invalid JSON messages (default: true)
        }
    },

    /**
    * EventSink configuration for writing events to multiple destinations
    * EventSink provides a unified interface for writing events to MongoDB, Kafka, or both
    * 
    * @type {object}
    * @property {Array<string>} [sinks=['mongo']] - Array of sink types to enable
    *                                               Options: 'mongo', 'kafka', or both
    *                                               MongoDB is always available as fallback
    *                                               Kafka is only used if kafka.enabled is also true
    * 
    * Examples:
    * - sinks: ['mongo'] - Write only to MongoDB (default)
    * - sinks: ['kafka'] - Write only to Kafka (if enabled)
    * - sinks: ['mongo', 'kafka'] - Write to both in parallel
    */
    eventSink: {
        sinks: ['mongo'], // Default: MongoDB only. Add 'kafka' for dual writes
    },

    /**
    * Default API configuration
    * @type {object} 
    * @property {number} [port=3001] - api port number to use, default 3001
    * @property {string} [host=localhost] - host to which to bind connection
    * @property {number} [max_sockets=1024] - maximal amount of sockets to open simultaneously
    * @property {number} workers - amount of paralel countly processes to run, defaults to cpu/core amount
    * @property {number} [timeout=120000] - nodejs server request timeout, need to also increase nginx timeout too for longer requests
    * @property {number} maxUploadFileSize - limit the size of uploaded file
    */
    api: {
        port: 3001,
        host: "localhost",
        max_sockets: 1024,
        timeout: 120000,
        maxUploadFileSize: 200 * 1024 * 1024, // 200MB
        ssl: {
            enabled: false,
            key: "/path/to/ssl/private.key",
            cert: "/path/to/ssl/certificate.crt",
            // ca: "/path/to/ssl/ca_bundle.crt" // Optional: for client certificate verification, uncomment to activate
        }
    },
    /**
    * Default Ingestor configuration
    * @type {object} 
    * @property {number} [port=3010] - api port number to use, default 3010
    * @property {string} [host=localhost] - host to which to bind connection
    * @property {number} [max_sockets=1024] - maximal amount of sockets to open simultaneously
    * @property {number} workers - amount of paralel countly processes to run, defaults to cpu/core amount
    * @property {number} [timeout=120000] - nodejs server request timeout, need to also increase nginx timeout too for longer requests
    * @property {number} maxUploadFileSize - limit the size of uploaded file
    */
    ingestor: {
        port: 3010,
        host: "localhost",
        max_sockets: 1024,
        timeout: 120000,
        maxUploadFileSize: 200 * 1024 * 1024, // 200MB
    },
    /**
    * Default Job Server configuration
    * @type {object} 
    * @property {number} [port=3020] - port number to use, default 3020
    * @property {string} [host=localhost] - host to which to bind connection
    * @property {number} [max_sockets=1024] - maximal amount of sockets to open simultaneously
    * @property {number} [timeout=120000] - nodejs server request timeout, need to also increase nginx timeout too for longer requests
    * @property {number} maxUploadFileSize - limit the size of uploaded file
    */
    jobServer: {
        port: 3020,
        host: "localhost",
        max_sockets: 1024,
        timeout: 120000,
        maxUploadFileSize: 200 * 1024 * 1024, // 200MB
    },
    /**
    * Path to use for countly directory, empty path if installed at root of website
    * @type {string} 
    */
    path: "",
    /**
    * Default logging settings
    * @type {object} 
    * @property {string} [default=warn] - default level of logging for {@link logger}
    * @property {array=} info - modules to log for information level for {@link logger}
    * @property {boolean} [prettyPrint=false] - whether to pretty print the logs
    */
    logging: {
        prettyPrint: false,
        info: ["jobs", "push"],
        default: "warn"
    },
    /**
    * Default proxy settings, if provided then countly uses ip address from the right side of x-forwarded-for header ignoring list of provided proxy ip addresses
    * @type {array=} 
    */
    ignoreProxies: [/*"127.0.0.1"*/],

    /**
    * Default settings to be used for {@link module:api/utils/utils.encrypt} and {@link module:api/utils/utils.decrypt} functions and for commandline
    * @type {object}
    * @property {string} key - key used for encryption and decryption
    * @property {string|Buffer} iv - initialization vector to make encryption more secure
    * @property {string} algorithm - name of the algorithm to use for encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
    * @property {string} input_encoding - how encryption input is encoded. Used as output for decrypting. Default utf-8.
    * @property {string} output_encoding - how encryption output is encoded. Used as input for decrypting. Default hex.
    * @property {string} reports_key - key used for encryption of reports links
    */
    encryption: {},

    /**
    * Specifies where to store files. Value "fs" means file system or basically storing files on hard drive. Another currently supported option is "gridfs" storing files in MongoDB database using GridFS. By default fallback to "fs";
    * @type {string} [default=fs]
    */
    fileStorage: "gridfs",
    /**
    * Specifies after how long time configurations are reloded from data base. Default value is 10000 (10 seconds)
    * @type {integer} [default=10000]
    **/
    reloadConfigAfter: 10000,
    /**
	* Specifies if jobs are run on this countly instance
	* Usable only in case when there are multiple countly instances connected to single database. Has to be set to true for at least one instance.
	*/
    preventJobs: false,
    /** 
     * Share same database connection pool between databases
     */
    shared_connection: true,
    /**
     * Simple SMTP mail sender configuration.
     * Can only be used when you don't have custom mailer extend ({@code countly/extend/mail.js}).
     * If omited, sendmail will be used. Sendmail is not installed in Docker images.
     * @type {Object}
     */
    mail: {
        // nodemailer transport to use (only nodemailer-sendmail-transport & nodemailer-smtp-transport are installed by default,
        //transport: 'nodemailer-smtp-transport',

        // config object passed to the transport
        config: {
            //host: 'smtp.example.com',
            //port: 25,
            //auth: {
            //user: 'USER',
            //pass: 'PASSWORD'
            //},
        },

        // standard strings used in email templates
        strings: {
            //from: 'countly@example.com',
            //hithere: 'there' // as in "Hi, there" when name is unknown
        }
    }
};

/** @type {CountlyAPIConfig} */
module.exports = require('./configextender')('API', countlyConfig, process.env);
