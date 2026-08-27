/**
 * @module plugins/dbviewer/api/parts/query_guard
 * @description Helpers that harden the user-supplied parts of a DB Viewer
 * find() query (projection and the _id search term).
 */

'use strict';


/**
 * Check that a find() projection is plain field inclusion / exclusion.
 *
 * A projection value may only be 0, 1 or a boolean (strict include/exclude).
 * Anything else rejects the request:
 *  - expressions and field-path aliases — e.g. { leak: "$password" } or
 *    { x: { $function: ... } } — would compute new fields from, or rename, fields
 *    the viewer otherwise removes from the response (MongoDB 4.4+ find()
 *    projections accept expressions);
 *  - other numbers (2, NaN, …) are not valid include/exclude values and can make
 *    the query throw.
 *
 * The offending field used to be deleted from the projection and the query run
 * anyway, which meant a caller asking for something they may not have silently got
 * different results instead of being told. The projection is now left untouched and
 * the caller is rejected, matching how the aggregation guard behaves.
 *
 * @param {object} projection - parsed projection object (not mutated)
 * @returns {object|null} { name } of the first offending field, or null when the
 *          projection is acceptable
 */
function findDisallowedProjectionValue(projection) {
    if (!projection || typeof projection !== "object" || Array.isArray(projection)) {
        return null;
    }
    for (var key in projection) {
        if (Object.prototype.hasOwnProperty.call(projection, key)) {
            var value = projection[key];
            if (value !== 0 && value !== 1 && value !== true && value !== false) {
                return { name: key };
            }
        }
    }
    return null;
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
    findDisallowedProjectionValue,
    escapeRegExp
};
