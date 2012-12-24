var stats = {},
    common = require('./../../utils/common.js'),
    async = require('./../../utils/async.min.js');

(function (stats) {

    stats.totalUsers = function (callback) {
        common.db.collection("apps").find({}, {_id:1}).toArray(function (err, allApps) {
            async.map(allApps, getUserCountForApp, function (err, results) {
                if (err) {
                    callback(0);
                }

                var userCount = 0;

                for (var i = 0; i < results.length; i++) {
                    userCount += results[i];
                }

                callback(userCount, allApps.length);
            });
        });
    };

    stats.totalReqs = function (callback) {
        common.db.collection("sessions").find({}, {'2012.e':1, '2013.e':1}).toArray(function (err, sessions) {
            var reqCount = 0;

            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] && sessions[i]["2012"] && sessions[i]["2012"]["e"]) {
                    reqCount += sessions[i]["2012"]["e"];
                }

                if (sessions[i] && sessions[i]["2013"] && sessions[i]["2013"]["e"]) {
                    reqCount += sessions[i]["2013"]["e"];
                }
            }

            callback(reqCount);
        });
    };

    stats.totalEvents = function (callback) {
        common.db.collection("events").find({}, {'list':1}).toArray(function (err, events) {
            var eventCount = 0;

            for (var i = 0; i < events.length; i++) {
                if (events[i] && events[i]["list"]) {
                    eventCount += events[i]["list"].length;
                }
            }

            callback(eventCount);
        });
    };

    function getUserCountForApp(app, callback) {
        common.db.collection("app_users" + app._id).find({}).count(function (err, count) {
            callback(err, count);
        });
    }

}(stats));

module.exports = stats;