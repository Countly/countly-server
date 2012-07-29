var countlyConfig = {};

countlyConfig.mongodb = {};
countlyConfig.api = {};

countlyConfig.mongodb.host = "localhost";
countlyConfig.mongodb.db = "countly";
countlyConfig.mongodb.port = 27017;
countlyConfig.api.port = 3001;

module.exports = countlyConfig;