/**
 * @module plugins/dbviewer/api/parts/aggregation_guard
 * @description Validates a DB Viewer aggregation pipeline against a role-specific
 * allow-list of stages, and rejects pipelines that use server-side-JavaScript
 * operators or join/union into a redacted (credential) collection.
 *
 * One routine, two lists:
 *  - non-global users get ALLOWED_STAGES_USER (no joins, no writes);
 *  - global admins get ALLOWED_STAGES_GLOBAL_ADMIN (the same plus join/union
 *    stages).
 * Anything not in the applicable list is stripped from the pipeline at every
 * depth. Two hard rules apply to everyone, at any depth, and reject the request:
 *  - no $function / $accumulator / $where (server-side JavaScript);
 *  - no join/union into members / auth_tokens (their field redaction only
 *    applies to the top-level source collection, so a join would return raw
 *    credentials — denied even for global admins).
 */

'use strict';

// Stages a non-global user may run. No joins/unions (they read a second
// collection, bypassing the per-collection access check) and no writes.
const ALLOWED_STAGES_USER = {
    "$addFields": true,
    "$bucket": true,
    "$bucketAuto": true,
    "$count": true,
    "$densify": true,
    "$facet": true,
    "$fill": true,
    "$geoNear": true,
    "$group": true,
    "$limit": true,
    "$match": true,
    "$project": true,
    "$querySettings": true,
    "$redact": true,
    "$replaceRoot": true,
    "$replaceWith": true,
    "$sample": true,
    "$search": true,
    "$searchMeta": true,
    "$set": true,
    "$setWindowFields": true,
    "$skip": true,
    "$sort": true,
    "$sortByCount": true,
    "$unset": true,
    "$unwind": true,
    "$vectorSearch": true //atlas specific
};

// Global admins may additionally use the join/union stages. Still no write
// stages, and still never into a protected collection (see findHardViolation).
const ALLOWED_STAGES_GLOBAL_ADMIN = Object.assign({}, ALLOWED_STAGES_USER, {
    "$lookup": true,
    "$graphLookup": true,
    "$unionWith": true
});

// Expression operators that run server-side JavaScript. Never allowed for
// anyone, at any depth — they live inside otherwise-allowed stages.
const DENIED_OPERATORS = {
    "$function": true,
    "$accumulator": true,
    "$where": true
};

// Collections whose contents DB Viewer redacts. A join/union into them would
// return the raw documents (redaction only applies to the top-level source),
// so such joins are rejected for everyone — including global admins.
const PROTECTED_JOIN_COLLECTIONS = {
    "members": true,
    "auth_tokens": true
};

// All recognized aggregation STAGE operators (any role's allow-list plus the
// known blocked stages), used to recognize a nested array as a sub-pipeline
// (array of stage objects) and tell it apart from an ordinary expression array.
const KNOWN_STAGE_OPERATORS = Object.assign({
    "$out": true,
    "$merge": true,
    "$documents": true,
    "$collStats": true,
    "$indexStats": true,
    "$currentOp": true,
    "$listSessions": true,
    "$listLocalSessions": true,
    "$listSampledQueries": true,
    "$listSearchIndexes": true,
    "$planCacheStats": true,
    "$changeStream": true,
    "$changeStreamSplitLargeEvents": true,
    "$mergeCursors": true,
    "$sharedDataDistribution": true
}, ALLOWED_STAGES_GLOBAL_ADMIN);

/**
 * Collection names a single stage joins / unions from.
 * @param {object} stage - one aggregation stage
 * @returns {string[]} target collection names referenced by join/union operators
 */
function joinTargetsOf(stage) {
    var targets = [];
    if (!stage || typeof stage !== "object") {
        return targets;
    }
    if (stage.$lookup && typeof stage.$lookup === "object" && typeof stage.$lookup.from === "string") {
        targets.push(stage.$lookup.from);
    }
    if (stage.$graphLookup && typeof stage.$graphLookup === "object" && typeof stage.$graphLookup.from === "string") {
        targets.push(stage.$graphLookup.from);
    }
    if (stage.$unionWith) {
        if (typeof stage.$unionWith === "string") {
            targets.push(stage.$unionWith);
        }
        else if (typeof stage.$unionWith === "object" && typeof stage.$unionWith.coll === "string") {
            targets.push(stage.$unionWith.coll);
        }
    }
    return targets;
}

/**
 * Does this array look like an aggregation sub-pipeline — a non-empty array
 * whose every element is a stage object (an object carrying a recognized stage
 * operator key)? Expression arrays (e.g. $concat operands) do not match.
 * @param {*} arr - candidate value
 * @returns {boolean} true if it is a sub-pipeline
 */
function isSubPipeline(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
        return false;
    }
    for (var i = 0; i < arr.length; i++) {
        var el = arr[i];
        if (!el || typeof el !== "object" || Array.isArray(el)) {
            return false;
        }
        var isStage = false;
        for (var k in el) {
            if (Object.prototype.hasOwnProperty.call(el, k) && KNOWN_STAGE_OPERATORS[k] === true) {
                isStage = true;
                break;
            }
        }
        if (!isStage) {
            return false;
        }
    }
    return true;
}

/**
 * Deep-walk a node for a hard-rule violation that must reject the whole request,
 * regardless of role: a server-side-JS operator, or a join/union into a
 * protected (redacted) collection. Detection-only (no mutation), so a blanket
 * deep walk is safe and stays correct for any (incl. future) nested shape.
 * @param {*} node - pipeline / stage / expression node
 * @returns {{type: string, name: string}|null} the violation, or null
 */
function findHardViolation(node) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findHardViolation(node[i]);
            if (inArr) {
                return inArr;
            }
        }
        return null;
    }
    if (node && typeof node === "object") {
        var targets = joinTargetsOf(node);
        for (var t = 0; t < targets.length; t++) {
            if (PROTECTED_JOIN_COLLECTIONS[targets[t]] === true) {
                return { type: "join", name: targets[t] };
            }
        }
        for (var key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) {
                continue;
            }
            if (DENIED_OPERATORS[key] === true) {
                return { type: "operator", name: key };
            }
            var inVal = findHardViolation(node[key]);
            if (inVal) {
                return inVal;
            }
        }
    }
    return null;
}

/**
 * Walk a kept stage's value and strip disallowed stages from any sub-pipeline
 * nested anywhere within it (structural — $facet branches, a .pipeline field,
 * or any other nested-pipeline shape). A sub-pipeline emptied by stripping is
 * removed from its parent object (Mongo rejects an empty $facet branch).
 * @param {*} value - the stage value (or any nested node)
 * @param {object} allowedStages - the role's allow-list
 * @param {object} changes - accumulator: keys are removed stage names
 * @returns {void}
 */
function stripNested(value, allowedStages, changes) {
    if (Array.isArray(value)) {
        if (isSubPipeline(value)) {
            stripStages(value, allowedStages, changes);
        }
        else {
            for (var i = 0; i < value.length; i++) {
                stripNested(value[i], allowedStages, changes);
            }
        }
        return;
    }
    if (value && typeof value === "object") {
        for (var k in value) {
            if (!Object.prototype.hasOwnProperty.call(value, k)) {
                continue;
            }
            var child = value[k];
            if (Array.isArray(child) && isSubPipeline(child)) {
                stripStages(child, allowedStages, changes);
                if (child.length === 0) {
                    delete value[k];
                }
            }
            else {
                stripNested(child, allowedStages, changes);
            }
        }
    }
}

/**
 * Recursively remove stages not in `allowedStages` from a pipeline, at every
 * depth. Mutates the pipeline in place.
 * @param {Array} pipeline - aggregation pipeline
 * @param {object} allowedStages - the role's allow-list (values must be === true)
 * @param {object} changes - accumulator: keys are removed stage names
 * @returns {void}
 */
function stripStages(pipeline, allowedStages, changes) {
    if (!Array.isArray(pipeline)) {
        return;
    }
    for (var z = 0; z < pipeline.length; z++) {
        var stage = pipeline[z];
        if (!stage || typeof stage !== "object") {
            continue;
        }
        for (var key in stage) {
            if (!Object.prototype.hasOwnProperty.call(stage, key)) {
                continue;
            }
            // require an explicit `true` so inherited Object.prototype keys
            // (constructor, __proto__, …) are never treated as allow-listed
            if (allowedStages[key] !== true) {
                changes[key] = true;
                delete stage[key];
            }
            else {
                stripNested(stage[key], allowedStages, changes);
                var v = stage[key];
                if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) {
                    delete stage[key];
                }
            }
        }
        if (Object.keys(stage).length === 0) {
            pipeline.splice(z, 1);
            z--;
        }
    }
}

/**
 * Validate and sanitize an aggregation pipeline for a given role's allow-list.
 * Rejects (without mutating) when a hard rule is violated; otherwise strips any
 * stage not in the allow-list and returns what was removed.
 * @param {Array} pipeline - aggregation pipeline (mutated in place when valid)
 * @param {object} allowedStages - ALLOWED_STAGES_USER or ALLOWED_STAGES_GLOBAL_ADMIN
 * @returns {{changes: object, error: ({type: string, name: string}|null)}}
 *          When error is set the caller must reject the request and not run the
 *          pipeline. Otherwise changes lists the removed stage names.
 */
function sanitizeAggregation(pipeline, allowedStages) {
    var violation = findHardViolation(pipeline);
    if (violation) {
        return { changes: {}, error: violation };
    }
    var changes = {};
    stripStages(pipeline, allowedStages, changes);
    return { changes: changes, error: null };
}

module.exports = {
    ALLOWED_STAGES_USER,
    ALLOWED_STAGES_GLOBAL_ADMIN,
    DENIED_OPERATORS,
    PROTECTED_JOIN_COLLECTIONS,
    sanitizeAggregation
};
