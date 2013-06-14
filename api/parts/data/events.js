var events = {},
    common = require('./../../utils/common.js');

(function (events) {

    events.processEvents = function(params) {
        if (!params.qstring.events) {
            return false;
        }

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
            shortCollectionName = currEvent.key.replace(/system\.|\$/g, "");
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

        for (var collection in eventCollections) {
            for (var segment in eventCollections[collection]) {
                if (segment == "no-segment") {
                    if (eventSegments[collection]) {
                        common.db.collection(collection).update({'_id': segment}, {'$inc': eventCollections[collection][segment], '$addToSet': eventSegments[collection]}, {'upsert': true});
                    } else {
                        common.db.collection(collection).update({'_id': segment}, {'$inc': eventCollections[collection][segment]}, {'upsert': true});
                    }
                } else {
                    common.db.collection(collection).update({'_id': segment}, {'$inc': eventCollections[collection][segment]}, {'upsert': true});
                }
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

            common.db.collection('events').update({'_id': params.app_id}, eventSegmentList, {'upsert': true});
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
