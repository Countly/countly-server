const common = require('../utils/common.js');
const log = require("../utils/log.js")("job:deletionManager");
const Job = require("../../jobServer/Job.js");

/** Class for the deletion manager job **/
class DeletionManagerJob extends Job {
    /**
     * Get schedule for the job
     * @returns {GetScheduleConfig} Schedule configuration object
     */
    getSchedule() {
        return {
            type: "schedule",
            // value: "* * * * *" // Every minute
            value: "*/5 * * * *" // todo: Every 5 minutes for now to testing purposes.
        };
    }

    /**
     * Run the job
     * @param {done} done callback
    */
    async run() {
        const now = Date.now();
        const picked = await common.db.collection("deletion_manager").findOneAndUpdate(
            { running: false },
            { $set: { running: true, ts: now, status: "running" } },
            { returnDocument: "after" }
        );

        const task = picked && picked.value;
        if (!task) {
            return;
        }

        try {
            if (task.engine === "mongo" || task.db !== "drill") {
                await this.deleteFromMongo(task);
            }
            else if (task.engine === "clickhouse") {
                log.d("ClickHouse deletion path TODO for task", task._id);
            }

            await common.db.collection("deletion_manager").deleteOne({ _id: task._id });
        }
        catch (e) {
            log.e("Deletion task failed", task._id, e);
            await common.db.collection("deletion_manager").updateOne(
                { _id: task._id },
                { $set: { running: false, status: "failed", error: (e && e.message) || String(e) } }
            );
        }
    }

    /**
     * Delete documents from MongoDB
     * @param {Object} task - The deletion task
     */
    async deleteFromMongo(task) {
        const dbi = task.db === "drill" ? common.drillDb
            : task.db === "countly_out" ? common.outDb
                : common.db;

        const opt = task.options || {};
        const batchSize = Number.isFinite(opt.batchSize) ? opt.batchSize : 10000;
        const sleepMs = Number.isFinite(opt.sleepMs) ? opt.sleepMs : 500;
        const maxBatches = Number.isFinite(opt.maxBatches) ? opt.maxBatches : 0;
        const maxDurationMs = Number.isFinite(opt.maxDurationMs) ? opt.maxDurationMs : 10 * 60 * 1000; // 10 minutes
        const deadline = Date.now() + maxDurationMs;

        let totalDeleted = 0;
        let batches = 0;

        /**
         * Sleep for a given duration
         * @param {*} ms - milliseconds to sleep
         * @returns {Promise} - A promise that resolves after the given duration
         */
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        const cursor = dbi.collection(task.collection)
            .find(task.query, { projection: { _id: 1 } })
            .batchSize(batchSize);

        while (await cursor.hasNext()) {
            const fresh = await common.db.collection("deletion_manager")
                .findOne({ _id: task._id }, { projection: { status: 1 } });
            if (!fresh || fresh.status === "cancelled") {
                break;
            }

            const ids = [];
            for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
                const doc = await cursor.next();
                ids.push(doc._id);
            }

            if (!ids.length) {
                break;
            }

            const res = await dbi.collection(task.collection).deleteMany({ _id: { $in: ids } });
            const deleted = res.deletedCount || 0;
            totalDeleted += deleted;
            batches++;

            await common.db.collection("deletion_manager").updateOne(
                { _id: task._id },
                { $inc: { "progress.deleted": deleted } }
            );

            if ((maxBatches && batches >= maxBatches) || Date.now() > deadline) {
                break;
            }

            if (sleepMs) {
                await sleep(sleepMs);
            }
        }

        log.d("Mongo deletion done", {
            taskId: task._id,
            totalDeleted,
            batches,
            tookMs: Date.now() - (deadline - maxDurationMs)
        });

        await cursor.close();
    }

}

module.exports = DeletionManagerJob;