/**
 * Event transformation utilities
 * Provides centralized event transformation functions used across the system
 */

/**
 * Transform MongoDB document to Kafka event format
 * This function converts drill_events documents to the format expected by Kafka consumers
 * 
 * @param {Object} doc - MongoDB document from drill_events collection
 * @returns {Object|null} - Transformed event object or null if invalid
 */
function transformToKafkaEventFormat(doc) {
    if (!doc || !doc.a || !doc.e || !doc.ts || !doc._id) {
        return null;
    }

    const result = {};

    // Required fields
    result.a = doc.a;
    result.e = doc.n || doc.e;
    result.uid = doc.uid;
    result.did = doc.did;
    result._id = doc._id;

    // Timestamp handling - ensure numeric timestamp
    const ts = doc.ts;
    result.ts = typeof ts === 'number' ? ts : (ts instanceof Date ? ts.getTime() : new Date(ts).getTime());

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

    // Optional date field
    if (doc.lu !== undefined && doc.lu !== null) {
        const lu = doc.lu;
        result.lu = typeof lu === 'number' ? lu : (lu instanceof Date ? lu.getTime() : new Date(lu).getTime());
    }

    return result;
}

module.exports = {
    transformToKafkaEventFormat
};