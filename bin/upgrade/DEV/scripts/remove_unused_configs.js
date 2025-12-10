const pluginManager = require('../../../../plugins/pluginManager.js');

console.log('Removing configs not used anymore');

pluginManager.dbConnection().then(async(db) => {
    try {
        await db.collection('plugins').updateOne(
            { _id: 'plugins' },
            {
                $unset: {
                    'api.metric_changes': '',
                    'flows.maxSamplingSize': '',
                    'flows.samplingThreshold': '',
                }
            });
        console.log('Unused configs removed');
    }
    catch (err) {
        console.error('Error while removing unused configs', err);
    }

    db.close();
});