const { getUserApps } = require('../../../api/utils/rights.js');

var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    stats = require('./parts/stats.js');

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
                    eventCount += 1;
                }
            }

            stats.updateDataPoints(common.writeBatcher, ob.params.app_id, 0, eventCount, stats.isConsolidated(ob.params));
        }
    });

    /**
    * Register to /sdk/end for requests that contain begin_session and events
    * @returns {boolean} Returns boolean, always true
    **/
    plugins.register("/sdk/data_ingestion", function(ob) {
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

            stats.updateDataPoints(common.writeBatcher, params.app_id, sessionCount, eventCount, stats.isConsolidated(params));
        }

        return true;
    });

    /**
    * Register to /i/server-stats/update-data-points
    * @param {{appId: string, sessionCount: number, eventCount: number}} ob - data points params
    **/
    plugins.register("/server-stats/update-data-points", function(ob) {
        const {appId, sessionCount, eventCount} = ob;
        stats.updateDataPoints(common.writeBatcher, appId, sessionCount, eventCount, stats.isConsolidated(ob));
    });

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
            _id: {$in: []}
        };

        ob.validateUserForMgmtReadAPI(function() {
            if (!params.member.global_admin) {
                var apps = getUserApps(params.member) || [];
                for (let i = 0; i < periodsToFetch.length; i++) {
                    for (let j = 0; j < apps.length; j++) {
                        if (apps[j] !== "") {
                            filter._id.$in.push(apps[j] + "_" + periodsToFetch[i]);
                        }
                    }
                }

                if (filter._id.$in.length) {
                    stats.fetchDatapoints(common.db, filter, periodsToFetch, function(toReturn) {
                        common.returnOutput(params, toReturn);
                    });
                }
                else {
                    return common.returnMessage(params, 401, 'User does not have apps');
                }
            }
            else {
                for (let i = 0; i < periodsToFetch.length; i++) {
                    filter._id.$in.push(new RegExp(".*_" + periodsToFetch[i]));
                }

                stats.fetchDatapoints(common.db, filter, periodsToFetch, function(toReturn) {
                    common.returnOutput(params, toReturn);
                });
            }

        }, params);

        return true;
    });

    /**
    * returns punch card data
    * @returns {boolean} Returns boolean, always true
    **/
    plugins.register("/o/server-stats/punch-card", function(ob) {
        var params = ob.params;
        ob.validateUserForMgmtReadAPI(async() => {
            try {
                const dateRangeArray = params.qstring.date_range.split(',');
                let filter = {"m": {$in: dateRangeArray} };
                if (!params.member.global_admin) {
                    filter._id = {"$in": []};
                    const hasUserApps = getUserApps(params.member) || [];
                    hasUserApps.forEach((id) => {
                        dateRangeArray.forEach((period) => {
                            filter._id.$in.push({_id: `${id}_${period}`});
                        });
                    });
                }
                const _punchCard = await stats.punchCard(common.db, filter);
                common.returnOutput(params, _punchCard);
            }
            catch (error) {
                console.log("Error while fetching punch card data: ", error.message);
                common.returnMessage(params, 400, "Something went wrong");
            }
        }, params);

        return true;
    });
}());

