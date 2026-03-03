const plugins = require('../../pluginManager.ts');
const { loadKafka, setupProducer } = require('./new/lib/kafka.ts');
const { autoOnCohort } = require('./api-auto.ts');
const common = require('../../../api/utils/common.js');
const log = common.log('push:aggregator');

(async() => {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
        plugins.register('/cohort/enter', ({cohort, uids}) => autoOnCohort(true, cohort, uids));
        plugins.register('/cohort/exit', ({cohort, uids}) => autoOnCohort(false, cohort, uids));
        log.i("Kafka producer for push notifications set up successfully.");
    }
    catch (err) {
        log.e("Error setting up Kafka producer for push notifications:", err);
    }
})();
