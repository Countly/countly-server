/**
 * @module plugins/dbviewer/api/parts/aggregation_guard
 * @description Validates a DB Viewer aggregation pipeline against a role-specific
 * allow-list of MongoDB operators, and rejects pipelines that join or union into a
 * redacted (credential) collection.
 *
 * HOW THIS WORKS, AND WHY IT IS SHAPED THIS WAY
 *
 * The pipeline is walked blindly: every object and array, at every depth, with no
 * attempt to work out which arrays are sub-pipelines and which are ordinary
 * expression arrays. Only keys are examined, and only keys beginning with "$".
 * Any such key that is not on the allow-list rejects the whole request.
 *
 * Two properties make that both safe and complete:
 *
 *  - MongoDB will not let a "$"-prefixed key be anything other than an operator.
 *    A document may store a field named "$price", but it can only be read through
 *    $getField, where the name is a VALUE. {$match:{"$price":5}} is an error
 *    ("unknown top level operator"), as is projecting or sorting on it. So every
 *    "$"-prefixed key in a valid pipeline is an operator, and there is no
 *    legitimate query this rejects.
 *  - A stage only executes if its name appears as a literal key in the submitted
 *    pipeline. Computed values never become stages: an object built with $setField
 *    whose key is "$lookup" is data, and joins nothing. So checking literal keys
 *    catches everything that can run.
 *
 * KEYS ONLY, NEVER VALUES. {$literal:"$lookup"} is a legitimate expression
 * returning the string "$lookup", and "$fieldname" / "$$ROOT" are ordinary value
 * references. Inspecting values would reject valid queries.
 *
 * EXACT MATCH ONLY. $mergeObjects is legitimate and must not be caught by a prefix
 * or substring test for $merge.
 *
 * WHY AN ALLOW-LIST RATHER THAN A LIST OF DANGEROUS OPERATORS
 *
 * An omission here rejects a valid query, which is a support ticket. An omission
 * from a list of dangerous operators permits an exfiltration, which is a
 * vulnerability. Those costs are not equal, so this fails closed: an operator
 * introduced by a future MongoDB release is rejected until reviewed and added.
 *
 * The previous two versions of this guard both failed by trying to identify
 * sub-pipelines from their contents, which let one unrecognised sibling stage hide
 * a $lookup from the stage filter. Nothing here infers structure. If a future
 * change reintroduces inference, make it fail closed.
 *
 * MAINTENANCE. The lists below were verified against a live MongoDB 8.0 by probing
 * every entry; verify_operators.js in this directory is the means of re-verifying
 * them. Run it on a MongoDB upgrade: operators added by the new release will be
 * rejected until added here, and entries that no longer exist should be removed.
 * That probe found a real misspelling in the previous version of this file,
 * "$sharedDataDistribution" for "$shardedDataDistribution", so do not hand-edit
 * these lists without re-running it.
 *
 * DELIBERATELY ABSENT, and therefore rejected:
 *  - joins and unions for non-global users: $lookup, $graphLookup, $unionWith
 *    (they read a second collection, bypassing the per-collection access check)
 *  - writes: $out, $merge
 *  - server-side JavaScript: $function, $accumulator, $where
 *  - server, cluster and internal introspection: $currentOp, $collStats,
 *    $indexStats, $planCacheStats, $listSessions, $listLocalSessions,
 *    $listSampledQueries, $listSearchIndexes, $shardedDataDistribution,
 *    $changeStream, $changeStreamSplitLargeEvents, $mergeCursors, $documents,
 *    $listClusterCatalog, and every $_internal* stage
 */

'use strict';

// Pipeline stages a non-global user may run. Unchanged from the previous version of
// this guard, so this is not a widening of what anyone can do.
const STAGES_USER = [
    "$addFields", "$bucket", "$bucketAuto", "$count", "$densify", "$facet",
    "$fill", "$geoNear", "$group", "$limit", "$match", "$project",
    "$querySettings", "$redact", "$replaceRoot", "$replaceWith", "$sample",
    "$search", "$searchMeta", "$set", "$setWindowFields", "$skip", "$sort",
    "$sortByCount", "$unset", "$unwind", "$vectorSearch"
];

// Join and union stages, for global admins only. Still never into a protected
// collection: see findProtectedJoin below.
const STAGES_GLOBAL_ADMIN_ONLY = ["$lookup", "$graphLookup", "$unionWith"];

// Expression operators, accumulators and window operators. These live inside
// stages rather than being stages, and a blind walk meets them constantly, so they
// have to be listed or every real query is rejected.
const EXPRESSION_OPERATORS = [
    // arithmetic
    "$abs", "$add", "$ceil", "$divide", "$exp", "$floor", "$ln", "$log",
    "$log10", "$mod", "$multiply", "$pow", "$round", "$sqrt", "$subtract",
    "$trunc",
    // array
    "$arrayElemAt", "$arrayToObject", "$concatArrays", "$filter", "$first",
    "$firstN", "$in", "$indexOfArray", "$isArray", "$last", "$lastN", "$map",
    "$maxN", "$minN", "$objectToArray", "$range", "$reduce", "$reverseArray",
    "$size", "$slice", "$sortArray", "$zip",
    // boolean and comparison
    "$and", "$not", "$or", "$cmp", "$eq", "$gt", "$gte", "$lt", "$lte", "$ne",
    // conditional
    "$cond", "$ifNull", "$switch",
    // data size
    "$binarySize", "$bsonSize",
    // date
    "$dateAdd", "$dateDiff", "$dateFromParts", "$dateFromString",
    "$dateSubtract", "$dateToParts", "$dateToString", "$dateTrunc",
    "$dayOfMonth", "$dayOfWeek", "$dayOfYear", "$hour", "$isoDayOfWeek",
    "$isoWeek", "$isoWeekYear", "$millisecond", "$minute", "$month", "$second",
    "$week", "$year", "$tsIncrement", "$tsSecond",
    // literal, object, variable and misc
    "$literal", "$getField", "$rand", "$setField", "$unsetField",
    "$mergeObjects", "$let",
    // set
    "$allElementsTrue", "$anyElementTrue", "$setDifference", "$setEquals",
    "$setIntersection", "$setIsSubset", "$setUnion",
    // string
    "$concat", "$indexOfBytes", "$indexOfCP", "$ltrim", "$regexFind",
    "$regexFindAll", "$regexMatch", "$replaceOne", "$replaceAll", "$rtrim",
    "$split", "$strLenBytes", "$strLenCP", "$strcasecmp", "$substr",
    "$substrBytes", "$substrCP", "$toLower", "$trim", "$toUpper",
    // text score
    "$meta",
    // trigonometry
    "$sin", "$cos", "$tan", "$asin", "$acos", "$atan", "$atan2", "$asinh",
    "$acosh", "$atanh", "$sinh", "$cosh", "$tanh", "$degreesToRadians",
    "$radiansToDegrees",
    // type conversion
    "$convert", "$isNumber", "$toBool", "$toDate", "$toDecimal", "$toDouble",
    "$toInt", "$toLong", "$toObjectId", "$toString", "$type", "$toUUID",
    // accumulators, valid in $group and/or $setWindowFields
    "$addToSet", "$avg", "$bottom", "$bottomN", "$covariancePop",
    "$covarianceSamp", "$denseRank", "$derivative", "$documentNumber",
    "$expMovingAvg", "$integral", "$linearFill", "$locf", "$max", "$median",
    "$min", "$percentile", "$push", "$rank", "$shift", "$stdDevPop",
    "$stdDevSamp", "$sum", "$top", "$topN"
];

// Query operators, reachable through $match. $where is absent on purpose: it runs
// server-side JavaScript.
const QUERY_OPERATORS = [
    "$eq", "$gt", "$gte", "$in", "$lt", "$lte", "$ne", "$nin",
    "$and", "$not", "$nor", "$or",
    "$exists", "$type", "$expr", "$jsonSchema", "$mod", "$regex", "$options",
    "$text", "$geoIntersects", "$geoWithin", "$near", "$nearSphere",
    "$all", "$elemMatch", "$size",
    "$bitsAllClear", "$bitsAllSet", "$bitsAnyClear", "$bitsAnySet",
    "$comment"
];

/**
 * Build a lookup object from operator name lists.
 * @returns {object} map of operator name to true
 */
function toMap() {
    var map = {};
    for (var i = 0; i < arguments.length; i++) {
        var list = arguments[i];
        for (var j = 0; j < list.length; j++) {
            map[list[j]] = true;
        }
    }
    return map;
}

const ALLOWED_OPERATORS_USER = toMap(STAGES_USER, EXPRESSION_OPERATORS, QUERY_OPERATORS);
const ALLOWED_OPERATORS_GLOBAL_ADMIN = toMap(STAGES_USER, STAGES_GLOBAL_ADMIN_ONLY, EXPRESSION_OPERATORS, QUERY_OPERATORS);

// Collections whose contents DB Viewer redacts. A join or union into them would
// return the raw documents, because the redaction only applies to the top-level
// source collection, so those are rejected for everyone including global admins.
const PROTECTED_JOIN_COLLECTIONS = {
    "members": true,
    "auth_tokens": true
};

/**
 * Extract the collection name from a join "from"/"coll" reference, which may be a
 * plain string ("members") or the cross-database object form ({ db, coll }).
 * @param {*} from - a $lookup.from / $graphLookup.from / $unionWith.coll value
 * @returns {string[]} the referenced collection name(s)
 */
function collectionOf(from) {
    if (typeof from === "string") {
        return [from];
    }
    if (from && typeof from === "object" && typeof from.coll === "string") {
        return [from.coll];
    }
    return [];
}

/**
 * Collection names a single stage joins or unions from.
 * @param {object} stage - one aggregation stage
 * @returns {string[]} target collection names referenced by join/union operators
 */
function joinTargetsOf(stage) {
    var targets = [];
    if (!stage || typeof stage !== "object") {
        return targets;
    }
    if (stage.$lookup && typeof stage.$lookup === "object") {
        targets = targets.concat(collectionOf(stage.$lookup.from));
    }
    if (stage.$graphLookup && typeof stage.$graphLookup === "object") {
        targets = targets.concat(collectionOf(stage.$graphLookup.from));
    }
    if (stage.$unionWith) {
        if (typeof stage.$unionWith === "string") {
            targets.push(stage.$unionWith);
        }
        else if (typeof stage.$unionWith === "object") {
            targets = targets.concat(collectionOf(stage.$unionWith.coll));
        }
    }
    return targets;
}

/**
 * Deep-scan for a join or union into a protected collection, at any depth. This one
 * inspects VALUES (the "from"/"coll" names) rather than keys, so it stays a
 * separate pass from the operator check.
 * @param {*} node - pipeline / stage / expression node (not mutated)
 * @returns {object|null} { name } of the protected collection, or null
 */
function findProtectedJoin(node) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findProtectedJoin(node[i]);
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
                return { name: targets[t] };
            }
        }
        for (var key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) {
                continue;
            }
            var inVal = findProtectedJoin(node[key]);
            if (inVal) {
                return inVal;
            }
        }
    }
    return null;
}

/**
 * Deep-scan for a "$"-prefixed KEY that is not on the allow-list.
 *
 * Blind traversal: no assumption about which arrays are sub-pipelines. Keys only,
 * never values. Exact match, so $mergeObjects is not confused with $merge.
 *
 * @param {*} node - pipeline / stage / expression node (not mutated)
 * @param {object} allowedOperators - allow-list for the caller's role
 * @param {string} path - position of the current node, for the error message
 * @returns {object|null} { name, where } of the first offending key, or null
 */
function findDisallowedOperator(node, allowedOperators, path) {
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var inArr = findDisallowedOperator(node[i], allowedOperators, path + "[" + i + "]");
            if (inArr) {
                return inArr;
            }
        }
        return null;
    }
    if (node && typeof node === "object") {
        for (var key in node) {
            if (!Object.prototype.hasOwnProperty.call(node, key)) {
                continue;
            }
            // require an explicit `true` so inherited Object.prototype keys
            // (constructor, __proto__, ...) are never treated as allow-listed
            if (key.charAt(0) === "$" && allowedOperators[key] !== true) {
                return { name: key, where: path + "." + key };
            }
            var inVal = findDisallowedOperator(node[key], allowedOperators, path + "." + key);
            if (inVal) {
                return inVal;
            }
        }
    }
    return null;
}

/**
 * Validate an aggregation pipeline. The pipeline is never modified: one that uses
 * something it may not use is rejected, so the caller either runs exactly what was
 * asked for or gets an error explaining why not.
 *
 * @param {Array} pipeline - parsed aggregation pipeline (not mutated)
 * @param {object} allowedOperators - ALLOWED_OPERATORS_USER or _GLOBAL_ADMIN
 * @returns {{changes: object, error: ({type: string, name: string, where: string}|null)}}
 *          When error is set the caller must reject the request. changes is always
 *          empty and is kept only so the response shape does not change.
 */
function sanitizeAggregation(pipeline, allowedOperators) {
    var join = findProtectedJoin(pipeline);
    if (join) {
        return { changes: {}, error: { type: "join", name: join.name } };
    }
    var operator = findDisallowedOperator(pipeline, allowedOperators, "pipeline");
    if (operator) {
        return { changes: {}, error: { type: "operator", name: operator.name, where: operator.where } };
    }
    // Top-level elements are stages by position, so each must actually name one.
    // This is not structural inference: it only says that a stage object carries a
    // stage operator. It catches an element whose only keys are ordinary names
    // ("constructor", "__proto__", a stray field) with a clear message, rather than
    // handing it to MongoDB to reject.
    if (Array.isArray(pipeline)) {
        for (var i = 0; i < pipeline.length; i++) {
            var stage = pipeline[i];
            if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
                return { changes: {}, error: { type: "stage", name: String(stage), where: "pipeline[" + i + "]" } };
            }
            var named = false;
            for (var key in stage) {
                if (Object.prototype.hasOwnProperty.call(stage, key) && key.charAt(0) === "$") {
                    named = true;
                    break;
                }
            }
            if (!named) {
                return { changes: {}, error: { type: "stage", name: Object.keys(stage).join(","), where: "pipeline[" + i + "]" } };
            }
        }
    }
    return { changes: {}, error: null };
}

module.exports = {
    ALLOWED_OPERATORS_USER,
    ALLOWED_OPERATORS_GLOBAL_ADMIN,
    PROTECTED_JOIN_COLLECTIONS,
    sanitizeAggregation
};
