var countlyEvents = {},
    common = require('./../../utils/common.js'),
    async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
	plugins = require('../../../plugins/pluginManager.js');

(function (countlyEvents) {

    countlyEvents.processEvents = function(params) {
        return new Promise(function(resolve, reject){
            var forbiddenSegValues = [];
            for (var i = 1; i < 32; i++) {
                forbiddenSegValues.push(i + "");
            }
            common.db.collection("events").findOne({'_id':params.app_id}, {list:1, segments:1,omitted_segments:1}, function (err, eventColl) {
                var appEvents = [],
                    appSegments = {},
                    metaToFetch = {},
                    omitted_segments={};
    
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
                }
    
                for (var i=0; i < params.qstring.events.length; i++) {
                    var currEvent = params.qstring.events[i],
                        shortEventName = "",
                        eventCollectionName = "";
                    if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count) || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
                        continue;
                    }

                    if (plugins.getConfig("api").event_limit &&
                        appEvents.length >= plugins.getConfig("api").event_limit &&
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
        
                            if(omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey)!=-1)//check if segment should be ommited
                            {
                                continue;
                            }
                            
                            
                                if (plugins.getConfig("api").event_segmentation_limit &&
                                    appSegments[currEvent.key] &&
                                    appSegments[currEvent.key].indexOf(segKey) === -1 &&
                                    appSegments[currEvent.key].length >= plugins.getConfig("api").event_segmentation_limit) {
                                    continue;
                                }
                                
                                var tmpSegVal = currEvent.segmentation[segKey] + "";
            
                                if (tmpSegVal == "") {
                                    continue;
                                }
            
                                // Mongodb field names can't start with $ or contain .
                                tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");
            
                                if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                                    tmpSegVal = "[CLY]" + tmpSegVal;
                                }
                                var postfix = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];
                                metaToFetch[eventCollectionName + "no-segment_" + common.getDateIds(params).zero + "_" + postfix] = {
                                    coll: eventCollectionName,
                                    id: "no-segment_" + common.getDateIds(params).zero + "_" + postfix
                                };
                            
                        }
                    }
                }
    
                async.map(Object.keys(metaToFetch), fetchEventMeta, function (err, eventMetaDocs) {
                    var appSgValues = {};
    
                    for (var i = 0; i < eventMetaDocs.length; i++) {
                        if (eventMetaDocs[i].coll) {
                            if(eventMetaDocs[i].meta_v2){
                                if(!appSgValues[eventMetaDocs[i].coll])
                                    appSgValues[eventMetaDocs[i].coll] = {};
                                if(!appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id])
                                    appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id] = {};
                                for(var segment in eventMetaDocs[i].meta_v2){
                                    appSgValues[eventMetaDocs[i].coll][eventMetaDocs[i]._id][segment] = Object.keys(eventMetaDocs[i].meta_v2[segment]);
                                }
                            }
                        }
                    }
    
                    processEvents(appEvents, appSegments, appSgValues, params,omitted_segments, resolve);
                });
    
                function fetchEventMeta(id, callback) {
                    common.db.collection(metaToFetch[id].coll).findOne({'_id':metaToFetch[id].id}, {meta_v2:1}, function (err, eventMetaDoc) {
                        var retObj = eventMetaDoc || {};
                        retObj.coll = metaToFetch[id].coll;
    
                        callback(false, retObj);
                    });
                }
            });
        });
    };

    function processEvents(appEvents, appSegments, appSgValues, params,omitted_segments, done) {
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
            if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count) || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
                continue;
            }

            if (plugins.getConfig("api").event_limit &&
                appEvents.length >= plugins.getConfig("api").event_limit &&
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
            var time = params.time;
            if (params.qstring.events[i].timestamp) {
                params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
            }

            common.arrayAddUniq(events, shortEventName);

            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                currEvent.sum = parseFloat(parseFloat(currEvent.sum).toFixed(5));
                common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap['sum'], currEvent.sum);
            }
            
            if (currEvent.dur && common.isNumber(currEvent.dur)) {
                currEvent.dur = parseFloat(currEvent.dur);
                common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap['dur'], currEvent.dur);
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
                    if(omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey)!=-1)//check if segment should be ommited
                    {
                        continue;   
                    }
                    
                        if (plugins.getConfig("api").event_segmentation_limit &&
                            appSegments[currEvent.key] &&
                            appSegments[currEvent.key].indexOf(segKey) === -1 &&
                            appSegments[currEvent.key].length >= plugins.getConfig("api").event_segmentation_limit) {
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
                        
                        var postfix = common.crypto.createHash("md5").update(tmpSegVal).digest('base64')[0];

                        if (plugins.getConfig("api").event_segmentation_value_limit &&
                            appSgValues[eventCollectionName] &&
                            appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix] &&
                            appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey] &&
                            appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey].indexOf(tmpSegVal) === -1 &&
                            appSgValues[eventCollectionName]["no-segment" + "_" + dateIds.zero + "_" + postfix][segKey].length >= plugins.getConfig("api").event_segmentation_value_limit) {
                            continue;
                        }

                        if (currEvent.sum && common.isNumber(currEvent.sum)) {
                            common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['sum'], currEvent.sum);
                        }
                        
                        if (currEvent.dur && common.isNumber(currEvent.dur)) {
                            common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['dur'], currEvent.dur);
                        }

                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['count'], currEvent.count);

                        if (!eventSegmentsZeroes[eventCollectionName]) {
                            eventSegmentsZeroes[eventCollectionName] = [];
                            common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + "." + postfix);
                        } else {
                            common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + "." + postfix);
                        }
                        
                    if (!eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]) {
                        eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix] = {};
                    }
                        
                    eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]['meta_v2.' + segKey + '.' + tmpSegVal]= true;
                    eventSegments[eventCollectionName + "." + dateIds.zero + "." + postfix]["meta_v2.segments."+segKey] = true;
     
                    tmpEventColl[segKey + "." + dateIds.month + "." + postfix] = tmpEventObj;
                }
                
            }

            if (!eventCollections[eventCollectionName]) {
                eventCollections[eventCollectionName] = {};
            }

            mergeEvents(eventCollections[eventCollectionName], tmpEventColl);
            
            //switch back to request time
            params.time = time;
        }

        if (!plugins.getConfig("api").safe) {
            for (var collection in eventCollections) {
                if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                    for (var i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                        var zeroId = "";

                        if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                           continue;
                        } else {
                            zeroId = eventSegmentsZeroes[collection][i];
                        }
                        eventSegments[collection + "." +  zeroId].m = zeroId.split(".")[0];
                        eventSegments[collection + "." +  zeroId].s = "no-segment";
                        common.db.collection(collection).update({'_id': "no-segment_" + zeroId.replace(".", "_")}, {$set: eventSegments[collection + "." +  zeroId]}, {'upsert': true}, function(err, res) {});
                    }
                }

                for (var segment in eventCollections[collection]) {
                    var collIdSplits = segment.split("."),
                        collId = segment.replace(/\./g,"_");
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
                        
                        eventSegments[collection + "." +  zeroId].m = zeroId.split(".")[0];
                        eventSegments[collection + "." +  zeroId].s = "no-segment";

                        eventDocs.push({
                            "collection": collection,
                            "_id": "no-segment_" + zeroId.replace(".", "_"),
                            "updateObj": {$set: eventSegments[collection + "." +  zeroId]}
                        });
                    }
                }

                for (var segment in eventCollections[collection]) {
                    var collIdSplits = segment.split("."),
                        collId = segment.replace(/\./g,"_");

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
                        if(!params.bulk) 
                            common.returnMessage(params, 500, 'Failure');
                    });
                } else if(!params.bulk) {
                    common.returnMessage(params, 200, 'Success');
                }
            });

            function updateEventDb(eventDoc, callback) {
                common.db.collection(eventDoc.collection).update({'_id': eventDoc._id}, eventDoc.updateObj, {'upsert': true, 'safe': true}, function(err, result) {
                    if (!err && result && result.result && result.result.ok == 1) {
                        callback(false, {status: "ok", obj: eventDoc});
                    } else {
                        callback(false, {status: "failed", obj: eventDoc});
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
                
                if (eventSegments[event]) {
                    for(var segment in eventSegments[event]){
                        if(segment.indexOf("meta_v2.segments.") === 0){
                            var name = segment.replace("meta_v2.segments.", "");
                            if (eventSegmentList['$addToSet']["segments." + realEventKey] && eventSegmentList['$addToSet']["segments." + realEventKey]["$each"]) {
                                common.arrayAddUniq(eventSegmentList['$addToSet']["segments." + realEventKey]["$each"], name);
                            } else {
                                eventSegmentList['$addToSet']["segments." + realEventKey] = {$each:[name]};
                            }
                        }
                    }
                }
            }

            common.db.collection('events').update({'_id': params.app_id}, eventSegmentList, {'upsert': true}, function(err, res){});
        }
        done();
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