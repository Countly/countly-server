/**
* Fetching and processing data for remote config
* @module plugins/remote-config/api/parts/data/rc
*/
var prng = require('../../../../api/utils/random-sfc32.js');
var globalSeed = "Countly_is_awesome";

/** @lends module:plugins/remote-config/api/parts/data/rc */
var remoteConfig = {};

/**
 * Function to process condition filter
 * @param  {Object} params - params object
 * @param  {Object} user - user
 * @param  {Object} query - query
 * @returns {Boolean} query status
 */
remoteConfig.processFilter = function(params, user, query) {
    var queryStatus = false, isCohort = false, hasValue = false;

    if (Object.keys(query).length) {
        queryStatus = true;

        for (var prop in query) {
            var parts = prop.split(".");
            var value;

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

            if (parts[0] !== "chr") {
                if (typeof (value) !== "undefined") {
                    hasValue = true;
                    queryStatus = queryStatus && processPropertyValues(value, query, prop);
                }
                else {
                    //If the type of the user prop is undefined, set query status to false, since data is not available
                    //In such cases only process if $nin is present otherwise we show the default value to the user
                    if (query[prop].$nin) {
                        hasValue = true;
                        queryStatus = queryStatus && processPropertyValues(value, query, prop);
                    }
                    else {
                        queryStatus = false;
                    }
                }
            }
            else {
                hasValue = true;
                isCohort = true;
            }
        }

        if (isCohort) {
            queryStatus = queryStatus && processCohortValues(user, query);
        }

        if (!hasValue) {
            //If the user does not have any user prop value, set query status to false, since data is not available
            queryStatus = false;
        }
    }

    return queryStatus;
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
        }
    }

    return status;
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