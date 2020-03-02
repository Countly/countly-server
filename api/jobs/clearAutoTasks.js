"use strict";

const job = require("../parts/jobs/job.js");
const log = require('../utils/log.js')('job:clearAutoTasks');
const taskManager = require('../utils/taskmanager');

/** Class for job of clearing auto tasks created long time ago **/
class ClearAutoTasks extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        const beforeTime = new Date().getTime() - 1000 * 60 * 60 * 24 * 90; //90 days ago
        const query = {
            manually_create: {$ne: true},
            ts: { $lt: beforeTime }
        };
        db.collection("long_tasks").find(query).toArray(async function (err, tasks) {
            if (err) {
                log.e("Error deleting auto tasks.");
            }
            for (let i = 0; i < tasks.length; i++) {
                await new Promise((resolve,reject) => { 
                    taskManager.deleteResult({id:tasks._id}, (err, ok) => {
                        if (err) {
                           return reject(err)
                        }
                       resolve() 
                    })
                })

            }
            done();
        });
    }
}

module.exports = ClearAutoTasks;

