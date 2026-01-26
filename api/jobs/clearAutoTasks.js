"use strict";

/**
 * @typedef {import('../../types/taskmanager').TaskManagerStatic} TaskManagerStatic
 * @typedef {import('../../types/pluginManager').Database} Database
 */

// const job = require("../parts/jobs/job.js");
const log = require('../utils/log.js')('job:clearAutoTasks');
/** @type {TaskManagerStatic} */
const taskManager = require('../utils/taskmanager');
const Job = require("../../jobServer/Job");

/**
 * clear task record in db with  task id
 * @param {string} taskId - the id of task in db.
 * @returns {Promise} promise - Promise object
 */
const clearTaskRecord = (taskId) => {
    return new Promise((resolve, reject) => {
        taskManager.deleteResult({id: taskId}, (err2) => {
            if (err2) {
                return reject(err2);
            }
            resolve();
        });
    });
};

/** Class for job of clearing auto tasks created long time ago **/
class ClearAutoTasks extends Job {
    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "0 2 * * *" // Every day at 2:00 AM
        };
    }

    /**
     * Run the job
     * @param {Database} db connection
     * @param {done} done callback
     */
    run(db, done) {
        const beforeTime = new Date().getTime() - 1000 * 60 * 60 * 24 * 90; //90 days ago
        const query = {
            manually_create: {$ne: true},
            ts: { $lt: beforeTime }
        };
        db.collection("long_tasks").find(query).toArray(async function(err, tasks) {
            if (err) {
                log.e("Error deleting auto tasks.");
            }
            try {
                for (let i = 0; i < tasks.length; i++) {
                    await clearTaskRecord(tasks[i]._id);
                }
            }
            catch (e) {
                log.d("error while deleting auto task record: %j", e);
            }
            done();
        });
    }
}

module.exports = ClearAutoTasks;

