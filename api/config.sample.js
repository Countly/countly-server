var countlyConfig = {
    mongodb: {
        host: "localhost",
        db: "countly",
        port: 27017,
        max_pool_size: 500,
		//username: test,
		//password: test
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
        max_pool_size: 1000
    },
    */
    /*  or define as a url
	//mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
	mongodb: "mongodb://localhost:27017/countly",
    */
    api: {
        port: 3001,
        host: "localhost",
        max_sockets: 1024
    },
	path: "",
    logging: {
        info: ["jobs", "push"],
        default: "warn"
    }
};

// Set your host IP or domain to be used in the emails sent
// countlyConfig.host = "YOUR_IP_OR_DOMAIN";

module.exports = countlyConfig;