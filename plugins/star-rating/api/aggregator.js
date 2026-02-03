
var plugins = require('../../pluginManager.ts'),
    common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = require('../../../api/utils/log.js')('star-rating:aggregator');
const usage = require('../../../api/aggregator/usage.js');

/**
 * Ratings are currently recording full model data for all segments.
 * Granular data is used for comments.
 */
(function() {
    //Single for all star-rating events
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('star-rating', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_star_rating"]}}},
                    {
                        "$project": {
                            "__id": "$fullDocument._id",
                            "cd": "$fullDocument.cd",
                            "sg": "$fullDocument.sg",
                            "e": "$fullDocument.e",
                            "ts": "$fullDocument.ts",
                            "a": "$fullDocument.a",
                            "uid": "$fullDocument.uid"
                        }
                    }
                ],
                fallback: {
                    pipeline: [{"$match": {"e": {"$in": ["[CLY]_star_rating"]}}}]
                }
            }
        });

        try {
            await eventSource.processWithAutoAck(async(token, events) => {
                if (events && Array.isArray(events)) {
                    for (var z = 0; z < events.length; z++) {
                        var next = events[z];
                        if (next.e === "[CLY]_star_rating") {
                            if (next && next.a) {
                                try {
                                    const app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a));
                                    if (app && app._id) {
                                        //increases count
                                        common.manualWriteBatcher.add("feedback_widgets", common.db.ObjectID(next.sg.widget_id), {$inc: { ratingsSum: next.sg.rating, ratingsCount: 1 }}, "countly", {token: token, upsert: false});
                                        var allowed_segments = ["platform", "app_version", "rating", "widget_id", "platform_version_rate"];
                                        for (var seg in next.sg) {
                                            if (allowed_segments.indexOf(seg) === -1) {
                                                delete next.sg[seg];
                                            }
                                        }
                                        usage.processEventFromStream(token, next, common.manualWriteBatcher);
                                        //records aggregated data
                                    }
                                }
                                catch (err) {
                                    log.e("Error getting app data for session", err);
                                }
                            }
                        }
                    }
                    //Flush batchers
                    await common.manualWriteBatcher.flush("countly", "feedback_widgets");
                    await common.manualWriteBatcher.flush("countly", "events_data");
                }
            });
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });
}());