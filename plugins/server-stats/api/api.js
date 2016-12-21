var plugin = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    log = common.log('server-stats:api');

(function (plugin) {
    
    plugins.register("/master", function(ob){
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('server-stats:stats').replace().schedule('every 1 day');
        }, 10000);
    });

    /*
        Register to all requests to /plugins/drill to catch all events
        sent by plugins such as views and crashes
     */
    plugins.register("/plugins/drill", function(ob){
        var eventCount = 0;

        if (ob.events && Array.isArray(ob.events)) {
            var events = ob.events;

            for (var i = 0; i < events.length; i++) {
                if (events[i].key) {
                    eventCount += (events[i].count)? events[i].count : 1;
                }
            }

            updateDataPoints(ob.params.app_id, 0, eventCount);
        }
    });

    /*
        Register to /sdk/end for requests that contain begin_session and events
     */
    plugins.register("/sdk/end", function(ob) {
        var params = ob.params,
            sessionCount = 0,
            eventCount = 0;

        if (!params.cancelRequest) {
            if (params.qstring.events && Array.isArray(params.qstring.events)) {
                var events = params.qstring.events;

                for (var i = 0; i < events.length; i++) {
                    if (events[i].key) {
                        eventCount += (events[i].count)? events[i].count : 1;
                    }
                }
            }

            if (params.qstring.begin_session) {
                sessionCount++;
            }

            updateDataPoints(params.app_id, sessionCount, eventCount);
        }

        return true;
    });

    /*
        Saves session and event count information to server_stats_data_points
        collection in countly database

        Sample document is like below where a is the app id, m is the month,
        e is event count and s is the session count

        {
            "_id" : "58496f1c81ccb91a37dbb1d0_2016:12",
            "a" : "58496f1c81ccb91a37dbb1d0",
            "m" : "2016:12",
            "e" : 1898,
            "s" : 286
        }
     */
    function updateDataPoints(appId, sessionCount, eventCount) {
        var utcMoment = common.moment.utc();

        common.db.collection('server_stats_data_points').update(
            {
                '_id': appId + "_" + utcMoment.format("YYYY:M")
            },
            {
                $set: {
                    a: appId + "",
                    m: utcMoment.format("YYYY:M")
                },
                $inc: {
                    e: eventCount,
                    s: sessionCount
                }
            },
            {
                upsert: true
            },
            function() {}
        );
    }

    /*
        Returns last three month session, event and data point count
        for all and individual apps
     */
    plugins.register('/o/server-stats/data-points', function(ob) {
        var params = ob.params;

        ob.validateUserForMgmtReadAPI(function() {
            if (!params.member.global_admin) {
                return common.returnMessage(params, 401, 'User is not a global administrator');
            }

            var periodsToFetch = [],
                utcMoment = common.moment.utc();

            utcMoment.subtract("months", 2);
            periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));
            utcMoment.add("months", 2);

            utcMoment.subtract("months", 1);
            periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));
            utcMoment.add("months", 1);

            periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));

            var filter = {
                $or: []
            };

            for (var i = 0; i < periodsToFetch.length; i++) {
                filter["$or"].push({_id: {$regex: ".*_" + periodsToFetch[i]}});
            }

            common.db.collection("server_stats_data_points").find(filter, {}).toArray(function(err, dataPerApp){
                var toReturn = {
                    "all-apps": {}
                };

                for (var i = 0; i < periodsToFetch.length; i++) {
                    var formattedDate = periodsToFetch[i].replace(":", "-");

                    toReturn["all-apps"][formattedDate] = {
                        "sessions": 0,
                        "events": 0,
                        "data-points": 0
                    }
                }

                for (var i = 0; i < dataPerApp.length; i++) {
                    if (!toReturn[dataPerApp[i]["a"]]) {
                        toReturn[dataPerApp[i]["a"]] = {};
                    }

                    for (var j = 0; j < periodsToFetch.length; j++) {
                        var formattedDate = periodsToFetch[j].replace(":", "-");

                        toReturn[dataPerApp[i]["a"]][formattedDate] = {
                            "sessions": 0,
                            "events": 0,
                            "data-points": 0
                        };

                        if (dataPerApp[i]["m"] == periodsToFetch[j]) {
                            toReturn[dataPerApp[i]["a"]][formattedDate] = {
                                "sessions": dataPerApp[i]["s"],
                                "events": dataPerApp[i]["e"],
                                "data-points": dataPerApp[i]["s"] + dataPerApp[i]["e"]
                            };

                            toReturn["all-apps"][formattedDate]["sessions"] += dataPerApp[i]["s"];
                            toReturn["all-apps"][formattedDate]["events"] += dataPerApp[i]["e"];
                            toReturn["all-apps"][formattedDate]["data-points"] += dataPerApp[i]["s"] + dataPerApp[i]["e"];
                        }
                    }
                }

                common.returnOutput(params, toReturn);
            });
        }, params);

        return true;
    });

}(plugin));

module.exports = plugin;