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
