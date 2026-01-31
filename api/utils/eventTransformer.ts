/**
 * Event transformation utilities
 * Provides centralized event transformation functions used across the system
 */

interface DrillEventDocument {
    _id: string;
    a: string;
    e: string;
    ts: number | Date | string;
    n?: string;
    uid?: string;
    did?: string;
    _uid?: string;
    lsid?: string;
    c?: number | string;
    s?: number | string;
    dur?: number | string;
    up?: Record<string, unknown>;
    custom?: Record<string, unknown>;
    cmp?: Record<string, unknown>;
    sg?: Record<string, unknown>;
    up_extra?: Record<string, unknown>;
    lu?: number | Date | string;
    [key: string]: unknown;
}

interface KafkaEventFormat {
    a: string;
    e: string;
    n: string;
    uid?: string;
    did?: string;
    _id: string;
    _uid?: string;
    lsid?: string;
    ts: number;
    c?: number;
    s?: number;
    dur?: number;
    up?: Record<string, unknown>;
    custom?: Record<string, unknown>;
    cmp?: Record<string, unknown>;
    sg?: Record<string, unknown>;
    up_extra?: Record<string, unknown>;
    lu?: number;
}

/**
 * Transform MongoDB document to Kafka event format
 * This function converts drill_events documents to the format expected by Kafka consumers
 *
 * @param doc - MongoDB document from drill_events collection
 * @returns Transformed event object or null if invalid
 */
function transformToKafkaEventFormat(doc: DrillEventDocument | null | undefined): KafkaEventFormat | null {
    if (!doc || !doc.a || !doc.e || !doc.ts || !doc._id) {
        return null;
    }

    const result: Partial<KafkaEventFormat> = {};

    // Required fields
    result.a = doc.a;
    result.e = doc.e;
    result.n = doc.n || "";
    result.uid = doc.uid;
    result.did = doc.did;
    result._id = doc._id;
    result._uid = doc._uid;
    if (doc.lsid) {
        result.lsid = doc.lsid;
    }

    // Timestamp handling - ensure numeric timestamp
    const ts = doc.ts;
    result.ts = typeof ts === 'number' ? ts : (ts instanceof Date ? ts.getTime() : new Date(ts as string).getTime());

    // Numeric fields with proper type coercion
    if (doc.c !== undefined && doc.c !== null) {
        result.c = typeof doc.c === 'number' ? doc.c : +doc.c;
    }
    if (doc.s !== undefined && doc.s !== null) {
        result.s = typeof doc.s === 'number' ? doc.s : +doc.s;
    }
    if (doc.dur !== undefined && doc.dur !== null) {
        result.dur = typeof doc.dur === 'number' ? doc.dur : +doc.dur;
    }

    // JSON fields - preserve object structure
    if (doc.up && typeof doc.up === 'object') {
        result.up = doc.up;
    }
    if (doc.custom && typeof doc.custom === 'object') {
        result.custom = doc.custom;
    }
    if (doc.cmp && typeof doc.cmp === 'object') {
        result.cmp = doc.cmp;
    }
    if (doc.sg && typeof doc.sg === 'object') {
        result.sg = doc.sg;
    }
    if (doc.up_extra && typeof doc.up_extra === 'object') {
        result.up_extra = doc.up_extra;
    }

    // Optional date field
    if (doc.lu !== undefined && doc.lu !== null) {
        const lu = doc.lu;
        result.lu = typeof lu === 'number' ? lu : (lu instanceof Date ? lu.getTime() : new Date(lu as string).getTime());
    }

    return result as KafkaEventFormat;
}

export { transformToKafkaEventFormat };
export type { DrillEventDocument, KafkaEventFormat };
