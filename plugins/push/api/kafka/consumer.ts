import type { Db } from "mongodb";
import type { KafkaInstance, KafkaCustomPartitioner } from "./producer.ts";
import {
    scheduleEventDTOToObject, pushEventDTOToObject,
    resultEventDTOToObject, autoTriggerEventDTOToObject,
} from "./types.ts";
import { setupProducer, setupTopicsAndPartitions } from "./producer.ts";
import kafkaConfig from "../constants/kafka-config.ts";
import { sendAllPushes } from "../send/sender.ts";
import { composeAllScheduledPushes } from "../send/composer.ts";
import { saveResults } from "../send/resultor.ts";
import { scheduleMessageByAutoTriggers } from "../send/scheduler.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.js').Common = require('../../../../api/utils/common.js');
const log = common.log('push:kafka');

export async function initPushQueue(db: Db, kafkaInstance: KafkaInstance, createPartitioner: KafkaCustomPartitioner): Promise<void> {
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
                log.i("Received " + String(messages.length) + " message(s) in topic " + topic);
                const parsed = decoded
                    .map((value: string | null) => value ? JSON.parse(value) : null)
                    .filter((value: any) => !!value);
                log.d("Messages:", JSON.stringify(parsed, null, 2));
                switch (topic) {
                case kafkaConfig.topics.SEND.name:
                    return await sendAllPushes(parsed.map(pushEventDTOToObject));
                case kafkaConfig.topics.COMPOSE.name:
                    return await composeAllScheduledPushes(db, parsed.map(scheduleEventDTOToObject));
                case kafkaConfig.topics.RESULT.name:
                    return await saveResults(db, parsed.map(resultEventDTOToObject));
                case kafkaConfig.topics.AUTO_TRIGGER.name:
                    return await scheduleMessageByAutoTriggers(db, parsed.map(autoTriggerEventDTOToObject));
                }
            }
            catch (err) {
                log.e("Error while consuming, Topic " + topic + " Messages: " + decoded, err);
            }
        }
    });
}
