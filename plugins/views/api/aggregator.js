var plugins = require('../../pluginManager.ts'),
    common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = require('../../../api/utils/log.js')('views:aggregator');
const crypto = require('crypto');
const viewsUtils = require('./parts/viewsUtils.js');

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
        "scr": true,
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


    plugins.register("/batcher/fail", function(ob) {
        if (ob.db === "countly" && (ob.collection.indexOf("app_viewdata") === 0)) {
            //omit segment using app_id and segment name
            if (ob.data && ob.data.updateOne && ob.data.updateOne.update && ob.data.updateOne.update.$set) {
                var appId = ob.data.updateOne.update.$set.a;
                var segment = ob.data.updateOne.update.$set.s;
                if (appId && segment) {
                    log.d("calling segment omiting for " + appId + " - " + segment);
                    viewsUtils.ommit_segments({extend: true, db: common.db, omit: [segment], appId: appId, params: {"qstring": {}, "user": {"_id": "SYSTEM", "username": "SYSTEM"}}}, function(err) {
                        if (err) {
                            log.e(err);
                        }
                    });
                }
            }
        }
        else if (ob.db === "countly" && ob.collection === "views") {
            //Failed to update root document
            if (ob.data && ob.data.updateOne && ob.data.updateOne.filter) {
                var _id = ob.data.updateOne.filter._id;
                if (_id) {
                    log.d("Failed to update root document for app " + _id + ". There are too many segments/values stored. Run cleanup for core document.");
                }
                viewsUtils.cleanupRootDocument(common.db, _id);
            }
        }
    });


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
            await eventSource.processWithAutoAck(async(token, events) => {
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
                                                else {
                                                    view_id = crypto.createHash('md5').update(next.n).digest('hex');
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
                                            else if (segKey !== 'platform' && (!viewMeta.segments[segKey] && Object.keys(viewMeta.segments).length >= plugins.getConfig("views").segment_limit)) {
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

                                            if (viewMeta.segments[segments[i]] && (!viewMeta.segments[segments[i]][escapedMetricVal] && Object.keys(viewMeta.segments[segments[i]]).length >= plugins.getConfig("views").segment_value_limit)) {
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
                                            if (prop === "u") {
                                                common.fillTimeObjectZero({time: time}, tmpTimeObjZero, escapedMetricVal + prop, update[prop], true);
                                            }
                                            else {
                                                tmpTimeObjZero["d." + time.month + "." + escapedMetricVal + prop] = update[prop];
                                            }
                                        }
                                        common.manualWriteBatcher.add("app_viewdata", tmpMonthId, {"$inc": tmpTimeObjMonth, "$set": {"a": next.a, "n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.month, "s": segments[i]}}, "countly", {token: token});
                                        common.manualWriteBatcher.add("app_viewdata", tmpZeroId, {"$inc": tmpTimeObjZero, "$set": {"a": next.a, "n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.zero, "s": segments[i]}}, "countly", {token: token});
                                    }
                                    if (Object.keys(meta_update).length > 0) {
                                        //Flush meta document
                                        try {
                                            await common.db.collection("views").updateOne({_id: common.db.ObjectID(next.a)}, {"$set": meta_update}, {upsert: true});
                                        }
                                        catch (err3) {
                                            if (err3.errorResponse && err3.errorResponse.code === 17419) {
                                                viewsUtils.cleanupRootDocument(common.db, next.a);
                                            }
                                        }
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
                    await common.manualWriteBatcher.flush("countly", "app_viewdata");
                    await common.manualWriteBatcher.flush("countly", "app_viewsmeta");

                }
            });
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
            await eventSource.processWithAutoAck(async(token, events) => {
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

                                                escapedMetricVal = escapedMetricVal + ".";
                                            }
                                            for (var prop in update) {
                                                common.fillTimeObjectMonth({time: time}, tmpTimeObjMonth, escapedMetricVal + prop, update[prop], true);
                                                tmpTimeObjZero["d." + time.month + "." + escapedMetricVal + prop] = update[prop];
                                            }

                                            common.manualWriteBatcher.add("app_viewdata", tmpMonthId, {"$inc": tmpTimeObjMonth, "$set": {"a": next.a, "n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.month, "s": segments[i]}}, "countly", {token: token});
                                            common.manualWriteBatcher.add("app_viewdata", tmpZeroId, {"$inc": tmpTimeObjZero, "$set": {"a": next.a, "n": next.n, "vw": next.a + "_" + view_id, "m": dateIds.zero, "s": segments[i]}}, "countly", {token: token});
                                        }
                                    }

                                }
                            }
                            catch (ee) {
                                log.e(ee);
                            }
                        }
                    }
                    await common.manualWriteBatcher.flush("countly", "app_viewdata");
                }
            });
        }
        catch (err) {
            log.e(err);
        }
    });
}());
