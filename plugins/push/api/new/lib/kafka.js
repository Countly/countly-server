/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('kafkajs').Consumer} Consumer
 * @typedef {import('kafkajs').Producer} Producer
 * @typedef {import('kafkajs').Admin} Admin
 * @typedef {import('../types/queue.ts').PushQueue} PushQueue
 * @typedef {import('../types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../types/queue.ts').PushEventDTO} PushEventDTO
 * @typedef {import('../types/queue.ts').PushEventHandler} PushEventHandler
 * @typedef {import('../types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../types/queue.ts').ResultEventHandler} ResultEventHandler
 * @typedef {import('../types/utils.ts').LogObject} LogObject
 * @typedef {import('../types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('../types/queue.ts').ResultEventDTO} ResultEventDTO
 */
const config = require("../constants/kafka-config.json");
const kafkaJs = require("kafkajs"); // do not import by destructuring; it's being mocked in the tests
const {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject
} = require("./dto.js");
/**
 * @type {LogObject}
 */
const log = require('../../../../../api/utils/common').log('push:kafka');

/** @type {Admin=} */
let _admin;
/** @type {Producer=} */
let _producer;
/**
 * Connects to the kafka broker and creates the required topics
 * @param {PushEventHandler} onPushMessages function to call when there's a PushEvent in the PUSH_MESSAGES_TOPIC topic
 * @param {ScheduleEventHandler} onMessageSchedules function to call when there's a
 * @param {ResultEventHandler} onMessageResults
 * @param {Boolean=} isMaster
 * @returns {Promise<void>}
 */
async function init(onPushMessages, onMessageSchedules, onMessageResults, isMaster = false) {
    const kafka = new kafkaJs.Kafka({
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: kafkaJs.logLevel.ERROR
    });

    if (isMaster) {
        _admin = kafka.admin();
        await _admin.connect();
        await createTopics();
    }

    _producer = kafka.producer({
        createPartitioner: kafkaJs.Partitioners.DefaultPartitioner
    });
    await _producer.connect();

    const consumer = kafka.consumer({
        groupId: config.consumerGroupId,
        allowAutoTopicCreation: false,
    });
    await consumer.connect();
    await consumer.subscribe({
        topics: Object.values(config.topics)
            .map(i => i.name)
            .filter(name => name !== config.topics.SCHEDULE.name),
        fromBeginning: true,
    });
    await consumer.run({
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
    if (!_producer) {
        throw new Error("Producer is not initialized");
    }
    const scheduleTime = scheduleEvent.scheduledTo.getTime();

    await _producer.send({
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
 * @param {PushEvent} push
 */
async function sendPushEvent(push) {
    if (!_producer) {
        throw new Error("Producer is not initialized");
    }
    await _producer.send({
        topic: config.topics.SEND.name,
        messages: [{
            value : JSON.stringify(push)
        }]
    });
}

/**
 * @param {ResultEvent[]} results
 */
async function sendResultEvents(results) {
    if (!_producer) {
        throw new Error("Producer is not initialized");
    }
    await _producer.send({
        topic: config.topics.RESULT.name,
        messages: results.map(result => ({
            value: JSON.stringify(result)
        }))
    });
}

async function createTopics() {
    if (!_admin) {
        throw new Error("Admin is not initialized");
    }
    for (let item of Object.values(config.topics)) {
        const {name, partitions} = item;
        try {
            const topicMetadata = await _admin.fetchTopicMetadata({
                topics: [name]
            });
            if (topicMetadata.topics.find(topic => topic.name === name)) {
                // topic is already there: skip
                continue;
            }
        }
        catch(err) {
            // TODO: countly way of logging
            if (err instanceof kafkaJs.KafkaJSProtocolError
                && err.type ===  "UNKNOWN_TOPIC_OR_PARTITION") {
                // topic not found: create it
            }
            else {
                console.error("unknown error while creating topic", name, err);
                continue;
            }
        }

        await _admin.createTopics({
            topics: [{ topic: name, numPartitions: partitions }]
        });
    }
}

module.exports = /** @type {PushQueue} */({
    sendPushEvent,
    sendScheduleEvent,
    sendResultEvents,
    init,
});