/**
 *  Description: 
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/path
 *  Command: node export_drill_data.js
 */


const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const { Parser, transforms: { flatten } } = require('json2csv');

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');

var keepPeriod = '3month'; //one of 1month, 3month, 6month, 1year, 2year
var app_list = []; //valid app_ids here. If empty array passed, script will process all apps.
var path = './'; //path to save csv files

const EventDetailsFields = {
    "app_id": "AppId",
    "event": "EventName",
    "_id": "EventId",
    "uid": "UserId",
    "did": "DeviceId",
    "ts": "Timestamp",
    "cd": "CreationDate",
    "d": "EventDay",
    "w": "EventWeek",
    "m": "EventMonth",
    "h": "EventHour",
    "s": "EventSum",
    "c": "EventCount",
    "dur": "EventDuration",
    "up_av": "UserProperties_av",
    "up_cc": "UserProperties_cc",
    "up_cty": "UserProperties_cty",
    "up_d": "UserProperties_d",
    "up_dnst": "UserProperties_dnst",
    "up_dow": "UserProperties_dow",
    "up_email": "UserProperties_email",
    "up_fs": "UserProperties_fs",
    "up_hour": "UserProperties_hour",
    "up_la": "UserProperties_la",
    "up_ls": "UserProperties_ls",
    "up_name": "UserProperties_name",
    "up_p": "UserProperties_p",
    "up_pv": "UserProperties_pv",
    "up_r": "UserProperties_r",
    "up_rgn": "UserProperties_rgn",
    "up_sc": "UserProperties_sc",
    "up_src": "UserProperties_src",
    "up_src_ch": "UserProperties_src_ch",
    "up_tsd": "UserProperties_tsd",
    "up_camfs": "UserProperties_camfs",
    "up_dt": "UserProperties_dt",
    "up_mnf": "UserProperties_mnf",
    "up_ornt": "UserProperties_ornt",
};
const EventDetailSegmentsFields = [ "EventId", "UserId", "SegmentKey", "SegmentValue"];
const EventDetailCustomPropsFields = [ "EventId", "UserId", "CustomUserPropKey", "CustomUserPropValue"];

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            const oldestTimestampWanted = getPeriod(keepPeriod);
            const eventDetailsWriteStream = fs.createWriteStream(path + "/EventDetails.csv");
            const eventSegmentWriteStream = fs.createWriteStream(path + "/EventDetailSegmentInfo.csv");
            const eventCustomPropsWriteStream = fs.createWriteStream(path + "/EventDetailCustomUserProps.csv");
            var isFirst = true;

            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                console.log(i + 1, ") Processing app:", app.name);
                try {
                    var events = await countlyDb.collection("events").findOne({"_id": ObjectId(app._id)});
                    events = events && events.list || [];
                    for (let j = 0; j < events.length; j++) {
                        var event = events[j];
                        console.log("Processing event:", event);
                        var collectionName = drillCommon.getCollectionName(event, app._id);
                        var query = {ts: {$gt: oldestTimestampWanted}};
                        try {
                            var cursor = drillDb.collection(collectionName).find(query);
                            while (await cursor.hasNext()) {
                                //EVENT DETAILS
                                var row = await cursor.next();
                                var newRow = {
                                    AppId: app._id,
                                    EventName: event,
                                    UserProperties: row.up || {},
                                };
                                for (var key in EventDetailsFields) {
                                    if (row[key]) {
                                        newRow[EventDetailsFields[key]] = row[key];
                                    }
                                }
                                const eventDetailsParser = new Parser({ transforms: [ flatten({objects: 'true', arrays: 'true', separator: '_'}) ], fields: Object.values(EventDetailsFields), header: false });
                                const eventDetails = eventDetailsParser.parse(newRow);

                                //EVENT DETAIL SEGMENT INFO
                                var segmentRows = [];
                                if (row.sg) {
                                    for (let [key, value] of Object.entries(row.sg)) {
                                        segmentRows.push({
                                            EventId: row._id,
                                            UserId: row.uid,
                                            SegmentKey: key,
                                            SegmentValue: value
                                        });
                                    }
                                }
                                const eventDetailSegmentsParser = new Parser({ fields: EventDetailSegmentsFields, header: false });
                                const eventDetailSegments = eventDetailSegmentsParser.parse(segmentRows);

                                //EVENT DETAIL CUSTOM PROPS
                                var customPropsRows = [];
                                if (row.custom) {
                                    for (let [key, value] of Object.entries(row.custom)) {
                                        customPropsRows.push({
                                            EventId: row._id,
                                            UserId: row.uid,
                                            CustomUserPropKey: key,
                                            CustomUserPropValue: value
                                        });
                                    }
                                }
                                const eventDetailCustomPropsParser = new Parser({ fields: EventDetailCustomPropsFields, header: false });
                                const eventDetailCustomProps = eventDetailCustomPropsParser.parse(customPropsRows);

                                //WRITE TO FILES
                                if (isFirst) {
                                    isFirst = false;
                                    eventDetailsWriteStream.write(Object.values(EventDetailsFields).join(",") + "\n");
                                    eventSegmentWriteStream.write(EventDetailSegmentsFields.join(",") + "\n");
                                    eventCustomPropsWriteStream.write(EventDetailCustomPropsFields.join(",") + "\n");
                                }
                                eventDetailsWriteStream.write(eventDetails + "\n");
                                eventSegmentWriteStream.write(eventDetailSegments + "\n");
                                eventCustomPropsWriteStream.write(eventDetailCustomProps + "\n");
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

    function getPeriod(pp) {
        var periods = {
            "1month": 1,
            "3month": 3,
            "6month": 6,
            "1year": 12,
            "2year": 24
        };
        var back = periods[pp];
        if (!back) {
            back = 12;
            console.log('Invalid perod. Falling back to one year');
        }
        var now = moment();
        for (let i = 0; i < back; i++) {
            now = now.subtract(1, "months");
        }
        var oldestTimestampWanted = now.valueOf();
        return oldestTimestampWanted;
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
