var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
//var moment = require('moment-timezone');
//const { DataBatchReader } = require('../../../api/parts/data/dataBatchReader');
var log = common.log('times-of-day:aggregator');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');

(function() {
    /* Old function for processing in queried batches
    plugins.register("/aggregator", function() {
        new DataBatchReader(common.drillDb, {
            "name": "times-of-day",
            pipeline: [{
                "$match": {"e": {"$in": ["[CLY]_session", "[CLY]_custom"]}}
            },
            {
                "$group": {
                    "_id": {
                        "a": "$a",
                        "e": "$e",
                        "n": "$n",
                        "h": {"$dateToString": {"date": {"$toDate": "$ts"}, "format": "%Y:%m:%d:%H", "timezone": "UTC"}},
                        "dow": "$up.dow",
                        "hour": "$up.hour"
                    },
                    "c": {"$sum": "$c"},

                }
            },
            {
                "$project": {
                    "a": "$_id.a",
                    "e": "$_id.e",
                    "n": "$_id.n",
                    "h": "$_id.h",
                    "dow": "$_id.dow",
                    "hour": "$_id.hour",
                    "c": 1,
                    "_id": 0
                }
            },
            {"$sort": {"a": 1}}
            ],
            interval: 6000,

        }, async function(token, data) {
            if (data.length > 0) {
                for (let i = 0; i < data.length; i++) {
                    let next = data[i];
                    if (next.dow === 7) {
                        next.dow = 0;
                    }
                    if (next.a && next.e && (next.dow || next.dow === 0) && (next.hour || next.hour === 0)) {
                        try {
                            var app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a), {projection: {timezone: 1}});

                            if (app) {
                                var appTimezone = app.timezone || "UTC";
                                var d = moment();
                                if (appTimezone) {
                                    d.tz(appTimezone);
                                }
                                common.shiftHourlyData(next, Math.floor(d.utcOffset() / 60), "h");
                                var datestr = next.h.split(":");
                                datestr = datestr[0] + ":" + datestr[1];

                                let setData = {s: next.e, a: common.db.ObjectID(next.a)};
                                if (next.e === "[CLY]_custom") {
                                    setData.s = next.n;
                                }
                                let id = next.a + "_" + setData.s + "_" + datestr;
                                let incData = {};
                                incData['d.' + next.dow + "." + next.hour + ".count"] = next.c;
                                setData._id = id;
                                setData.m = datestr;
                                common.manualWriteBatcher.add("times_of_day", id, {$set: setData, $inc: incData}, "countly", {token: token});
                            }
                            else {
                                log.e("App not found");
                            }
                        }
                        catch (e) {
                            log.e("Error processing times of day data", e);
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "times_of_day", token.cd);
                }
            }
        });
    });*/

    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('times-of-day', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_custom", "[CLY]_session"]}}},
                    {"$project": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd", "ts": "$fullDocument.ts", "a": "$fullDocument.a", "e": "$fullDocument.e", "n": "$fullDocument.n", "hour": "$fullDocument.up.hour", "dow": "$fullDocument.up.dow"}}
                ],
                fallback: {
                    pipeline: [ {"$match": {"e": {"$in": ["[CLY]_custom", "[CLY]_session"]}}}, {"$project": {"__id": "$_id", "ts": "$ts", "cd": "$cd", "a": "$a", "e": "$e", "n": "$n", "hour": "$up.hour", "dow": "$up.dow"}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var k = 0; k < events.length; k++) {
                        if ((events[k].e === '[CLY]_session' || events[k].e === '[CLY]_custom')) {
                            let next = events[k];
                            next.dow = next.dow || (next.up && next.up.dow);
                            next.hour = next.hour || (next.up && next.up.hour);
                            if (next.dow === 7) {
                                next.dow = 0;
                            }
                            if (next.a && next.e && (next.dow || next.dow === 0) && (next.hour || next.hour === 0)) {
                                try {
                                    var app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a), {projection: {timezone: 1}});

                                    if (app) {
                                        next.h = common.getDate(next.ts, app.timezone || "UTC");
                                        next.h = next.h.format("YYYY:MM:DD:HH");
                                        next.h = next.h.replaceAll(":0", ":");
                                        var datestr = next.h.split(":");
                                        datestr = datestr[0] + ":" + datestr[1];

                                        let setData = {s: next.e, a: common.db.ObjectID(next.a)};
                                        if (next.e === "[CLY]_custom") {
                                            setData.s = next.n;
                                        }
                                        let id = next.a + "_" + setData.s + "_" + datestr;
                                        let incData = {};
                                        incData['d.' + next.dow + "." + next.hour + ".count"] = next.c;
                                        setData._id = id;
                                        setData.m = datestr;
                                        common.manualWriteBatcher.add("times_of_day", id, {$set: setData, $inc: incData}, "countly", {token: token});
                                    }
                                    else {
                                        log.e("App not found");
                                    }
                                }
                                catch (e) {
                                    log.e("Error processing times of day data", e);
                                }
                            }
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "times_of_day");
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });
}());
