const async = require('async'),
    pluginManager = require('../pluginManager.js'),
    countlyConfig = require('../../api/config', 'dont-enclose');

const countlyDb = pluginManager.dbConnection(countlyConfig);

const db_name_notifs = "assistant_notifs";
// Adding  2 month long TTL for notifications 
// 60 seconds * 60 minutes * 24 hours * 31 days * 2 months
// 60 * 60 * 24 * 31 * 2 = 5 356 800
countlyDb.collection(db_name_notifs).ensureIndex({cd: 1}, {expireAfterSeconds: 5356800}, function () {
    countlyDb.collection(db_name_notifs).ensureIndex({app_id: 1}, {}, function () {
        countlyDb.close();
    });
});