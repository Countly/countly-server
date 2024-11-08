// Script that adds creation date for existing alerts.

const pluginManager = require('../../../plugins/pluginManager.js');

pluginManager.dbConnection().then(async(countlyDb) => {
    try {
        await countlyDb.collection('alerts').updateMany(
            { createdAt: { $exists: false } },
            [
                {
                    $set: {
                        createdAt: { $toDouble: { $toDate: "$_id" } }
                    }
                }
            ]
        );
        console.log("Finished adding creation date for existing alerts.");
    }
    catch (error) {
        console.log(`Error adding creation date for existing alerts: ${error}`);
    }
    finally {
        countlyDb.close();
    }
});