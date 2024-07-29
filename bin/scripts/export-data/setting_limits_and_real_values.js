/**
 *  Description: Creates JSON file of events, views, and custom user properties, their segments, and segment values.
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node setting_limits_and_real_values.js
 */

const { ObjectId } = require('mongodb');
const fs = require('fs');
const crypto = require('crypto');
const common = require('../../../api/utils/common.js');
const pathToFile = './'; // path to save json files
const WriteStream = fs.createWriteStream(pathToFile + `setting_limits_and_values.json`);
const pluginManager = require('../../../plugins/pluginManager.js');
const app_list = []; // valid app_ids here. If empty array passed, script will process all apps.
const DEFAULTS = {
    event_limit: 500,
    event_segment_limit: 100,
    event_segment_value_limit: 1000,
    view_limit: 50000,
    view_name_limit: 128,
    view_segment_limit: 100,
    view_segment_value_limit: 10,
    custom_prop_limit: 20,
    custom_prop_value_limit: 50,
};

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        var all_results = [];
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            // GETTING DATA FOR SET LIMITS FOR EVENTS, VIEWS, AND CUSTOM PROPERTIES
            var pluginsCollectionPlugins = await countlyDb.collection("plugins").findOne({"_id": 'plugins'});

            // LOOP APPS FOR EACH REQUIREMENT
            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);

                try {
                    var app_results = { "App Name": app.name },
                        defaultVal,
                        realVal,
                        currentVal;

                    // GETTING DATA PER APP
                    var eventsCollectionPerApp = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    var viewsCollectionPerApp = await countlyDb.collection("app_viewsmeta" + app._id).find().toArray();
                    var viewsSegmentsPerApp = await countlyDb.collection("views").aggregate([
                        {
                            $match: { "_id": ObjectId(app._id) }
                        },
                        {
                            "$addFields": {
                                "segments": {
                                    "$objectToArray": "$segments"
                                }
                            }
                        },
                        {
                            "$project": {
                                "_id": 0,
                                "segments": {
                                    "$arrayToObject": {
                                        "$map": {
                                            "input": "$segments",
                                            "as": "field",
                                            "in": {
                                                "k": "$$field.k",
                                                "v": { "$size": { "$objectToArray": "$$field.v" } }
                                            }
                                        }
                                    }
                                },
                                "numberOfSegments": { "$size": "$segments" },
                            }
                        },
                    ]).toArray();
                    var customPropsPerApp = await drillDb.collection("drill_meta").aggregate([
                        {
                            $match: { "_id": app._id + "_meta_up" }
                        },
                        {
                            $project: {
                                customProperties: { $objectToArray: "$custom" }
                            }
                        },
                        {
                            $unwind: "$customProperties"
                        },
                        {
                            $group: {
                                _id: "$_id",
                                customPropertiesCount: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                customPropertiesCount: 1
                            }
                        }
                    ]).toArray();
                    var valueFieldCounts = await drillDb.collection("drill_meta").aggregate([
                        {
                            $match: { "_id": { $regex: "^" + app._id + "_meta_up_custom.*" } }
                        },
                        {
                            $project: {
                                field: { $arrayElemAt: [{ $split: ["$_id", "."] }, -1] },
                                valueFieldCount: { $size: { $objectToArray: "$values" } }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                fields: {
                                    $push: {
                                        k: "$field",
                                        v: "$valueFieldCount"
                                    }
                                }
                            }
                        },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $arrayToObject: "$fields"
                                }
                            }
                        }
                    ]).toArray();
                }
                catch (err) {
                    console.log("Mongodb operation failed for app: ", app.name, err);
                }

                // EVENT KEYS
                defaultVal = DEFAULTS.event_limit;

                let realEvents = eventsCollectionPerApp && eventsCollectionPerApp.list || [];
                realVal = realEvents.length;

                let currentEventLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.api && pluginsCollectionPlugins.api.event_limit || undefined;
                currentVal = currentEventLimit;

                app_results['Event Keys'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // SEGMENTS IN ONE EVENT
                defaultVal = DEFAULTS.event_segment_limit;

                let currentEventSegmentLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.api && pluginsCollectionPlugins.api.event_segmentation_limit || undefined;
                currentVal = currentEventSegmentLimit;

                let eventSegments = eventsCollectionPerApp && eventsCollectionPerApp.segments || {};
                realVal = Object.entries(eventSegments)
                    .sort((a, b) => b[1].length - a[1].length)
                    .reduce((acc, [key, value]) => {
                        acc[key] = value.length;
                        return acc;
                    }, {});

                app_results['Event Segments'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // UNIQUE EVENT SEGMENT VALUES FOR 1 SEGMENT
                defaultVal = DEFAULTS.event_segment_value_limit;

                let currentEventSegmentValueLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.api && pluginsCollectionPlugins.api.event_segmentation_value_limit || undefined;
                currentVal = currentEventSegmentValueLimit;
                realVal = {};
                await Promise.all(realEvents.map(async(event) => {
                    var shortEventName = common.fixEventKey(event);
                    var eventCollectionName = "events" + crypto.createHash('sha1').update(shortEventName + app._id).digest('hex');

                    try {
                        var eventsSegmentsValues = await countlyDb.collection(eventCollectionName).aggregate([
                            {
                                "$match": {
                                    "_id": { "$regex": "^no-segment_2024:0.*" }
                                }
                            },
                            {
                                "$addFields": {
                                    "meta_v2": {
                                        "$objectToArray": "$meta_v2"
                                    }
                                }
                            },
                            {
                                "$project":
                                {"meta_v2": {"$map": {"input": "$meta_v2", "in": {"k": "$$this.k", "v": {"$size": {"$objectToArray": "$$this.v"}}}}}}
                            },
                            {
                                "$unwind": "$meta_v2"
                            },
                            {
                                "$match": {
                                    "meta_v2.k": { "$ne": "segments" }
                                }
                            },
                            {
                                "$group": {
                                    "_id": null,
                                    "fields": {
                                        "$push": {
                                            "k": "$meta_v2.k",
                                            "v": "$meta_v2.v"
                                        }
                                    }
                                }
                            },
                            {
                                "$replaceRoot": {
                                    "newRoot": {
                                        "$arrayToObject": {
                                            "$map": {
                                                "input": "$fields",
                                                "as": "field",
                                                "in": {
                                                    "k": "$$field.k",
                                                    "v": "$$field.v"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        ]).toArray();
                        realVal[event] = eventsSegmentsValues && eventsSegmentsValues[0];
                    }
                    catch (err) {
                        console.log("Unique event segment values aggregation failed with error: " + err);
                    }
                }));
                app_results['Unique Event Segment Values'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // UNIQUE VIEV NAMES
                defaultVal = DEFAULTS.view_limit;

                let currentViewLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.views && pluginsCollectionPlugins.views.view_limit || undefined;
                currentVal = currentViewLimit;

                realVal = viewsCollectionPerApp.length;

                app_results['Unique View Names'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // VIEW NAME LENGTH LIMIT
                defaultVal = DEFAULTS.view_name_limit;

                let currentViewNameLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.views && pluginsCollectionPlugins.views.view_name_limit || undefined;
                currentVal = currentViewNameLimit;

                realVal = {longestViewName: "", longestViewLength: -1};
                let viewsDocuments = viewsCollectionPerApp;
                viewsDocuments.forEach(document => {
                    if (document && document.view) {
                        if (realVal.longestViewLength < document.view.length) {
                            realVal.longestViewLength = document.view.length;
                            realVal.longestViewName = document.view;
                        }
                    }
                });

                app_results['View Name Length Limit'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // SEGMENTS IN ONE VIEW
                defaultVal = DEFAULTS.view_segment_limit;

                let currentViewSegmentLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.views && pluginsCollectionPlugins.views.segment_limit || undefined;
                currentVal = currentViewSegmentLimit;

                realVal = viewsSegmentsPerApp && viewsSegmentsPerApp[0] && viewsSegmentsPerApp[0].numberOfSegments || 0;

                app_results['View Segments'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // VIEW SEGMENT'S UNIQUE VALUES
                defaultVal = DEFAULTS.view_segment_value_limit;

                let currentViewSegmentValueLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.views && pluginsCollectionPlugins.views.segment_value_limit || undefined;
                currentVal = currentViewSegmentValueLimit;

                realVal = viewsSegmentsPerApp && viewsSegmentsPerApp[0] && viewsSegmentsPerApp[0].segments || 0;

                app_results['View Segments Unique Values'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // USER PROPERTIES
                defaultVal = DEFAULTS.custom_prop_limit;

                let currentCustomPropertyLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.users && pluginsCollectionPlugins.users.custom_prop_limit || undefined;
                currentVal = currentCustomPropertyLimit;

                realVal = customPropsPerApp && customPropsPerApp[0] && customPropsPerApp[0].customPropertiesCount || 0;
                app_results['Custom User Properties'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // VALUES IN AN ARRAY FOR ONE USER PROPERTY
                defaultVal = DEFAULTS.custom_prop_value_limit;

                let currentCustomPropertyValueLimit = pluginsCollectionPlugins && pluginsCollectionPlugins.users && pluginsCollectionPlugins.users.custom_set_limit || undefined;
                currentVal = currentCustomPropertyValueLimit;

                realVal = valueFieldCounts && valueFieldCounts[0] || undefined;
                app_results['Values In Array For One User Property'] = {"default": defaultVal, "set": currentVal, "real": realVal};

                // PUSH APP SPECIFIC RESULTS TO ARRAY
                all_results.push(app_results);
            }

            // CREATE WRITE STREAM AND WRITE IT ALL TO JSON/CSV FILE
            WriteStream.write(JSON.stringify(all_results, null, 2), 'utf8', () => {
                console.log('Data has been written to the file.');
            });
        }
    }
    catch (err) {
        close(err);
    }
    finally {
        close();
    }

    async function getAppList(options) {
        var query = {};
        if (app_list && app_list.length > 0) {
            var listed = [];
            for (var z = 0; z < app_list.length; z++) {
                listed.push(ObjectId(app_list[z]));
            }
            query = {_id: {$in: listed}};
        }

        try {
            let apps = await options.db.collection("apps").find(query).toArray();
            return apps;
        }
        catch (err) {
            console.log("Error getting apps: ", err);
            return [];
        }

    }

    function close(err) {
        if (err) {
            console.log("Error: ", err);
        }
        countlyDb.close();
        drillDb.close();
        WriteStream.end();
        console.log("Done.");
    }
});