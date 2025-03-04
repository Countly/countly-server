/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('kafkajs').Consumer} Consumer
 * @typedef {import('kafkajs').Producer} Producer
 * @typedef {import('kafkajs').Admin} Admin
 * @typedef {import('../types/queue.ts').PushQueue} PushQueue
 * @typedef {import('../types/queue.ts').PushEvent} PushTicket
 * @typedef {import('../types/queue.ts').PushEventHandler} PushEventHandler
 * @typedef {import('../types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../types/queue.ts').ResultEventHandler} ResultEventHandler
 */
const config = require("../constants/kafka-config.json");
const kafkaJs = require("kafkajs"); // do not import by destructuring; it's being mocked in the tests
const {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject
} = require("./dto.js");

/** @type {Admin=} */
let _admin;
/** @type {Producer=} */
let _producer;
/**
 * Connects to the kafka broker and creates the required topics
 * @param {PushEventHandler} onPushMessage function to call when there's a PushTicket in the PUSH_MESSAGES_TOPIC topic
 * @param {ScheduleEventHandler} onMessageSchedule function to call when there's a
 * @param {ResultEventHandler} onMessageResults
 * @returns {Promise<void>}
 */
async function init(onPushMessage, onMessageSchedule, onMessageResults, isMaster = false) {
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

    const consumer = kafka.consumer({ groupId: config.consumerGroupId });
    await consumer.connect();
    await consumer.subscribe({
        topics: Object.values(config.topics).map(i => i.name),
        fromBeginning: true
    });
    await consumer.run({
        eachMessage: async({
            topic,
            // partition: _partition,
            message: { value }
        }) => {
            try {
                if (!value) {
                    throw new Error("Message with empty payload");
                }
                const payload = JSON.parse(value.toString("utf8"));

                switch (topic) {
                case config.topics.SEND.name:
                    await onPushMessage(pushEventDTOToObject(payload));
                    break;
                case config.topics.COMPOSE.name:
                    await onMessageSchedule(scheduleEventDTOToObject(payload));
                    break;
                }
            }
            catch (err) {
                console.error(err);
                // TODO: log the error
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
                    "scheduler-target-topic": config.topics.SEND.name,
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
 * @param {PushTicket} push
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
    init,
});