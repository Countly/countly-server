import type { Db } from "mongodb";
import { ObjectId } from "mongodb";

// Schedule events older than this are considered timed out.
// 48 hours accounts for scheduler delays and timezone spread.
export const EVENT_TIMEOUT_MS = 48 * 60 * 60 * 1000;

// After all events are composed, if results haven't arrived within this
// window past the LAST event's scheduledTo, the corresponding push events
// are assumed lost. 24 hours covers: timezone spread (~26h is already
// handled by using $max of events.scheduledTo), composition time for large
// audiences, SEND queue processing, TooLateToSend windows, and transient
// process restarts.
export const RESULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export const LOST_RESULT_ERROR = "LostResults: Push results were not received";

const STEPS = 4;

interface Logger {
    i: (...args: any[]) => void;
    e: (...args: any[]) => void;
}

type ProgressFn = (total: number, current: number, message: string) => void;

interface FixMessageStatesDeps {
    db: Db;
    log: Logger;
    progress?: ProgressFn;
}

/**
 * Detects and fixes stale schedule / message states caused by lost Kafka
 * events, process restarts, or partial failures in the push pipeline.
 *
 * Steps (executed in order):
 *  1. Cancel orphaned schedules (message inactive/missing, app missing)
 *  2. Fail timed-out schedule events (COMPOSE event never arrived)
 *  3. Close result gaps (pushes sent but results never came back)
 *  4. Fix stale schedule statuses (re-evaluate based on event/result state)
 */
export async function fixMessageStates({ db, log, progress }: FixMessageStatesDeps): Promise<void> {
    const report: ProgressFn = progress || (() => {});

    const scheduleCol = db.collection("message_schedules");
    const messageCol = db.collection("messages");
    const appCol = db.collection("apps");

    // ================================================================
    // Step 1: Cancel orphaned schedules
    // Schedules whose message is no longer active, was deleted, or
    // whose app no longer exists cannot make progress — cancel them.
    // ================================================================
    report(STEPS, 1, "Canceling orphaned schedules");

    const activeSchedules = await scheduleCol.find(
        { status: { $in: ["scheduled", "sending"] } },
        { projection: { messageId: 1, appId: 1 } }
    ).toArray();

    if (activeSchedules.length) {
        const messageIds = [...new Set(activeSchedules.map(s => s.messageId.toString()))];
        const appIds = [...new Set(activeSchedules.map(s => s.appId.toString()))];

        const existingMessages = await messageCol.find(
            { _id: { $in: messageIds.map(id => new ObjectId(id)) } },
            { projection: { _id: 1, status: 1 } }
        ).toArray();

        const existingApps = await appCol.find(
            { _id: { $in: appIds.map(id => new ObjectId(id)) } },
            { projection: { _id: 1 } }
        ).toArray();

        const activeMessageIds = new Set(
            existingMessages
                .filter(m => m.status === "active")
                .map(m => m._id.toString())
        );
        const existingAppIds = new Set(existingApps.map(a => a._id.toString()));

        const orphanedScheduleIds = activeSchedules
            .filter(s =>
                !activeMessageIds.has(s.messageId.toString())
                || !existingAppIds.has(s.appId.toString())
            )
            .map(s => s._id);

        if (orphanedScheduleIds.length) {
            const result = await scheduleCol.updateMany(
                { _id: { $in: orphanedScheduleIds } },
                { $set: { status: "canceled" } }
            );
            log.i(
                `Canceled ${result.modifiedCount} orphaned schedules`
                + ` (message inactive/missing or app missing)`
            );
        }
    }

    // ================================================================
    // Step 2: Fail timed-out schedule events
    // If a schedule event is still "scheduled" long after its
    // scheduledTo date, the COMPOSE Kafka event was lost.
    // Uses arrayFilters to update ALL matching elements (not just the
    // first one like the positional $ operator).
    // ================================================================
    report(STEPS, 2, "Failing timed-out schedule events");

    const eventCutoff = new Date(Date.now() - EVENT_TIMEOUT_MS);
    const timedOut = await scheduleCol.updateMany(
        {
            status: { $in: ["scheduled", "sending"] },
            events: {
                $elemMatch: {
                    status: "scheduled",
                    scheduledTo: { $lt: eventCutoff }
                }
            }
        },
        {
            $set: {
                "events.$[elem].status": "failed",
                "events.$[elem].error": {
                    name: "TimeoutError",
                    message: "Schedule event was not composed within the expected time window"
                }
            }
        },
        {
            arrayFilters: [{
                "elem.status": "scheduled",
                "elem.scheduledTo": { $lt: eventCutoff }
            }]
        }
    );
    if (timedOut.modifiedCount) {
        log.i(
            `Failed ${timedOut.modifiedCount} schedule(s) with timed-out events`
        );
    }

    // ================================================================
    // Step 3: Close result gaps
    // When all events are composed but sent + failed < total, some
    // result events were lost. Add the gap to failed so the schedule
    // can transition to a terminal state in step 4.
    // ================================================================
    report(STEPS, 3, "Closing result gaps for lost push results");

    const resultCutoff = new Date(Date.now() - RESULT_TIMEOUT_MS);
    const stuckSchedules = await scheduleCol.find({
        status: { $in: ["scheduled", "sending"] },
        "events.status": { $ne: "scheduled" },
        // Use the LAST event's scheduledTo (not the schedule's main one)
        // so timezone-aware schedules aren't flagged while later-timezone
        // pushes are still being sent.
        $expr: {
            $and: [
                { $lt: [{ $max: "$events.scheduledTo" }, resultCutoff] },
                {
                    $gt: [
                        "$result.total",
                        { $add: ["$result.sent", "$result.failed"] }
                    ]
                },
            ]
        }
    }).toArray();

    for (const schedule of stuckSchedules) {
        const gap = schedule.result.total
            - schedule.result.sent
            - schedule.result.failed;
        if (gap <= 0) {
            continue;
        }
        const $inc = {
            "result.failed": gap,
            ["result.errors." + LOST_RESULT_ERROR]: gap,
        };
        await scheduleCol.updateOne({ _id: schedule._id }, { $inc });
        await messageCol.updateOne({ _id: schedule.messageId }, { $inc });
        log.i(
            `Closed result gap of ${gap} for schedule ${schedule._id}`
            + ` (message ${schedule.messageId})`
        );
    }

    // ================================================================
    // Step 4: Fix stale schedule statuses
    // All events are done (none "scheduled") but the schedule is still
    // in "scheduled" or "sending". Re-evaluate using the same logic
    // as applyResultObject in resultor.ts.
    // ================================================================
    report(STEPS, 4, "Fixing stale schedule statuses");

    const statusFixed = await scheduleCol.updateMany(
        {
            status: { $in: ["scheduled", "sending"] },
            "events.status": { $ne: "scheduled" },
        },
        [{
            $set: {
                status: {
                    $cond: {
                        if: {
                            $lte: [
                                "$result.total",
                                { $add: ["$result.sent", "$result.failed"] }
                            ]
                        },
                        then: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $gt: ["$result.failed", 0] },
                                        { $lte: ["$result.total", "$result.failed"] }
                                    ]
                                },
                                then: "failed",
                                else: "sent"
                            }
                        },
                        else: "$status"
                    }
                }
            }
        }]
    );
    if (statusFixed.modifiedCount) {
        log.i(
            `Fixed status of ${statusFixed.modifiedCount} schedules`
        );
    }
}
