/**
 * @module plugins/dbviewer/api/parts/query_guard
 * @description Helpers that harden the user-supplied parts of a DB Viewer
 * find() query (projection and the _id search term).
 */

'use strict';

const common = require('../../../../api/utils/common.js');

/**
 * Restrict a find() projection to plain field inclusion / exclusion.
 *
 * A projection value is only allowed to be 0, 1 or a boolean (strict
 * include/exclude). Any other value is dropped:
 *  - expressions and field-path aliases — e.g. { leak: "$password" } or
 *    { x: { $function: ... } } — would compute new fields from, or rename,
 *    fields the viewer otherwise removes from the response (MongoDB 4.4+ find()
 *    projections accept expressions);
 *  - other numbers (2, NaN, …) are not valid include/exclude values and can
 *    make the query throw.
 * Keeping projections to strict include/exclude removes that whole avenue.
 *
 * @param {object} projection - parsed projection object (mutated in place)
 * @returns {object} changes - keys are the projection fields that were dropped
 */
function sanitizeProjection(projection) {
    //one implementation, in common, shared with the export paths
    return common.sanitizeProjection(projection);
}

/**
 * Escape a string for safe use as a literal inside a RegExp, so a user-supplied
 * search term cannot introduce a pathological pattern (catastrophic
 * backtracking / ReDoS).
 *
 * @param {string} str - raw search term
 * @returns {string} the term with all RegExp metacharacters escaped
 */
function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    sanitizeProjection,
    escapeRegExp
};
