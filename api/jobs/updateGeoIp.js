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
        exec('countly update geoip', (err) => {
            if (err) {
                log("Error:" + err);
                return;
            }
            done();
        });
    }
}

module.exports = UpdateGeoIP;