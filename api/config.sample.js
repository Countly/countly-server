var countlyConfig = {};

// Set your host IP or domain to be used in the emails sent
// countlyConfig.host = "YOUR_IP_OR_DOMAIN";

countlyConfig.mongodb = {};
countlyConfig.api = {};

countlyConfig.mongodb.host = "localhost";
countlyConfig.mongodb.db = "countly";
countlyConfig.mongodb.port = 27017;
countlyConfig.api.port = 3001;

module.exports = countlyConfig;