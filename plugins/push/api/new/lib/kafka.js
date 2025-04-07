/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('kafkajs').Consumer} Consumer
 * @typedef {import('kafkajs').Producer} Producer
 * @typedef {import('kafkajs').Admin} Admin
 * @typedef {import('../types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../types/queue.ts').PushEventDTO} PushEventDTO
 * @typedef {import('../types/queue.ts').PushEventHandler} PushEventHandler
 * @typedef {import('../types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../types/queue.ts').ResultEventHandler} ResultEventHandler
 * @typedef {import('../types/queue.ts').AutoTriggerEventHandler} AutoTriggerEventHandler
 * @typedef {import('../types/utils.ts').LogObject} LogObject
 * @typedef {import('../types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('../types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('../types/queue.ts').ResultEventDTO} ResultEventDTO
 */
const config = require("../constants/kafka-config.json");
const kafkaJs = require("kafkajs"); // do not import by destructuring; it's being mocked in the tests
const {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    autoTriggerEventDTOToObject,
} = require("./dto.js");
/**
 * @type {LogObject}
 */
const log = require('../../../../../api/utils/common').log('push:kafka');

/** @type {Producer=} */
let PRODUCER;

/**
 * Connects to the kafka broker and creates the required topics
 * @param {PushEventHandler} onPushMessages function to call when there's a PushEvent in the PUSH_MESSAGES_TOPIC topic
 * @param {ScheduleEventHandler} onMessageSchedules function to call when there's a
 * @param {ResultEventHandler} onMessageResults
 * @param {AutoTriggerEventHandler} onAutoTriggerEvents
 * @returns {Promise<void>}
 */
async function initPushQueue(onPushMessages, onMessageSchedules, onMessageResults, onAutoTriggerEvents) {
    const kafka = new kafkaJs.Kafka({
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: kafkaJs.logLevel.ERROR
    });

    PRODUCER = kafka.producer({
        createPartitioner: kafkaJs.Partitioners.DefaultPartitioner
    });
    await PRODUCER.connect();

    const pushConsumer = kafka.consumer({
        groupId: config.consumerGroupId,
        allowAutoTopicCreation: false,
        // TODO: Test and optimize these to consume in properly sized batches
        // minBytes: 100_000,
        // maxWaitTimeInMs: 30_000,
        // sessionTimeout: 180_000,
        // heartbeatInterval: 60_000,
    });
    await pushConsumer.connect();
    await pushConsumer.subscribe({
        topics: [
            config.topics.SEND.name,
            config.topics.COMPOSE.name,
            config.topics.RESULT.name,
            config.topics.AUTO_TRIGGER.name,
        ],
        fromBeginning: true,
    });
    await pushConsumer.run({
        eachBatch: async({
            batch: {
                topic,
                messages,
            },
        }) => {
            try {
                log.i("Received", messages.length, "message in topic", topic);
                const parsed = messages
                    .map(
                        ({ value }) => value
                            ? JSON.parse(value.toString("utf8"))
                            : null
                    )
                    .filter(value => !!value);
                switch (topic) {
                case config.topics.SEND.name:
                    await onPushMessages(parsed.map(pushEventDTOToObject));
                    break;
                case config.topics.COMPOSE.name:
                    await onMessageSchedules(parsed.map(scheduleEventDTOToObject));
                    break;
                case config.topics.RESULT.name:
                    await onMessageResults(parsed.map(resultEventDTOToObject));
                    break;
                case config.topics.AUTO_TRIGGER.name:
                    await onAutoTriggerEvents(parsed.map(autoTriggerEventDTOToObject));
                    break;
                }
            } catch(err) {
                log.e("Error while consuming. topic:", topic, err);
            }
        }
    });
}

/**
 *
 * @param {ScheduleEvent} scheduleEvent message schedule to create job for
 */
async function sendScheduleEvent(scheduleEvent) {
    if (!PRODUCER) {
        throw new Error("Producer is not initialized");
    }
    const scheduleTime = scheduleEvent.scheduledTo.getTime();

    await PRODUCER.send({
        topic: config.topics.SCHEDULE.name,
        messages: [
            {
                timestamp: String(Math.round(Date.now() / 1000)),
                value: JSON.stringify(scheduleEvent),
                headers: {
                    "scheduler-epoch": String(Math.round(scheduleTime / 1000)),
                    "scheduler-target-topic": config.topics.COMPOSE.name,
                    // "scheduler-target-key": "job-key"
                },
                // TODO: find out why this is required. normally it should distribute
                // to scheduler partitions in a round robin fashion when there's no key.
                // But here, if we don't pass the "key", scheduler consumer never
                // receives the ticket.
                key: String(Math.random()),
            }
        ]
    });
}

/**
 *
 * @param {PushEvent[]} pushes
 */
async function sendPushEvents(pushes) {
    if (!PRODUCER) {
        throw new Error("Producer is not initialized");
    }
    await PRODUCER.send({
        topic: config.topics.SEND.name,
        messages: pushes.map(p => ({ value: JSON.stringify(p) }))
    });
}

/**
 * @param {ResultEvent[]} results
 */
async function sendResultEvents(results) {
    if (!PRODUCER) {
        throw new Error("Producer is not initialized");
    }
    await PRODUCER.send({
        topic: config.topics.RESULT.name,
        messages: results.map(r => ({ value: JSON.stringify(r) }))
    });
}

/**
 * @param {AutoTriggerEvent[]} autoTriggerEvents
 */
async function sendAutoTriggerEvents(autoTriggerEvents) {
    if (!PRODUCER) {
        throw new Error("Producer is not initialized");
    }
    await PRODUCER.send({
        topic: config.topics.AUTO_TRIGGER.name,
        messages: autoTriggerEvents.map(e => ({ value: JSON.stringify(e) })),
    });
}

async function purge() {
    const kafka = new kafkaJs.Kafka({
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: kafkaJs.logLevel.ERROR
    });
    const admin = kafka.admin();
    const topics = Object.values(config.topics);
    await admin.connect();
    try {
        await admin.deleteTopics({
            topics: topics.map(({ name }) => name)
        });
    } catch(err) {
        console.error(err);
        // ignore...
    }
    const result = await admin.createTopics({
        topics: topics.map(
            ({ name, partitions }) => ({
                topic: name,
                numPartitions: partitions
            })
        )
    });
    console.log("topic creation result", result);
    await admin.disconnect();
    return result;
}

module.exports = ({
    sendPushEvents,
    sendScheduleEvent,
    sendResultEvents,
    initPushQueue,
    sendAutoTriggerEvents,
    purge,
});