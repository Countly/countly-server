var moment = require('moment-timezone');

var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const { changeStreamReader } = require('../../../api/parts/data/changeStreamReader');
const log = require('../../../api/utils/log.js')('crashes:aggregator');
const { WriteBatcher } = require('../../../api/parts/data/batcher.js');

//Would make sense to create common file for those.
var ranges = ["ram", "bat", "disk", "run", "session"];
var segments = ["os_version", "os_name", "manufacture", "device", "resolution", "app_version", "cpu", "opengl", "orientation", "view", "browser"];
var bools = {"root": true, "online": true, "muted": true, "signal": true, "background": true};

var props = [
    //device metrics
    "os",
    "os_version",
    "manufacture", //may not be provided for ios or be constant, like Apple
    "device", //model for Android, iPhone1,1 etc for iOS
    "resolution",
    "app_version",
    "cpu", //type of cpu used on device (for ios will be based on device)
    "opengl", //version of open gl supported
    "view", //screen, view or page where error happened
    "browser", //browser in which error happened, if applicable

    //state of device
    "ram",
    "ram_current", //in megabytes
    "ram_total",
    "disk",
    "disk_current", //in megabytes
    "disk_total",
    "bat_current", //battery level, probably usually from 0 to 100
    "bat_total", //but for consistency also provide total
    "bat", //or simple value from 0 to 100
    "orientation", //in which device was held, landscape, portrait, etc
    "session",

    //bools
    "root", //true if device is rooted/jailbroken, false or not provided if not
    "online", //true if device is connected to the internet (WiFi or 3G), false or not provided if not connected
    "muted", //true if volume is off, device is in muted state
    "signal", //true if have cell/gsm signal or is not in airplane mode, false when no gsm signal or in airplane mode
    "background", //true if app was in background when it crashed

    //error info
    "name", //optional if provided by OS/Platform, else will use first line of stack
    "type", //optional type of the error
    "error", //error stack
    "nonfatal", //true if handled exception, false or not provided if crash
    "logs", //some additional logs provided, if any
    "run", //running time since app start in seconds

    //build specific fields
    "architecture",
    "app_build",
    "binary_images",
    "build_uuid",
    "executable_name",
    "load_address",
    "native_cpp",
    "javascript",
    "plcrash",
    "binary_crash_dump",
    "unprocessed"
];

(function() {
    var recordCustomMetric = function(params, collection, id, metrics, value, segm, uniques, lastTimestamp, token, localBatcher) {
        value = value || 1;
        var updateUsersZero = {},
            updateUsersMonth = {},
            tmpSet = {};

        if (metrics) {
            for (let i = 0; i < metrics.length; i++) {
                common.collectMetric(params, metrics[i], {
                    segments: segm,
                    value: value,
                    unique: (uniques && uniques.indexOf(metrics[i]) !== -1) ? true : false,
                    lastTimestamp: lastTimestamp
                },
                tmpSet, updateUsersZero, updateUsersMonth);
            }
        }
        var dbDateIds = common.getDateIds(params);

        if (Object.keys(updateUsersZero).length || Object.keys(tmpSet).length) {
            var update = {
                $set: {
                    m: dbDateIds.zero,
                    a: params.app_id + ""
                }
            };
            if (Object.keys(updateUsersZero).length) {
                update.$inc = updateUsersZero;
            }
            if (Object.keys(tmpSet).length) {
                update.$addToSet = {};
                for (let i in tmpSet) {
                    update.$addToSet[i] = {$each: tmpSet[i]};
                }
            }
            localBatcher.add(collection, id + "_" + dbDateIds.zero, update, "countly", {token: token});

        }
        if (Object.keys(updateUsersMonth).length) {
            localBatcher.add(collection, id + "_" + dbDateIds.month, {
                $set: {
                    m: dbDateIds.month,
                    a: params.app_id + ""
                },
                '$inc': updateUsersMonth
            }, "countly", {token: token});
        }
    };

    plugins.register("/aggregator", function() {
        var localBatcher = new WriteBatcher(common.db);
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_crash"]}}},
                {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
            ],
            fallback: {
                pipeline: [{
                    "$match": {"e": {"$in": ["[CLY]_crash"]}}
                }]
            },
            "name": "crash",
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
                common.readBatcher.getOne("apps", common.db.ObjectID(next.a), async function(err, app) {
                    //record event totals in aggregated data
                    if (err) {
                        log.e("Error getting app data for session", err);
                        return;
                    }
                    if (app && app._id) {
                        var params = {"app_id": next.a, "app": app, "time": common.initTimeObj(app.timezone, next.ts), "appTimezone": (app.timezone || "UTC")};
                        const platform = next.up?.p || next.sg?.os;
                        const version = next.up?.av || next.sg?.app_version?.replace(/\./g, ":");

                        var groupSet = {};
                        var groupInsert = {};
                        var groupInc = {};
                        var groupMin = {};
                        var groupMax = {};

                        var metaInc = {};

                        next.sg = next.sg || {};
                        var hash = next.sg.group;

                        groupInsert._id = hash;
                        groupSet.os = platform;
                        groupSet.lastTs = moment(next.cd).unix();

                        if (next.sg.name) {
                            groupSet.name = ((next.sg.name + "").split('\n')[0] + "").trim();
                        }
                        else {
                            next.sg.error = next.sg.error || "";
                            groupSet.name = (next.sg.error.split('\n')[0] + "").trim();
                        }

                        groupSet.nonfatal = next.sg.nonfatal === "true" ? true : false;
                        if (next.sg.not_os_specific) {
                            groupSet.not_os_specific = true;
                        }

                        if (next.sg.javascript) {
                            groupSet.javascript = true;
                        }

                        if (next.sg.native_cpp) {
                            groupSet.native_cpp = true;
                        }

                        if (next.sg.plcrash) {
                            groupSet.plcrash = true;
                        }

                        groupInc.reports = 1;

                        var set = {
                            group: hash,
                            uid: next.uid,
                            last: next.ts,
                            sessions: next.up.sc || 0
                        };


                        var user = await common.db.collection('app_crashusers' + params.app_id).findOneAndUpdate({group: hash, 'uid': next.uid}, {$set: set, $inc: {reports: 1}}, {upsert: true, new: false, returnDocument: "before", returnNewDocument: false});

                        let AllUsersUpdate = {$set: {group: 0, 'uid': next.uid}};
                        if (!user || !user.reports) {
                            var inc = {crashes: 1};
                            if (groupSet.nonfatal === false) {
                                inc.usersfatal = 1;
                            }
                            AllUsersUpdate.$inc = inc;
                        }
                        if (user && user.sessions && next.up.sc && next.up.sc > user.sessions) {
                            next.sg.session = next.up.sc - user.sessions;
                        }
                        else {
                            delete next.sg.session;
                        }
                        if (next.up.sc) {
                            set.sessions = next.up.sc;
                        }

                        var userAll = await common.db.collection('app_crashusers' + params.app_id).findOneAndUpdate({group: 0, 'uid': next.uid}, AllUsersUpdate, {upsert: true, new: false, returnDocument: "before", returnNewDocument: false});

                        if ((next.sg.nonfatal === "true") && next.up.sc && next.up.sc > 0 && next.up.tp) {
                            metaInc.loss = next.up.tp / next.up.sc;
                            groupInc.loss = next.up.tp / next.up.sc;
                        }

                        if (!user || !user.reports) {
                            groupInc.users = 1;
                        }

                        if (next.sg.nonfatal === "false" && (!userAll || !userAll.fatal)) {
                            metaInc.usersfatal = 1;
                        }

                        groupInsert.is_new = true;
                        groupInsert.is_resolved = false;
                        groupInsert.startTs = next.ts;
                        groupInsert.latest_version = next.sg.app_version;
                        groupInsert.latest_version_for_sort = common.transformAppVersion(next.sg.app_version);
                        groupInsert.lrid = next._id + "";
                        groupInsert.error = next.sg.error || "";
                        var metrics = [];

                        metaInc.reports = 1;

                        /*

                                        if (group.is_renewed) {
                                            groupInc.reoccurred = 1;
                                            groupInc.resolved = -1;
                                        }
                                        */

                        if (next.sg.nonfatal === "true") {
                            metrics.push("crnf");
                            metrics.push("crunf");
                            metaInc.nonfatal = 1;
                        }
                        else {
                            metrics.push("crf");
                            metrics.push("cruf");
                            metaInc.fatal = 1;
                        }

                        if (!userAll || !userAll.crashes) {
                            metaInc.users = 1;
                        }

                        //process segments
                        for (let i = 0; i < props.length; i++) {
                            if (ranges.indexOf(props[i]) !== -1) {
                                if (next.sg[props[i] + "_current"] && next.sg[props[i] + "_total"]) {
                                    var ratio = ((parseInt(next.sg[props[i] + "_current"]) / parseInt(next.sg[props[i] + "_total"])) * 100).toFixed(2);
                                    groupInc[props[i] + ".total"] = parseFloat(ratio);
                                    groupInc[props[i] + ".count"] = 1;
                                    groupMin[props[i] + ".min"] = parseFloat(ratio);
                                    groupMax[props[i] + ".max"] = parseFloat(ratio);
                                }
                                else if (typeof next.sg[props[i]] !== 'undefined') {
                                    groupInc[props[i] + ".total"] = parseFloat(next.sg[props[i]]);
                                    groupInc[props[i] + ".count"] = 1;
                                    groupMin[props[i] + ".min"] = parseFloat(next.sg[props[i]]);
                                    groupMax[props[i] + ".max"] = parseFloat(next.sg[props[i]]);
                                }
                            }
                            else {
                                if (typeof next.sg[props[i]] !== 'undefined') {
                                    let safeKey = (next.sg[props[i]] + "").replace(/^\$/, "").replace(/\./g, ":");
                                    if (bools[props[i]]) {
                                        if (next.sg[props[i]] + "" === "false") {
                                            safeKey = "no";
                                        }
                                        else {
                                            safeKey = "yes";
                                        }
                                    }
                                    if (safeKey && (bools[props[i]] || segments.indexOf(props[i]) !== -1)) {
                                        if (groupInc[props[i] + "." + safeKey]) {
                                            groupInc[props[i] + "." + safeKey]++;
                                        }
                                        else {
                                            groupInc[props[i] + "." + safeKey] = 1;
                                        }
                                    }
                                }
                            }

                        }

                        //Process custom values
                        if (next.sg) {
                            for (let key in next.sg) {
                                if (key.indexOf("custom_") === 0) {
                                    let safeKey = (next.sg[key] + "").replace(/^\$/, "").replace(/\./g, ":");
                                    key = key.replace(/^custom_/, "");
                                    if (safeKey) {
                                        if (groupInc["custom." + key + "." + safeKey]) {
                                            groupInc["custom." + key + "." + safeKey]++;
                                        }
                                        else {
                                            groupInc["custom." + key + "." + safeKey] = 1;
                                        }

                                    }
                                }
                            }
                        }


                        metaInc["os." + platform] = 1;
                        metaInc["app_version." + version] = 1;


                        let update = {};
                        if (Object.keys(groupSet).length > 0) {
                            update.$set = groupSet;
                        }
                        if (Object.keys(groupInsert).length > 0) {
                            update.$setOnInsert = groupInsert;
                        }
                        if (Object.keys(groupInc).length > 0) {
                            update.$inc = groupInc;
                        }
                        if (Object.keys(groupMin).length > 0) {
                            update.$min = groupMin;
                        }
                        if (Object.keys(groupMax).length > 0) {
                            update.$max = groupMax;
                        }

                        update.$addToSet = {
                            groups: hash,
                            app_version_list: next.sg.app_version,
                        };

                        var crashGroup = await common.db.collection('app_crashgroups' + params.app_id).findOneAndUpdate({"groups": {$elemMatch: {$eq: hash}}}, update, {upsert: true, new: false, returnDocument: "before", returnNewDocument: false});
                        if (!crashGroup) {
                            metaInc.isnew = 1;
                            metaInc.crashes = 1;
                        }
                        var lastTs;

                        if (crashGroup) {
                            lastTs = crashGroup.lastTs;
                            if (crashGroup.latest_version !== next.sg.app_version) {
                                var group = {};
                                if (crashGroup.latest_version && common.versionCompare(next.sg.app_version.replace(/\./g, ":"), crashGroup.latest_version.replace(/\./g, ":")) > 0) {
                                    group.latest_version = next.sg.app_version;
                                    group.latest_version_for_sort = common.transformAppVersion(next.sg.app_version);
                                }
                                if (plugins.getConfig('crashes').same_app_version_crash_update) {
                                    if (crashGroup.latest_version && common.versionCompare(next.sg.app_version.replace(/\./g, ":"), crashGroup.latest_version.replace(/\./g, ":")) >= 0) {
                                        group.error = next.sg.error;
                                        group.lrid = next.sg._id + "";
                                    }
                                }
                                else {
                                    if (crashGroup.latest_version && common.versionCompare(next.sg.app_version.replace(/\./g, ":"), crashGroup.latest_version.replace(/\./g, ":")) > 0) {
                                        group.error = next.sg.error;
                                        group.lrid = next.sg._id + "";
                                    }
                                }
                                if (crashGroup.resolved_version && crashGroup.is_resolved && common.versionCompare(next.sg.app_version.replace(/\./g, ":"), crashGroup.resolved_version.replace(/\./g, ":")) > 0) {
                                    group.is_resolved = false;
                                    group.is_renewed = true;
                                }
                                if (Object.keys(group).length > 0) {
                                    common.db.collection('app_crashgroups' + params.app_id).updateOne({"groups": {$elemMatch: {$eq: hash}}}, {$set: group}, function() {});
                                }
                            }
                        }

                        recordCustomMetric(params, "crashdata", params.app_id, metrics, 1, null, ["cru", "crunf", "cruf"], lastTs, token, localBatcher);
                        recordCustomMetric(params, "crashdata", platform + "**" + version + "**" + params.app_id, metrics, 1, null, ["cru", "crunf", "cruf"], lastTs, token, localBatcher);
                        recordCustomMetric(params, "crashdata", platform + "**any**" + params.app_id, metrics, 1, null, ["cru", "crunf", "cruf"], lastTs, token, localBatcher);
                        recordCustomMetric(params, "crashdata", "any**" + version + "**" + params.app_id, metrics, 1, null, ["cru", "crunf", "cruf"], lastTs, token, localBatcher);


                        //total numbers
                        localBatcher.add('app_crashgroups' + params.app_id, "meta", {$inc: metaInc}, "countly", {token: token});
                    }
                });
            }
        });

        localBatcher.addFlushCallback("*", function(token) {
            changeStream.acknowledgeToken(token);
        });
    });


    //Records crash aggregated data changes based on session
    //Counts sessions and users in aggregated data. (cr_u and cr_s);
    plugins.register("/aggregator", function() {
        var localBatcher = new WriteBatcher(common.db);
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "insert", "fullDocument.e": {"$in": ["[CLY]_session"]}}},
                {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
            ],
            fallback: {
                pipeline: [{
                    "$match": {"e": {"$in": ["[CLY]_session"]}}
                }]
            },
            "name": "crash-session-start",
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
                        var params = {"app_id": next.a, "app": app, "time": common.initTimeObj(app.timezone, next.ts), "appTimezone": (app.timezone || "UTC")};

                        var metrics = ["cr_s", "cr_u"];
                        const platform = next.up?.p || next.sg?.os;
                        const version = next.up?.av || next.sg?.app_version?.replace(/\./g, ":");
                        var lastTs = next.sg?.prev_start || 0;

                        //WE DON"T know platfirm and version from previous session. So it if changes  - new model is not recording that.
                        recordCustomMetric(params, "crashdata", params.app_id, metrics, 1, null, ["cr_u"], lastTs, token, localBatcher);
                        if (platform && version) {
                            recordCustomMetric(params, "crashdata", platform + "**" + version + "**" + params.app_id, metrics, 1, null, ["cr_u"], lastTs, token, localBatcher);
                        }
                        if (platform) {
                            recordCustomMetric(params, "crashdata", platform + "**any**" + params.app_id, metrics, 1, null, ["cr_u"], lastTs, token, localBatcher);
                        }
                        if (version) {
                            recordCustomMetric(params, "crashdata", "any**" + version + "**" + params.app_id, metrics, 1, null, ["cr_u"], lastTs, token, localBatcher);
                        }

                    }
                });
            }
        });

        localBatcher.addFlushCallback("crashdata", function(token) {
            changeStream.acknowledgeToken(token);
        });
    });

    plugins.register("/aggregator", function() {
        var updateWriteBatcher = new WriteBatcher(common.db);
        var changeStream = new changeStreamReader(common.drillDb, {
            pipeline: [
                {"$match": {"operationType": "update"}},
                {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
            ],
            fallback: {
                pipeline: [{"$match": {"e": {"$in": ["[CLY]_session"]}}}],
                "timefield": "lu"
            },
            "options": {fullDocument: "updateLookup"},
            "name": "crash-session-updates",
            "collection": "drill_events",
            "onClose": async function(callback) {
                await common.writeBatcher.flush("countly", "users");
                if (callback) {
                    callback();
                }
            }
        }, (token, fullDoc) => {
            var next = fullDoc;
            if (next.fullDocument) {
                next = fullDoc.fullDocument;
            }
            if (next && next.a && next.e && next.e === "[CLY]_session" && next.n && next.ts) {
                common.readBatcher.getOne("apps", common.db.ObjectID(next.a), async function(err, app) {
                    //record event totals in aggregated data
                    if (err) {
                        log.e("Error getting app data for session", err);
                        return;
                    }
                    if (app && app._id) {
                        var params = {"app_id": next.a, "app": app, "time": common.initTimeObj(app.timezone, next.ts), "appTimezone": (app.timezone || "UTC")};
                        //check if it is not user's first session
                        if (next.up.ls) {
                            //record crash free session
                            var my_fatal_crash = await common.drillDb.collection("drill_events").findOne({
                                "e": "[CLY]_crash",
                                "a": next.a,
                                "uid": next.uid,
                                "ts": {"$gte": (next.up.ls * 1000)},
                                "sg.nonfatal": "false",
                            }, {ts: 1, _id: 0});
                            var metrics = [];
                            if (!my_fatal_crash) {
                                metrics.push("crfses");
                                metrics.push("crauf");
                            }

                            const platform = next.up?.p || next.sg?.os;
                            const version = next.up?.av || next.sg?.app_version?.replace(/\./g, ":");
                            var ts0 = next.sg?.prev_start || 0;
                            if (metrics.length) {
                                recordCustomMetric(params, "crashdata", params.app_id, metrics, 1, null, ["crauf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", platform + "**" + version + "**" + params.app_id, metrics, 1, null, ["crauf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", platform + "**any**" + version, metrics, 1, null, ["crauf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", "any**" + version + "**" + params.app_id, metrics, 1, null, ["crauf"], ts0, token, updateWriteBatcher);
                            }

                            var userMetrics = [];
                            var my_non_fatal_crash = await common.drillDb.collection("drill_events").findOne({
                                "e": "[CLY]_crash",
                                "a": next.a,
                                "uid": next.uid,
                                "ts": {"$gte": (next.up.ls * 1000)},
                                "sg.nonfatal": "true",
                            }, {ts: 1, _id: 0});

                            if (!my_non_fatal_crash) {
                                userMetrics.push("craunf");
                                userMetrics.push("crnfses");
                            }

                            if (userMetrics.length) {
                                recordCustomMetric(params, "crashdata", params.app_id, userMetrics, 1, null, ["craunf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", platform + "**" + version + "**" + params.app_id, userMetrics, 1, null, ["craunf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", platform + "**any**" + params.app_id, userMetrics, 1, null, ["craunf"], ts0, token, updateWriteBatcher);
                                recordCustomMetric(params, "crashdata", "any**" + version + "**" + params.app_id, userMetrics, 1, null, ["craunf"], ts0, token, updateWriteBatcher);
                            }
                        }
                    }
                });
            }
        });
        updateWriteBatcher.addFlushCallback("users", function(token) {
            changeStream.acknowledgeToken(token);
        });
    });
}());
