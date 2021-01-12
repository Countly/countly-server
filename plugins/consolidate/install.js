var pluginManager = require('../pluginManager.js');

console.log("Installing Consolidate Plugin");

pluginManager.dbConnection().then(function(countlyDb) {
    countlyDb.collection('apps').updateMany({'plugins.consolidate': {$exists: false}},
        {$set: {'plugins.consolidate': []}},
        async function() {
            // get config for consolidate legacy
            const res = await countlyDb.collection('plugins').findOne({_id: 'plugins'}, {projection: {'consolidate': 1}});
            if (res && res.consolidate && res.consolidate.app) {
                // migrate to app specific documents
                try {
                    await countlyDb.collection('apps').updateMany(
                        {_id: { $ne: res.consolidate.app } },
                        {$addToSet: {'plugins.consolidate': res.consolidate.app + ""}}
                    );
                }
                catch (e) {
                    console.error('error while installing consolidate plugin');
                    console.error(e);
                    return false;
                }
            }
            // remove legacy config
            await countlyDb.collection('plugins').updateOne({_id: 'plugins'}, {$unset: {'consolidate': ''}});
            console.log("Installing Consolidate Plugin Finished");
            countlyDb.close();
            return;
        }
    );
});