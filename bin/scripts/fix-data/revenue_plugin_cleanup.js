/**
 * Description:
 * This script clean up deprecated references to the removed "revenue" plugin in Countly.
 * The "revenue" plugin has been deprecated and removed from the Countly and will no longer be supported
 * 
 * This script will:
 *   - Identify and remove all leftover "revenue"-related widgets, metrics, conditions, or configurations 
 *     from custom dashboards, alerts, and email reports.
 *   - Disable revenue and performance-monitoring plugins in the plugins configuration.
 *
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/revenue_plugin_cleanup.js
 *  Command: node revenue_plugin_cleanup.js
 */

var pluginManager = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");

Promise.all([pluginManager.dbConnection("countly")]).then(async function([countlyDb]) {
    console.log("Starting revenue data cleanup...");

    try {
        // 1. Clean revenue widgets
        console.log("Cleaning widgets collection...");
        const widgetsQuery = { "feature": "revenue" };
        const widgetsResult = await countlyDb.collection("widgets").deleteMany(widgetsQuery);
        console.log(`Removed ${widgetsResult.deletedCount} revenue widgets from widgets collection`);

        // 2. Clean revenue e-mail reports
        console.log("Cleaning reports collection...");
        const reportsQuery = { "metrics.revenue": true };
        const reportsResult = await countlyDb.collection("reports").deleteMany(reportsQuery);
        console.log(`Removed ${reportsResult.deletedCount} revenue reports from reports collection`);

        // 3. Clean revenue alerts
        console.log("Cleaning alerts collection...");
        const alertsQuery = { "alertDataType": "revenue" };
        const alertsResult = await countlyDb.collection("alerts").deleteMany(alertsQuery);
        console.log(`Successfully removed ${alertsResult.deletedCount} revenue alerts from alerts collection`);

        // 4. Disable revenue and performance-monitoring plugins
        console.log("Disabling revenue and performance-monitoring plugins...");
        const updateFields = {
            "plugins.revenue": false,
            "plugins.performance-monitoring": false
        };

        const pluginsResult = await countlyDb.collection("plugins").updateOne(
            { _id: "plugins" },
            { $set: updateFields }
        );

        if (pluginsResult.matchedCount > 0) {
            console.log("Successfully disabled revenue and performance-monitoring plugins");
        }
        else {
            console.log("No plugins document found to update");
        }

        console.log("\n\nRevenue data cleanup completed successfully!");

    }
    catch (error) {
        console.log("Error during revenue data cleanup:", error);
    }
    finally {
        countlyDb.close();
    }
}).catch(function(error) {
    console.log("Database connection error:", error);
});