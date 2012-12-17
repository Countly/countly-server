var countlyConfig = {};

countlyConfig.mongodb = {};
countlyConfig.web = {};

countlyConfig.mongodb.host = "localhost";
countlyConfig.mongodb.db = "countly";
countlyConfig.mongodb.port = 27017;
countlyConfig.web.port = 6001;
countlyConfig.web.base = '';

module.exports = countlyConfig;
