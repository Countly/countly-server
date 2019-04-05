const {Job} = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:assistant:generate_notif');
const assistant = require("../assistant.js");

/**
 * Class for running notification job
 */
class GenerateNotifJob extends Job {
    /**
     * Get's called to run the job
     * @param {mongoDatabase} countlyDb ref to countlyDb
     * @param {function} doneJob callback
     * @param {function} progressJob progress callback
     */
    run(countlyDb, doneJob) {
        log.i("Starting Generate Notifications job");

        //this shall be called when all notifications are generated
        const finishItCallback = function() {
            log.i("Notifications generated, finishing job");
            doneJob();
        };

        assistant.generateNotifications(countlyDb, finishItCallback, false);
    }
}

module.exports = GenerateNotifJob;