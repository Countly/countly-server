import type { ResultEvent, PushEventUserProfile } from "../kafka/types.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../../types/common.d.ts').Common = require("../../../../api/utils/common.js");
const UnifiedEventSink = require("../../../../api/eventSink/UnifiedEventSink.js");
const log = common.log("push:event-emitter");

const PUSH_SENT_EVENT_KEY = "[CLY]_push_sent";

interface DrillEventDocument {
    _id: string;
    a: string;
    e: string;
    n: string;
    uid: string;
    _uid?: string;
    did?: string;
    ts: number;
    cd: Date;
    c: number;
    s: number;
    dur: number;
    sg: Record<string, unknown>;
    up: Record<string, unknown>;
    custom: Record<string, unknown>;
    cmp: Record<string, unknown>;
}

interface BulkInsertOne {
    insertOne: { document: DrillEventDocument };
}

// Lazy singleton — matches the pattern used in api/ingestor/requestProcessor.ts.
let eventSinkInstance: { write(ops: BulkInsertOne[]): Promise<any> } | null = null;

function getEventSink(): { write(ops: BulkInsertOne[]): Promise<any> } {
    if (!eventSinkInstance) {
        eventSinkInstance = new UnifiedEventSink();
        log.i("UnifiedEventSink initialized for push event emitter");
    }
    return eventSinkInstance!;
}

/**
 * Test-only hook so unit tests can inject a mock sink without patching the
 * UnifiedEventSink module. Pass `null` to restore the default lazy singleton.
 */
export function __setEventSinkForTesting(sink: { write(ops: BulkInsertOne[]): Promise<any> } | null): void {
    eventSinkInstance = sink;
}

function stringifyForSegmentation(value: unknown): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    if (typeof value === "string") {
        return value;
    }
    try {
        return JSON.stringify(value);
    }
    catch (err) {
        log.w("Failed to JSON.stringify segmentation value", err);
        return String(value);
    }
}

/**
 * Strips keys whose value is `undefined` so drill doesn't store sparse fields.
 */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    for (const key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}

function buildDrillEvent(result: ResultEvent): BulkInsertOne {
    const appId = result.appId.toString();
    const messageId = result.messageId.toString();
    const scheduleId = result.scheduleId.toString();
    const sentAt = result.sentAt instanceof Date ? result.sentAt : new Date(result.sentAt as any);
    const ts = sentAt.getTime();
    const profile: PushEventUserProfile | undefined = result.userProfile;

    // Deterministic _id so duplicate deliveries (e.g. on kafka retry) don't
    // insert duplicate drill rows.
    const _id = `${appId}_${result.uid}_${ts}_${messageId}`;

    const sg = stripUndefined({
        messageId,
        scheduleId,
        token: result.token,
        platform: result.platform,
        env: result.env,
        language: result.language,
        credentialHash: result.credentials?.hash,
        appTimezone: result.appTimezone,
        sendBefore: result.sendBefore ? result.sendBefore.toISOString() : undefined,
        triggerKind: result.trigger?.kind,
        success: !result.error,
        errorName: result.error?.name,
        errorMessage: result.error?.message,
        errorStack: result.error?.stack,
        payload: stringifyForSegmentation(result.payload),
        platformConfiguration: stringifyForSegmentation(result.platformConfiguration),
        trigger: stringifyForSegmentation(result.trigger),
        response: stringifyForSegmentation(result.response),
    });

    // User properties from the snapshot taken at composition time.
    const up = stripUndefined({ ...(profile?.up || {}), p: profile?.up?.p || result.platform });

    const doc: DrillEventDocument = {
        _id,
        a: appId,
        e: PUSH_SENT_EVENT_KEY,
        n: PUSH_SENT_EVENT_KEY,
        uid: result.uid,
        _uid: profile?._uid,
        did: profile?.did,
        ts,
        cd: new Date(),
        c: 1,
        s: 0,
        dur: 0,
        sg,
        up,
        custom: (profile?.custom as Record<string, unknown>) || {},
        cmp: (profile?.cmp as Record<string, unknown>) || {},
    };

    return { insertOne: { document: doc } };
}

/**
 * Emits one `[CLY]_push_sent` drill event per result. Writes through
 * UnifiedEventSink so the events reach both the mongo `drill_events`
 * collection (for drill) and — if kafka is configured as a sink — the
 * `countly-drill-events` topic (for the aggregator + any downstream
 * ClickHouse consumer).
 *
 * User-profile fields (did, up, custom, cmp) are read from
 * `result.userProfile`, which was populated at composition time by
 * `createPushStream` in `send/composer.ts` — no extra DB lookup here.
 *
 * Errors are logged and swallowed: we must never re-throw here, otherwise
 * the push kafka consumer would re-consume the same RESULT batch.
 */
export async function emitPushSentEvents(results: ResultEvent[]): Promise<void> {
    if (!results.length) {
        return;
    }
    // Respect the per-message saveResult opt-out — if a message sets
    // saveResults=false, its pushes don't produce drill rows.
    const emittable = results.filter(r => r.saveResult);
    if (!emittable.length) {
        return;
    }
    try {
        const bulkOps: BulkInsertOne[] = emittable.map(buildDrillEvent);

        const sink = getEventSink();
        const writeResult = await sink.write(bulkOps);
        if (writeResult?.overall && !writeResult.overall.success) {
            log.e("Event sink reported failure writing [CLY]_push_sent events", writeResult.overall.error);
        }
        else {
            log.d("Emitted %d [CLY]_push_sent event(s)", bulkOps.length);
        }
    }
    catch (err) {
        log.e("Failed to emit [CLY]_push_sent events", err);
    }
}
