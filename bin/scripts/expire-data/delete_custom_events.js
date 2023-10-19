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
            const event = events[i];
            var collectionName = drillCommon.getCollectionName(event, appId);
            await drillDb.collection(collectionName).drop();
            console.log("Dropped collection:", collectionName);
        }
    }

    async function deleteCountlyEvents(appId, events) {
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            var collectionName = 'events' + drillCommon.getEventHash(event, appId);
            await countlyDb.collection(collectionName).drop();
            console.log("Dropped collection:", collectionName);
        }
    }

    async function deleteEventTimes(appId, events) {
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            var collectionName = 'eventTimes' + appId;
            await countlyDb.collection(collectionName).deleteMany({"e": {$elemMatch: {"e": event}}});
            console.log("Deleted from collection:", collectionName);
        }
    }

    async function deleteEventKeys(appId, events) {
        await countlyDb.collection("events").updateOne({_id: appId}, {$pull: {list: {$in: events}}});
        console.log("Deleted events:", events);
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