var stats = {},
    common = require('./../../utils/common.js'),
    async = require('./../../utils/async.min.js');

(function (stats) {

    stats.getOverall = function (callback) {
        getTotalUsers(function(totalUsers, totalApps) {
            getTotalEvents(function(totalEvents) {
                getTotalMsgUsers(function(totalMsgUsers) {
                    getTotalMsgCreated(function(totalMsgCreated) {
                        getTotalMsgSent(function(totalMsgSent) {
                            callback({
                                "total-users": totalUsers,
                                "total-apps": totalApps,
                                "total-events": totalEvents,
                                "total-msg-users": totalMsgUsers,
                                "total-msg-created": totalMsgCreated,
                                "total-msg-sent": totalMsgSent
                            });
                        });
                    });
                });
            });
        });
    };

    function getTotalUsers(callback) {
        common.db.collection("apps").find({}, {_id:1}).toArray(function (err, allApps) {
			if(err || !allApps)
				callback(0, 0);
			else
				async.map(allApps, getUserCountForApp, function (err, results) {
					if (err)
						callback(0, 0);
	
					var userCount = 0;
	
					for (var i = 0; i < results.length; i++) {
						userCount += results[i];
					}
	
					callback(userCount, allApps.length);
				});
        });
    }

    function getTotalEvents(callback) {
        common.db.collection("events").find({}, {'list':1}).toArray(function (err, events) {
			if (err || !events)
                callback(0);
			else{
				var eventCount = 0;
	
				for (var i = 0; i < events.length; i++) {
					if (events[i] && events[i]["list"]) {
						eventCount += events[i]["list"].length;
					}
				}
	
				callback(eventCount);
			}
        });
    }

    function getTotalMsgUsers(callback) {
        common.db.collection("users").find({_id: {"$regex": ".*:0$"}}, {"d.m":1}).toArray(function (err, msgUsers) {
			if (err || !msgUsers)
                callback(0);
			else{
				var msgUserCount = 0;
	
				for (var i = 0; i < msgUsers.length; i++) {
					if (msgUsers[i] && msgUsers[i]["d"] && msgUsers[i]["d"]["m"]) {
						msgUserCount += msgUsers[i]["d"]["m"];
					}
				}
	
				callback(msgUserCount);
			}
        });
    }

    function getTotalMsgCreated(callback) {
        common.db.collection("messages").count(function (err, msgCreated) {
			if (err || !msgCreated)
                callback(0);
			else
				callback(msgCreated);
        });
    }

    function getTotalMsgSent(callback) {
        common.db.collection("messages").find({}, {"result":1}).toArray(function (err, messages) {
			if (err || !messages)
                callback(0);
			else{
				var sentMsgCount = 0;
	
				for (var i = 0; i < messages.length; i++) {
					if (messages[i] && messages[i]["result"] && messages[i]["result"]["sent"]) {
						sentMsgCount += messages[i]["result"]["sent"];
					}
				}
	
				callback(sentMsgCount);
			}
        });
    }

    function getUserCountForApp(app, callback) {
        common.db.collection("app_users" + app._id).find({}).count(function (err, count) {
			if (err || !count)
                callback(0);
			else
				callback(err, count);
        });
    }

}(stats));

module.exports = stats;