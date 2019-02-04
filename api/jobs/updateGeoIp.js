'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('job:updateGeoIp'),
    { exec } = require('child_process');

/** Class for the job of updating geo-ip's **/
class UpdateGeoIP extends job.Job {
    /**
     * Run the update geo-ip job
     * @param {done} done callback
     */
    run(done) {
        log("Updating geo-ip's..");
        exec("countly update geoip", (err) => {
            if (err) {
                log("Error occurred while updating geoip:" + err);
                done();
            }
            log("Updating devices...");
            exec("countly update devices", (err) => {
                if (err) {
                    log("Error occurred while updating devices:" + err);
                }
                done();
            });
        });
    }
}

module.exports = UpdateGeoIP;