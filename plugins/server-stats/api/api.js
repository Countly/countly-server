var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

(function() {

    plugins.register("/master", function() {
        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            require('../../../api/parts/jobs').job('server-stats:stats').replace().schedule('every 1 day');
        }, 10000);
    });

    /**
    * Register to all requests to /plugins/drill to catch all events
    * sent by plugins such as views and crashes
    * @returns {undefined} Returns nothing
    **/
    plugins.register("/plugins/drill", function(ob) {
        var eventCount = 0;

        if (ob.events && Array.isArray(ob.events)) {
            var events = ob.events;

            for (var i = 0; i < events.length; i++) {
                if (events[i].key) {
                    eventCount += (events[i].count) ? events[i].count : 1;
                }
            }

            updateDataPoints(ob.params.app_id, 0, eventCount);
        }
    });

    /**
    * Register to /sdk/end for requests that contain begin_session and events
    * @returns {boolean} Returns boolean, always true
    **/
    plugins.register("/sdk/end", function(ob) {
        var params = ob.params,
            sessionCount = 0,
            eventCount = 0;

        if (!params.cancelRequest) {
            if (params.qstring.events && Array.isArray(params.qstring.events)) {
                var events = params.qstring.events;

                for (var i = 0; i < events.length; i++) {
                    if (events[i].key) {
                        eventCount += 1;
                    }
                }
            }

            // If the last end_session is received less than 15 seconds ago we will ignore
            // current begin_session request and mark this user as having an ongoing session
            var lastEndSession = params.app_user && params.app_user[common.dbUserMap.last_end_session_timestamp] || 0;

            if (params.qstring.begin_session && (params.qstring.ignore_cooldown || !lastEndSession || (params.time.timestamp - lastEndSession) > plugins.getConfig("api", params.app && params.app.plugins, true).session_cooldown)) {
                sessionCount++;
            }

            updateDataPoints(params.app_id, sessionCount, eventCount);
        }

        return true;
    });

    /**
    * Saves session and event count information to server_stats_data_points
    * collection in countly database

    * Sample document is like below where a is the app id, m is the month,
    * e is event count and s is the session count
    {
       "_id" : "58496f1c81ccb91a37dbb1d0_2016:12",
       "a" : "58496f1c81ccb91a37dbb1d0",
       "m" : "2016:12",
       "e" : 1898,
       "s" : 286
    }
    * @param {string} appId - Application Id
    * @param {Number} sessionCount - Session Count
    * @param {Number} eventCount - Event Count
    * @returns {undefined} Returns nothing
    **/
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

    /**
    * Update data-point object with new events and sessions counts
    * @param {object} object - object which will be updated
    * @param {object} data - passed data object which contains events and sessions count
    * @returns {object} Returns manipulated object
    **/
    function increaseDataPoints(object, data) {
        object.events += data.e;
        object.sessions += data.s;
        object["data-points"] += data.e + data.s;
        return object;
    }

    /**
    * Returns last three month session, event and data point count
    * for all and individual apps
    * @returns {boolean} Returns boolean, always true
    **/
    plugins.register('/o/server-stats/data-points', function(ob) {
        var params = ob.params;
        var periodsToFetch = [],
            utcMoment = common.moment.utc();

        var monthBack = parseInt(params.qstring.months) || 12;

        for (let i = monthBack - 1; i > 0; i--) {
            utcMoment.subtract(i, "months");
            periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));
            utcMoment.add(i, "months");
        }

        periodsToFetch.push(utcMoment.format("YYYY") + ":" + utcMoment.format("M"));

        var filter = {
            $or: []
        };

        ob.validateUserForMgmtReadAPI(function() {
            if (!params.member.global_admin) {
                var apps = params.member.user_of || [];
                for (let i = 0; i < periodsToFetch.length; i++) {
                    for (let j = 0; j < apps.length; j++) {
                        if (apps[j] !== "") {
                            filter.$or.push({_id: apps[j] + "_" + periodsToFetch[i]});
                        }
                    }
                }

                if (filter.$or.length) {
                    fetchDatapoints(params, filter, periodsToFetch);
                }
                else {
                    return common.returnMessage(params, 401, 'User does not have apps');
                }
            }
            else {
                for (let i = 0; i < periodsToFetch.length; i++) {
                    filter.$or.push({_id: {$regex: ".*_" + periodsToFetch[i]}});
                }

                fetchDatapoints(params, filter, periodsToFetch);
            }

        }, params);

        return true;
    });

    /**
     *  Get's datapoint data from database and outputs it to browser 
     *  @param {params} params - params object
     *  @param {object} filter - to filter documents
     *  @param {array} periodsToFetch - array with periods
     */
    function fetchDatapoints(params, filter, periodsToFetch) {
        common.db.collection("server_stats_data_points").find(filter, {}).toArray(function(err, dataPerApp) {
            var toReturn = {
                "all-apps": {},
            };

            toReturn["all-apps"]["12_months"] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };
            toReturn["all-apps"]["6_months"] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };

            for (let i = 0; i < periodsToFetch.length; i++) {
                let formattedDate = periodsToFetch[i].replace(":", "-");
                toReturn["all-apps"][formattedDate] = {
                    "events": 0,
                    "sessions": 0,
                    "data-points": 0
                };
            }

            for (let i = 0; i < dataPerApp.length; i++) {
                if (!toReturn[dataPerApp[i].a]) {
                    toReturn[dataPerApp[i].a] = {};
                }

                for (let j = 0; j < periodsToFetch.length; j++) {
                    let formattedDate = periodsToFetch[j].replace(":", "-");

                    if (!toReturn[dataPerApp[i].a][formattedDate]) {
                        toReturn[dataPerApp[i].a][formattedDate] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }
                    if (!toReturn[dataPerApp[i].a]["12_months"]) {
                        toReturn[dataPerApp[i].a]["12_months"] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }
                    if (!toReturn[dataPerApp[i].a]["6_months"]) {
                        toReturn[dataPerApp[i].a]["6_months"] = {
                            "events": 0,
                            "sessions": 0,
                            "data-points": 0
                        };
                    }

                    if (dataPerApp[i].m === periodsToFetch[j]) {
                        toReturn[dataPerApp[i].a][formattedDate] = increaseDataPoints(toReturn[dataPerApp[i].a][formattedDate], dataPerApp[i]);
                        toReturn["all-apps"][formattedDate] = increaseDataPoints(toReturn["all-apps"][formattedDate], dataPerApp[i]);
                        // only last 6 months
                        if (j > 5) {
                            toReturn["all-apps"]["6_months"] = increaseDataPoints(toReturn["all-apps"]["6_months"], dataPerApp[i]);
                            toReturn[dataPerApp[i].a]["6_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["6_months"], dataPerApp[i]);
                        }
                        toReturn[dataPerApp[i].a]["12_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["12_months"], dataPerApp[i]);
                        toReturn["all-apps"]["12_months"] = increaseDataPoints(toReturn["all-apps"]["12_months"], dataPerApp[i]);
                    }
                }

            }
            common.returnOutput(params, toReturn);
        });
    }

}());

module.exports = {};