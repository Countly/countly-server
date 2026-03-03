import { z } from "zod";
import { ObjectId, Collection } from "mongodb";

// ---------------------------------------------------------------------------
// Simple enums
// ---------------------------------------------------------------------------

export const PlatformKeySchema = z.enum(["a", "i", "h"]);
export type PlatformKey = z.infer<typeof PlatformKeySchema>;

export const PlatformEnvKeySchema = z.enum(["p", "d", "a"]);
export type PlatformEnvKey = z.infer<typeof PlatformEnvKeySchema>;

export const PlatformCombinedKeySchema = z.enum(["ap", "hp", "ip", "id", "ia"]);
export type PlatformCombinedKey = z.infer<typeof PlatformCombinedKeySchema>;

// ---------------------------------------------------------------------------
// ObjectId helper
// ---------------------------------------------------------------------------

const ObjectIdSchema = z.instanceof(ObjectId);

// ---------------------------------------------------------------------------
// ErrorObject (local schema matching the interface in utils.ts)
// ---------------------------------------------------------------------------

const ErrorObjectSchema = z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
});

// ---------------------------------------------------------------------------
// PersonalizationObject
// ---------------------------------------------------------------------------

export const PersonalizationObjectSchema = z.object({
    k: z.string().min(1).optional(),
    c: z.boolean().optional(),
    f: z.string().min(1).optional(),
    t: z.enum(["e", "u", "c", "a"]).optional(),
});
export type PersonalizationObject = z.infer<typeof PersonalizationObjectSchema>;

// ---------------------------------------------------------------------------
// ContentButton
// ---------------------------------------------------------------------------

export const ContentButtonSchema = z.object({
    url: z.string().url().trim(),
    title: z.string().trim(),
    pers: z.record(z.string(), PersonalizationObjectSchema).optional(),
});
export type ContentButton = z.infer<typeof ContentButtonSchema>;

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

export const ContentSchema = z.object({
    p: PlatformKeySchema.optional(),
    la: z.string().optional(),
    title: z.string().trim().optional(),
    titlePers: z.record(z.string(), PersonalizationObjectSchema).optional(),
    message: z.string().trim().optional(),
    messagePers: z.record(z.string(), PersonalizationObjectSchema).optional(),
    sound: z.string().trim().optional(),
    badge: z.number().optional(),
    data: z.string().optional(),
    extras: z.array(z.string()).min(1).optional(),
    expiration: z.number().min(60000).max(365 * 24 * 3600000).optional(),
    url: z.string().url().trim().optional(),
    media: z.string().url().trim().optional(),
    mediaMime: z.string().optional(),
    buttons: z.array(ContentButtonSchema).min(1).max(2).optional(),
    specific: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))).min(1).optional(),
});
export type Content = z.infer<typeof ContentSchema>;

// ---------------------------------------------------------------------------
// MessageAudienceFilter
// ---------------------------------------------------------------------------

export const MessageAudienceFilterSchema = z.object({
    user: z.string().optional(),
    drill: z.string().optional(),
    geos: z.array(ObjectIdSchema).min(1).optional(),
    cohorts: z.array(z.string()).min(1).optional(),
});
export type MessageAudienceFilter = z.infer<typeof MessageAudienceFilterSchema>;

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

const PlainTriggerSchema = z.object({
    kind: z.literal("plain"),
    start: z.date(),
    tz: z.boolean().optional(),
    sctz: z.number().optional(),
    delayed: z.boolean().optional(),
    reschedule: z.boolean().optional(),
});

const EventTriggerSchema = z.object({
    kind: z.literal("event"),
    start: z.date(),
    end: z.date().optional(),
    time: z.number().min(0).max(86399999).optional(),
    reschedule: z.boolean().optional(),
    delay: z.number().optional(),
    cap: z.number().optional(),
    sleep: z.number().optional(),
    events: z.array(z.string()).min(1),
});

const CohortTriggerSchema = z.object({
    kind: z.literal("cohort"),
    start: z.date(),
    end: z.date().optional(),
    time: z.number().min(0).max(86399999).optional(),
    reschedule: z.boolean().optional(),
    delay: z.number().optional(),
    cap: z.number().optional(),
    sleep: z.number().optional(),
    cohorts: z.array(z.string()).min(1),
    entry: z.boolean().optional(),
    cancels: z.boolean().optional(),
});

const APITriggerSchema = z.object({
    kind: z.literal("api"),
    start: z.date(),
    end: z.date().optional(),
    time: z.number().min(0).max(86399999).optional(),
    reschedule: z.boolean().optional(),
    delay: z.number().optional(),
    cap: z.number().optional(),
    sleep: z.number().optional(),
});

const RecurringTriggerSchema = z.object({
    kind: z.literal("rec"),
    start: z.date(),
    delayed: z.boolean().optional(),
    reschedule: z.boolean().optional(),
    end: z.date().optional(),
    bucket: z.enum(["daily", "weekly", "monthly"]),
    time: z.number().min(0).max(86399999),
    every: z.number(),
    on: z.array(z.number()).optional(),
    tz: z.boolean(),
    sctz: z.number(),
});

const MultiTriggerSchema = z.object({
    kind: z.literal("multi"),
    start: z.date(),
    delayed: z.boolean().optional(),
    reschedule: z.boolean().optional(),
    dates: z.array(z.date()),
    tz: z.boolean().optional(),
    sctz: z.number().optional(),
});

export const MessageTriggerSchema = z.discriminatedUnion("kind", [
    PlainTriggerSchema,
    EventTriggerSchema,
    CohortTriggerSchema,
    APITriggerSchema,
    RecurringTriggerSchema,
    MultiTriggerSchema,
]);
export type MessageTrigger = z.infer<typeof MessageTriggerSchema>;

// Re-export individual trigger types for consumers that import them directly
export type PlainTrigger = z.infer<typeof PlainTriggerSchema>;
export type EventTrigger = z.infer<typeof EventTriggerSchema>;
export type CohortTrigger = z.infer<typeof CohortTriggerSchema>;
export type APITrigger = z.infer<typeof APITriggerSchema>;
export type RecurringTrigger = z.infer<typeof RecurringTriggerSchema>;
export type MultiTrigger = z.infer<typeof MultiTriggerSchema>;
export type AutoTrigger = EventTrigger | CohortTrigger | APITrigger;

// Base trigger types kept as unions for consumers that reference them
export type BaseTrigger = { kind: MessageTrigger["kind"]; start: Date };
export type BaseAutoTrigger = EventTrigger | CohortTrigger | APITrigger;
export type ReschedulingTrigger = RecurringTrigger | MultiTrigger;

// ---------------------------------------------------------------------------
// Result (recursive)
// ---------------------------------------------------------------------------

export const ResultSchema: z.ZodType<Result> = z.object({
    total: z.number(),
    sent: z.number(),
    actioned: z.number(),
    failed: z.number(),
    errors: z.record(z.string(), z.number()),
    subs: z.lazy(() => z.record(z.string(), ResultSchema)).optional(),
    error: ErrorObjectSchema.optional(),
});

export interface Result {
    total: number;
    sent: number;
    actioned: number;
    failed: number;
    errors: { [key: string]: number };
    subs?: { [key: string]: Result };
    error?: { name: string; message: string; stack?: string };
}

// ---------------------------------------------------------------------------
// Info
// ---------------------------------------------------------------------------

export const InfoSchema = z.object({
    title: z.string().optional(),
    appName: z.string().optional(),
    silent: z.boolean().optional(),
    scheduled: z.boolean().optional(),
    locales: z.record(z.string(), z.number()).optional(),
    created: z.date().optional(),
    createdBy: ObjectIdSchema.optional(),
    createdByName: z.string().optional(),
    updated: z.date().optional(),
    updatedBy: ObjectIdSchema.optional(),
    updatedByName: z.string().optional(),
    removed: z.date().optional(),
    removedBy: ObjectIdSchema.optional(),
    removedByName: z.string().optional(),
    started: z.date().optional(),
    startedLast: z.date().optional(),
    finished: z.date().optional(),
    demo: z.boolean().optional(),
    approved: z.date().optional(),
    approvedBy: ObjectIdSchema.optional(),
    approvedByName: z.string().optional(),
    rejectedAt: z.date().optional(),
    rejectedBy: ObjectIdSchema.optional(),
    rejectedByName: z.string().optional(),
});
export type Info = z.infer<typeof InfoSchema>;

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export const MessageSchema = z.object({
    _id: ObjectIdSchema,
    app: ObjectIdSchema,
    saveResults: z.boolean(),
    platforms: z.array(PlatformKeySchema).min(1),
    status: z.enum(["active", "inactive", "rejected", "draft", "stopped", "deleted"]),
    filter: MessageAudienceFilterSchema.optional(),
    triggers: z.array(MessageTriggerSchema).min(1),
    contents: z.array(ContentSchema).min(1),
    result: ResultSchema,
    info: InfoSchema,
});
export type Message = z.infer<typeof MessageSchema>;

// ---------------------------------------------------------------------------
// Collection type alias
// ---------------------------------------------------------------------------

export type MessageCollection = Collection<Message>;
