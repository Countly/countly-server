/**
 * Clear Auto Tasks Job
 * Clears auto tasks older than 90 days
 * @module api/jobs/clearAutoTasks
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db, Document, Collection } from 'mongodb';

const log = require('../utils/log.js')('job:clearAutoTasks');
const taskManager = require('../utils/taskmanager');
const Job = require("../../jobServer/Job");

interface TaskDocument extends Document {
    _id: string;
    manually_create?: boolean;
    ts: number;
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

type DoneCallback = (error?: Error | null) => void;

// Extended collection type that supports callback patterns used in legacy code
type LegacyCollection = Collection & {
    find(filter?: object): { toArray(callback: (err: Error | null, docs: unknown[]) => void): void };
};

/**
 * clear task record in db with task id
 * @param taskId - the id of task in db.
 * @returns Promise object
 */
const clearTaskRecord = (taskId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        taskManager.deleteResult({ id: taskId }, (err2: Error | null) => {
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
     * @returns schedule configuration
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: "schedule",
            value: "0 2 * * *" // Every day at 2:00 AM
        };
    }

    /**
     * Run the job
     * @param db - connection
     * @param done - callback
     */
    run(db: Db, done: DoneCallback): void {
        const beforeTime = Date.now() - 1000 * 60 * 60 * 24 * 90; //90 days ago
        const query = {
            manually_create: { $ne: true },
            ts: { $lt: beforeTime }
        };
        const tasksCollection = db.collection("long_tasks") as unknown as LegacyCollection;
        tasksCollection.find(query).toArray(async function(err: Error | null, tasks: unknown[]) {
            const taskDocs = tasks as TaskDocument[];
            if (err) {
                log.e("Error deleting auto tasks.");
            }
            try {
                if (taskDocs) {
                    for (let i = 0; i < taskDocs.length; i++) {
                        await clearTaskRecord(taskDocs[i]._id);
                    }
                }
            }
            catch (e) {
                log.d("error while deleting auto task record: %j", e);
            }
            done();
        });
    }
}

export default ClearAutoTasks;
