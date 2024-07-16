/**
 *  Description: Creates CSV file of document counts per month from drill data
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node export_monthly_doc_count.js
 */


const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const { Parser } = require('json2csv');
const fs = require('fs');

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');
const countlyCommon = require('../../../api/lib/countly.common.js');

const app_list = []; //valid app_ids here. If empty array passed, script will process all apps.
const internalDrillEvents = ["[CLY]_session", "[CLY]_crash", "[CLY]_view", "[CLY]_action", "[CLY]_push_action", "[CLY]_push_sent", "[CLY]_star_rating", "[CLY]_nps", "[CLY]_survey", "[CLY]_apm_network", "[CLY]_apm_device", "[CLY]_consent"];
const pathToFile = './'; //path to save csv files
const period = 'all'; //supported values are 60days, 30days, 7days, yesterday, all, or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000]
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
            const eventDetailsWriteStream = fs.createWriteStream(pathToFile + `monthly_document_counts.csv`);
            var isFirst = true;
            // CREATE PARSER
            const fileParser = new Parser({fields: Object.keys(headerMap), header: false});

            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);
                try {
                    // GET EVENTS FOR CURRENT APP INCLUDING COUNTLY INTERNAL EVENTS
                    var events = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    events = events && events.list || [];
                    if (internalDrillEvents && internalDrillEvents.length) {
                        events.push(...internalDrillEvents);
                    }
                    // PROCESS EACH EVENT TO GET COLLECTION NAME
                    for (let j = 0; j < events.length; j++) {
                        var event = events[j];
                        console.log("Processing event:", event);
                        var collectionName = drillCommon.getCollectionName(event, app._id);
                        // SET PERIOD AND QUERY
                        let query = {};
                        if (period !== 'all') {
                            var periodObj = countlyCommon.periodObj;
                            let cd = {};

                            let tmpArr = periodObj.currentPeriodArr[0].split(".");
                            cd.$gte = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2]))));
                            cd.$gte = cd.$gte.valueOf() - cd.$gte.utcOffset() * 60000;
                            cd.$gte = moment(cd.$gte).toDate();

                            tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
                            cd.$lt = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])))).add(1, 'days');
                            cd.$lt = cd.$lt.valueOf() - cd.$lt.utcOffset() * 60000;
                            cd.$lt = moment(cd.$lt).toDate();

                            query.cd = cd;
                        }
                        // FETCH, TRANSFORM, AND SET DATA
                        try {
                            const appName = app.name;
                            const eventName = event;
                            var result = await drillDb.collection(collectionName).aggregate([
                                {
                                    $match: { "cd": { $ne: 0 } }
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
                                        }
                                    }
                                },
                                {
                                    $set: {
                                        app_name: appName,
                                        event_name: eventName,
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
                            ], {allowDiskUse: true}).toArray();
                            // SAVE TO FILE
                            if (isFirst) {
                                eventDetailsWriteStream.write(Object.values(headerMap).join(",") + "\n");
                                isFirst = false;
                            }
                            if (result && result.length > 0) {
                                eventDetailsWriteStream.write(fileParser.parse(result));
                                eventDetailsWriteStream.write("\n");
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