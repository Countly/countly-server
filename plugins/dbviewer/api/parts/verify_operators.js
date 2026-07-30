/**
 * Verifies the operator allow-lists in aggregation_guard.js against a running
 * MongoDB, so they are not maintained by hand and by hope.
 *
 * WHY THIS EXISTS
 * The guard rejects any "$"-prefixed key it does not recognise. That fails safe,
 * but it means a missing entry rejects a valid query, and a misspelled entry is
 * both useless and invisible. The previous version of the guard carried
 * "$sharedDataDistribution" where MongoDB spells it "$shardedDataDistribution";
 * this script is what found that.
 *
 * RUN IT on a MongoDB upgrade, and whenever the lists are edited:
 *
 *     mongosh "<connection string>" --quiet --file verify_operators.js
 *
 * It reports entries MongoDB does not recognise (remove or fix those) and
 * confirms the deliberately excluded operators still exist (so the exclusions are
 * still meaningful). It does not and cannot report operators a new MongoDB release
 * has ADDED: those surface as a rejected query, which is the safe direction, and
 * are added here after review.
 *
 * HOW THE PROBE WORKS
 * Every probe is bounded with maxTimeMS and never iterates a cursor. Both matter:
 * $changeStream opens a tailable cursor, so iterating it blocks forever. An
 * unrecognised name is identified by MongoDB's own error code rather than by
 * message text - Location40324 for a stage, Location31325 for an expression,
 * code 15952 for a $group accumulator - because the wording differs between
 * "Unrecognized pipeline stage name" and "Unknown expression" and is not stable.
 *
 * Each category has a control: a name that must be reported fake and one that must
 * be reported real. If a control fails, the discriminator is wrong and the run's
 * output means nothing.
 */

/* eslint-disable no-undef, no-console */
'use strict';

var probeDb = db.getSiblingDB("dbviewer_operator_probe");
probeDb.probe.insertOne({ a: 1, arr: [1, 2], s: "x" });

/**
 * Run a pipeline, bounded, without iterating a cursor.
 * @param {Array} pipeline - pipeline to attempt
 * @returns {object} { ok, code }
 */
function attempt(pipeline) {
    try {
        var res = probeDb.runCommand({ aggregate: "probe", pipeline: pipeline, cursor: {}, maxTimeMS: 400 });
        return { ok: res.ok === 1, code: res.code };
    }
    catch (e) {
        return { ok: false, code: e.code };
    }
}

/**
 * Whether MongoDB recognises a pipeline stage name.
 * @param {string} op - operator name
 * @returns {boolean} true when recognised
 */
function stageExists(op) {
    var stage = {};
    stage[op] = {};
    var r = attempt([stage]);
    return r.ok || r.code !== 40324;
}

/**
 * Whether MongoDB recognises an expression operator, in $project or as a $group
 * accumulator (several are only valid in one position).
 * @param {string} op - operator name
 * @returns {boolean} true when recognised
 */
function expressionExists(op) {
    var inner = {};
    inner[op] = [];
    var r = attempt([{ $project: { x: inner } }]);
    if (r.ok || r.code !== 31325) {
        return true;
    }
    var acc = {};
    acc[op] = "$a";
    var g = attempt([{ $group: { _id: null, v: acc } }]);
    return g.ok || g.code !== 15952;
}

/**
 * Whether MongoDB recognises a query operator.
 * @param {string} op - operator name
 * @returns {boolean} true when recognised
 */
function queryExists(op) {
    var candidates = [{ f: {} }, {}];
    candidates[0].f[op] = 1;
    candidates[1][op] = 1;
    for (var i = 0; i < candidates.length; i++) {
        try {
            probeDb.runCommand({ find: "probe", filter: candidates[i], limit: 1, maxTimeMS: 400 });
            return true;
        }
        catch (e) {
            if (!/unknown operator|unknown top level operator/i.test(e.message)) {
                return true;
            }
        }
    }
    return false;
}

var guard = { ALLOWED_OPERATORS_USER: {}, ALLOWED_OPERATORS_GLOBAL_ADMIN: {} };
try {
    guard = require("./aggregation_guard.js");
}
catch (e) {
    print("Could not require aggregation_guard.js (" + e.message + ").");
    print("Run this from plugins/dbviewer/api/parts, or paste the lists in manually.");
}

var allowed = Object.keys(guard.ALLOWED_OPERATORS_GLOBAL_ADMIN || {});

// Operators the guard deliberately omits. Confirming these still exist keeps the
// exclusions meaningful: an exclusion of something MongoDB no longer has is dead
// weight, and one that was never real (a typo) is a hole.
var EXCLUDED = [
    "$out", "$merge", "$function", "$accumulator", "$where",
    "$currentOp", "$collStats", "$indexStats", "$planCacheStats",
    "$listSessions", "$listLocalSessions", "$listSampledQueries",
    "$listSearchIndexes", "$shardedDataDistribution", "$mergeCursors",
    "$documents", "$listClusterCatalog"
];

/**
 * Whether MongoDB recognises a name in any position.
 * @param {string} op - operator name
 * @returns {boolean} true when recognised anywhere
 */
function existsAnywhere(op) {
    return stageExists(op) || expressionExists(op) || queryExists(op);
}

var controlsOk =
    !existsAnywhere("$notARealOperatorAtAll")
    && stageExists("$match")
    && expressionExists("$add")
    && queryExists("$gt");

print("controls " + (controlsOk ? "passed" : "FAILED - the results below are meaningless"));

var unrecognised = allowed.filter(function(op) {
    return !existsAnywhere(op);
});
print("allow-listed operators checked: " + allowed.length);
print("NOT recognised by this MongoDB (fix or remove): " + (unrecognised.length ? unrecognised.join(" ") : "(none)"));

var goneExclusions = EXCLUDED.filter(function(op) {
    return !existsAnywhere(op);
});
print("excluded operators checked: " + EXCLUDED.length);
print("excluded but NOT recognised (typo, or gone from this version): " + (goneExclusions.length ? goneExclusions.join(" ") : "(none)"));

var wronglyAllowed = EXCLUDED.filter(function(op) {
    return (guard.ALLOWED_OPERATORS_GLOBAL_ADMIN || {})[op] === true;
});
print("excluded operators present in the allow-list (must be none): " + (wronglyAllowed.length ? wronglyAllowed.join(" ") : "(none)"));

probeDb.dropDatabase();
