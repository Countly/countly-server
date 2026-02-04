/**
 * Task Monitor Job
 * Auto-refresh tasks based on schedule
 * @module api/jobs/task
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db, Document } from 'mongodb';

const Job = require("../../jobServer/Job");
const log = require('../utils/log.js')('api:task');
const asyncjs = require("async");
const plugins = require('../../plugins/pluginManager.ts');
const common = require('../utils/common.js');
const taskmanager = require('../utils/taskmanager.js');

const { processRequest } = require('../utils/requestProcessor');
common.processRequest = processRequest;

interface SubtaskDocument {
    end: number;
    status: string;
}

interface TaskDocument extends Document {
    _id: string;
    status: string;
    subtask?: boolean;
    start?: number;
    end?: number;
    taskgroup?: boolean;
    subtasks?: Record<string, SubtaskDocument>;
    dirty?: boolean;
    autoRefresh?: boolean;
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

type DoneCallback = (error?: Error | null) => void;

/**
 * Task Monitor Job extend from Countly Job
 */
class MonitorJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns schedule configuration
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: "schedule",
            value: "*/5 * * * *" // Every 5 minutes
        };
    }

    /**
     * Run the job
     * @param db - connection
     * @param done - callback
     */
    run(db: Db, done: DoneCallback): void {
        const self = this as { _json?: unknown };
        /**
         * Filter tasks to run base on job run time
         * @param task - object from db
         * @returns return true if can run now
         */
        function tasksFilter(task: TaskDocument): boolean {
            //dont run task if running or is a subtask
            if (task.status === 'running' || task.status === 'rerunning' || task.subtask) {
                return false;
            }
            const lastStart = task.start || 0;
            let lastEnd = task.end || lastStart; //task not running, but end time not recorded(Should not happen) Use start time to prevent further errors.
            //for taskgroup - check if any of subtasks is running
            //use
            if (task.taskgroup && task.subtasks) {
                for (const k in task.subtasks) {
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

            let interval = plugins.getConfig("api").reports_regenerate_interval;
            interval = Number.parseInt(interval, 10) || 3600; //in seconds. If there is no int - then using 1 hour
            if (task.start === 0) { //never started
                return true;
            }

            if (task.dirty) {
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
            }).toArray(function(err: Error | null, tasks: TaskDocument[] | null) {
                log.d('Running Task Monitor Job ....');
                log.d("job info:", self._json, tasks);
                if (tasks) {
                    const filteredTasks = tasks.filter(tasksFilter);
                    asyncjs.eachSeries(filteredTasks, function(task: TaskDocument, next: () => void) {
                        taskmanager.rerunTask({
                            db: common.db,
                            id: task._id,
                            autoUpdate: true,
                            dirty: task.dirty
                        }, function(e: Error | null) {
                            if (e) {
                                log.e(e, (e as Error).stack);
                            }
                            next();
                        });
                    }, function() {
                        done();
                    });
                }
                else {
                    done();
                }
            });
        });
    }
}

export default MonitorJob;
