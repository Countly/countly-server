import { autoOnCohort } from './api-auto.ts';
import { loadKafka, setupProducer } from './lib/kafka.ts';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const plugins: import('../../pluginManager.js').IPluginManager = require('../../pluginManager.ts');
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const log = common.log('push:aggregator');

(async() => {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
        plugins.register('/cohort/enter', ({cohort, uids}: any) => autoOnCohort(true, cohort, uids));
        plugins.register('/cohort/exit', ({cohort, uids}: any) => autoOnCohort(false, cohort, uids));
        log.i("Kafka producer for push notifications set up successfully.");
    }
    catch (err) {
        log.e("Error setting up Kafka producer for push notifications:", err);
    }
})();
