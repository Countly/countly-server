/**
 * Script to check statistics for Adjust data in Countly.
 *
 * This script checks:
 * 1. Number of documents in the adjust collection for the specified app_id
 * 2. Number of users in app_users{APP_ID} collection with custom.adjust_id
 * 3. Number of adjust_install events in the drill collection
 *
 * Location:
 * Place this script in the `bin/scripts` directory of your Countly installation.
 *
 * Usage:
 * 1. Replace the `APP_ID` variable with the desired app's ID.
 * 2. Run the script using Node.js:
 *    ```
 *    node /var/countly/bin/scripts/adjust_stats.js
 *    ```
 */

// Define the APP_ID variable
const APP_ID = '5ab0c3ef92938d0e61cf77f4';

const plugins = require('../../plugins/pluginManager.js');

(async() => {
    console.log(`Checking Adjust statistics for APP_ID: ${APP_ID}`);

    try {
        // Connect to countly database
        const db = await plugins.dbConnection("countly");

        // Connect to countly_drill database
        const drillDb = await plugins.dbConnection("countly_drill");

        console.log('Connected to databases successfully.');

        // 1. Check how many documents are in adjust collection for this app_id
        console.log('\n--- Checking adjust collection ---');

        // Define date range for filtering (July 17-22, 2025)
        const startDate = new Date('2025-07-17T00:00:00.000Z');
        const endDate = new Date('2025-07-22T23:59:59.999Z');
        console.log(`Date range filter: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const adjustQuery = {
            app_id: APP_ID,
            cd: {
                $gte: startDate,
                $lte: endDate
            }
        };

        const adjustCount = await db.collection('adjust').countDocuments(adjustQuery);
        console.log(`Documents in adjust collection for app_id ${APP_ID} (${startDate.toDateString()} - ${endDate.toDateString()}): ${adjustCount}`);

        // 1a. Check unique amount of adjust_id values in adjust collection
        const uniqueAdjustIds = await db.collection('adjust').distinct('adjust_id', adjustQuery);
        console.log(`Unique adjust_id values in adjust collection for app_id ${APP_ID} (${startDate.toDateString()} - ${endDate.toDateString()}): ${uniqueAdjustIds.length}`);

        // 1b. Breakdown by event property in adjust collection
        console.log('\n--- Event breakdown in adjust collection ---');
        const eventBreakdown = await db.collection('adjust').aggregate([
            { $match: adjustQuery },
            { $group: { _id: "$event", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).toArray();

        console.log('Event breakdown:');
        eventBreakdown.forEach(item => {
            console.log(`  ${item._id}: ${item.count}`);
        });

        // 2. Check how many users in app_users{APP_ID} collection have custom.adjust_id value
        console.log('\n--- Checking app_users collection ---');
        const appUsersCollection = 'app_users' + APP_ID;

        // Use the same date range but convert to seconds for fac field
        const appUsersQuery = {
            'custom.adjust_id': { $exists: true },
            fac: {
                $gte: Math.floor(startDate.getTime() / 1000),
                $lte: Math.floor(endDate.getTime() / 1000)
            }
        };

        const usersWithAdjustId = await db.collection(appUsersCollection).countDocuments(appUsersQuery);
        console.log(`Users with custom.adjust_id in ${appUsersCollection} (${startDate.toDateString()} - ${endDate.toDateString()}): ${usersWithAdjustId}`);

        // 2a. Check unique custom.adjust_id values in app_users collection
        const uniqueUserAdjustIds = await db.collection(appUsersCollection).distinct('custom.adjust_id', appUsersQuery);
        console.log(`Unique custom.adjust_id values in ${appUsersCollection} (${startDate.toDateString()} - ${endDate.toDateString()}): ${uniqueUserAdjustIds.length}`);

        // 3. Check how many adjust_install events are in drill collection
        console.log('\n--- Checking drill collection for adjust_install events ---');
        const drillCollectionName = 'drill_events';
        console.log(`Drill collection name: ${drillCollectionName}`);

        // Use the same date range but convert to milliseconds for ts field
        const drillQuery = {
            "a": APP_ID,
            "e": "adjust_install",
            ts: {
                $gte: startDate.getTime(),
                $lte: endDate.getTime()
            }
        };

        const adjustInstallEvents = await drillDb.collection(drillCollectionName).countDocuments(drillQuery);
        console.log(`adjust_install events in drill collection (${startDate.toDateString()} - ${endDate.toDateString()}): ${adjustInstallEvents}`);

        // 3a. Check unique custom.adjust_id values in drill collection
        const uniqueDrillAdjustIds = await drillDb.collection(drillCollectionName).distinct('custom.adjust_id', drillQuery);
        console.log(`Unique custom.adjust_id values in drill collection (${startDate.toDateString()} - ${endDate.toDateString()}): ${uniqueDrillAdjustIds.length}`);

        // Summary
        console.log('\n--- SUMMARY ---');
        console.log(`APP_ID: ${APP_ID}`);
        console.log(`Date range: ${startDate.toDateString()} - ${endDate.toDateString()}`);
        console.log(`Adjust collection documents: ${adjustCount}`);
        console.log(`Unique adjust_id values: ${uniqueAdjustIds.length}`);
        console.log(`Users with adjust_id: ${usersWithAdjustId}`);
        console.log(`Unique custom.adjust_id values in app_users: ${uniqueUserAdjustIds.length}`);
        console.log(`adjust_install events in drill collection: ${adjustInstallEvents}`);
        console.log(`Unique custom.adjust_id values in drill collection: ${uniqueDrillAdjustIds.length}`);

        console.log('\nStatistics check completed.');

    }
    catch (error) {
        console.error('Error during statistics check:', error);
    }
    finally {
        console.log('Terminating the process...');
        process.exit(0);
    }
})();
