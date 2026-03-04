import { autoOnCohort } from './api-auto.ts';
import { loadKafka, setupProducer } from './new/lib/kafka.ts';
import { createRequire } from 'module';

// @ts-expect-error TS1470
const require = createRequire(import.meta.url);
const plugins: any = require('../../pluginManager.ts');
const common: any = require('../../../api/utils/common.js');
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
