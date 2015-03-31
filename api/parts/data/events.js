var countlyEvents = {},
    common = require('./../../utils/common.js'),
    async = require('async'),
    crypto = require('crypto'),
	plugins = require('../../../plugins/pluginManager.js');

(function (countlyEvents) {

    countlyEvents.processEvents = function(params) {
        common.db.collection("events").findOne({'_id':params.app_id}, {list:1, segments:1}, function (err, eventColl) {
            var appEvents = [],
                appSegments = {},
                metaToFetch = [];

            if (!err && eventColl) {
                if (eventColl.list) {
                    appEvents = eventColl.list;
                }

                if (eventColl.segments) {
                    appSegments = eventColl.segments;
                }
            }

            for (var i=0; i < params.qstring.events.length; i++) {
                var currEvent = params.qstring.events[i],
                    shortEventName = "",
                    eventCollectionName = "";
                if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count) || (currEvent.key.indexOf('[CLY]_') == 0 && !currEvent.test)) {
                    continue;
                }

                if (common.config.api.event_limit &&
                    appEvents.length >= common.config.api.event_limit &&
                    appEvents.indexOf(currEvent.key) === -1) {
                    continue;
                }

                shortEventName = common.fixEventKey(currEvent.key);

                if (!shortEventName) {
                    continue;
                }

                eventCollectionName = "events" + crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');

                if (params.qstring.events[i].timestamp) {
                    params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
                }

                metaToFetch.push({
                   coll: eventCollectionName,
                   id: "no-segment_" + common.getDateIds(params).zero
                });
            }

            async.map(metaToFetch, fetchEventMeta, function (err, eventMetaDocs) {
                var appSgValues = {};

                for (var i = 0; i < eventMetaDocs.length; i++) {
                    if (eventMetaDocs[i].coll && eventMetaDocs[i].meta) {
                        appSgValues[eventMetaDocs[i].coll] = eventMetaDocs[i].meta;
                    }
                }

                processEvents(appEvents, appSegments, appSgValues, params);
            });

            function fetchEventMeta(metaToFetch, callback) {
                common.db.collection(metaToFetch.coll).findOne({'_id':metaToFetch.id}, {meta:1}, function (err, eventMetaDoc) {
                    var retObj = eventMetaDoc || {};
                    retObj.coll = metaToFetch.coll;

                    callback(false, retObj);
                });
            }
        });
    };

    function processEvents(appEvents, appSegments, appSgValues, params) {
        var events = [],
            eventCollections = {},
            eventSegments = {},
            eventSegmentsZeroes = {},
            tmpEventObj = {},
            tmpEventColl = {},
            shortEventName = "",
            eventCollectionName = "",
            eventHashMap = {},
            forbiddenSegValues = [];

        for (var i = 1; i < 32; i++) {
            forbiddenSegValues.push(i + "");
        }

        for (var i=0; i < params.qstring.events.length; i++) {

            var currEvent = params.qstring.events[i];
            tmpEventObj = {};
            tmpEventColl = {};

            // Key and count fields are required
            if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count)) {
                continue;
            }

            if (common.config.api.event_limit &&
                appEvents.length >= common.config.api.event_limit &&
                appEvents.indexOf(currEvent.key) === -1) {
                continue;
            }

			plugins.dispatch("/i/events", {params:params, currEvent:currEvent});
	    	    
            shortEventName = common.fixEventKey(currEvent.key);

            if (!shortEventName) {
                continue;
            }

            // Create new collection name for the event
            eventCollectionName = "events" + crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');

            eventHashMap[eventCollectionName] = shortEventName;

            // If present use timestamp inside each event while recording
            if (params.qstring.events[i].timestamp) {
                params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
            }

            common.arrayAddUniq(events, shortEventName);

            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                currEvent.sum = parseFloat(currEvent.sum.toFixed(5));
                common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap['sum'], currEvent.sum);
            }

            common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap['count'], currEvent.count);

            var dateIds = common.getDateIds(params);

            tmpEventColl["no-segment" + "." + dateIds.month] = tmpEventObj;

            if (currEvent.segmentation) {
                for (var segKey in currEvent.segmentation){
                    var tmpSegKey = "";
                    if(segKey.indexOf('.') != -1 || segKey.substr(0,1) == '$'){
                        tmpSegKey = segKey.replace(/^\$|\./g, "");
                        currEvent.segmentation[tmpSegKey] = currEvent.segmentation[segKey];
                        delete currEvent.segmentation[segKey];
                    }
                }

                for (var segKey in currEvent.segmentation) {

                    if (common.config.api.event_segmentation_limit &&
                        appSegments[currEvent.key] &&
                        appSegments[currEvent.key].indexOf(segKey) === -1 &&
                        appSegments[currEvent.key].length >= common.config.api.event_segmentation_limit) {
                        continue;
                    }

                    tmpEventObj = {};
                    var tmpSegVal = currEvent.segmentation[segKey] + "";

                    if (tmpSegVal == "") {
                        continue;
                    }

                    // Mongodb field names can't start with $ or contain .
                    tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");

                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = "[CLY]" + tmpSegVal;
                    }

                    if (common.config.api.event_segmentation_value_limit &&
                        appSgValues[eventCollectionName] &&
                        appSgValues[eventCollectionName][segKey] &&
                        appSgValues[eventCollectionName][segKey].indexOf(tmpSegVal) === -1 &&
                        appSgValues[eventCollectionName][segKey].length >= common.config.api.event_segmentation_value_limit) {
                        continue;
                    }

                    if (currEvent.sum && common.isNumber(currEvent.sum)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['sum'], currEvent.sum);
                    }

                    common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['count'], currEvent.count);

                    if (!eventSegmentsZeroes[eventCollectionName]) {
                        eventSegmentsZeroes[eventCollectionName] = [];
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero);
                    } else {
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero);
                    }

                    if (!eventSegments[eventCollectionName + "." + dateIds.zero]) {
                        eventSegments[eventCollectionName + "." + dateIds.zero] = {};
                    }

                    if (!eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey]) {
                        eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey] = {};
                    }

                    if (eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey]["$each"] && eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey]["$each"].length) {
                        common.arrayAddUniq(eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey]["$each"], tmpSegVal);
                    } else {
                        eventSegments[eventCollectionName + "." + dateIds.zero]['meta.' + segKey]["$each"] = [tmpSegVal];
                    }

                    if (!eventSegments[eventCollectionName + "." + dateIds.zero]["meta.segments"]) {
                        eventSegments[eventCollectionName + "." + dateIds.zero]["meta.segments"] = {};
                        eventSegments[eventCollectionName + "." + dateIds.zero]["meta.segments"]["$each"] = [];
                    }

                    common.arrayAddUniq(eventSegments[eventCollectionName + "." + dateIds.zero]["meta.segments"]["$each"], segKey);
                    tmpEventColl[segKey + "." + dateIds.month] = tmpEventObj;
                }
            }

            if (!eventCollections[eventCollectionName]) {
                eventCollections[eventCollectionName] = {};
            }

            mergeEvents(eventCollections[eventCollectionName], tmpEventColl);
        }

        if (!common.config.api.safe) {
            for (var collection in eventCollections) {
                if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                    for (var i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                        var zeroId = "";

                        if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                           continue;
                        } else {
                            zeroId = eventSegmentsZeroes[collection][i];
                        }

                        common.db.collection(collection).update({'_id': "no-segment_" + zeroId}, {$set: {"m":zeroId, "s":"no-segment"}, '$addToSet': eventSegments[collection + "." +  zeroId]}, {'upsert': true}, function(err, res) {});
                    }
                }

                for (var segment in eventCollections[collection]) {
                    var collIdSplits = segment.split("."),
                        collId = segment.replace(".","_");

                    common.db.collection(collection).update({'_id': collId}, {$set: {"m":collIdSplits[1], "s":collIdSplits[0]}, "$inc":eventCollections[collection][segment]}, {'upsert': true}, function(err, res) {});
                }
            }
        } else {
            var eventDocs = [];

            for (var collection in eventCollections) {
                if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                    for (var i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                        var zeroId = "";

                        if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                            continue;
                        } else {
                            zeroId = eventSegmentsZeroes[collection][i];
                        }

                        eventDocs.push({
                            "collection": collection,
                            "_id": "no-segment_" + zeroId,
                            "updateObj": {$set: {"m":zeroId, "s":"no-segment"}, '$addToSet': eventSegments[collection + "." +  zeroId]}
                        });
                    }
                }

                for (var segment in eventCollections[collection]) {
                    var collIdSplits = segment.split("."),
                        collId = segment.replace(".","_");

                    eventDocs.push({
                        "collection": collection,
                        "_id": collId,
                        "updateObj": {$set: {"m":collIdSplits[1], "s":collIdSplits[0]}, "$inc":eventCollections[collection][segment]},
                        "rollbackObj":eventCollections[collection][segment]
                    });
                }
            }

            async.map(eventDocs, updateEventDb, function (err, eventUpdateResults) {
                var needRollback = false;

                for (var i = 0; i < eventUpdateResults.length; i++) {
                    if (eventUpdateResults[i].status == "failed") {
                        needRollback = true;
                        break;
                    }
                }

                if (needRollback) {
                    async.map(eventUpdateResults, rollbackEventDb, function (err, eventRollbackResults) {
                        common.returnMessage(params, 500, 'Failure');
                    });
                } else {
                    common.returnMessage(params, 200, 'Success');
                }
            });

            function updateEventDb(eventDoc, callback) {
                common.db.collection(eventDoc.collection).update({'_id': eventDoc._id}, eventDoc.updateObj, {'upsert': true, 'safe': true}, function(err, result) {
                    if (err || result != 1) {
                        callback(false, {status: "failed", obj: eventDoc});
                    } else {
                        callback(false, {status: "ok", obj: eventDoc});
                    }
                });
            }

            function rollbackEventDb(eventUpdateResult, callback) {
                if (eventUpdateResult.status == "failed") {
                    callback(false, {});
                } else {
                    var eventDoc = eventUpdateResult.obj;

                    if (eventDoc.rollbackObj) {
                        common.db.collection(eventDoc.collection).update({'_id': eventDoc._id}, {'$inc': getInvertedValues(eventDoc.rollbackObj)}, {'upsert': false}, function(err, result) {});
                        callback(true, {});
                    } else {
                        callback(true, {});
                    }
                }
            }

            function getInvertedValues(obj) {
                var invObj = {};

                for (var objProp in obj) {
                    invObj[objProp] = -obj[objProp];
                }

                return invObj;
            }
        }

        if (events.length) {
            var eventSegmentList = {'$addToSet': {'list': {'$each': events}}};

            for (var event in eventSegments) {
                var eventSplits = event.split("."),
                    eventKey = eventSplits[0];

                var realEventKey = (eventHashMap[eventKey] + "").replace(/\./g,':');

                if (!eventSegmentList['$addToSet']["segments." + realEventKey]) {
                    eventSegmentList['$addToSet']["segments." + realEventKey] = {};
                }

                if (eventSegments[event]['meta.segments']) {
                    if (eventSegmentList['$addToSet']["segments." + realEventKey] && eventSegmentList['$addToSet']["segments." + realEventKey]["$each"]) {
                        common.arrayAddUniq(eventSegmentList['$addToSet']["segments." + realEventKey]["$each"], eventSegments[event]['meta.segments']["$each"]);
                    } else {
                        eventSegmentList['$addToSet']["segments." + realEventKey] = eventSegments[event]['meta.segments'];
                    }
                }
            }

            common.db.collection('events').update({'_id': params.app_id}, eventSegmentList, {'upsert': true}, function(err, res){});
        }
    }

    function mergeEvents(firstObj, secondObj) {
        for (var firstLevel in secondObj) {

            if (!secondObj.hasOwnProperty(firstLevel)) {
                continue;
            }

            if (!firstObj[firstLevel]) {
                firstObj[firstLevel] = secondObj[firstLevel];
                continue;
            }

            for (var secondLevel in secondObj[firstLevel]) {

                if (!secondObj[firstLevel].hasOwnProperty(secondLevel)) {
                    continue;
                }

                if (firstObj[firstLevel][secondLevel]) {
                    firstObj[firstLevel][secondLevel] += secondObj[firstLevel][secondLevel];
                } else {
                    firstObj[firstLevel][secondLevel] = secondObj[firstLevel][secondLevel];
                }
            }
        }
    }

}(countlyEvents));

module.exports = countlyEvents;