/**
 *  Checks aggregated data for all events of all apps and outputs the ones that should need omitting segments. 
 *  If DRY_RUN is false, will also omit those segmentes
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/modify-data
 *  Command: nodejs omit_events.js
 */

//API key here with permission to delete events
var API_KEY = "0d87fb49bd48ddc510306b7b4faf209a";

//dry run without deleting events
var DRY_RUN = true;



var plugins = require("../../../plugins/pluginManager");
var crypto = require('crypto');
var request = require('request');
var requestOptions = {
    uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + "/i/events/edit_map",
    method: 'POST'
};
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
            for (var j = 0; j < events[i].list.length; j++) {
                if (events[i].list[j]) {
                    var eventSegmentCounts = {};
                    var eventMeta = await db.collection("events" + crypto.createHash('sha1').update(events[i].list[j] + events[i]._id).digest('hex')).find({"m": "2022:0"}).toArray();
                    for (var k = 0; k < eventMeta.length; k++) {
                        if (eventMeta[k] && eventMeta[k].meta_v2 && eventMeta[k].meta_v2.segments) {
                            for (let segment in eventMeta[k].meta_v2.segments) {
                                if (eventMeta[k].meta_v2[segment]) {
                                    if (typeof eventSegmentCounts[segment] === "undefined") {
                                        eventSegmentCounts[segment] = 0;
                                    }
                                    eventSegmentCounts[segment] += Object.keys(eventMeta[k].meta_v2[segment]).length;
                                }
                            }
                        }
                    }
                    var first = true;
                    //console.log("Event:", events[i].list[j], "for app:", events[i]._id);
                    for (let segment in eventSegmentCounts) {
                        if (eventSegmentCounts[segment] >= 1000) {
                            if (first) {
                                if (firstApp) {
                                    console.log("For app:", appCheck[events[i]._id] || events[i]._id);
                                    firstApp = false;
                                }
                                console.log("", "Event:", events[i].list[j]);
                                first = false;
                            }
                            console.log("", "", segment, ":", eventSegmentCounts[segment]);
                            if (!omitted_segments[events[i].list[j]]) {
                                omitted_segments[events[i].list[j]] = [];
                            }
                            omitted_segments[events[i].list[j]].push(segment);
                            if (!event_map[events[i].list[j]]) {
                                event_map[events[i].list[j]] = {key: events[i].list[j], is_visible: true, omit_list: []};
                            }
                            event_map[events[i].list[j]].omit_list.push(segment);
                        }
                    }
                }
            }
        }
        if (Object.keys(omitted_segments).length && !DRY_RUN) {
            requestOptions.json = {
                omitted_segments: JSON.stringify(omitted_segments),
                event_map: JSON.stringify(event_map),
                app_id: events[i]._id,
                api_key: API_KEY
            };
            await new Promise(function(resolve) {
                request(requestOptions, function(error, response, body) {
                    console.log("request finished", body);
                    resolve();
                });
            });
        }
    }
    db.close();
});