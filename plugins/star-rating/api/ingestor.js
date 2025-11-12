var plugins = require('../../pluginManager.js');
var requestProcessor = require('../../../api/ingestor/requestProcessor');
var common = require('../../../api/utils/common.js');

plugins.internalEvents.push('[CLY]_star_rating');
plugins.internalDrillEvents.push("[CLY]_star_rating");
plugins.internalOmitSegments["[CLY]_star_rating"] = ["email", "comment", "widget_id", "contactMe"];

plugins.register("/sdk/process_user", function(ob) {
    var params = ob.params;
    if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
        for (var z = 0; z < params.qstring.events.length; z++) {
            if (params.qstring.events[z].key === "[CLY]_star_rating") {
                var currEvent = params.qstring.events[z];
                currEvent.segmentation.platform = currEvent.segmentation.platform || "undefined"; //because we have a lot of old data with undefined
                currEvent.segmentation.rating = currEvent.segmentation.rating || "undefined";
                currEvent.segmentation.ratingSum = Number(currEvent.segmentation.rating) || 0;
                currEvent.segmentation.widget_id = currEvent.segmentation.widget_id || "undefined";
                currEvent.segmentation.app_version = currEvent.segmentation.app_version || "undefined";
                currEvent.segmentation.platform_version_rate = currEvent.segmentation.platform + "**" + currEvent.segmentation.app_version + "**" + currEvent.segmentation.rating + "**" + currEvent.segmentation.widget_id + "**";
                currEvent.name = currEvent.segmentation.widget_id;
                // is provided email & comment fields
            }
        }
    }
});

var nonChecksumHandler = function(ob) {
    try {
        var events = JSON.parse(ob.params.qstring.events);
        if (events.length !== 1 || events[0].key !== "[CLY]_star_rating") {
            common.returnMessage(ob.params, 400, 'invalid_event_request');
            return false;
        }
        else {
            var params = {
                no_checksum: true,
                //providing data in request object
                'req': {
                    url: "/i?" + ob.params.href.split("/i/feedback/input?")[1]
                },
                //adding custom processing for API responses
                'APICallback': function(err, responseData, headers, returnCode) {
                    //sending response to client
                    if (returnCode === 200) {
                        common.returnOutput(ob.params, JSON.parse(responseData));
                        return true;
                    }
                    else {
                        common.returnMessage(ob.params, returnCode, JSON.parse(responseData).result);
                        return false;
                    }
                }
            };
            requestProcessor.processRequest(params);
            return true;
        }
    }
    catch (jsonParseError) {
        common.returnMessage(ob.params, 400, 'invalid_event_request');
        return false;
    }
};

plugins.register("/i/feedback/input", nonChecksumHandler);