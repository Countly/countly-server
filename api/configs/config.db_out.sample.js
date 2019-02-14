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
    }
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
};

module.exports = countlyConfig;