import {
    scheduleEventDTOToObject,
    pushEventDTOToObject,
    credentialsDTOToObject,
    resultEventDTOToObject,
    autoTriggerEventDTOToObject,
} from '../../../api/kafka/types.ts';
import type { ScheduleEventDTO, PushEventDTO, ResultEventDTO, CredentialsDTO, AutoTriggerEventDTO } from '../../../api/kafka/types.ts';
import { ObjectId } from 'mongodb';
import assert from 'assert';
import { describe, it } from 'mocha';
import * as data from '../../mock/data.ts';

describe("DTO conversion functions", () => {
    describe("scheduleEventDTOToObject", () => {
        it("should convert string IDs and dates to ObjectId and Date", () => {
            const appId = new ObjectId();
            const messageId = new ObjectId();
            const scheduleId = new ObjectId();
            const scheduledTo = new Date("2025-06-15T10:00:00Z");

            const dto: ScheduleEventDTO = {
                appId: appId.toString(),
                messageId: messageId.toString(),
                scheduleId: scheduleId.toString(),
                scheduledTo: scheduledTo.toISOString(),
            };

            const result = scheduleEventDTOToObject(dto);

            assert(result.appId instanceof ObjectId);
            assert(result.messageId instanceof ObjectId);
            assert(result.scheduleId instanceof ObjectId);
            assert(result.scheduledTo instanceof Date);
            assert(result.appId.equals(appId));
            assert(result.messageId.equals(messageId));
            assert.strictEqual(result.scheduledTo.getTime(), scheduledTo.getTime());
        });

        it("should preserve optional timezone field", () => {
            const dto: ScheduleEventDTO = {
                appId: new ObjectId().toString(),
                messageId: new ObjectId().toString(),
                scheduleId: new ObjectId().toString(),
                scheduledTo: new Date().toISOString(),
                timezone: "180",
            };

            const result = scheduleEventDTOToObject(dto);
            assert.strictEqual(result.timezone, "180");
        });
    });

    describe("credentialsDTOToObject", () => {
        it("should convert FCM credentials with _id", () => {
            const id = new ObjectId();
            const dto: CredentialsDTO = {
                _id: id.toString(),
                type: "fcm",
                serviceAccountFile: "data:...",
                hash: "abc123",
            };

            const result = credentialsDTOToObject(dto);

            assert(result._id instanceof ObjectId);
            assert(result._id.equals(id));
            assert.strictEqual((result as any).type, "fcm");
        });

        it("should convert APN P12 credentials with date fields", () => {
            const id = new ObjectId();
            const notAfter = new Date("2026-01-01T00:00:00Z");
            const notBefore = new Date("2024-01-01T00:00:00Z");

            const dto: any = {
                _id: id.toString(),
                type: "apn_universal",
                cert: "certdata",
                secret: "pass",
                bundle: "com.example",
                notAfter: notAfter.toISOString(),
                notBefore: notBefore.toISOString(),
                topics: ["com.example"],
                hash: "xyz",
            };

            const result = credentialsDTOToObject(dto);

            assert(result._id instanceof ObjectId);
            assert((result as any).notAfter instanceof Date);
            assert((result as any).notBefore instanceof Date);
            assert.strictEqual(
                (result as any).notAfter.getTime(),
                notAfter.getTime()
            );
            assert.strictEqual(
                (result as any).notBefore.getTime(),
                notBefore.getTime()
            );
        });

        it("should not create date fields for non-P12 credentials", () => {
            const dto: CredentialsDTO = {
                _id: new ObjectId().toString(),
                type: "hms",
                app: "appid",
                secret: "secret",
                hash: "hash",
            } as any;

            const result = credentialsDTOToObject(dto);

            assert(result._id instanceof ObjectId);
            assert.strictEqual((result as any).notAfter, undefined);
        });
    });

    describe("pushEventDTOToObject", () => {
        it("should convert ObjectId and Date fields from strings", () => {
            const pushEvent = data.pushEvent();
            const dto = JSON.parse(JSON.stringify(pushEvent)) as PushEventDTO;

            const result = pushEventDTOToObject(dto);

            assert(result.appId instanceof ObjectId);
            assert(result.messageId instanceof ObjectId);
            assert(result.scheduleId instanceof ObjectId);
            assert(result.credentials._id instanceof ObjectId);
        });

        it("should convert sendBefore when present", () => {
            const pushEvent = data.pushEvent();
            pushEvent.sendBefore = new Date("2025-12-31T23:59:59Z");
            const dto = JSON.parse(JSON.stringify(pushEvent)) as PushEventDTO;

            const result = pushEventDTOToObject(dto);

            assert(result.sendBefore instanceof Date);
            assert.strictEqual(
                result.sendBefore!.getTime(),
                new Date("2025-12-31T23:59:59Z").getTime()
            );
        });

        it("should leave sendBefore as undefined when not present", () => {
            const pushEvent = data.pushEvent();
            delete pushEvent.sendBefore;
            const dto = JSON.parse(JSON.stringify(pushEvent)) as PushEventDTO;

            const result = pushEventDTOToObject(dto);

            assert.strictEqual(result.sendBefore, undefined);
        });

        it("should preserve non-ObjectId/Date fields", () => {
            const pushEvent = data.pushEvent();
            const dto = JSON.parse(JSON.stringify(pushEvent)) as PushEventDTO;

            const result = pushEventDTOToObject(dto);

            assert.strictEqual(result.platform, pushEvent.platform);
            assert.strictEqual(result.token, pushEvent.token);
            assert.strictEqual(result.language, pushEvent.language);
            assert.strictEqual(result.saveResult, pushEvent.saveResult);
        });
    });

    describe("resultEventDTOToObject", () => {
        it("should convert all ObjectId, Date, and credential fields", () => {
            const resultEvent = data.resultEvent();
            const dto = JSON.parse(JSON.stringify(resultEvent)) as ResultEventDTO;

            const result = resultEventDTOToObject(dto);

            assert(result.appId instanceof ObjectId);
            assert(result.messageId instanceof ObjectId);
            assert(result.scheduleId instanceof ObjectId);
            assert(result.sentAt instanceof Date);
            assert(result.credentials._id instanceof ObjectId);
        });

        it("should convert sendBefore when present", () => {
            const resultEvent = data.resultEvent();
            resultEvent.sendBefore = new Date("2025-06-01T00:00:00Z");
            const dto = JSON.parse(JSON.stringify(resultEvent)) as ResultEventDTO;

            const result = resultEventDTOToObject(dto);

            assert(result.sendBefore instanceof Date);
        });

        it("should leave sendBefore as undefined when not present", () => {
            const resultEvent = data.resultEvent();
            delete resultEvent.sendBefore;
            const dto = JSON.parse(JSON.stringify(resultEvent)) as ResultEventDTO;

            const result = resultEventDTOToObject(dto);

            assert.strictEqual(result.sendBefore, undefined);
        });
    });

    describe("autoTriggerEventDTOToObject", () => {
        it("should convert cohort trigger appId to ObjectId", () => {
            const event = data.cohortTriggerEvent();
            const dto = JSON.parse(JSON.stringify(event)) as AutoTriggerEventDTO;

            const result = autoTriggerEventDTOToObject(dto);

            assert(result.appId instanceof ObjectId);
            assert.strictEqual(result.kind, "cohort");
            if (result.kind === "cohort") {
                assert.strictEqual(result.cohortId, event.cohortId);
                assert.deepStrictEqual(result.uids, event.uids);
                assert.strictEqual(result.direction, event.direction);
            }
        });

        it("should convert event trigger appId to ObjectId", () => {
            const event = data.eventTriggerEvent();
            const dto = JSON.parse(JSON.stringify(event)) as AutoTriggerEventDTO;

            const result = autoTriggerEventDTOToObject(dto);

            assert(result.appId instanceof ObjectId);
            assert.strictEqual(result.kind, "event");
            if (result.kind === "event") {
                assert.deepStrictEqual(result.eventKeys, event.eventKeys);
                assert.strictEqual(result.uid, event.uid);
            }
        });
    });
});
