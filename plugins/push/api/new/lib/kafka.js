/**
 * @typedef {import('../types/queue.ts').ScheduleEvent} ScheduleEvent
 * @typedef {import('../types/queue.ts').PushEvent} PushEvent
 * @typedef {import('../types/queue.ts').PushEventDTO} PushEventDTO
 * @typedef {import('../types/queue.ts').PushEventHandler} PushEventHandler
 * @typedef {import('../types/queue.ts').ScheduleEventHandler} ScheduleEventHandler
 * @typedef {import('../types/queue.ts').ResultEventHandler} ResultEventHandler
 * @typedef {import('../types/queue.ts').AutoTriggerEventHandler} AutoTriggerEventHandler
 * @typedef {import('../types/queue.ts').ResultEvent} ResultEvent
 * @typedef {import('../types/queue.ts').AutoTriggerEvent} AutoTriggerEvent
 * @typedef {import('../types/queue.ts').ResultEventDTO} ResultEventDTO
 * @typedef {() => (args: any) => number} PartitionerFactory
 * @typedef {import('../../../../kafka/api/api.js').kafkajs.Kafka} Kafka
 * @typedef {import('../../../../kafka/api/api.js').kafkajs.Producer} Producer
 */

const kafkaConfig = require("../constants/kafka-config.json");
const {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    autoTriggerEventDTOToObject,
} = require("./dto.js");
const common = require('../../../../../api/utils/common');
const log = common.log('push:kafka');

/** @type {Producer=} */
let PRODUCER;

/**
 * Loads the Kafka client instance and partitioners from the Kafka plugin.
 * @returns {Promise<{kafkaInstance: Kafka, Partitioners: any}>} Resolves with the Kafka instance and partitioners
 */
async function loadKafka() {
    verifyKafka();
    const {
        onReady: onKafkaClientReady,
        kafkajs: { Partitioners }
    } = require('../../../../kafka/api/api.js');
    const clientObject = await new Promise(res => onKafkaClientReady(res));
    const kafkaInstance = /** @type {Kafka} */(clientObject.createKafkaInstance());
    return { kafkaInstance, Partitioners };
}

/**
 * Verifies that the Kafka plugin is available and enabled.
 * @returns {boolean} True if the plugin is available and enabled
 * @throws {Error} if the plugin is not available or not enabled
 */
function verifyKafka() {
    if (!common.config.kafka?.enabled) {
        throw new Error("Kafka is not enabled in the configuration");
    }
    try {
        require.resolve('../../../../kafka/api/lib/KafkaConsumer');
        require.resolve('../../../../kafka/api/lib/kafkaClient');
    }
    catch (e) {
        throw new Error("Kafka plugin is not available");
    }
    return true;
}

/**
 * Sets up the Kafka producer with the given partitioner.
 * @param {Kafka} kafkaInstance - the Kafka client instance
 * @param {PartitionerFactory} createPartitioner - function to create the partitioner
 * @returns {Promise<Producer>} Resolves with the connected producer
 */
async function setupProducer(kafkaInstance, createPartitioner) {
    let localProducer = kafkaInstance.producer({ createPartitioner });
    await localProducer.connect();
    PRODUCER = localProducer;
    return PRODUCER;
}

/**
 * Checks if the Kafka producer is initialized.
 * @returns {Promise<boolean>} Resolves with true if initialized, false otherwise
 */
async function isProducerInitialized() {
    return !!PRODUCER;
}

/**
 * Sets up Kafka topics and partitions according to the configuration.
 * If `forceRecreation` is true, it will delete and recreate the topics.
 * @param {Kafka} kafkaInstance - the Kafka client instance
 * @param {boolean} forceRecreation - whether to forcefully recreate topics
 * @returns {Promise<void>} Resolves when topics are set up
 * @throws {Error} if there is an error during topic creation or deletion
 */
async function setupTopicsAndPartitions(kafkaInstance, forceRecreation = false) {
    const admin = kafkaInstance.admin();
    const topics = Object.values(kafkaConfig.topics);
    await admin.connect();

    if (forceRecreation) {
        try {
            await admin.deleteTopics({
                topics: topics.map(({ name }) => name)
            });
        }
        catch (err) {
            log.e("Error deleting topics:", err);
            // ignore...
        }
    }

    const existingTopics = await admin.listTopics();
    const topicsToCreate = topics.filter(
        ({ name }) => !existingTopics.includes(name)
    );
    await admin.createTopics({
        topics: topicsToCreate.map(
            ({ name, partitions, config }) => ({
                // eg. [{ name: 'cleanup.policy', value: 'compact' }],
                configEntries: config
                    ? Object.entries(config).map(
                        ([configName, value]) => ({ name: configName, value })
                    )
                    : undefined,
                topic: name,
                numPartitions: partitions
            })
        )
    });
    await admin.disconnect();
    log.i("Kafka topics are set up");
}

/**
 * Connects to the kafka broker and creates the required topics.
 * Also sets up consumers for the topics and calls the provided handlers when messages are received.
 * @param {PushEventHandler} onPushMessages - function to call when there's a PushEvent in the PUSH_MESSAGES_TOPIC topic
 * @param {ScheduleEventHandler} onMessageSchedules - function to call when there's a
 * @param {ResultEventHandler} onMessageResults - function to call when there's a ResultEvent in the MESSAGE_RESULTS_TOPIC topic
 * @param {AutoTriggerEventHandler} onAutoTriggerEvents - function to call when there's an AutoTriggerEvent in the AUTO_TRIGGER_TOPIC topic
 * @returns {Promise<void>} Resolves when the consumers and producer are set up
 */
async function initPushQueue(onPushMessages, onMessageSchedules, onMessageResults, onAutoTriggerEvents) {
    const { kafkaInstance, Partitioners } = await loadKafka();
    await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
    await setupTopicsAndPartitions(kafkaInstance);

    const pushConsumer = kafkaInstance.consumer({
        groupId: kafkaConfig.consumerGroupId,
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
            kafkaConfig.topics.SEND.name,
            kafkaConfig.topics.COMPOSE.name,
            kafkaConfig.topics.RESULT.name,
            kafkaConfig.topics.AUTO_TRIGGER.name,
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
            const decoded = messages.map(
                m => m.value ? m.value.toString("utf8") : null
            );
            try {
                log.i("Received", messages.length, "message(s) in topic", topic);
                const parsed = decoded
                    .map(value => value ? JSON.parse(value) : null)
                    .filter(value => !!value);
                log.d("Messages:", JSON.stringify(parsed, null, 2));
                switch (topic) {
                case kafkaConfig.topics.SEND.name:
                    return await onPushMessages(parsed.map(pushEventDTOToObject));
                case kafkaConfig.topics.COMPOSE.name:
                    return await onMessageSchedules(parsed.map(scheduleEventDTOToObject));
                case kafkaConfig.topics.RESULT.name:
                    return await onMessageResults(parsed.map(resultEventDTOToObject));
                case kafkaConfig.topics.AUTO_TRIGGER.name:
                    return await onAutoTriggerEvents(parsed.map(autoTriggerEventDTOToObject));
                }
            }
            catch (err) {
                log.e(
                    "Error while consuming,",
                    "Topic", topic,
                    "Messages:", decoded,
                    "Error:", err
                );
            }
        }
    });
}

/**
 * Sends schedule events to the broker.
 * @param {ScheduleEvent[]} scheduleEvents - message schedules to send to broker
 * @returns {Promise<void>} Resolves when the events are sent
 * @throws {Error} if the producer is not initialized
 */
async function sendScheduleEvents(scheduleEvents) {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    // important: if you ever need to update the partitioner, you also have to
    // change it in the scheduler service (we use the default partitioner here
    // which is based on the murmur2 algorithm and is the same as the one used
    // by the schduler at the time of writing).
    await PRODUCER.send({
        topic: kafkaConfig.topics.SCHEDULE.name,
        messages: scheduleEvents.map(scheduleEvent => {
            let targetKey = scheduleEvent.messageId.toString()
                + "|" + scheduleEvent.scheduleId.toString()
                + "|" + scheduleEvent.scheduledTo.toISOString();
            return {
                value: JSON.stringify(scheduleEvent),
                headers: {
                    "scheduler-target-topic": kafkaConfig.topics.COMPOSE.name,
                    "scheduler-target-key": targetKey,
                    "scheduler-epoch": String(
                        Math.round(scheduleEvent.scheduledTo.getTime() / 1000)
                    ),
                },
                // key is required in the scheduler for the tombstone messages
                key: String(Math.random()),
            };
        })
    });
}

/**
 * Sends push events to the broker.
 * @param {PushEvent[]} pushes - push events to send to broker
 * @returns {Promise<void>} Resolves when the events are sent
 * @throws {Error} if the producer is not initialized
 */
async function sendPushEvents(pushes) {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.SEND.name,
        messages: pushes.map(p => ({ value: JSON.stringify(p) }))
    });
}

/**
 * Sends result events to the broker.
 * @param {ResultEvent[]} results - message results to send to broker
 * @returns {Promise<void>} Resolves when the events are sent
 */
async function sendResultEvents(results) {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.RESULT.name,
        messages: results.map(r => ({ value: JSON.stringify(r) }))
    });
}

/**
 * Sends auto trigger events to the broker.
 * @param {AutoTriggerEvent[]} autoTriggerEvents - auto trigger events to send to broker
 * @returns {Promise<void>} Resolves when the events are sent
 * @throws {Error} if the producer is not initialized
 */
async function sendAutoTriggerEvents(autoTriggerEvents) {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.AUTO_TRIGGER.name,
        messages: autoTriggerEvents.map(e => ({ value: JSON.stringify(e) })),
    });
}


module.exports = ({
    verifyKafka,
    isProducerInitialized,
    loadKafka,
    setupProducer,
    setupTopicsAndPartitions,
    initPushQueue,
    sendPushEvents,
    sendScheduleEvents,
    sendResultEvents,
    sendAutoTriggerEvents,
});