'use strict';
/*
 * api:task (task monitor) runs as an IPCJob, i.e. in a forked executor subprocess
 * rather than inline in the master process. Behaviour is unchanged; isolating it
 * keeps this lightweight monitor from being starved by heavy jobs sharing the
 * master thread. getConcurrency()=1 guarantees at most one monitor pass at a time.
 */

const job = require('../parts/jobs/job.js'),
    res = require('../parts/jobs/resource.js'),
    log = require('../utils/log.js')('api:task'),
    asyncjs = require("async"),
    plugins = require('../../plugins/pluginManager.js');
const common = require('../utils/common.js');
const taskmanager = require('../utils/taskmanager.js');

const { processRequest } = require('../utils/requestProcessor');
common.processRequest = processRequest;

/** Minimal lifecycle resource */
class TaskMonitorResource extends res.Resource {
    /** open @returns {Promise} promise */
    open() {
        this.opened();
        return Promise.resolve();
    }
    /** close @returns {Promise} promise */
    close() {
        this.closed();
        return Promise.resolve();
    }
    /** checkActive - keep the resource alive only while busy; close (and exit the executor)
     * when idle so it does not hold memory. @returns {Promise} true while busy, false when idle */
    checkActive() {
        return Promise.resolve(this.isBusy);
    }
}

/**
 *  Task Monitor Job - runs in a forked executor subprocess
 */
class MonitorJob extends job.IPCJob {
    /** resourceName @returns {string} resource type name */
    resourceName() {
        return 'api:task';
    }
    /** createResource @param {string} _id id @param {string} name name @returns {Resource} resource */
    createResource(_id, name) {
        return new TaskMonitorResource(_id, name);
    }
    /** releaseResource @param {object} resource resource @returns {Promise} promise */
    releaseResource(resource) {
        return resource.close();
    }
    /** getConcurrency @returns {number} at most one monitor pass at a time */
    getConcurrency() {
        return 1;
    }

    /**
     * Run the job in the forked subprocess
     * @returns {Promise} promise resolved when the monitor pass completes
     */
    run() {
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

        return new Promise(function(resolve) {
            plugins.loadConfigs(common.db, function() {
                common.db.collection("long_tasks").find({
                    autoRefresh: true,
                }).toArray(function(err, tasks) {
                    log.d('Running Task Monitor Job ....');
                    log.d("job info:", self._json, tasks);
                    if (tasks) {
                        const filteredTasks = tasks.filter(tasksFilter);
                        asyncjs.eachSeries(filteredTasks, function(task, next) {
                            taskmanager.rerunTask({
                                db: common.db,
                                id: task._id,
                                autoUpdate: true
                            }, function(e) {
                                if (e) {
                                    log.e(e, e.stack);
                                }
                                next();
                            });
                        }, function() {
                            resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
}

module.exports = MonitorJob;
