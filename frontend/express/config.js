var countlyConfig = {
    mongodb: {
        host: "localhost",
        db: "countly",
        port: 27017
    },
    /*  or for a replica set
    mongodb: {
        replSetServers : [
            '192.168.3.1:27017/?auto_reconnect=true',
            '192.168.3.2:27017/?auto_reconnect=true'
        ],
        db: "countly",
    },
    */
    /*  or define as a url
    mongodb: "localhost:27017/countly?auto_reconnect=true",
    */
    web: {
        port: 6001,
        host: "localhost",
        use_intercom: true
    }
};

module.exports = countlyConfig;