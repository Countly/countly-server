/**
* Module for user provided API configurations
* @module api/config
*/

/** @lends module:api/config */
var countlyConfig = {
    /**
    * MongoDB connection definition and options
    * @type {object} 
    * @property {string} host - host where to connect to mongodb, default localhost
    * @property {array=} replSetServers - array with multiple hosts, if you are connecting to replica set, provide this instead of host
    * @property {string=} replicaName - replica name, must provide for replica set connection to work
    * @property {string} db - countly database name, default countly
    * @property {number} port - port to use for mongodb connection, default 27017
    * @property {number} max_pool_size - how large pool size connection per process to create, default 500 per process, not recommended to be more than 1000 per server
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
		//username: test,
		//password: test,
        //mongos: false,
        /*
        dbOptions:{
            //db options
            native_parser: true
        },
        serverOptions:{
            //server options
            ssl:false
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
        max_pool_size: 1000,
        dbOptions:{
            //db options
            native_parser: true
        },
        serverOptions:{
            //server options
            ssl:false
        }
    },
    */
    /*  or define as a url
	//mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
	mongodb: "mongodb://localhost:27017/countly",
    */
    /**
    * Default API configuration
    * @type {object} 
    * @property {number} port - api port number to use, default 3001
    * @property {string} host - host to which to bind connection
    * @property {number} max_sockets - maximal amount of sockets to open simoultaniously
    * @property {object=} push_proxy - push proxy settings
    */
    api: {
        port: 3001,
        host: "localhost",
        max_sockets: 1024
        /* GCM proxy server for push plugin
        push_proxy: {
            host: 'localhost',
            port: 8888
        } */
    },
    /**
    * Path to use for countly directory, empty path if installed at root of website
    * @type {string} 
    */
	path: "",
    /**
    * Default logging settings
    * @type {object} 
    * @property {string} default - default level of logging for {@link logger}
    * @property {array=} info - modules to log for information level for {@link logger}
    */
    logging: {
        info: ["jobs", "push"],
        default: "warn"
    },
    /**
    * Default proxy settings, if provided then countly uses ip address from the right side of x-forwaded-for header ignoring list of provided proxy ip addresses
    * @type {array=} 
    */
    ignoreProxies:[/*"127.0.0.1"*/],
    
    /**
    * Default settings to be used for {@link module:api/utils/common.encrypt} and {@link module:api/utils/common.decrypt} functions and for commandline
    * @type {object}
    * @property {string} key - key used for encryption and decryption
    * @property {string|Buffer} iv - initialization vector to make encryption more secure
    * @property {string} algorithm - name of the algorithm to use for encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
    * @property {string} input_encoding - how encryption input is encoded. Used as output for decrypting. Default utf-8.
    * @property {string} output_encoding - how encryption output is encoded. Used as input for decrypting. Default hex.
    */
    encryption:{}
};

// Set your host IP or domain to be used in the emails sent
// countlyConfig.host = "YOUR_IP_OR_DOMAIN";

module.exports = countlyConfig;