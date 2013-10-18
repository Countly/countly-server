var countlyConfig = {
    mongodb: {
        host: "localhost",
        db: "countly",
        port: 27017,
        max_pool_size: 1000
    },
    /*  or for a replica set
    mongodb: {
        replSetServers : [
            '192.168.3.1:27017/?auto_reconnect=true',
            '192.168.3.2:27017/?auto_reconnect=true'
        ],
        db: "countly",
        max_pool_size: 1000
    },
    */
    /*  or define as a url
    mongodb: "localhost:27017/countly?auto_reconnect=true",
    */
    api: {
        workers: 0,
        port: 3001,
        host: "localhost",
        safe: false,
        session_duration_limit: 120,
        max_sockets: 1024,
        city_data: true
    },
    apps: {
        country: "TR",
        timezone: "Europe/Istanbul",
        category: "6"
    }
};

// Set your host IP or domain to be used in the emails sent
// countlyConfig.host = "YOUR_IP_OR_DOMAIN";

module.exports = countlyConfig;