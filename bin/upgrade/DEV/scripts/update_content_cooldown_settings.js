const pluginManager = require('../../../../plugins/pluginManager.js');

/********************************************/
/* 1) With this script, if there is any cooldown defined before in the APPS collection(in the plugins.content), it will be moved to the APPS collection in the plugins.journey_engine */
/* 2) Also, if there is any cooldown defined before in the PLUGINS collection(in the plugins.content), it will be moved to the PLUGINS collection in the plugins.journey_engine */
/********************************************/

console.log("=== Migrating 'content' cooldown to 'journeys' in apps and plugins collections ===");

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        /********************************************/
        /* 1) in the APPS collection content->journey_engine, APP SETTING */
        /********************************************/
        console.log("Starting migration in apps collection...");

        const apps = await countlyDb.collection("apps").find({"plugins.content": { $exists: true }}).toArray();
        if (!apps || apps.length === 0) {
            console.log("No apps require content->journeys migration");
        } 
        else {
            console.log(`Found ${apps.length} apps to migrate`);
            for (let appDoc of apps) {
                appDoc.plugins.journey_engine = appDoc.plugins.content;
                delete appDoc.plugins.content;

                await countlyDb.collection("apps").updateOne(
                    { _id: appDoc._id }, 
                    { $set: { plugins: appDoc.plugins }}
                );
            }
            console.log("Apps content->journeys migration DONE");
        }

        /********************************************/
        /* 2) in the PLUGINS collection update the document which _id: "plugins, GLOBAL SETTING"*/
        /********************************************/
        console.log("Updating '_id: plugins' document in plugins collection...");

        const pluginsDoc = await countlyDb.collection("plugins").findOne({ _id: "plugins" });
        if (!pluginsDoc) {
            console.log("No document found in plugins collection with _id: plugins");
        } 
        else {
            let needUpdate = false;

            // 2.a) Remove "plugins.content" boolean field
            if (pluginsDoc.plugins && Object.prototype.hasOwnProperty.call(pluginsDoc.plugins, "content")) {
                delete pluginsDoc.plugins.content;
                needUpdate = true;
                console.log("Removed plugins.content boolean field.");
            }

            // 2.b) Move content.cooldown to journey_engine.cooldown
            if (pluginsDoc.content && typeof pluginsDoc.content === 'object') {
                if (typeof pluginsDoc.content.cooldown !== 'undefined') {
                    if (!pluginsDoc.journey_engine || typeof pluginsDoc.journey_engine !== 'object') {
                        pluginsDoc.journey_engine = {};
                    }
                    pluginsDoc.journey_engine.cooldown = pluginsDoc.content.cooldown;
                    console.log(`Copied content.cooldown = ${pluginsDoc.content.cooldown} to journey_engine.cooldown`);
                }

                // remove the top-level "content" object
                delete pluginsDoc.content;
                needUpdate = true;
                console.log("Removed top-level content object.");
            }

            // if any changes were made, update the document
            if (needUpdate) {
                await countlyDb.collection("plugins").updateOne(
                    { _id: "plugins" }, 
                    { $set: pluginsDoc }
                );
                console.log("plugins document updated successfully");
            } 
            else {
                console.log("No changes required for _id: plugins document");
            }
        }
    }
    catch (err) {
        console.error("Error during cooldown setting migration:", err);
    }
    finally {
        countlyDb.close();
        console.log("Cooldown migration script finished, DB connection closed.");
    }
});
