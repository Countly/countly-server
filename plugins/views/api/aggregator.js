var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = require('../../../api/utils/log.js')('views:aggregator');
const crypto = require('crypto');

(function() {

    var forbiddenSegValues = [];

    for (let i = 1; i < 32; i++) {
        forbiddenSegValues.push(i + "");
    }
    for (let i = 1; i < 53; i++) {
        forbiddenSegValues.push("w" + i);
    }

    const escapedViewSegments = {
        "name": true,
        "segment": true,
        "height": true,
        "width": true,
        "y": true,
        "x": true,
        "visit": true,
        "uvc": true,
        "start": true,
        "bounce": true,
        "exit": true,
        "type": true,
        "view": true,
        "domain": true,
        "dur": true,
        "_id": true,
        "_idv": true,
        "utm_source":
              true,
        "utm_medium":
              true,
        "utm_campaign": true,
        "utm_term": true,
        "utm_content": true,
        "referrer": true
    };

    //Recording views
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('views-insert', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_view", "[CLY]_action"]}}},
                    {
                        "$project": {
                            "__id": "$fullDocument._id",
                            "cd": "$fullDocument.cd",
                            "sg": "$fullDocument.sg",
                            "e": "$fullDocument.e",
                            "n": "$fullDocument.n",
                            "ts": "$fullDocument.ts",
                            "dur": "$fullDocument.dur"
                        }
                    }
                ],
                fallback: {
                    pipeline: [ {"$match": {"e": {"$in": ["[CLY]_view", "[CLY]_action"]}}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var z = 0; z < events.length; z++) {
                        var next = events[z];
                        if ((next.e === "[CLY]_action" || (next.e === "[CLY]_view" && next.a && next.n)) && next.ts) {
                            var meta_update = {};
                            var update_doc = {};
                            try {
                                var app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a), {projection: {timezone: 1}});
                                if (app) {
                                    var viewMeta = await common.readBatcher.getOne("views", common.db.ObjectID(next.a));
                                    viewMeta = viewMeta || {};
                                    viewMeta.segments = viewMeta.segments || {};
                                    viewMeta.omit = viewMeta.omit || [];
                                    var view_id = "";
                                    if (next.e === "[CLY]_action") {
                                        if (next.sg && next.sg.name) {
                                            view_id = crypto.createHash('md5').update(next.sg.name).digest('hex');
                                        }
                                        else if (next.sg && next.sg.view) {
                                            try {
                                                var docc = await common.db.collection("app_viewsmeta").findOne({_id: {"$regex": "^" + next.a + "_.*"}, url: next.sg.view});
                                                if (docc) {
                                                    view_id = docc._id.replace(next.a + "_", "");
                                                    next.n = docc.view;
                                                }
                                            }
                                            catch (e) {
                                                log.e(e);
                                            }
                                        }
                                    }
                                    else {
                                        view_id = crypto.createHash('md5').update(next.n).digest('hex');
                                    }

                                    if (!view_id) {
                                        continue;
                                    }
                                    var time = common.initTimeObj(app.timezone, next.ts);
                                    var dateIds = common.getDateIds({time: time});
                                    var segments = ["no-segment"];
                                    var update = {};

                                    if (next.sg) {
                                        for (var segKey in next.sg) {
                                            if (escapedViewSegments[segKey] || (viewMeta.omit && viewMeta.omit.indexOf(segKey) !== -1)) {
                                                continue;
                                            }
                                            else if (segKey !== 'platform' && (!viewMeta.segments[segKey] && Object.keys(viewMeta.segments).length > plugins.getConfig("views").segment_limit)) {
                                                continue;
                                            }
                                            segments.push(segKey);
                                        }
                                        if (next.e === "[CLY]_view") {
                                            if (next.sg.start) {
                                                update.s = 1;
                                            }
                                            if (next.sg.n) {
                                                update.n = 1;
                                            }
                                            if (next.sg.bounce) {
                                                update.b = 1;
                                            }
                                            if (next.sg.exit) {
                                                update.e = 1;
                                            }
                                            if (next.sg.visit) {
                                                update.t = 1;
                                            }

                                            if (next.dur) {
                                                update.d = next.dur;
                                            }
                                            if (next.sg.view && next.sg.view !== viewMeta.url) {
                                                update_doc = {"url": next.sg.view};
                                            }

                                            if (next.sg.domain) {
                                                update_doc["domain." + common.dbEncode(next.sg.domain)] = true;
                                            }
                                        }

                                        if (next.e === "[CLY]_action" && next.sg.y && next.sg.height) {
                                            var height = parseInt(next.sg.height, 10);
                                            if (height !== 0) {
                                                update.scr = parseInt(next.sg.y, 10) * 100 / height;
                                            }
                                        }
                                    }

                                    for (var i = 0; i < segments.length; i++) {
                                        var tmpTimeObjZero = {};
                                        var tmpTimeObjMonth = {};
                                        var tmpZeroId = next.a + "_" + segments[i] + "_" + dateIds.zero + "_" + view_id; //view_year
                                        var tmpMonthId = next.a + "_" + segments[i] + "_" + dateIds.month + "_" + view_id; //view_year

                                        var escapedMetricVal = "";
                                        if (segments[i] !== "no-segment") {
                                            escapedMetricVal = common.dbEncode(next.sg[segments[i]] + "");
                                            escapedMetricVal = escapedMetricVal.replace(/^\$/, "").replace(/\./g, ":");

                                            if (forbiddenSegValues.indexOf(escapedMetricVal) !== -1) {
                                                escapedMetricVal = "[CLY]" + escapedMetricVal;
                                            }

                                            if (viewMeta.segments[segments[i]] && (!viewMeta.segments[segments[i]][escapedMetricVal] && Object.keys(viewMeta.segments[segments[i]]).length > plugins.getConfig("views").segment_value_limit)) {
                                                continue;
                                            }

                                            if (!viewMeta.segments[segments[i]]) {
                                                viewMeta.segments[segments[i]] = {};
                                            }
                                            if (!viewMeta.segments[segments[i]][escapedMetricVal]) {
                                                viewMeta.segments[segments[i]][escapedMetricVal] = true;
                                                meta_update["segments." + segments[i] + "." + escapedMetricVal] = true;
                                            }
                                            escapedMetricVal = escapedMetricVal + ".";//adding dot to work also when there is no segment
                                        }

                                        for (var prop in update) {
                                            common.fillTimeObjectMonth({time: time}, tmpTimeObjMonth, escapedMetricVal + prop, update[prop], true);
                                            common.fillTimeObjectZero({time: time}, tmpTimeObjZero, escapedMetricVal + prop, update[prop], true);
                                        }

                                        common.manualWriteBatcher.add("app_viewdata", tmpMonthId, {"$inc": tmpTimeObjMonth, "$set": {"n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.month}}, "countly", {token: token});
                                        common.manualWriteBatcher.add("app_viewdata", tmpZeroId, {"$inc": tmpTimeObjZero, "$set": {"n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.zero}}, "countly", {token: token});
                                    }
                                    if (Object.keys(meta_update).length > 0) {
                                        common.db.collection("views").updateOne({_id: common.db.ObjectID(next.a)}, {"$set": meta_update}, {upsert: true}, function(err3) {
                                            if (err3) {
                                                log.e(err3);
                                            }
                                        });
                                    }
                                    var dd = {view: next.n, "a": next.a};
                                    if (Object.keys(update_doc).length > 0) {
                                        for (var k in update_doc) {
                                            dd[k] = update_doc[k];
                                        }
                                    }
                                    common.manualWriteBatcher.add("app_viewsmeta", next.a + "_" + view_id, {"$set": dd}, "countly");
                                }

                            }
                            catch (err) {
                                log.e(err);
                            }
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "app_viewsdata");
                    await common.manualWriteBatcher.flush("countly", "app_viewsmeta");

                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });



    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('views-update', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_view_update"]}}},
                    {
                        "$project": {
                            "__id": "$fullDocument._id",
                            "cd": "$fullDocument.cd",
                            "sg": "$fullDocument.sg",
                            "e": "$fullDocument.e",
                            "n": "$fullDocument.n",
                            "ts": "$fullDocument.ts",
                            "dur": "$fullDocument.dur"
                        }
                    }
                ],
                fallback: {
                    pipeline: [ {"$match": {"e": {"$in": ["[CLY]_view_update"]}}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (var z = 0; z < events.length; z++) {
                        if (events[z].e === "[CLY]_view_update") {
                            var next = events[z];
                            try {
                                var app = await common.readBatcher.getOne("apps", common.db.ObjectID(next.a), {projection: {timezone: 1}});
                                if (app) {
                                    var viewMeta = await common.readBatcher.getOne("views", common.db.ObjectID(next.a));
                                    viewMeta = viewMeta || {};
                                    viewMeta.segments = viewMeta.segments || {};
                                    viewMeta.omit = viewMeta.omit || [];

                                    var time = common.initTimeObj(app.timezone, next.ts);
                                    var view_id = crypto.createHash('md5').update(next.n).digest('hex');
                                    var dateIds = common.getDateIds({time: time});

                                    var segments = ["no-segment"];
                                    var update = {};
                                    if (next.sg) {
                                        for (var sg in next.sg) {
                                            sg = sg.replace("sg.", "");
                                            if (escapedViewSegments[sg] || (viewMeta.omit && viewMeta.omit.indexOf(sg) !== -1)) {
                                                continue;
                                            }
                                            segments.push(sg);
                                        }


                                        if (next.sg && next.sg.bounce) {
                                            update.b = 1;
                                        }
                                        if (next.sg && next.sg.exit) {
                                            update.e = 1;
                                        }
                                        if (next.dur) {
                                            update.d = next.dur;
                                        }
                                    }
                                    if (Object.keys(update).length > 0) {
                                        for (var i = 0; i < segments.length; i++) {
                                            var tmpTimeObjZero = {};
                                            var tmpTimeObjMonth = {};

                                            var tmpZeroId = next.a + "_" + segments[i] + "_" + dateIds.zero + "_" + view_id; //view_year
                                            var tmpMonthId = next.a + "_" + segments[i] + "_" + dateIds.month + "_" + view_id; //view_year

                                            for (var prop in update) {
                                                common.fillTimeObjectMonth({time: time}, tmpTimeObjMonth, prop, update[prop], true);
                                                common.fillTimeObjectZero({time: time}, tmpTimeObjZero, prop, update[prop], true);

                                            }
                                            common.manualWriteBatcher.add("app_viewdata", tmpMonthId, {"$inc": tmpTimeObjMonth, "$set": {"n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.month}}, "countly", {token: token});
                                            common.manualWriteBatcher.add("app_viewdata", tmpZeroId, {"$inc": tmpTimeObjZero, "$set": {"n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.zero}}, "countly", {token: token});
                                        }
                                    }

                                }
                            }
                            catch (ee) {
                                log.e(ee);
                            }
                        }
                    }
                    common.manualWriteBatcher.flush("countly", "app_viewdata");
                }
            }
        }
        catch (err) {
            log.e(err);
        }
    });

}());
