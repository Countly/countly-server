import type { Db } from "mongodb";
import type { KafkaInstance, KafkaCustomPartitioner } from "./producer.ts";
import {
    scheduleEventDTOToObject, pushEventDTOToObject,
    resultEventDTOToObject, autoTriggerEventDTOToObject,
} from "./types.ts";
import { setupProducer, setupTopicsAndPartitions } from "./producer.ts";
import { KAFKA_TOPICS, KAFKA_CONSUMER_GROUP_ID, KAFKA_SESSION_TIMEOUT } from "../constants/configs.ts";
import { sendPush } from "../send/sender.ts";
import { composeScheduledPushes } from "../send/composer.ts";
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
        groupId: KAFKA_CONSUMER_GROUP_ID,
        allowAutoTopicCreation: false,
        sessionTimeout: KAFKA_SESSION_TIMEOUT,
    });
    await pushConsumer.connect();
    await pushConsumer.subscribe({
        topics: [
            KAFKA_TOPICS.SEND.name,
            KAFKA_TOPICS.COMPOSE.name,
            KAFKA_TOPICS.RESULT.name,
            KAFKA_TOPICS.AUTO_TRIGGER.name,
        ],
        fromBeginning: true,
    });
    // SEND and COMPOSE can block for a long time (HTTP sends, audience
    // aggregation). Process those one message at a time so we can commit
    // offsets and heartbeat between each — preventing session timeouts from
    // causing duplicate processing on rebalance.
    //
    // RESULT and AUTO_TRIGGER are fast DB operations — process them as a
    // batch for efficiency (fewer round-trips to MongoDB).
    const perMessageTopics = new Set([
        KAFKA_TOPICS.SEND.name,
        KAFKA_TOPICS.COMPOSE.name,
    ]);

    await pushConsumer.run({
        eachBatch: async({
            batch: {
                topic,
                messages,
            },
            resolveOffset,
            heartbeat,
            commitOffsetsIfNecessary,
        }: any) => {
            log.i("Received " + String(messages.length) + " message(s) in topic " + topic);
            if (perMessageTopics.has(topic)) {
                for (const message of messages) {
                    const raw = message.value ? message.value.toString("utf8") : null;
                    if (!raw) {
                        resolveOffset(message.offset);
                        continue;
                    }
                    try {
                        const parsed = JSON.parse(raw);
                        log.d("Message:", raw);
                        switch (topic) {
                        case KAFKA_TOPICS.SEND.name:
                            await sendPush(pushEventDTOToObject(parsed));
                            break;
                        case KAFKA_TOPICS.COMPOSE.name: {
                            const scheduleEvent = scheduleEventDTOToObject(parsed);
                            try {
                                await composeScheduledPushes(db, scheduleEvent, heartbeat);
                            }
                            catch (composeErr: any) {
                                log.e("Error while composing", scheduleEvent, composeErr);
                                const error = composeErr instanceof Error
                                    ? { name: composeErr.name, message: composeErr.message, stack: composeErr.stack }
                                    : { name: "UnknownError", message: "Unknown error occurred while composing the scheduled push messages" };
                                db.collection("message_schedules").updateOne(
                                    { _id: scheduleEvent.scheduleId, "events.scheduledTo": scheduleEvent.scheduledTo },
                                    { $set: { "events.$.status": "failed", "events.$.error": error } }
                                );
                            }
                            break;
                        }
                        }
                    }
                    catch (err) {
                        log.e("Error while consuming, Topic " + topic + " Message: " + raw, err);
                    }
                    resolveOffset(message.offset);
                    await commitOffsetsIfNecessary();
                    await heartbeat();
                }
            }
            else {
                const decoded = messages.map(
                    (m: any) => m.value ? m.value.toString("utf8") : null
                );
                try {
                    const parsed = decoded
                        .map((value: string | null) => value ? JSON.parse(value) : null)
                        .filter((value: any) => !!value);
                    log.d("Messages:", JSON.stringify(parsed, null, 2));
                    switch (topic) {
                    case KAFKA_TOPICS.RESULT.name:
                        await saveResults(db, parsed.map(resultEventDTOToObject));
                        break;
                    case KAFKA_TOPICS.AUTO_TRIGGER.name:
                        await scheduleMessageByAutoTriggers(db, parsed.map(autoTriggerEventDTOToObject));
                        break;
                    }
                }
                catch (err) {
                    log.e("Error while consuming, Topic " + topic + " Messages: " + decoded, err);
                }
            }
        }
    });
}
