// /**
//  * @typedef {import('mongodb').Db} Db
//  * @typedef {import('../new/types/schedule.ts').Schedule} Schedule
//  * @typedef {import('../new/types/message.ts').Message} Message
//  * @typedef {import("mongodb").Collection<Message>} MessageCollection
//  * @typedef {import("mongodb").Collection<Schedule>} ScheduleCollection
//  */

// const { Job } = require('../../../../api/parts/jobs/job.js');
// const log = require('../../../../api/utils/log.js')('push:fix-message-states');

// /**
//  * Job to clear and fix message and schedule states.
//  */
// class ClearMessageResultsJob extends Job {
//     /**
//      * Fixes message and schedule states in the database.
//      *
//      * @param {Db} db - db object
//      * @returns {Promise<void>} Promise that resolves when the job is complete
//      */
//     async run(db) {
//         try {
//             /** @type {ScheduleCollection} */
//             const scheduleCol = db.collection("schedules");
//             const timeoutBufferForSchedules = 24 * 60 * 60 * 1000;

//             // ================================================
//             // update all the schedule events that are still scheduled but are
//             // passed their time
//             const unreceivedScheduleEvents = await scheduleCol.updateMany({
//                 events: {
//                     $elemMatch: {
//                         status: "scheduled",
//                         scheduledTo: {
//                             $lt: new Date(Date.now() - timeoutBufferForSchedules)
//                         }
//                     }
//                 }
//             }, {
//                 $set: {
//                     "events.$.status": "failed",
//                     "events.$.error": {
//                         name: "TimeoutError",
//                         message: "Message sending timed out"
//                     }
//                 }
//             });
//             if (unreceivedScheduleEvents.modifiedCount) {
//                 log.i(`Updated statuses of ${unreceivedScheduleEvents.modifiedCount} schedule events failed due to timeout`);
//             }

//             // ================================================
//             // update all the schedules that doesn't have any scheduled events
//             // but are still marked as scheduled or sending
//             const unfinishedSchedules = await scheduleCol.updateMany({
//                 status: { $in: ["scheduled", "sending"] },
//                 "events.status": { $ne: "scheduled" },
//             }, {
//                 $set: { status: "failed" }
//             });
//             if (unfinishedSchedules.modifiedCount) {
//                 log.i(`Updated statuses of ${unfinishedSchedules.modifiedCount} schedules to failed due to no scheduled events`);
//             }
//         }
//         catch (error) {
//             log.e("Error while running the task", error);
//         }
//     }
// }

// module.exports = ClearMessageResultsJob;
