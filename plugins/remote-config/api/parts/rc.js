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
 * @param  {Object} inpUser - user object
 * @param  {Object} inpQuery - condition query
 * @returns {Boolean} true if the query matches the user
 */
remoteConfig.processFilter = function(inpUser, inpQuery) {
    /**
     * Inner function of processFilter for recursion
     * @param  {Object} user - user object
     * @param  {Object} query - condition query
     * @returns {Boolean} true if the query matches the user
     */
    function matchesQuery(user, query) {
        for (let key in query) {
            if (key === '$or') {
                return query[key].some((subQuery) => matchesQuery(user, subQuery));
            }
            else if (key === '$and') {
                return query[key].every((subQuery) => matchesQuery(user, subQuery));
            }
            else if (typeof query[key] === 'object' && query[key] !== null && !Array.isArray(query[key])) {
                let qResult = true;

                for (let prop in query) {
                    let parts = prop.split(".");
                    let value;

                    if (parts[0] === "up" || parts.length === 1) {
                        var p = parts[0];
                        if (p === "up") {
                            p = parts[1];
                        }
                        if (user[p]) {
                            value = user[p];
                        }
                    }
                    else if (user[parts[0]] && user[parts[0]][parts[1]]) {
                        value = user[parts[0]][parts[1]];
                    }

                    if (parts[0] !== 'chr') {
                        if (prop === 'up.av') {
                            if ('av' in user) {
                                qResult = qResult && processAppVersionValues(user.av, { [prop]: query[prop] }, prop);
                            }
                        }
                        else if (typeof (value) !== 'undefined') {
                            qResult = qResult && processPropertyValues(value, { [prop]: query[prop] }, prop);
                        }
                        else {
                            //If data is not available, check for $nin and $exists operator since they can be true 
                            if (query[prop] && (query[prop].$nin || '$exists' in query[prop])) {
                                qResult = qResult && processPropertyValues(value, { [prop]: query[prop] }, prop);
                            } // Otherwise return false
                            else {
                                qResult = false;
                            }
                        }
                    }
                    else {
                        qResult = qResult && processCohortValues(user, { chr: query[prop] });
                    }
                }

                return qResult;
            }
            else {
                return false;
            }
        }
    }

    return matchesQuery(inpUser, inpQuery);
};

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

/**
 * Function to process query property value
 * @param  {String} value - query propery value
 * @param  {Object} query - filter
 * @param  {String} prop - query property
 * @returns {Boolean} property value status
 */
function processPropertyValues(value, query, prop) {
    var status = true;
    for (var filterType in query[prop]) {
        switch (filterType) {
        case "$in": status = status && query[prop].$in.indexOf(value) > -1; break;
        case "$nin": status = status && query[prop].$nin.indexOf(value) === -1; break;
        case "$gt": status = status && value > query[prop].$gt; break;
        case "$gte": status = status && value >= query[prop].$gte; break;
        case "$lt": status = status && value < query[prop].$lt; break;
        case "$lte": status = status && value <= query[prop].$lte; break;
        case "$regex": status = status && query[prop].$regex.test(value); break;
        case "$not": status = status && !query[prop].$not.test(value); break;
        case '$exists': status = status && (query[prop].$exists === (value !== undefined)); break;
        }
    }

    return status;
}

/**
 * Function to process query property value
 * @param  {Object} inpUserAv - user app version
 * @param  {Object} query - filter
 * @param  {String} prop - query property
 * @returns {Boolean} property value status
 */
function processAppVersionValues(inpUserAv, query, prop) {
    const userAv = inpUserAv.replace(/:/g, '.');
    const filterType = Object.keys(query[prop])[0];
    const targetAv = query[prop] && query[prop][filterType] && query[prop][filterType].replace(/:/g, '.');

    if (!semver.valid(userAv) || !semver.valid(targetAv)) {
        return false;
    }

    return semver[filterType.slice(1)](userAv, targetAv);
}

/**
 * Function to process query cohort value
 * @param  {Object} user - user data
 * @param  {Object} query - filter
 * @returns {Boolean} cohort value status
 */
function processCohortValues(user, query) {
    var value = user.chr || { chr: {} };
    var status, cohortId;

    if (query.chr) {
        //Reference cohorts.preprocessQuery
        //OR operator - UNION of cohorts

        status = false;

        if (query.chr.$in && query.chr.$in.length) {
            for (let i = 0; i < query.chr.$in.length; i++) {
                cohortId = query.chr.$in[i];
                status = status || ((value[cohortId] && value[cohortId].in) ? true : false);
            }
        }

        if (query.chr.$nin && query.chr.$nin.length) {
            for (let i = 0; i < query.chr.$nin.length; i++) {
                cohortId = query.chr.$nin[i];
                status = status || ((!value[cohortId] || (value[cohortId] && !value[cohortId].in)) ? true : false);
            }
        }
    }
    else {
        //Reference cohorts.preprocessQuery
        //AND operator - INTERSECTION of cohorts

        status = true;
        for (let i in query) {
            if (i.indexOf("chr.") === 0) {
                cohortId = i.split(".")[1];
                if (query[i] === "true") {
                    status = status && ((value[cohortId] && value[cohortId].in) ? true : false);
                }
                else if (query[i] === "false") {
                    status = status && ((!value[cohortId] || (value[cohortId] && !value[cohortId].in)) ? true : false);
                }
            }
        }
    }

    return status;
}

module.exports = remoteConfig;
