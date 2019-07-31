'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('api:task'),
    Promise = require("bluebird");
const common = require('../utils/common.js');
const taskmanager = require('../utils/taskmanager.js');

/**
 *  Task Monitor Job extend from Countly Job
 */
class MonitorJob extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        const self = this;
        /**
         * Filter tasks to run base on job run time
         * @param {object} task object from db
         * @return {boolean} return true if can run now
         */
        function tasksFilter(task) {
            if (task.status === 'running' || task.status === 'rerunning') {
                return false;
            }
            const lastStart = task.start || 0;
            const lastEnd = task.end || 0;
            const now = Date.now();
            const duration = lastEnd - lastStart;
            if (duration <= 60 * 1000 && duration >= 0) {
                return true;
            }
            if (duration <= 10 * 60 * 1000 && now - lastEnd >= 2 * 60 * 60 * 1000) {
                return true;
            }
            if (duration <= 30 * 60 * 1000 && now - lastEnd >= 4 * 60 * 60 * 1000) {
                return true;
            }
            if (duration <= 60 * 60 * 1000 && now - lastEnd >= 12 * 60 * 60 * 1000) {
                return true;
            }
            if (duration > 60 * 60 * 1000 && now - lastEnd >= 24 * 60 * 60 * 1000) {
                return true;
            }
            return false;
        }

        common.db.collection("long_tasks").find({
            autoRefresh: true,
        }).toArray(function(err, tasks) {
            log.d('Running Task Monitor Job ....');
            log.d("job info:", self._json, tasks);
            const filteredTasks = tasks.filter(tasksFilter);
            filteredTasks.forEach((task) => {
                return Promise.coroutine(function *() { // eslint-disable-line require-yield
                    try {
                        taskmanager.rerunTask({
                            db: common.db,
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