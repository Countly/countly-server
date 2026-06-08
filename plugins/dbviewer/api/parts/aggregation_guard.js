/**
 * @module plugins/dbviewer/api/parts/aggregation_guard
 * @description Whitelist of MongoDB aggregation stages the DB Viewer permits for
 * non-global users, plus a sanitizer that strips any non-whitelisted stage at
 * EVERY depth.
 *
 * Stages such as $lookup, $graphLookup, $unionWith, $out and $merge are not
 * whitelisted because they read from / write to a second collection and would
 * bypass the per-collection access check (and the top-level-only members /
 * auth_tokens redaction). $facet IS whitelisted, but it carries sub-pipelines;
 * if those sub-pipelines are not inspected, a blocked stage (e.g. $lookup) can
 * be smuggled in nested under $facet. The sanitizer therefore recurses into
 * $facet sub-pipelines so the boundary holds at any depth.
 */

'use strict';

const whiteListedAggregationStages = {
    "$addFields": true,
    "$bucket": true,
    "$bucketAuto": true,
    //"$changeStream": false,
    //"$changeStreamSplitLargeEvents": false,
    //"$collStats": false,
    "$count": true,
    //"$currentOp": false,
    "$densify": true,
    //"$documents": false
    "$facet": true,
    "$fill": true,
    "$geoNear": true,
    // "$graphLookup": false — removed: lets attacker pull joined documents from any collection in the same DB,
    //                        bypassing the per-collection access check. Use $lookup instead if cross-collection
    //                        joins are ever needed (currently also disallowed).
    "$group": true,
    //"$indexStats": false,
    "$limit": true,
    //"$listLocalSessions": false
    //"$listSampledQueries": false
    //"$listSearchIndexes": false
    //"$listSessions": false
    //"$lookup": false
    "$match": true,
    //"$merge": false
    //"$mergeCursors": false
    //"$out": false
    //"$planCacheStats": false,
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
    //"$sharedDataDistribution": false,
    "$skip": true,
    "$sort": true,
    "$sortByCount": true,
    //"$unionWith": false,
    "$unset": true,
    "$unwind": true,
    "$vectorSearch": true //atlas specific
};

/**
 * Sanitize every sub-pipeline a KEPT (whitelisted) stage carries, so a blocked
 * stage cannot hide nested inside an allowed pipeline-bearing stage. This is
 * driven by structure, not by a hard-coded stage name, so it keeps holding if
 * the allow-list ever gains another pipeline-bearing stage:
 *  - $facet exposes its sub-pipelines as the values of an object
 *    ({ <name>: [ ...stages ], ... }); each value is sanitized, and a value
 *    emptied by sanitization is dropped (Mongo rejects an empty $facet
 *    sub-pipeline). Today $facet is the only allow-listed such stage.
 *  - any stage that exposes a `.pipeline` array (e.g. $lookup / $unionWith, were
 *    they ever allow-listed) has that pipeline sanitized.
 * @param {string} key - the stage operator (e.g. "$facet")
 * @param {*} value - the stage's value
 * @param {object} changes - accumulator: keys are removed stage names
 * @returns {boolean} true if `value` ended up empty and the stage should be dropped
 */
function sanitizeNestedPipelines(key, value, changes) {
    if (!value || typeof value !== "object") {
        return false;
    }
    if (key === "$facet") {
        for (var facetName in value) {
            if (Array.isArray(value[facetName])) {
                sanitizePipeline(value[facetName], changes);
                if (value[facetName].length === 0) {
                    delete value[facetName];
                }
            }
        }
        return Object.keys(value).length === 0;
    }
    if (Array.isArray(value.pipeline)) {
        sanitizePipeline(value.pipeline, changes);
    }
    return false;
}

/**
 * Recursively remove non-whitelisted stages from an aggregation pipeline,
 * descending into the sub-pipelines of any kept pipeline-bearing stage. The
 * pipeline is mutated in place.
 * @param {Array} pipeline - aggregation pipeline (array of stage objects)
 * @param {object} changes - accumulator: keys are removed stage names
 * @returns {object} the changes accumulator
 */
function sanitizePipeline(pipeline, changes) {
    if (!Array.isArray(pipeline)) {
        return changes;
    }
    for (var z = 0; z < pipeline.length; z++) {
        var stage = pipeline[z];
        if (!stage || typeof stage !== "object") {
            continue;
        }
        for (var key in stage) {
            // require an explicit `true` so inherited Object.prototype keys
            // (constructor, __proto__, …) are never treated as allow-listed
            if (whiteListedAggregationStages[key] !== true) {
                changes[key] = true;
                delete stage[key];
            }
            else if (sanitizeNestedPipelines(key, stage[key], changes)) {
                // the kept stage's nested content was fully emptied by
                // sanitization — drop the now-meaningless stage operator.
                delete stage[key];
            }
        }
        if (Object.keys(stage).length === 0) {
            pipeline.splice(z, 1);
            z--;
        }
    }
    return changes;
}

/**
 * Remove all not-allowed aggregation stages from the pipeline, at every depth.
 * @param {Array} aggregation - current aggregation pipeline (mutated in place)
 * @returns {object} changes - object whose keys are the removed stage names
 */
function escapeNotAllowedAggregationStages(aggregation) {
    return sanitizePipeline(aggregation, {});
}

/**
 * Collections whose contents are redacted by DB Viewer (credentials / tokens)
 * and which therefore must never be reachable through a join. The redaction is
 * only applied when these are the top-level source collection, so a join into
 * them (e.g. $lookup { from: "members" }) would return the raw, un-redacted
 * documents — including api_key / password / token values. This must hold even
 * for global admins, who are intentionally denied raw credentials through DB
 * Viewer (the top-level redaction applies to them too).
 */
const PROTECTED_JOIN_COLLECTIONS = {
    "members": true,
    "auth_tokens": true
};

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
 * Recursively scan a pipeline for a join/union into a protected (redacted)
 * collection, at every depth (including $facet sub-pipelines and nested
 * .pipeline arrays). Used to block such joins regardless of the caller's role,
 * since the per-collection redaction cannot follow data pulled in via a join.
 * @param {Array} pipeline - aggregation pipeline (not mutated)
 * @returns {string|null} the protected collection name if one is joined, else null
 */
function findProtectedCollectionJoin(pipeline) {
    if (!Array.isArray(pipeline)) {
        return null;
    }
    for (var i = 0; i < pipeline.length; i++) {
        var stage = pipeline[i];
        if (!stage || typeof stage !== "object") {
            continue;
        }
        var targets = joinTargetsOf(stage);
        for (var t = 0; t < targets.length; t++) {
            if (PROTECTED_JOIN_COLLECTIONS[targets[t]] === true) {
                return targets[t];
            }
        }
        for (var key in stage) {
            var val = stage[key];
            if (key === "$facet" && val && typeof val === "object") {
                for (var facetName in val) {
                    var found = findProtectedCollectionJoin(val[facetName]);
                    if (found) {
                        return found;
                    }
                }
            }
            else if (val && typeof val === "object" && Array.isArray(val.pipeline)) {
                var nested = findProtectedCollectionJoin(val.pipeline);
                if (nested) {
                    return nested;
                }
            }
        }
    }
    return null;
}

/**
 * Aggregation stages that WRITE to a collection. DB Viewer is a read-only tool,
 * so these must never run — including on the global-admin path, which otherwise
 * skips the stage allow-list.
 */
const WRITE_STAGES = {
    "$out": true,
    "$merge": true
};

/**
 * Recursively scan a pipeline for a write stage ($out / $merge) at any depth.
 * @param {Array} pipeline - aggregation pipeline (not mutated)
 * @returns {string|null} the write stage name if present, else null
 */
function findWriteStage(pipeline) {
    if (!Array.isArray(pipeline)) {
        return null;
    }
    for (var i = 0; i < pipeline.length; i++) {
        var stage = pipeline[i];
        if (!stage || typeof stage !== "object") {
            continue;
        }
        for (var key in stage) {
            if (WRITE_STAGES[key] === true) {
                return key;
            }
            var val = stage[key];
            if (key === "$facet" && val && typeof val === "object") {
                for (var facetName in val) {
                    var found = findWriteStage(val[facetName]);
                    if (found) {
                        return found;
                    }
                }
            }
            else if (val && typeof val === "object" && Array.isArray(val.pipeline)) {
                var nested = findWriteStage(val.pipeline);
                if (nested) {
                    return nested;
                }
            }
        }
    }
    return null;
}

module.exports = {
    whiteListedAggregationStages,
    PROTECTED_JOIN_COLLECTIONS,
    WRITE_STAGES,
    escapeNotAllowedAggregationStages,
    findProtectedCollectionJoin,
    findWriteStage
};
