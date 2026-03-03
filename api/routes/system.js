/**
 * System information routes (/o/system).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/system
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');
const versionInfo = require('../../frontend/express/version.info');
const log = require('../utils/log.js')('core:api');

const validateUserForMgmtReadAPI = validateUser;

const validateUserForDataReadAPI = require('../utils/rights.js').validateRead;
const validateUserForDataWriteAPI = require('../utils/rights.js').validateUserForWrite;
const validateUserForGlobalAdmin = require('../utils/rights.js').validateGlobalAdmin;

// Kafka events meta cache (30s TTL) with in-flight dedup
var _kafkaMetaCache = null;
var _kafkaMetaCacheTs = 0;
var _kafkaMetaCachePromise = null;
const KAFKA_META_CACHE_TTL = 30000;

// --- /o/system endpoints ---

router.all('/o/system/version', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        common.returnOutput(params, {"version": versionInfo.version});
    }, params);
});

router.all('/o/system/plugins', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        common.returnOutput(params, plugins.getPlugins());
    }, params);
});

router.all('/o/system/observability', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(() => {
        plugins.dispatch('/system/observability/collect', {params: params}, function(err, results) {
            if (err) {
                common.returnMessage(params, 500, 'Error collecting observability data');
                return;
            }
            const data = (results || [])
                .filter(r => r && r.status === 'fulfilled' && r.value)
                .map(r => r.value);
            common.returnOutput(params, data);
        });
    }, params);
});

router.all('/o/system/aggregator', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(async() => {
        try {
            //fetch aggregator status and latest drill cd in parallel
            const [pluginsData, drillData] = await Promise.all([
                common.db.collection("plugins").findOne({_id: "_changeStreams"}),
                common.drillDb.collection("drill_events").find({}, {projection: {cd: 1}}).sort({cd: -1}).limit(1).toArray()
            ]);

            var data = [];
            var now = Date.now().valueOf();
            var nowDrill = now;
            if (drillData && drillData.length) {
                nowDrill = new Date(drillData[0].cd).valueOf();
            }

            if (pluginsData) {
                for (var key in pluginsData) {
                    if (key !== "_id") {
                        var lastAccepted = new Date(pluginsData[key].cd).valueOf();
                        data.push({
                            name: key,
                            last_cd: pluginsData[key].cd,
                            drill: drillData && drillData[0] && drillData[0].cd,
                            last_id: pluginsData[key]._id,
                            diff: (now - lastAccepted) / 1000,
                            diffDrill: (nowDrill - lastAccepted) / 1000
                        });
                    }
                }
            }
            common.returnOutput(params, data);
        }
        catch (err) {
            log.e('Error fetching aggregator status:', err);
            common.returnMessage(params, 500, 'Error fetching aggregator status');
        }
    }, params);
});

// /o/system/kafka/events/meta - Get filter options (cached 30s, deduped)
router.all('/o/system/kafka/events/meta', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(async() => {
        try {
            var now = Date.now();
            if (_kafkaMetaCache && (now - _kafkaMetaCacheTs) < KAFKA_META_CACHE_TTL) {
                common.returnOutput(params, _kafkaMetaCache);
                return;
            }

            // Reuse in-flight fetch to prevent thundering herd on cache expiry
            if (!_kafkaMetaCachePromise) {
                _kafkaMetaCachePromise = Promise.all([
                    common.db.collection('kafka_consumer_events').distinct('type'),
                    common.db.collection('kafka_consumer_events').distinct('groupId'),
                    common.db.collection('kafka_consumer_events').distinct('topic'),
                    common.db.collection('kafka_consumer_events').distinct('clusterId')
                ]).then(function([eventTypes, groupIds, topics, clusterIds]) {
                    _kafkaMetaCache = {
                        eventTypes: eventTypes.filter(Boolean).sort(),
                        groupIds: groupIds.filter(Boolean).sort(),
                        topics: topics.filter(Boolean).sort(),
                        clusterIds: clusterIds.filter(Boolean).sort()
                    };
                    _kafkaMetaCacheTs = Date.now();
                    _kafkaMetaCachePromise = null;
                    return _kafkaMetaCache;
                }).catch(function(err) {
                    _kafkaMetaCachePromise = null;
                    throw err;
                });
            }

            var result = await _kafkaMetaCachePromise;
            common.returnOutput(params, result);
        }
        catch (err) {
            log.e('Error fetching Kafka events meta:', err);
            common.returnMessage(params, 500, 'Error fetching Kafka events meta');
        }
    }, params);
});

// /o/system/kafka/events - Get events list
router.all('/o/system/kafka/events', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(async() => {
        try {
            // Build query from filters
            const query = {};

            if (params.qstring.eventType && params.qstring.eventType !== 'all') {
                query.type = params.qstring.eventType + "";
            }
            if (params.qstring.groupId && params.qstring.groupId !== 'all') {
                query.groupId = params.qstring.groupId + "";
            }
            if (params.qstring.topic && params.qstring.topic !== 'all') {
                query.topic = params.qstring.topic + "";
            }
            if (params.qstring.clusterId && params.qstring.clusterId !== 'all') {
                query.clusterId = params.qstring.clusterId + "";
            }

            // Get accurate counts
            const [total, filteredCount] = await Promise.all([
                common.db.collection('kafka_consumer_events').countDocuments({}),
                common.db.collection('kafka_consumer_events').countDocuments(query)
            ]);
            let cursor = common.db.collection('kafka_consumer_events').find(query);

            // Sorting with validated column index
            const columns = ['_id', 'ts', 'type', 'groupId', 'topic', 'partition', 'clusterId'];
            const sortColIndex = parseInt(params.qstring.iSortCol_0, 10);
            if (params.qstring.iSortCol_0 &&
                params.qstring.sSortDir_0 &&
                Number.isInteger(sortColIndex) &&
                sortColIndex >= 0 &&
                sortColIndex < columns.length) {
                const sortObj = {};
                sortObj[columns[sortColIndex]] = params.qstring.sSortDir_0 === 'asc' ? 1 : -1;
                cursor = cursor.sort(sortObj);
            }
            else {
                cursor = cursor.sort({ ts: -1 });
            }

            // Pagination with validated parameters
            const MAX_DISPLAY_LENGTH = 1000;
            let displayStart = parseInt(params.qstring.iDisplayStart, 10);
            if (Number.isNaN(displayStart) || displayStart < 0) {
                displayStart = 0;
            }
            if (displayStart > 0) {
                cursor = cursor.skip(displayStart);
            }

            let displayLength = parseInt(params.qstring.iDisplayLength, 10);
            if (Number.isNaN(displayLength) || displayLength < 1 || displayLength > MAX_DISPLAY_LENGTH) {
                displayLength = 50;
            }
            cursor = cursor.limit(displayLength);

            const events = await cursor.toArray();

            common.returnOutput(params, {
                sEcho: params.qstring.sEcho,
                iTotalRecords: Math.max(total, 0),
                iTotalDisplayRecords: filteredCount,
                aaData: events
            });
        }
        catch (err) {
            log.e('Error fetching Kafka consumer events:', err);
            common.returnMessage(params, 500, 'Error fetching Kafka consumer events');
        }
    }, params);
});

// /o/system/kafka - Get Kafka status overview
router.all('/o/system/kafka', (req, res) => {
    const params = req.countlyParams;
    validateUserForMgmtReadAPI(async() => {
        try {
            const KAFKA_QUERY_LIMIT = 500;

            // Fetch all Kafka data and summaries in parallel (with projections)
            const [consumerState, consumerHealth, lagHistory, connectStatus, stateSummary, healthSummary] = await Promise.all([
                common.db.collection("kafka_consumer_state")
                    .find({}, {
                        projection: {
                            consumerGroup: 1,
                            topic: 1,
                            partitions: 1,
                            lastProcessedAt: 1,
                            batchCount: 1,
                            duplicatesSkipped: 1,
                            lastDuplicateAt: 1,
                            lastBatchSize: 1,
                            avgBatchSize: 1
                        }
                    })
                    .sort({ lastProcessedAt: -1 })
                    .limit(KAFKA_QUERY_LIMIT)
                    .toArray(),
                common.db.collection("kafka_consumer_health")
                    .find({}, {
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
                            updatedAt: 1
                        }
                    })
                    .sort({ updatedAt: -1 })
                    .limit(KAFKA_QUERY_LIMIT)
                    .toArray(),
                common.db.collection("kafka_lag_history")
                    .find({}, {projection: {ts: 1, groups: 1, connectLag: 1}})
                    .sort({ ts: -1 })
                    .limit(100)
                    .toArray(),
                common.db.collection("kafka_connect_status")
                    .find({}, {
                        projection: {
                            connectorName: 1,
                            connectorState: 1,
                            connectorType: 1,
                            workerId: 1,
                            tasks: 1,
                            updatedAt: 1
                        }
                    })
                    .sort({ updatedAt: -1 })
                    .limit(KAFKA_QUERY_LIMIT)
                    .toArray(),
                // Aggregate consumer state summary via MongoDB pipeline
                common.db.collection("kafka_consumer_state")
                    .aggregate([{
                        $group: {
                            _id: null,
                            totalBatchesProcessed: { $sum: { $ifNull: ["$batchCount", 0] } },
                            totalDuplicatesSkipped: { $sum: { $ifNull: ["$duplicatesSkipped", 0] } },
                            avgBatchSizeSum: { $sum: { $ifNull: ["$avgBatchSize", 0] } },
                            groupsWithData: { $sum: { $cond: [{ $gt: ["$avgBatchSize", 0] }, 1, 0] } }
                        }
                    }])
                    .toArray(),
                // Aggregate consumer health summary via MongoDB pipeline
                common.db.collection("kafka_consumer_health")
                    .aggregate([{
                        $group: {
                            _id: null,
                            totalRebalances: { $sum: { $ifNull: ["$rebalanceCount", 0] } },
                            totalErrors: { $sum: { $ifNull: ["$errorCount", 0] } },
                            totalLag: { $sum: { $ifNull: ["$totalLag", 0] } }
                        }
                    }])
                    .toArray()
            ]);

            // Extract summary from aggregation pipelines
            const stSummary = stateSummary[0] || {};
            const totalBatchesProcessed = stSummary.totalBatchesProcessed || 0;
            const totalDuplicatesSkipped = stSummary.totalDuplicatesSkipped || 0;
            const avgBatchSizeOverall = stSummary.groupsWithData > 0
                ? stSummary.avgBatchSizeSum / stSummary.groupsWithData
                : 0;

            const htSummary = healthSummary[0] || {};
            const totalRebalances = htSummary.totalRebalances || 0;
            const totalErrors = htSummary.totalErrors || 0;
            const totalLagAll = htSummary.totalLag || 0;

            // Transform consumer state rows
            const partitionStats = consumerState.map(state => {
                const partitions = state.partitions || {};
                const partitionCount = Object.keys(partitions).length;
                const activePartitions = Object.values(partitions).filter(p => p.lastProcessedAt).length;

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
                    avgBatchSize: state.avgBatchSize ? Math.round(state.avgBatchSize) : null
                };
            });

            // Transform consumer health rows
            const consumerStats = consumerHealth.map(health => ({
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
                updatedAt: health.updatedAt
            }));

            // Process Kafka Connect status
            const connectorStats = connectStatus.map(conn => ({
                id: conn._id,
                connectorName: conn.connectorName,
                connectorState: conn.connectorState,
                connectorType: conn.connectorType,
                workerId: conn.workerId,
                tasks: conn.tasks || [],
                tasksRunning: (conn.tasks || []).filter(t => t.state === 'RUNNING').length,
                tasksTotal: (conn.tasks || []).length,
                updatedAt: conn.updatedAt
            }));

            // Get connect consumer group lag for ClickHouse sink
            const connectConsumerGroupId = common.config?.kafka?.connectConsumerGroupId;
            const connectGroupHealth = connectConsumerGroupId
                ? consumerHealth.find(h => h.groupId === connectConsumerGroupId)
                : null;

            common.returnOutput(params, {
                summary: {
                    totalBatchesProcessed,
                    totalDuplicatesSkipped,
                    avgBatchSizeOverall: Math.round(avgBatchSizeOverall * 100) / 100,
                    totalRebalances,
                    totalErrors,
                    totalLag: totalLagAll,
                    consumerGroupCount: consumerStats.length,
                    partitionCount: partitionStats.length
                },
                partitions: partitionStats,
                consumers: consumerStats,
                lagHistory: lagHistory.reverse(), // Oldest first for charts

                // Kafka Connect status
                connectStatus: {
                    enabled: !!common.config?.kafka?.connectApiUrl,
                    connectors: connectorStats,
                    sinkLag: connectGroupHealth?.totalLag || 0,
                    sinkLagUpdatedAt: connectGroupHealth?.lagUpdatedAt
                }
            });
        }
        catch (err) {
            log.e('Error fetching Kafka stats:', err);
            common.returnMessage(params, 500, 'Error fetching Kafka stats');
        }
    }, params);
});

// Catch-all for /o/system/* - dispatches to plugins or returns error
router.all('/o/system/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/o/system';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path');
    }
});

module.exports = router;
