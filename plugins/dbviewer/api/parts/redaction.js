/**
 * @module plugins/dbviewer/api/parts/redaction
 * @description Fields DB Viewer must never return, and the helpers that remove them.
 *
 * A field belongs here when holding it is enough on its own to act as somebody else:
 *  - members.password / api_key / two_factor_auth authenticate a dashboard user;
 *  - password_reset.prid is the password-reset token. The reset route looks it up
 *    directly as password_reset.findOne({prid}), so the value is the reset link.
 *
 * The same redaction has to be applied in three places (single-document read,
 * collection read, aggregation). Keeping the list here rather than at each call site
 * is deliberate: a per-site copy drifts, and a field missed at one of the three is a
 * field that leaks. Adding a collection here covers all three.
 *
 * auth_tokens is deliberately absent. Its secret is the _id itself, which cannot be
 * dropped without breaking the row, so the viewer replaces the value instead. That
 * stays at the call sites.
 */

'use strict';

const REDACTED_FIELDS = Object.freeze({
    members: Object.freeze(["password", "api_key", "two_factor_auth"]),
    password_reset: Object.freeze(["prid"])
});

/**
 * Whether a collection has fields that must be withheld.
 *
 * @param {string} collection - collection name
 * @returns {boolean} true when the collection has redacted fields
 */
function hasRedactedFields(collection) {
    return Object.prototype.hasOwnProperty.call(REDACTED_FIELDS, collection);
}

/**
 * Remove a collection's redacted fields from a document, in place.
 *
 * @param {string} collection - collection the document came from
 * @param {object} doc - document to redact (mutated); a falsy doc is returned as is
 * @returns {object} the same document
 */
function redactFields(collection, doc) {
    if (!doc || !hasRedactedFields(collection)) {
        return doc;
    }
    var fields = REDACTED_FIELDS[collection];
    for (var i = 0; i < fields.length; i++) {
        delete doc[fields[i]];
    }
    return doc;
}

/**
 * Build a $project stage excluding a collection's redacted fields.
 *
 * The caller must splice this in as the very first stage, so no user-supplied stage
 * can read the raw values before they are removed.
 *
 * @param {string} collection - collection being aggregated
 * @returns {object|null} the stage, or null when the collection has none
 */
function redactionStage(collection) {
    if (!hasRedactedFields(collection)) {
        return null;
    }
    var fields = REDACTED_FIELDS[collection];
    var projection = {};
    for (var i = 0; i < fields.length; i++) {
        projection[fields[i]] = 0;
    }
    return { "$project": projection };
}

module.exports = {
    REDACTED_FIELDS,
    hasRedactedFields,
    redactFields,
    redactionStage
};
