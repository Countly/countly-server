const common = require('./common.js'),
    log = require('./log.js')('api:deletionManager'),
    plugins = require('../../plugins/pluginManager.js'),
    manager = {};

let chHealth = null;
try {
    chHealth = require('../../plugins/clickhouse/api/health.js');
}
catch {
    //
}

(function() {
    manager.DELETION_STATUS = {
        QUEUED: "queued",
        RUNNING: "running",
        FAILED: "failed",
        AWAITING_CH_MUTATION_VALIDATION: "awaiting_ch_mutation_validation",
        DELETED: "deleted"
    };

    /**
     * Check if ClickHouse is enabled
     * @returns {boolean} true if ClickHouse is enabled, false otherwise
     */
    manager.isClickhouseEnabled = function() {
        return !!(common.queryRunner
            && typeof common.queryRunner.isAdapterAvailable === 'function'
            && common.queryRunner.isAdapterAvailable('clickhouse'));
    };

    plugins.register("/master", function() {
        common.db.collection('deletion_manager').ensureIndex({"deletion_completion_ts": 1}, {expireAfterSeconds: 3 * 24 * 60 * 60}, function() {});
    });

    plugins.register("/core/delete_granular_data", async function(ob) {
        var db = ob.db;
        var query = ob.query;
        var collection = ob.collection || "drill_events";
        log.d("Deletion triggered for:" + JSON.stringify({
            "db": db,
            "collection": collection,
            "query": query
        }));
        //We can do it smarter after. When we insert check if there is not one to extend. 
        //For example - if we delete multiple events for same app - merge them into single query. Definitely better for mongodb.
        var now = new Date().valueOf();

        await common.db.collection("deletion_manager").insertOne({
            "db": db,
            "collection": collection,
            "query": query,
            "ts": now,
            "status": manager.DELETION_STATUS.QUEUED,
            "running": false
        });
    });

    plugins.register('/system/observability/collect', async function() {
        try {
            const summary = await getQueueSummary();

            const metrics = {
                summary: {
                    queued: summary.queued,
                    running: summary.running,
                    awaiting_validation: summary.awaiting_validation,
                    failed: summary.failed,
                    deleted: summary.deleted,
                    oldest_wait_sec: summary.oldest_wait_sec
                }
            };

            if (manager.isClickhouseEnabled()) {
                metrics.mutations = await getPendingMutationsFromCH();
            }

            return {
                provider: 'deletion',
                healthy: summary.failed === 0,
                issues: [],
                metrics,
                date: new Date().toISOString()
            };
        }
        catch (e) {
            return {
                provider: 'deletion',
                healthy: false,
                issues: (e && e.message) || e,
                metrics: {},
                date: new Date().toISOString()
            };
        }
    });

    /**
     * Get deletion queue summary
     * @returns {Promise<Object>} - Queue summary
     */
    async function getQueueSummary() {
        const now = Date.now();
        const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

        const agg = await common.db.collection('deletion_manager').aggregate([
            {
                $group: {
                    _id: null,
                    queued: { $sum: { $cond: [ { $eq: [ "$status", manager.DELETION_STATUS.QUEUED ] }, 1, 0 ] } },
                    running: { $sum: { $cond: [ { $eq: [ "$status", manager.DELETION_STATUS.RUNNING ] }, 1, 0 ] } },
                    awaiting_validation: { $sum: { $cond: [ { $eq: [ "$status", manager.DELETION_STATUS.AWAITING_CH_MUTATION_VALIDATION ] }, 1, 0 ] } },
                    failed: { $sum: { $cond: [ { $eq: [ "$status", manager.DELETION_STATUS.FAILED ] }, 1, 0 ] } },
                    deleted_24h: {
                        $sum: {
                            $cond: [ {
                                $and: [
                                    { $eq: [ "$status", manager.DELETION_STATUS.DELETED ] },
                                    { $gte: [ "$deletion_completion_ts", dayAgo ] }
                                ]
                            }, 1, 0 ]
                        }
                    }
                }
            },
            { $project: { _id: 0, queued: 1, running: 1, awaiting_validation: 1, failed: 1, deleted: "$deleted_24h" } }
        ]).toArray();

        const counts = agg[0] || { queued: 0, running: 0, awaiting_validation: 0, failed: 0, deleted: 0 };

        let oldest_wait_sec = 0;
        if (counts.queued > 0) {
            const oldest = await common.db.collection('deletion_manager')
                .find({ status: manager.DELETION_STATUS.QUEUED }, { projection: { ts: 1 } })
                .sort({ ts: 1 }).limit(1).toArray();
            const oldestTs = oldest && oldest[0] && Number(oldest[0].ts) || null;
            if (oldestTs) {
                oldest_wait_sec = Math.floor((now - oldestTs) / 1000);
            }
        }

        return { ...counts, oldest_wait_sec };
    }

    /**
     * Get operational snapshot from ClickHouse
     * @param {*} options - Query options
     * @returns {Promise<Object>} - Operational snapshot
     */
    async function getPendingMutationsFromCH() {
        try {
            const rows = await chHealth.listPendingMutations({ database: 'countly_drill', table: 'drill_events' });
            const list = Array.isArray(rows) ? rows : [];
            return {
                pending: list.length,
                details: list.map(r => ({
                    command: r.command + '',
                    is_killed: r.is_killed === 1 || r.is_killed === '1',
                    latest_fail_reason: r.latest_fail_reason || null
                }))
            };
        }
        catch (e) {
            return { pending: 0, details: [], error: 'clickhouse_health_unavailable' };
        }
    }
})(manager);

module.exports = manager;
