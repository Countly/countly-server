/**
 *  Description: Deletes custom events from countly and drill databases
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/expire-data
 *  Command: node delete_custom_events.js
 */


const { ObjectId } = require('mongodb');
const pluginManager = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');
const drillCommon = require('../../../plugins/drill/api/common.js');

const APP_ID = "";
const EVENTS = []; //leave empty to delete all custom events

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");

    //SET COMMON DB AND DRILL DB
    common.db = countlyDb;
    common.drillDb = drillDb;

    //GET APP
    try {
        const app = await countlyDb.collection("apps").findOne({_id: ObjectId(APP_ID)}, {_id: 1, name: 1});
        console.log("App:", app.name);
        //GET EVENTS
        var events = EVENTS;
        if (!events.length) {
            events = await countlyDb.collection("events").findOne({_id: app._id}, {_id: 0, list: 1});
            events = (events && events.list) || [];
        }
        if (!events.length) {
            close("No events found");
        }
        else {
            //DELETE EVENTS
            try {
                console.log(1 + ") Deleting drill events:");
                await deleteDrillEvents(app._id, events);
                console.log(2 + ") Deleting countly events:");
                await deleteCountlyEvents(app._id, events);
                console.log(3 + ") Deleting event times:");
                await deleteEventTimes(app._id, events);
                console.log(4 + ") Deleting event keys:");
                await deleteEventKeys(app._id, events);
                console.log(5 + ") Deleting event groups:");
                await deleteEventGroups(app._id, events);
                close();
            }
            catch (err) {
                close(err);
            }
        }
    }
    catch (err) {
        console.log("App not found");
        close(err);
    }

    async function deleteDrillEvents(appId, events) {
        for (let i = 0; i < events.length; i++) {
            var collectionName = drillCommon.getCollectionName(events[i], appId);
            await drillDb.collection(collectionName).drop();
            console.log("Dropped collection:", collectionName);
        }
        await drillDb.collection('drill_bookmarks').remove({'app_id': appId, 'event_key': {$in: events}});
        console.log("Cleared drill_bookmarks");
        await drillDb.collection("drill_meta").remove({'app_id': (appId + ""), "type": "e", "e": {$in: events}});
        console.log("Cleared drill_meta");
    }

    async function deleteCountlyEvents(appId, events) {
        for (let i = 0; i < events.length; i++) {
            var collectionName = 'events' + drillCommon.getEventHash(events[i], appId);
            await countlyDb.collection(collectionName).drop();
            console.log("Dropped collection:", collectionName);
        }
    }

    async function deleteEventTimes(appId, events) {
        await countlyDb.collection("eventTimes" + appId).update({}, {"$pull": {"e": {"e": {$in: events}}}}, {"multi": true});
        console.log("Cleared eventTimes");
        await countlyDb.collection("timelineStatus").remove({'app_id': (appId + ""), "event": {$in: events}});
        console.log("Cleared timelineStatus");
    }

    async function deleteEventKeys(appId, events) {
        const unsetQuery = {};
        for (let i = 0; i < events.length; i++) {
            unsetQuery[`segments.${events[i]}`] = 1;
            unsetQuery[`map.${events[i]}`] = 1;
            unsetQuery[`omitted_segments.${events[i]}`] = 1;
        }
        await countlyDb.collection("events").updateOne({_id: appId}, {$pull: {list: {$in: events}}, $unset: unsetQuery}, {$pull: {"overview": {eventKey: {$in: events}}}});
        console.log("Cleared events:", events);
    }

    async function deleteEventGroups(appId, events) {
        await countlyDb.collection("event_groups").update({'app_id': (appId + "")}, {"$pull": {"source_events": {$in: events}}}, {"multi": true});
        console.log("Cleared event_groups");
    }

    function close(err) {
        if (err) {
            console.log("Finished with errors:", err);
        }
        else {
            console.log("Finished successfully.");
        }
        countlyDb.close();
        drillDb.close();
    }
});