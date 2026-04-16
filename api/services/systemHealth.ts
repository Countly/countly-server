/**
 * Shared service for system health data (used by both legacy /o/system/* and v2 /health/*).
 *
 * Each function accepts explicit dependencies (db, plugins, config) rather than
 * importing singletons so the module stays testable and free of circular requires.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const plugins = require('../../plugins/pluginManager.ts');
const common = require('../utils/common.js');
const log = require('../utils/log.js')('service:system-health');

// ---------------------------------------------------------------------------
// Kafka events/meta cache (30 s TTL with in-flight dedup)
// ---------------------------------------------------------------------------
const KAFKA_META_CACHE_TTL = 30_000;
let _kafkaMetaCache: any = null;
let _kafkaMetaCacheTs = 0;
let _kafkaMetaCachePromise: Promise<any> | null = null;

// ---------------------------------------------------------------------------
// 1. Observability (mutation + clickhouse)
// ---------------------------------------------------------------------------

/**
 * Dispatches `/system/observability/collect` and returns the fulfilled provider
 * results as an array.
 */
export async function collectObservability(params: any): Promise<any[]> {
    const results = await plugins.dispatchAsPromise('/system/observability/collect', { params });
    return (results || [])
        .filter((r: any) => r && r.status === 'fulfilled' && r.value)
        .map((r: any) => r.value);
}

// ---------------------------------------------------------------------------
// 2. Aggregator status (change-stream resume tokens)
// ---------------------------------------------------------------------------

export async function getAggregatorStatus(): Promise<any[]> {
    const [pluginsData, drillData] = await Promise.all([
        common.db.collection('plugins').findOne({ _id: '_changeStreams' }),
        common.drillDb
            .collection('drill_events')
            .find({}, { projection: { cd: 1 } })
            .sort({ cd: -1 })
            .limit(1)
            .toArray(),
    ]);

    const data: any[] = [];
    const now = Date.now();
    const nowDrill = drillData?.length ? new Date(drillData[0].cd).valueOf() : now;

    if (pluginsData) {
        for (const key in pluginsData) {
            if (key !== '_id') {
                const lastAccepted = new Date(pluginsData[key].cd).valueOf();
                data.push({
                    name: key,
                    last_cd: pluginsData[key].cd,
                    drill: drillData?.[0]?.cd,
                    last_id: pluginsData[key]._id,
                    diff: (now - lastAccepted) / 1000,
                    diffDrill: (nowDrill - lastAccepted) / 1000,
                });
            }
        }
    }
    return data;
}

// ---------------------------------------------------------------------------
// 3. Kafka status overview
// ---------------------------------------------------------------------------

export async function getKafkaStatus(): Promise<any> {
    const KAFKA_QUERY_LIMIT = 500;

    const [consumerState, consumerHealth, lagHistory, connectStatus, stateSummary, healthSummary] =
        await Promise.all([
            common.db
                .collection('kafka_consumer_state')
                .find(
                    {},
                    {
                        projection: {
                            consumerGroup: 1,
                            topic: 1,
                            partitions: 1,
                            lastProcessedAt: 1,
                            batchCount: 1,
                            duplicatesSkipped: 1,
                            lastDuplicateAt: 1,
                            lastBatchSize: 1,
                            avgBatchSize: 1,
                        },
                    },
                )
                .sort({ lastProcessedAt: -1 })
                .limit(KAFKA_QUERY_LIMIT)
                .toArray(),

            common.db
                .collection('kafka_consumer_health')
                .find(
                    {},
                    {
                        projection: {
                            groupId: 1,
                            rebalanceCount: 1,
                            lastRebalanceAt: 1,
                            lastJoinAt: 1,
                            lastMemberId: 1,
                            lastGenerationId: 1,
                            commitCount: 1,
                            lastCommitAt: 1,
                            errorCount: 1,
                            lastErrorAt: 1,
                            lastErrorMessage: 1,
                            recentErrors: 1,
                            totalLag: 1,
                            partitionLag: 1,
                            lagUpdatedAt: 1,
                            updatedAt: 1,
                        },
                    },
                )
                .sort({ updatedAt: -1 })
                .limit(KAFKA_QUERY_LIMIT)
                .toArray(),

            common.db
                .collection('kafka_lag_history')
                .find({}, { projection: { ts: 1, groups: 1, connectLag: 1 } })
                .sort({ ts: -1 })
                .limit(100)
                .toArray(),

            common.db
                .collection('kafka_connect_status')
                .find(
                    {},
                    {
                        projection: {
                            connectorName: 1,
                            connectorState: 1,
                            connectorType: 1,
                            workerId: 1,
                            tasks: 1,
                            updatedAt: 1,
                        },
                    },
                )
                .sort({ updatedAt: -1 })
                .limit(KAFKA_QUERY_LIMIT)
                .toArray(),

            common.db
                .collection('kafka_consumer_state')
                .aggregate([
                    {
                        $group: {
                            _id: null,
                            totalBatchesProcessed: { $sum: { $ifNull: ['$batchCount', 0] } },
                            totalDuplicatesSkipped: { $sum: { $ifNull: ['$duplicatesSkipped', 0] } },
                            avgBatchSizeSum: { $sum: { $ifNull: ['$avgBatchSize', 0] } },
                            groupsWithData: { $sum: { $cond: [{ $gt: ['$avgBatchSize', 0] }, 1, 0] } },
                        },
                    },
                ])
                .toArray(),

            common.db
                .collection('kafka_consumer_health')
                .aggregate([
                    {
                        $group: {
                            _id: null,
                            totalRebalances: { $sum: { $ifNull: ['$rebalanceCount', 0] } },
                            totalErrors: { $sum: { $ifNull: ['$errorCount', 0] } },
                            totalLag: { $sum: { $ifNull: ['$totalLag', 0] } },
                        },
                    },
                ])
                .toArray(),
        ]);

    // Summaries
    const stSummary = stateSummary[0] || {};
    const totalBatchesProcessed = stSummary.totalBatchesProcessed || 0;
    const totalDuplicatesSkipped = stSummary.totalDuplicatesSkipped || 0;
    const avgBatchSizeOverall =
        stSummary.groupsWithData > 0 ? stSummary.avgBatchSizeSum / stSummary.groupsWithData : 0;

    const htSummary = healthSummary[0] || {};
    const totalRebalances = htSummary.totalRebalances || 0;
    const totalErrors = htSummary.totalErrors || 0;
    const totalLagAll = htSummary.totalLag || 0;

    // Transform consumer state rows
    const partitionStats = consumerState.map((state: any) => {
        const partitions = state.partitions || {};
        const partitionCount = Object.keys(partitions).length;
        const activePartitions = Object.values(partitions).filter((p: any) => p.lastProcessedAt).length;

        return {
            id: state._id,
            consumerGroup: state.consumerGroup,
            topic: state.topic,
            partitionCount,
            activePartitions,
            lastProcessedAt: state.lastProcessedAt,
            batchCount: state.batchCount || 0,
            duplicatesSkipped: state.duplicatesSkipped || 0,
            lastDuplicateAt: state.lastDuplicateAt,
            lastBatchSize: state.lastBatchSize,
            avgBatchSize: state.avgBatchSize ? Math.round(state.avgBatchSize) : null,
        };
    });

    // Transform consumer health rows
    const consumerStats = consumerHealth.map((health: any) => ({
        id: health._id,
        groupId: health.groupId,
        rebalanceCount: health.rebalanceCount || 0,
        lastRebalanceAt: health.lastRebalanceAt,
        lastJoinAt: health.lastJoinAt,
        lastMemberId: health.lastMemberId,
        lastGenerationId: health.lastGenerationId,
        commitCount: health.commitCount || 0,
        lastCommitAt: health.lastCommitAt,
        errorCount: health.errorCount || 0,
        lastErrorAt: health.lastErrorAt,
        lastErrorMessage: health.lastErrorMessage,
        recentErrors: health.recentErrors || [],
        totalLag: health.totalLag || 0,
        partitionLag: health.partitionLag || {},
        lagUpdatedAt: health.lagUpdatedAt,
        updatedAt: health.updatedAt,
    }));

    // Connector stats
    const connectorStats = connectStatus.map((conn: any) => ({
        id: conn._id,
        connectorName: conn.connectorName,
        connectorState: conn.connectorState,
        connectorType: conn.connectorType,
        workerId: conn.workerId,
        tasks: conn.tasks || [],
        tasksRunning: (conn.tasks || []).filter((t: any) => t.state === 'RUNNING').length,
        tasksTotal: (conn.tasks || []).length,
        updatedAt: conn.updatedAt,
    }));

    // Connect consumer group lag
    const connectConsumerGroupId = common.config?.kafka?.connectConsumerGroupId;
    const connectGroupHealth = connectConsumerGroupId
        ? consumerHealth.find((h: any) => h.groupId === connectConsumerGroupId)
        : null;

    return {
        summary: {
            totalBatchesProcessed,
            totalDuplicatesSkipped,
            avgBatchSizeOverall: Math.round(avgBatchSizeOverall * 100) / 100,
            totalRebalances,
            totalErrors,
            totalLag: totalLagAll,
            consumerGroupCount: consumerStats.length,
            partitionCount: partitionStats.length,
        },
        partitions: partitionStats,
        consumers: consumerStats,
        lagHistory: lagHistory.reverse(), // oldest-first for charts
        connectStatus: {
            enabled: !!common.config?.kafka?.connectApiUrl,
            connectors: connectorStats,
            sinkLag: connectGroupHealth?.totalLag || 0,
            sinkLagUpdatedAt: connectGroupHealth?.lagUpdatedAt,
        },
    };
}

// ---------------------------------------------------------------------------
// 4. Kafka events (paginated, DataTables-compatible)
// ---------------------------------------------------------------------------

interface KafkaEventsQuery {
    eventType?: string;
    groupId?: string;
    topic?: string;
    clusterId?: string;
    iSortCol_0?: string;
    sSortDir_0?: string;
    iDisplayStart?: string;
    iDisplayLength?: string;
    sEcho?: string;
}

export async function getKafkaEvents(qs: KafkaEventsQuery): Promise<any> {
    const query: any = {};

    if (qs.eventType && qs.eventType !== 'all') {
        query.type = qs.eventType + '';
    }
    if (qs.groupId && qs.groupId !== 'all') {
        query.groupId = qs.groupId + '';
    }
    if (qs.topic && qs.topic !== 'all') {
        query.topic = qs.topic + '';
    }
    if (qs.clusterId && qs.clusterId !== 'all') {
        query.clusterId = qs.clusterId + '';
    }

    const [total, filteredCount] = await Promise.all([
        common.db.collection('kafka_consumer_events').countDocuments({}),
        common.db.collection('kafka_consumer_events').countDocuments(query),
    ]);

    let cursor = common.db.collection('kafka_consumer_events').find(query);

    // Sorting with validated column index
    const columns = ['_id', 'ts', 'type', 'groupId', 'topic', 'partition', 'clusterId'];
    const sortColIndex = parseInt(qs.iSortCol_0 || '', 10);
    if (
        qs.iSortCol_0 &&
        qs.sSortDir_0 &&
        Number.isInteger(sortColIndex) &&
        sortColIndex >= 0 &&
        sortColIndex < columns.length
    ) {
        const sortObj: any = {};
        sortObj[columns[sortColIndex]] = qs.sSortDir_0 === 'asc' ? 1 : -1;
        cursor = cursor.sort(sortObj);
    }
    else {
        cursor = cursor.sort({ ts: -1 });
    }

    // Pagination with validated parameters
    const MAX_DISPLAY_LENGTH = 1000;
    let displayStart = parseInt(qs.iDisplayStart || '', 10);
    if (Number.isNaN(displayStart) || displayStart < 0) {
        displayStart = 0;
    }
    if (displayStart > 0) {
        cursor = cursor.skip(displayStart);
    }

    let displayLength = parseInt(qs.iDisplayLength || '', 10);
    if (Number.isNaN(displayLength) || displayLength < 1 || displayLength > MAX_DISPLAY_LENGTH) {
        displayLength = 50;
    }
    cursor = cursor.limit(displayLength);

    const events = await cursor.toArray();

    return {
        sEcho: qs.sEcho,
        iTotalRecords: Math.max(total, 0),
        iTotalDisplayRecords: filteredCount,
        aaData: events,
    };
}

// ---------------------------------------------------------------------------
// 5. Kafka events meta (distinct filter values, cached)
// ---------------------------------------------------------------------------

export async function getKafkaEventsMeta(): Promise<any> {
    const now = Date.now();
    if (_kafkaMetaCache && now - _kafkaMetaCacheTs < KAFKA_META_CACHE_TTL) {
        return _kafkaMetaCache;
    }

    // Reuse in-flight fetch to prevent thundering herd on cache expiry
    if (!_kafkaMetaCachePromise) {
        _kafkaMetaCachePromise = Promise.all([
            common.db.collection('kafka_consumer_events').distinct('type'),
            common.db.collection('kafka_consumer_events').distinct('groupId'),
            common.db.collection('kafka_consumer_events').distinct('topic'),
            common.db.collection('kafka_consumer_events').distinct('clusterId'),
        ])
            .then(([eventTypes, groupIds, topics, clusterIds]: any[]) => {
                _kafkaMetaCache = {
                    eventTypes: eventTypes.filter(Boolean).sort(),
                    groupIds: groupIds.filter(Boolean).sort(),
                    topics: topics.filter(Boolean).sort(),
                    clusterIds: clusterIds.filter(Boolean).sort(),
                };
                _kafkaMetaCacheTs = Date.now();
                _kafkaMetaCachePromise = null;
                return _kafkaMetaCache;
            })
            .catch((err: any) => {
                _kafkaMetaCachePromise = null;
                throw err;
            });
    }

    return _kafkaMetaCachePromise;
}
