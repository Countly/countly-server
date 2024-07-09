/**
 *  Description: Creates 3 CSV files for drill data of the previous day
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node export_drill_data_csv.js
 */

const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const fs = require('fs');

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');
const countlyCommon = require('../../../api/lib/countly.common.js');

const app_list = []; //valid app_ids here. If empty array passed, script will process all apps.
const period = '60days'; // supported values are month, 60days, 30days, 7days, yesterday, hour, all, or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000]

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            //SET PERIOD
            if (period !== 'all') {
                countlyCommon.setPeriod(period);
            }
            var drill_info = [];

            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);
                drill_info[i] = {
                    app: app.name,
                    events: [],
                };

                //SET APP TIMEZONE
                countlyCommon.setTimezone(app.timezone);
                var periodObj = countlyCommon.periodObj;
                try {
                    //GET EVENTS FOR APP
                    var all_events = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    all_events = all_events && all_events.list || [];
                    //PROCESS EACH EVENT
                    var counter = 0;
                    for (let j = 0; j < all_events.length; j++) {
                        var event = all_events[j];
                        //QUERY TO GET DATA
                        let query = {};
                        if (period !== 'all') {
                            let ts = {};
                            let tmpArr = periodObj.currentPeriodArr[0].split(".");
                            ts.$gte = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2]))));
                            if (app.timezone) {
                                ts.$gte.tz(app.timezone);
                            }
                            ts.$gte = ts.$gte.valueOf() - ts.$gte.utcOffset() * 60000;

                            tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
                            ts.$lt = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])))).add(1, 'days');
                            if (app.timezone) {
                                ts.$lt.tz(app.timezone);
                            }
                            ts.$lt = ts.$lt.valueOf() - ts.$lt.utcOffset() * 60000;
                            query.ts = ts;
                        }
                        const projection = { _id: 0, m: 1, cd: 1};

                        var collectionName = drillCommon.getCollectionName(event, app._id);
                        await drillDb.collection(collectionName).count(query).then(async(documentCount) => {
                            //SKIP EMPTY COLLECTIONS (PERIOD QUERY)
                            if (documentCount) {
                                drill_info[i].events.push(
                                    {
                                        event: event,
                                        doc_count: documentCount,
                                        docs: [],
                                    }
                                );
                                //FETCH DATA
                                try {
                                    var cursor = drillDb.collection(collectionName).find(query).project(projection);
                                    while (await cursor.hasNext()) {
                                        var doc = await cursor.next();
                                        drill_info[i].events[counter].docs.push(doc);
                                    }
                                    counter++;
                                }
                                catch (err) {
                                    console.log("Error converting data: ", err);
                                }
                            }
                        }).finally(() => {
                            // WRITE TO FILE
                            const jsonString = JSON.stringify(drill_info, null, 2);
                            fs.writeFile('output.json', jsonString, (err) => {
                                if (err) {
                                    console.error('Error writing to file', err);
                                }
                                else {
                                    console.log('Successfully wrote to file');
                                }
                            });
                        });
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
