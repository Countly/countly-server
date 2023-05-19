const pluginManager = require('../../../../plugins/pluginManager.js'),
    { fields, platforms } = require('../../../../plugins/push/api/send/platforms');

pluginManager.dbConnection('countly').then(async(db) => {
    try {
        let apps = await db.collection('apps').find({}, {_id: 1}).toArray(),
            fields_appusers = fields(platforms, true);
        console.log(`Dropping indexes for ${apps.length} apps`);
        for (let app of apps) {
            await db.collection(`app_users${app._id}`).dropIndexes(fields_appusers);
            console.log('Dropped indexes for ', app._id);
        }
        console.log('Dropping indexes DONE');
    }
    catch (e) {
        console.error(e);
    }
});