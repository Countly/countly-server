/**
* Module for user provided dashboard configurations
* @module frontend/express/config
*/

/** @lends module:frontend/express/config */
var countlyConfig = {
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
        max_pool_size: 10,
        //username: test,
        //password: test,
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
        db: "countly",
		replicaName: "test",
		username: test,
		password: test,
        max_pool_size: 10,
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
    * Default dashboard configuration
    * @type {object} 
    * @property {number} [port=6001] - dashboard port number to use, default 6001
    * @property {string} [host=localhost] - host to which to bind connection
    * @property {boolean} use_intercom - true, to use intercom in dashboard for communication with Countly
    * @property {boolean} secure_cookies - true, to use secure cookies, enable only if you have https enabled
    * @property {string} session_secret - secret used to sign the session ID cookie.
    * @property {string} track - allow Countly to collect stats about amount of apps and datapoints as well as feature usage.  
    * Possible values are: 
    *    "all" - track all, 
    *    "GA" - track only Global admins, 
    *    "noneGA" - track only users who are not Global admins, 
    *    "none" - not to track anything or anyone
    */
    web: {
        port: 6001,
        host: "localhost",
        use_intercom: true,
        secure_cookies: false,
        track: "all",
        session_secret: "countlyss"
    },
    /**
    * Legacy value, not supported
    * @type {string} 
    */
    path: "",
    /**
    * Legacy value, not supported
    * @type {string} 
    */
    cdn: ""
};

module.exports = require('../../api/configextender')('FRONTEND', countlyConfig, process.env);
