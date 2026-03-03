import type {
    ScheduleEvent, PushEvent, ResultEvent, AutoTriggerEvent,
    PushEventHandler, ScheduleEventHandler, ResultEventHandler, AutoTriggerEventHandler,
} from "../types/queue.ts";
import {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    resultEventDTOToObject,
    autoTriggerEventDTOToObject,
} from "./dto.ts";
import kafkaConfig from "../constants/kafka-config.ts";

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common: any = require('../../../../../api/utils/common');
const log = common.log('push:kafka');

// Types from kafkajs (via kafka plugin)
interface KafkaInstance {
    producer(config?: { createPartitioner?: KafkaCustomPartitioner }): KafkaProducer;
    consumer(config?: any): any;
    admin(): any;
}

interface KafkaProducer {
    connect(): Promise<void>;
    send(config: {
        topic: string;
        messages: Array<{ value: string; key?: string; headers?: Record<string, string> }>;
    }): Promise<any>;
}

type KafkaCustomPartitioner = () => any;

interface KafkaPartitioners {
    DefaultPartitioner: KafkaCustomPartitioner;
    LegacyPartitioner: KafkaCustomPartitioner;
}

let PRODUCER: KafkaProducer | undefined;

export async function loadKafka(): Promise<{ kafkaInstance: KafkaInstance; Partitioners: KafkaPartitioners }> {
    verifyKafka();
    const {
        onReady: onKafkaClientReady,
        kafkajs: { Partitioners }
    } = require('../../../../kafka/api/api.js');
    const clientObject = await new Promise<any>(res => onKafkaClientReady(res));
    const kafkaInstance = clientObject.createKafkaInstance() as KafkaInstance;
    return { kafkaInstance, Partitioners };
}

export function verifyKafka(): boolean {
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

export async function setupProducer(kafkaInstance: KafkaInstance, createPartitioner: KafkaCustomPartitioner): Promise<KafkaProducer> {
    let localProducer = kafkaInstance.producer({ createPartitioner });
    await localProducer.connect();
    PRODUCER = localProducer;
    return PRODUCER;
}

export async function isProducerInitialized(): Promise<boolean> {
    return !!PRODUCER;
}

export async function setupTopicsAndPartitions(kafkaInstance: KafkaInstance, forceRecreation = false): Promise<void> {
    const admin = kafkaInstance.admin();
    const topics = Object.values(kafkaConfig.topics);
    await admin.connect();

    if (forceRecreation) {
        try {
            await admin.deleteTopics({
                topics: topics.map(({ name }: { name: string }) => name)
            });
        }
        catch (err) {
            log.e("Error deleting topics:", err);
        }
    }

    const existingTopics = await admin.listTopics();
    const topicsToCreate = topics.filter(
        ({ name }: { name: string }) => !existingTopics.includes(name)
    );
    await admin.createTopics({
        topics: topicsToCreate.map(
            ({ name, partitions, config }: { name: string; partitions: number; config: Record<string, string> }) => ({
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

export async function initPushQueue(
    kafkaInstance: KafkaInstance,
    createPartitioner: KafkaCustomPartitioner,
    onPushMessages: PushEventHandler,
    onMessageSchedules: ScheduleEventHandler,
    onMessageResults: ResultEventHandler,
    onAutoTriggerEvents: AutoTriggerEventHandler
): Promise<void> {
    await setupProducer(kafkaInstance, createPartitioner);
    await setupTopicsAndPartitions(kafkaInstance);

    const pushConsumer = kafkaInstance.consumer({
        groupId: kafkaConfig.consumerGroupId,
        allowAutoTopicCreation: false,
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
        }: any) => {
            const decoded = messages.map(
                (m: any) => m.value ? m.value.toString("utf8") : null
            );
            try {
                log.i("Received", messages.length, "message(s) in topic", topic);
                const parsed = decoded
                    .map((value: string | null) => value ? JSON.parse(value) : null)
                    .filter((value: any) => !!value);
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

export async function sendScheduleEvents(scheduleEvents: ScheduleEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
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
                key: String(Math.random()),
            };
        })
    });
}

export async function sendPushEvents(pushes: PushEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.SEND.name,
        messages: pushes.map(p => ({ value: JSON.stringify(p) }))
    });
}

export async function sendResultEvents(results: ResultEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.RESULT.name,
        messages: results.map(r => ({ value: JSON.stringify(r) }))
    });
}

export async function sendAutoTriggerEvents(autoTriggerEvents: AutoTriggerEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    await PRODUCER.send({
        topic: kafkaConfig.topics.AUTO_TRIGGER.name,
        messages: autoTriggerEvents.map(e => ({ value: JSON.stringify(e) })),
    });
}
