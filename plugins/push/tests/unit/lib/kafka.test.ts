import type { PushEvent, ScheduleEvent, ScheduleEventHandler, PushEventHandler } from '../../../api/types/queue.ts';
import { ObjectId } from 'mongodb';
import assert from 'assert';
import esmock from 'esmock';
import { describe, it, after, afterEach } from 'mocha';
import { createMockedKafkajs, loadKafkajs, isKafkaPluginAvailable } from '../../mock/kafka.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as data from '../../mock/data.ts';

type TopicName = "SEND" | "SCHEDULE" | "COMPOSE" | "RESULT" | "AUTO_TRIGGER";

const {
    sendPushEvents,
    sendScheduleEvents,
    sendAutoTriggerEvents,
    sendResultEvents,
    setupTopicsAndPartitions,
    setupProducer,
    initPushQueue
} = await esmock("../../../api/lib/kafka.ts", {
    "../../../../../api/utils/common.js": { default: { log: createSilentLogModule() } }
}) as typeof import('../../../api/lib/kafka.ts');

describe("Kafka queue", () => {
    if (!isKafkaPluginAvailable()) {
        return console.log("Kafka plugin is not available, skipping kafka tests.");
    }
    const kafkaConfig = require("../../../api/constants/kafka-config.ts").default;
    const { Partitioners } = loadKafkajs();
    let {
        kafkaInstance,
        producerInstance,
        consumerInstance,
        adminInstance,
        sandbox: kafkaSandbox,
    } = createMockedKafkajs();

    afterEach(() => kafkaSandbox.resetHistory());
    after(() => kafkaSandbox.restore());

    describe("Initialization", () => {
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
                assert.strictEqual(createTopicsArg.topics.length, Object.keys(kafkaConfig.topics).length);

                // Verify SEND topic configuration
                const sendTopic = createTopicsArg.topics.find((t: any) => t.topic === kafkaConfig.topics.SEND.name);
                assert(sendTopic);
                assert.strictEqual(sendTopic.numPartitions, kafkaConfig.topics.SEND.partitions);

                // Verify SCHEDULE topic configuration with cleanup policy
                const scheduleTopic = createTopicsArg.topics.find((t: any) => t.topic === kafkaConfig.topics.SCHEDULE.name);
                assert(scheduleTopic);
                assert.strictEqual(scheduleTopic.numPartitions, kafkaConfig.topics.SCHEDULE.partitions);
                assert(scheduleTopic.configEntries);
                assert.deepStrictEqual(scheduleTopic.configEntries, [
                    { name: "cleanup.policy", value: "compact" }
                ]);

                assert(adminInstance.disconnect.calledOnce);
            });

            it("should not create topics that already exist", async() => {
                const existingTopics = [
                    kafkaConfig.topics.SEND.name,
                    kafkaConfig.topics.COMPOSE.name
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
                assert(!topicNames.includes(kafkaConfig.topics.SEND.name));
                assert(!topicNames.includes(kafkaConfig.topics.COMPOSE.name));
                assert(topicNames.includes(kafkaConfig.topics.SCHEDULE.name));
                assert(topicNames.includes(kafkaConfig.topics.RESULT.name));
                assert(topicNames.includes(kafkaConfig.topics.AUTO_TRIGGER.name));
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
                assert.strictEqual(deleteTopicsArg.topics.length, Object.keys(kafkaConfig.topics).length);
                assert(deleteTopicsArg.topics.includes(kafkaConfig.topics.SEND.name));
                assert(deleteTopicsArg.topics.includes(kafkaConfig.topics.SCHEDULE.name));

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
                for (const topicName in kafkaConfig.topics) {
                    const config = kafkaConfig.topics[topicName as TopicName];
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

        describe("initPushQueue", () => {
            it("should configure kafkajs instance correctly", async() => {
                adminInstance.listTopics.returns(Promise.resolve([]));
                await initPushQueue(
                    kafkaInstance,
                    Partitioners.DefaultPartitioner,
                    async() => {},
                    async() => {},
                    async() => {},
                    async() => {}
                );

                assert(kafkaInstance.producer.calledWith({
                    createPartitioner: Partitioners.DefaultPartitioner
                }));

                assert(producerInstance.connect.called);

                assert(kafkaInstance.consumer.calledWith({
                    groupId: kafkaConfig.consumerGroupId,
                    allowAutoTopicCreation: false
                }));

                assert(consumerInstance.connect.called);

                const topics = Object.values(kafkaConfig.topics)
                    .filter((i: any) => i.name !== kafkaConfig.topics.SCHEDULE.name)
                    .map((i: any) => i.name);

                assert(consumerInstance.subscribe.calledWith({
                    topics,
                    fromBeginning: true
                }));

                assert(consumerInstance.run.called);
            });

            it("should handle multiple message types in batch correctly", async() => {
                adminInstance.listTopics.returns(Promise.resolve([]));

                const handlers: { push: any[], schedule: any[], result: any[], autoTrigger: any[] } = {
                    push: [],
                    schedule: [],
                    result: [],
                    autoTrigger: []
                };

                await initPushQueue(
                    kafkaInstance,
                    Partitioners.DefaultPartitioner,
                    async(events: any) => {
                        handlers.push = events;
                    },
                    async(events: any) => {
                        handlers.schedule = events;
                    },
                    async(events: any) => {
                        handlers.result = events;
                    },
                    async(events: any) => {
                        handlers.autoTrigger = events;
                    }
                );

                const { eachBatch } = consumerInstance.run.firstCall.firstArg;

                // Test multiple messages in a batch
                const testData = [
                    data.pushEvent(),
                    data.pushEvent(),
                    data.pushEvent(),
                ];

                await eachBatch({
                    batch: {
                        topic: kafkaConfig.topics.SEND.name,
                        messages: testData.map((d: any) => ({ value: JSON.stringify(d) }))
                    }
                });

                assert.strictEqual(handlers.push.length, 3);
            });

            it("should handle null message values gracefully", async() => {
                adminInstance.listTopics.returns(Promise.resolve([]));
                let receivedEvents: any[] = [];

                await initPushQueue(
                    kafkaInstance,
                    Partitioners.DefaultPartitioner,
                    async(events: any) => {
                        receivedEvents = events;
                    },
                    async() => {},
                    async() => {},
                    async() => {}
                );

                const { eachBatch } = consumerInstance.run.firstCall.firstArg;

                await eachBatch({
                    batch: {
                        topic: kafkaConfig.topics.SEND.name,
                        messages: [
                            { value: JSON.stringify(data.pushEvent()) },
                            { value: null },
                            { value: JSON.stringify(data.pushEvent()) }
                        ]
                    }
                });

                // Should only process non-null values
                assert.strictEqual(receivedEvents.length, 2);
            });

            it("should not throw when message parsing fails", async() => {
                adminInstance.listTopics.returns(Promise.resolve([]));

                await initPushQueue(
                    kafkaInstance,
                    Partitioners.DefaultPartitioner,
                    async() => {},
                    async() => {},
                    async() => {},
                    async() => {}
                );

                const { eachBatch } = consumerInstance.run.firstCall.firstArg;

                // Should not throw
                await eachBatch({
                    batch: {
                        topic: kafkaConfig.topics.SEND.name,
                        messages: [
                            { value: Buffer.from('invalid json {') }
                        ]
                    }
                });
            });

            it("should be able to pass events to listeners", async() => {
                await new Promise((res, rej) => {
                    let noResolves = 2;
                    const pushEvent = data.pushEvent();
                    const scheduleEvent = data.scheduleEvent();
                    const pushEventHandler: PushEventHandler = async(events) => {
                        try {
                            assert(events[0].appId instanceof ObjectId);
                            assert(events[0].messageId instanceof ObjectId);
                            assert(events[0].scheduleId instanceof ObjectId);

                            assert.deepStrictEqual(
                                JSON.parse(JSON.stringify([pushEvent])),
                                JSON.parse(JSON.stringify(events))
                            );
                            --noResolves || res(undefined);
                        }
                        catch (err) {
                            --noResolves || rej(err);
                        }
                    };
                    const scheduleEventHandler: ScheduleEventHandler = async(events) => {
                        try {
                            assert(events[0].appId instanceof ObjectId);
                            assert(events[0].messageId instanceof ObjectId);
                            assert(events[0].scheduleId instanceof ObjectId);
                            assert(events[0].scheduledTo instanceof Date);

                            assert.deepStrictEqual(
                                JSON.parse(JSON.stringify([scheduleEvent])),
                                JSON.parse(JSON.stringify(events))
                            );
                            --noResolves || res(undefined);
                        }
                        catch (err) {
                            --noResolves || rej(err);
                        }
                    };
                    initPushQueue(
                        kafkaInstance,
                        Partitioners.DefaultPartitioner,
                        pushEventHandler,
                        scheduleEventHandler,
                        async() => {},
                        async() => {}
                    )
                        .then(() => {
                            const { eachBatch } = consumerInstance.run.firstCall.firstArg;
                            return eachBatch({
                                batch: {
                                    topic: kafkaConfig.topics.SEND.name,
                                    messages: [{ value: JSON.stringify(pushEvent) }]
                                }
                            });
                        })
                        .then(() => {
                            const { eachBatch } = consumerInstance.run.firstCall.firstArg;
                            return eachBatch({
                                batch: {
                                    topic: kafkaConfig.topics.COMPOSE.name,
                                    messages: [{ value: JSON.stringify(scheduleEvent) }]
                                }
                            });
                        });
                });
            });
        });
    });

    describe("Push event sender", () => {
        it("should send a valid payload", async() => {
            const pushEvent = data.pushEvent();
            await initPushQueue(
                kafkaInstance,
                Partitioners.DefaultPartitioner,
                async() => {},
                async() => {},
                async() => {},
                async() => {}
            );
            await sendPushEvents([pushEvent]);
            assert(producerInstance.send.calledWith({
                topic: kafkaConfig.topics.SEND.name,
                messages: [{
                    value: JSON.stringify(pushEvent)
                }]
            }));
        });
    });

    describe("Result event sender", () => {
        it("should send a valid payload", async() => {
            const resultEvent = data.resultEvent();
            await initPushQueue(
                kafkaInstance,
                Partitioners.DefaultPartitioner,
                async() => {},
                async() => {},
                async() => {},
                async() => {}
            );
            await sendResultEvents([resultEvent]);
            assert(producerInstance.send.calledWith({
                topic: kafkaConfig.topics.RESULT.name,
                messages: [{
                    value: JSON.stringify(resultEvent)
                }]
            }));
        });
    });

    describe("Auto trigger event sender", () => {
        it("should send a valid payload", async() => {
            const autoTriggerEvent = data.cohortTriggerEvent();
            await initPushQueue(
                kafkaInstance,
                Partitioners.DefaultPartitioner,
                async() => {},
                async() => {},
                async() => {},
                async() => {}
            );
            await sendAutoTriggerEvents([autoTriggerEvent]);
            assert(producerInstance.send.calledWith({
                topic: kafkaConfig.topics.AUTO_TRIGGER.name,
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
            await initPushQueue(
                kafkaInstance,
                Partitioners.DefaultPartitioner,
                async() => {},
                async() => {},
                async() => {},
                async() => {}
            );
            await sendScheduleEvents([scheduleEvent]);
            const arg = producerInstance.send.args[0][0] as any;
            assert(typeof arg.messages[0].key === "string");
            delete arg.messages[0].key;
            assert.deepStrictEqual(arg, {
                topic: kafkaConfig.topics.SCHEDULE.name,
                messages: [
                    {
                        value: JSON.stringify(scheduleEvent),
                        headers: {
                            "scheduler-epoch": String(Math.round(scheduleEvent.scheduledTo.getTime() / 1000)),
                            "scheduler-target-key": targetKey,
                            "scheduler-target-topic": kafkaConfig.topics.COMPOSE.name,
                        },
                    }
                ]
            });
        });
    });
});
