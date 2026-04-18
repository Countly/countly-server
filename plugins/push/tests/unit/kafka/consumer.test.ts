import type { ScheduleEventHandler, PushEventHandler } from '../../../api/models/queue.ts';
import { createRequire } from 'module';
import { ObjectId } from 'mongodb';
import assert from 'assert';
import esmock from 'esmock';
import { describe, it, after, afterEach } from 'mocha';
import { createMockedKafkajs, loadKafkajs, isKafkaPluginAvailable } from '../../mock/kafka.ts';
import { createSilentLogModule } from '../../mock/logger.ts';
import * as data from '../../mock/data.ts';
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUP_ID } from '../../../api/constants/configs.ts';

// Silence push logs: consumer.ts/producer.ts load common.js via createRequire,
// which esmock cannot intercept — so we monkey-patch common.log directly before
// esmock runs.
const require = createRequire(import.meta.url);
require('../../../../../api/utils/common.js').log = createSilentLogModule();

const {
    setupTopicsAndPartitions,
    setupProducer
} = await esmock("../../../api/kafka/producer.ts") as typeof import('../../../api/kafka/producer.ts');

describe("Kafka consumer", () => {
    if (!isKafkaPluginAvailable()) {
        return console.log("Kafka plugin is not available, skipping kafka consumer tests.");
    }
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

    describe("initPushQueue", () => {
        it("should configure kafkajs instance correctly", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));

            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": { sendPush: async() => {} },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": { saveResults: async() => {} },
                "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue(
                {} as any,
                kafkaInstance,
                Partitioners.DefaultPartitioner,
            );

            assert(kafkaInstance.producer.calledWith({
                createPartitioner: Partitioners.DefaultPartitioner
            }));

            assert(producerInstance.connect.called);

            const consumerConfig = kafkaInstance.consumer.firstCall.firstArg;
            assert.strictEqual(consumerConfig.groupId, KAFKA_CONSUMER_GROUP_ID);
            assert.strictEqual(consumerConfig.allowAutoTopicCreation, false);
            assert.strictEqual(consumerConfig.sessionTimeout, 30000);

            assert(consumerInstance.connect.called);

            const topics = Object.values(KAFKA_TOPICS)
                .filter((i: any) => i.name !== KAFKA_TOPICS.SCHEDULE.name)
                .map((i: any) => i.name);

            assert(consumerInstance.subscribe.calledWith({
                topics,
                fromBeginning: true
            }));

            assert(consumerInstance.run.called);
        });

        it("should handle multiple message types in batch correctly", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));

            let callCount = 0;
            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": {
                    sendPush: async() => { callCount++; },
                },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": { saveResults: async() => {} },
                "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue(
                {} as any,
                kafkaInstance,
                Partitioners.DefaultPartitioner,
            );

            const { eachBatch } = consumerInstance.run.firstCall.firstArg;

            const testData = [
                data.pushEvent(),
                data.pushEvent(),
                data.pushEvent(),
            ];

            await eachBatch({
                resolveOffset: () => {},
                commitOffsetsIfNecessary: async() => {},
                heartbeat: async() => {},
                batch: {
                    topic: KAFKA_TOPICS.SEND.name,
                    messages: testData.map((d: any, i: number) => ({ offset: String(i), value: JSON.stringify(d) }))
                }
            });

            assert.strictEqual(callCount, 3);
        });

        it("should handle null message values gracefully", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));
            let callCount = 0;

            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": {
                    sendPush: async() => { callCount++; return []; },
                },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": { saveResults: async() => {} },
                "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue(
                {} as any,
                kafkaInstance,
                Partitioners.DefaultPartitioner,
            );

            const { eachBatch } = consumerInstance.run.firstCall.firstArg;

            await eachBatch({
                resolveOffset: () => {},
                commitOffsetsIfNecessary: async() => {},
                heartbeat: async() => {},
                batch: {
                    topic: KAFKA_TOPICS.SEND.name,
                    messages: [
                        { offset: '0', value: JSON.stringify(data.pushEvent()) },
                        { offset: '1', value: null },
                        { offset: '2', value: JSON.stringify(data.pushEvent()) }
                    ]
                }
            });

            assert.strictEqual(callCount, 2);
        });

        it("should not throw when message parsing fails", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));

            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": { sendPush: async() => [] },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": { saveResults: async() => {} },
                "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue(
                {} as any,
                kafkaInstance,
                Partitioners.DefaultPartitioner,
            );

            const { eachBatch } = consumerInstance.run.firstCall.firstArg;

            await eachBatch({
                resolveOffset: () => {},
                commitOffsetsIfNecessary: async() => {},
                heartbeat: async() => {},
                batch: {
                    topic: KAFKA_TOPICS.SEND.name,
                    messages: [
                        { offset: '0', value: Buffer.from('invalid json {') }
                    ]
                }
            });
        });

        it("should be able to pass events to listeners", async() => {
            await new Promise((res, rej) => {
                let noResolves = 2;
                const pushEvent = data.pushEvent();
                const scheduleEvent = data.scheduleEvent();

                const mockSendPush: PushEventHandler = async(event) => {
                    try {
                        assert(event.appId instanceof ObjectId);
                        assert(event.messageId instanceof ObjectId);
                        assert(event.scheduleId instanceof ObjectId);

                        assert.deepStrictEqual(
                            JSON.parse(JSON.stringify(pushEvent)),
                            JSON.parse(JSON.stringify(event))
                        );
                        --noResolves || res(undefined);
                    }
                    catch (err) {
                        --noResolves || rej(err);
                    }
                };
                const mockCompose: ScheduleEventHandler = async(event) => {
                    try {
                        assert(event.appId instanceof ObjectId);
                        assert(event.messageId instanceof ObjectId);
                        assert(event.scheduleId instanceof ObjectId);
                        assert(event.scheduledTo instanceof Date);

                        assert.deepStrictEqual(
                            JSON.parse(JSON.stringify(scheduleEvent)),
                            JSON.parse(JSON.stringify(event))
                        );
                        --noResolves || res(undefined);
                    }
                    catch (err) {
                        --noResolves || rej(err);
                    }
                };

                (async() => {
                    const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                        "../../../api/send/sender.ts": { sendPush: mockSendPush },
                        "../../../api/send/composer.ts": { composeScheduledPushes: (_db: any, event: any) => mockCompose(event) },
                        "../../../api/send/resultor.ts": { saveResults: async() => {} },
                        "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                        "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
                    }) as typeof import('../../../api/kafka/consumer.ts');

                    await initPushQueue(
                        {} as any,
                        kafkaInstance,
                        Partitioners.DefaultPartitioner,
                    );

                    const { eachBatch } = consumerInstance.run.firstCall.firstArg;
                    await eachBatch({
                        resolveOffset: () => {},
                        commitOffsetsIfNecessary: async() => {},
                        heartbeat: async() => {},
                        batch: {
                            topic: KAFKA_TOPICS.SEND.name,
                            messages: [{ offset: '0', value: JSON.stringify(pushEvent) }]
                        }
                    });
                    await eachBatch({
                        resolveOffset: () => {},
                        commitOffsetsIfNecessary: async() => {},
                        heartbeat: async() => {},
                        batch: {
                            topic: KAFKA_TOPICS.COMPOSE.name,
                            messages: [{ offset: '0', value: JSON.stringify(scheduleEvent) }]
                        }
                    });
                })();
            });
        });
    });

    describe("Topic routing", () => {
        it("should route RESULT topic to saveResults handler", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));
            let receivedResults: any[] = [];

            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": { sendPush: async() => [] },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": {
                    saveResults: async(_db: any, events: any) => { receivedResults = events; },
                },
                "../../../api/send/scheduler.ts": { scheduleMessageByAutoTriggers: async() => {} },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue({} as any, kafkaInstance, Partitioners.DefaultPartitioner);
            const { eachBatch } = consumerInstance.run.firstCall.firstArg;

            const resultEvent = data.resultEvent();
            await eachBatch({
                resolveOffset: () => {},
                commitOffsetsIfNecessary: async() => {},
                heartbeat: async() => {},
                batch: {
                    topic: KAFKA_TOPICS.RESULT.name,
                    messages: [{ offset: '0', value: JSON.stringify(resultEvent) }]
                }
            });

            assert.strictEqual(receivedResults.length, 1);
            assert(receivedResults[0].appId instanceof ObjectId);
            assert(receivedResults[0].sentAt instanceof Date);
        });

        it("should route AUTO_TRIGGER topic to scheduleMessageByAutoTriggers handler", async() => {
            adminInstance.listTopics.returns(Promise.resolve([]));
            let receivedTriggers: any[] = [];

            const { initPushQueue } = await esmock("../../../api/kafka/consumer.ts", {
                "../../../api/send/sender.ts": { sendPush: async() => [] },
                "../../../api/send/composer.ts": { composeScheduledPushes: async() => {} },
                "../../../api/send/resultor.ts": { saveResults: async() => {} },
                "../../../api/send/scheduler.ts": {
                    scheduleMessageByAutoTriggers: async(_db: any, events: any) => { receivedTriggers = events; },
                },
                "../../../api/kafka/producer.ts": { setupProducer, setupTopicsAndPartitions },
            }) as typeof import('../../../api/kafka/consumer.ts');

            await initPushQueue({} as any, kafkaInstance, Partitioners.DefaultPartitioner);
            const { eachBatch } = consumerInstance.run.firstCall.firstArg;

            const triggerEvent = data.cohortTriggerEvent();
            await eachBatch({
                resolveOffset: () => {},
                commitOffsetsIfNecessary: async() => {},
                heartbeat: async() => {},
                batch: {
                    topic: KAFKA_TOPICS.AUTO_TRIGGER.name,
                    messages: [{ offset: '0', value: JSON.stringify(triggerEvent) }]
                }
            });

            assert.strictEqual(receivedTriggers.length, 1);
            assert(receivedTriggers[0].appId instanceof ObjectId);
            assert.strictEqual(receivedTriggers[0].kind, "cohort");
        });
    });
});
