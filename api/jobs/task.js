'use strict';

const {Job} = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('job:api:task'),
    Promise = require("bluebird");
const taskmanager = require('../utils/taskmanager.js');
const moment = require('moment');

/**
 *  Task Monitor Job extend from Countly Job
 */
class MonitorJob extends Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        const self = this;
        const targetHour = (new moment()).hours();
        db.collection("long_tasks").find({
            autoRefresh: true,
            r_hour: targetHour
        }).toArray(function(err, tasks) {
            if (err) {
                return done(err);
            }
            log.d('Running Task Monitor Job ....');
            log.d("job info:", self._json, tasks);
            tasks.forEach((task)=>{
                return Promise.coroutine(function *() { // eslint-disable-line require-yield
                    try {
                        taskmanager.rerunTask({
                            db: db,
                            id: task._id
                        }, () => {});
                    }
                    catch (e) {
                        log.e(e, e.stack);
                    }
                })();
            });

            done();
        });
    }
}

module.exports = MonitorJob;