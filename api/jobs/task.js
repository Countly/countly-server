'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('api:task'),
    Promise = require("bluebird"),
    plugins = require('../../plugins/pluginManager.js');
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
            //dont run task if running or is a subtask
            if (task.status === 'running' || task.status === 'rerunning' || task.subtask) {
                return false;
            }
            var lastStart = task.start || 0;
            var lastEnd = task.end || lastStart; //task not running, but end time not recorded(Should not happen) Use start time to prevent further errors.
            //for taskgroup - check if any of subtasks is running
            //use 
            if (task.taskgroup && task.subtasks) {
                for (var k in task.subtasks) {
                    if (task.subtasks[k].end > lastEnd) {
                        lastEnd = task.subtasks[k].end;
                    }
                    if (task.subtasks[k].status === 'running' || task.subtasks[k].status === 'rerunning') {
                        return false;
                    }
                }
            }

            const now = Date.now();
            const duration = lastEnd - lastStart;

            var interval = plugins.getConfig("api").reports_regenerate_interval;
            interval = parseInt(interval, 10) || 3600; //in seconds. If there is no int - then using 1 hour
            if (task.start === 0) { //never started
                return true;
            }

            if ((now + duration - lastStart) / 1000 >= interval) {
                return true;
            }
            return false;
        }

        plugins.loadConfigs(common.db, function() {
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
                                id: task._id,
                                autoUpdate: true
                            }, () => {});
                        }
                        catch (e) {
                            log.e(e, e.stack);
                        }
                    })();
                });

                done();
            });
        });
    }
}

module.exports = MonitorJob;