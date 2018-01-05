var stats = {},
    async = require('async');

(function (stats) {
	var countlyDb;
    stats.getOverall = function (db, callback) {
		countlyDb = db;
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
    
    stats.getUser = function (db, user, callback) {
		countlyDb = db;
        var apps;
        
        if(!user.global_admin){
            apps = user.user_of || [];
        }

        getTotalEvents(function(totalEvents) {
            getTotalMsgSent(function(totalMsgSent) {
                getCrashGroups(function(totalCrashgroups) {
                    getAllPlatforms(function(platforms) {
                        getTotalUsers(function(userCount) {
                            callback({
                                "total-events": totalEvents,
                                "total-msg-sent": totalMsgSent,
                                "total-crash-groups": totalCrashgroups,
                                "total-platforms": platforms,
                                "total-users": userCount
                            });
                        }, apps);
                    }, apps);
                }, apps);
            }, apps);
        }, apps);
    };

    function getTotalUsers(callback, apps) {
        if(typeof apps != "undefined"){
            async.map(apps, function(app, callback){
                getUserCountForApp({_id:app}, callback);
            }, function (err, results) {
                if (err)
                    callback(0, 0);
        
                var userCount = 0;
        
                for (var i = 0; i < results.length; i++) {
                    userCount += results[i] || 0;
                }
        
                callback(userCount, apps.length);
            });
        }
        else{
            countlyDb.collection("apps").find({}, {_id:1}).toArray(function (err, allApps) {
                if(err || !allApps)
                    callback(0, 0);
                else
                    async.map(allApps, getUserCountForApp, function (err, results) {
                        if (err)
                            callback(0, 0);
        
                        var userCount = 0;
        
                        for (var i = 0; i < results.length; i++) {
                            userCount += results[i] || 0;
                        }
        
                        callback(userCount, allApps.length);
                    });
            });
        }
    }

    function getTotalEvents(callback, apps) {
        var query = {};
        if(typeof apps != "undefined"){
            var inarray = [];
            for(var i = 0; i <  apps.length; i++){
                if(apps[i] && apps[i].length)
                    inarray.push(countlyDb.ObjectID(apps[i]));
            }
            query._id = {$in:inarray};
        }
        countlyDb.collection("events").find(query, {'list':1}).toArray(function (err, events) {
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
        countlyDb.collection("users").find({_id: {"$regex": ".*:0.*"}}, {"d.m":1}).toArray(function (err, msgUsers) {
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
        countlyDb.collection("messages").count(function (err, msgCreated) {
			if (err || !msgCreated)
                callback(0);
			else
				callback(msgCreated);
        });
    }

    function getTotalMsgSent(callback, apps) {
        var query = {};
        if(typeof apps != "undefined"){
            var inarray = [];
            for(var i = 0; i <  apps.length; i++){
                if(apps[i] && apps[i].length)
                    inarray.push(countlyDb.ObjectID(apps[i]));
            }
            query.apps = {$in:inarray};
        }
        countlyDb.collection("messages").find(query, {"result":1}).toArray(function (err, messages) {
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
        countlyDb.collection("app_users" + app._id).find({}).count(function (err, count) {
			if (err || !count)
                callback(0);
			else
				callback(err, count);
        });
    }
    
    function getCrashGroupsForApp(app, callback) {
        countlyDb.collection("app_crashgroups" + app).find({}).count(function (err, count) {
			if (err || !count)
                callback(null, 0);
			else
				callback(err, count);
        });
    }
    
    function getCrashGroups(callback, apps){
        if(typeof apps != "undefined"){
            async.map(apps, getCrashGroupsForApp, function (err, results) {
                if (err)
                    callback(0, 0);
        
                var userCount = 0;
        
                for (var i = 0; i < results.length; i++) {
                    userCount += results[i];
                }
        
                callback(userCount, apps.length);
            });
        }
        else{
            countlyDb.collection("apps").find({}, {_id:1}).toArray(function (err, allApps) {
                if(err || !allApps)
                    callback(0, 0);
                else
                    async.map(allApps, getCrashGroupsForApp, function (err, results) {
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
    }
    
    function getAllPlatforms(callback, apps) {
        countlyDb.collection("device_details").find({_id: {"$regex": ".*:0.*"}}, {"a":1, "meta":1}).toArray(function (err, arr) {
			if (err || !arr)
                callback(0);
			else{
				var platforms = {};
	
				for (var i = 0; i < arr.length; i++) {
					if (arr[i] && arr[i].meta && arr[i].meta.os && (typeof apps == "undefined" || apps.indexOf(arr[i].a) > -1)) {
						for(var j = 0; j < arr[i].meta.os.length; j++){
                            platforms[arr[i].meta.os[j]] = true;
                        }
					}
				}
	
				callback(Object.keys(platforms));
			}
        });
    }

}(stats));

module.exports = stats;