'use strict';
// const job = require('../../../../api/parts/jobs/job.js'),
const Job = require('../../../../jobServer/Job');
const plugins = require('../../../pluginManager.ts');
const log = require('../../../../api/utils/log.js')('hooks:monitor');

/**
 * @typedef {import('../../../../types/pluginManager').Database} Database
 */

/**
 * @class
 * @classdesc Class MonitorJob is Hooks Monitor Job extend from Countly Job
 * @extends Job
 */
class ScheduleJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "1 * * * *" // every 1 hour on the 1st min
        };
    }

    /**
    * run task
    * @param {Database} db - db object
    * @param {function} done - callback function
    */
    run(db, done) {
        log.d("[hooks schedule]", this._json);
        plugins.dispatch("/hooks/schedule");
        done();
    }
}

module.exports = ScheduleJob;
