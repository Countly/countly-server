/**
 *  Description: Creates CSV file of document counts per month from drill data
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node export_monthly_doc_count.js
 */


// const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const fs = require('fs');

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');

const app_list = []; //valid app_ids here. If empty array passed, script will process all apps.
const path = './'; //path to save csv files

const headerMap = {
    "app_name": "App Name",
    "event_name": "Event Name",
    "month": "Creation Date",
    "doc_count": "Count",
};

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            // CREATE WRITE STREAM
            const eventDetailsWriteStream = fs.createWriteStream(path + `/monthly_document_counts.csv`);
            var isFirst = true;

            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);

                try {
                    // GET EVENTS FOR CURRENT APP
                    var events = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    events = events && events.list || [];
                    // PROCESS EACH EVENT TO GET COLLECTION NAME
                    for (let j = 0; j < events.length; j++) {
                        var event = events[j];
                        console.log("Processing event:", event);
                        var collectionName = drillCommon.getCollectionName(event, app._id);

                        // FETCH, TRANSFORM, AND SET DATA
                        try {
                            const appName = app.name;
                            const eventName = event;
                            var cursor = drillDb.collection(collectionName).aggregate([
                                {
                                    $set: {
                                        app_name: appName,
                                        event_name: eventName,
                                    }
                                },
                                {
                                    $group: {
                                        _id: {
                                            $dateToString: {
                                                format: "%Y-%m",
                                                date: "$cd"
                                            }
                                        },
                                        count: {
                                            $sum: 1
                                        },
                                        app_name: { $first: "$app_name" },
                                        event_name: { $first: "$event_name" }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 0,
                                        app_name: "$app_name",
                                        event_name: "$event_name",
                                        month: "$_id",
                                        doc_count: "$count"
                                    }
                                }
                            ]);

                            var array = (await cursor.toArray());
                            const rows = array.map(obj => Object.values(obj).join(',')).join('\n');

                            // WRITE TO FILE
                            if (isFirst) {
                                isFirst = false;
                                const headerValues = Object.keys(array[0]).map(key => headerMap[key]);
                                eventDetailsWriteStream.write(headerValues.join(","));
                            }
                            if (rows && rows.length > 0) {
                                eventDetailsWriteStream.write("\n" + rows);
                            }
                        }
                        catch (err) {
                            console.log("Error converting data: ", err);
                        }
                    }
                }
                catch (err) {
                    console.log("Couldn't get events for app:", app.name, err);
                }
            }
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
        console.log("Done.");
    }
});