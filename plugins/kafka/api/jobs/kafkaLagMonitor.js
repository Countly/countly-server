const Job = require("../../../../jobServer/Job");
const log = require("../../../../api/utils/log.js")("job:kafkaLagMonitor");
const countlyConfig = require("../../../../api/config");

/**
 * Job for monitoring Kafka consumer lag
 *
 * Periodically fetches high watermarks from Kafka and compares with committed offsets
 * to calculate consumer group lag. Results are stored in kafka_consumer_health collection.
 *
 * Schedule: Every 2 minutes
 *
 * @example
 * // Check lag via MongoDB:
 * db.kafka_consumer_health.find({}, { totalLag: 1, partitionLag: 1, lagUpdatedAt: 1 })
 */
class KafkaLagMonitorJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {Object} schedule configuration - runs every 2 minutes
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "*/2 * * * *" // Every 2 minutes
        };
    }

    /**
     * Run the lag monitoring job
     *
     * @param {Object} db - MongoDB database connection
     * @param {Function} done - Callback function to signal completion
     */
    async run(db, done) {
        try {
            // Check if Kafka is enabled in static configuration
            // Note: We use countlyConfig (static) not plugins.getConfig because
            // the kafka plugin doesn't register with plugins.setConfigs
            const kafkaConfig = countlyConfig.kafka || {};

            if (!kafkaConfig.enabled) {
                log.d("Kafka not enabled, skipping lag monitor");
                return done();
            }

            // Load Kafka client from the same plugin
            const KafkaClient = require('../lib/kafkaClient');

            const kafkaClient = new KafkaClient();
            const kafka = kafkaClient.createKafkaInstance();
            const admin = kafka.admin();

            await admin.connect();
            log.d("Connected to Kafka admin for lag monitoring");

            // Get all consumer groups
            const groups = await admin.listGroups();
            const groupIdPrefix = kafkaConfig.groupIdPrefix || 'cly_';

            // Filter to Countly-related consumer groups and Kafka Connect groups
            const countlyGroups = groups.groups.filter(g =>
                g.groupId.startsWith(groupIdPrefix) ||
                g.groupId.includes('aggregator') ||
                g.groupId.startsWith('connect-') // Include Kafka Connect consumer groups
            );

            log.d(`Found ${countlyGroups.length} Countly consumer groups to monitor`);

            // Collect lag data for all groups (for history snapshot)
            const lagByGroup = {};

            for (const group of countlyGroups) {
                try {
                    // Get consumer group offsets
                    const offsets = await admin.fetchOffsets({
                        groupId: group.groupId
                    });

                    if (!offsets || offsets.length === 0) {
                        log.d(`No offsets found for group ${group.groupId}, skipping`);
                        continue;
                    }

                    // Get unique topics from offsets
                    const topics = [...new Set(offsets.map(o => o.topic))];
                    const partitionLag = {};
                    let totalLag = 0;

                    for (const topic of topics) {
                        try {
                            // Get topic high watermarks (end offsets)
                            const topicOffsets = await admin.fetchTopicOffsets(topic);

                            // KafkaJS fetchOffsets returns nested structure:
                            // [{ topic, partitions: [{ partition, offset }] }]
                            // Find the offsets for this topic from the nested structure
                            const topicCommittedOffsets = offsets.find(o => o.topic === topic);

                            for (const to of topicOffsets) {
                                // Look up committed offset in the nested partitions array
                                const committedPartition = topicCommittedOffsets?.partitions?.find(
                                    p => p.partition === to.partition
                                );
                                const committedOffset = parseInt(committedPartition?.offset || '0', 10);
                                const highWatermark = parseInt(to.high || '0', 10);
                                const lag = Math.max(0, highWatermark - committedOffset);

                                partitionLag[`${topic}:${to.partition}`] = {
                                    lag,
                                    highWatermark: to.high,
                                    lastOffset: committedPartition?.offset || '0'
                                };
                                totalLag += lag;
                            }
                        }
                        catch (topicError) {
                            log.e(`Error fetching offsets for topic ${topic}: ${topicError.message}`);
                        }
                    }

                    // Store lag data for history snapshot
                    lagByGroup[group.groupId] = { totalLag, partitionLag };

                    // Update health collection with lag stats
                    await db.collection('kafka_consumer_health').updateOne(
                        { _id: group.groupId },
                        {
                            $set: {
                                partitionLag,
                                totalLag,
                                lagUpdatedAt: new Date(),
                                updatedAt: new Date(),
                                groupId: group.groupId
                            }
                        },
                        { upsert: true }
                    );

                    log.d(`Updated lag for ${group.groupId}: totalLag=${totalLag}`);
                }
                catch (groupError) {
                    log.e(`Error getting lag for ${group.groupId}: ${groupError.message}`);
                }
            }

            // Fetch Kafka Connect status via REST API (only if configured)
            const connectApiUrl = kafkaConfig.connectApiUrl;
            if (connectApiUrl) {
                try {
                    // Fetch list of connectors
                    const connectorsResponse = await fetch(`${connectApiUrl}/connectors`);
                    if (connectorsResponse.ok) {
                        const connectorNames = await connectorsResponse.json();

                        for (const connectorName of connectorNames) {
                            try {
                                const statusResponse = await fetch(`${connectApiUrl}/connectors/${connectorName}/status`);
                                if (statusResponse.ok) {
                                    const status = await statusResponse.json();

                                    await db.collection('kafka_connect_status').updateOne(
                                        { _id: connectorName },
                                        {
                                            $set: {
                                                connectorName: connectorName,
                                                connectorState: status.connector?.state || 'UNKNOWN',
                                                connectorType: status.type || 'unknown',
                                                workerId: status.connector?.worker_id,
                                                tasks: (status.tasks || []).map(t => ({
                                                    id: t.id,
                                                    state: t.state,
                                                    workerId: t.worker_id,
                                                    trace: t.trace
                                                })),
                                                updatedAt: new Date()
                                            }
                                        },
                                        { upsert: true }
                                    );
                                    log.d(`Updated Kafka Connect status for ${connectorName}: ${status.connector?.state}`);
                                }
                            }
                            catch (connectorError) {
                                log.w(`Error fetching status for connector ${connectorName}: ${connectorError.message}`);
                            }
                        }
                    }
                }
                catch (connectError) {
                    log.w(`Failed to fetch Kafka Connect status: ${connectError.message}`);
                }
            }

            // Insert lag history snapshot (capped collection, max 1000 docs)
            if (Object.keys(lagByGroup).length > 0) {
                const historyDoc = {
                    ts: new Date(),
                    groups: Object.entries(lagByGroup).map(([groupId, data]) => ({
                        groupId,
                        totalLag: data.totalLag,
                        partitions: data.partitionLag
                    })),
                    connectLag: lagByGroup[kafkaConfig.connectConsumerGroupId]?.totalLag || 0
                };
                await db.collection('kafka_lag_history').insertOne(historyDoc);
                log.d(`Inserted lag history snapshot with ${historyDoc.groups.length} groups`);
            }

            await admin.disconnect();
            log.i(`Kafka lag monitor completed for ${countlyGroups.length} groups`);
            done();
        }
        catch (error) {
            log.e("Kafka lag monitor failed:", error.message);
            done(error);
        }
    }
}

module.exports = KafkaLagMonitorJob;
