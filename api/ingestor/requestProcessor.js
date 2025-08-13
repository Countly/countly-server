const usage = require('./usage.js'); //special usage file for ingestor
const common = require('../utils/common.js');
const url = require('url');
const plugins = require("../../plugins/pluginManager.js");
const log = require('../utils/log.js')('core:ingestor');
const crypto = require('crypto');
const { ignorePossibleDevices, checksumSaltVerification, validateRedirect} = require('../utils/requestProcessorCommon.js');
const {ObjectId} = require("mongodb");
const { Readable } = require('stream');
const {preset} = require('../lib/countly.preset.js');
const countlyApi = {
    mgmt: {
        appUsers: require('../parts/mgmt/app_users.js'),
    }
};

const escapedViewSegments = { "name": true, "segment": true, "height": true, "width": true, "y": true, "x": true, "visit": true, "uvc": true, "start": true, "bounce": true, "exit": true, "type": true, "view": true, "domain": true, "dur": true, "_id": true, "_idv": true, "utm_source": true, "utm_medium": true, "utm_campaign": true, "utm_term": true, "utm_content": true, "referrer": true};

// Initialize ClickHouse client
try {
    const clickhouseClientSingleton = require('../../plugins/clickhouse/api/ClickhouseClient');
}
catch (ee) {
    log.e('ClickHouse client initialization failed:', ee);
}
let clickhouseClient = null;

/**
 * Initialize ClickHouse client asynchronously
 */
async function initializeClickhouseClient() {
    if (clickhouseClientSingleton && clickhouseClientSingleton.getInstance) {
        try {
            clickhouseClient = await clickhouseClientSingleton.getInstance();
        }
        catch (error) {
            log.e('Failed to initialize ClickHouse client:', error);
        }
    }
}

/**
 * Transform MongoDB document to ClickHouse format
 * @param {object} doc - MongoDB document
 * @returns {object|null} - Transformed document or null if invalid
 */
function transformToClickhouseFormat(doc) {
    if (!doc || !doc.a || !doc.e || !doc.ts || !doc._id) {
        return null;
    }

    const result = {};

    // Required fields
    result.a = doc.a;
    result.e = doc.n || doc.e;
    result.uid = doc.uid;
    result.did = doc.did;
    result._id = doc._id;

    // Timestamp handling
    const ts = doc.ts;
    result.ts = typeof ts === 'number' ? ts : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());

    // Numeric fields
    if (doc.c !== undefined && doc.c !== null) {
        result.c = typeof doc.c === 'number' ? doc.c : +doc.c;
    }
    if (doc.s !== undefined && doc.s !== null) {
        result.s = typeof doc.s === 'number' ? doc.s : +doc.s;
    }
    if (doc.dur !== undefined && doc.dur !== null) {
        result.dur = typeof doc.dur === 'number' ? doc.dur : +doc.dur;
    }

    // JSON fields
    if (doc.up && typeof doc.up === 'object') {
        result.up = doc.up;
    }
    if (doc.custom && typeof doc.custom === 'object') {
        result.custom = doc.custom;
    }
    if (doc.cmp && typeof doc.cmp === 'object') {
        result.cmp = doc.cmp;
    }
    if (doc.sg && typeof doc.sg === 'object') {
        result.sg = doc.sg;
    }

    // Optional date field
    if (doc.lu !== undefined && doc.lu !== null) {
        const lu = doc.lu;
        result.lu = typeof lu === 'number' ? lu : (lu instanceof Date ? lu.getTime() : new Date(lu).getTime());
    }

    return result;
}


//Do not restart. If fails to creating, ail request.
/**
 * @param {object} params - request parameters
 * @param {function} done - callback function
 */
function processUser(params, done) {
    if (params && params.qstring && params.qstring.old_device_id && params.qstring.old_device_id !== params.qstring.device_id) {
        const old_id = common.crypto.createHash('sha1')
            .update(params.qstring.app_key + params.qstring.old_device_id + "")
            .digest('hex');

        countlyApi.mgmt.appUsers.merge(params.app_id, params.app_user, params.app_user_id, old_id, params.qstring.device_id, params.qstring.old_device_id, function(err0, userdoc) {
            //remove old device ID and retry request
            params.qstring.old_device_id = null;
            if (err0) {
                log.e(err0);
                done('Cannot update user');
            }
            else if (userdoc) {
                if (!userdoc.uid) {
                    countlyApi.mgmt.appUsers.createUserDocument(params, function(err, userDoc2) {
                        if (err) {
                            log.e(err);
                            done('Cannot update user');
                        }
                        else if (!userDoc2) {
                            done('Cannot update user');
                        }
                        else {
                            params.app_user = userDoc2;
                            done();
                        }
                    });
                }
                else {
                    params.app_user = userdoc;
                    done();
                }
            }
            else {
                done('User merged. Failed to record data.');
            }
        });
    }
    else if (params && params.app_user && !params.app_user.uid) {
        countlyApi.mgmt.appUsers.createUserDocument(params, function(err, userDoc2) {
            if (err) {
                done(err);
            }
            else if (userDoc2) {
                params.app_user = userDoc2;
                done();
            }
            else {
                done("User creation failed");
            }

        });
    }
    else {
        done();
    }
}


/**
 * Fills user properties from dbAppUser object
 * @param {object} dbAppUser  - app user object
 * @param {object} meta_doc  - meta document
 * @returns {object} userProperties, userCustom, userCampaign
 */
function fillUserProperties(dbAppUser, meta_doc) {
    var userProperties = {},
        userCustom = {},
        userCampaign = {};
    var setType = "";

    if (!dbAppUser) {
        return {up: userProperties, upCustom: userCustom, upCampaign: userCampaign };
    }
    var countlyUP = preset.up;
    for (let i in countlyUP) {
        var shortRep = common.dbUserMap[countlyUP[i].name] || countlyUP[i].name;

        if (shortRep === "fs") {
            dbAppUser.fs = (dbAppUser.fac) ? dbAppUser.fac : dbAppUser.fs;
        }
        else if (shortRep === "ls") {
            dbAppUser.ls = (dbAppUser.lac) ? dbAppUser.lac : dbAppUser.ls;
        }

        if (dbAppUser[shortRep]) {
            setType = countlyUP[i].type || "";
            if (meta_doc && meta_doc.up && meta_doc.up[i]) {
                setType = meta_doc.up[i];
            }
            userProperties[i] = dbAppUser[shortRep];
            if (setType === 's') {
                userProperties[i] = userProperties[i] + "";
            }
            else if (setType === 'n' && common.isNumber(userProperties[i])) {
                userProperties[i] = parseFloat(userProperties[i]);
            }
        }
    }
    if (dbAppUser.custom) {
        let key;
        for (let i in dbAppUser.custom) {
            key = common.fixEventKey(i);

            if (!key) {
                continue;
            }
            setType = "";
            if (meta_doc && meta_doc.custom && meta_doc.custom[key] && meta_doc.custom[key]) {
                setType = meta_doc.custom[key];
            }
            let tmpVal;

            if (Array.isArray(dbAppUser.custom[i])) {
                for (var z = 0; z < dbAppUser.custom[i].length; z++) {
                    dbAppUser.custom[i][z] = dbAppUser.custom[i][z] + "";
                }
                tmpVal = dbAppUser.custom[i];
            }
            else if (setType === "s") {
                tmpVal = dbAppUser.custom[i] + "";
            }
            else if (setType === "n" && common.isNumber(dbAppUser.custom[i])) {
                if (dbAppUser.custom[i].length && dbAppUser.custom[i].length <= 16) {
                    tmpVal = parseFloat(dbAppUser.custom[i]);
                }
                else {
                    tmpVal = dbAppUser.custom[i];
                }
            }
            else {
                tmpVal = dbAppUser.custom[i];
            }

            userCustom[key] = tmpVal;
        }
    }

    //add referral campaign data if any
    //legacy campaign data
    if (dbAppUser.cmp) {
        let key;
        for (let i in dbAppUser.cmp) {
            key = common.fixEventKey(i);

            if (!key || key === "_id" || key === "did" || key === "bv" || key === "ip" || key === "os" || key === "r" || key === "cty" || key === "last_click") {
                continue;
            }

            setType = "";
            if (meta_doc && meta_doc.cmp && meta_doc.cmp[key] && meta_doc.cmp[key]) {
                setType = meta_doc.cmp[key];
            }

            let tmpVal;
            if (setType && setType === 's') {
                tmpVal = dbAppUser.cmp[i] + "";
            }
            else if (common.isNumber(dbAppUser.cmp[i])) {
                if (dbAppUser.cmp[i].length && dbAppUser.cmp[i].length <= 16) {
                    tmpVal = parseFloat(dbAppUser.cmp[i]);
                }
                else {
                    tmpVal = dbAppUser.cmp[i];
                }
            }
            else if (Array.isArray(dbAppUser.cmp[i])) {
                tmpVal = dbAppUser.cmp[i];
            }
            else {
                tmpVal = dbAppUser.cmp[i];
            }

            userCampaign[key] = tmpVal;
        }
    }
    else {
        userCampaign.c = "Organic";
    }

    return {
        up: userProperties,
        upCustom: userCustom,
        upCampaign: userCampaign
    };
}

var processToDrill = async function(params, drill_updates, callback) {
    var events = params.qstring.events || [];
    if (!Array.isArray(events)) {
        log.w("invalid events passed for recording" + JSON.stringify(events));
        callback();
        return;
    }
    var dbAppUser = params.app_user;
    //Data we would expect to have
    //app Timezone to store correct ts in database(we assume passed one is in app timezone)
    //Configs with events to record(for each app)
    //app_user object
    //Event count and segment count limit if we want to enforce those + existng values

    var eventsToInsert = [];
    var timestamps = {};
    var viewUpdate = {};
    if (events.length > 0) {
        for (let i = 0; i < events.length; i++) {
            var currEvent = events[i];
            if (!currEvent.key) {
                continue;
            }
            if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalDrillEvents.indexOf(currEvent.key) === -1)) {
                continue;
            }
            /*
            if (currEvent.key === "[CLY]_session" && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_sessions) {
                continue;
            }

            if (currEvent.key === "[CLY]_view" && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_views) {
                continue;
            }*/

            if (currEvent.key === "[CLY]_view" && !(currEvent.segmentation && currEvent.segmentation.visit)) {
                continue;
            }

            /*
            if (currEvent.key === "[CLY]_action" && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_actions) {
                continue;
            }

            if ((currEvent.key === "[CLY]_push_action" || currEvent.key === "[CLY]_push_open") && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_pushes) {
                continue;
            }

            if ((currEvent.key === "[CLY]_push_sent") && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_pushes_sent) {
                continue;
            }

            if (currEvent.key === "[CLY]_crash" && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_crashes) {
                continue;
            }

            if ((currEvent.key === "[CLY]_star_rating") && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_star_rating) {
                continue;
            }

            if ((currEvent.key.indexOf('[CLY]_apm_') === 0) && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_apm) {
                continue;
            }

            if ((currEvent.key === "[CLY]_consent") && !plugins.getConfig("drill", params.app && params.app.plugins, true).record_consent) {
                continue;
            }*/


            var dbEventObject = {
                "a": params.app_id + "",
                "e": events[i].key,
                "cd": new Date(),
                "ts": events[i].timestamp || Date.now().valueOf(),
                "uid": params.app_user.uid,
                "_uid": params.app_user._id,
                "did": params.app_user.did
                //d, w,m,h
            };
            if (currEvent.key.indexOf('[CLY]_') === 0) {
                dbEventObject.n = events[i].key;
            }
            else {
                dbEventObject.n = events[i].key;
                dbEventObject.e = "[CLY]_custom";
            }
            if (currEvent.name) {
                dbEventObject.n = currEvent.name;
            }

            if (dbAppUser && dbAppUser[common.dbUserMap.user_id]) {
                dbEventObject[common.dbUserMap.user_id] = dbAppUser[common.dbUserMap.user_id];
            }
            var upWithMeta = fillUserProperties(dbAppUser, params.app?.ovveridden_types?.prop);
            dbEventObject[common.dbUserMap.device_id] = params.qstring.device_id;
            dbEventObject.lsid = dbAppUser.lsid;
            dbEventObject[common.dbEventMap.user_properties] = upWithMeta.up;
            dbEventObject.custom = upWithMeta.upCustom;
            dbEventObject.cmp = upWithMeta.upCampaign;

            var eventKey = events[i].key;
            //Setting params depending in event
            if (eventKey === "[CLY]_session") {
                dbEventObject._id = params.request_id;
            }
            else {
                dbEventObject._id = params.request_hash + "_" + params.app_user.uid + "_" + Date.now().valueOf() + "_" + i;
            }
            eventKey = currEvent.key;

            var time = params.time;
            if (events[i].timestamp) {
                time = common.initTimeObj(params.appTimezone, events[i].timestamp);
            }
            if (events[i].cvid) {
                dbEventObject.cvid = events[i].cvid;
            }

            if (events[i].pvid) {
                dbEventObject.pvid = events[i].pvid;
            }

            if (events[i].id) {
                dbEventObject.id = events[i].id;
            }

            if (events[i].peid) {
                dbEventObject.peid = events[i].peid;
            }

            if (eventKey === "[CLY]_view" && currEvent && currEvent.segmentation && currEvent.segmentation._idv) {
                dbEventObject._id = params.app_id + "_" + dbAppUser.uid + "_" + currEvent.segmentation._idv;
                if (!events[i].id) {
                    events[i].id = currEvent.segmentation._idv;
                }
            }
            if (eventKey === "[CLY]_consent") {
                dbEventObject.after = dbAppUser.consent;
            }

            dbEventObject[common.dbEventMap.timestamp] = time.mstimestamp;

            while (timestamps[dbEventObject[common.dbEventMap.timestamp]]) { //if we have this timestamp there somewhere - make it slighty different
                dbEventObject[common.dbEventMap.timestamp] += 1;
            }
            timestamps[dbEventObject[common.dbEventMap.timestamp]] = true;

            /*dbEventObject.d = momentDate.year() + ":" + (momentDate.month() + 1) + ":" + momentDate.format("D");
            dbEventObject.w = momentDate.isoWeekYear() + ":w" + momentDate.isoWeek();
            dbEventObject.m = momentDate.year() + ":m" + (momentDate.month() + 1);
            dbEventObject.h = momentDate.year() + ":" + (momentDate.month() + 1) + ":" + momentDate.format("D") + ":h" + momentD*/

            events[i].hour = (typeof events[i].hour !== "undefined") ? events[i].hour : params.qstring.hour;
            if (typeof events[i].hour !== "undefined") {
                events[i].hour = parseInt(events[i].hour);
                if (events[i].hour === 24) {
                    events[i].hour = 0;
                }
                if (events[i].hour >= 0 && events[i].hour < 24) {
                    upWithMeta.up.hour = events[i].hour;
                }
            }

            events[i].dow = (typeof events[i].dow !== "undefined") ? events[i].dow : params.qstring.dow;
            if (typeof events[i].dow !== "undefined") {
                events[i].dow = parseInt(events[i].dow);
                if (events[i].dow === 0) {
                    events[i].dow = 7;
                }
                if (events[i].dow > 0 && events[i].dow <= 7) {
                    upWithMeta.up.dow = events[i].dow;
                }
            }

            if (currEvent.segmentation) {
                var tmpSegVal;
                var meta_doc = params.app?.ovveridden_types?.events;
                for (var segKey in currEvent.segmentation) {
                    var segKeyAsFieldName = segKey.replace(/^\$|\./g, "");

                    if (segKey === "" || segKeyAsFieldName === "" || currEvent.segmentation[segKey] === null || typeof currEvent.segmentation[segKey] === "undefined") {
                        continue;
                    }
                    var setType = "";
                    if (meta_doc && meta_doc[eventKey] && meta_doc[eventKey][segKey]) { //some type is set via settings.
                        setType = meta_doc[eventKey][segKey];
                    }

                    if (Array.isArray(currEvent.segmentation[segKey])) {
                        var pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);
                        currEvent.segmentation[segKey] = currEvent.segmentation[segKey].splice(0, (pluginsGetConfig.array_list_limit || 10));
                        for (var z = 0; z < currEvent.segmentation[segKey].length; z++) {
                            currEvent.segmentation[segKey][z] = currEvent.segmentation[segKey][z] + "";
                            currEvent.segmentation[segKey][z] = common.encodeCharacters(currEvent.segmentation[segKey][z]);
                        }
                    }
                    //max number check
                    if (setType) { //if type is set as string  - we use it as string
                        if (setType === "s" || setType === "l" || setType === "bl" || setType === "a") {
                            tmpSegVal = currEvent.segmentation[segKey] + "";
                            tmpSegVal = common.encodeCharacters(tmpSegVal);
                        }
                        else if (setType === "n") {
                            if (common.isNumber(currEvent.segmentation[segKey])) {
                                tmpSegVal = parseFloat(currEvent.segmentation[segKey]);
                            }
                            else {
                                tmpSegVal = currEvent.segmentation[segKey];
                            }
                        }
                    }
                    else {
                        tmpSegVal = currEvent.segmentation[segKey];
                    }
                    dbEventObject[common.dbEventMap.segmentations] = dbEventObject[common.dbEventMap.segmentations] || {};
                    dbEventObject[common.dbEventMap.segmentations][segKeyAsFieldName] = tmpSegVal;
                }
            }
            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                currEvent.sum = parseFloat(parseFloat(currEvent.sum).toFixed(5));
            }

            if (currEvent.dur && common.isNumber(currEvent.dur)) {
                currEvent.dur = parseFloat(currEvent.dur);
            }

            if (currEvent.count && common.isNumber(currEvent.count)) {
                currEvent.count = parseInt(currEvent.count, 10);
            }
            else {
                currEvent.count = 1;
            }
            dbEventObject.s = currEvent.sum || 0;
            dbEventObject.dur = currEvent.dur || 0;
            dbEventObject.c = currEvent.count || 1;
            eventsToInsert.push({"insertOne": {"document": dbEventObject}});
            if (eventKey === "[CLY]_view") {
                var view_id = crypto.createHash('md5').update(currEvent.segmentation.name).digest('hex');
                viewUpdate[view_id] = {"lvid": dbEventObject._id, "ts": dbEventObject.ts, "a": params.app_id + ""};
                if (currEvent.segmentation) {
                    var sgm = {};
                    var have_sgm = false;
                    for (var key in currEvent.segmentation) {
                        if (key === 'platform' || !escapedViewSegments[key]) {
                            sgm[key] = currEvent.segmentation[key];
                            have_sgm = true;
                        }
                    }
                    if (have_sgm) {
                        viewUpdate[view_id].sg = sgm;
                    }
                }

            }

        }
    }
    if (drill_updates && drill_updates.length > 0) {
        for (var z4 = 0; z4 < drill_updates.length;z4++) {
            eventsToInsert.push(drill_updates[z4]);
        }
    }
    if (eventsToInsert.length > 0) {
        try {
            await common.drillDb.collection("drill_events").bulkWrite(eventsToInsert, {ordered: false});

            // write to clickhouse
            if (!clickhouseClient) {
                try {
                    await initializeClickhouseClient();
                }
                catch (error) {
                    log.e('Failed to initialize ClickHouse client:', error);
                }
            }

            if (clickhouseClient) {
                try {
                    const clickhouseData = [];
                    for (const bulkOp of eventsToInsert) {
                        if (bulkOp.insertOne && bulkOp.insertOne.document) {
                            if (bulkOp.insertOne.document.e === "[CLY]_session_update") {
                                bulkOp.insertOne.document.e = "[CLY]_session";
                                bulkOp.insertOne.document._id = bulkOp.insertOne.document.lsid;
                            }
                            const transformed = transformToClickhouseFormat(bulkOp.insertOne.document);
                            if (transformed) {
                                clickhouseData.push(transformed);
                            }
                        }
                    }

                    if (clickhouseData.length > 0) {
                        //todo: start queue building here
                        const startTime = Date.now();
                        await clickhouseClient.insert({
                            table: 'drill_events',
                            values: Readable.from(clickhouseData, { objectMode: true }),
                            format: 'JSONEachRow',
                        });
                        const insertTime = Date.now() - startTime;
                        log.d(`Successfully wrote ${clickhouseData.length} events to ClickHouse in ${insertTime}ms`);
                    }
                }
                catch (chError) {
                    log.e('Error writing to ClickHouse:', chError);
                    // Continue execution - don't fail the entire request for ClickHouse errors
                }
            }

            callback(null);
            if (Object.keys(viewUpdate).length) {
                //updates app_viewdata colelction.If delayed new incoming view updates will not have reference. (So can do in aggregator only if we can insure minimal delay)
                try {
                    await common.db.collection("app_userviews").updateOne({_id: params.app_id + "_" + params.app_user.uid}, {$set: viewUpdate}, {upsert: true});
                }
                catch (err) {
                    log.e(err);
                }
            }

        }
        catch (errors) {
            var realError;
            if (errors && Array.isArray(errors)) {
                log.e(JSON.stringify(errors));
                for (let i = 0; i < errors.length; i++) {
                    if ([11000, 10334, 17419].indexOf(errors[i].code) === -1) {
                        realError = true;
                    }
                }

                if (realError) {
                    callback(realError);
                }
                else {
                    // write to clickhouse for successful duplicate key inserts
                    if (!clickhouseClient) {
                        await initializeClickhouseClient();
                    }

                    if (clickhouseClient) {
                        try {
                            const clickhouseData = [];
                            for (const bulkOp of eventsToInsert) {
                                if (bulkOp.insertOne && bulkOp.insertOne.document) {
                                    const transformed = transformToClickhouseFormat(bulkOp.insertOne.document);
                                    if (transformed) {
                                        clickhouseData.push(transformed);
                                    }
                                }
                            }

                            if (clickhouseData.length > 0) {
                                const startTime = Date.now();
                                await clickhouseClient.insert({
                                    table: 'drill_events',
                                    values: Readable.from(clickhouseData, { objectMode: true }),
                                    format: 'JSONEachRow',
                                });
                                const insertTime = Date.now() - startTime;
                                log.d(`Successfully wrote ${clickhouseData.length} events to ClickHouse in ${insertTime}ms (duplicate key recovery)`);
                            }
                        }
                        catch (chError) {
                            log.e('Error writing to ClickHouse during duplicate key recovery:', chError);
                            // Continue execution - don't fail the entire request for ClickHouse errors
                        }
                    }

                    callback(null);
                    if (Object.keys(viewUpdate).length) {
                        //updates app_viewdata colelction.If delayed new incoming view updates will not have reference. (So can do in aggregator only if we can insure minimal delay)
                        try {
                            await common.db.collection("app_userviews").updateOne({_id: params.app_id + "_" + params.app_user.uid}, {$set: viewUpdate}, {upsert: true});
                        }
                        catch (err) {
                            log.e(err);
                        }
                    }

                }
            }
            else {
                console.log(errors);
                callback(errors);
            }
        }
    }
    else {
        callback(null);
    }
};

plugins.register("/sdk/process_user", async function(ob) {
    await usage.processUserProperties(ob);
});

/*
Needed only if we want to enforce event limit
const processEventsArray = async function(params) {
    if (params && params.qstring && params.qstring.events) {
        var event_limit = plugins.getConfig("api", params.app && params.app.plugins, true).event_limit || 500;
        eventDoc = await common.readBatcher.getOne("events", {"_id": common.db.ObjectID(params.app_id)}, {"transformation": "event_object"});
        var currDateWithoutTimestamp = moment();
        var missingEvents = {};
        for (var z = 0; z < params.qstring.events.length; z++) {
            params.qstring.events[z].key = common.fixEventKey(params.qstring.events[z].key);
            if (params.qstring.events[z].key && params.qstring.events[z].key.indexOf("[CLY]_") !== 0) {
                if (eventDoc && eventDoc._list) {
                    if (!eventDoc._list[params.qstring.events[z].key]) {
                        missingEvents[params.qstring.events[z].key] = true;
                    }
                }
                else {
                    missingEvents[params.qstring.events[z].key] = true;
                }
                if (!params.qstring.events[z].timestamp || parseInt(params.qstring.events[z].timestamp, 10) > currDateWithoutTimestamp.unix()) {
                    params.qstring.events[z].timestamp = params.time.mstimestamp;
                }
            }
            else {
                params.qstring.events[z]._system_event = true;
            }
        }

        if (Object.keys(missingEvents).length) {
            if (!eventDoc || (eventDoc && eventDoc._list_length < event_limit)) {
                var rr = await common.db.collection("events").bulkWrite([
                    {updateOne: {filter: {"_id": common.db.ObjectID(params.app_id)}, upsert: true, update: {"$addToSet": {"list": {"$each": Object.keys(missingEvents)}}}}},
                    {updateOne: {filter: {"_id": common.db.ObjectID(params.app_id)}, update: {"$push": {"list": {"$each": [], "$slice": event_limit}}}}}
                ], {ordered: true});

                //Refetch
                eventDoc = await common.readBatcher.getOne("events", {"_id": common.db.ObjectID(params.app_id)}, {"transformation": "event_object", "refetch": true});
            }
        }

        for (var z = 0; z < params.qstring.events.length; z++) {
            if (!params.qstring.events[z]._system_event && !eventDoc._list[params.qstring.events[z].key]) {
                params.qstring.events[z].key = null;
            }
        }
    }
};*/
/**
 * 
 * @param {object} ob  - request parameters
 * @param {function} done  - callback function
 * 
 * 1)Process users props from request
 * 2)Update App Users
 * 3)Process and insert drill
 */
const processRequestData = (ob, done) => {
    //preserve time for user's previous session
    var update = {};
    //check if we already processed app users for this request
    if (ob.params.app_user.last_req !== ob.params.request_hash && ob.updates.length) {
        for (let i = 0; i < ob.updates.length; i++) {
            update = common.mergeQuery(update, ob.updates[i]);
        }
    }
    //var SaveAppUser = Date.now().valueOf();

    common.updateAppUser(ob.params, update, false, function() {

        /*var AfterSaveAppUser = Date.now().valueOf();
        if (AfterSaveAppUser - SaveAppUser > treshold) {
            console.log("SaveAppUser time: " + (AfterSaveAppUser - SaveAppUser));
        }*/
        processToDrill(ob.params, ob.drill_updates, function(error) {
            if (error) {
                common.returnMessage(ob.params, 400, 'Could not record events:' + error);
            }
            else {
                common.returnMessage(ob.params, 200, 'Success');
                done();
            }
        });

    });
};

plugins.register("/sdk/process_request", async function(ob) {
    //Deals with duration. Determines if we keep session start if there is one passed.
    //Adds some app_user updates if needed.
    await usage.setLocation(ob.params);
    usage.processSession(ob);
});

/**
 * 
 * @param {*} params  - request parameters
 * @param {*} done  - callback function
 * 
 * 
 * 1)Get App collection settings
 * -->update app with lu. Better if we do not need to invalidate.
 * 2)Get App User
 * ->Process User (merge or create+refetch if new)
 * 3)Process request
 */
const validateAppForWriteAPI = (params, done) => {
    if (ignorePossibleDevices(params)) {
        common.returnMessage(params, 400, "Device ignored");
        done();
        return;
    }

    common.readBatcher.getOne("apps", {'key': params.qstring.app_key + ""}, {}, (err, app) => {
        if (err) {
            log.e(err);
        }
        if (!app || !app._id) {
            common.returnMessage(params, 400, 'App does not exist');
            params.cancelRequest = "App not found or no Database connection";
            done();
            return;
        }

        if (app.paused) {
            common.returnMessage(params, 400, 'App is currently not accepting data');
            params.cancelRequest = "App is currently not accepting data";
            plugins.dispatch("/sdk/cancel", {params: params});
            done();
            return;
        }

        if ((params.populator || params.qstring.populator) && app.locked) {
            common.returnMessage(params, 403, "App is locked");
            params.cancelRequest = "App is locked";
            plugins.dispatch("/sdk/cancel", {params: params});
            done();
            return;
        }
        if (!validateRedirect({params: params, app: app})) {
            if (!params.res.finished && !params.waitForResponse) {
                common.returnOutput(params, {result: 'Success', info: 'Request redirected: ' + params.cancelRequest});
            }
            done();
            return;
        }

        params.app_id = app._id + "";
        params.app_cc = app.country;
        params.app_name = app.name;
        params.appTimezone = app.timezone;
        params.app = app;
        params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);

        var time = Date.now().valueOf();
        time = Math.round((time || 0) / 1000);
        if (params.app && (!params.app.last_data || params.app.last_data < time - 60 * 60 * 24) && !params.populator && !params.qstring.populator) { //update if more than day passed
            //set new value for cache
            common.readBatcher.updateCacheOne("apps", {'key': params.qstring.app_key + ""}, {"last_data": time});
            //set new value in database
            try {
                common.db.collection("apps").findOneAndUpdate({"_id": new ObjectId(params.app._id)}, {"$set": {"last_data": time}});
                params.app.last_data = time;
            }
            catch (err3) {
                log.e(err3);
            }
        }

        if (!checksumSaltVerification(params)) {
            done();
            return;
        }

        plugins.dispatch("/sdk/validate_request", {params: params}, async function() { //validates request if there is no reason to block/cancel it
            if (params.cancelRequest) {
                if (!params.res.finished && !params.waitForResponse) {
                    common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                    //common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                }
                common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                done();
                return;
            }
            try {
                var user = await common.db.collection('app_users' + params.app_id).findOne({'_id': params.app_user_id});
            }
            catch (err2) {
                common.returnMessage(params, 400, 'Cannot get app user');
                params.cancelRequest = "Cannot get app user or no Database connection";
                done();
                return;
            }

            params.app_user = user || {};
            params.collectedMetrics = {};

            let payload = params.href.substr(3) || "";
            if (params.req && params.req.method && params.req.method.toLowerCase() === 'post') {
                payload += "&" + params.req.body;
            }
            //remove dynamic parameters
            payload = payload.replace(new RegExp("[?&]?(rr=[^&\n]+)", "gm"), "");
            payload = payload.replace(new RegExp("[?&]?(checksum=[^&\n]+)", "gm"), "");
            payload = payload.replace(new RegExp("[?&]?(checksum256=[^&\n]+)", "gm"), "");
            params.request_hash = common.crypto.createHash('sha1').update(payload).digest('hex') + (params.qstring.timestamp || params.time.mstimestamp);
            if (plugins.getConfig("api", params.app && params.app.plugins, true).prevent_duplicate_requests) {
                //check unique millisecond timestamp, if it is the same as the last request had,
                //then we are having duplicate request, due to sudden connection termination
                if (params.app_user.last_req === params.request_hash) {
                    params.cancelRequest = "Duplicate request";
                }
            }

            if (params.qstring.metrics && typeof params.qstring.metrics === "string") {
                try {
                    params.qstring.metrics = JSON.parse(params.qstring.metrics);
                }
                catch (SyntaxError) {
                    console.log('Parse metrics JSON failed', params.qstring.metrics, params.req.url, params.req.body);
                }
            }
            if (!params.cancelRequest) {
                processUser(params, function(userErr) {
                    if (userErr) {
                        if (!params.res.finished) {
                            common.returnMessage(params, 400, userErr);
                        }
                    }
                    else {
                        var ob = {params: params, app: app, updates: [], drill_updates: []};
                        ob.params.request_id = ob.params.request_hash + "_" + ob.params.app_user.uid + "_" + ob.params.time.mstimestamp;
                        plugins.dispatch("/sdk/process_request", ob, function() { //collects all metrics 
                            plugins.dispatch("/sdk/validate_user", ob, function() {
                                if (params.cancelRequest) {
                                    if (!params.res.finished && !params.waitForResponse) {
                                        common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                                    }
                                    common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                                    done();
                                    return;
                                }
                                else {
                                    ob.params.previous_session = ob.params.app_user.lsid;
                                    ob.params.previous_session_start = ob.params.app_user.ls;

                                    if (ob.params.qstring.begin_session) {
                                        params.qstring.events = params.qstring.events || [];
                                        params.qstring.events.unshift({
                                            key: "[CLY]_session",
                                            dur: params.qstring.session_duration || 0,
                                            count: 1,
                                            timestamp: params.time.mstimestamp,
                                            segmentation: {
                                                request_id: params.request_id,
                                                prev_session: params.previous_session,
                                                prev_start: params.previous_session_start,
                                                postfix: crypto.createHash('md5').update(params.app_user.did + "").digest('base64')[0],
                                                ended: "false"
                                            }
                                        });
                                    }
                                    plugins.dispatch("/sdk/process_user", ob, function() { //
                                        processRequestData(ob, done);
                                    });
                                }
                            });
                        });
                    }
                });
            }
            else {
                if (!params.res.finished && !params.waitForResponse) {
                    common.returnOutput(params, {result: 'Success', info: 'Request ignored: ' + params.cancelRequest});
                    //common.returnMessage(params, 200, 'Request ignored: ' + params.cancelRequest);
                }
                common.log("request").i('Request ignored: ' + params.cancelRequest, params.req.url, params.req.body);
                done();
                return;
            }
        });
    });
};
/**
 * 
 * @param {array} requests  - array with requests
 * @param {object} params  - params object
 */
const processBulkRequest = async function(requests, params) {
    const appKey = params.qstring.app_key;
    var skippedRequests = [];
    for (var i = 0; i < requests.length; i++) {
        if (!requests[i] || (!requests[i].app_key && !appKey) || !requests[i].device_id) {
            continue;
        }
        else {
            requests[i].app_key = requests[i].app_key || appKey;
            const tmpParams = {
                'app_id': '',
                'app_cc': '',
                'ip_address': requests[i].ip_address || common.getIpAddress(params.req),
                'user': {
                    'country': requests[i].country_code || 'Unknown',
                    'city': requests[i].city || 'Unknown'
                },
                'qstring': requests[i],
                'href': "/i",
                'res': params.res,
                'req': params.req,
                'promises': [],
                'bulk': true,
                'populator': params.qstring.populator,
                'blockResponses': true
            };

            tmpParams.qstring.device_id += "";
            tmpParams.app_user_id = common.crypto.createHash('sha1')
                .update(tmpParams.qstring.app_key + tmpParams.qstring.device_id + "")
                .digest('hex');

            await new Promise((resolve) => {
                validateAppForWriteAPI(tmpParams, () => {
                    //log request
                    if (tmpParams.cancelRequest) {
                        skippedRequests.push(tmpParams.qstring);
                    }
                    plugins.dispatch("/sdk/log", {params: tmpParams});
                    resolve();
                });
            });

        }
    }
    common.unblockResponses(params);
    common.returnMessage(params, 200, 'Success');
};


/**
 * Process request function
 * @param {object} params - request parameters
 * @returns {boolean} - returns false if request is cancelled
 */
const processRequest = (params) => {
    if (!params.req || !params.req.url) {
        return common.returnMessage(params, 400, "Please provide request data");
    }

    params.tt = Date.now().valueOf();
    const urlParts = url.parse(params.req.url, true),
        queryString = urlParts.query,
        paths = urlParts.pathname.split("/");

    params.href = urlParts.href;
    params.qstring = params.qstring || {};
    params.res = params.res || {};
    params.urlParts = urlParts;
    params.paths = paths;

    params.req.headers = params.req.headers || {};
    params.req.socket = params.req.socket || {};
    params.req.connection = params.req.connection || {};

    //copying query string data as qstring param
    if (queryString) {
        for (let i in queryString) {
            params.qstring[i] = queryString[i];
        }
    }

    //copying body as qstring param
    if (params.req.body && typeof params.req.body === "object") {
        for (let i in params.req.body) {
            params.qstring[i] = params.req.body[i];
        }
    }

    if (params.qstring.app_id && params.qstring.app_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "app_id"');
        return false;
    }

    if (params.qstring.user_id && params.qstring.user_id.length !== 24) {
        common.returnMessage(params, 400, 'Invalid parameter "user_id"');
        return false;
    }

    //remove countly path
    if (common.config.path === "/" + paths[1]) {
        paths.splice(1, 1);
    }

    let apiPath = '';

    for (let i = 1; i < paths.length; i++) {
        if (i > 2) {
            break;
        }

        apiPath += "/" + paths[i];
    }

    params.apiPath = apiPath;
    params.fullPath = paths.join("/");

    switch (apiPath) {
    case '/o/ping': {
        common.db.collection("plugins").findOne({_id: "plugins"}, {_id: 1}).then(() => {
            common.returnMessage(params, 200, 'Success');
        }).catch(() => {
            common.returnMessage(params, 404, 'DB Error');
        });
        return;
    }
    case '/i': {
        if ([true, "true"].includes(plugins.getConfig("api", params.app && params.app.plugins, true).trim_trailing_ending_spaces)) {
            params.qstring = common.trimWhitespaceStartEnd(params.qstring);
        }
        params.ip_address = params.qstring.ip_address || common.getIpAddress(params.req);
        params.user = {};

        if (!params.qstring.app_key || !params.qstring.device_id) {
            common.returnMessage(params, 400, 'Missing parameter "app_key" or "device_id"');
            return false;
        }
        else {
            //make sure device_id is string
            params.qstring.device_id += "";
            params.qstring.app_key += "";
            // Set app_user_id that is unique for each user of an application.
            params.app_user_id = common.crypto.createHash('sha1')
                .update(params.qstring.app_key + params.qstring.device_id + "")
                .digest('hex');
        }

        if (params.qstring.events && typeof params.qstring.events === "string") {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
            }
            catch (SyntaxError) {
                console.log('Parse events JSON failed', params.qstring.events, params.req.url, params.req.body);
                params.qstring.events = [];

            }
        }

        if (!params.qstring.events && !Array.isArray(params.qstring.events)) {
            params.qstring.events = [];
        }
        validateAppForWriteAPI(params, () => {
            //log request
            plugins.dispatch("/sdk/log", {params: params});
        });
        break;
    }
    case '/i/bulk': {
        let requests = params.qstring.requests;
        if (requests && typeof requests === "string") {
            try {
                requests = JSON.parse(requests);
            }
            catch (SyntaxError) {
                console.log('Parse bulk JSON failed', requests, params.req.url, params.req.body);
                requests = null;
            }
        }
        if (!requests) {
            common.returnMessage(params, 400, 'Missing parameter "requests"');
            return false;
        }
        if (!Array.isArray(requests)) {
            console.log("Passed invalid param for request. Expected Array, got " + typeof requests);
            common.returnMessage(params, 400, 'Invalid parameter "requests"');
            return false;
        }
        common.blockResponses(params);//no response till finished processing

        processBulkRequest(requests, params);
        break;
    }
    default:
        if (!plugins.dispatch(apiPath, {
            params: params,
            paths: paths
        })) {
            if (!plugins.dispatch(params.fullPath, {
                params: params,
                paths: paths
            })) {
                common.returnMessage(params, 400, 'Invalid path');
            }
        }
    }

};

module.exports = {processRequest: processRequest};
