/**
 *  Description: Deletes obsolete custom events (not received for >90 days) from Countly and Drill DBs for an app.
 *  Usage: node delete_x_days_inactive_events.js
 */
const { ObjectId } = require('mongodb');
const pluginManager = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');
const drillCommon = require('../../../plugins/drill/api/common.js');
// double-check below details before running the script
const DRY_RUN = true; // Set to false to actually delete
const APP_ID = ""; // Replace with your app's ObjectID string
const DAYS = 90; // Number of days for active events
function daysAgo(days) {
    // eventTimes uses Unix timestamps (seconds)
    return Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
}
Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]){
    console.log("Connected to databases...");
    common.db = countlyDb;
    common.drillDb = drillDb;
    try {
        const app = await countlyDb.collection("apps").findOne({ _id: new ObjectId(APP_ID) }, { _id: 1, name: 1 });
        if (!app) {
            console.log("App not found");
            return close();
        }
        console.log("App:", app.name);
        // Get eventTimes data
        const eventTimesColl = "eventTimes" + APP_ID;
        const allDocs = await countlyDb.collection(eventTimesColl).find({}).toArray();

        let obsoleteEvents = [];
        if (allDocs.length) {
            for (const doc of allDocs) {
                if (doc.e && Array.isArray(doc.e)) {
                    for (const eventObj of doc.e) {
                        // eventObj.e is event key, eventObj.ts is last timestamp (Unix seconds)
                        if (eventObj.t && Math.floor(eventObj.t / 1000) < daysAgo(DAYS)) {
                            obsoleteEvents.push(eventObj.e);
                        }
                    }
                }
            }
        }
        obsoleteEvents = [...new Set(obsoleteEvents)];
        console.log("Obsolete events to delete:", obsoleteEvents);
        if (DRY_RUN) {
            console.log("DRY_RUN enabled. No changes will be made.");
            return close();
        }
        if (!obsoleteEvents.length) {
            return close("No obsolete events to delete");
        }
        // Delete obsolete events
        await deleteDrillEvents(app._id, obsoleteEvents);
        await deleteCountlyEvents(app._id, obsoleteEvents);
        await deleteEventTimes(app._id, obsoleteEvents);
        await deleteEventGroups(app._id, obsoleteEvents);
        await deleteEventKeys(app._id, obsoleteEvents);
        close();
    } catch (err) {
        console.log("App not found or error occurred");
        close(err);
    }
    async function deleteDrillEvents(appId, events) {
        for (let i = 0; i < events.length; i++) {
            var collectionName = drillCommon.getCollectionName(events[i], appId);
            try {
                await drillDb.collection(collectionName).drop();
                console.log("Dropped Drill collection:", collectionName);
            } catch (ex) {
                // Collection may not exist
                console.log("Could not drop collection (may not exist):", collectionName);
            }
        }
        // delete from aggregated drill event collection
        await drillDb.collection('drill_events').deleteMany({ 'a': appId + "", 'e': { $in: events } });
        console.log("Cleared from drill_events");
        await drillDb.collection('drill_bookmarks').deleteMany({ 'app_id': appId, 'event_key': { $in: events } });
        console.log("Cleared drill_bookmarks");
        await drillDb.collection("drill_meta").deleteMany({ 'app_id': (appId + ""), "type": "e", "e": { $in: events } });
        console.log("Cleared drill_meta");
    }
    async function deleteCountlyEvents(appId, events) {
        for (let i = 0; i < events.length; i++) {
            var collectionName = 'events' + drillCommon.getEventHash(events[i], appId);
            try {
                await countlyDb.collection(collectionName).drop();
                console.log("Dropped Countly collection:", collectionName);
            } catch (ex) {
                // Collection may not exist
                console.log("Could not drop collection (may not exist):", collectionName);
            }
            // clear from merged collection
            await countlyDb.collection("events_data").deleteMany({ '_id': { "$regex": "^" + appId + "_" + drillCommon.getEventHash(events[i], appId) + "_.*" } });
            console.log("Cleared from aggregated events_data for:", events[i]);
        }
    }
    async function deleteEventTimes(appId, events) {
        await countlyDb.collection("eventTimes" + appId).updateMany({}, { "$pull": { "e": { "e": { $in: events } } } });
        console.log("Cleared eventTimes");
        await countlyDb.collection("timelineStatus").deleteMany({ 'app_id': (appId + ""), "event": { $in: events } });
        console.log("Cleared timelineStatus");
    }
    async function deleteEventKeys(appId, events) {
        const unsetQuery = {};
        for (let i = 0; i < events.length; i++) {
            unsetQuery[`segments.${events[i]}`] = "";
            unsetQuery[`map.${events[i]}`] = "";
            unsetQuery[`omitted_segments.${events[i]}`] = "";
        }
        // Remove from "list" and "overview" arrays, and unset event segments/maps
        await countlyDb.collection("events").updateOne(
            { _id: appId },
            {
                $pull: {
                    list: { $in: events },
                    overview: { eventKey: { $in: events } }
                },
                $unset: unsetQuery
            }
        );
        console.log("Cleared events:", events);
    }
    async function deleteEventGroups(appId, events) {
        await countlyDb.collection("event_groups").updateMany({ 'app_id': (appId + "") }, { "$pull": { "source_events": { $in: events } } });
        console.log("Cleared event_groups");
    }
    function close(err) {
        if (err) {
            console.log("Finished with errors:", err);
        } else {
            console.log("Finished successfully.");
        }
        countlyDb.close();
        drillDb.close();
    }
});
