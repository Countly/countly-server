var events = {},
    common = require('./../../utils/common.js'),
    async = require('./../../utils/async.min.js');

(function (events) {

    events.processEvents = function(params) {
        var events = [],
            eventCollections = {},
            eventSegments = {},
            tmpEventObj = {},
            tmpEventColl = {},
            shortCollectionName = "",
            eventCollectionName = "";

        for (var i=0; i < params.qstring.events.length; i++) {

            var currEvent = params.qstring.events[i];
            tmpEventObj = {};
            tmpEventColl = {};

            // Key and count fields are required
            if (!currEvent.key || !currEvent.count || !common.isNumber(currEvent.count)) {
                continue;
            }

            // Mongodb collection names can not contain system. or $
            shortCollectionName = currEvent.key.replace(/system\.|\.\.|\$/g, "");
            eventCollectionName = shortCollectionName + params.app_id;

            // Mongodb collection names can not be longer than 128 characters
            if (eventCollectionName.length > 128) {
                continue;
            }

            // If present use timestamp inside each event while recording
            if (params.qstring.events[i].timestamp) {
                params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
            }

            common.arrayAddUniq(events, shortCollectionName);

            if (currEvent.sum && common.isNumber(currEvent.sum)) {
                common.fillTimeObject(params, tmpEventObj, common.dbMap['sum'], currEvent.sum);
            }
            common.fillTimeObject(params, tmpEventObj, common.dbMap['count'], currEvent.count);

            tmpEventColl["no-segment"] = tmpEventObj;

            if (currEvent.segmentation) {
                for (var segKey in currEvent.segmentation) {

                    if (!currEvent.segmentation[segKey]) {
                        continue;
                    }

                    tmpEventObj = {};
                    var tmpSegVal = currEvent.segmentation[segKey] + "";

                    // Mongodb field names can't start with $ or contain .
                    tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");

                    if (currEvent.sum && common.isNumber(currEvent.sum)) {
                        common.fillTimeObject(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['sum'], currEvent.sum);
                    }
                    common.fillTimeObject(params, tmpEventObj, tmpSegVal + '.' + common.dbMap['count'], currEvent.count);

                    if (!eventSegments[eventCollectionName]) {
                        eventSegments[eventCollectionName] = {};
                    }

                    if (!eventSegments[eventCollectionName]['meta.' + segKey]) {
                        eventSegments[eventCollectionName]['meta.' + segKey] = {};
                    }

                    if (eventSegments[eventCollectionName]['meta.' + segKey]["$each"] && eventSegments[eventCollectionName]['meta.' + segKey]["$each"].length) {
                        common.arrayAddUniq(eventSegments[eventCollectionName]['meta.' + segKey]["$each"], tmpSegVal);
                    } else {
                        eventSegments[eventCollectionName]['meta.' + segKey]["$each"] = [tmpSegVal];
                    }

                    if (!eventSegments[eventCollectionName]["meta.segments"]) {
                        eventSegments[eventCollectionName]["meta.segments"] = {};
                        eventSegments[eventCollectionName]["meta.segments"]["$each"] = [];
                    }

                    common.arrayAddUniq(eventSegments[eventCollectionName]["meta.segments"]["$each"], segKey);
                    tmpEventColl[segKey] = tmpEventObj;
                }
            } else if (currEvent.seg_val && currEvent.seg_key) {
                tmpEventObj = {};

                // Mongodb field names can't start with $ or contain .
                currEvent.seg_val = currEvent.seg_val.replace(/^\$/, "").replace(/\./g, ":");

                if (currEvent.sum && common.isNumber(currEvent.sum)) {
                    common.fillTimeObject(params, tmpEventObj, currEvent.seg_val + '.' + common.dbMap['sum'], currEvent.sum);
                }
                common.fillTimeObject(params, tmpEventObj, currEvent.seg_val + '.' + common.dbMap['count'], currEvent.count);

                if (!eventSegments[eventCollectionName]) {
                    eventSegments[eventCollectionName] = {};
                }

                if (!eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]) {
                    eventSegments[eventCollectionName]['meta.' + currEvent.seg_key] = {};
                }

                if (eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]["$each"] && eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]["$each"].length) {
                    common.arrayAddUniq(eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]["$each"], currEvent.seg_val);
                } else {
                    eventSegments[eventCollectionName]['meta.' + currEvent.seg_key]["$each"] = [currEvent.seg_val];
                }

                if (!eventSegments[eventCollectionName]["meta.segments"]) {
                    eventSegments[eventCollectionName]["meta.segments"] = {};
                    eventSegments[eventCollectionName]["meta.segments"]["$each"] = [];
                }

                common.arrayAddUniq(eventSegments[eventCollectionName]["meta.segments"]["$each"], currEvent.seg_key);
                tmpEventColl[currEvent.seg_key] = tmpEventObj;
            }

            if (!eventCollections[eventCollectionName]) {
                eventCollections[eventCollectionName] = {};
            }

            mergeEvents(eventCollections[eventCollectionName], tmpEventColl);
        }

        if (!common.config.api.safe) {
            for (var collection in eventCollections) {
                for (var segment in eventCollections[collection]) {
                    if (segment == "no-segment" && eventSegments[collection]) {
                        common.db.collection(collection).update({'_id': segment}, {'$inc': eventCollections[collection][segment], '$addToSet': eventSegments[collection]}, {'upsert': true});
                    } else {
                        common.db.collection(collection).update({'_id': segment}, {'$inc': eventCollections[collection][segment]}, {'upsert': true});
                    }
                }
            }
        } else {
            var eventDocs = [];

            for (var collection in eventCollections) {
                for (var segment in eventCollections[collection]) {
                    eventDocs.push({c: collection, s: segment});
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
                if (eventDoc.s == "no-segment" && eventSegments[eventDoc.c]) {
                    common.db.collection(eventDoc.c).update({'_id': eventDoc.s}, {'$inc': eventCollections[eventDoc.c][eventDoc.s], '$addToSet': eventSegments[eventDoc.c]}, {'upsert': true, 'safe': true}, function(err, result) {
                        if (err || result != 1) {
                            callback(false, {status: "failed", obj: eventDoc});
                        } else {
                            callback(false, {status: "ok", obj: eventDoc});
                        }
                    });
                } else {
                    common.db.collection(eventDoc.c).update({'_id': eventDoc.s}, {'$inc': eventCollections[eventDoc.c][eventDoc.s]}, {'upsert': true, 'safe': true}, function(err, result) {
                        if (err || result != 1) {
                            callback(false, {status: "failed", obj: eventDoc});
                        } else {
                            callback(false, {status: "ok", obj: eventDoc});
                        }
                    });
                }
            }

            function rollbackEventDb(eventUpdateResult, callback) {
                if (eventUpdateResult.status == "failed") {
                    callback(false, {});
                } else {
                    var eventDoc = eventUpdateResult.obj;

                    common.db.collection(eventDoc.c).update({'_id': eventDoc.s}, {'$inc': getInvertedValues(eventCollections[eventDoc.c][eventDoc.s])}, {'upsert': false}, function(err, result) {});
                    callback(true, {});
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
                if (!eventSegmentList['$addToSet']["segments." + event.replace(params.app_id, "")]) {
                    eventSegmentList['$addToSet']["segments." + event.replace(params.app_id, "")] = {};
                }

                if (eventSegments[event]['meta.segments']) {
                    eventSegmentList['$addToSet']["segments." + event.replace(params.app_id, "")] = eventSegments[event]['meta.segments'];
                }
            }

            common.db.collection('events').update({'_id': params.app_id}, eventSegmentList, {'upsert': true}, function(err, res){});
        }
    };

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

}(events));

module.exports = events;
