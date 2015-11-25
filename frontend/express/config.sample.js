var countlyConfig = {
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
            ssl:true
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
        /*
        dbOptions:{
            //db options
            native_parser: true
        },
        serverOptions:{
            //server options
            ssl:true
        }
        */
    },
    */
    /*  or define as a url
	//mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
	mongodb: "mongodb://localhost:27017/countly",
    */
    web: {
        port: 6001,
        host: "localhost",
        use_intercom: true
    },
	path: "",
	cdn: ""
};

module.exports = countlyConfig;