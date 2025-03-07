var plugins = require('../../pluginManager.js');

plugins.register("/sdk/process_user", function(ob) {
    plugins.internalDrillEvents.push("[CLY]_star_rating");
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
                // is provided email & comment fields
            }
        }
    }
});