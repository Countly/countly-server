const job = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:crashes:cleanup_custom_field');
const pluginManager = require('../../../pluginManager.js');

const { cleanupCustomField, DEFAULT_MAX_CUSTOM_FIELD_KEYS } = require('../parts/custom_field.js');

/** class CleanupCustomFieldJob */
class CleanupCustomFieldJob extends job.Job {
    /** function run
     * @param {object} countlyDb - db connection object
     * @param {function} doneJob - function to call when finishing Job
     * @param {function} progressJob - fnction to call while running job
    */
    run(countlyDb, doneJob, progressJob) {
        var total = 0;
        var current = 0;
        var bookmark = '';
        log.d('Starting cleanup custom field job');

        /**
         * check job status periodically
         */
        function ping() {
            log.d('Pinging cleanup custom field job');
            if (pingTimeout) {
                progressJob(total, current, bookmark);
                pingTimeout = setTimeout(ping, 10000);
            }
        }
        var pingTimeout = setTimeout(ping, 10000);

        /**
         * end job
         * @returns {varies} job done
         */
        function endJob() {
            log.d('Ending cleanup custom field job');
            clearTimeout(pingTimeout);
            pingTimeout = 0;
            return doneJob();
        }

        pluginManager.loadConfigs(countlyDb, async() => {
            const maxCustomFieldKeys = pluginManager.getConfig('crashes').max_custom_field_keys || DEFAULT_MAX_CUSTOM_FIELD_KEYS;
            await cleanupCustomField(countlyDb, maxCustomFieldKeys);

            return endJob();
        });
    }
}

module.exports = CleanupCustomFieldJob;
