/**
* This module processes events for aggregated data
* @module "api/parts/data/events"
*/

/** @lends module:api/parts/data/events */
var countlyEvents = {},
    common = require('./../../utils/common.js'),
    async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    plugins = require('../../../plugins/pluginManager.js');

/**
* Process JSON decoded events data from request
* @param {params} params - params object
* @returns {Promise} resolved when procesing finished
**/
countlyEvents.processEvents = function(params) {
    return new Promise(function(resolve) {
        var forbiddenSegValues = [];
        for (let i = 1; i < 32; i++) {
            forbiddenSegValues.push(i + "");
        }
        common.readBatcher.getOne("events", {'_id': params.app_id}, {
            list: 1,
            segments: 1,
            omitted_segments: 1,
            whitelisted_segments: 1
        }, (err, eventColl) => {
            var appEvents = [],
                appSegments = {},
                metaToFetch = {},
                omitted_segments = {},
                whitelisted_segments = {},
                pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);

            if (!err && eventColl) {
                if (eventColl.list) {
                    appEvents = eventColl.list;
                }

                if (eventColl.segments) {
                    appSegments = eventColl.segments;
                }

                if (eventColl.omitted_segments) {
                    omitted_segments = eventColl.omitted_segments;
                }

                if (eventColl.whitelisted_segments) {
                    whitelisted_segments = eventColl.whitelisted_segments;
                }
            }

            for (let i = 0; i < params.qstring.events.length; i++) {

                if (typeof params.qstring.events[i].key !== 'string') {
                    try {
                        params.qstring.events[i].key = JSON.stringify(params.qstring.events[i].key);
                    }
                    catch (error) {
                        params.qstring.events[i].key += "";
                    }
                }

                var currEvent = params.qstring.events[i],
                    shortEventName = "",
                    eventCollectionName = "";

                if (!currEvent.segmentation) {
                    continue;
                }

                // Key fields is required
                if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
                    continue;
                }
                if (currEvent.count && common.isNumber(currEvent.count)) {
                    currEvent.count = parseInt(currEvent.count, 10);
                }
                else {
                    currEvent.count = 1;
                }

                if (pluginsGetConfig.event_limit &&
                        appEvents.length >= pluginsGetConfig.event_limit &&
                        appEvents.indexOf(currEvent.key) === -1) {
                    continue;
                }
                shortEventName = common.fixEventKey(currEvent.key);

                if (!shortEventName) {
                    continue;
                }
                eventCollectionName = "events" + crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');
                if (currEvent.segmentation) {

                    for (var segKey in currEvent.segmentation) {
                        //check if segment should be ommited
                        if (plugins.internalOmitSegments[currEvent.key] && Array.isArray(plugins.internalOmitSegments[currEvent.key]) && plugins.internalOmitSegments[currEvent.key].indexOf(segKey) !== -1) {
                            continue;
                        }
                        //check if segment should be ommited
                        if (omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey) !== -1) {
                            continue;
                        }

                        //check if whitelisted is set and this one not in whitelist
                        if (whitelisted_segments[currEvent.key] && Array.isArray(whitelisted_segments[currEvent.key]) && whitelisted_segments[currEvent.key].indexOf(segKey) === -1) {
                            continue;
                        }

                        if (pluginsGetConfig.event_segmentation_limit &&
                                appSegments[currEvent.key] &&
                                appSegments[currEvent.key].indexOf(segKey) === -1 &&
                                appSegments[currEvent.key].length >= pluginsGetConfig.event_segmentation_limit) {
                            continue;
                        }

                        var tmpSegVal;
                        var myValues = [];
                        if (Array.isArray(currEvent.segmentation[segKey])) {
                            currEvent.segmentation[segKey] = currEvent.segmentation[segKey].splice(0, (pluginsGetConfig.array_list_limit || 10));
                            //myValues = currEvent.segmentation[segKey];
                            myValues = []; //ignore array values.
                        }
                        else {
                            myValues = [currEvent.segmentation[segKey]];
                        }
                        for (var z = 0; z < myValues.length; z++) {
                            try {
                                tmpSegVal = myValues[z] + "";
                                tmpSegVal = tmpSegVal.replace(/^\$+/, "").replace(/\./g, ":");

                                if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                                    tmpSegVal = "[CLY]" + tmpSegVal;
                                }

                                var postfix = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];
                                metaToFetch[eventCollectionName + "no-segment_" + common.getDateIds(params).zero + "_" + postfix] = {
                                    coll: eventCollectionName,
                                    id: "no-segment_" + common.getDateIds(params).zero + "_" + postfix
                                };
                            }
                            catch (ex) {
                                console.log("Incorrect segment value", params.app_id, currEvent.key, "segment", segKey, ex);
                                delete currEvent.segmentation[segKey];
                                tmpSegVal = "";
                            }
                        }

                    }
                }
            }
            async.map(Object.keys(metaToFetch), fetchEventMeta, function(err2, eventMetaDocs) {
                var appSgValues = {};

                for (let i = 0; i < eventMetaDocs.length; i++) {
                    if (eventMetaDocs[i].coll) {
                        if (eventMetaDocs[i].meta_v2) {
                            if (!appSgValues[eventMetaDocs[i].coll]) {
                                appSgValues[eventMetaDocs[i].coll] = {};
                            }
                            if (!appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id]) {
                                appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id] = {};
                            }
                            for (var segment in eventMetaDocs[i].meta_v2) {
                                appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id][segment] = Object.keys(eventMetaDocs[i].meta_v2[segment]);
                            }
                        }
                    }
                }

                processEvents(appEvents, appSegments, appSgValues, params, omitted_segments, whitelisted_segments, resolve);
            });

            /**
            * Fetch event meta
            * @param {string} id - id to of event to fetchEventMeta
            * @param {function} callback - for result
            **/
            function fetchEventMeta(id, callback) {
                common.readBatcher.getOne(metaToFetch[id].coll, {'_id': metaToFetch[id].id}, {meta_v2: 1}, (err2, eventMetaDoc) => {
                    var retObj = eventMetaDoc || {};
                    retObj.coll = metaToFetch[id].coll;

                    callback(null, retObj);
                });
            }
        });
    });
};

/**
* Process events from params
* @param {array} appEvents - aray with existing event keys
* @param {object} appSegments - object with event key as key, and segments as array value
* @param {object} appSgValues - object in format [collection][document_id][segment] and array of values as value for inserting in database
* @param {params} params - params object
* @param {array} omitted_segments - array of segments to omit
* @param {array} whitelisted_segments - array of segments to keep
* @param {function} done - callback function to call when done processing
**/
function processEvents(appEvents, appSegments, appSgValues, params, omitted_segments, whitelisted_segments, done) {
    var events = [],
        eventCollections = {},
        eventSegments = {},
        eventSegmentsZeroes = {},
        tmpEventObj = {},
        tmpEventColl = {},
        shortEventName = "",
        eventCollectionName = "",
        eventHashMap = {},
        forbiddenSegValues = [],
        pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);

    for (let i = 1; i < 32; i++) {
        forbiddenSegValues.push(i + "");
    }

    for (let i = 0; i < params.qstring.events.length; i++) {

        var currEvent = params.qstring.events[i];
        tmpEventObj = {};
        tmpEventColl = {};

        // Key fields is required
        if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
            continue;
        }

        if (currEvent.count && common.isNumber(currEvent.count)) {
            currEvent.count = parseInt(currEvent.count, 10);
        }
        else {
            currEvent.count = 1;
        }

        if (pluginsGetConfig.event_limit &&
                appEvents.length >= pluginsGetConfig.event_limit &&
                appEvents.indexOf(currEvent.key) === -1) {
            continue;
        }

        plugins.dispatch("/i/events", {
            params: params,
            currEvent: currEvent
        });

        shortEventName = common.fixEventKey(currEvent.key);

        if (!shortEventName) {
            continue;
        }

        // Create new collection name for the event
        eventCollectionName = "events" + crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');

        eventHashMap[eventCollectionName] = shortEventName;

        // If present use timestamp inside each event while recording
        var time = params.time;
        if (params.qstring.events[i].timestamp) {
            params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
        }

        common.arrayAddUniq(events, shortEventName);

        if (currEvent.sum && common.isNumber(currEvent.sum)) {
            currEvent.sum = parseFloat(parseFloat(currEvent.sum).toFixed(5));
            common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.sum, currEvent.sum);
        }

        if (currEvent.dur && common.isNumber(currEvent.dur)) {
            currEvent.dur = parseFloat(currEvent.dur);
            common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.dur, currEvent.dur);
        }

        if (currEvent.count && common.isNumber(currEvent.count)) {
            currEvent.count = parseInt(currEvent.count, 10);
        }

        common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.count, currEvent.count);

        var dateIds = common.getDateIds(params);

        tmpEventColl["no-segment" + "." + dateIds.month] = tmpEventObj;

        if (currEvent.segmentation) {
            for (let segKey in currEvent.segmentation) {
                var tmpSegKey = "";
                if (segKey.indexOf('.') !== -1 || segKey.substr(0, 1) === '$') {
                    tmpSegKey = segKey.replace(/^\$+|\./g, "");
                    currEvent.segmentation[tmpSegKey] = currEvent.segmentation[segKey];
                    delete currEvent.segmentation[segKey];
                }
            }

            for (let segKey in currEvent.segmentation) {
                //check if segment should be ommited
                if (plugins.internalOmitSegments[currEvent.key] && Array.isArray(plugins.internalOmitSegments[currEvent.key]) && plugins.internalOmitSegments[currEvent.key].indexOf(segKey) !== -1) {
                    continue;
                }
                //check if segment should be ommited
                if (omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey) !== -1) {
                    continue;
                }

                if (whitelisted_segments[currEvent.key] && Array.isArray(whitelisted_segments[currEvent.key]) && whitelisted_segments[currEvent.key].indexOf(segKey) === -1) {
                    continue;
                }
                //if segKey is empty
                if (segKey === "") {
                    continue;
                }

                if (pluginsGetConfig.event_segmentation_limit &&
                        appSegments[currEvent.key] &&
                        appSegments[currEvent.key].indexOf(segKey) === -1 &&
                        appSegments[currEvent.key].length >= pluginsGetConfig.event_segmentation_limit) {
                    continue;
                }



                var myValues = [];
                var tmpSegVal;
                if (Array.isArray(currEvent.segmentation[segKey])) {
                    //myValues = currEvent.segmentation[segKey];
                    myValues = [];//ignore array values
                }
                else {
                    myValues = [currEvent.segmentation[segKey]];
                }
                for (var z = 0; z < myValues.length; z++) {
                    tmpEventObj = {};
                    tmpSegVal = myValues[z];
                    try {
                        tmpSegVal = tmpSegVal + "";
                    }
                    catch (ex) {
                        tmpSegVal = "";
                    }

                    if (tmpSegVal === "") {
                        continue;
                    }

                    // Mongodb field names can't start with $ or contain .
                    tmpSegVal = tmpSegVal.replace(/^\$+/, "").replace(/\./g, ":");

                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = "[CLY]" + tmpSegVal;
                    }

                    var postfix = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];

                    if (pluginsGetConfig.event_segmentation_value_limit &&
							appSgValues[eventCollectionName] &&
							appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix] &&
							appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey] &&
							appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey].indexOf(tmpSegVal) === -1 &&
							appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey].length >= pluginsGetConfig.event_segmentation_value_limit) {
                        continue;
                    }

                    if (currEvent.sum && common.isNumber(currEvent.sum)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.sum, currEvent.sum);
                    }

                    if (currEvent.dur && common.isNumber(currEvent.dur)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.dur, currEvent.dur);
                    }

                    common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.count, currEvent.count);

                    if (!eventSegmentsZeroes[eventCollectionName]) {
                        eventSegmentsZeroes[eventCollectionName] = [];
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + "." + postfix);
                    }
                    else {
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + "." + postfix);
                    }

                    if (!eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]) {
                        eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix] = {};
                    }

                    eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]['meta_v2.' + segKey + '.' + tmpSegVal] = true;
                    eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]["meta_v2.segments." + segKey] = true;

                    tmpEventColl[segKey + "." + dateIds.month + "." + postfix] = tmpEventObj;
                }
            }
        }
        if (!eventCollections[eventCollectionName]) {
            eventCollections[eventCollectionName] = {};
        }

        mergeEvents(eventCollections[eventCollectionName], tmpEventColl);

        //switch back to request time
        params.time = time;
    }

    if (!pluginsGetConfig.safe) {
        for (let collection in eventCollections) {
            if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                for (let i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                    let zeroId = "";

                    if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                        continue;
                    }
                    else {
                        zeroId = eventSegmentsZeroes[collection][i];
                    }
                    eventSegments[collection + "." + zeroId].m = zeroId.split(".")[0];
                    eventSegments[collection + "." + zeroId].s = "no-segment";
                    common.writeBatcher.add(collection, "no-segment_" + zeroId.replace(".", "_"), {$set: eventSegments[collection + "." + zeroId]});
                }
            }

            for (let segment in eventCollections[collection]) {
                let collIdSplits = segment.split("."),
                    collId = segment.replace(/\./g, "_");

                common.writeBatcher.add(collection, collId, {
                    $set: {
                        "m": collIdSplits[1],
                        "s": collIdSplits[0]
                    },
                    "$inc": eventCollections[collection][segment]
                });
            }
        }
    }
    else {
        var eventDocs = [];

        for (let collection in eventCollections) {
            if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                for (let i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                    let zeroId = "";

                    if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                        continue;
                    }
                    else {
                        zeroId = eventSegmentsZeroes[collection][i];
                    }

                    eventSegments[collection + "." + zeroId].m = zeroId.split(".")[0];
                    eventSegments[collection + "." + zeroId].s = "no-segment";

                    eventDocs.push({
                        "collection": collection,
                        "_id": "no-segment_" + zeroId.replace(".", "_"),
                        "updateObj": {$set: eventSegments[collection + "." + zeroId]}
                    });
                }
            }

            for (let segment in eventCollections[collection]) {
                let collIdSplits = segment.split("."),
                    collId = segment.replace(/\./g, "_");

                eventDocs.push({
                    "collection": collection,
                    "_id": collId,
                    "updateObj": {
                        $set: {
                            "m": collIdSplits[1],
                            "s": collIdSplits[0]
                        },
                        "$inc": eventCollections[collection][segment]
                    },
                    "rollbackObj": eventCollections[collection][segment]
                });
            }
        }
        for (var k = 0; k < eventDocs.length; k++) {
            common.writeBatcher.add(eventDocs[k].collection, eventDocs[k]._id, eventDocs[k].updateObj);
        }

        /*async.map(eventDocs, updateEventDb, function(err, eventUpdateResults) {
            var needRollback = false;

            for (let i = 0; i < eventUpdateResults.length; i++) {
                if (eventUpdateResults[i].status === "failed") {
                    needRollback = true;
                    break;
                }
            }

            if (needRollback) {
                async.map(eventUpdateResults, rollbackEventDb, function() {
                    if (!params.bulk) {
                        common.returnMessage(params, 500, 'Failure');
                    }
                });
            }
            else if (!params.bulk) {
                common.returnMessage(params, 200, 'Success');
            }
        });*/
    }

    if (events.length) {
        var eventSegmentList = {'$addToSet': {'list': {'$each': events}}};

        for (let event in eventSegments) {
            var eventSplits = event.split("."),
                eventKey = eventSplits[0];

            var realEventKey = (eventHashMap[eventKey] + "").replace(/\./g, ':');

            if (!eventSegmentList.$addToSet["segments." + realEventKey]) {
                eventSegmentList.$addToSet["segments." + realEventKey] = {};
            }

            if (eventSegments[event]) {
                for (let segment in eventSegments[event]) {
                    if (segment.indexOf("meta_v2.segments.") === 0) {
                        var name = segment.replace("meta_v2.segments.", "");
                        if (eventSegmentList.$addToSet["segments." + realEventKey] && eventSegmentList.$addToSet["segments." + realEventKey].$each) {
                            common.arrayAddUniq(eventSegmentList.$addToSet["segments." + realEventKey].$each, name);
                        }
                        else {
                            eventSegmentList.$addToSet["segments." + realEventKey] = {$each: [name]};
                        }
                    }
                }
            }
        }

        common.writeBatcher.add('events', common.db.ObjectID(params.app_id), eventSegmentList);
    }
    done();
}

/**
* Merge multiple event document objects
* @param {object} firstObj - first object to merge
* @param {object} secondObj - second object to merge
**/
function mergeEvents(firstObj, secondObj) {
    for (let firstLevel in secondObj) {

        if (!Object.prototype.hasOwnProperty.call(secondObj, firstLevel)) {
            continue;
        }

        if (!firstObj[firstLevel]) {
            firstObj[firstLevel] = secondObj[firstLevel];
            continue;
        }

        for (var secondLevel in secondObj[firstLevel]) {

            if (!Object.prototype.hasOwnProperty.call(secondObj[firstLevel], secondLevel)) {
                continue;
            }

            if (firstObj[firstLevel][secondLevel]) {
                firstObj[firstLevel][secondLevel] += secondObj[firstLevel][secondLevel];
            }
            else {
                firstObj[firstLevel][secondLevel] = secondObj[firstLevel][secondLevel];
            }
        }
    }
}

/**
* Merge multiple event document objects
* @param {object} eventDoc - document with information about event
* @param {function} callback - to call when update done
**/
/*function updateEventDb(eventDoc, callback) {
    common.db.collection(eventDoc.collection).update({'_id': eventDoc._id}, eventDoc.updateObj, {
        'upsert': true,
        'safe': true
    }, function(err, result) {
        if (!err && result && result.result && result.result.ok === 1) {
            callback(null, {
                status: "ok",
                obj: eventDoc
            });
        }
        else {
            callback(null, {
                status: "failed",
                obj: eventDoc
            });
        }
    });
}*/

/**
* Rollback already updated events in case error happened and we have safe api enabled
* @param {object} eventUpdateResult - db result object of updating event document
* @param {function} callback - to call when rollback done
**/
/*function rollbackEventDb(eventUpdateResult, callback) {
    if (eventUpdateResult.status === "failed") {
        callback(null, {});
    }
    else {
        var eventDoc = eventUpdateResult.obj;

        if (eventDoc.rollbackObj) {
            common.db.collection(eventDoc.collection).update({'_id': eventDoc._id}, {'$inc': getInvertedValues(eventDoc.rollbackObj)}, {'upsert': false}, function() {});
            callback(true, {});
        }
        else {
            callback(true, {});
        }
    }
}*/

/**
* Invert updated object to deduct updated values
* @param {object} obj - object with properties and values to deduct
* @returns {object} inverted update object, to deduct inserted values
**/
/*function getInvertedValues(obj) {
    var invObj = {};

    for (var objProp in obj) {
        invObj[objProp] = -obj[objProp];
    }

    return invObj;
}*/

module.exports = countlyEvents;