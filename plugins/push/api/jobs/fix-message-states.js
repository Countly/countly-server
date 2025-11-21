/**
 * @typedef {import('mongodb').Db} Db
 * @typedef {import('../new/types/schedule.ts').Schedule} Schedule
 * @typedef {import('../new/types/schedule.ts').ScheduleCollection} ScheduleCollection
 * @typedef {import('../new/types/message.ts').Message} Message
 * @typedef {import('../new/types/message.ts').MessageCollection} MessageCollection
 * @typedef {{ type: string; value: string; }} ScheduleConfig
 * @typedef {() => void} DoneCallback
 * @typedef {(i: number, j: number, message: string) => void} ProgressCallback
 */

const { Job } = require('../../../../jobServer/index.js');

/**
 * Job to clear and fix message and schedule states.
 */
class ClearMessageResultsJob extends Job {
    /**
     * Get the schedule configuration for the job.
     * @returns {ScheduleConfig} Schedule configuration object
     */
    getSchedule() {
        return {
            type: 'schedule',
            value: '0 0 * * *'
        };
    }

    /**
     * Fixes message and schedule states in the database.
     *
     * @param {Db} db - db object
     * @param {DoneCallback} done - Callback to signal job completion
     * @param {ProgressCallback} progress - Progress reporting function
     * @returns {Promise<void>} Promise that resolves when the job is complete
     */
    async run(db, done, progress) {
        try {
            /** @type {ScheduleCollection} */
            const scheduleCol = db.collection("schedules");
            const timeoutBufferForSchedules = 24 * 60 * 60 * 1000;

            // ================================================
            // update all the schedule events that are still scheduled but are
            // passed their time
            progress(2, 1, "Fixing hanging schedules");
            const unreceivedScheduleEvents = await scheduleCol.updateMany({
                events: {
                    $elemMatch: {
                        status: "scheduled",
                        scheduledTo: {
                            $lt: new Date(Date.now() - timeoutBufferForSchedules)
                        }
                    }
                }
            }, {
                $set: {
                    "events.$.status": "failed",
                    "events.$.error": {
                        name: "TimeoutError",
                        message: "Message sending timed out"
                    }
                }
            });
            if (unreceivedScheduleEvents.modifiedCount) {
                this.log.i(`Updated statuses of ${unreceivedScheduleEvents.modifiedCount} schedule events failed due to timeout`);
            }

            // ================================================
            // update all the schedules that doesn't have any scheduled events
            // but are still marked as scheduled or sending
            progress(2, 2, "Fixing hanging schedules");
            const unfinishedSchedules = await scheduleCol.updateMany({
                status: { $in: ["scheduled", "sending"] },
                "events.status": { $ne: "scheduled" },
            }, {
                $set: { status: "failed" }
            });
            if (unfinishedSchedules.modifiedCount) {
                this.log.i(`Updated statuses of ${unfinishedSchedules.modifiedCount} schedules to failed due to no scheduled events`);
            }
            done();
        }
        catch (error) {
            this.log.e("Error while running the task", error);
        }
    }
}

module.exports = ClearMessageResultsJob;
