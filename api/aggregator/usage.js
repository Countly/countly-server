var usage = {};
var common = require('./../utils/common.js');
var plugins = require('./../../plugins/pluginManager.js');
var async = require('async');
var crypto = require('crypto');
var moment = require('moment-timezone');


usage.processSessionDurationRange = async function(writeBatcher, token, totalSessionDuration, did, params) {
    var durationRanges = [
            [0, 10],
            [11, 30],
            [31, 60],
            [61, 180],
            [181, 600],
            [601, 1800],
            [1801, 3600]
        ],
        durationMax = 3601,
        calculatedDurationRange,
        updateUsers = {},
        updateUsersZero = {},
        dbDateIds = common.getDateIds(params),
        monthObjUpdate = [];

    if (totalSessionDuration >= durationMax) {
        calculatedDurationRange = (durationRanges.length) + '';
    }
    else {
        for (var i = 0; i < durationRanges.length; i++) {
            if (totalSessionDuration <= durationRanges[i][1] && totalSessionDuration >= durationRanges[i][0]) {
                calculatedDurationRange = i + '';
                break;
            }
        }
    }
    if (totalSessionDuration > 0) {
        common.fillTimeObjectMonth(params, updateUsers, common.dbMap.duration, totalSessionDuration);
    }
    monthObjUpdate.push(common.dbMap.durations + '.' + calculatedDurationRange);
    common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
    common.fillTimeObjectZero(params, updateUsersZero, common.dbMap.durations + '.' + calculatedDurationRange);
    var postfix = common.crypto.createHash("md5").update(did).digest('base64')[0];
    writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
    var update = {
        '$inc': updateUsersZero,
        '$set': {}
    };
    update.$set['meta_v2.d-ranges.' + calculatedDurationRange] = true;
    writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, update, "countly", {token: token});
};

usage.processSessionFromStream = async function(token, currEvent, params) {
    currEvent.up = currEvent.up || {};
    var updateUsersZero = {},
        updateUsersMonth = {},
        usersMeta = {},
        sessionFrequency = [
            [0, 24],
            [24, 48],
            [48, 72],
            [72, 96],
            [96, 120],
            [120, 144],
            [144, 168],
            [168, 192],
            [192, 360],
            [360, 744]
        ],
        sessionFrequencyMax = 744,
        calculatedFrequency,
        uniqueLevels = [],
        uniqueLevelsZero = [],
        uniqueLevelsMonth = [],
        zeroObjUpdate = [],
        monthObjUpdate = [],
        dbDateIds = common.getDateIds(params);

    monthObjUpdate.push(common.dbMap.total);
    if (currEvent.up.cc) {
        monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.total);
    }
    if (currEvent.sg && currEvent.sg.prev_session) {
        //user had session before
        if (currEvent.sg.prev_start) {
            var userLastSeenTimestamp = currEvent.sg.prev_start,
                currDate = common.getDate(currEvent.ts, params.appTimezone),
                userLastSeenDate = common.getDate(userLastSeenTimestamp, params.appTimezone),
                secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                secInYear = (60 * 60 * 24 * (common.getDOY(currEvent.ts, params.appTimezone) - 1)) + secInHour;

            /* if (dbAppUser.cc !== params.user.country) {
            monthObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
            zeroObjUpdate.push(params.user.country + '.' + common.dbMap.unique);
        }*/

            // Calculate the frequency range of the user
            var ts_sec = currEvent.ts / 1000;
            if ((ts_sec - userLastSeenTimestamp) >= (sessionFrequencyMax * 60 * 60)) {
                calculatedFrequency = sessionFrequency.length + '';
            }
            else {
                for (let i = 0; i < sessionFrequency.length; i++) {
                    if ((ts_sec - userLastSeenTimestamp) < (sessionFrequency[i][1] * 60 * 60) &&
                        (ts_sec - userLastSeenTimestamp) >= (sessionFrequency[i][0] * 60 * 60)) {
                        calculatedFrequency = (i + 1) + '';
                        break;
                    }
                }
            }

            //if for some reason we received past data lesser than last session timestamp
            //we can't calculate frequency for that part
            if (typeof calculatedFrequency !== "undefined") {
                zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
                monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
                usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
            }

            if (userLastSeenTimestamp < (ts_sec - secInMin)) {
            // We don't need to put hourly fragment to the unique levels array since
            // we will store hourly data only in sessions collection
                updateUsersMonth['d.' + params.time.day + '.' + params.time.hour + '.' + common.dbMap.unique] = 1;
            }

            if (userLastSeenTimestamp < (ts_sec - secInHour)) {
                uniqueLevels[uniqueLevels.length] = params.time.daily;
                uniqueLevelsMonth.push(params.time.day);
            }

            if ((userLastSeenDate.year() + "") === (params.time.yearly + "") &&
                Math.ceil(userLastSeenDate.format("DDD") / 7) < params.time.weekly) {
                uniqueLevels[uniqueLevels.length] = params.time.yearly + ".w" + params.time.weekly;
                uniqueLevelsZero.push("w" + params.time.weekly);
            }

            if (userLastSeenTimestamp < (ts_sec - secInMonth)) {
                uniqueLevels[uniqueLevels.length] = params.time.monthly;
                uniqueLevelsZero.push(params.time.month);
            }

            if (userLastSeenTimestamp < (ts_sec - secInYear)) {
                uniqueLevels[uniqueLevels.length] = params.time.yearly;
                uniqueLevelsZero.push("Y");
            }
        }
    }
    else {
        zeroObjUpdate.push(common.dbMap.unique);
        monthObjUpdate.push(common.dbMap.new);
        monthObjUpdate.push(common.dbMap.unique);
        if (currEvent.up.cc) {
            zeroObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.unique);
            monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.new);
            monthObjUpdate.push(currEvent.up.cc + '.' + common.dbMap.unique);
        }

        // First time user.
        calculatedFrequency = '0';

        zeroObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);
        monthObjUpdate.push(common.dbMap.frequency + '.' + calculatedFrequency);

        usersMeta['meta_v2.f-ranges.' + calculatedFrequency] = true;
        //this was first session for this user
    }
    usersMeta['meta_v2.countries.' + (currEvent.up.cc || "Unknown")] = true;
    common.fillTimeObjectZero(params, updateUsersZero, zeroObjUpdate);
    common.fillTimeObjectMonth(params, updateUsersMonth, monthObjUpdate);

    var postfix = common.crypto.createHash("md5").update(currEvent.did).digest('base64')[0];
    if (Object.keys(updateUsersZero).length || Object.keys(usersMeta).length) {
        usersMeta.m = dbDateIds.zero;
        usersMeta.a = params.app_id + "";
        var updateObjZero = {$set: usersMeta};

        if (Object.keys(updateUsersZero).length) {
            updateObjZero.$inc = updateUsersZero;
        }
        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.zero + "_" + postfix, updateObjZero, "countly", {token: token});
    }
    if (Object.keys(updateUsersMonth).length) {
        common.writeBatcher.add("users", params.app_id + "_" + dbDateIds.month + "_" + postfix, {
            $set: {
                m: dbDateIds.month,
                a: params.app_id + ""
            },
            '$inc': updateUsersMonth
        }, "countly", {token: token});
    }
    usage.processSessionMetricsFromStream(currEvent, uniqueLevelsZero, uniqueLevelsMonth, params);
};

usage.processEventTotalsFromAggregation = async function(token, currEventArray, writeBatcher) {
    var rootUpdate = {};
    for (var z = 0; z < currEventArray.length; z++) {
        var eventColl = await common.readBatcher.getOne("events", common.db.ObjectID(currEventArray[z].a), {"transformation": "event_object"});
        var appData = await common.readBatcher.getOne("apps", common.db.ObjectID(currEventArray[z].a), {timezone: 1, plugins: 1});
        var conff = plugins.getConfig("api", appData.plugins, true);
        //Get timezone offset in hours from timezone name
        var appTimezone = appData.timezone || "UTC";

        var d = moment();
        if (appTimezone) {
            d.tz(appTimezone);
        }
        var tmpEventObj = {};
        var tmpTotalObj = {};

        var shortEventName = currEventArray[z].e;
        eventColl = eventColl || {};
        if (!eventColl._list || eventColl._list[shortEventName] !== true) {
            eventColl._list = eventColl._list || {};
            eventColl._list_length = eventColl._list_length || 0;
            if (eventColl._list_length <= conff.event_limit) {
                eventColl._list[shortEventName] = true;
                eventColl._list_length++;
                rootUpdate.$addToSet = {list: shortEventName};
            }
            else {
                return; //do not record this event in aggregated data
            }
        }
        var eventCollectionName = crypto.createHash('sha1').update(shortEventName + currEventArray[z].a).digest('hex');
        common.shiftHourlyData(currEventArray[z], Math.floor(d.utcOffset() / 60), "h");
        var date = currEventArray[z].h.split(":");
        var timeObj = {"yearly": date[0], "weekly": 1, "monthly": date[1], "month": date[1], "day": date[2], "hour": date[3]};
        if (currEventArray[z].s && common.isNumber(currEventArray[z].s)) {
            common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.sum, currEventArray[z].s);
            common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEventArray[z].s);
        }
        else {
            currEventArray[z].s = 0;
        }
        if (currEventArray[z].dur && common.isNumber(currEventArray[z].dur)) {
            common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.dur, currEventArray[z].dur);
            common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEventArray[z].dur);
        }
        else {
            currEventArray[z].dur = 0;
        }
        currEventArray[z].c = currEventArray[z].c || 1;
        if (currEventArray[z].c && common.isNumber(currEventArray[z].c)) {
            currEventArray[z].c = parseInt(currEventArray[z].c, 10);
        }

        common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.count, currEventArray[z].c);
        common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.count, currEventArray[z].c);

        var postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];
        var dateIds = common.getDateIds({"time": timeObj});

        var _id = currEventArray[z].a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
        //Current event
        writeBatcher.add("events_data", _id, {
            "$set": {
                "m": dateIds.month,
                "s": "no-segment",
                "a": currEventArray[z].a + "",
                "e": shortEventName
            },
            "$inc": tmpEventObj
        }, "countly");

        //Total event
        writeBatcher.add("events_data", currEventArray[z].a + "_all_key_" + dateIds.month + "_" + postfix2, {
            "$set": {
                "m": dateIds.month,
                "s": "key",
                "a": currEventArray[z].a + "",
                "e": "all"
            },
            "$inc": tmpTotalObj
        }, "countly");

        //Meta document for all events:
        writeBatcher.add("events_data", currEventArray[z].a + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
            $set: {
                m: dateIds.zero,
                s: "no-segment",
                a: currEventArray[z].a + "",
                e: "all",
                ["meta_v2.key." + shortEventName]: true,
                "meta_v2.segments.key": true

            }
        }, "countly",
        {token: token});
        if (Object.keys(rootUpdate).length) {
            await common.db.collection("events").updateOne({_id: common.db.ObjectID(currEventArray[z].a)}, rootUpdate, {upsert: true});
        }
    }
};


usage.processEventTotalsFromStream = async function(token, currEvent, writeBatcher) {
    var rootUpdate = {};
    var eventColl = await common.readBatcher.getOne("events", common.db.ObjectID(currEvent.a), {"transformation": "event_object"});
    var appData = await common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a), {timezone: 1, plugins: 1});
    var conff = plugins.getConfig("api", appData.plugins, true);
    //Get timezone offset in hours from timezone name
    var appTimezone = appData.timezone || "UTC";

    var tmpEventObj = {};
    var tmpTotalObj = {};

    var shortEventName = currEvent.e;
    eventColl = eventColl || {};
    if (!eventColl._list || eventColl._list[shortEventName] !== true) {
        eventColl._list = eventColl._list || {};
        eventColl._list_length = eventColl._list_length || 0;
        if (eventColl._list_length <= conff.event_limit) {
            eventColl._list[shortEventName] = true;
            eventColl._list_length++;
            rootUpdate.$addToSet = {list: shortEventName};
        }
        else {
            return; //do not record this event in aggregated data
        }
    }
    var eventCollectionName = crypto.createHash('sha1').update(shortEventName + currEvent.a).digest('hex');
    //Calculate h based on ts and app timezone
    currEvent.h = common.getDate(currEvent.ts, appTimezone);
    currEvent.h = currEvent.h.format("YYYY:MM:DD:HH");
    currEvent.h = currEvent.h.replaceAll(":0", ":");
    var date = currEvent.h.split(":");
    var timeObj = {"yearly": date[0], "weekly": 1, "monthly": date[1], "month": date[1], "day": date[2], "hour": date[3]};
    if (currEvent.s && common.isNumber(currEvent.s)) {
        common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.sum, currEvent.s);
        common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEvent.s);
    }
    else {
        currEvent.s = 0;
    }
    if (currEvent.dur && common.isNumber(currEvent.dur)) {
        common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.dur, currEvent.dur);
        common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEvent.dur);
    }
    else {
        currEvent.dur = 0;
    }
    currEvent.c = currEvent.c || 1;
    if (currEvent.c && common.isNumber(currEvent.c)) {
        currEvent.c = parseInt(currEvent.c, 10);
    }

    common.fillTimeObjectMonth({"time": timeObj}, tmpEventObj, common.dbMap.count, currEvent.c);
    common.fillTimeObjectMonth({"time": timeObj}, tmpTotalObj, shortEventName + '.' + common.dbMap.count, currEvent.c);

    var postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];
    var dateIds = common.getDateIds({"time": timeObj});

    var _id = currEvent.a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
    //Current event
    writeBatcher.add("events_data", _id, {
        "$set": {
            "m": dateIds.month,
            "s": "no-segment",
            "a": currEvent.a + "",
            "e": shortEventName
        },
        "$inc": tmpEventObj
    }, "countly");

    //Total event
    writeBatcher.add("events_data", currEvent.a + "_all_key_" + dateIds.month + "_" + postfix2, {
        "$set": {
            "m": dateIds.month,
            "s": "key",
            "a": currEvent.a + "",
            "e": "all"
        },
        "$inc": tmpTotalObj
    }, "countly");

    //Meta document for all events:
    writeBatcher.add("events_data", currEvent.a + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
        $set: {
            m: dateIds.zero,
            s: "no-segment",
            a: currEvent.a + "",
            e: "all",
            ["meta_v2.key." + shortEventName]: true,
            "meta_v2.segments.key": true

        }
    }, "countly",
    {token: token});
    if (Object.keys(rootUpdate).length) {
        await common.db.collection("events").updateOne({_id: common.db.ObjectID(currEvent.a)}, rootUpdate, {upsert: true});
    }


};


usage.processEventFromStream = function(token, currEvent, writeBatcher) {
    writeBatcher = writeBatcher || common.writeBatcher;
    var forbiddenSegValues = [];
    for (let i = 1; i < 32; i++) {
        forbiddenSegValues.push(i + "");
    }

    //Write event totals for aggregated Data

    common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a), function(err, app) {
        if (err || !app) {
            return;
        }
        else {
            common.readBatcher.getOne("events", common.db.ObjectID(currEvent.a), {"transformation": "event_object"}, async function(err2, eventColl) {
                var tmpEventObj = {};
                var tmpEventColl = {};
                var tmpTotalObj = {};
                var pluginsGetConfig = plugins.getConfig("api", app.plugins, true);

                var time = common.initTimeObj(app.timezone, currEvent.ts);
                var params = {time: time, app_id: currEvent.a, app: app, appTimezone: app.timezone || "UTC"};

                var shortEventName = currEvent.n;
                if (currEvent.e !== "[CLY]_custom") {
                    shortEventName = currEvent.e;
                }
                var rootUpdate = {};
                eventColl = eventColl || {};
                if (!eventColl._list || eventColl._list[shortEventName] !== true) {
                    eventColl._list = eventColl._list || {};
                    eventColl._list_length = eventColl._list_length || 0;
                    if (eventColl._list_length <= 500) {
                        eventColl._list[shortEventName] = true;
                        eventColl._list_length++;
                        rootUpdate.$addToSet = {list: shortEventName};
                    }
                    else {
                        return; //do not record this event in aggregated data
                    }
                }
                eventColl._segments = eventColl._segments || {};
                var eventCollectionName = crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');
                var updates = [];

                if (currEvent.s && common.isNumber(currEvent.s)) {
                    common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.sum, currEvent.s);
                    common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEvent.s);
                }
                else {
                    currEvent.s = 0;
                }

                if (currEvent.dur && common.isNumber(currEvent.dur)) {
                    common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.dur, currEvent.dur);
                    common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEvent.dur);
                }
                else {
                    currEvent.dur = 0;
                }
                currEvent.c = currEvent.c || 1;
                if (currEvent.c && common.isNumber(currEvent.c)) {
                    currEvent.count = parseInt(currEvent.c, 10);
                }

                common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.count, currEvent.count);
                common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.count, currEvent.count);


                for (var seg in currEvent.sg) {
                    if (forbiddenSegValues.indexOf(currEvent.sg[seg] + "") !== -1) {
                        continue;
                    }
                    if (eventColl._omitted_segments && eventColl._omitted_segments[shortEventName]) {
                        if (eventColl._omitted_segments[shortEventName][seg]) {
                            continue;
                        }
                    }
                    if (eventColl._whitelisted_segments && eventColl._whitelisted_segments[shortEventName]) {
                        if (!eventColl._whitelisted_segments[shortEventName][seg]) {
                            continue;
                        }
                    }
                    if (Array.isArray(currEvent.sg[seg])) {
                        continue; //Skipping arrays 
                    }

                    //Segment is not registred in meta.
                    if (!eventColl._segments[shortEventName] || !eventColl._segments[shortEventName]._list[seg]) {
                        eventColl._segments[shortEventName] = eventColl._segments[shortEventName] || {_list: {}, _list_length: 0};
                        eventColl._segments[shortEventName]._list[seg] = true;
                        rootUpdate.$addToSet = rootUpdate.$addToSet || {};
                        if (rootUpdate.$addToSet["segments." + shortEventName]) {
                            if (rootUpdate.$addToSet["segments." + shortEventName].$each) {
                                rootUpdate.$addToSet["segments." + shortEventName].$each.push(seg);
                            }
                            else {
                                rootUpdate.$addToSet["segments." + shortEventName] = {$each: [rootUpdate.$addToSet["segments." + shortEventName], seg]};
                            }
                        }
                        else {
                            rootUpdate.$addToSet["segments." + shortEventName] = seg;
                        }
                    }

                    //load meta for this segment in cacher. Add new value if needed

                    var tmpSegVal = currEvent.sg[seg] + "";
                    tmpSegVal = tmpSegVal.replace(/^\$+/, "").replace(/\./g, ":");
                    tmpSegVal = common.encodeCharacters(tmpSegVal);

                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = "[CLY]" + tmpSegVal;
                    }

                    var postfix_seg = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];
                    var meta = await common.readBatcher.getOne("events_meta", {"_id": eventCollectionName + "no-segment_" + common.getDateIds(params).zero + "_" + postfix_seg});

                    if (pluginsGetConfig.event_segmentation_value_limit && meta.meta_v2 &&
                        meta.meta_v2[seg] &&
                        meta.meta_v2[seg].indexOf(tmpSegVal) === -1 &&
                        meta.meta_v2[seg].length >= pluginsGetConfig.event_segmentation_value_limit) {
                        continue;
                    }

                    if (!meta.meta_v2 || !meta.meta_v2[seg] || meta.meta_v2[seg].indexOf(tmpSegVal) === -1) {
                        meta.meta_v2 = meta.meta_v2 || {};
                        meta.meta_v2[seg] = meta.meta_v2[seg] || [];
                        meta.meta_v2[seg].push(tmpSegVal);
                        updates.push({
                            id: currEvent.a + "_" + eventCollectionName + "_no-segment_" + common.getDateIds(params).zero + "_" + postfix_seg,
                            update: {"$set": {["meta_v2." + seg + "." + tmpSegVal]: true, ["meta_v2.segments." + seg]: true, "s": "no-segment", "e": shortEventName, "m": common.getDateIds(params).zero, "a": params.app_id + ""}}
                        });
                    }
                    //record data
                    var tmpObj = {};

                    if (currEvent.s) {
                        common.fillTimeObjectMonth(params, tmpObj, tmpSegVal + '.' + common.dbMap.sum, currEvent.s);
                    }

                    if (currEvent.dur) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.dur, currEvent.dur);
                    }

                    common.fillTimeObjectMonth(params, tmpObj, tmpSegVal + '.' + common.dbMap.count, currEvent.c);
                    updates.push({
                        id: currEvent.a + "_" + eventCollectionName + "_" + seg + "_" + common.getDateIds(params).month + "_" + postfix_seg,
                        update: {$inc: tmpObj, $set: {"s": seg, "e": shortEventName, m: common.getDateIds(params).month, a: params.app_id + ""}}
                    });
                }

                var dateIds = common.getDateIds(params);
                var postfix2 = common.crypto.createHash("md5").update(shortEventName).digest('base64')[0];

                tmpEventColl["no-segment" + "." + dateIds.month] = tmpEventObj;

                for (var z = 0; z < updates.length; z++) {
                    writeBatcher.add("events_data", updates[z].id, updates[z].update, "countly", {token: token});
                }
                //ID is - appID_hash_no-segment_month

                var _id = currEvent.a + "_" + eventCollectionName + "_no-segment_" + dateIds.month;
                //Current event
                writeBatcher.add("events_data", _id, {
                    "$set": {
                        "m": dateIds.month,
                        "s": "no-segment",
                        "a": params.app_id + "",
                        "e": shortEventName
                    },
                    "$inc": tmpEventObj
                }, "countly",
                {token: token});

                //Total event
                writeBatcher.add("events_data", currEvent.a + "_all_key_" + dateIds.month + "_" + postfix2, {
                    "$set": {
                        "m": dateIds.month,
                        "s": "key",
                        "a": params.app_id + "",
                        "e": "all"
                    },
                    "$inc": tmpTotalObj
                }, "countly",
                {token: token});

                //Meta document for all events:
                writeBatcher.add("events_data", params.app_id + "_all_" + "no-segment_" + dateIds.zero + "_" + postfix2, {
                    $set: {
                        m: dateIds.zero,
                        s: "no-segment",
                        a: params.app_id + "",
                        e: "all",
                        ["meta_v2.key." + shortEventName]: true,
                        "meta_v2.segments.key": true

                    }
                }, "countly",
                {token: token});
                //Total event meta data

                if (Object.keys(rootUpdate).length) {
                    common.db.collection("events").updateOne({_id: common.db.ObjectID(currEvent.a)}, rootUpdate, {upsert: true});
                }

            });
        }
    });
};


usage.processSessionMetricsFromStream = function(currEvent, uniqueLevelsZero, uniqueLevelsMonth, params) {
    /**
         * 
         * @param {string} id - document id 
         * @param {function} callback  - calback function
         */
    function fetchMeta(id, callback) {
        common.readBatcher.getOne(metaToFetch[id].coll, {'_id': metaToFetch[id].id}, {meta_v2: 1}, (err, metaDoc) => {
            var retObj = metaDoc || {};
            retObj.coll = metaToFetch[id].coll;
            callback(null, retObj);
        });
    }

    var isNewUser = true;
    var userProps = {};
    if (currEvent.sg && currEvent.sg.prev_session) {
        isNewUser = false;
        //Not a new user

    }
    //We can't do metric changes unless we fetch previous session doc.
    var predefinedMetrics = usage.getPredefinedMetrics(params, userProps);

    var dateIds = common.getDateIds(params);
    var metaToFetch = {};

    if ((plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit || 1000) > 0) {
        var postfix;
        for (let i = 0; i < predefinedMetrics.length; i++) {
            for (let j = 0; j < predefinedMetrics[i].metrics.length; j++) {
                let tmpMetric = predefinedMetrics[i].metrics[j],
                    recvMetricValue = currEvent.up[tmpMetric.short_code];
                postfix = null;

                // We check if country data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false)) {
                    continue;
                }
                // We check if city data logging is on and user's country is the configured country of the app
                if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false)) {
                    continue;
                }

                if (recvMetricValue) {
                    recvMetricValue = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                    postfix = common.crypto.createHash("md5").update(recvMetricValue).digest('base64')[0];
                    metaToFetch[predefinedMetrics[i].db + params.app_id + "_" + dateIds.zero + "_" + postfix] = {
                        coll: predefinedMetrics[i].db,
                        id: params.app_id + "_" + dateIds.zero + "_" + postfix
                    };
                }
            }
        }

        var metas = {};
        async.map(Object.keys(metaToFetch), fetchMeta, function(err, metaDocs) {
            for (let i = 0; i < metaDocs.length; i++) {
                if (metaDocs[i].coll && metaDocs[i].meta_v2) {
                    metas[metaDocs[i]._id] = metaDocs[i].meta_v2;
                }
            }

            for (let i = 0; i < predefinedMetrics.length; i++) {
                for (let j = 0; j < predefinedMetrics[i].metrics.length; j++) {
                    let tmpTimeObjZero = {},
                        tmpTimeObjMonth = {},
                        tmpSet = {},
                        needsUpdate = false,
                        zeroObjUpdate = [],
                        monthObjUpdate = [],
                        tmpMetric = predefinedMetrics[i].metrics[j],
                        recvMetricValue = "",
                        escapedMetricVal = "";

                    postfix = "";

                    recvMetricValue = currEvent.up[tmpMetric.short_code];

                    // We check if country data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name === "country" && (plugins.getConfig("api", params.app && params.app.plugins, true).country_data === false)) {
                        continue;
                    }
                    // We check if city data logging is on and user's country is the configured country of the app
                    if (tmpMetric.name === "city" && (plugins.getConfig("api", params.app && params.app.plugins, true).city_data === false)) {
                        continue;
                    }

                    if (recvMetricValue) {
                        escapedMetricVal = (recvMetricValue + "").replace(/^\$/, "").replace(/\./g, ":");
                        postfix = common.crypto.createHash("md5").update(escapedMetricVal).digest('base64')[0];

                        var tmpZeroId = params.app_id + "_" + dateIds.zero + "_" + postfix;
                        var ignore = false;
                        if (metas[tmpZeroId] &&
                                        metas[tmpZeroId][tmpMetric.set] &&
                                        Object.keys(metas[tmpZeroId][tmpMetric.set]).length &&
                                        Object.keys(metas[tmpZeroId][tmpMetric.set]).length >= plugins.getConfig("api", params.app && params.app.plugins, true).metric_limit &&
                                        typeof metas[tmpZeroId][tmpMetric.set][escapedMetricVal] === "undefined") {
                            ignore = true;
                        }

                        //should metric be ignored for reaching the limit
                        if (!ignore) {
                            //making sure metrics are strings
                            needsUpdate = true;
                            tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;

                            monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.total);

                            if (isNewUser) {
                                zeroObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.new);
                                monthObjUpdate.push(escapedMetricVal + '.' + common.dbMap.unique);
                            }
                            else {
                                for (let k = 0; k < uniqueLevelsZero.length; k++) {
                                    if (uniqueLevelsZero[k] === "Y") {
                                        tmpTimeObjZero['d.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                    }
                                    else {
                                        tmpTimeObjZero['d.' + uniqueLevelsZero[k] + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                    }
                                }

                                for (let l = 0; l < uniqueLevelsMonth.length; l++) {
                                    tmpTimeObjMonth['d.' + uniqueLevelsMonth[l] + '.' + escapedMetricVal + '.' + common.dbMap.unique] = 1;
                                }
                            }
                        }

                        common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
                        common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate);

                        if (needsUpdate) {
                            tmpSet.m = dateIds.zero;
                            tmpSet.a = params.app_id + "";
                            var tmpMonthId = params.app_id + "_" + dateIds.month + "_" + postfix,
                                updateObjZero = {$set: tmpSet};

                            if (Object.keys(tmpTimeObjZero).length) {
                                updateObjZero.$inc = tmpTimeObjZero;
                            }

                            if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                                common.writeBatcher.add(predefinedMetrics[i].db, tmpZeroId, updateObjZero);
                            }

                            common.writeBatcher.add(predefinedMetrics[i].db, tmpMonthId, {
                                $set: {
                                    m: dateIds.month,
                                    a: params.app_id + ""
                                },
                                '$inc': tmpTimeObjMonth
                            });
                        }
                    }
                }
            }
        });
    }
};


usage.getPredefinedMetrics = function(params, userProps) {
    var predefinedMetrics = [
        {
            db: "carriers",
            metrics: [{
                name: "_carrier",
                set: "carriers",
                short_code: common.dbUserMap.carrier
            }]
        },
        {
            db: "devices",
            metrics: [
                {
                    name: "_device",
                    set: "devices",
                    short_code: common.dbUserMap.device
                },
                {
                    name: "_manufacturer",
                    set: "manufacturers",
                    short_code: common.dbUserMap.manufacturer
                }
            ]
        },
        {
            db: "device_details",
            metrics: [
                {
                    name: "_app_version",
                    set: "app_versions",
                    short_code: common.dbUserMap.app_version
                },
                {
                    name: "_os",
                    set: "os",
                    short_code: common.dbUserMap.platform
                },
                {
                    name: "_device_type",
                    set: "device_type",
                    short_code: common.dbUserMap.device_type
                },
                {
                    name: "_os_version",
                    set: "os_versions",
                    short_code: common.dbUserMap.platform_version
                },
                {
                    name: "_resolution",
                    set: "resolutions",
                    short_code: common.dbUserMap.resolution
                },
                {
                    name: "_has_hinge",
                    set: "has_hinge",
                    short_code: common.dbUserMap.has_hinge
                }
            ]
        },
        {
            db: "cities",
            metrics: [{
                is_user_prop: true,
                name: "city",
                set: "cities",
                short_code: common.dbUserMap.city
            }]
        }
    ];
    var isNewUser = (params.app_user && params.app_user[common.dbUserMap.first_seen]) ? false : true;
    plugins.dispatch("/session/metrics", {
        params: params,
        predefinedMetrics: predefinedMetrics,
        userProps: userProps,
        user: params.app_user,
        isNewUser: isNewUser
    });

    return predefinedMetrics;
};

module.exports = usage;