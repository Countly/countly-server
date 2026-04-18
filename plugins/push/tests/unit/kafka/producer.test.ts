import { createRequire } from 'module';
import assert from 'assert';
import esmock from 'esmock';
import { describe, it, after, afterEach } from 'mocha';
import { createMockedKafkajs, loadKafkajs, isKafkaPluginAvailable } from '../../mock/kafka.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as data from '../../mock/data.ts';
import { KAFKA_TOPICS } from '../../../api/constants/configs.ts';

// Silence push logs: producer.ts loads common.js via createRequire, which esmock
// cannot intercept — so we monkey-patch common.log directly before esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

type TopicName = "SEND" | "SCHEDULE" | "COMPOSE" | "RESULT" | "AUTO_TRIGGER";

const {
    sendPushEvents,
    sendScheduleEvents,
    sendAutoTriggerEvents,
    sendResultEvents,
    setupTopicsAndPartitions,
    setupProducer
} = await esmock("../../../api/kafka/producer.ts") as typeof import('../../../api/kafka/producer.ts');

describe("Kafka producer", () => {
    if (!isKafkaPluginAvailable()) {
        return console.log("Kafka plugin is not available, skipping kafka producer tests.");
    }
    const { Partitioners } = loadKafkajs();
    let {
        kafkaInstance,
        producerInstance,
        adminInstance,
        sandbox: kafkaSandbox,
    } = createMockedKafkajs();

    afterEach(() => kafkaSandbox.resetHistory());
    after(() => kafkaSandbox.restore());

    describe("setupProducer", () => {
        it("should connect the producer", async() => {
            producerInstance.connect.resolves();
            await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
            assert(kafkaInstance.producer.calledWith({
                createPartitioner: Partitioners.DefaultPartitioner
            }));
            assert(producerInstance.connect.calledOnce);
        });
    });

    describe("setupTopicsAndPartitions", () => {
        it("should create topics that don't exist", async() => {
            adminInstance.listTopics.resolves([]);
            adminInstance.connect.resolves();
            adminInstance.disconnect.resolves();
            adminInstance.createTopics.resolves(true);

            await setupTopicsAndPartitions(kafkaInstance, false);

            assert(adminInstance.connect.calledOnce);
            assert(adminInstance.listTopics.calledOnce);
            assert(adminInstance.createTopics.calledOnce);

            const createTopicsArg = adminInstance.createTopics.firstCall.firstArg;
            assert.strictEqual(createTopicsArg.topics.length, Object.keys(KAFKA_TOPICS).length);

            // Verify SEND topic configuration
            const sendTopic = createTopicsArg.topics.find((t: any) => t.topic === KAFKA_TOPICS.SEND.name);
            assert(sendTopic);
            assert.strictEqual(sendTopic.numPartitions, KAFKA_TOPICS.SEND.partitions);

            // Verify SCHEDULE topic configuration with cleanup policy
            const scheduleTopic = createTopicsArg.topics.find((t: any) => t.topic === KAFKA_TOPICS.SCHEDULE.name);
            assert(scheduleTopic);
            assert.strictEqual(scheduleTopic.numPartitions, KAFKA_TOPICS.SCHEDULE.partitions);
            assert(scheduleTopic.configEntries);
            assert.deepStrictEqual(scheduleTopic.configEntries, [
                { name: "cleanup.policy", value: "compact" }
            ]);

            assert(adminInstance.disconnect.calledOnce);
        });

        it("should not create topics that already exist", async() => {
            const existingTopics = [
                KAFKA_TOPICS.SEND.name,
                KAFKA_TOPICS.COMPOSE.name
            ];
            adminInstance.listTopics.resolves(existingTopics);
            adminInstance.connect.resolves();
            adminInstance.disconnect.resolves();
            adminInstance.createTopics.resolves(true);

            await setupTopicsAndPartitions(kafkaInstance, false);

            assert(adminInstance.createTopics.calledOnce);
            const createTopicsArg = adminInstance.createTopics.firstCall.firstArg;

            // Should only create topics that don't exist
            const topicNames = createTopicsArg.topics.map((t: any) => t.topic);
            assert(!topicNames.includes(KAFKA_TOPICS.SEND.name));
            assert(!topicNames.includes(KAFKA_TOPICS.COMPOSE.name));
            assert(topicNames.includes(KAFKA_TOPICS.SCHEDULE.name));
            assert(topicNames.includes(KAFKA_TOPICS.RESULT.name));
            assert(topicNames.includes(KAFKA_TOPICS.AUTO_TRIGGER.name));
        });

        it("should delete and recreate topics when forceRecreation is true", async() => {
            adminInstance.listTopics.resolves([]);
            adminInstance.connect.resolves();
            adminInstance.disconnect.resolves();
            adminInstance.deleteTopics.resolves();
            adminInstance.createTopics.resolves(true);

            await setupTopicsAndPartitions(kafkaInstance, true);

            assert(adminInstance.deleteTopics.calledOnce);
            const deleteTopicsArg = adminInstance.deleteTopics.firstCall.firstArg;
            assert.strictEqual(deleteTopicsArg.topics.length, Object.keys(KAFKA_TOPICS).length);
            assert(deleteTopicsArg.topics.includes(KAFKA_TOPICS.SEND.name));
            assert(deleteTopicsArg.topics.includes(KAFKA_TOPICS.SCHEDULE.name));

            assert(adminInstance.createTopics.calledOnce);
        });

        it("should handle deletion errors gracefully during forceRecreation", async() => {
            adminInstance.listTopics.resolves([]);
            adminInstance.connect.resolves();
            adminInstance.disconnect.resolves();
            adminInstance.deleteTopics.rejects(new Error("Deletion failed"));
            adminInstance.createTopics.resolves(true);

            // Should not throw error
            await setupTopicsAndPartitions(kafkaInstance, true);

            assert(adminInstance.deleteTopics.calledOnce);
            assert(adminInstance.createTopics.calledOnce);
        });

        it("should create all topics with correct partition counts", async() => {
            adminInstance.listTopics.resolves([]);
            adminInstance.connect.resolves();
            adminInstance.disconnect.resolves();
            adminInstance.createTopics.resolves(true);

            await setupTopicsAndPartitions(kafkaInstance, false);

            const createTopicsArg = adminInstance.createTopics.firstCall.firstArg;
            const topics = createTopicsArg.topics;
            for (const topicName in KAFKA_TOPICS) {
                const config = KAFKA_TOPICS[topicName as TopicName];
                const topic = topics.find(
                    (t: any) => t.topic === config.name
                );
                assert.strictEqual(
                    topic.numPartitions,
                    config.partitions,
                    `Topic ${config.name} should have ${config.partitions} partitions`
                );
            }
        });
    });

    describe("Push event sender", () => {
        it("should send a valid payload", async() => {
            const pushEvent = data.pushEvent();
            await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
            await sendPushEvents([pushEvent]);
            assert(producerInstance.send.calledWith({
                topic: KAFKA_TOPICS.SEND.name,
                messages: [{
                    value: JSON.stringify(pushEvent)
                }]
            }));
        });
    });

    describe("Result event sender", () => {
        it("should send a valid payload", async() => {
            const resultEvent = data.resultEvent();
            await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
            await sendResultEvents([resultEvent]);
            assert(producerInstance.send.calledWith({
                topic: KAFKA_TOPICS.RESULT.name,
                messages: [{
                    value: JSON.stringify(resultEvent)
                }]
            }));
        });
    });

    describe("Auto trigger event sender", () => {
        it("should send a valid payload", async() => {
            const autoTriggerEvent = data.cohortTriggerEvent();
            await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
            await sendAutoTriggerEvents([autoTriggerEvent]);
            assert(producerInstance.send.calledWith({
                topic: KAFKA_TOPICS.AUTO_TRIGGER.name,
                messages: [{
                    value: JSON.stringify(autoTriggerEvent)
                }]
            }));
        });
    });

    describe("Schedule event sender", () => {
        it("should send a valid payload", async() => {
            const scheduleEvent = data.scheduleEvent();
            let targetKey = scheduleEvent.messageId.toString()
                + "|" + scheduleEvent.scheduleId.toString()
                + "|" + scheduleEvent.scheduledTo.toISOString();
            await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
            await sendScheduleEvents([scheduleEvent]);
            const arg = producerInstance.send.args[0][0] as any;
            assert(typeof arg.messages[0].key === "string");
            delete arg.messages[0].key;
            assert.deepStrictEqual(arg, {
                topic: KAFKA_TOPICS.SCHEDULE.name,
                messages: [
                    {
                        value: JSON.stringify(scheduleEvent),
                        headers: {
                            "scheduler-epoch": String(Math.round(scheduleEvent.scheduledTo.getTime() / 1000)),
                            "scheduler-target-key": targetKey,
                            "scheduler-target-topic": KAFKA_TOPICS.COMPOSE.name,
                        },
                    }
                ]
            });
        });
    });
});
