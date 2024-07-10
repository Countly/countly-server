/**
 *  Description: Creates CSV file of document counts per month for specified time from drill data
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node export_monthly_doc_count.js
 */


const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const { Parser, transforms: { flatten } } = require('json2csv');

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');
const countlyCommon = require('../../../api/lib/countly.common.js');

const app_list = []; //valid app_ids here. If empty array passed, script will process all apps.
const path = './'; //path to save csv files
const period = '60days'; //supported values are month, 60days, 30days, 7days, yesterday, hour, all, or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000]

const EventDetailsFields = {
    "app_name": "AppName",
    "event": "EventName",
    "_id": "CreationDate",
    "count": "Count",
};

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            //SET PERIOD
            var activePeriod = period;
            if (period !== 'all') {
                countlyCommon.setPeriod(period);
                activePeriod = typeof countlyCommon.periodObj.activePeriod === "number" ? JSON.stringify(countlyCommon.periodObj.activePeriod).replace(/\./g, ":") : countlyCommon.periodObj.activePeriod.replace(/\./g, ":");
            }
            //CREATE FILE
            const eventDetailsWriteStream = fs.createWriteStream(path + `/EventDetails_${activePeriod}.csv`);
            var isFirst = true;

            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);
                //SET APP TIMEZONE
                countlyCommon.setTimezone(app.timezone);
                var periodObj = countlyCommon.periodObj;
                try {
                    //GET EVENTS FOR APP
                    var events = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    events = events && events.list || [];
                    //PROCESS EACH EVENT
                    for (let j = 0; j < events.length; j++) {
                        var event = events[j];
                        console.log("Processing event:", event);
                        var collectionName = drillCommon.getCollectionName(event, app._id);
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

                        //FETCH DATA AND WRITE TO FILES
                        try {
                            var cursor = drillDb.collection(collectionName).aggregate([
                                {
                                    $match: query
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
                                }
                            ]);
                            while (await cursor.hasNext()) {
                                //EVENT DETAILS
                                var row = await cursor.next();
                                var newRow = {
                                    AppName: app.name,
                                    EventName: event,
                                };
                                for (var key in EventDetailsFields) {
                                    if (row[key]) {
                                        newRow[EventDetailsFields[key]] = row[key];
                                    }
                                }
                                var eventDetailsParser = new Parser({ transforms: [ flatten({objects: 'true', arrays: 'true', separator: '_'}) ], fields: Object.values(EventDetailsFields), header: false });
                                var eventDetails = eventDetailsParser.parse(newRow);

                                //WRITE TO FILES
                                if (isFirst) {
                                    isFirst = false;
                                    eventDetailsWriteStream.write(Object.values(EventDetailsFields).join(","));
                                }
                                if (eventDetails && eventDetails.length > 0) {
                                    eventDetailsWriteStream.write("\n" + eventDetails);
                                }
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