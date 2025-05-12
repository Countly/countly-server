/**
 *  Checks aggregated data for all events of all apps and outputs the ones that should need omitting segments. 
 *  For deletion to work SERVER_URL and API_KEY should be set.
 *  If DRY_RUN is false, will also omit those segmentes
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/modify-data
 *  Command: nodejs omit_events.js
 */

//API key with global admin rights
var API_KEY = "";
//dry run without deleting events
var DRY_RUN = true;
var SERVER_URL = "https://yourserver.count.ly";

var requestsToRun = [];
var omitLimit = 100; //Segment value limit
var failedReqs = 0;

var plugins = require("../../../plugins/pluginManager");
var crypto = require('crypto');
var request = require('countly-request')(plugins.getConfig("security"));

if (!SERVER_URL) {
    SERVER_URL = (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost");
}
plugins.dbConnection().then(async function(db) {
    var apps = await db.collection("apps").find().toArray();
    var appCheck = {};
    for (var l = 0; l < apps.length; l++) {
        appCheck[apps[l]._id] = apps[l].name;
    }
    var events = await db.collection("events").find().toArray();
    for (var i = 0; i < events.length; i++) {
        var firstApp = true;
        var omitted_segments = {};
        var event_map = {};
        if (events[i] && events[i].list && events[i].list.length) {
            console.log("Checking app:", events[i]._id);
            for (var j = 0; j < events[i].list.length; j++) {
                if (events[i].list[j]) {
                    console.log("    Checking event:", events[i].list[j]);
                    var eventSegmentCounts = {};
                    var hash = crypto.createHash('sha1').update(events[i].list[j] + events[i]._id).digest('hex');
                    var pipeline = [
                        {"$match": {"_id": {"$regex": "^" + events[i]._id + "_" + hash + "_no-segment_.*"}, "meta_v2": {"$exists": true}}},
                        {
                            "$project": {
                                "m": "$m",
                                "meta_v2": {
                                    "$map": {
                                        "input": {"$objectToArray": "$meta_v2"},
                                        "as": "seg",
                                        "in": {"k": "$$seg.k", "v": {"$size": {"$objectToArray": "$$seg.v"}}}
                                    }
                                }
                            }
                        },
                        {"$unwind": "$meta_v2"},
                        {
                            "$group": {
                                "_id": {"key": "$meta_v2.k", "m": "$m"},
                                "count": {"$sum": "$meta_v2.v"}
                            }
                        }
                    ];
                    var eventMeta = await db.collection("events_data").aggregate(pipeline).toArray();
                    for (var k = 0; k < eventMeta.length; k++) {
                        if (eventMeta[k]._id.key !== "segments") {
                            eventSegmentCounts[eventMeta[k]._id.key] = eventSegmentCounts[eventMeta[k]._id.key] || 0;
                            eventSegmentCounts[eventMeta[k]._id.key] = Math.max(eventMeta[k].count, eventSegmentCounts[eventMeta[k]._id.key]);
                        }

                    }
                    var first = true;
                    //console.log("Event:", events[i].list[j], "for app:", events[i]._id);
                    for (let segment in eventSegmentCounts) {
                        if (eventSegmentCounts[segment] >= omitLimit) {
                            if (first) {
                                if (firstApp) {
                                    firstApp = false;
                                }
                                first = false;
                            }
                            if (events[i] && events[i].omitted_segments && events[i].omitted_segments[events[i].list[j]] && Array.isArray(events[i].omitted_segments[events[i].list[j]])) {
                                omitted_segments[events[i].list[j]] = events[i].omitted_segments[events[i].list[j]];
                            }
                            if (!omitted_segments[events[i].list[j]]) {
                                omitted_segments[events[i].list[j]] = [];
                            }
                            if (omitted_segments[events[i].list[j]].indexOf(segment) === -1) {
                                omitted_segments[events[i].list[j]].push(segment);
                            }

                            if (events[i] && events[i].map && events[i].map[events[i].list[j]]) {
                                event_map[events[i].list[j]] = events[i].map[events[i].list[j]];
                                event_map[events[i].list[j]].omit_list = events[i].map[events[i].list[j]].omit_list || [];
                            }
                            if (!event_map[events[i].list[j]]) {
                                event_map[events[i].list[j]] = {key: events[i].list[j], is_visible: true, omit_list: []};
                            }
                            if (event_map[events[i].list[j]] && event_map[events[i].list[j]].omit_list && event_map[events[i].list[j]].omit_list.indexOf(segment) === -1) {
                                event_map[events[i].list[j]].omit_list.push(segment);
                            }
                        }
                    }
                }
            }
        }
        console.log("  Current event map:", JSON.stringify(event_map));
        if (Object.keys(omitted_segments).length) {
            if (DRY_RUN) {
                //as it is dry run  - output request
                var props = [
                    "omitted_segments=" + JSON.stringify(omitted_segments),
                    "event_map=" + JSON.stringify(event_map),
                    "app_id=" + events[i]._id,
                    "api_key=" + API_KEY
                ];
                requestsToRun.push(SERVER_URL + "/i/events/edit_map?" + props.join("&"));
            }
            else {
                console.log("Omitting segments for app:", events[i]._id, "for events:", JSON.stringify(omitted_segments));
                const options = {
                    url: SERVER_URL + "/i/events/edit_map",
                    uri: SERVER_URL + "/i/events/edit_map",
                    method: "POST",
                    json: {
                        omitted_segments: JSON.stringify(omitted_segments),
                        event_map: JSON.stringify(event_map),
                        app_id: events[i]._id + "",
                        api_key: API_KEY
                    },
                    strictSSL: false
                };
                await new Promise(function(resolve) {
                    request(SERVER_URL + "/i/events/edit_map", options, function(error) {
                        if ((error && error.name)) {
                            failedReqs++;
                            console.log(JSON.stringify(error.message));
                            console.log({err: 'There was an error while sending a request.'});
                        }

                        resolve();
                    });
                });
            }
        }
    }
    if (failedReqs) {
        console.log("There were " + failedReqs + " failed requests. Please check your API KEY and url for server");
    }
    if (requestsToRun.length) {
        for (var z = 0; z < requestsToRun.length; z++) {
            console.log(requestsToRun[z]);
        }
    }
    console.log("Done");
    db.close();
});