var countlyConfig = {
    mongodb: {
        host: "localhost",
        db: "countly",
        port: 27017
    },
    web: {
        port: 6001,
        host: "localhost",
        use_intercom: true
    }
};

module.exports = countlyConfig;