const job = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:generate_notif');
const assistant = require("../assistant.js");

/**
 * Class for running notification job
 */
class GenerateNotifJob extends job.Job {
    /**
     * Get's called to run the job
     * @param {mongoDatabase} countlyDb ref to countlyDb
     * @param {function} doneJob callback
     * @param {function} progressJob progress callback
     */
    run(countlyDb, doneJob, progressJob) {
        log.i("Starting Generate Notifications job");

        /***
         * Ping function so that the job does not timeout
         */
        function ping() {
            log.i('Pinging job');
            if (timeout) {
                progressJob();
                timeout = setTimeout(ping, 10000);
            }
        }

        let timeout = setTimeout(ping, 10000);

        //this shall be called when all notifications are generated
        const finishItCallback = function() {
            log.i("Notifications generated, finishing job");
            clearTimeout(timeout);
            timeout = 0;
            doneJob();
        };

        assistant.generateNotifications(countlyDb, finishItCallback, false);
    }
}

module.exports = GenerateNotifJob;