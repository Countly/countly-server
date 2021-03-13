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

    writeBatcher.add('server_stats_data_points', appId + "_" + utcMoment.format("YYYY:M"), {
        $set: {
            a: appId + "",
            m: utcMoment.format("YYYY:M")
        },
        $inc: {
            e: eventCount,
            s: sessionCount,
            [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.dp`]: sessionCount + eventCount
        }
    });

    if (consolidated) {
        appId = "[CLY]_consolidated";
        writeBatcher.add('server_stats_data_points', appId + "_" + utcMoment.format("YYYY:M"), {
            $set: {
                a: appId + "",
                m: utcMoment.format("YYYY:M")
            },
            $inc: {
                e: eventCount,
                s: sessionCount,
                [`d.${utcMoment.format("D")}.${utcMoment.format("H")}.dp`]: sessionCount + eventCount
            }
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
    object.events += data.e;
    object.sessions += data.s;
    object["data-points"] += data.e + data.s;
    return object;
}

/**
 * punchCard function
 *  @param {db} db - database object
 * @param {Object} filter - MongoDB query
 * @return {Promise<Array>} - dataPoints
 */
function punchCard(db, filter) {
    const TIME_RANGE = 24;
    const ROW = 7;
    const COLLECTION_NAME = "server_stats_data_points";
    return new Promise((resolve, reject) => {
        db.collection(COLLECTION_NAME).find(filter).toArray((error, results) => {
            if (error) {
                return reject(error);
            }
            let matrix = Array(ROW).fill().map(() => []);
            /**
             * invertMap
             * @param {*} mtx - mtx
             * @param {*} fn - fn
             * @returns{Array} - reduce array
             */
            const invertMap = (mtx, fn) => {
                if (mtx.length === 0) {
                    return Array(TIME_RANGE).fill(0);
                }
                let kRows = mtx.length,
                    kCols = mtx[0].length;
                return [...Array(kCols).keys()].map((colIndex) => [...Array(kRows).keys()].map((rowIndex) => mtx[rowIndex][colIndex]).reduce(fn));
            };
            for (let pointNumber = 0; pointNumber < results.length; pointNumber++) {
                const result = results[pointNumber];
                const splitFormat = result._id.split('_')[1].split(':');
                const year = parseInt(splitFormat[0]);
                const month = (parseInt(splitFormat[1]) - 1);
                const dates = result.d;
                for (const date in dates) {
                    let getWeekDay = moment().year(year).month(month).date(date).isoWeekday();
                    let arr = new Array(TIME_RANGE).fill(0);
                    let matrixDayColumn = matrix[getWeekDay - 1];
                    for (let k = 0; k < arr.length; k++) {
                        if (dates[date] && dates[date][k] && dates[date][k].dp) {
                            const hourDP = dates[date][k].dp;
                            arr[k] += hourDP;
                        }
                    }
                    matrixDayColumn.push(arr);
                }
            }
            let output = [
                {sumValue: matrix.map((mtx) => invertMap(mtx, (acc, val) => acc + val)) },
                {minValue: matrix.map((mtx) => invertMap(mtx, (acc, val) => acc < val ? acc : val)) },
                {maxValue: matrix.map((mtx) => invertMap(mtx, (acc, val) => acc > val ? acc : val)) },
            ];
            output.push({avgValue: matrix.map((mtx, mtxIndex) => mtx.length === 0 ? Array(TIME_RANGE).fill(0) : output[0].sumValue[mtxIndex].map((val) => val / mtx.length))});
            resolve(output);
        });
    });
}
/**
 *  Get's datapoint data from database and outputs it to browser
 *  @param {db} db - database object
 *  @param {object} filter - to filter documents
 *  @param {array} periodsToFetch - array with periods
 *  @param {function} callback - callback
 */
function fetchDatapoints(db, filter, periodsToFetch, callback) {
    db.collection("server_stats_data_points").find(filter, {}).toArray(function(err, dataPerApp) {
        var toReturn = {
            "all-apps": {},
        };

        toReturn["all-apps"]["12_months"] = {
            "events": 0,
            "sessions": 0,
            "data-points": 0
        };
        toReturn["all-apps"]["6_months"] = {
            "events": 0,
            "sessions": 0,
            "data-points": 0
        };
        toReturn["all-apps"]["3_months"] = {
            "events": 0,
            "sessions": 0,
            "data-points": 0
        };

        for (let i = 0; i < periodsToFetch.length; i++) {
            let formattedDate = periodsToFetch[i].replace(":", "-");
            toReturn["all-apps"][formattedDate] = {
                "events": 0,
                "sessions": 0,
                "data-points": 0
            };
        }

        if (err || !dataPerApp) {
            console.log("Failed to get datapoints", err);
            return callback(toReturn);
        }

        for (let i = 0; i < dataPerApp.length; i++) {
            if (!toReturn[dataPerApp[i].a]) {
                toReturn[dataPerApp[i].a] = {};
            }

            for (let j = 0; j < periodsToFetch.length; j++) {
                let formattedDate = periodsToFetch[j].replace(":", "-");

                if (!toReturn[dataPerApp[i].a][formattedDate]) {
                    toReturn[dataPerApp[i].a][formattedDate] = {
                        "events": 0,
                        "sessions": 0,
                        "data-points": 0
                    };
                }
                if (!toReturn[dataPerApp[i].a]["12_months"]) {
                    toReturn[dataPerApp[i].a]["12_months"] = {
                        "events": 0,
                        "sessions": 0,
                        "data-points": 0
                    };
                }
                if (!toReturn[dataPerApp[i].a]["6_months"]) {
                    toReturn[dataPerApp[i].a]["6_months"] = {
                        "events": 0,
                        "sessions": 0,
                        "data-points": 0
                    };
                }
                if (!toReturn[dataPerApp[i].a]["3_months"]) {
                    toReturn[dataPerApp[i].a]["3_months"] = {
                        "events": 0,
                        "sessions": 0,
                        "data-points": 0
                    };
                }

                if (dataPerApp[i].m === periodsToFetch[j]) {
                    toReturn[dataPerApp[i].a][formattedDate] = increaseDataPoints(toReturn[dataPerApp[i].a][formattedDate], dataPerApp[i]);
                    toReturn["all-apps"][formattedDate] = increaseDataPoints(toReturn["all-apps"][formattedDate], dataPerApp[i]);
                    // only last 6 months
                    if (j > 5) {
                        toReturn["all-apps"]["6_months"] = increaseDataPoints(toReturn["all-apps"]["6_months"], dataPerApp[i]);
                        toReturn[dataPerApp[i].a]["6_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["6_months"], dataPerApp[i]);
                    }
                    // only last 3 months
                    if (j > 8) {
                        toReturn[dataPerApp[i].a]["3_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["3_months"], dataPerApp[i]);
                        toReturn["all-apps"]["3_months"] = increaseDataPoints(toReturn["all-apps"]["3_months"], dataPerApp[i]);
                    }
                    toReturn[dataPerApp[i].a]["12_months"] = increaseDataPoints(toReturn[dataPerApp[i].a]["12_months"], dataPerApp[i]);
                    toReturn["all-apps"]["12_months"] = increaseDataPoints(toReturn["all-apps"]["12_months"], dataPerApp[i]);
                }
            }

        }
        if (toReturn["[CLY]_consolidated"] && toReturn["all-apps"]) {
            //if we have consolidated data, calculate all data without consolidated data
            toReturn["natural-dp"] = {};

            for (let date in toReturn["all-apps"]) {
                if (!toReturn["natural-dp"][date]) {
                    toReturn["natural-dp"][date] = {
                        "events": 0,
                        "sessions": 0,
                        "data-points": 0
                    };
                }
                for (let metric in toReturn["all-apps"][date]) {
                    toReturn["natural-dp"][date][metric] += toReturn["all-apps"][date][metric];
                    if (toReturn["[CLY]_consolidated"][date] && toReturn["[CLY]_consolidated"][date][metric]) {
                        toReturn["natural-dp"][date][metric] -= toReturn["[CLY]_consolidated"][date][metric];
                    }
                }
            }
        }

        //calculate change from previous periods
        for (let j = 1; j < periodsToFetch.length; j++) {
            let curDate = periodsToFetch[j].replace(":", "-");
            let prevDate = periodsToFetch[j - 1].replace(":", "-");
            for (let app in toReturn) {
                if (toReturn[app][curDate] && toReturn[app][prevDate]) {
                    toReturn[app][curDate].change = toReturn[app][curDate]["data-points"] - toReturn[app][prevDate]["data-points"];
                }
            }
        }
        callback(toReturn);
    });
}

/**
 *  Get top apps DP for current hour
 *  @param {db} db - DB object
 *  @param {function} callback - callback
 */
function getTop(db, callback) {
    var utcMoment = moment.utc();
    var curMonth = utcMoment.format("YYYY") + ":" + utcMoment.format("M");
    var curDate = utcMoment.format("D");
    var curHour = utcMoment.format("H");
    db.collection("server_stats_data_points").find({_id: {$regex: ".*_" + curMonth}}, {}).toArray(function(err, data) {
        var res = {};
        if (data) {
            for (let i = 0; i < data.length; i++) {
                if (data[i] && data[i].d && data[i].d[curDate] && data[i].d[curDate][curHour] && data[i].d[curDate][curHour].dp) {
                    res[data[i].a] = {"data-points": data[i].d[curDate][curHour].dp};
                }
            }
        }
        callback(res);
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
        return "Deleted app (" + appId + ")";
    }
}

module.exports = {updateDataPoints, isConsolidated, increaseDataPoints, punchCard, fetchDatapoints, getTop, getAppName};