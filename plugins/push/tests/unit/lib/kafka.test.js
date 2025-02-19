/**
 * @typedef {import('../../../api/new/types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../../../api/new/types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../../../api/new/types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../../../api/new/types/queue.ts').PushEventHandler} PushEventHandler
 */
const kafka = require("kafkajs");
const { ObjectId } = require("mongodb");
const assert = require("assert");
const { describe, it, beforeEach, after, before } = require("mocha");
const kafkaConfig = require("../../../api/new/constants/kafka-config.json");
const { sendPushEvent, sendScheduleEvent, init } = require("../../../api/new/lib/kafka.js");
const { mockKafkaJs } = require("../mock/kafka.js");

describe("Kafka queue", () => {
    let kafkaMock;

    before(() => kafkaMock = mockKafkaJs());
    beforeEach(() => kafkaMock.reset());
    after(() => kafkaMock.restore());

    describe("Initialization", () => {
        it("should configure kafkajs instance correctly", async () => {
            await init(async () => {}, async () => {}, async () => {}, false);
            assert(kafkaMock.KafkaConstructor.calledWith({
                clientId: kafkaConfig.clientId,
                brokers: kafkaConfig.brokers,
                logLevel: kafka.logLevel.ERROR,
            }));
            assert(kafkaMock.KafkaInstance.producer.calledWith({
                createPartitioner: kafka.Partitioners.DefaultPartitioner
            }));
            assert(kafkaMock.ProducerInstance.connect.called);
            assert(kafkaMock.KafkaInstance.consumer.calledWith({
                groupId: kafkaConfig.consumerGroupId
            }));
            assert(kafkaMock.ConsumerInstance.connect.called)
            assert(kafkaMock.ConsumerInstance.subscribe.calledWith({
                topics: Object.values(kafkaConfig.topics).map(i => i.name),
                fromBeginning: true
            }));
            assert(kafkaMock.ConsumerInstance.run.called);
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
                    token: "token",
                    message: "message",
                    platform: "i",
                    credentials: {
                        serviceAccountFile: "service account",
                        type: "fcm",
                        hash: "credentialshash"
                    }
                };
                /** @type {ScheduleEvent} */
                const scheduleEvent = {
                    appId,
                    messageId,
                    scheduleId,
                    scheduledTo: new Date
                };
                /** @type {PushEventHandler} */
                async function pushEventHandler(event) {
                    try {
                        assert(event.appId instanceof ObjectId);
                        assert(event.messageId instanceof ObjectId);
                        assert(event.scheduleId instanceof ObjectId);

                        assert.deepStrictEqual(
                            JSON.parse(JSON.stringify(pushEvent)),
                            JSON.parse(JSON.stringify(event))
                        );
                        --noResolves || res();
                    }
                    catch (err) {
                        --noResolves || rej(err);
                    }
                }
                /** @type {ScheduleEventHandler} */
                async function scheduleEventHandler(event) {
                    try {
                        assert(event.appId instanceof ObjectId);
                        assert(event.messageId instanceof ObjectId);
                        assert(event.scheduleId instanceof ObjectId);
                        assert(event.scheduledTo instanceof Date);

                        assert.deepStrictEqual(
                            JSON.parse(JSON.stringify(scheduleEvent)),
                            JSON.parse(JSON.stringify(event))
                        );
                        --noResolves || res();
                    }
                    catch (err) {
                        --noResolves || rej(err);
                    }
                }
                await init(pushEventHandler, scheduleEventHandler, async () => {}, false);
                const { eachMessage } = kafkaMock.ConsumerInstance.run.firstCall.firstArg;
                await eachMessage({
                    topic: kafkaConfig.topics.SEND.name,
                    message: { value: JSON.stringify(pushEvent) }
                });
                await eachMessage({
                    topic: kafkaConfig.topics.COMPOSE.name,
                    message: { value: JSON.stringify(scheduleEvent) }
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
                token: "token",
                message: "message",
                platform: "i",
                credentials: {
                    serviceAccountFile: "service account",
                    type: "fcm",
                    hash: "credentialshash"
                }
            };
            await init(async () => {}, async () => {}, async () => {}, false);
            await sendPushEvent(pushEvent);
            assert(kafkaMock.ProducerInstance.send.calledWith({
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
            await init(async () => {}, async () => {}, async () => {}, false);
            const before = Date.now() - 1000;
            await sendScheduleEvent(scheduleEvent);
            const after = Date.now() + 1000;
            const arg = /** @type {any} */(kafkaMock.ProducerInstance.send.args[0][0]);
            const timestamp = Number(arg?.messages?.[0]?.timestamp) * 1000;
            assert(typeof timestamp === "number" && !isNaN(timestamp));
            assert(timestamp >= before && timestamp <= after);
            delete arg.messages[0].timestamp;
            assert(typeof arg.messages[0].key === "string");
            delete arg.messages[0].key;
            assert.deepStrictEqual(arg, {
                topic: kafkaConfig.topics.SCHEDULE.name,
                messages: [
                    {
                        value: JSON.stringify(scheduleEvent),
                        headers: {
                            "scheduler-epoch": String(Math.round(scheduleEvent.scheduledTo.getTime() / 1000)),
                            "scheduler-target-topic": kafkaConfig.topics.SEND.name,
                        },
                    }
                ]
            });
        });
    });
});
