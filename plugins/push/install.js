const pluginManager = require("../pluginManager.js");

console.log("Installing push plugin");

pluginManager.dbConnection().then(async(db) => {
    const schedules = db.collection("message_schedules");
    try {
        await Promise.all([
            schedules.ensureIndex({ messageId: 1 }, { background: true }),
            schedules.ensureIndex({ scheduledTo: 1 }, { background: true }),
        ]);
        console.log("Push plugin installed");
        db.close();
    }
    catch (err) {
        console.error("Error during push plugin installation:", err);
    }
});
