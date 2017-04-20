'use strict';
const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:generate_notif'),
    async = require("async"),
    assistant = require("../assistant.js");


class GenerateNotifJob extends job.Job {
    run(countlyDb, doneJob, progressJob) {
        log.i("starting Generate Notifications job");

        function ping() {
            log.i('Pinging job');
            if (timeout) {
                progressJob();
                setTimeout(ping, 10000);
            }
        }

        let timeout = setTimeout(ping, 10000);

        //this shall be called when all notifications are generated
        const finishItCallback = function () {
            log.i("Notifications generated");
            clearTimeout(timeout);
            timeout = 0;
            doneJob();
        };

        assistant.generateNotifications(countlyDb, finishItCallback, false);
    }
}

module.exports = GenerateNotifJob;