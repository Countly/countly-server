var plugin = {},
    common = require('../../../api/utils/common.js'),
    fetch = require("../../../api/parts/data/fetch.js"),
    crypto = require("crypto"),
    async = require("async"),
    Duplex = require('stream').Duplex,
    Promise = require("bluebird"),
    trace = require("./parts/stacktrace.js"),
    plugins = require('../../pluginManager.js');

plugins.setConfigs("crashes", {
    report_limit: 100
});

(function() {
    var ranges = ["ram", "bat", "disk", "run", "session"];
    var segments = ["os_version", "os_name", "manufacture", "device", "resolution", "app_version", "cpu", "opengl", "orientation", "view", "browser"];
    var bools = {"root": true, "online": true, "muted": true, "signal": true, "background": true};
    plugins.internalDrillEvents.push("[CLY]_crash");

    plugins.register("/i/device_id", function(ob) {
        var appId = ob.app_id;
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            common.db.collection("app_crashes" + appId).update({uid: oldUid}, {'$set': {uid: newUid}}, {multi: true}, function() {});
            common.db.collection("app_crashusers" + appId).find({uid: oldUid}).toArray(function(err, res) {
                if (res && res.length) {
                    const bulk = common.db._native.collection("app_crashusers" + appId).initializeUnorderedBulkOp();
                    for (let i = 0; i < res.length; i++) {
                        const updates = {};
                        for (const key of ['last', 'sessions']) {
                            if (res[i][key]) {
                                if (!updates.$max) {
                                    updates.$max = {};
                                }
                                updates.$max[key] = res[i][key];
                            }
                        }
                        for (const key of ['reports', 'crashes', 'fatal']) {
                            if (res[i][key]) {
                                if (!updates.$inc) {
                                    updates.$inc = {};
                                }
                                updates.$inc[key] = res[i][key];
                            }
                        }
                        const group = res[i].group;
                        bulk.find({uid: newUid, group: group}).upsert().updateOne(updates);
                        bulk.find({uid: oldUid, group: group}).remove();
                    }
                    bulk.execute();
                }
            });
        }
    });

    plugins.register("/i/app_users/delete", function(ob) {
        var appId = ob.app_id;
        var uids = ob.uids;
        if (uids && uids.length) {
            common.db.collection("app_crashes" + appId).remove({uid: {$in: uids}}, function() {});
            common.db.collection("app_crashusers" + appId).remove({uid: {$in: uids}}, function() {});
        }
    });

    plugins.register("/i/app_users/export", function(ob) {
        return new Promise(function(resolve) {
            var uids = ob.uids;
            if (uids && uids.length) {
                if (!ob.export_commands.crashes) {
                    ob.export_commands.crashes = [];
                }
                ob.export_commands.crashes.push('mongoexport ' + ob.dbstr + ' --collection app_crashes' + ob.app_id + ' -q \'{uid:{$in: ["' + uids.join('","') + '"]}}\' --out ' + ob.export_folder + '/crashes' + ob.app_id + '.json');
                ob.export_commands.crashes.push('mongoexport ' + ob.dbstr + ' --collection app_crashusers' + ob.app_id + ' -q \'{uid:{$in: ["' + uids.join('","') + '"]}}\' --out ' + ob.export_folder + '/crashusers' + ob.app_id + '.json');
                resolve();
            }
        });
    });
    //check app metric
    plugins.register("/session/metrics", function(ob) {
        var apiPath = ob.params.apiPath;
        if (apiPath !== "/i") {
            return;
        }

        return new Promise(function(resolve) {
            var params = ob.params;
            if (!params.qstring.crash && params.qstring.metrics && params.qstring.metrics._app_version) {
                const checkCrash = function(latest_version, hash, uid, done) {
                    common.db.collection('app_crashgroups' + params.app_id).findOne({'groups': hash }, function(err, crash) {
                        if (crash && crash.is_resolved && crash.resolved_version) {
                            if (common.versionCompare(latest_version, crash.resolved_version.replace(/\./g, ":")) > 0) {
                                //record resolved user timeline
                                common.recordCustomMetric(params, "crashdata", params.app_id, ["crru"]);

                                //update crash stats
                                common.db.collection('app_crashusers' + params.app_id).remove({"group": hash, uid: uid}, function() {});
                                common.db.collection('app_crashgroups' + params.app_id).update({'groups': hash, users: {$gt: 0} }, {$inc: {users: -1}}, function() {});

                                //update global app stats
                                var mod = {crashes: -1};
                                if (!crash.nonfatal) {
                                    mod.fatal = -1;
                                }
                                common.db.collection('app_crashusers' + params.app_id).findAndModify({"group": 0, uid: uid}, {}, {$inc: mod}, {upsert: true, new: true}, function(crashUserErr, res) {
                                    res = res && res.ok ? res.value : null;
                                    if (res && res.crashes <= 0) {
                                        common.db.collection('app_crashusers' + params.app_id).remove({"group": 0, uid: uid}, function() {});
                                    }
                                    done(null, true);
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
                };
                var dbAppUser = params.app_user;
                var latest_version = params.qstring.metrics._app_version.replace(/\./g, ":");
                if (dbAppUser && dbAppUser.uid && (!dbAppUser.av || common.versionCompare(latest_version, dbAppUser.av) > 0)) {
                    common.db.collection('app_crashusers' + params.app_id).find({uid: dbAppUser.uid}, {group: 1, _id: 0}).toArray(function(err, res) {
                        if (res && res.length) {
                            var crashes = [];
                            for (let i = 0; i < res.length; i++) {
                                if (res[i].group !== 0) {
                                    crashes.push(res[i].group);
                                }
                            }
                            if (crashes.length) {
                                async.map(crashes, function(crash, done) {
                                    checkCrash(latest_version, crash, dbAppUser.uid, done);
                                }, function(mapErr, mapRes) {
                                    var shouldRecalculate = false;
                                    if (mapRes && mapRes.length) {
                                        for (let i = 0; i < mapRes.length; i++) {
                                            if (mapRes[i]) {
                                                shouldRecalculate = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (shouldRecalculate) {
                                        common.db.collection('app_crashusers' + params.app_id).find({"group": 0, crashes: { $gt: 0 }}).count(function(crashErr, userCount) {
                                            common.db.collection('app_crashusers' + params.app_id).find({"group": 0, crashes: { $gt: 0 }, fatal: { $gt: 0 }}).count(function(crashUsersErr, fatalCount) {
                                                var set = {};
                                                set.users = userCount;
                                                set.usersfatal = fatalCount;
                                                common.db.collection('app_crashgroups' + params.app_id).update({'_id': "meta" }, {$set: set}, function() {});
                                            });
                                        });
                                    }
                                    resolve();
                                });
                            }
                            else {
                                resolve();
                            }
                        }
                        else {
                            resolve();
                        }
                    });
                }
                else {
                    resolve();
                }
            }
            else {
                resolve();
            }
        });
    });
    //write api call
    plugins.register("/i", function(ob) {
        return new Promise(function(resolve) {
            var params = ob.params;
            if (typeof params.qstring.crash === "string") {
                try {
                    params.qstring.crash = JSON.parse(params.qstring.crash);
                }
                catch (SyntaxError) {
                    console.log('Parse crash JSON failed', params.qstring.crash, params.req.url, params.req.body);
                    resolve();
                    return false;
                }
            }

            if (params.qstring.crash && params.qstring.crash._error && params.qstring.crash._app_version && params.qstring.crash._os) {
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
                    "ram_current", //in megabytes
                    "ram_total",
                    "disk_current", //in megabytes
                    "disk_total",
                    "bat_current", //battery level, probably usually from 0 to 100
                    "bat_total", //but for consistency also provide total
                    "bat", //or simple value from 0 to 100
                    "orientation", //in which device was held, landscape, portrait, etc

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
                    "binary_crash_dump",
                    "unprocessed",

                    //custom key/values provided by developers
                    "custom"
                ];

                trace.preprocessCrash(params.qstring.crash, function(error) {
                    if (error && error !== "") {
                        var report = {};
                        for (let i = 0, l = props.length; i < l; i++) {
                            if (typeof params.qstring.crash["_" + props[i]] !== "undefined") {
                                if (bools[props[i]]) {
                                    if (params.qstring.crash["_" + props[i]] + "" === "false") {
                                        report[props[i]] = 0;
                                    }
                                    else if (params.qstring.crash["_" + props[i]] + "" === "true") {
                                        report[props[i]] = 1;
                                    }
                                }
                                else if (segments[props[i]]) {
                                    report[props[i]] = params.qstring.crash["_" + props[i]] + "";
                                }
                                else if (props[i] === "custom") {
                                    report[props[i]] = {};
                                    for (let key in params.qstring.crash["_" + props[i]]) {
                                        let safeKey = key.replace(/^\$/, "").replace(/\./g, ":");
                                        if (safeKey) {
                                            report[props[i]][safeKey] = params.qstring.crash["_" + props[i]][key];
                                        }
                                    }
                                }
                                else {
                                    report[props[i]] = params.qstring.crash["_" + props[i]];
                                    if (props[i] === "os" && params.qstring.crash._not_os_specific) {
                                        report[props[i] + "_name"] = params.qstring.crash["_" + props[i]] + "";
                                    }
                                }
                            }
                        }
                        report.cd = new Date();
                        if (report.binary_images && typeof report.binary_images === "object") {
                            report.binary_images = JSON.stringify(report.binary_images);
                        }
                        report.nonfatal = (report.nonfatal && report.nonfatal !== "false") ? true : false;
                        report.not_os_specific = (params.qstring.crash._not_os_specific) ? true : false;
                        var seed = error + params.app_id + report.nonfatal + "";
                        if (!params.qstring.crash._not_os_specific) {
                            seed = report.os + seed;
                        }
                        var hash = common.crypto.createHash('sha1').update(seed).digest('hex');
                        const checkUser = function(dbAppUser, tries) {
                            if (!dbAppUser || !dbAppUser.uid) {
                                setTimeout(function() {
                                    tries++;
                                    if (tries < 5) {
                                        checkUser(params.app_user, tries);
                                    }
                                }, 5000);
                            }
                            else {
                                report.group = hash;
                                report.uid = dbAppUser.uid;
                                report.ts = params.time.timestamp;

                                var set = {group: hash, 'uid': report.uid, last: report.ts};
                                if (dbAppUser && dbAppUser.sc) {
                                    set.sessions = dbAppUser.sc;
                                }
                                common.db.collection('app_crashusers' + params.app_id).findAndModify({group: hash, 'uid': report.uid}, {}, {$set: set, $inc: {reports: 1}}, {upsert: true, new: false}, function(err, user) {
                                    user = user && user.ok ? user.value : null;
                                    if (user && user.sessions && dbAppUser && dbAppUser.sc && dbAppUser.sc > user.sessions) {
                                        report.session = dbAppUser.sc - user.sessions;
                                    }
                                    common.db.collection('app_crashes' + params.app_id).insert(report, function(crashErr, res) {
                                        if (res && res.insertedIds && res.insertedIds[0]) {
                                            report._id = res.insertedIds[0];

                                            var data = {};
                                            data.crash = report.group;
                                            var drillP = [
                                                { name: "name", type: "s" },
                                                { name: "manufacture", type: "l" },
                                                { name: "cpu", type: "l" },
                                                { name: "opengl", type: "l" },
                                                { name: "view", type: "l" },
                                                { name: "browser", type: "l" },
                                                { name: "os", type: "l" },
                                                { name: "orientation", type: "l" },
                                                { name: "nonfatal", type: "l" },
                                                { name: "root", type: "l" },
                                                { name: "online", type: "l" },
                                                { name: "signal", type: "l" },
                                                { name: "muted", type: "l" },
                                                { name: "background", type: "l" },
                                                { name: "app_version", type: "l" },
                                                { name: "ram_current", type: "n" },
                                                { name: "ram_total", type: "n" },
                                                { name: "disk_current", type: "n" },
                                                { name: "disk_total", type: "n" },
                                                { name: "bat_current", type: "n" },
                                                { name: "bat_total", type: "n" },
                                                { name: "bat", type: "n" },
                                                { name: "run", type: "n" }
                                            ];
                                            for (let i = 0; i < drillP.length; i++) {
                                                if (report[drillP[i].name] !== null && typeof report[drillP[i].name] !== "undefined") {
                                                    if (bools[drillP[i].name]) {
                                                        if (report[drillP[i].name]) {
                                                            data[drillP[i].name] = "true";
                                                        }
                                                        else {
                                                            data[drillP[i].name] = "false";
                                                        }
                                                    }
                                                    else {
                                                        data[drillP[i].name] = report[drillP[i].name];
                                                    }
                                                }
                                            }
                                            if (report.custom) {
                                                for (let i in report.custom) {
                                                    if (!data[i]) {
                                                        data[i] = report.custom[i];
                                                    }
                                                }
                                            }
                                            var events = [{
                                                key: "[CLY]_crash",
                                                count: 1,
                                                segmentation: data
                                            }];
                                            plugins.dispatch("/plugins/drill", {params: params, dbAppUser: dbAppUser, events: events});


                                            const processCrash = function(userAll, lastTs) {
                                                var groupSet = {};
                                                var groupInsert = {};
                                                var groupInc = {};
                                                var groupMin = {};
                                                var groupMax = {};

                                                groupInsert._id = hash;
                                                groupSet.os = report.os;
                                                groupSet.lastTs = report.ts;

                                                if (report.name) {
                                                    groupSet.name = ((report.name + "").split('\n')[0] + "").trim();
                                                }
                                                else {
                                                    groupSet.name = (report.error.split('\n')[0] + "").trim();
                                                }

                                                groupSet.nonfatal = (report.nonfatal) ? true : false;

                                                if (report.not_os_specific) {
                                                    groupSet.not_os_specific = true;
                                                }

                                                if (report.native_cpp) {
                                                    groupSet.native_cpp = true;
                                                }

                                                groupInc.reports = 1;

                                                if (!report.nonfatal && dbAppUser.sc && dbAppUser.sc > 0 && dbAppUser.tp) {
                                                    groupInc.loss = dbAppUser.tp / dbAppUser.sc;
                                                }

                                                if (!user || !user.reports) {
                                                    groupInc.users = 1;
                                                }

                                                groupInsert.is_new = true;
                                                groupInsert.is_resolved = false;
                                                groupInsert.startTs = report.ts;
                                                groupInsert.latest_version = report.app_version;
                                                groupInsert.error = report.error;
                                                groupInsert.lrid = report._id + "";

                                                //process segments
                                                for (let i = 0, l = segments.length; i < l; i++) {
                                                    if (report[segments[i]] !== undefined) {
                                                        let safeKey = (report[segments[i]] + "").replace(/^\$/, "").replace(/\./g, ":");
                                                        if (safeKey) {
                                                            if (groupInc[segments[i] + "." + safeKey]) {
                                                                groupInc[segments[i] + "." + safeKey]++;
                                                            }
                                                            else {
                                                                groupInc[segments[i] + "." + safeKey] = 1;
                                                            }
                                                        }
                                                    }
                                                }

                                                //process custom segments
                                                if (report.custom) {
                                                    for (let key in report.custom) {
                                                        let safeKey = (report.custom[key] + "").replace(/^\$/, "").replace(/\./g, ":");
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

                                                //process bool values
                                                for (let i in bools) {
                                                    if (report[i]) {
                                                        if (groupInc[i + ".yes"]) {
                                                            groupInc[i + ".yes"]++;
                                                        }
                                                        else {
                                                            groupInc[i + ".yes"] = 1;
                                                        }
                                                    }
                                                    else {
                                                        if (groupInc[i + ".no"]) {
                                                            groupInc[i + ".no"]++;
                                                        }
                                                        else {
                                                            groupInc[i + ".no"] = 1;
                                                        }
                                                    }
                                                }

                                                //process ranges
                                                for (let i = 0, l = ranges.length; i < l; i++) {
                                                    if (report[ranges[i] + "_current"] && report[ranges[i] + "_total"]) {
                                                        var ratio = ((parseInt(report[ranges[i] + "_current"]) / parseInt(report[ranges[i] + "_total"])) * 100).toFixed(2);
                                                        groupInc[ranges[i] + ".total"] = parseFloat(ratio);
                                                        groupInc[ranges[i] + ".count"] = 1;
                                                        groupMin[ranges[i] + ".min"] = parseFloat(ratio);
                                                        groupMax[ranges[i] + ".max"] = parseFloat(ratio);
                                                    }
                                                    else if (report[ranges[i]] !== undefined) {
                                                        groupInc[ranges[i] + ".total"] = parseFloat(report[ranges[i]]);
                                                        groupInc[ranges[i] + ".count"] = 1;
                                                        groupMin[ranges[i] + ".min"] = parseFloat(report[ranges[i]]);
                                                        groupMax[ranges[i] + ".max"] = parseFloat(report[ranges[i]]);
                                                    }
                                                }

                                                var update = {};
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

                                                update.$addToSet = {groups: hash};

                                                common.db.collection('app_crashgroups' + params.app_id).findAndModify({'groups': {$elemMatch: {$eq: hash}} }, {}, update, {upsert: true, new: true}, function(crashGroupsErr, crashGroup) {
                                                    crashGroup = crashGroup && crashGroup.ok ? crashGroup.value : null;
                                                    var isNew = (!crashGroup || crashGroup.reports === 1) ? true : false;

                                                    var metrics = ["cr", "cru"];

                                                    if (report.nonfatal) {
                                                        metrics.push("crnf");
                                                    }
                                                    else {
                                                        metrics.push("crf");
                                                    }

                                                    common.recordCustomMetric(params, "crashdata", params.app_id, metrics, 1, null, ["cru"], lastTs);

                                                    var group = {};
                                                    if (!isNew) {
                                                        if (crashGroup.latest_version && common.versionCompare(report.app_version.replace(/\./g, ":"), crashGroup.latest_version.replace(/\./g, ":")) > 0) {
                                                            group.latest_version = report.app_version;
                                                            group.error = report.error;
                                                            group.lrid = report._id + "";
                                                        }
                                                        if (crashGroup.resolved_version && crashGroup.is_resolved && common.versionCompare(report.app_version.replace(/\./g, ":"), crashGroup.resolved_version.replace(/\./g, ":")) > 0) {
                                                            group.is_resolved = false;
                                                            group.is_renewed = true;
                                                        }
                                                        if (Object.keys(group).length > 0) {
                                                            common.db.collection('app_crashgroups' + params.app_id).update({'groups': hash }, {$set: group}, function() {});
                                                        }
                                                    }

                                                    //update meta document
                                                    groupInc = {};
                                                    groupInc.reports = 1;
                                                    if (userAll && userAll.crashes === 1) {
                                                        groupInc.users = 1;
                                                    }

                                                    if (!report.nonfatal && userAll && userAll.fatal === 1) {
                                                        groupInc.usersfatal = 1;
                                                    }

                                                    if (!report.nonfatal && dbAppUser.sc && dbAppUser.sc > 0 && dbAppUser.tp) {
                                                        groupInc.loss = dbAppUser.tp / dbAppUser.sc;
                                                    }

                                                    if (isNew) {
                                                        groupInc.isnew = 1;
                                                        groupInc.crashes = 1;
                                                    }
                                                    if (group.is_renewed) {
                                                        groupInc.reoccurred = 1;
                                                        groupInc.resolved = -1;
                                                    }
                                                    if (report.nonfatal) {
                                                        groupInc.nonfatal = 1;
                                                    }
                                                    else {
                                                        groupInc.fatal = 1;
                                                    }

                                                    groupInc["os." + report.os.replace(/^\$/, "").replace(/\./g, ":")] = 1;
                                                    groupInc["app_version." + report.app_version.replace(/^\$/, "").replace(/\./g, ":")] = 1;

                                                    common.db.collection('app_crashgroups' + params.app_id).update({'_id': "meta" }, {$inc: groupInc}, function() {});
                                                });
                                            };

                                            common.db.collection('app_crashgroups' + params.app_id).findOne({groups: hash}, {fields: {_id: 0, lastTs: 1}}, function(crashGroupsErr, group) {
                                                var lastTs;
                                                if (group) {
                                                    lastTs = group.lastTs;
                                                }
                                                if (!user || !user.reports) {
                                                    var inc = {crashes: 1};
                                                    if (!report.nonfatal) {
                                                        inc.fatal = 1;
                                                    }

                                                    common.db.collection('app_crashusers' + params.app_id).findAndModify({group: 0, 'uid': report.uid}, {}, {$set: {group: 0, 'uid': report.uid}, $inc: inc}, {upsert: true, new: true}, function(crashUsersErr, userAll) {
                                                        userAll = userAll && userAll.ok ? userAll.value : null;
                                                        processCrash(userAll, lastTs);
                                                    });
                                                }
                                                else {
                                                    processCrash(null, lastTs);
                                                }
                                            });
                                        }
                                        else {
                                            console.error("Could not save crash", crashErr);
                                        }
                                    });
                                });
                            }
                        };
                        checkUser(params.app_user, 0);
                        resolve();
                    }
                    else {
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    });

    //read api call
    plugins.register("/o", function(ob) {
        var obParams = ob.params;
        var validate = ob.validateUserForDataReadAPI;
        if (obParams.qstring.method === 'crashes') {
            validate(obParams, function(params) {
                if (params.qstring.group) {
                    if (params.qstring.userlist) {
                        common.db.collection('app_crashusers' + params.app_id).find({group: params.qstring.group}, {uid: 1, _id: 0}).toArray(function(err, uids) {
                            var res = [];
                            for (var i = 0; i < uids.length; i++) {
                                res.push(uids[i].uid);
                            }
                            common.returnOutput(params, res);
                        });
                    }
                    else {
                        common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(err, total) {
                            common.db.collection('app_crashgroups' + params.app_id).findOne({groups: params.qstring.group}, function(crashGroupsErr, result) {
                                if (result) {
                                    trace.postprocessCrash(result);
                                    result.total = total;
                                    result.url = common.crypto.createHash('sha1').update(params.app_id + result._id + "").digest('hex');
                                    if (result.comments) {
                                        for (var i = 0; i < result.comments.length; i++) {
                                            if (result.comments[i].author_id === params.member._id + "") {
                                                result.comments[i].is_owner = true;
                                            }
                                        }
                                    }
                                    var cursor = common.db.collection('app_crashes' + params.app_id).find({group: result._id}, {fields: {binary_crash_dump: 0}}).sort({ $natural: -1 });
                                    cursor.limit(plugins.getConfig("crashes").report_limit);
                                    cursor.toArray(function(cursorErr, res) {
                                        if (res && res.length) {
                                            res.forEach(trace.postprocessCrash);
                                        }
                                        result.data = res || [];
                                        common.returnOutput(params, result);
                                    });
                                    if (result.is_new) {
                                        common.db.collection('app_crashgroups' + params.app_id).update({groups: params.qstring.group}, {$set: {is_new: false}}, function() {});
                                        common.db.collection('app_crashgroups' + params.app_id).update({_id: "meta"}, {$inc: {isnew: -1}}, function() {});
                                    }
                                }
                                else {
                                    common.returnMessage(params, 400, 'Crash group not found');
                                }
                            });
                        });
                    }
                }
                else if (params.qstring.list) {
                    common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(errCount, total) {
                        if (!errCount && total && total < 10000) {
                            common.db.collection('app_crashgroups' + params.app_id).find({_id: {$ne: "meta"}}, {name: 1}).toArray(function(err, res) {
                                if (res) {
                                    for (var i = 0; i < res.length; i++) {
                                        res[i].name = (res[i].name + "").split("\n")[0].trim();
                                    }
                                }
                                common.returnOutput(params, res || []);
                            });
                        }
                        else {
                            common.returnOutput(params, []);
                        }
                    });
                }
                else if (params.qstring.graph) {
                    var result = {};
                    common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(err, total) {
                        result.users = {};
                        result.users.total = total;
                        result.users.affected = 0;
                        result.users.fatal = 0;
                        result.users.nonfatal = 0;
                        result.crashes = {};
                        result.crashes.total = 0;
                        result.crashes.unique = 0;
                        result.crashes.resolved = 0;
                        result.crashes.unresolved = 0;
                        result.crashes.fatal = 0;
                        result.crashes.nonfatal = 0;
                        result.crashes.news = 0;
                        result.crashes.renewed = 0;
                        result.crashes.os = {};
                        result.crashes.highest_app = "";
                        result.loss = 0;
                        common.db.collection('app_crashgroups' + params.app_id).findOne({_id: "meta"}, function(crashGroupsErr, meta) {
                            if (meta) {
                                result.users.affected = meta.users || 0;
                                result.users.fatal = meta.usersfatal || 0;
                                result.users.nonfatal = result.users.affected - result.users.fatal;
                                result.crashes.total = meta.reports || 0;
                                result.crashes.unique = meta.crashes || 0;
                                result.crashes.resolved = meta.resolved || 0;
                                result.crashes.unresolved = result.crashes.unique - result.crashes.resolved;
                                result.crashes.fatal = meta.fatal || 0;
                                result.crashes.nonfatal = meta.nonfatal || 0;
                                result.crashes.news = meta.isnew || 0;
                                result.crashes.renewed = meta.reoccurred || 0;
                                result.crashes.os = meta.os || {};
                                result.loss = meta.loss || 0;

                                var max = "0:0";
                                for (var j in meta.app_version) {
                                    if (meta.app_version[j] > 0 && common.versionCompare(j, max) > 0) {
                                        result.crashes.highest_app = j.replace(/:/g, '.');
                                        max = j;
                                    }
                                }
                            }
                            fetch.getTimeObj("crashdata", params, {unique: "cru"/*, levels:{daily:["cr","crnf","cru","crf", "crru"], monthly:["cr","crnf","cru","crf", "crru"]}*/}, function(data) {
                                result.data = data;
                                common.returnOutput(params, result);
                            });
                        });
                    });
                }
                else {
                    //var columns = ["nonfatal", "session", "reports", "users", "os", "name", "lastTs", "latest_version", "is_resolved"];
                    var columns = [null, "name", "os", "reports", "users", "lastTs", "latest_version"];
                    var filter = {};
                    if (params.qstring.query && params.qstring.query !== "") {
                        try {
                            filter = JSON.parse(params.qstring.query);
                        }
                        catch (ex) {
                            console.log("Cannot parse crashes query", params.qstring.query);
                        }
                    }
                    if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                        var reg;
                        try {
                            reg = new RegExp(".*" + params.qstring.sSearch + ".*", 'i');
                        }
                        catch (ex) {
                            console.log("Incorrect regex: " + params.qstring.sSearch);
                        }
                        if (reg) {
                            filter.name = {"$regex": reg};
                        }
                        //filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
                    }
                    if (params.qstring.filter && params.qstring.filter !== "") {
                        switch (params.qstring.filter) {
                        case "crash-resolved":
                            filter.is_resolved = true;
                            filter.is_resolving = {$ne: true};
                            break;
                        case "crash-hidden":
                            filter.is_hidden = true;
                            break;
                        case "crash-unresolved":
                            filter.is_resolved = false;
                            filter.is_resolving = {$ne: true};
                            break;
                        case "crash-nonfatal":
                            filter.nonfatal = true;
                            break;
                        case "crash-fatal":
                            filter.nonfatal = false;
                            break;
                        case "crash-new":
                            filter.is_new = true;
                            break;
                        case "crash-viewed":
                            filter.is_new = false;
                            break;
                        case "crash-reoccurred":
                            filter.is_renewed = true;
                            break;
                        case "crash-resolving":
                            filter.is_resolving = true;
                            break;
                        }
                    }
                    if (params.qstring.filter !== "crash-hidden") {
                        filter.is_hidden = {$ne: true};
                    }
                    if (typeof filter._id === "undefined") {
                        filter._id = {$ne: "meta"};
                    }
                    plugins.dispatch("/drill/preprocess_query", {
                        query: filter
                    });
                    common.db.collection('app_crashgroups' + params.app_id).estimatedDocumentCount(function(crashGroupsErr, total) {
                        total--;
                        var cursor = common.db.collection('app_crashgroups' + params.app_id).find(filter, {uid: 1, is_new: 1, is_renewed: 1, is_hidden: 1, os: 1, not_os_specific: 1, name: 1, error: 1, users: 1, lastTs: 1, reports: 1, latest_version: 1, is_resolved: 1, resolved_version: 1, nonfatal: 1, session: 1, is_resolving: 1});
                        cursor.count(function(errCursor, count) {
                            if (params.qstring.iDisplayStart && params.qstring.iDisplayStart !== 0) {
                                cursor.skip(parseInt(params.qstring.iDisplayStart));
                            }
                            if (params.qstring.iDisplayLength && params.qstring.iDisplayLength !== -1) {
                                cursor.limit(parseInt(params.qstring.iDisplayLength));
                            }
                            if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0] && columns[params.qstring.iSortCol_0]) {
                                let obj = {};
                                obj[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                                cursor.sort(obj);
                            }

                            cursor.toArray(function(cursorErr, res) {
                                res = res || [];
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: count, aaData: res});
                            });
                        });
                    });
                }
            });
            return true;
        }
        else if (obParams.qstring.method === 'user_crashes') {
            validate(obParams, function(params) {
                if (params.qstring.uid) {
                    var columns = ["group", "reports", "last"];
                    var query = {group: {$ne: 0}, uid: params.qstring.uid};
                    var cursor = common.db.collection('app_crashusers' + params.app_id).find(query, {_id: 0});
                    cursor.count(function(err, total) {
                        total = total || 0;
                        if (params.qstring.iDisplayStart && params.qstring.iDisplayStart !== 0) {
                            cursor.skip(parseInt(params.qstring.iDisplayStart));
                        }
                        if (params.qstring.iDisplayLength && params.qstring.iDisplayLength !== -1) {
                            cursor.limit(parseInt(params.qstring.iDisplayLength));
                        }
                        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0] && columns[params.qstring.iSortCol_0]) {
                            let obj = {};
                            obj[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                            cursor.sort(obj);
                        }
                        cursor.toArray(function(cursorErr, crashes) {
                            var res = [];
                            var groupIDs = [];
                            for (let i = 0; i < crashes.length; i++) {
                                if (crashes[i].group !== 0 && crashes[i].reports) {
                                    var crash = {};
                                    crash.group = crashes[i].group;
                                    crash.reports = crashes[i].reports;
                                    crash.last = crashes[i].last || (params.qstring.fromExportAPI ? 'Unknow' : 0);
                                    res.push(crash);
                                    groupIDs.push(crash.group);
                                }
                            }
                            if (params.qstring.fromExportAPI) {
                                common.db.collection('app_crashgroups' + params.app_id).find({groups: {$in: groupIDs}}, {name: 1, _id: 1}).toArray(function(crashGroupsErr, groups) {
                                    if (groups) {
                                        for (let i = 0; i < groups.length; i++) {
                                            groups[i].name = (groups[i].name + "").split("\n")[0].trim();
                                            res.forEach((eachCrash)=>{
                                                if (groups[i].groups.indexOf(eachCrash.group) !== -1) {
                                                    eachCrash.group = groups[i].name;
                                                }
                                            });
                                        }
                                    }
                                    common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: res});
                                });
                            }
                            else {
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: res});
                            }
                        });
                    });
                }
                else {
                    common.returnMessage(params, 400, 'Please provide user uid');
                }
            });
            return true;
        }
    });

    //reading crashes
    plugins.register("/o/crashes", function(ob) {
        var obParams = ob.params;
        var validate = ob.validateUserForDataReadAPI;
        var paths = ob.paths;

        switch (paths[3]) {
        case 'download_stacktrace':
            validate(obParams, function(params) {
                if (!params.qstring.crash_id) {
                    common.returnMessage(params, 400, 'Please provide crash_id parameter');
                    return;
                }
                var id = params.qstring.crash_id + "";
                common.db.collection('app_crashes' + params.qstring.app_id).findOne({'_id': common.db.ObjectID(id)}, {fields: {error: 1}}, function(err, crash) {
                    if (err || !crash) {
                        common.returnMessage(params, 400, 'Crash not found');
                        return;
                    }
                    if (!crash.error) {
                        common.returnMessage(params, 400, 'Crash does not have stacktrace');
                        return;
                    }
                    if (params.res.writeHead) {
                        params.res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': crash.error.length,
                            'Content-Disposition': "attachment;filename=" + params.qstring.crash_id + "_stacktrace.txt"
                        });
                        params.res.write(crash.error);
                        params.res.end();
                    }
                });
            });
            break;
        case 'download_binary':
            validate(obParams, function(params) {
                if (!params.qstring.crash_id) {
                    common.returnMessage(params, 400, 'Please provide crash_id parameter');
                    return;
                }
                var id = params.qstring.crash_id + "";
                common.db.collection('app_crashes' + params.qstring.app_id).findOne({'_id': common.db.ObjectID(id)}, {fields: {binary_crash_dump: 1}}, function(err, crash) {
                    if (err || !crash) {
                        common.returnMessage(params, 400, 'Crash not found');
                        return;
                    }
                    if (!crash.binary_crash_dump) {
                        common.returnMessage(params, 400, 'Crash does not have binary_dump');
                        return;
                    }
                    if (params.res.writeHead) {
                        var buf = Buffer.from(crash.binary_crash_dump, 'base64');
                        params.res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': buf.byteLength,
                            'Content-Disposition': "attachment;filename=" + params.qstring.crash_id + "_bin.dmp"
                        });
                        let stream = new Duplex();
                        stream.push(buf);
                        stream.push(null);
                        stream.pipe(params.res);
                    }
                });
            });
            break;
        default:
            common.returnMessage(obParams, 400, 'Invalid path');
            break;
        }
        return true;
    });

    //manipulating crashes
    plugins.register("/i/crashes", function(ob) {
        var obParams = ob.params;
        var validate = ob.validateUserForDataWriteAPI;
        var paths = ob.paths;
        if (obParams.qstring.args) {
            try {
                obParams.qstring.args = JSON.parse(obParams.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse ' + obParams.apiPath + ' JSON failed');
            }
        }

        switch (paths[3]) {
        case 'resolve':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        var ret = {};
                        async.each(groups, function(group, done) {
                            ret[group._id] = group.latest_version;
                            if (!group.is_resolved) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id}, {"$set": {is_resolved: true, resolved_version: group.latest_version, is_renewed: false, is_new: false, is_resolving: false}}, function() {
                                    if (!inc.resolved) {
                                        inc.resolved = 0;
                                    }
                                    inc.resolved++;

                                    if (group.is_renewed) {
                                        if (!inc.reoccurred) {
                                            inc.reoccurred = 0;
                                        }
                                        inc.reoccurred--;
                                    }
                                    if (group.is_new) {
                                        if (!inc.isnew) {
                                            inc.isnew = 0;
                                        }
                                        inc.isnew--;
                                    }
                                    plugins.dispatch("/systemlogs", {params: params, action: "crash_resolved", data: {app_id: params.qstring.app_id, crash_id: group._id}});
                                    done();
                                    return true;
                                });
                            }
                            else {
                                done();
                            }
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnOutput(params, ret);
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'unresolve':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        async.each(groups, function(group, done) {
                            common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id }, {"$set": {is_resolved: false, resolved_version: null, is_resolving: false}}, function() {
                                if (group.is_resolved) {
                                    if (!inc.resolved) {
                                        inc.resolved = 0;
                                    }
                                    inc.resolved--;
                                    plugins.dispatch("/systemlogs", {params: params, action: "crash_unresolved", data: {app_id: params.qstring.app_id, crash_id: group._id}});
                                }
                                done();
                                return true;
                            });
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnMessage(params, 200, 'Success');
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'view':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        async.each(groups, function(group, done) {
                            if (group.is_new) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id }, {"$set": {is_new: false}}, function() {
                                    if (!inc.isnew) {
                                        inc.isnew = 0;
                                    }
                                    inc.isnew--;
                                    done();
                                    return true;
                                });
                            }
                            else {
                                done();
                            }
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnMessage(params, 200, 'Success');
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'share':
            validate(obParams, function(params) {
                var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id + "").digest('hex');
                common.db.collection('crash_share').insert({_id: id, app_id: params.qstring.app_id + "", crash_id: params.qstring.args.crash_id + ""}, function() {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {is_public: true}}, function() {});
                    plugins.dispatch("/systemlogs", {params: params, action: "crash_shared", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'unshare':
            validate(obParams, function(params) {
                var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id + "").digest('hex');
                common.db.collection('crash_share').remove({'_id': id }, function() {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {is_public: false}}, function() {});
                    plugins.dispatch("/systemlogs", {params: params, action: "crash_unshared", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'modify_share':
            validate(obParams, function(params) {
                if (params.qstring.args.data) {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {share: params.qstring.args.data}}, function() {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_modify_share", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id, data: params.qstring.args.data}});
                        common.returnMessage(params, 200, 'Success');
                        return true;
                    });
                }
                else {
                    common.returnMessage(params, 400, 'No data to save');
                }
            });
            break;
        case 'hide':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_hidden: true}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_hidden", data: {app_id: params.qstring.app_id, crash_id: crashes[i]}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'show':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_hidden: false}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_shown", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'resolving':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_resolving: true}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_shown", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'add_comment':
            ob.validateUserForWriteAPI(function() {
                var comment = {};
                if (obParams.qstring.args.time) {
                    comment.time = obParams.qstring.args.time;
                }
                else {
                    comment.time = new Date().getTime();
                }

                if (obParams.qstring.args.text) {
                    comment.text = obParams.qstring.args.text;
                }
                else {
                    comment.text = "";
                }

                comment.author = obParams.member.full_name;
                comment.author_id = obParams.member._id + "";
                comment._id = common.crypto.createHash('sha1').update(obParams.qstring.args.app_id + obParams.qstring.args.crash_id + JSON.stringify(comment) + "").digest('hex');
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id }, {"$push": {'comments': comment}}, function() {
                    plugins.dispatch("/systemlogs", {params: obParams, action: "crash_added_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, comment: comment}});
                    common.returnMessage(obParams, 200, 'Success');
                    return true;
                });
            }, obParams);
            break;
        case 'edit_comment':
            ob.validateUserForWriteAPI(function() {
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).findOne({'_id': obParams.qstring.args.crash_id }, function(err, crash) {
                    var comment;
                    if (crash && crash.comments) {
                        for (var i = 0; i < crash.comments.length; i++) {
                            if (crash.comments[i]._id === obParams.qstring.args.comment_id) {
                                comment = crash.comments[i];
                                break;
                            }
                        }
                    }
                    if (comment && (comment.author_id === obParams.member._id + "" || obParams.member.global_admin)) {
                        var commentBefore = JSON.parse(JSON.stringify(comment));
                        if (obParams.qstring.args.time) {
                            comment.edit_time = obParams.qstring.args.time;
                        }
                        else {
                            comment.edit_time = new Date().getTime();
                        }

                        if (obParams.qstring.args.text) {
                            comment.text = obParams.qstring.args.text;
                        }

                        common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id, "comments._id": obParams.qstring.args.comment_id}, {$set: {"comments.$": comment}}, function() {
                            plugins.dispatch("/systemlogs", {params: obParams, action: "crash_edited_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, _id: obParams.qstring.args.comment_id, before: commentBefore, update: comment}});
                            common.returnMessage(obParams, 200, 'Success');
                            return true;
                        });
                    }
                    else {
                        common.returnMessage(obParams, 200, 'Success');
                        return true;
                    }
                });
            }, obParams);
            break;
        case 'delete_comment':
            ob.validateUserForWriteAPI(function() {
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).findOne({'_id': obParams.qstring.args.crash_id }, function(err, crash) {
                    var comment;
                    if (crash && crash.comments) {
                        for (var i = 0; i < crash.comments.length; i++) {
                            if (crash.comments[i]._id === obParams.qstring.args.comment_id) {
                                comment = crash.comments[i];
                                break;
                            }
                        }
                    }
                    if (comment && (comment.author_id === obParams.member._id + "" || obParams.member.global_admin)) {
                        common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id }, { $pull: { comments: { _id: obParams.qstring.args.comment_id } } }, function() {
                            plugins.dispatch("/systemlogs", {params: obParams, action: "crash_deleted_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, comment: comment}});
                            common.returnMessage(obParams, 200, 'Success');
                            return true;
                        });
                    }
                    else {
                        common.returnMessage(obParams, 200, 'Success');
                        return true;
                    }
                });
            }, obParams);
            break;
        case 'delete':
            validate(obParams, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(err, groups) {
                    if (groups) {
                        var inc = {};
                        async.each(groups, function(group, done) {
                            group.app_id = params.qstring.app_id;
                            plugins.dispatch("/systemlogs", {params: params, action: "crash_deleted", data: group});
                            common.db.collection('app_crashes' + params.qstring.app_id).remove({'group': {$in: group.groups} }, function() {});
                            common.db.collection('app_crashgroups' + params.qstring.app_id).remove({'_id': group._id }, function() {});
                            if (common.drillDb) {
                                common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + params.qstring.app_id).digest('hex')).remove({"sg.crash": group._id}, function() {});
                            }
                            var id = common.crypto.createHash('sha1').update(params.qstring.app_id + group._id + "").digest('hex');
                            common.db.collection('crash_share').remove({'_id': id }, function() {});
                            common.db.collection('app_crashusers' + params.qstring.app_id).find({"group": {$in: group.groups}}, {reports: 1, uid: 1, _id: 0}).toArray(function(crashUsersErr, users) {
                                var uids = [];
                                for (let i = 0; i < users.length; i++) {
                                    if (users[i].reports > 0) {
                                        uids.push(users[i].uid);
                                    }
                                }
                                common.db.collection('app_crashusers' + params.qstring.app_id).remove({"group": {$in: group.groups}}, function() {});
                                var mod = {crashes: -1};
                                if (!group.nonfatal) {
                                    mod.fatal = -1;
                                }
                                common.db.collection('app_crashusers' + params.qstring.app_id).update({"group": 0, uid: {$in: uids}}, {$inc: mod}, {multi: true}, function() {
                                    if (!inc.crashes) {
                                        inc.crashes = 0;
                                    }
                                    inc.crashes--;

                                    if (group.nonfatal) {
                                        if (!inc.nonfatal) {
                                            inc.nonfatal = 0;
                                        }
                                        inc.nonfatal -= group.reports;
                                    }
                                    else {
                                        if (!inc.fatal) {
                                            inc.fatal = 0;
                                        }
                                        inc.fatal -= group.reports;
                                    }

                                    if (group.is_new) {
                                        if (!inc.isnew) {
                                            inc.isnew = 0;
                                        }
                                        inc.isnew--;
                                    }

                                    if (group.is_resolved) {
                                        if (!inc.resolved) {
                                            inc.resolved = 0;
                                        }
                                        inc.resolved--;
                                    }

                                    if (group.loss) {
                                        if (!inc.loss) {
                                            inc.loss = 0;
                                        }
                                        inc.loss -= group.loss;
                                    }

                                    if (group.reports) {
                                        if (!inc.reports) {
                                            inc.reports = 0;
                                        }
                                        inc.reports -= group.reports;
                                    }

                                    if (group.is_renewed) {
                                        if (!inc.reoccurred) {
                                            inc.reoccurred = 0;
                                        }
                                        inc.reoccurred--;
                                    }

                                    if (group.os) {
                                        if (!inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")]) {
                                            inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")] = 0;
                                        }
                                        inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")] -= group.reports;
                                    }

                                    if (group.app_version) {
                                        for (let i in group.app_version) {
                                            if (!inc["app_version." + i]) {
                                                inc["app_version." + i] = 0;
                                            }
                                            inc["app_version." + i] -= group.app_version[i];
                                        }
                                    }
                                    done();
                                });
                            });
                        }, function() {
                            //recalculate users
                            common.db.collection('app_crashusers' + params.qstring.app_id).find({"group": 0, crashes: { $gt: 0 }}).count(function(crashUsersErr, userCount) {
                                common.db.collection('app_crashusers' + params.qstring.app_id).find({"group": 0, crashes: { $gt: 0 }, fatal: { $gt: 0 }}).count(function(crashGroupsErr, fatalCount) {
                                    var update = {};
                                    update.$set = {};
                                    update.$set.users = userCount;
                                    update.$set.usersfatal = fatalCount;
                                    if (Object.keys(inc).length) {
                                        update.$inc = inc;
                                    }
                                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, update, function() {});
                                    common.returnMessage(params, 200, 'Success');
                                });
                            });
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        default:
            common.returnMessage(obParams, 400, 'Invalid path');
            break;
        }
        return true;
    });

    plugins.register("/i/apps/create", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashgroups' + appId).insert({_id: "meta"}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {background: true, unique: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {unique: true, background: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        common.db.collection('app_crashes' + appId).ensureIndex({"group": 1}, {background: true}, function() {});
        common.db.collection('app_crashes' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        common.db.collection('app_crashes' + appId).ensureIndex({"name": "text"}, { background: true }, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashgroups' + appId).drop(function() {});
        common.db.collection('app_crashusers' + appId).drop(function() {});
        common.db.collection('app_crashes' + appId).drop(function() {});
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('crashdata').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
        common.db.collection('app_crashes' + appId).remove({ts: {$lt: ob.moment.unix()}}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
        }
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashes' + appId).drop(function() {
            common.db.collection('app_crashes' + appId).ensureIndex({"group": 1}, {background: true}, function() {});
            common.db.collection('app_crashes' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
            common.db.collection('app_crashes' + appId).ensureIndex({"name": "text"}, { background: true }, function() {});
        });
        common.db.collection('app_crashusers' + appId).drop(function() {
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {unique: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        });
        common.db.collection('app_crashgroups' + appId).drop(function() {
            common.db.collection('app_crashgroups' + appId).insert({_id: "meta"}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {unique: true, background: true}, function() {});
        });
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashes' + appId).drop(function() {
            common.db.collection('app_crashes' + appId).ensureIndex({"group": 1}, {background: true}, function() {});
            common.db.collection('app_crashes' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
            common.db.collection('app_crashes' + appId).ensureIndex({"name": "text"}, { background: true }, function() {});
        });
        common.db.collection('app_crashusers' + appId).drop(function() {
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {unique: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        });
        common.db.collection('app_crashgroups' + appId).drop(function() {
            common.db.collection('app_crashgroups' + appId).insert({_id: "meta"}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {unique: true, background: true}, function() {});
        });
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
        }
    });
}(plugin));

module.exports = plugin;