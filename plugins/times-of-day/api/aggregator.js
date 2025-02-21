var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const { changeStreamReader } = require('../../../api/parts/data/changeStreamReader');
const { log } = require('async');

(function() {
    plugins.register("/aggregator", function() {
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "insert"}},
                {"$project": {"__id": "$fullDocument._id", "ts": "$fullDocument.ts", "cd": "$fullDocument.cd", "n": "$fullDocument.n", "a": "$fullDocument.a", "e": "$fullDocument.e", "dow": "$fullDocument.up.dow", "hour": "$fullDocument.up.hour"}}
            ],
            "name": "times-of-day",
            "collection": "drill_events",
            "onClose": async function(callback) {
                await common.writeBatcher.flush("countly", "times_of_day");
                if (callback) {
                    callback();
                }
            }
        }, (token, next) => {
            if (next.dow === 7) {
                next.dow = 0;
            }
            if (next.a && next.e && (next.dow || next.dow === 0) && (next.hour || next.hour === 0)) {
                common.readBatcher.getOne("apps", common.db.ObjectID(next.a), {projection: {timezone: 1}}, function(err, app) {
                    if (err) {
                        log.e(err);
                    }
                    if (app) {
                        var date = common.initTimeObj(app.timezone, next.ts);
                        let setData = {s: next.e, a: common.db.ObjectID(next.a)};
                        if (next.e === "[CLY]_custom") {
                            setData.s = next.n;
                        }
                        let id = next.a + "_" + setData.s + "_" + date.monthly.replace('.', ':');
                        let incData = {};
                        incData['d.' + next.dow + "." + next.hour + ".count"] = 1;
                        setData._id = id;
                        setData.m = date.monthly.replace('.', ':');
                        common.writeBatcher.add("times_of_day", id, {$set: setData, $inc: incData}, "countly", {token: token});
                    }
                    else {
                        log.e("App not found");
                    }
                });
            }
        });

        common.writeBatcher.addFlushCallback("times_of_day", function(token) {
            changeStream.acknowledgeToken(token);
        });

    });
}());
