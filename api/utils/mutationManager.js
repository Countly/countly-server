const common = require('./common.js'),
    log = require('./log.js')('api:mutationManager'),
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
    manager.MUTATION_STATUS = {
        QUEUED: "queued",
        RUNNING: "running",
        FAILED: "failed",
        AWAITING_CH_MUTATION_VALIDATION: "awaiting_ch_mutation_validation",
        COMPLETED: "completed"
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
        common.db.collection('mutation_manager').ensureIndex({"mutation_completion_ts": 1}, {expireAfterSeconds: 3 * 24 * 60 * 60}, function() {});
    });

    plugins.register("/core/delete_granular_data", async function(ob) {
        const db = ob.db;
        const query = ob.query;
        const collection = ob.collection;
        const type = 'delete';
        log.d("Mutation (delete) queued:" + JSON.stringify({ db, collection, query }));
        const now = Date.now();

        await common.db.collection("mutation_manager").insertOne({
            db,
            collection,
            query,
            type,
            ts: now,
            status: manager.MUTATION_STATUS.QUEUED,
            running: false
        });
    });

    plugins.register("/core/update_granular_data", async function(ob) {
        const db = ob.db;
        const query = ob.query;
        const update = ob.update;
        const collection = ob.collection;
        const type = 'update';
        log.d("Mutation (update) queued:" + JSON.stringify({ db, collection, query }));
        const now = Date.now();

        await common.db.collection("mutation_manager").insertOne({
            db,
            collection,
            query,
            update,
            type,
            ts: now,
            status: manager.MUTATION_STATUS.QUEUED,
            running: false
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
                    completed: summary.completed,
                    oldest_wait_sec: summary.oldest_wait_sec
                }
            };

            if (manager.isClickhouseEnabled()) {
                metrics.mutations = await getPendingMutationsFromCH();
            }

            return {
                provider: 'mutation',
                healthy: summary.failed === 0,
                issues: [],
                metrics,
                date: new Date().toISOString()
            };
        }
        catch (e) {
            return {
                provider: 'mutation',
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

        const agg = await common.db.collection('mutation_manager').aggregate([
            {
                $group: {
                    _id: null,
                    queued: { $sum: { $cond: [ { $eq: [ "$status", manager.MUTATION_STATUS.QUEUED ] }, 1, 0 ] } },
                    running: { $sum: { $cond: [ { $eq: [ "$status", manager.MUTATION_STATUS.RUNNING ] }, 1, 0 ] } },
                    awaiting_validation: { $sum: { $cond: [ { $eq: [ "$status", manager.MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION ] }, 1, 0 ] } },
                    failed: { $sum: { $cond: [ { $eq: [ "$status", manager.MUTATION_STATUS.FAILED ] }, 1, 0 ] } },
                    completed_24h: {
                        $sum: {
                            $cond: [ {
                                $and: [
                                    { $eq: [ "$status", manager.MUTATION_STATUS.COMPLETED ] },
                                    { $gte: [ "$mutation_completion_ts", dayAgo ] }
                                ]
                            }, 1, 0 ]
                        }
                    }
                }
            },
            { $project: { _id: 0, queued: 1, running: 1, awaiting_validation: 1, failed: 1, completed: "$completed_24h" } }
        ]).toArray();

        const counts = agg[0] || { queued: 0, running: 0, awaiting_validation: 0, failed: 0, completed: 0 };

        let oldest_wait_sec = 0;
        if (counts.queued > 0) {
            const oldest = await common.db.collection('mutation_manager')
                .find({ status: manager.MUTATION_STATUS.QUEUED }, { projection: { ts: 1 } })
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
            if (!chHealth || typeof chHealth.listPendingMutations !== 'function') {
                return { pending: 0, details: [], error: 'clickhouse_health_unavailable' };
            }
            return await chHealth.listPendingMutations();
        }
        catch (e) {
            return { pending: 0, details: [], error: 'clickhouse_health_unavailable' };
        }
    }
})(manager);

module.exports = manager;
