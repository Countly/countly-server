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
 * Recognized aggregation STAGE operators (allow-listed plus the known blocked
 * ones). Used to tell a nested aggregation sub-pipeline (an array of stage
 * objects) apart from an ordinary expression array, so the sanitizer can
 * descend into sub-pipelines wherever they appear — $facet's branch arrays, a
 * stage's `.pipeline`, or any future nested-pipeline shape — without a
 * hard-coded stage name and without mistaking an expression array for a
 * pipeline.
 */
const KNOWN_STAGE_OPERATORS = Object.assign({
    "$lookup": true,
    "$graphLookup": true,
    "$unionWith": true,
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
}, whiteListedAggregationStages);

/**
 * Does this array look like an aggregation sub-pipeline — i.e. a non-empty
 * array whose every element is a stage object (an object carrying a recognized
 * stage operator key)? Expression arrays (e.g. $concat's operands) do not match.
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
 * Walk a kept (allow-listed) stage's value and sanitize every nested
 * sub-pipeline found anywhere within it — not just $facet branches or a
 * `.pipeline` field — so a blocked stage cannot hide inside any (including
 * future) nested-pipeline shape. A sub-pipeline that becomes empty after
 * sanitization is removed from its parent object (Mongo rejects an empty $facet
 * branch).
 * @param {*} value - the stage value (or any nested node) to scan
 * @param {object} changes - accumulator: keys are removed stage names
 * @returns {void}
 */
function sanitizeNestedPipelines(value, changes) {
    if (Array.isArray(value)) {
        if (isSubPipeline(value)) {
            sanitizePipeline(value, changes);
        }
        else {
            for (var i = 0; i < value.length; i++) {
                sanitizeNestedPipelines(value[i], changes);
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
                sanitizePipeline(child, changes);
                if (child.length === 0) {
                    delete value[k];
                }
            }
            else {
                sanitizeNestedPipelines(child, changes);
            }
        }
    }
}

/**
 * Recursively remove non-whitelisted stages from an aggregation pipeline,
 * descending into the sub-pipelines of any kept stage at every depth. The
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
            else {
                // kept stage — sanitize any sub-pipeline nested anywhere in its
                // value (structural, not keyed on a specific stage name)
                sanitizeNestedPipelines(stage[key], changes);
                // drop the stage if sanitization emptied its content (e.g. a
                // $facet whose every branch was removed — Mongo rejects that)
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
 * Deep-scan an aggregation pipeline node (object/array, at every depth) for a
 * join/union into a protected (redacted) collection. Used to block such joins
 * regardless of the caller's role, since the per-collection redaction cannot
 * follow data pulled in via a join.
 *
 * This walks ALL nested structures rather than only known sub-pipeline
 * locations ($facet / .pipeline), so a join smuggled inside any future stage
 * shape is still detected. Detection-only (no mutation), so a blanket deep walk
 * is safe here — unlike the stage sanitizer, which must stay targeted to avoid
 * mangling expressions.
 * @param {*} node - pipeline / stage / expression node (not mutated)
 * @returns {string|null} the protected collection name if one is joined, else null
 */
function findProtectedCollectionJoin(node) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findProtectedCollectionJoin(node[i]);
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
                return targets[t];
            }
        }
        for (var key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                var inVal = findProtectedCollectionJoin(node[key]);
                if (inVal) {
                    return inVal;
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
 * Deep-scan an aggregation pipeline node (object/array, at every depth) for a
 * write stage ($out / $merge). Detection-only, so a blanket deep walk is safe
 * and stays correct for any (incl. future) nested stage shape.
 * @param {*} node - pipeline / stage / expression node (not mutated)
 * @returns {string|null} the write stage name if present, else null
 */
function findWriteStage(node) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findWriteStage(node[i]);
            if (inArr) {
                return inArr;
            }
        }
        return null;
    }
    if (node && typeof node === "object") {
        for (var key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                if (WRITE_STAGES[key] === true) {
                    return key;
                }
                var inVal = findWriteStage(node[key]);
                if (inVal) {
                    return inVal;
                }
            }
        }
    }
    return null;
}

/**
 * Aggregation EXPRESSION operators that execute server-side JavaScript. These
 * are not stages, so the stage allow-list does not catch them — they live
 * inside otherwise-allowed stages ($project / $group / $addFields / $match …).
 * They must never run via DB Viewer (the find() path already strips the
 * equivalent operators from filter/sort).
 */
const SERVER_SIDE_JS_OPERATORS = {
    "$function": true,
    "$accumulator": true,
    "$where": true
};

/**
 * Deep-scan an aggregation pipeline (objects and arrays, at every depth,
 * including expression values) for a server-side-JavaScript operator.
 * @param {*} node - pipeline / stage / expression node
 * @returns {string|null} the operator name if present, else null
 */
function findServerSideJs(node) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findServerSideJs(node[i]);
            if (inArr) {
                return inArr;
            }
        }
        return null;
    }
    if (node && typeof node === "object") {
        for (var key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                if (SERVER_SIDE_JS_OPERATORS[key] === true) {
                    return key;
                }
                var inVal = findServerSideJs(node[key]);
                if (inVal) {
                    return inVal;
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
    SERVER_SIDE_JS_OPERATORS,
    escapeNotAllowedAggregationStages,
    findProtectedCollectionJoin,
    findWriteStage,
    findServerSideJs
};
