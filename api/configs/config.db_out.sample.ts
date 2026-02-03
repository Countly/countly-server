/**
 * Sample configuration for output database connection
 * Copy this file to config.db_out.ts and modify as needed
 * @module api/configs/config.db_out.sample
 */

/** MongoDB database options */
interface DbOptions {
    /** Use native parser */
    native_parser?: boolean;
}

/** MongoDB server options */
interface ServerOptions {
    /** Enable SSL */
    ssl?: boolean;
}

/** MongoDB connection configuration */
interface MongoDBConfig {
    /** Database host */
    host?: string;
    /** Database name */
    db?: string;
    /** Database port */
    port?: number;
    /** Maximum connection pool size */
    max_pool_size?: number;
    /** Database username */
    username?: string;
    /** Database password */
    password?: string;
    /** Database options */
    dbOptions?: DbOptions;
    /** Server options */
    serverOptions?: ServerOptions;
    /** Replica set servers */
    replSetServers?: string[];
    /** Replica set name */
    replicaName?: string;
}

/** Countly output configuration */
export interface CountlyDbOutConfig {
    /** MongoDB configuration (object or connection string) */
    mongodb: MongoDBConfig | string;
}

const countlyConfig: CountlyDbOutConfig = {
    mongodb: {
        host: "localhost",
        db: "countly_out",
        port: 27017,
        max_pool_size: 500
        // username: "test",
        // password: "test",
        /*
        dbOptions: {
            // db options
            native_parser: true
        },
        serverOptions: {
            // server options
            ssl: false
        }
        */
    }
    /*  or for a replica set
    mongodb: {
        replSetServers: [
            '192.168.3.1:27017',
            '192.168.3.2:27017'
        ],
        replicaName: "test",
        db: "countly_out",
        username: "test",
        password: "test",
        max_pool_size: 1000,
        dbOptions: {
            // db options
            native_parser: true
        },
        serverOptions: {
            // server options
            ssl: false
        }
    },
    */
    /*  or define as a url
    // mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
    mongodb: "mongodb://localhost:27017/countly_out",
    */
};

export default countlyConfig;
