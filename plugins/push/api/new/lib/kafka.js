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
 * @typedef {import('../types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('../types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('../types/queue.ts').ResultEventDTO} ResultEventDTO
 */
const config = require("../constants/kafka-config.json");
const {
    Kafka,
    Partitioners,
    logLevel: kafkaJsLogLevel
} = require("kafkajs");
const {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    autoTriggerEventDTOToObject,
} = require("./dto.js");
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
    const kafka = new Kafka({
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: kafkaJsLogLevel.ERROR
    });

    PRODUCER = kafka.producer({
        createPartitioner: Partitioners.DefaultPartitioner
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
                log.i("Received", messages.length, "message(s) in topic", topic);
                const parsed = messages
                    .map(
                        ({ value }) => value
                            ? JSON.parse(value.toString("utf8"))
                            : null
                    )
                    .filter(value => !!value);
                log.d("Messages:", JSON.stringify(parsed, null, 2));
                switch (topic) {
                case config.topics.SEND.name:
                    return await onPushMessages(parsed.map(pushEventDTOToObject));
                case config.topics.COMPOSE.name:
                    return await onMessageSchedules(parsed.map(scheduleEventDTOToObject));
                case config.topics.RESULT.name:
                    return await onMessageResults(parsed.map(resultEventDTOToObject));
                case config.topics.AUTO_TRIGGER.name:
                    return await onAutoTriggerEvents(parsed.map(autoTriggerEventDTOToObject));
                }
            } catch(err) {
                log.e("Error while consuming. topic:", topic, err);
            }
        }
    });
}

/**
 *
 * @param {ScheduleEvent[]} scheduleEvents - message schedules to send to broker
 */
async function sendScheduleEvents(scheduleEvents) {
    if (!PRODUCER) {
        throw new Error("Producer is not initialized");
    }
    await PRODUCER.send({
        topic: config.topics.SCHEDULE.name,
        messages: scheduleEvents.map(scheduleEvent => {
            return {
                value: JSON.stringify(scheduleEvent),
                headers: {
                    "scheduler-target-topic": config.topics.COMPOSE.name,
                    "scheduler-epoch": String(
                        Math.round(scheduleEvent.scheduledTo.getTime() / 1000)
                    ),
                },
                // in this case, key is required for the scheduler to work properly
                key: String(Math.random()),
            }
        })
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

/**
 * Sets up Kafka topics and partitions according to the configuration.
 * If `forceRecreation` is true, it will delete and recreate the topics.
 * This function is intended to be run once at the start of the application
 * to ensure that the Kafka topics are set up correctly. It checks if the topics exist,
 * and if not, creates them with the specified number of partitions. If `forceRecreation` is true,
 * it will delete existing topics and recreate them, which can be useful during development
 * or testing to ensure a clean state.
 * @param {boolean} forceRecreation - whether to forcefully recreate topics
 * @returns {Promise<void>}
 * @throws {Error} if there is an error during topic creation or deletion
 */
async function setupTopicsAndPartitions(forceRecreation = false) {
    const kafka = new Kafka({
        clientId: config.clientId,
        brokers: config.brokers,
        logLevel: kafkaJsLogLevel.ERROR
    });
    const admin = kafka.admin();
    const topics = Object.values(config.topics);

    if (forceRecreation) {
        try {
            await admin.deleteTopics({
                topics: topics.map(({ name }) => name)
            });
        }
        catch (err) {
            console.error(err);
            // ignore...
        }
        await admin.createTopics({
            topics: topics.map(
                ({ name, partitions }) => ({
                    topic: name,
                    numPartitions: partitions
                })
            )
        });
        console.log("all topics are recreated");
    }
    else {
        // also check if topics have the correct number of partitions
        await admin.connect();
        const existingTopics = await admin.listTopics();
        const topicsToCreate = topics.filter(
            ({ name }) => !existingTopics.includes(name)
        );

        if (topicsToCreate.length) {
            const result = await admin.createTopics({
                topics: topicsToCreate.map(
                    ({ name, partitions }) => ({
                        topic: name,
                        numPartitions: partitions
                    })
                )
            });
            if (result) {
                console.log("Created topics:", topicsToCreate.map(t => t.name));
            }
            else {
                console.log("No topics were created. They might already exist.");
            }
        }

        // Check existing topics for correct partition count
        const existingTopicsToCheck = topics.filter(
            ({ name }) => existingTopics.includes(name)
        );

        if (existingTopicsToCheck.length) {
            const topicMetadata = await admin.fetchTopicMetadata({
                topics: existingTopicsToCheck.map(({ name }) => name)
            });

            const topicsToUpdate = [];
            for (const topic of existingTopicsToCheck) {
                const metadata = topicMetadata.topics.find(t => t.name === topic.name);
                if (metadata && metadata.partitions.length !== topic.partitions) {
                    if (metadata.partitions.length < topic.partitions) {
                        console.log(`Topic ${topic.name} has ${metadata.partitions.length} partitions, expected ${topic.partitions}`);
                        topicsToUpdate.push({
                            topic: topic.name,
                            count: topic.partitions
                        });
                    }
                    else {
                        console.log(`Topic ${topic.name} has more partitions than expected: ${metadata.partitions.length} vs ${topic.partitions}. This is not an error, but you might want to check your configuration.`);
                    }
                }
            }

            if (topicsToUpdate.length) {
                try {
                    await admin.createPartitions({
                        topicPartitions: topicsToUpdate
                    });
                    console.log("Updated partition counts for topics:", topicsToUpdate.map(t => t.topic));
                } catch (err) {
                    console.error("Failed to update partition counts:", err);
                }
            }
        }

        await admin.disconnect();
    }
}

module.exports = ({
    sendPushEvents,
    sendScheduleEvents,
    sendResultEvents,
    initPushQueue,
    sendAutoTriggerEvents,
    setupTopicsAndPartitions,
});