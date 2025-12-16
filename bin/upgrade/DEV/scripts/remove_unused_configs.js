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
                    'push.rate': '',
                    'push.deduplicate': '',
                    'push.sendahead': '',
                    'push.connection_retries': '',
                    'push.connection_factor': '',
                    'push.pool_pushes': '',
                    'push.pool_bytes': '',
                    'push.pool_concurrency': '',
                    'push.pool_pools': '',
                }
            });
        console.log('Unused configs removed');
    }
    catch (err) {
        console.error('Error while removing unused configs', err);
    }

    db.close();
});