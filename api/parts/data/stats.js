/**
* This module retrieves some stats from server
* @module "api/parts/data/stats"
*/

/** @lends module:api/parts/data/stats */
var stats = {},
    async = require('async'),
    common = require("../../utils/common.js"),
    { getUserApps } = require('../../utils/rights.js');

var countlyDb;
/**
* Get overal server data
* @param {object} db - database connection
* @param {function} callback - function to call when done
**/
stats.getOverall = function(db, callback) {
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

/**
* Get minimal server data
* @param {object} db - database connection
* @param {function} callback - function to call when done
**/
stats.getServer = function(db, callback) {
    countlyDb = db;
    getTotalUsers(function(totalAppUsers, totalApps) {
        getDashboardUsers(function(totalUsers) {
            callback({
                "app_users": totalAppUsers,
                "apps": totalApps,
                "users": totalUsers
            });
        });
    });
};

/**
* Get overal user data
* @param {object} db - database connection
* @param {object} user - members document from db
* @param {function} callback - function to call when done
**/
stats.getUser = function(db, user, callback) {
    countlyDb = db;
    var apps;

    if (!user.global_admin) {
        apps = getUserApps(user) || [];
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

/**
* Get total users for all apps
* @param {function} callback - function to call when done
* @param {array=} apps - provide array of apps to fetch data for, else will fetch data for all apps
**/
function getTotalUsers(callback, apps) {
    /**
     *  Process app result
     *  @param {Error} err - database error
     *  @param {Array} allApps - array of apps
     */
    function processApps(err, allApps) {
        if (err || !allApps) {
            callback(0, 0);
        }
        else {
            async.map(allApps, getUserCountForApp, function(err2, results) {
                if (err2) {
                    callback(0, 0);
                }

                var userCount = 0;

                for (let i = 0; i < results.length; i++) {
                    userCount += results[i] || 0;
                }

                callback(userCount, allApps.length);
            });
        }
    }
    if (typeof apps !== "undefined") {
        async.map(apps, function(app, done) {
            getUserCountForApp({_id: app}, done);
        }, function(err, results) {
            if (err) {
                callback(0, 0);
            }

            var userCount = 0;

            for (let i = 0; i < results.length; i++) {
                userCount += results[i] || 0;
            }

            callback(userCount, apps.length);
        });
    }
    else {
        if (common.readBatcher) {
            common.readBatcher.getMany("apps", {}, {_id: 1}, processApps);
        }
        else {
            countlyDb.collection("apps").find({}, {_id: 1}).toArray(processApps);
        }
    }
}

/**
* Get total events for all apps
* @param {function} callback - function to call when done
* @param {array=} apps - provide array of apps to fetch data for, else will fetch data for all apps
**/
function getTotalEvents(callback, apps) {
    var query = {};
    if (typeof apps !== "undefined") {
        var inarray = [];
        for (let i = 0; i < apps.length; i++) {
            if (apps[i] && apps[i].length) {
                inarray.push(countlyDb.ObjectID(apps[i]));
            }
        }
        query._id = {$in: inarray};
    }
    countlyDb.collection("events").aggregate([{$match: query}, {$project: {len: {$size: '$list'}}}, {$group: {_id: 'count', len: {$sum: '$len'}}}], function(err, count) {
        callback(count && count[0] && count[0].len || 0);
    });
}

/**
* Get total messaging users for all apps
* @param {function} callback - function to call when done
**/
function getTotalMsgUsers(callback) {
    countlyDb.collection("users").find({_id: {"$regex": ".*:0.*"}}, {"d.m": 1}).toArray(function(err, msgUsers) {
        if (err || !msgUsers) {
            callback(0);
        }
        else {
            var msgUserCount = 0;

            for (let i = 0; i < msgUsers.length; i++) {
                if (msgUsers[i] && msgUsers[i].d && msgUsers[i].d.m) {
                    msgUserCount += msgUsers[i].d.m;
                }
            }

            callback(msgUserCount);
        }
    });
}

/**
* Get total messages for all apps
* @param {function} callback - function to call when done
**/
function getTotalMsgCreated(callback) {
    countlyDb.collection("messages").estimatedDocumentCount(function(err, msgCreated) {
        if (err || !msgCreated) {
            callback(0);
        }
        else {
            callback(msgCreated);
        }
    });
}

/**
* Get total messagess sent for all apps
* @param {function} callback - function to call when done
* @param {array=} apps - provide array of apps to fetch data for, else will fetch data for all apps
**/
function getTotalMsgSent(callback, apps) {
    var query = {};
    if (typeof apps !== "undefined") {
        var inarray = [];
        for (let i = 0; i < apps.length; i++) {
            if (apps[i] && apps[i].length) {
                inarray.push(countlyDb.ObjectID(apps[i]));
            }
        }
        query.apps = {$in: inarray};
    }
    countlyDb.collection("messages").aggregate([{$match: query}, {$group: {_id: 'count', sent: {$sum: '$result.sent'}}}], function(err, count) {
        callback(count && count[0] && count[0].sent || 0);
    });
}

/**
* Get total user count for app
* @param {object} app - app document from db
* @param {function} callback - function to call when done
**/
function getUserCountForApp(app, callback) {
    countlyDb.collection("app_users" + app._id).estimatedDocumentCount(function(err, count) {
        if (err || !count) {
            callback(null, 0);
        }
        else {
            callback(null, count);
        }
    });
}

/**
* Get dashboard user count
* @param {function} callback - function to call when done
**/
function getDashboardUsers(callback) {
    countlyDb.collection("members").estimatedDocumentCount(function(err, count) {
        if (err || !count) {
            callback(0);
        }
        else {
            callback(count);
        }
    });
}

/**
* Get total crash count for app
* @param {object} app - app document from db
* @param {function} callback - function to call when done
**/
function getCrashGroupsForApp(app, callback) {
    countlyDb.collection("app_crashgroups" + app).estimatedDocumentCount(function(err, count) {
        if (err || !count) {
            callback(null, 0);
        }
        else {
            callback(null, count);
        }
    });
}

/**
* Get total unique crashes count for app
* @param {function} callback - function to call when done
* @param {array=} apps - provide array of apps to fetch data for, else will fetch data for all apps
**/
function getCrashGroups(callback, apps) {
    if (typeof apps !== "undefined") {
        async.map(apps, getCrashGroupsForApp, function(err, results) {
            if (err) {
                callback(0, 0);
            }

            var userCount = 0;

            for (let i = 0; i < results.length; i++) {
                userCount += results[i];
            }

            callback(userCount, apps.length);
        });
    }
    else {
        countlyDb.collection("apps").find({}, {_id: 1}).toArray(function(err, allApps) {
            if (err || !allApps) {
                callback(0, 0);
            }
            else {
                async.map(allApps, getCrashGroupsForApp, function(err2, results) {
                    if (err2) {
                        callback(0, 0);
                    }

                    var userCount = 0;

                    for (let i = 0; i < results.length; i++) {
                        userCount += results[i];
                    }

                    callback(userCount, allApps.length);
                });
            }
        });
    }
}

/**
* Get all platforms for apps
* @param {function} callback - function to call when done
* @param {array=} apps - provide array of apps to fetch data for, else will fetch data for all apps
**/
function getAllPlatforms(callback, apps) {
    countlyDb.collection("device_details").find({_id: {"$regex": ".*:0.*"}}, {
        "a": 1,
        "meta": 1
    }).toArray(function(err, arr) {
        if (err || !arr) {
            callback(0);
        }
        else {
            var platforms = {};

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].meta && arr[i].meta.os && (typeof apps === "undefined" || apps.indexOf(arr[i].a) > -1)) {
                    for (let j = 0; j < arr[i].meta.os.length; j++) {
                        platforms[arr[i].meta.os[j]] = true;
                    }
                }
            }

            callback(Object.keys(platforms));
        }
    });
}

module.exports = stats;