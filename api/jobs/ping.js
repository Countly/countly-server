'use strict';

const job = require('../parts/jobs/job.js'),
    plugins = require('../../plugins/pluginManager.js'),
    tracker = require('../parts/mgmt/tracker.js');

/** Class for the job of pinging servers **/
class PingJob extends job.Job {
    /**
     * Run the ping job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        plugins.loadConfigs(db, async function() {
            const offlineMode = plugins.getConfig("api").offline_mode;
            if (!offlineMode) {
                var server = tracker.getBulkServer();
                var user = tracker.getBulkUser(server);
                if (!user) {
                    return done();
                }

                try {
                    var custom = await tracker.getAllData();
                    console.log("custom", custom);
                    if (Object.keys(custom).length) {
                        user.user_details({"custom": custom });
                    }
                }
                catch (ex) {
                    console.log("Error collecting server data:", ex);
                }
                var days = 90;
                var current_sync = Date.now();

                // Atomically retrieve old last_sync value and set new one
                var syncResult = await db.collection("plugins").findOneAndUpdate(
                    {_id: "version"},
                    {$set: {last_sync: current_sync}},
                    {
                        upsert: true,
                        returnDocument: 'before',
                        projection: {last_sync: 1}
                    }
                );

                var last_sync = syncResult.value ? syncResult.value.last_sync : null;
                if (last_sync) {
                    days = Math.floor((new Date().getTime() - last_sync) / (1000 * 60 * 60 * 24));
                }

                if (days > 0) {
                    //calculate seconds timestamp of days before today
                    var startTs = Math.round((new Date().getTime() - (30 * 24 * 60 * 60 * 1000)) / 1000);

                    //sync server events - use aggregation pipeline to group by day and action on MongoDB side
                    var aggregationPipeline = [
                        // Match documents with timestamp greater than startTs and valid action
                        {
                            $match: {
                                ts: { $gt: startTs }
                            }
                        },
                        // Add calculated fields for day grouping
                        {
                            $addFields: {
                                // Convert timestamp to date and set to noon (12:00:00)
                                dayDate: {
                                    $dateFromParts: {
                                        year: { $year: { $toDate: { $multiply: ["$ts", 1000] } } },
                                        month: { $month: { $toDate: { $multiply: ["$ts", 1000] } } },
                                        day: { $dayOfMonth: { $toDate: { $multiply: ["$ts", 1000] } } },
                                        hour: 12,
                                        minute: 0,
                                        second: 0
                                    }
                                }
                            }
                        },
                        // Convert back to timestamp in seconds
                        {
                            $addFields: {
                                noonTimestamp: {
                                    $divide: [{ $toLong: "$dayDate" }, 1000]
                                }
                            }
                        },
                        // Group by day and action
                        {
                            $group: {
                                _id: {
                                    day: "$noonTimestamp",
                                    action: "$a"
                                },
                                count: { $sum: 1 }
                            }
                        },
                        // Project to final format
                        {
                            $project: {
                                _id: 0,
                                action: "$_id.action",
                                timestamp: "$_id.day",
                                count: 1
                            }
                        }
                    ];

                    var cursor = db.collection("systemlogs").aggregate(aggregationPipeline);

                    while (cursor && await cursor.hasNext()) {
                        let eventData = await cursor.next();
                        user.add_event({key: eventData.action, count: eventData.count, timestamp: eventData.timestamp});
                    }
                    server.start(function() {
                        server.stop();
                        done();
                    });
                }
                else {
                    done();
                }
            }
            else {
                done();
            }
        });
    }
}

module.exports = PingJob;