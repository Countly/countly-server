import type { ScheduleEvent, PushEvent, ResultEvent, AutoTriggerEvent } from "./types.ts";
import kafkaConfig from "../constants/kafka-config.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.js').Common = require('../../../../api/utils/common.js');
const log = common.log('push:kafka');

// Types from kafkajs (via kafka plugin)
export interface KafkaInstance {
    producer(config?: { createPartitioner?: KafkaCustomPartitioner }): KafkaProducer;
    consumer(config?: any): any;
    admin(): any;
}

export interface KafkaProducer {
    connect(): Promise<void>;
    send(config: {
        topic: string;
        messages: Array<{ value: string; key?: string; headers?: Record<string, string> }>;
    }): Promise<any>;
}

export type KafkaCustomPartitioner = () => any;

export interface KafkaPartitioners {
    DefaultPartitioner: KafkaCustomPartitioner;
    LegacyPartitioner: KafkaCustomPartitioner;
}

let PRODUCER: KafkaProducer | undefined;

export async function loadKafka(): Promise<{ kafkaInstance: KafkaInstance; Partitioners: KafkaPartitioners }> {
    verifyKafka();
    const {
        onReady: onKafkaClientReady,
        kafkajs: { Partitioners }
    } = require('../../../kafka/api/api.js');
    const clientObject = await new Promise<any>(res => onKafkaClientReady(res));
    const kafkaInstance = clientObject.createKafkaInstance() as KafkaInstance;
    return { kafkaInstance, Partitioners };
}

export function verifyKafka(): boolean {
    if (!common.config.kafka?.enabled) {
        throw new Error("Kafka is not enabled in the configuration");
    }
    try {
        require.resolve('../../../kafka/api/lib/KafkaConsumer.js');
        require.resolve('../../../kafka/api/lib/kafkaClient.js');
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

export async function sendScheduleEvents(scheduleEvents: ScheduleEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    log.i("Sending " + scheduleEvents.length + " schedule events");
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
    log.i("Sending " + pushes.length + " push events");
    await PRODUCER.send({
        topic: kafkaConfig.topics.SEND.name,
        messages: pushes.map(p => ({ value: JSON.stringify(p) }))
    });
}

export async function sendResultEvents(results: ResultEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    log.i("Sending " + results.length + " result events");
    await PRODUCER.send({
        topic: kafkaConfig.topics.RESULT.name,
        messages: results.map(r => ({ value: JSON.stringify(r) }))
    });
}

export async function sendAutoTriggerEvents(autoTriggerEvents: AutoTriggerEvent[]): Promise<void> {
    if (!PRODUCER) {
        throw new Error("Kafka producer is not initialized");
    }
    log.i("Sending " + autoTriggerEvents.length + " auto trigger events");
    await PRODUCER.send({
        topic: kafkaConfig.topics.AUTO_TRIGGER.name,
        messages: autoTriggerEvents.map(e => ({ value: JSON.stringify(e) })),
    });
}
