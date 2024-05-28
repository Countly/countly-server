const pluginManager = require('../../../plugins/pluginManager.js');

pluginManager.dbConnection('countly').then(async(db) => {
    try {
        let apps = await db.collection('apps').find({}, { _id: 1 }).toArray();

        console.log(`Removing unused APM collections for ${apps.length} apps`);
        for (let app of apps) {

            try {
                console.log(`Dropping unused APM collections for ${app._id}`);
                await db.collection(`apm_network${app._id}`).drop();
                console.log(`apm_network${app._id} is dropped`);

                await db.collection(`apm_device${app._id}`).drop();
                console.log(`apm_device${app._id} is dropped`);
            }
            catch (e) {
                console.error("Error occured while dropping collection", e);
            }

            console.log(`Dropped unused collections for  ${app._id}`);
        }
        console.log('Dropping unused collections DONE');
    }
    catch (e) {
        console.error(e);
    }
    db.close();
});
