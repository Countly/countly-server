/**
 * Lightweight metadata helpers that keep timestamps in Unix seconds.
 * Used across API surfaces to track who created/updated a document.
 * @module api/utils/metadata
 */

const MS_THRESHOLD = 10000000000;

/**
 * Coerce a timestamp value to Unix seconds
 * @param {number|Date|undefined} value - Timestamp value to coerce
 * @returns {number|undefined} Unix timestamp in seconds or undefined
 */
function coerceTimestamp(value) {
    if (typeof value === "number") {
        return value > MS_THRESHOLD ? Math.floor(value / 1000) : value;
    }
    if (value instanceof Date) {
        return Math.floor(value.getTime() / 1000);
    }
    return undefined;
}

/**
 * Convert a value to a string representation of an actor
 * @param {any} value - Value to convert to string
 * @returns {string|undefined} String representation of the actor or undefined
 */
function toActorString(value) {
    if (typeof value === "undefined" || value === null) {
        return undefined;
    }
    if (typeof value === "object" && typeof value.toString === "function") {
        return value.toString();
    }
    return String(value);
}

/**
 * Get current Unix timestamp in seconds
 * @returns {number} Unix timestamp in seconds
 */
function now() {
    return Math.floor(Date.now() / 1000);
}

/**
 * Extract actor ID from params object
 * @param {object} params - Request params containing member info
 * @returns {string|undefined} Actor ID string or undefined
 */
function getActorId(params) {
    if (params && params.member && params.member._id) {
        return params.member._id.toString();
    }
    return undefined;
}

/**
 * Add creation metadata fields to a document
 * @param {object} params - Request params containing member info
 * @param {object} doc - Document to add metadata to
 * @returns {object} Document with created_at, created_by, updated_at, updated_by fields
 */
function addCreationMetadata(params, doc = {}) {
    const timestamp = now();
    const actorId = getActorId(params);
    const legacyCreated = coerceTimestamp(doc.created ?? doc.createdAt);
    const legacyCreator = toActorString(doc.creator ?? doc.createdBy ?? doc.owner);

    if (typeof doc.created_at === "undefined") {
        doc.created_at = typeof legacyCreated !== "undefined" ? legacyCreated : timestamp;
    }
    if (typeof doc.updated_at === "undefined") {
        const legacyUpdated = coerceTimestamp(doc.updated ?? doc.updatedAt ?? doc.edited_at);
        doc.updated_at = typeof legacyUpdated !== "undefined" ? legacyUpdated : doc.created_at;
    }
    if (typeof doc.created_by === "undefined") {
        doc.created_by = legacyCreator || actorId;
    }
    if (typeof doc.updated_by === "undefined") {
        const legacyUpdater = toActorString(doc.updated_by ?? doc.updatedBy ?? doc.editor);
        doc.updated_by = legacyUpdater || doc.created_by || actorId;
    }

    return doc;
}

/**
 * Add update metadata fields to an update operation
 * @param {object} params - Request params containing member info
 * @param {object} update - MongoDB update object (can contain $set, $inc, etc.)
 * @param {boolean} isUpsert - Whether this is an upsert operation
 * @returns {object} Update object with updated_at and updated_by in $set
 */
function addUpdateMetadata(params, update = {}, isUpsert = false) {
    const timestamp = now();
    const actorId = getActorId(params);

    // Handle MongoDB update operators
    if (update.$set || update.$inc || update.$push || update.$pull || update.$unset || update.$addToSet) {
        update.$set = update.$set || {};
        update.$set.updated_at = timestamp;
        if (actorId) {
            update.$set.updated_by = actorId;
        }
    }
    // Handle plain object updates
    else {
        update.updated_at = timestamp;
        if (actorId) {
            update.updated_by = actorId;
        }
    }

    // For upserts, add creation metadata to $setOnInsert
    if (isUpsert && update.$setOnInsert) {
        addCreationMetadata(params, update.$setOnInsert);
    }

    return update;
}

module.exports = {
    addCreationMetadata,
    addUpdateMetadata,
    now,
    getActorId
};
