/**
 * @typedef {import('../types/queue.js').JobTicket} JobTicket
 * @typedef {import('kafkajs').Producer} Producer
 * @typedef {import('kafkajs').Admin} Admin
 * @typedef {import('../types/queue.js').PushTicket} PushTicket
 * @typedef {import('../types/queue.js').PushTicketHandler} PushTicketHandler
 * @typedef {import('../types/queue.js').JobTicketHandler} JobTicketHandler
 */

const { Kafka, KafkaJSProtocolError, Partitioners, logLevel } = require("kafkajs");
const { ObjectId } = require('mongodb');

const PUSH_MESSAGES_TOPIC = "CLY_PUSH_MESSAGES";
const JOB_SCHEDULES_TOPIC = "CLY_JOB_SCHEDULES";
const JOB_EXECUTION_TOPIC = "CLY_JOB_EXECUTION";

const ALL_TOPICS = [
    { name: PUSH_MESSAGES_TOPIC, partitions: 6 },
    { name: JOB_SCHEDULES_TOPIC, partitions: 2 },
    { name: JOB_EXECUTION_TOPIC, partitions: 3 },
];

const CONSUMER_GROUP_ID = "countly-consumer";

/**
 * @type {Admin=}
 */
let _admin;
/**
 * @type {Producer=}
 */
let _producer;

/**
 * Connects to the kafka broker and creates the required topics
 * @param {PushTicketHandler} onPushMessage
 * @param {JobTicketHandler} onMessageSchedule
 * @param {Boolean} isMaster
 * @returns {Promise<void>}
 */
async function init(onPushMessage, onMessageSchedule, isMaster = false) {
    if (!onPushMessage || !onMessageSchedule) {
        throw new Error("PushMessage and MessageSchedule handlers are required");
    }

    const kafka = new Kafka({
        clientId: "test-producer",
        brokers: ["localhost:19092"],
        logLevel: logLevel.ERROR
    });

    if (isMaster) {
        _admin = kafka.admin();
        await _admin.connect();
        await createTopics();
    }

    _producer = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
    });
    await _producer.connect();

    const consumer = kafka.consumer({ groupId: CONSUMER_GROUP_ID });
    await consumer.connect();
    await consumer.subscribe({
        topics: [PUSH_MESSAGES_TOPIC, JOB_EXECUTION_TOPIC],
        fromBeginning: true
    });
    await consumer.run({
        eachMessage: async({
            topic,
            partition: _partition,
            message: { value }
        }) => {
            try {
                if (!value) {
                    throw new Error("Message with empty payload");
                }
                const payload = JSON.parse(value.toString("utf8"));

                switch (topic) {
                case PUSH_MESSAGES_TOPIC:
                    /** @type {PushTicket} */
                    const push = payload;

                    // convert strings to ObjectId's
                    push.appId = new ObjectId(push.appId);
                    push.messageId = new ObjectId(push.messageId);
                    push.messageScheduleId = new ObjectId(push.messageScheduleId);

                    await onPushMessage(push);
                    break;
                case JOB_EXECUTION_TOPIC:
                    /** @type {JobTicket} */
                    const job = payload;

                    // convert strings to ObjectId's
                    job.appId = new ObjectId(job.appId);
                    job.messageId = new ObjectId(job.messageId);
                    job.messageScheduleId = new ObjectId(job.messageScheduleId);

                    await onMessageSchedule(job);
                    break;
                }
            }
            catch(err) {
                console.error(err);
                // TODO: log the error
            }
        }
    });
}

/**
 * 
 * @param {JobTicket} messageScheduleJob message schedule to create job for
 */
async function createJob(messageScheduleJob) {
    if (!_producer) {
        throw new Error("Producer is not initialized");
    }
    const scheduleTime = messageScheduleJob.scheduledTo.getTime();

    await _producer.send({
        topic: JOB_SCHEDULES_TOPIC,
        messages: [
            {
                timestamp: String(Math.round(Date.now() / 1000)),
                value: JSON.stringify(messageScheduleJob),
                headers: {
                    "scheduler-epoch": String(Math.round(scheduleTime / 1000)),
                    "scheduler-target-topic": JOB_EXECUTION_TOPIC,
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
async function sendToQueue(push) {
    if (!_producer) {
        throw new Error("Producer is not initialized");
    }
    await _producer.send({
        topic: PUSH_MESSAGES_TOPIC,
        messages: [{
            value : JSON.stringify(push)
        }]
    });
}

module.exports = {
    sendToQueue,
    createJob,
    init
};

async function createTopics() {
    if (!_admin) {
        throw new Error("Admin is not initialized");
    }
    for (let item of ALL_TOPICS) {
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
            if (err instanceof KafkaJSProtocolError
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

async function deletePushTopic() {
    if (!_admin) {
        throw new Error("Admin is not initialized");
    }
    for (let item of ALL_TOPICS) {
        const {name} = item;
        try {
            await _admin.deleteTopics({ topics: [name] });
        }
        catch(err) {
            // TODO: countly way of logging
            if (err instanceof KafkaJSProtocolError
                && err.type ===  "UNKNOWN_TOPIC_OR_PARTITION") {
                // topic not found. do nothing
            }
            else {
                console.error("unknown error while deleting topic", name, err);
            }
        }
    }
}
