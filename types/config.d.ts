/** MongoDB configuration object */
export interface MongoDBConfig {
  // Standard connection
  host?: string; // default: "localhost"
  db?: string; // default: "countly"
  port?: number; // default: 27017
  max_pool_size?: number; // default: 500
  username?: string;
  password?: string;
  mongos?: boolean;
  dbOptions?: Record<string, any>;
  serverOptions?: Record<string, any>;

  // Replica set connection (alternative to host)
  replSetServers?: string[]; // Array of "host:port" strings
  replicaName?: string; // Required for replica sets
}

/** API server configuration */
export interface APIConfig {
  port?: number; // default: 3001
  host?: string; // default: "localhost"
  max_sockets?: number; // default: 1024
  workers?: number; // defaults to CPU core count
  timeout?: number; // default: 120000 (2 minutes)
  maxUploadFileSize?: number; // default: 200MB
}

/** Logging configuration */
export interface LoggingConfig {
  default?: string; // default: "warn"
  info?: string[]; // default: ["jobs", "push"]
  [level: string]: string | string[] | undefined;
}

/** Encryption configuration */
export interface EncryptionConfig {
  key?: string; // key used for encryption/decryption
  iv?: string | Buffer; // initialization vector
  algorithm?: string; // default: "aes-256-cbc"
  input_encoding?: string; // default: "utf-8"
  output_encoding?: string; // default: "hex"
  reports_key?: string; // key for report link encryption
}

/** Database adapter configuration */
export interface DatabaseAdapterConfig {
  /** Enable this adapter */
  enabled?: boolean; // default: true
}

/** Database configuration */
export interface DatabaseConfig {
  /** Whether to kill process if non-MongoDB database adapters fail connection on startup */
  failOnConnectionError?: boolean; // default: true
  /** Enable db_override toggle and related debugging features in UI and backend for drill */
  debug?: boolean; // default: false
  /** Adapter preference order for QueryRunner (first match wins) */
  adapterPreference?: string[]; // default: ['mongodb', 'clickhouse']
  /** Adapter availability settings for QueryRunner */
  adapters?: {
    mongodb?: DatabaseAdapterConfig;
    clickhouse?: DatabaseAdapterConfig;
  };
}

/** Mail configuration */
export interface MailConfig {
  transport?: string; // e.g., 'nodemailer-smtp-transport'
  config?: {
    host?: string;
    port?: number;
    auth?: {
      user?: string;
      pass?: string;
    };
    ignoreTLS?: boolean;
    [key: string]: any;
  };
  strings?: {
    from?: string;
    hithere?: string; // greeting when name is unknown
    [key: string]: any;
  };
}

/** Web/Frontend configuration */
export interface WebConfig {
  port?: number; // default: 6001
  host?: string; // default: "localhost"
  use_intercom?: boolean; // default: true
  secure_cookies?: boolean; // default: false
  track?: "all" | "GA" | "noneGA" | "none"; // default: "all"
  theme?: string; // default: ""
  session_secret?: string; // default: "countlyss"
  session_name?: string; // default: "connect.sid"
}

/** Cookie configuration */
export interface CookieConfig {
  path?: string; // default: "/"
  httpOnly?: boolean; // default: true
  secure?: boolean; // default: false
  maxAge?: number; // default: 1 day in milliseconds
  maxAgeLogin?: number; // default: 1 year in milliseconds
  domain?: string;
  expires?: Date;
  sameSite?: boolean | string;
}

/**
 * API Configuration - Complete API server configuration
 */
export interface CountlyAPIConfig {
  /** MongoDB connection configuration - can be object or connection string */
  mongodb: MongoDBConfig | string;

  /** ClickHouse connection configuration */
  clickhouse?: ClickHouseConfig;

  /** Kafka integration configuration */
  kafka?: KafkaConfig;

  /** EventSink configuration for writing events to multiple destinations */
  eventSink?: EventSinkConfig;

  /** API server settings */
  api: APIConfig;

  /** Database connection and adapter configuration */
  database: DatabaseConfig;

  /** Path to use for countly directory, empty path if installed at root of website */
  path: string; // default: ""

  /** Logging configuration */
  logging: LoggingConfig;

  /** Proxy IP addresses to ignore when determining client IP */
  ignoreProxies?: string[];

  /** Encryption settings for data security */
  encryption: EncryptionConfig;

  /** File storage method */
  fileStorage: "fs" | "gridfs"; // default: "gridfs"

  /** Config reload interval in milliseconds */
  reloadConfigAfter: number; // default: 10000 (10 seconds)

  /** Prevent background jobs from running */
  preventJobs: boolean; // default: false

  /** Use shared database connection */
  shared_connection: boolean; // default: true

  /** Mail configuration for sending emails */
  mail: MailConfig;

  /** Additional configuration properties */
  [key: string]: any;
}

/**
 * Frontend Configuration - Complete frontend/dashboard configuration
 */
export interface CountlyFrontendConfig {
  /** MongoDB connection configuration - can be object or connection string */
  mongodb: MongoDBConfig | string;

  /** Web server settings */
  web: WebConfig;

  /** Cookie configuration */
  cookie: CookieConfig;

  /** Legacy path setting (not supported) */
  path?: string;

  /** Legacy CDN setting (not supported) */
  cdn?: string;

  /** Password secret for hashing */
  passwordSecret: string; // default: ""

  /** Additional configuration properties */
  [key: string]: any;
}

/** Kafka producer configuration */
export interface KafkaProducerConfig {
  /** Maximum batch size in bytes */
  batchSize?: number; // default: 1048576 (1MB)
  /** Maximum number of messages per batch */
  batchNumMessages?: number; // default: 10000
  /** Maximum messages to buffer in producer queue */
  queueBufferingMaxMessages?: number; // default: 100000
  /** Maximum memory for buffering in KB */
  queueBufferingMaxKbytes?: number; // default: 1048576 (1GB)
  /** LZ4 compression level 1-12 */
  compressionLevel?: number; // default: 1
  /** Maximum time to deliver a message in milliseconds */
  messageTimeoutMs?: number; // default: 300000 (5 minutes)
  /** Total time for delivery including retries in milliseconds */
  deliveryTimeoutMs?: number; // default: 300000 (5 minutes)
}

/** Kafka consumer configuration */
export interface KafkaConsumerConfig {
  /** Minimum bytes to fetch per request */
  fetchMinBytes?: number; // default: 1024
  /** Maximum wait time for fetch requests in milliseconds */
  fetchMaxWaitMs?: number; // default: 500
  /** Maximum bytes to fetch per request */
  fetchMaxBytes?: number; // default: 52428800 (50MB)
  /** Maximum bytes per partition per fetch */
  maxPartitionFetchBytes?: number; // default: 1048576 (1MB)
  /** Minimum messages to queue before consuming */
  queuedMinMessages?: number; // default: 100000
  /** Maximum memory for message queue in KB */
  queuedMaxMessagesKbytes?: number; // default: 1048576 (1GB)
  /** Consumer session timeout in milliseconds */
  sessionTimeoutMs?: number; // default: 30000
  /** Maximum time between polls in milliseconds */
  maxPollIntervalMs?: number; // default: 300000 (5 minutes)
  /** Where to start reading when no offset exists */
  autoOffsetReset?: "latest" | "earliest"; // default: "latest"
  /** Disable auto-commit for exactly-once processing */
  enableAutoCommit?: boolean; // default: false
}

/** Kafka rdkafka (librdkafka) configuration */
export interface KafkaRdkafkaConfig {
  /** List of Kafka broker addresses */
  brokers?: string[]; // default: ["localhost:9092"]
  /** Client identifier for Kafka connections */
  clientId?: string; // default: "countly-kafka-client"
  /** Request timeout for Kafka operations */
  requestTimeoutMs?: number; // default: 30000
  /** Connection timeout for initial broker connections */
  connectionTimeoutMs?: number; // default: 10000
  /** Security protocol */
  securityProtocol?: "PLAINTEXT" | "SSL" | "SASL_PLAINTEXT" | "SASL_SSL" | null;
  /** SASL mechanism */
  saslMechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512" | "GSSAPI" | null;
  /** SASL username for authentication */
  saslUsername?: string | null;
  /** SASL password for authentication */
  saslPassword?: string | null;
  /** Time to wait for more messages before sending batch */
  lingerMs?: number; // default: 5
  /** Number of retries for failed requests */
  retries?: number; // default: 8
  /** Initial retry backoff time in milliseconds */
  initialRetryTime?: number; // default: 100
  /** Maximum retry backoff time in milliseconds */
  maxRetryTime?: number; // default: 30000
  /** Acknowledgment level (-1: all replicas, 1: leader only, 0: no acks) */
  acks?: -1 | 1 | 0; // default: -1
}

/** Kafka configuration */
export interface KafkaConfig {
  /** Enable/disable Kafka integration globally */
  enabled?: boolean; // default: false
  /** Default topic name for event data */
  drillEventsTopic?: string; // default: "countly-drill-events"
  /** Prefix added to all consumer group IDs */
  groupIdPrefix?: string; // default: "cly_"
  /** Default number of partitions for new topics */
  partitions?: number; // default: 10
  /** Default replication factor for new topics */
  replicationFactor?: number; // default: 1
  /** Message retention time in milliseconds */
  retentionMs?: number; // default: 604800000 (7 days)
  /** Enable transactional producers */
  enableTransactions?: boolean; // default: false
  /** Custom transactional ID prefix */
  transactionalId?: string;
  /** Transaction timeout in milliseconds */
  transactionTimeout?: number; // default: 60000
  /** librdkafka configuration settings */
  rdkafka?: KafkaRdkafkaConfig;
  /** Producer-specific settings */
  producer?: KafkaProducerConfig;
  /** Consumer-specific settings */
  consumer?: KafkaConsumerConfig;
}

/** EventSink configuration */
export interface EventSinkConfig {
  /** Array of sink types to enable */
  sinks?: Array<"mongo" | "kafka">; // default: ["mongo"]
}

/** ClickHouse database configuration */
export interface ClickHouseConfig {
  /** ClickHouse server URL */
  url?: string; // default: "http://localhost:8123"
  /** Username for authentication */
  username?: string; // default: "default"
  /** Password for authentication */
  password?: string; // default: ""
  /** Database name */
  database?: string; // default: "countly_drill"
  /** Compression settings */
  compression?: {
    /** Enable request compression */
    request?: boolean; // default: false
    /** Enable response compression */
    response?: boolean; // default: false
  };
  /** Application name for connection */
  application?: string; // default: "countly_drill"
  /** Request timeout in milliseconds */
  request_timeout?: number; // default: 1200000 (20 minutes)
  /** Keep alive settings */
  keep_alive?: {
    /** Enable keep alive */
    enabled?: boolean; // default: true
    /** Idle socket TTL in milliseconds */
    idle_socket_ttl?: number; // default: 10000
  };
  /** Maximum number of open connections */
  max_open_connections?: number; // default: 10
  /** ClickHouse specific settings */
  clickhouse_settings?: {
    /** Idle connection timeout */
    idle_connection_timeout?: string;
    /** Enable async inserts */
    async_insert?: number;
    /** Wait for async insert to complete */
    wait_for_async_insert?: number;
    /** Wait for query to complete */
    wait_end_of_query?: number;
    /** Optimize on insert */
    optimize_on_insert?: number;
    /** Allow suspicious types in GROUP BY */
    allow_suspicious_types_in_group_by?: number;
    /** Allow suspicious types in ORDER BY */
    allow_suspicious_types_in_order_by?: number;
    /** Optimize move to prewhere */
    optimize_move_to_prewhere?: number;
    /** Query plan optimize lazy materialization */
    query_plan_optimize_lazy_materialization?: number;
    /** Allow experimental object type (for JSON columns) */
    allow_experimental_object_type?: number;
    /** Additional ClickHouse settings */
    [key: string]: any;
  };
  /** Additional connection options */
  [key: string]: any;
}

/** Union type for any Countly configuration */
export type CountlyConfig = CountlyAPIConfig | CountlyFrontendConfig;

/** Main config export - defaults to API config type */
declare const countlyConfig: CountlyAPIConfig;
export default countlyConfig;
