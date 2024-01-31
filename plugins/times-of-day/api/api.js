var plugin = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    moment = require('moment'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'times_of_day';

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/i", function(ob) {
        var params = ob.params;

        if (!params.qstring.begin_session && !params.qstring.events) {
            return false;
        }

        var appId = params.app_id;
        var events = [];

        if (!appId) {
            return false;
        }

        var hasSession = false;
        var hasEvents = false;

        if (params.qstring.begin_session) {
            hasSession = true;
        }

        if (params.qstring.events && params.qstring.events.length) {
            hasEvents = true;
            events = params.qstring.events;
        }

        var query = {};
        var criteria = {};
        var update = {};
        var options = {};


        if (hasSession && params.qstring.hour && params.qstring.dow) {
            var sessionDate = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
            let id = appId + "_" + "[CLY]_session" + "_" + sessionDate.monthly.replace('.', ':'); // replaced 

            criteria = {
                "_id": id
            };

            let incData = {};
            incData['d.' + params.qstring.dow + "." + params.qstring.hour + ".count"] = 1;
            let setData = {};
            setData._id = id;
            setData.m = sessionDate.monthly.replace('.', ':');
            setData.s = "[CLY]_session";
            setData.a = appId;

            update = {
                $set: setData,
                $inc: incData
            };

            options = {
                upsert: true
            };

            query[id] = {
                "criteria": criteria,
                "update": update,
                "options": options
            };
        }

        if (hasEvents) {

            for (var i = 0; i < events.length; i++) {
                if (events[i].key === undefined || events[i].count === undefined) {
                    continue;
                }

                var timeStamp = events[i].timestamp || params.qstring.timestamp;
                var eventDate = common.initTimeObj(params.appTimezone, timeStamp);

                let id = appId + "_" + events[i].key + "_" + eventDate.monthly.replace('.', ':'); // replaced

                criteria = {
                    "_id": id
                };

                var dow = events[i].dow === undefined ? params.qstring.dow : events[i].dow;
                var hour = events[i].hour === undefined ? params.qstring.hour : events[i].hour;


                if (dow === undefined || hour === undefined) {
                    continue;
                }

                let incData = (query[id] && query[id].update) ? query[id].update.$inc : {};
                incData['d.' + dow + "." + hour + ".count"] = incData['d.' + dow + "." + hour + ".count"] ?
                    incData['d.' + dow + "." + hour + ".count"] + events[i].count : events[i].count;

                let setData = {};
                setData._id = id;
                setData.m = eventDate.monthly.replace('.', ':');
                setData.s = events[i].key;
                setData.a = appId;

                update = {
                    $set: setData,
                    $inc: incData
                };

                options = {
                    upsert: true
                };

                query[id] = {
                    "criteria": criteria,
                    "update": update,
                    "options": options
                };
            }
        }

        var collectionName = "times_of_day"; // replaced


        if (query) {
            common.readBatcher.getOne("events", {'_id': common.db.ObjectID(appId)}, {list: 1}, (err, eventData) => {
                if (err) {
                    console.log("err", err);
                    return true;
                }

                eventData = eventData || { list: [] } ;

                var limit = plugins.getConfig("api", params.app && params.app.plugins, true).event_limit;
                var overLimit = eventData.list.count > limit;


                if (plugins.getConfig("api", params.app && params.app.plugins, true).batch_processing === true) {
                    Object.keys(query).forEach(function(key) {
                        var queryObject = query[key];
                        var s = queryObject.update.$set.s;
                        if (s === "[CLY]_session" || !overLimit || (overLimit && eventData.list.indexOf(s) >= 0)) {
                            common.writeBatcher.add(collectionName, queryObject.criteria._id, queryObject.update);
                        }
                    });
                }
                else {
                    var bulk = common.db.collection(collectionName).initializeUnorderedBulkOp();
                    Object.keys(query).forEach(function(key) {
                        var queryObject = query[key];
                        var s = queryObject.update.$set.s;

                        if (s === "[CLY]_session" || !overLimit || (overLimit && eventData.list.indexOf(s) >= 0)) {
                            bulk.find(queryObject.criteria).upsert().updateOne(queryObject.update);
                        }
                    });


                    if (bulk.length > 0) {
                        bulk.execute(function() {});
                    }
                }
            });
        }

        return true;
    });

    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "times-of-day") {
            // var appId = params.qstring.app_id;  can be deleted
            var todType = params.qstring.tod_type;

            var criteria = {
                "s": todType
            };

            if (params.qstring.date_range) {
                criteria.m = { $in: params.qstring.date_range.split(',') };
            }

            var collectionName = "times_of_day"; // replaced

            validateRead(params, FEATURE_NAME, function() {
                fetchTodData(collectionName, criteria, function(err, result) {
                    if (err) {
                        console.log("Error while fetching times of day data: ", err.message);
                        common.returnMessage(params, 400, "Something went wrong");
                        return false;
                    }

                    common.returnOutput(params, result);
                    return true;
                });
            });
            return true;
        }
        return false;
    });

    /**
     * Fetch Times of Day Plugin
     * @param {string} collectionName | Name of collection
     * @param {object} criteria | Filter object
     * @param {func} callback | Callback function
     */
    function fetchTodData(collectionName, criteria, callback) {
        common.db.collection(collectionName).find(criteria).toArray(function(err, results) {
            if (err) {
                return callback(err);
            }

            var timesOfDay = [0, 1, 2, 3, 4, 5, 6].map(() => {
                return Array(24).fill(0);
            });

            results.forEach(result => {
                for (var i = 0; i < 7; i++) {
                    for (var j = 0; j < 24; j++) {
                        timesOfDay[i][j] += result.d[i] ?
                            (result.d[i][j] ? result.d[i][j].count : 0)
                            : 0;
                    }
                }
            });

            return callback(null, timesOfDay);
        });
    }

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('times_of_day').deleteMany({"_id": { "$regex": appId + ".*" }}, function() {}); // replaced
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('times_of_day').deleteMany({"_id": { "$regex": appId + ".*" }}, function() {}); // replaced
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('times_of_day').deleteMany({"_id": { "$regex": appId + ".*" }}, function() {}); // replaced
    });

    plugins.register("/dashboard/data", function(ob) {
        return new Promise((resolve) => {
            var data = ob.widget;

            if (data.widget_type === "times-of-day") {
                var collectionName = "";
                var criteria = {};

                // var appId = data.apps[0];  can be deleted 
                var dataType = data.data_type;
                let period = data.period;

                var todType = "[CLY]_session";

                if (dataType === "event") {
                    var event = data.events[0];
                    var eventKey = event.split("***")[1];
                    todType = eventKey;
                }

                criteria = {
                    "s": todType
                };

                var periodRange = getDateRange(period);

                if (periodRange) {
                    criteria.m = { $in: periodRange.split(',') };
                }

                collectionName = "times_of_day"; // replaced
                fetchTodData(collectionName, criteria, function(err, result) {
                    data.dashData = {
                        data: result || []
                    };
                    resolve();
                });
            }
            else {
                resolve();
            }

            /**
             * Get date range for period
             * @param {string} period | Period
             * @return {string|null} | Response
             */
            function getDateRange(period) {
                let d;
                switch (period) {
                case "current":
                    d = moment();
                    return d.year() + ":" + (d.month() + 1);
                case "previous":
                    d = moment().add(-1, "M");
                    return d.year() + ":" + (d.month() + 1);
                case "last_3":
                    var response = [];
                    for (let i = 0; i < 3; i++) {
                        d = moment().add(-1 * i, "M");
                        response.push(d.year() + ":" + (d.month() + 1));
                    }
                    return response.join(',');
                default:
                    return;
                }
            }
        });
    });

}(plugin));

module.exports = plugin;