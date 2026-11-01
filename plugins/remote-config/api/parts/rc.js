/**
* Fetching and processing data for remote config
* @module plugins/remote-config/api/parts/data/rc
*/
const semver = require('semver');
var prng = require('../../../../api/utils/random-sfc32.js');
var globalSeed = "Countly_is_awesome";

/** @lends module:plugins/remote-config/api/parts/data/rc */
var remoteConfig = {};

/**
 * Function to check if the given query matches the given user
 *
 * The query is a Mongo-style filter produced by a dashboard query builder and
 * already run through `/drill/preprocess_query` (which resolves the `rgx*` /
 * `pse*` pseudo operators). Anything this evaluator does not understand fails
 * CLOSED - an unsupported operator makes the whole filter return false and is
 * reported through `diagnostics`, so a targeting rule can never silently widen
 * to "matches everyone".
 *
 * @param  {Object} inpUser - user object
 * @param  {Object} inpQuery - condition query
 * @param  {Array} diagnostics - optional array collecting human readable
 *                               reasons the query could not be evaluated
 * @returns {Boolean} true if the query matches the user
 */
remoteConfig.processFilter = function(inpUser, inpQuery, diagnostics) {
    var ctx = {unsupported: []};
    var matched = matchesQuery(inpUser || {}, inpQuery, ctx) === true;

    if (ctx.unsupported.length) {
        if (Array.isArray(diagnostics)) {
            for (let i = 0; i < ctx.unsupported.length; i++) {
                diagnostics.push(ctx.unsupported[i]);
            }
        }
        //Never guess: an unevaluable rule targets nobody
        return false;
    }

    return matched;
};

/**
 * Function to check if a value is a plain object usable as a query fragment
 * @param  {*} value - value to check
 * @returns {Boolean} true for plain objects
 */
function isPlainObject(value) {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof RegExp);
}

/**
 * Function to record a rule this evaluator cannot honour
 * @param  {Object} ctx - evaluation context
 * @param  {String} prop - query property
 * @param  {String} reason - what went wrong
 */
function report(ctx, prop, reason) {
    if (ctx && Array.isArray(ctx.unsupported)) {
        ctx.unsupported.push(prop + ": " + reason);
    }
}

/**
 * Function to match a whole query fragment against a user
 * @param  {Object} user - user object
 * @param  {Object} query - condition query
 * @param  {Object} ctx - evaluation context
 * @returns {Boolean} true if every property of the fragment matches
 */
function matchesQuery(user, query, ctx) {
    if (!isPlainObject(query)) {
        return false;
    }

    var props = Object.keys(query);

    //An empty condition targets nobody, same as before
    if (!props.length) {
        return false;
    }

    //Every property is evaluated, so a rule this evaluator cannot honour is
    //reported wherever it sits, not only when the properties before it match
    var matched = true;
    for (let i = 0; i < props.length; i++) {
        matched = matchesProperty(user, query, props[i], ctx) && matched;
    }

    return matched;
}

/**
 * Function to match a single query property against a user
 * @param  {Object} user - user object
 * @param  {Object} query - condition query
 * @param  {String} prop - query property
 * @param  {Object} ctx - evaluation context
 * @returns {Boolean} true if the property matches
 */
function matchesProperty(user, query, prop, ctx) {
    var condition = query[prop];

    if (prop === '$or' || prop === '$and' || prop === '$nor') {
        if (!Array.isArray(condition)) {
            report(ctx, prop, "expected an array of sub queries");
            return false;
        }

        //Every sub query is evaluated before they are combined, for the same reason
        var results = condition.map(function(subQuery) {
            return matchesQuery(user, subQuery, ctx);
        });

        if (prop === '$or') {
            return results.some(Boolean);
        }

        if (prop === '$and') {
            return results.every(Boolean);
        }

        return !results.some(Boolean);
    }

    if (isCohortProperty(prop)) {
        return processCohortValues(user, prop, condition, ctx);
    }

    if (prop.charAt(0) === '$') {
        report(ctx, prop, "top level operator is not supported by targeting");
        return false;
    }

    var resolved = resolveUserValue(user, prop);
    return matchesCondition(prop, resolved.value, resolved.found, condition, ctx);
}

/**
 * Function to resolve the value a query property addresses on a user document
 *
 * `up.<x>` addresses a user property, which lives at the root of the app_users
 * document, so the prefix is dropped. Everything else is walked as a path
 * (`custom.<key>`, `chr.<id>`, ...). Presence is decided by the key existing,
 * NOT by the value being truthy, so `0`, `false` and `""` are real values.
 *
 * @param  {Object} user - user object
 * @param  {String} prop - query property
 * @returns {Object} {found: Boolean, value: *}
 */
function resolveUserValue(user, prop) {
    var path = prop.split(".");

    if (path.length > 1 && path[0] === "up") {
        path = path.slice(1);
    }

    var cursor = user;

    for (let i = 0; i < path.length; i++) {
        if (!isPlainObject(cursor) || !(path[i] in cursor)) {
            return {found: false};
        }
        cursor = cursor[path[i]];
    }

    if (typeof cursor === 'undefined') {
        return {found: false};
    }

    return {found: true, value: cursor};
}

/**
 * Function to compare a user value with a query value
 *
 * Numbers are frequently stored as strings on user documents (metrics, custom
 * properties), and `drillCommon.preprocessQuery` deliberately widens $in/$nin
 * arrays to carry both forms, so scalars are compared stringified.
 *
 * @param  {*} userValue - value from the user document
 * @param  {*} queryValue - value from the query
 * @returns {Boolean} true if the values are equal
 */
function valuesEqual(userValue, queryValue) {
    if (userValue === queryValue) {
        return true;
    }

    if (userValue === null || typeof userValue === 'undefined' ||
        queryValue === null || typeof queryValue === 'undefined') {
        return false;
    }

    if (typeof userValue === 'object' || typeof queryValue === 'object') {
        try {
            return JSON.stringify(userValue) === JSON.stringify(queryValue);
        }
        catch {
            return false;
        }
    }

    return String(userValue) === String(queryValue);
}

/**
 * Function to test a predicate against a value, matching any element when the
 * user value is an array (Mongo array semantics)
 * @param  {*} userValue - value from the user document
 * @param  {Function} predicate - predicate to test
 * @returns {Boolean} true if the value, or any of its elements, matches
 */
function anyValue(userValue, predicate) {
    if (Array.isArray(userValue)) {
        return userValue.some(predicate) || predicate(userValue);
    }

    return predicate(userValue);
}

/**
 * Function to build a regular expression from a query fragment
 *
 * The legacy dashboard sends `rgxcn`/`rgxbw`, which `preprocessQuery` turns
 * into a RegExp instance. The current query builder sends the Mongo wire form
 * instead - a `$regex` STRING plus `$options`. Both are accepted here.
 *
 * @param  {String|RegExp} pattern - regex pattern
 * @param  {String} options - regex options
 * @returns {RegExp|null} regular expression, or null when it cannot be built
 */
function toRegExp(pattern, options) {
    if (pattern instanceof RegExp) {
        return pattern;
    }

    if (typeof pattern === 'string') {
        try {
            return new RegExp(pattern, typeof options === 'string' ? options : '');
        }
        catch {
            return null;
        }
    }

    return null;
}

/**
 * Function to check whether a query fragment holds operators
 * @param  {Object} condition - query fragment
 * @returns {Boolean} true if any key is an operator
 */
function hasOperators(condition) {
    for (var key in condition) {
        if (key.charAt(0) === '$') {
            return true;
        }
    }

    return false;
}

/**
 * Function to check whether a query fragment holds unresolved pseudo operators
 * @param  {Object} condition - query fragment
 * @returns {String|null} the offending key, or null
 */
function findPseudoOperator(condition) {
    for (var key in condition) {
        if (key.indexOf('rgx') === 0 || key.indexOf('pse') === 0) {
            return key;
        }
    }

    return null;
}

/**
 * Function to match one property condition against the resolved user value
 * @param  {String} prop - query property
 * @param  {*} userValue - value from the user document
 * @param  {Boolean} found - whether the property exists on the user document
 * @param  {Object} condition - query fragment for this property
 * @param  {Object} ctx - evaluation context
 * @returns {Boolean} true if the condition matches
 */
function matchesCondition(prop, userValue, found, condition, ctx) {
    if (condition instanceof RegExp) {
        return found && anyValue(userValue, function(value) {
            return typeof value !== 'object' && condition.test(String(value));
        });
    }

    if (isPlainObject(condition)) {
        var pseudoOperator = findPseudoOperator(condition);

        if (pseudoOperator) {
            report(ctx, prop, "query was not preprocessed, unresolved operator " + pseudoOperator);
            return false;
        }

        if (hasOperators(condition)) {
            return evaluateOperators(prop, userValue, found, condition, ctx);
        }
    }

    //Plain value, array or operator-less embedded document, compared for equality
    return found && anyValue(userValue, function(value) {
        return valuesEqual(value, condition);
    });
}

/**
 * Function to evaluate the operators of a property condition
 * @param  {String} prop - query property
 * @param  {*} userValue - value from the user document
 * @param  {Boolean} found - whether the property exists on the user document
 * @param  {Object} condition - query fragment for this property
 * @param  {Object} ctx - evaluation context
 * @returns {Boolean} true if every operator matches
 */
function evaluateOperators(prop, userValue, found, condition, ctx) {
    if (('$options' in condition) && !('$regex' in condition)) {
        report(ctx, prop, "$options without $regex");
        return false;
    }

    //Every operator is evaluated, so an unsupported one is reported even when an
    //operator before it does not match, and $not cannot turn the gap into a match
    var allMatched = true;

    for (var op in condition) {
        var expected = condition[op];
        var matched;

        switch (op) {
        //Consumed by $regex
        case '$options':
            continue;
        case '$eq':
            matched = found && anyValue(userValue, function(value) {
                return valuesEqual(value, expected);
            });
            break;
        //A missing property is "not equal to" anything, same as Mongo
        case '$ne':
            matched = !found || !anyValue(userValue, function(value) {
                return valuesEqual(value, expected);
            });
            break;
        case '$in':
        case '$nin':
            if (!Array.isArray(expected)) {
                report(ctx, prop, op + " expects an array");
                return false;
            }
            var inList = found && expected.some(function(candidate) {
                return anyValue(userValue, function(value) {
                    return valuesEqual(value, candidate);
                });
            });
            matched = op === '$in' ? inList : !inList;
            break;
        case '$all':
            if (!Array.isArray(expected)) {
                report(ctx, prop, "$all expects an array");
                return false;
            }
            matched = found && expected.every(function(candidate) {
                return anyValue(userValue, function(value) {
                    return valuesEqual(value, candidate);
                });
            });
            break;
        case '$exists':
            matched = Boolean(expected) === found;
            break;
        case '$gt':
        case '$gte':
        case '$lt':
        case '$lte':
            matched = found && anyValue(userValue, function(value) {
                return compareValues(prop, value, op, expected);
            });
            break;
        case '$regex':
            var regex = toRegExp(expected, condition.$options);
            if (!regex) {
                report(ctx, prop, "$regex is not a usable regular expression");
                return false;
            }
            matched = found && anyValue(userValue, function(value) {
                return typeof value !== 'object' && regex.test(String(value));
            });
            break;
        case '$not':
            matched = !matchesCondition(prop, userValue, found, expected, ctx);
            break;
        default:
            report(ctx, prop, "operator " + op + " is not supported by targeting");
            return false;
        }

        allMatched = allMatched && matched;
    }

    return allMatched;
}

/**
 * Function to check whether a query property addresses the app version
 * @param  {String} prop - query property
 * @returns {Boolean} true for app version properties
 */
function isAppVersionProperty(prop) {
    return prop === 'av' || prop === 'up.av';
}

/**
 * Convert a string to the number it spells out in full
 * @param  {String} value - string to convert
 * @returns {Number} the number, or NaN when the string is empty or not entirely numeric
 */
function stringToNumber(value) {
    return value.trim() === '' ? NaN : Number(value);
}

/**
 * Function to compare a user value against a range operator
 * @param  {String} prop - query property
 * @param  {*} userValue - value from the user document
 * @param  {String} op - range operator
 * @param  {*} expected - value from the query
 * @returns {Boolean} true if the comparison holds
 */
function compareValues(prop, userValue, op, expected) {
    if (isAppVersionProperty(prop)) {
        return processAppVersionValues(userValue, op, expected);
    }

    var left = userValue;
    var right = expected;

    //Against a number, only a number or a numeric string compares: null, a
    //boolean or an object is not a value on that scale
    if ((typeof right === 'number' && typeof left !== 'number' && typeof left !== 'string') ||
        (typeof left === 'number' && typeof right !== 'number' && typeof right !== 'string')) {
        return false;
    }

    //Coerce the string side when the other side is numeric, so a metric
    //stored as "5" still compares against a numeric threshold. The whole
    //string has to be a number: "12points" is not 12.
    if (typeof left === 'string' && typeof right === 'number') {
        left = stringToNumber(left);
    }
    else if (typeof right === 'string' && typeof left === 'number') {
        right = stringToNumber(right);
    }

    if (typeof left === 'number' && isNaN(left)) {
        return false;
    }

    if (typeof right === 'number' && isNaN(right)) {
        return false;
    }

    switch (op) {
    case '$gt': return left > right;
    case '$gte': return left >= right;
    case '$lt': return left < right;
    case '$lte': return left <= right;
    default: return false;
    }
}

/**
 * Function to compare app versions with semver
 * @param  {String} inpUserAv - user app version
 * @param  {String} op - range operator
 * @param  {String} inpTargetAv - app version from the query
 * @returns {Boolean} true if the comparison holds
 */
function processAppVersionValues(inpUserAv, op, inpTargetAv) {
    if (typeof inpUserAv !== 'string' || typeof inpTargetAv !== 'string') {
        return false;
    }

    // app version is stored in mongo like 1:1:0 instead of 1.1.0
    // the colons have to be replaced with dots so that semver lib can compare the app version
    const userAv = inpUserAv.replace(/:/g, '.');
    const targetAv = inpTargetAv.replace(/:/g, '.');

    if (!semver.valid(userAv) || !semver.valid(targetAv)) {
        return false;
    }

    return semver[op.slice(1)](userAv, targetAv);
}

/**
 * Function to check whether a query property addresses cohort membership
 * @param  {String} prop - query property
 * @returns {Boolean} true for cohort membership properties
 */
function isCohortProperty(prop) {
    return prop === 'chr' ||
        prop === 'chr-group' ||
        prop.indexOf('chr.') === 0 ||
        prop.indexOf('chr-group.') === 0;
}

/**
 * Function to process query cohort value
 *
 * Cohort and profile group membership both live in the `chr` map on the user
 * document - `cohorts.preprocessQuery` folds `chr-group` into `chr` before the
 * real cohort engine runs, and this mirrors that. `$in` is a union, `$nin` is
 * "in none of them", and the two are ANDed when both are present, matching
 * `cohorts.preprocessQuery`.
 *
 * @param  {Object} user - user data
 * @param  {String} prop - query property
 * @param  {Object} condition - query fragment for this property
 * @param  {Object} ctx - evaluation context
 * @returns {Boolean} true if the membership rule matches
 */
function processCohortValues(user, prop, condition, ctx) {
    var membership = (user && user.chr) || {};

    /**
     * Function to check whether the user is in a cohort
     * @param  {String} cohortId - cohort id
     * @returns {Boolean} true if the user is in the cohort
     */
    function isMember(cohortId) {
        return Boolean(membership[cohortId] && membership[cohortId].in);
    }

    //`chr.<id>: "true"|"false"` - the intersection form of the legacy editor
    if (prop.indexOf('.') > -1) {
        let cohortId = prop.split('.').slice(1).join('.');

        if (condition === "true" || condition === true) {
            return isMember(cohortId);
        }

        if (condition === "false" || condition === false) {
            return !isMember(cohortId);
        }

        report(ctx, prop, "unsupported cohort membership value");
        return false;
    }

    if (!isPlainObject(condition)) {
        report(ctx, prop, "expected a cohort membership operator");
        return false;
    }

    var matched = true;

    for (var op in condition) {
        let cohortIds = condition[op];

        if (!Array.isArray(cohortIds)) {
            report(ctx, prop, op + " expects an array of cohort ids");
            return false;
        }

        if (op === '$in') {
            matched = matched && cohortIds.some(isMember);
        }
        else if (op === '$nin') {
            matched = matched && !cohortIds.some(isMember);
        }
        else {
            report(ctx, prop, "operator " + op + " is not supported for cohort membership");
            return false;
        }
    }

    return matched;
}

/**
 * Function to calculate random percentile
 * @param  {String} seed - seed value
 * @param  {Object} user - user
 * @returns {Number} random number
 */
remoteConfig.randomPercentile = function(seed, user) {
    var salt = seed || globalSeed;
    var saltValue = salt + "_" + user;
    var random = prng(saltValue);
    return random() * 100;
};

module.exports = remoteConfig;
