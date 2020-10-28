var pluginManager = require('../pluginManager.js'),
    countlyDb = pluginManager.dbConnection("countly");

console.log("Installing Consolidate Plugin");

countlyDb.collection('apps').updateMany({'plugins.consolidate': {$exists: false}},
    {$set: {'plugins.consolidate': []}},
    async function() {
        // get config for consolidate legacy
        const { consolidate } = await countlyDb._native.collection('plugins').findOne({_id: 'plugins'}, {projection: {'consolidate': 1}});
        if (consolidate && consolidate.app) {
            // migrate to app specific documents
            try {
                await countlyDb._native.collection('apps').updateMany(
                    {_id: { $ne: consolidate.app } },
                    {$addToSet: {'plugins.consolidate': consolidate.app + ""}}
                );
            }
            catch (e) {
                console.error('error while installing consolidate plugin');
                console.error(e);
                return false;
            }
        }
        // remove legacy config
        await countlyDb._native.collection('plugins').updateOne({_id: 'plugins'}, {$unset: {'consolidate': ''}});
        console.log("Installing Consolidate Plugin Finished");
        countlyDb.close();
        return;
    }
);