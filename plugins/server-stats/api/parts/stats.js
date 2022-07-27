const moment = require("moment");
/**
* Saves session and event count information to server_stats_data_points
* collection in countly database

* Sample document is like below where a is the app id, m is the month,
* e is event count and s is the session count
{
   "_id" : "58496f1c81ccb91a37dbb1d0_2016:12",
   "a" : "58496f1c81ccb91a37dbb1d0",
   "m" : "2016:12",
   "e" : 1898,
   "s" : 286
}
* @param {Object} writeBatcher - writeBatcher instance
* @param {string} appId - Application Id
* @param {Number} sessionCount - Session Count
* @param {Number} eventCount - Event Count
* @param {boolean} consolidated - If data is consolidated
* @returns {undefined} Returns nothing
**/
function updateDataPoints(writeBatcher, appId, sessionCount, eventCount, consolidated) {
    if (!sessionCount && !eventCount) {
        return;
    }
    var utcMoment = moment.utc();
    var incObject = {
        s: sessionCount,
        [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.s`]: sessionCount
    };
    if (typeof eventCount === 'object') {
        var sum = sessionCount || 0;
        for (var key in eventCount) {
            incObject[key] = eventCount[key];
            incObject[`d.${utcMoment.format("D")}.${utcMoment.format("H")}.${key}`] = eventCount[key];
            sum += eventCount[key] || 0;
        }
        incObject[`d.${utcMoment.format("D")}.${utcMoment.format("H")}.dp`] = sum;
    }
    else {
        incObject = {
            e: eventCount,
            s: sessionCount,
            [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.dp`]: sessionCount + eventCount,
            [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.e`]: eventCount,
            [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.s`]: sessionCount
        };
    }

    writeBatcher.add('server_stats_data_points', appId + "_" + utcMoment.format("YYYY:M"), {
        $set: {
            a: appId + "",
            m: utcMoment.format("YYYY:M")
        },
        $inc: incObject
    });

    if (consolidated) {
        appId = "[CLY]_consolidated";
        writeBatcher.add('server_stats_data_points', appId + "_" + utcMoment.format("YYYY:M"), {
            $set: {
                a: appId + "",
                m: utcMoment.format("YYYY:M")
            },
            $inc: incObject
        });
    }
}

/**
 *  Check if data should be counted as consolidated
 *  @param {params} params - params object
 *  @returns {bool} true if consolidated
 */
function isConsolidated(params) {
    if (params && (params.isConsolidated || (params.req && params.req.method === "consolidate") || (params.qstring && params.qstring.consolidateAppIds))) {
        return true;
    }
    return false;
}

/**
* Update data-point object with new events and sessions counts
* @param {object} object - object which will be updated
* @param {object} data - passed data object which contains events and sessions count
* @returns {object} Returns manipulated object
**/
function increaseDataPoints(object, data) {
    object.events += (data.e || 0);
    object.sessions += (data.s || 0);
    object.push += (data.p || 0);
    if (data.dp) {
        object.dp += data.dp;
    }
    else {
        object.dp += ((data.e || 0) + (data.s || 0) + (data.p || 0));
    }

    return object;
}

/**
 * punchCard function
 * @param {db} db - database object
 * @param {Object} filter - MongoDB query
 * @param {Object} options - Date object
 * @return {Promise<Array>} - dataPoints
 */
function punchCard(db, filter, options) {
    var dateObj = options.dateObj;

    var ROW = 7;
    var useDateAsDay = false;
    var labels = [];
    if (options.periodObj.daysInPeriod <= 7) {
        ROW = options.periodObj.daysInPeriod;
        useDateAsDay = true;
        for (let k = 0; k < options.periodObj.currentPeriodArr.length; k++) {
            labels.push(options.periodObj.currentPeriodArr[k]);
        }
    }
    const TIME_RANGE = 24;

    const COLLECTION_NAME = "server_stats_data_points";
    return new Promise((resolve, reject) => {
        db.collection(COLLECTION_NAME).find(filter).toArray((error, results) => {
            if (error) {
                return reject(error);
            }

            var data = [];
            for (let p = 0; p < ROW; p++) {
                for (let m = 0; m < TIME_RANGE; m++) {
                    data.push({"value": {}, "min": null, "max": 0, "sum": 0, "avg": 0, "cn": {}, "p": 0, "s": 0, "e": 0});
                }
            }

            for (let pointNumber = 0; pointNumber < results.length; pointNumber++) {
                const result = results[pointNumber];
                const splitFormat = result._id.split('_')[1].split(':');
                const year = parseInt(splitFormat[0]);
                const month = (parseInt(splitFormat[1]) - 1);
                const dates = result.d;
                for (const date in dates) { //each day
                    let getWeekDay = moment().year(year).month(month).date(date).isoWeekday() - 1;
                    if (useDateAsDay) {
                        getWeekDay = labels.indexOf(year + "." + (month + 1) + "." + date);
                    }
                    if (dateObj[year + ":" + (month + 1)] && (dateObj[year + ":" + (month + 1)].full || dateObj[year + ":" + (month + 1)][date]) && getWeekDay > -1) {
                        for (let k = 0; k < TIME_RANGE; k++) { //each hour
                            if (dates[date][k]) {
                                if (dates[date][k].dp) {
                                    data[getWeekDay * TIME_RANGE + k].cn[year + ":" + (month + 1) + ":" + date + ":" + k] = true;
                                    data[getWeekDay * TIME_RANGE + k].value[year + ":" + (month + 1) + ":" + date + ":" + k] = (data[getWeekDay * TIME_RANGE + k].value[year + ":" + (month + 1) + ":" + date + ":" + k] || 0) + dates[date][k].dp;

                                    data[getWeekDay * TIME_RANGE + k].sum += dates[date][k].dp;

                                }
                                data[getWeekDay * TIME_RANGE + k].e += (dates[date][k].e || 0);
                                data[getWeekDay * TIME_RANGE + k].s += (dates[date][k].s || 0);
                                data[getWeekDay * TIME_RANGE + k].p += (dates[date][k].p || 0);
                            }
                        }
                    }
                }
            }

            for (var p = 0; p < data.length; p++) {
                data[p].cn = Object.keys(data[p].cn);
                data[p].cn = data[p].cn.length;

                for (var z in data[p].value) {
                    if (data[p].value[z] > data[p].max) {
                        data[p].max = data[p].value[z];
                    }

                    if (data[p].min === null || data[p].value[z] < data[p].min) {
                        data[p].min = data[p].value[z];
                    }
                }
                delete data[p].value;

                data[p] = [p % TIME_RANGE, Math.floor(p / TIME_RANGE), data[p].sum, data[p]];
            }
            resolve({"data": data, "dayCount": options.periodObj.daysInPeriod, labels: labels});
        });
    });
}
/**
 *  Get's datapoint data from database and outputs it to browser
 *  @param {db} db - database object
 *  @param {object} filter - to filter documents
 *  @param {object} options - array with periods
 *  @param {function} callback - callback
 */
function fetchDatapoints(db, filter, options, callback) {
    var TIME_RANGE = 24;
    options.dateObjPrev = options.dateObjPrev || {};
    db.collection("server_stats_data_points").find(filter, {}).toArray(function(err, result) {
        var toReturn = {
            "all-apps": {"events": 0, "sessions": 0, "push": 0, "dp": 0, "change": 0},
        };

        if (err || !result) {
            console.log("Failed to get datapoints", err);
            return callback(toReturn);
        }

        for (let i = 0; i < result.length; i++) {
            if (!toReturn[result[i].a]) {
                toReturn[result[i].a] = {"events": 0, "push": 0, "sessions": 0, "dp": 0, "change": 0};
            }
            const dates = result[i].d;
            if (options.dateObj[result[i].m]) {
                if (options.dateObj[result[i].m].full) {
                    toReturn["all-apps"] = increaseDataPoints(toReturn["all-apps"], result[i]);
                    toReturn[result[i].a] = increaseDataPoints(toReturn[result[i].a], result[i]);
                }
                else {
                    for (const date in dates) {
                        if (options.dateObj[result[i].m][date]) {
                            for (let k = 0; k < TIME_RANGE; k++) { //each hour
                                if (dates[date][k]) {
                                    toReturn["all-apps"] = increaseDataPoints(toReturn["all-apps"], dates[date][k]);
                                    toReturn[result[i].a] = increaseDataPoints(toReturn[result[i].a], dates[date][k]);
                                }
                            }

                        }
                    }
                }
            }
            if (options.dateObjPrev[result[i].m]) {
                if (options.dateObjPrev[result[i].m].full) {
                    toReturn["all-apps"].change += ((result[i].e || 0) + (result[i].s || 0));
                    toReturn[result[i].a].change += ((result[i].e || 0) + (result[i].s || 0));
                }
                else {
                    for (const date in dates) {
                        if (options.dateObjPrev[result[i].m][date]) {
                            for (let k = 0; k < TIME_RANGE; k++) { //each hour
                                if (dates[date][k]) {

                                    toReturn["all-apps"].change += dates[date][k].dp;
                                    toReturn[result[i].a].change += dates[date][k].dp;
                                }
                            }

                        }
                    }

                }

            }

        }
        if (!options.singleApp && toReturn["[CLY]_consolidated"] && toReturn["all-apps"]) {
            //if we have consolidated data, calculate all data without consolidated data
            toReturn["natural-dp"] = {"events": 0, "sessions": 0, "push": 0, "dp": 0, "change": 0};

            for (let metric in toReturn["all-apps"]) {
                toReturn["natural-dp"][metric] += toReturn["all-apps"][metric];
                if (toReturn["[CLY]_consolidated"] && toReturn["[CLY]_consolidated"][metric]) {
                    toReturn["natural-dp"][metric] -= toReturn["[CLY]_consolidated"][metric];
                }
            }

        }
        if (options.singleApp) {
            delete toReturn["all-apps"];
        }
        for (var z in toReturn) {
            toReturn[z].change = toReturn[z].dp - toReturn[z].change;
        }
        callback(toReturn);
    });
}

/**
 *  Get top apps DP for current hour
 *  @param {db} db - DB object
 *  @param {object} params - params object
 *  @param {function} callback - callback
 */
function getTop(db, params, callback) {
    var utcMoment = moment.utc();
    var curMonth = utcMoment.format("YYYY") + ":" + utcMoment.format("M");
    var curDate = utcMoment.format("D");
    var curHour = utcMoment.format("H");
    db.collection("server_stats_data_points").find({_id: {$regex: ".*_" + curMonth}}, {}).toArray(function(err, data) {
        var res = {};
        if (data) {
            for (let i = 0; i < data.length; i++) {
                res[data[i].a] = res[data[i].a] || 0;
                if (data[i] && data[i].d && data[i].d[curDate] && data[i].d[curDate][curHour] && data[i].d[curDate][curHour].dp) {
                    res[data[i].a] += data[i].d[curDate][curHour].dp;
                }

                if (data[i] && data[i].d && data[i].d[curDate] && data[i].d[curDate][parseInt(curHour) - 1] && data[i].d[curDate][parseInt(curHour) - 1].dp) {
                    res[data[i].a] += data[i].d[curDate][parseInt(curHour) - 1].dp;
                }
            }
        }
        var rr = [];
        for (var app in res) {
            if (app !== "[CLY]_consolidated") {
                rr.push({"a": app, "v": res[app]});
            }
        }
        rr = rr.sort(function(a, b) {
            return b.v - a.v;
        });
        rr = rr.slice(0, 3);
        callback(rr);
    });
}


/**
* Returns a human readable name given application id.
* @param {string} appId - Application Id
* @param {Object} appNames - app id to app name mapping
* @returns {string} Returns a readable name
**/
function getAppName(appId, appNames) {
    if (appId === "all-apps") {
        return "(" + "All Datapoints" + ")";
    }
    else if (appId === "[CLY]_consolidated") {
        return "(" + "Consolidated Datapoints" + ")";
    }
    else if (appId === "natural-dp") {
        return "(" + "Natural Datapoints" + ")";
    }
    else if (appNames[appId]) {
        return appNames[appId];
    }
    else {
        return "App name not available (" + appId + ")";
    }
}

module.exports = {updateDataPoints, isConsolidated, increaseDataPoints, punchCard, fetchDatapoints, getTop, getAppName};