var countlyConfig = {
    mongodb: {
        host: "localhost",
        db: "countly_out",
        port: 27017,
        max_pool_size: 500,
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
		replicaName: "test",
        db: "countly_out",
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
	mongodb: "mongodb://localhost:27017/countly_out",
    */
    /**
    * Default API configuration
    * @type {object} 
    * @property {number} [port=3001] - api port number to use, default 3001
    * @property {string} [host=localhost] - host to which to bind connection
    * @property {number} [max_sockets=1024] - maximal amount of sockets to open simultaneously
    * @property {number} workers - amount of paralel countly processes to run, defaults to cpu/core amount
    * @property {number} [timeout=120000] - nodejs server request timeout, need to also increase nginx timeout too for longer requests
    */
    api: {
        port: 4001,
        host: "localhost",
        max_sockets: 1024,
        timeout: 120000
    },
};

module.exports = countlyConfig;