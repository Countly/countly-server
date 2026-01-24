'use strict';

/**
 * @typedef {import('../../types/authorizer').Authorizer} Authorizer
 */

// const job = require('../parts/jobs/job.js'),
/** @type {Authorizer} */
const authorize = require('../utils/authorizer.js');
const Job = require("../../jobServer/Job");

/** Class for job of clearing tokens **/
class CleanTokensJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "30 2 * * *" // Every day at 2:30 AM
        };
    }

    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        authorize.clean({
            db: db,
            callback: function() {
                done();
            }
        });
    }
}

module.exports = CleanTokensJob;