
var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const { changeStreamReader } = require('../../../api/parts/data/changeStreamReader');
const log = require('../../../api/utils/log.js')('star-rating:aggregator');
const { WriteBatcher } = require('../../../api/parts/data/batcher.js');
const usage = require('../../../api/aggregator/usage.js');

(function() {
    //Single for all surveys+nps. Could divide based on collections 
    plugins.register("/aggregator", function() {
        var localBatcher = new WriteBatcher(common.db);
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_star_rating"]}}},
                {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
            ],
            pipeline_process: [{
                "$match": {"e": {"$in": ["[CLY]_star_rating"]}}
            }],
            "name": "star-rating",
            "collection": "drill_events",
            "onClose": async function(callback) {
                if (callback) {
                    callback();
                }
            }
        }, (token, next) => {
        //Coming from stream is not a root document
            if (next.fullDocument) {
                next = next.fullDocument;
            }
            if (next && next.a) {
                common.readBatcher.getOne("apps", common.db.ObjectID(next.a), function(err, app) {
                    //record event totals in aggregated data

                    if (err) {
                        log.e("Error getting app data for session", err);
                        return;
                    }
                    if (app && app._id) {
                        //increases count
                        localBatcher.add("feedback_widgets", common.db.ObjectID(next.sg.widget_id), {$inc: { ratingsSum: next.sg.rating, ratingsCount: 1 }}, "countly", {token: token, upsert: false});
                        var allowed_segemnts = ["platform", "app_version", "rating", "widget_id", "platform_version_rate"];
                        for (var seg in next.sg) {
                            if (allowed_segemnts.indexOf(seg) === -1) {
                                delete next.sg[seg];
                            }
                        }
                        usage.processEventFromStream(token, next, localBatcher);
                        //records aggregated data
                    }
                });
            }
        });

        localBatcher.addFlushCallback("*", function(token) {
            changeStream.acknowledgeToken(token);
        });
    });
}());