/**
 * @typedef {import('../../../api/new/types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../../../api/new/types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../../../api/new/types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../../../api/new/types/queue.ts').PushEventHandler} PushEventHandler
 */
const { logLevel: kafkaLogLevel, Partitioners } = require("kafkajs");
const proxyquire = require("proxyquire");
const { ObjectId } = require("mongodb");
const assert = require("assert");
const { describe, it, after, afterEach } = require("mocha");
const kafkaConfig = require("../../../api/new/constants/kafka-config.json");
const { createMockedKafkajs } = require("../../mock/kafka.js");
let {
    KafkaConstructor,
    kafkaInstance,
    producerInstance,
    consumerInstance,
    sandbox: kafkaSandbox,
} = createMockedKafkajs();
const {
    sendPushEvents,
    sendScheduleEvents,
    initPushQueue
} = proxyquire("../../../api/new/lib/kafka.js", {
    "kafkajs": {
        Kafka: KafkaConstructor,
    }
});


describe("Kafka queue", () => {
    afterEach(() => kafkaSandbox.resetHistory());
    after(() => kafkaSandbox.restore());

    describe("Initialization", () => {
        it("should configure kafkajs instance correctly", async () => {
            await initPushQueue(async () => {}, async () => {}, async () => {}, async () => {});
            assert(KafkaConstructor.calledWith({
                clientId: kafkaConfig.clientId,
                brokers: kafkaConfig.brokers,
                logLevel: kafkaLogLevel.ERROR,
            }));
            assert(kafkaInstance.producer.calledWith({
                createPartitioner: Partitioners.DefaultPartitioner
            }));
            assert(producerInstance.connect.called);
            assert(kafkaInstance.consumer.calledWith({
                groupId: kafkaConfig.consumerGroupId,
                allowAutoTopicCreation: false
            }));
            assert(consumerInstance.connect.called)
            const topics = Object.values(kafkaConfig.topics)
                .filter(i => i.name !== kafkaConfig.topics.SCHEDULE.name)
                .map(i => i.name);
            assert(consumerInstance.subscribe.calledWith({
                topics,
                fromBeginning: true
            }));
            assert(consumerInstance.run.called);
        });

        it("should be able pass events to listeners", async () => {
            await new Promise(async (res, rej) => {
                let noResolves = 2;
                const appId = new ObjectId;
                const messageId = new ObjectId;
                const scheduleId = new ObjectId;
                /** @type {PushEvent} */
                const pushEvent = {
                    appId,
                    messageId,
                    scheduleId,
                    uid: "1",
                    token: "token",
                    message: "message",
                    platform: "i",
                    env: "p",
                    language: "en",
                    saveResult: true,
                    platformConfiguration: {},
                    credentials: {
                        _id: new ObjectId,
                        serviceAccountFile: "service account",
                        type: "fcm",
                        hash: "credentialshash"
                    },
                    trigger: {
                        kind: "plain",
                        start: new Date(),
                    },
                    appTimezone: "NA",
                };
                /** @type {ScheduleEvent} */
                const scheduleEvent = {
                    appId,
                    messageId,
                    scheduleId,
                    scheduledTo: new Date
                };
                /** @type {PushEventHandler} */
                async function pushEventHandler(events) {
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
                }
                /** @type {ScheduleEventHandler} */
                async function scheduleEventHandler(events) {
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
                }
                await initPushQueue(pushEventHandler, scheduleEventHandler, async () => {}, async () => {});
                const { eachBatch } = consumerInstance.run.firstCall.firstArg;
                await eachBatch({
                    batch: {
                        topic: kafkaConfig.topics.SEND.name,
                        messages: [{ value: JSON.stringify(pushEvent) }]
                    }
                });
                await eachBatch({
                    batch: {
                        topic: kafkaConfig.topics.COMPOSE.name,
                        messages: [{ value: JSON.stringify(scheduleEvent) }]
                    }
                });
            });
        });
    });

    describe("Push event sender", () => {
        it("should send a valid payload", async () => {
            const appId = new ObjectId;
            const messageId = new ObjectId;
            const scheduleId = new ObjectId;
            /** @type {PushEvent} */
            const pushEvent = {
                appId,
                messageId,
                scheduleId,
                uid: "1",
                token: "token",
                message: "message",
                platform: "i",
                env: "p",
                language: "en",
                saveResult: true,
                platformConfiguration: {},
                credentials: {
                    _id: new ObjectId,
                    serviceAccountFile: "service account",
                    type: "fcm",
                    hash: "credentialshash"
                },
                trigger: {
                    kind: "plain",
                    start: new Date(),
                },
                appTimezone: "NA",
            };
            await initPushQueue(async () => {}, async () => {}, async () => {}, async () => {});
            await sendPushEvents([pushEvent]);
            assert(producerInstance.send.calledWith({
                topic: kafkaConfig.topics.SEND.name,
                messages: [{
                    value : JSON.stringify(pushEvent)
                }]
            }));
        });
    });

    describe("Schedule event sender", () => {
        it("should send a valid payload", async () => {
            const appId = new ObjectId;
            const messageId = new ObjectId;
            const scheduleId = new ObjectId;
            /** @type {ScheduleEvent} */
            const scheduleEvent = {
                appId,
                messageId,
                scheduleId,
                scheduledTo: new Date
            };
            await initPushQueue(async () => {}, async () => {}, async () => {}, async () => {});
            await sendScheduleEvents([scheduleEvent]);
            const arg = /** @type {any} */(producerInstance.send.args[0][0]);
            assert(typeof arg.messages[0].key === "string");
            delete arg.messages[0].key;
            assert.deepStrictEqual(arg, {
                topic: kafkaConfig.topics.SCHEDULE.name,
                messages: [
                    {
                        value: JSON.stringify(scheduleEvent),
                        headers: {
                            "scheduler-epoch": String(Math.round(scheduleEvent.scheduledTo.getTime() / 1000)),
                            "scheduler-target-topic": kafkaConfig.topics.COMPOSE.name,
                        },
                    }
                ]
            });
        });
    });
});
