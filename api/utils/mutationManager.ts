/**
 * @module api/utils/mutationManager
 */
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const common = require('./common.js');
const log = require('./log.js')('api:mutationManager');
const plugins = require('../../plugins/pluginManager.ts');

interface Params {
    qstring?: {
        status?: string | string[];
        db?: string | string[];
        collection?: string | string[];
        type?: string | string[];
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface MutationDocument {
    _id?: string;
    db: string;
    collection: string;
    query: Record<string, unknown>;
    update?: Record<string, unknown>;
    type: string;
    ts: number;
    status: string;
    running: boolean;
    mutation_completion_ts?: Date;
}

interface QueueSummary {
    queued: number;
    running: number;
    awaiting_ch_mutation_validation: number;
    failed: number;
    completed: number;
    oldest_wait_sec: number;
}

interface ObservabilityResult {
    provider: string;
    healthy: boolean;
    issues: string | string[];
    metrics: {
        summary?: QueueSummary;
        queue?: MutationDocument[];
        mutations?: {
            pending: number;
            details: unknown[];
            error?: string;
        };
    };
    date: string;
}

interface CHHealth {
    listPendingMutations?: () => Promise<{
        pending: number;
        details: unknown[];
        error?: string;
    }>;
}

let chHealth: CHHealth | null = null;
try {
    chHealth = require('../../plugins/clickhouse/api/health.js');
}
catch {
    // ClickHouse plugin not available
}

const MUTATION_STATUS = {
    QUEUED: 'queued',
    RUNNING: 'running',
    FAILED: 'failed',
    AWAITING_CH_MUTATION_VALIDATION: 'awaiting_ch_mutation_validation',
    COMPLETED: 'completed'
} as const;

/**
 * Check if ClickHouse is enabled
 * @returns true if ClickHouse is enabled, false otherwise
 */
function isClickhouseEnabled(): boolean {
    return !!(common.queryRunner
        && typeof common.queryRunner.isAdapterAvailable === 'function'
        && common.queryRunner.isAdapterAvailable('clickhouse'));
}

plugins.register('/master', function() {
    common.db.collection('mutation_manager').ensureIndex({'mutation_completion_ts': 1}, {expireAfterSeconds: 30 * 24 * 60 * 60}, function() {});
});

plugins.register('/core/delete_granular_data', async function(ob: { db: string; query: Record<string, unknown>; collection: string }) {
    const db = ob.db;
    const query = ob.query;
    const collection = ob.collection;
    const type = 'delete';
    log.d('Mutation (delete) queued:' + JSON.stringify({ db, collection, query }));
    const now = Date.now();

    await common.db.collection('mutation_manager').insertOne({
        db,
        collection,
        query,
        type,
        ts: now,
        status: MUTATION_STATUS.QUEUED,
        running: false
    });
});

plugins.register('/core/update_granular_data', async function(ob: { db: string; query: Record<string, unknown>; update: Record<string, unknown>; collection: string }) {
    const db = ob.db;
    const query = ob.query;
    const update = ob.update;
    const collection = ob.collection;
    const type = 'update';
    log.d('Mutation (update) queued:' + JSON.stringify({ db, collection, query }));
    const now = Date.now();

    await common.db.collection('mutation_manager').insertOne({
        db,
        collection,
        query,
        update,
        type,
        ts: now,
        status: MUTATION_STATUS.QUEUED,
        running: false
    });
});

plugins.register('/system/observability/collect', async function(ob: { params?: Params }): Promise<ObservabilityResult> {
    try {
        const filters = buildQueueFilters(ob && ob.params);
        const summary = await getQueueSummary();
        const queue = await getQueueDetails(filters);

        const metrics: ObservabilityResult['metrics'] = {
            summary: {
                queued: summary.queued,
                running: summary.running,
                awaiting_ch_mutation_validation: summary.awaiting_ch_mutation_validation,
                failed: summary.failed,
                completed: summary.completed,
                oldest_wait_sec: summary.oldest_wait_sec
            },
            queue
        };

        if (isClickhouseEnabled()) {
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
            issues: (e && (e as Error).message) || String(e),
            metrics: {},
            date: new Date().toISOString()
        };
    }
});

/**
 * Get full queue details
 * @param filters - Mongo query filters
 * @returns All mutation_manager documents
 */
async function getQueueDetails(filters?: Record<string, unknown>): Promise<MutationDocument[]> {
    const query = filters || {};
    const rows = await common.db.collection('mutation_manager').find(query).sort({ ts: 1 }).toArray() as MutationDocument[];
    return rows;
}

/**
 * Get deletion queue summary
 * @returns Queue summary
 */
async function getQueueSummary(): Promise<QueueSummary> {
    const now = Date.now();
    const agg = await common.db.collection('mutation_manager').aggregate([
        {
            $group: {
                _id: null,
                queued: { $sum: { $cond: [ { $eq: [ '$status', MUTATION_STATUS.QUEUED ] }, 1, 0 ] } },
                running: { $sum: { $cond: [ { $eq: [ '$status', MUTATION_STATUS.RUNNING ] }, 1, 0 ] } },
                awaiting_ch_mutation_validation: { $sum: { $cond: [ { $eq: [ '$status', MUTATION_STATUS.AWAITING_CH_MUTATION_VALIDATION ] }, 1, 0 ] } },
                failed: { $sum: { $cond: [ { $eq: [ '$status', MUTATION_STATUS.FAILED ] }, 1, 0 ] } },
                completed: { $sum: { $cond: [ { $eq: [ '$status', MUTATION_STATUS.COMPLETED ] }, 1, 0 ] } }
            }
        },
        { $project: { _id: 0, queued: 1, running: 1, awaiting_ch_mutation_validation: 1, failed: 1, completed: 1 } }
    ]).toArray() as { queued: number; running: number; awaiting_ch_mutation_validation: number; failed: number; completed: number }[];

    const counts = agg[0] || { queued: 0, running: 0, awaiting_ch_mutation_validation: 0, failed: 0, completed: 0 };

    let oldest_wait_sec = 0;
    if (counts.queued > 0) {
        const oldest = await common.db.collection('mutation_manager')
            .find({ status: MUTATION_STATUS.QUEUED }, { projection: { ts: 1 } })
            .sort({ ts: 1 }).limit(1).toArray() as { ts: number }[];
        const oldestTs = oldest && oldest[0] && Number(oldest[0].ts) || null;
        if (oldestTs) {
            oldest_wait_sec = Math.floor((now - oldestTs) / 1000);
        }
    }

    return { ...counts, oldest_wait_sec };
}

/**
 * Get operational snapshot from ClickHouse
 * @returns Operational snapshot
 */
async function getPendingMutationsFromCH(): Promise<{ pending: number; details: unknown[]; error?: string }> {
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

/**
 * Build Mongo filter object for queue listing from query params
 * @param params - request params
 * @returns mongo query
 */
function buildQueueFilters(params: Params = {}): Record<string, string> {
    const qs = params.qstring || {};
    const keys = ['status', 'db', 'collection', 'type'] as const;

    return keys.reduce((acc: Record<string, string>, key) => {
        let val = qs[key];
        if (Array.isArray(val)) {
            val = val[0];
        }
        if (typeof val !== 'string') {
            return acc;
        }
        val = val.trim();
        if (!val || val === 'all') {
            return acc;
        }
        acc[key] = val;
        return acc;
    }, {});
}

const manager = {
    MUTATION_STATUS,
    isClickhouseEnabled
};

export default manager;
export { manager, MUTATION_STATUS, isClickhouseEnabled };
