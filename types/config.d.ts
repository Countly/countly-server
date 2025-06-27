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
    
    /** API server settings */
    api: APIConfig;
    
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

/** Union type for any Countly configuration */
export type CountlyConfig = CountlyAPIConfig | CountlyFrontendConfig;

/** Main config export - defaults to API config type */
declare const countlyConfig: CountlyAPIConfig;
export default countlyConfig;