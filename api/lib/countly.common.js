/**
* This module defines default model to handle users collection data
* @module "api/lib/countly.common"
*/

/** @lends module:api/lib/countly.common */
var countlyCommon = {},
    moment = require('moment-timezone'),
    underscore = require('underscore');

// Private Properties
var _period = "hour",
    _appTimezone = "UTC",
    _currMoment = moment();

// Private Methods

/**
* Returns array with unique ticks for period
* @param {moment} startTimestamp - start of period
* @param {moment} endTimestamp - end of period
* @returns {array} unique array ticks for period
**/
function getTicksBetween(startTimestamp, endTimestamp) {
    var dayIt = startTimestamp.clone(),
        ticks = [];

    while (dayIt < endTimestamp) {
        let daysLeft = Math.round(moment.duration(endTimestamp - dayIt).asDays());
        if (daysLeft >= dayIt.daysInMonth() && dayIt.date() === 1) {
            ticks.push(dayIt.format("YYYY.M"));
            dayIt.add(1 + dayIt.daysInMonth() - dayIt.date(), "days");
        }
        else if (daysLeft >= (7 - dayIt.day()) && dayIt.day() === 1) {
            ticks.push(dayIt.format("YYYY.[w]W"));
            dayIt.add(8 - dayIt.day(), "days");
        }
        else {
            ticks.push(dayIt.format("YYYY.M.D"));
            dayIt.add(1, "day");
        }
    }

    return ticks;
}

/**
* Returns array with more generalized unique ticks for period
* @param {moment} startTimestamp - start of period
* @param {moment} endTimestamp - end of period
* @returns {array} unique array ticks for period
**/
function getTicksCheckBetween(startTimestamp, endTimestamp) {
    var dayIt = startTimestamp.clone(),
        ticks = [];

    while (dayIt < endTimestamp) {
        let daysLeft = Math.round(moment.duration(endTimestamp - dayIt).asDays());
        if (daysLeft >= (dayIt.daysInMonth() * 0.5 - dayIt.date())) {
            ticks.push(dayIt.format("YYYY.M"));
            dayIt.add(1 + dayIt.daysInMonth() - dayIt.date(), "days");
        }
        else {
            ticks.push(dayIt.format("YYYY.[w]W"));
            dayIt.add(8 - dayIt.day(), "days");
        }
    }

    return ticks;
}

/**
* Returns a period object used by all time related data calculation functions
* @param {moment} prmPeriod period to be calculated
* @returns {timeObject} time object
**/
function getPeriodObject(prmPeriod) {
    var startTimestamp, endTimestamp, periodObject, cycleDuration;
    periodObject = {
        start: 0,
        end: 0,
        currentPeriodArr: [],
        previousPeriodArr: [],
        dateString: "NA",
        isSpecialPeriod: false,
        daysInPeriod: 0,
        periodContainsToday: true,
        uniquePeriodArr: [],
        uniquePeriodCheckArr: [],
        previousUniquePeriodArr: [],
        previousUniquePeriodCheckArr: [],
        activePeriod: "NA",
        previousPeriod: "NA",
        periodMax: "NA",
        periodMin: "NA",
        reqMonthDbDateIds: [],
        reqZeroDbDateIds: []
    };

    var period = prmPeriod || _period;

    endTimestamp = _currMoment.clone().endOf("day");

    if (period.since) {
        period = [period.since, Date.now()];
    }

    if (period && typeof periodObj === 'string' && period.indexOf(",") !== -1) {
        try {
            period = JSON.parse(period);
        }
        catch (SyntaxError) {
            console.log("period JSON parse failed");
            period = "30days";
        }
    }

    if (Array.isArray(period)) {
        if ((period[0] + "").length === 10) {
            period[0] *= 1000;
        }
        if ((period[1] + "").length === 10) {
            period[1] *= 1000;
        }
        var fromDate, toDate;

        if (Number.isInteger(period[0]) && Number.isInteger(period[1])) {
            fromDate = moment(period[0]);
            toDate = moment(period[1]);
        }
        else {
            fromDate = moment(period[0], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
            toDate = moment(period[1], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
        }

        startTimestamp = fromDate.clone().startOf("day");
        endTimestamp = toDate.clone().endOf("day");
        fromDate.tz(_appTimezone);
        toDate.tz(_appTimezone);

        if (fromDate.valueOf() === toDate.valueOf()) {
            cycleDuration = moment.duration(1, "day");
            Object.assign(periodObject, {
                dateString: "D MMM, HH:mm",
                periodMax: 23,
                periodMin: 0,
                activePeriod: fromDate.format("YYYY.M.D"),
                previousPeriod: fromDate.clone().subtract(1, "day").format("YYYY.M.D")
            });
        }
        else if (fromDate.valueOf() > toDate.valueOf()) {
            //incorrect range - reset to 30 days
            let nDays = 30;

            startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
            endTimestamp = _currMoment.clone().endOf("day");

            cycleDuration = moment.duration(nDays, "days");
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
        else {
            cycleDuration = moment.duration(Math.round(moment.duration(endTimestamp - startTimestamp).asDays()), "days");
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
    }
    else if (period === "month") {
        startTimestamp = _currMoment.clone().startOf("year");
        cycleDuration = moment.duration(1, "year");
        periodObject.dateString = "MMM";
        Object.assign(periodObject, {
            dateString: "MMM",
            periodMax: 12,
            periodMin: 1,
            activePeriod: _currMoment.year(),
            previousPeriod: _currMoment.year() - 1
        });
    }
    else if (period === "day") {
        startTimestamp = _currMoment.clone().startOf("month");
        cycleDuration = moment.duration(1, "month");
        periodObject.dateString = "D MMM";
        Object.assign(periodObject, {
            dateString: "D MMM",
            periodMax: _currMoment.clone().endOf("month").date(),
            periodMin: 1,
            activePeriod: _currMoment.format("YYYY.M"),
            previousPeriod: _currMoment.clone().subtract(1, "month").format("YYYY.M")
        });
    }
    else if (period === "prevMonth") {
        startTimestamp = _currMoment.clone().subtract(1, "month").startOf("month");
        endTimestamp = _currMoment.clone().subtract(1, "month").endOf("month");
        cycleDuration = moment.duration(1, "month");
        Object.assign(periodObject, {
            dateString: "D MMM",
            periodMax: _currMoment.clone().subtract(1, "month").endOf("month").date(),
            periodMin: 1,
            activePeriod: _currMoment.clone().subtract(1, "month").format("YYYY.M"),
            previousPeriod: _currMoment.clone().subtract(2, "month").format("YYYY.M")
        });
    }
    else if (period === "hour") {
        startTimestamp = _currMoment.clone().startOf("day");
        cycleDuration = moment.duration(1, "day");
        Object.assign(periodObject, {
            dateString: "HH:mm",
            periodMax: 23,
            periodMin: 0,
            activePeriod: _currMoment.format("YYYY.M.D"),
            previousPeriod: _currMoment.clone().subtract(1, "day").format("YYYY.M.D")
        });
    }
    else if (period === "yesterday") {
        let yesterday = _currMoment.clone().subtract(1, "day");

        startTimestamp = yesterday.clone().startOf("day");
        endTimestamp = yesterday.clone().endOf("day");
        cycleDuration = moment.duration(1, "day");
        Object.assign(periodObject, {
            dateString: "D MMM, HH:mm",
            periodMax: 23,
            periodMin: 0,
            activePeriod: yesterday.format("YYYY.M.D"),
            previousPeriod: yesterday.clone().subtract(1, "day").format("YYYY.M.D")
        });
    }
    else if (/([0-9]+)days/.test(period)) {
        let nDays = parseInt(/([0-9]+)days/.exec(period)[1]);
        if (nDays < 1) {
            nDays = 30; //if there is less than 1 day
        }
        startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        cycleDuration = moment.duration(nDays, "days");
        Object.assign(periodObject, {
            dateString: "D MMM",
            isSpecialPeriod: true
        });
    }
    else if (/([0-9]+)weeks/.test(period)) {
        let nDays = parseInt(/([0-9]+)weeks/.exec(period)[1]) * 7;
        if (nDays < 1) {
            nDays = 30; //if there is less than 1 day
        }
        startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        cycleDuration = moment.duration(nDays, "days");
        Object.assign(periodObject, {
            dateString: "D MMM",
            isSpecialPeriod: true
        });
    }
    else if (/([0-9]+)months/.test(period)) {
        let nDays = parseInt(/([0-9]+)months/.exec(period)[1]) * 30;
        if (nDays < 1) {
            nDays = 30; //if there is less than 1 day
        }
        startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        cycleDuration = moment.duration(nDays, "days");
        Object.assign(periodObject, {
            dateString: "D MMM",
            isSpecialPeriod: true
        });
    }
    //incorrect period, defaulting to 30 days
    else {
        let nDays = 30;

        startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        cycleDuration = moment.duration(nDays, "days");
        Object.assign(periodObject, {
            dateString: "D MMM",
            isSpecialPeriod: true
        });
    }

    Object.assign(periodObject, {
        start: startTimestamp.valueOf(),
        end: endTimestamp.valueOf(),
        daysInPeriod: Math.round(moment.duration(endTimestamp - startTimestamp).asDays()),
        periodContainsToday: (startTimestamp <= _currMoment) && (_currMoment <= endTimestamp),
    });

    for (let dayIt = startTimestamp.clone(); dayIt < endTimestamp; dayIt.add(1, "day")) {
        periodObject.currentPeriodArr.push(dayIt.format("YYYY.M.D"));
        periodObject.previousPeriodArr.push(dayIt.clone().subtract(cycleDuration).format("YYYY.M.D"));
    }

    periodObject.uniquePeriodArr = getTicksBetween(startTimestamp, endTimestamp);
    periodObject.uniquePeriodCheckArr = getTicksCheckBetween(startTimestamp, endTimestamp);
    periodObject.previousUniquePeriodArr = getTicksBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));
    periodObject.previousUniquePeriodCheckArr = getTicksCheckBetween(startTimestamp.clone().subtract(cycleDuration), endTimestamp.clone().subtract(cycleDuration));

    let zeroIDs = new Set(),
        monthIDs = new Set();

    for (let index in periodObject.currentPeriodArr) {
        let [year, month] = periodObject.currentPeriodArr[index].split("."),
            [prevYear, prevMonth] = periodObject.previousPeriodArr[index].split(".");

        zeroIDs.add(year + ":0");
        monthIDs.add(year + ":" + month);
        zeroIDs.add(prevYear + ":0");
        monthIDs.add(prevYear + ":" + prevMonth);
    }

    periodObject.reqZeroDbDateIds = Array.from(zeroIDs);
    periodObject.reqMonthDbDateIds = Array.from(monthIDs);

    return periodObject;
}

// Public Properties
/**
* Currently selected period
* @property {number} start - period start timestamp in miliseconds
* @property {number} end - period end timestamp in miliseconds
* @property {array} currentPeriodArr - array with ticks for current period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...]
* @property {array} previousPeriodArr - array with ticks for previous period (available only for special periods), example ["2016.12.22","2016.12.23","2016.12.24", ...]
* @property {string} dateString - date format to use when outputting date in graphs, example D MMM, YYYY
* @property {boolean} isSpecialPeriod - true if current period is special period, false if it is not
* @property {number} daysInPeriod - amount of full days in selected period, example 30
* @property {boolean} periodContainsToday - true if period contains today, false if not
* @property {array} uniquePeriodArr - array with ticks for current period which contains data for unique values, like unique users, example ["2016.12.22","2016.w52","2016.12.30", ...]
* @property {array} uniquePeriodCheckArr - array with ticks for higher buckets to current period unique value estimation, example ["2016.w51","2016.w52","2016.w53","2017.1",...]
* @property {array} previousUniquePeriodArr - array with ticks for previous period which contains data for unique values, like unique users, example ["2016.12.22","2016.w52","2016.12.30"]
* @property {array} previousUniquePeriodCheckArr - array with ticks for higher buckets to previous period unique value estimation, example ["2016.w47","2016.w48","2016.12"]
* @property {string} activePeriod - period name formatted in dateString (available in non-special periods)
* @property {string} previousPeriod - previous period name formatted in dateString (available in non-special periods)
* @property {number} periodMax - max value of current period tick (available in non-special periods)
* @property {number} periodMin - min value of current period tick (available in non-special periods)
* @property {array} reqMonthDbDateIds - metric model month document ids to query for this period
* @property {array} reqZeroDbDateIds - metric model year document ids to query for this period
* @example <caption>Special period object (7days)</caption>
* {
*    "start":1487721600000,
*    "end":1488326399000,
*    "activePeriod":"NA",
*    "periodMax":"NA",
*    "periodMin":"NA",
*    "previousPeriod":"NA",
*    "currentPeriodArr":["2017.2.22","2017.2.23","2017.2.24","2017.2.25","2017.2.26","2017.2.27","2017.2.28"],
*    "previousPeriodArr":["2017.2.15","2017.2.16","2017.2.17","2017.2.18","2017.2.19","2017.2.20","2017.2.21"],
*    "uniquePeriodArr":["2017.2.22","2017.2.23","2017.2.24","2017.2.25","2017.w9"],
*    "uniquePeriodCheckArr":["2017.w8","2017.w9"],
*    "previousUniquePeriodArr":["2017.2.15","2017.2.16","2017.2.17","2017.2.18","2017.2.19","2017.2.20","2017.2.21"],
*    "previousUniquePeriodCheckArr":["2017.w7","2017.w8"],
*    "dateString":"D MMM",
*    "daysInPeriod":7,
*    "isSpecialPeriod":true,
*    "reqMonthDbDateIds":["2017:2"],
*    "reqZeroDbDateIds":["2017:0"],
*    "periodContainsToday":true
* }
* @example <caption>Simple period object (today period - hour)</caption>
* {
*    "start":1488240000000,
*    "end":1488326399000,
*    "activePeriod":"2017.2.28",
*    "periodMax":11,
*    "periodMin":0,
*    "previousPeriod":"2017.2.27",
*    "currentPeriodArr":["2017.2.28"],
*    "previousPeriodArr":["2017.2.27"],
*    "uniquePeriodArr":[],
*    "uniquePeriodCheckArr":[],
*    "previousUniquePeriodArr":[],
*    "previousUniquePeriodCheckArr":[],
*    "dateString":"HH:mm",
*    "daysInPeriod":1,
*    "isSpecialPeriod":false,
*    "reqMonthDbDateIds":["2017:2"],
*    "reqZeroDbDateIds":["2017:0"],
*    "periodContainsToday":true
* }
*/
countlyCommon.periodObj = getPeriodObject();

// Public Methods

/**
* Change timezone of internal Date object
* @param {string} appTimezone - name of the timezone
*/
countlyCommon.setTimezone = function(appTimezone) {
    if (appTimezone && appTimezone.length) {
        _appTimezone = appTimezone;
        _currMoment = moment();
        _currMoment.tz(appTimezone);
        countlyCommon.periodObj = getPeriodObject();
    }
};

/**
* Change currently selected period
* @param {string|array} period - new period, supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
*/
countlyCommon.setPeriod = function(period) {
    _period = period;
    countlyCommon.periodObj = getPeriodObject();
};

/**
* Calculates the percent change between previous and current values.
* @param {number} previous - data for previous period
* @param {number} current - data for current period
* @returns {object} in the following format {"percent": "20%", "trend": "u"}
* @example
*   //outputs {"percent":"100%","trend":"u"}
*   countlyCommon.getPercentChange(100, 200);
*/
countlyCommon.getPercentChange = function(previous, current) {
    var pChange = 0,
        trend = "";

    if (previous === 0) {
        pChange = "NA";
        trend = "u"; //upward
    }
    else if (current === 0) {
        pChange = "∞";
        trend = "d"; //downward
    }
    else {
        var change = (((current - previous) / previous) * 100).toFixed(1);
        pChange = countlyCommon.getShortNumber(change) + "%";

        if (change < 0) {
            trend = "d";
        }
        else {
            trend = "u";
        }
    }

    return {
        "percent": pChange,
        "trend": trend
    };
};

/**
* Fetches nested property values from an obj.
* @param {object} obj - standard countly metric object
* @param {string} desc - dot separate path to fetch from object
* @returns {object} fetched object from provided path
* @example <caption>Path found</caption>
* //outputs {"u":20,"t":20,"n":5}
* countlyCommon.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
*/
countlyCommon.getDescendantProp = function(obj, desc) {
    desc = String(desc);

    if (desc.indexOf(".") === -1) {
        return obj[desc];
    }

    var arr = desc.split(".");
    while (arr.length && (obj = obj[arr.shift()])) {
        //operation done in check
    }

    return obj;
};

/**
* Extract range data from standard countly metric data model
* @param {object} db - countly standard metric data object
* @param {string} propertyName - name of the property to extract
* @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
* @param {function} explainRange - function to convert range/bucket index to meaningful label
* @returns {array} array containing extracted ranged data as [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
* @example <caption>Extracting session frequency from users collection</caption>
*    //outputs [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
*    countlyCommon.extractRangeData(_userDb, "f", _frequencies, countlySession.explainFrequencyRange);
*/
countlyCommon.extractRangeData = function(db, propertyName, rangeArray, explainRange) {

    countlyCommon.periodObj = getPeriodObject();

    var dataArr = [],
        dataArrCounter = 0,
        rangeTotal,
        total = 0;

    if (!rangeArray) {
        return dataArr;
    }

    for (let j = 0; j < rangeArray.length; j++) {

        rangeTotal = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            let tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

            if (tmp_x && tmp_x[rangeArray[j]]) {
                rangeTotal += tmp_x[rangeArray[j]];
            }

            if (rangeTotal !== 0) {
                dataArr[dataArrCounter] = {};
                dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                dataArr[dataArrCounter].t = rangeTotal;

                total += rangeTotal;
                dataArrCounter++;
            }
        }
        else {
            var tmpRangeTotal = 0;

            for (let i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                let tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    rangeTotal += tmp_x[rangeArray[j]];
                }
            }

            for (let i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                let tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    tmpRangeTotal += tmp_x[rangeArray[j]];
                }
            }

            if (rangeTotal > tmpRangeTotal) {
                rangeTotal = tmpRangeTotal;
            }

            if (rangeTotal !== 0) {
                dataArr[dataArrCounter] = {};
                dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                dataArr[dataArrCounter].t = rangeTotal;

                total += rangeTotal;
                dataArrCounter++;
            }
        }
    }

    for (let j = 0; j < dataArr.length; j++) {
        dataArr[j].percent = ((dataArr[j].t / total) * 100).toFixed(1);
    }

    dataArr.sort(function(a, b) {
        return -(a.t - b.t);
    });

    return dataArr;
};

/**
* Extract single level data without metrics/segments, like total user data from users collection
* @param {object} db - countly standard metric data object
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {object} chartData - prefill chart data with labels, colors, etc
* @param {object} dataProperties - describing which properties and how to extract
* @returns {object} object to use in timeline graph with {"chartDP":chartData, "chartData":_.compact(tableData), "keyEvents":keyEvents}
* @example <caption>Extracting total users data from users collection</caption>
* countlyCommon.extractChartData(_sessionDb, countlySession.clearObject, [
*      { data:[], label:"Total Users" }
*  ], [
*      {
*          name:"t",
*          func:function (dataObj) {
*              return dataObj["u"]
*          }
*      }
*  ]);
*  @example <caption>Returned data</caption>
* {"chartDP":[
*    {
*        "data":[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],[9,0],[10,0],[11,0],[12,0],[13,0],[14,0],[15,12]],
*        "label":"Total Sessions",
*        "color":"#DDDDDD",
*        "mode":"ghost"
*    },
*    {
*        "data":[[0,6],[1,14],[2,11],[3,18],[4,10],[5,32],[6,53],[7,55],[8,71],[9,82],[10,74],[11,69],[12,60],[13,17],[14,6],[15,3]],
*        "label":"Total Sessions",
*        "color":"#333933"
*    }
*  ],
*  "chartData":[
*    {"date":"22 Dec, 2016","pt":0,"t":6},
*    {"date":"23 Dec, 2016","pt":0,"t":14},
*    {"date":"24 Dec, 2016","pt":0,"t":11},
*    {"date":"25 Dec, 2016","pt":0,"t":18},
*    {"date":"26 Dec, 2016","pt":0,"t":10},
*    {"date":"27 Dec, 2016","pt":0,"t":32},
*    {"date":"28 Dec, 2016","pt":0,"t":53},
*    {"date":"29 Dec, 2016","pt":0,"t":55},
*    {"date":"30 Dec, 2016","pt":0,"t":71},
*    {"date":"31 Dec, 2016","pt":0,"t":82},
*    {"date":"1 Jan, 2017","pt":0,"t":74},
*    {"date":"2 Jan, 2017","pt":0,"t":69},
*    {"date":"3 Jan, 2017","pt":0,"t":60},
*    {"date":"4 Jan, 2017","pt":0,"t":17},
*    {"date":"5 Jan, 2017","pt":0,"t":6},
*    {"date":"6 Jan, 2017","pt":12,"t":3}
*  ],
*  "keyEvents":[{"min":0,"max":12},{"min":0,"max":82}]
* }
*/
countlyCommon.extractChartData = function(db, clearFunction, chartData, dataProperties) {

    countlyCommon.periodObj = getPeriodObject();

    var periodMin = countlyCommon.periodObj.periodMin,
        periodMax = (countlyCommon.periodObj.periodMax + 1),
        dataObj = {},
        formattedDate = "",
        tableData = [],
        propertyNames = underscore.pluck(dataProperties, "name"),
        propertyFunctions = underscore.pluck(dataProperties, "func"),
        currOrPrevious = underscore.pluck(dataProperties, "period"),
        activeDate,
        activeDateArr;

    for (var j = 0; j < propertyNames.length; j++) {
        if (currOrPrevious[j] === "previous") {
            if (countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                activeDateArr = countlyCommon.periodObj.previousPeriodArr;
            }
            else {
                activeDate = countlyCommon.periodObj.previousPeriod;
            }
        }
        else {
            if (countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                activeDateArr = countlyCommon.periodObj.currentPeriodArr;
            }
            else {
                activeDate = countlyCommon.periodObj.activePeriod;
            }
        }

        for (var i = periodMin; i < periodMax; i++) {

            if (!countlyCommon.periodObj.isSpecialPeriod) {

                if (countlyCommon.periodObj.periodMin === 0) {
                    formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                }
                else if (("" + activeDate).indexOf(".") === -1) {
                    formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                }
                else {
                    formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                }

                dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
            }
            else {
                formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
            }

            dataObj = clearFunction(dataObj);

            if (!tableData[i]) {
                tableData[i] = {};
            }

            tableData[i].date = formattedDate.format(countlyCommon.periodObj.dateString);

            var propertyValue;
            if (propertyFunctions[j]) {
                propertyValue = propertyFunctions[j](dataObj);
            }
            else {
                propertyValue = dataObj[propertyNames[j]];
            }

            chartData[j].data[chartData[j].data.length] = [i, propertyValue];
            tableData[i][propertyNames[j]] = propertyValue;
        }
    }

    var keyEvents = [];

    for (var k = 0; k < chartData.length; k++) {
        var flatChartData = underscore.flatten(chartData[k].data);
        var chartVals = underscore.reject(flatChartData, function(context, value) {
            return value % 2 === 0;
        });

        keyEvents[k] = {};
        keyEvents[k].min = underscore.min(chartVals);
        keyEvents[k].max = underscore.max(chartVals);
    }

    return {
        "chartDP": chartData,
        "chartData": underscore.compact(tableData),
        "keyEvents": keyEvents
    };
};

/**
* Get total data for period's each time bucket as comma separated string to generate sparkle/small bar lines
* @param {object} data - countly metric model data
* @param {object} props - object where key is output property name and value could be string as key from data object or function to create new value based on existing ones
* @param {function} clearObject - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @returns {object} object with sparkleline data for each property
* @example
* var sparkLines = countlyCommon.getSparklineData(countlySession.getDb(), {
*     "total-sessions": "t",
*     "new-users": "n",
*     "total-users": "u",
*     "total-duration": "d",
*     "events": "e",
*     "returning-users": function(tmp_x){return Math.max(tmp_x["u"] - tmp_x["n"], 0);},
*     "avg-duration-per-session": function(tmp_x){return (tmp_x["t"] === 0) ? 0 : (tmp_x["d"] / tmp_x["t"]);},
*     "avg-events": function(tmp_x){return (tmp_x["u"] === 0) ? 0 : (tmp_x["e"] / tmp_x["u"]);}
* }, countlySession.clearObject);
* //outputs
* {
*   "total-sessions":"73,84,80,72,61,18,11,7,17,27,66,39,41,36,39,36,6,11,6,16,22,30,33,34,32,41,29,9,2,2",
*   "new-users":"24,30,25,20,16,18,11,7,17,18,20,18,17,11,15,15,6,11,6,16,13,14,12,10,7,4,8,9,2,2",
*   "total-users":"45,54,50,44,37,18,11,7,17,27,36,39,41,36,39,36,6,11,6,16,22,30,33,34,32,29,29,9,2,2",
*   "total-duration":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
*   "events":"73,84,80,72,61,18,11,7,17,27,66,39,41,36,39,36,6,11,6,16,22,30,33,34,32,41,29,9,2,2",
*   "returning-users":"21,24,25,24,21,0,0,0,0,9,16,21,24,25,24,21,0,0,0,0,9,16,21,24,25,25,21,0,0,0",
*   "avg-duration-per-session":"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0",
*   "avg-events":"1.6222222222222222,1.5555555555555556,1.6,1.6363636363636365,1.6486486486486487,1,1,1,1,1,1.8333333333333333,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1.4137931034482758,1,1,1,1"
* }
*/
countlyCommon.getSparklineData = function(data, props, clearObject) {
    var _periodObj = countlyCommon.periodObj;
    var sparkLines = {};
    for (let p in props) {
        sparkLines[p] = [];
    }

    if (!_periodObj.isSpecialPeriod) {
        for (let i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
            let tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + "." + i);
            tmp_x = clearObject(tmp_x);

            for (let p in props) {
                if (typeof props[p] === "string") {
                    sparkLines[p].push(tmp_x[props[p]]);
                }
                else if (typeof props[p] === "function") {
                    sparkLines[p].push(props[p](tmp_x));
                }
            }
        }
    }
    else {
        for (let i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
            let tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[i]);
            tmp_x = clearObject(tmp_x);

            for (let p in props) {
                if (typeof props[p] === "string") {
                    sparkLines[p].push(tmp_x[props[p]]);
                }
                else if (typeof props[p] === "function") {
                    sparkLines[p].push(props[p](tmp_x));
                }
            }
        }
    }

    for (let key in sparkLines) {
        sparkLines[key] = sparkLines[key].join(",");
    }

    return sparkLines;
};

/**
* Extract two level data with metrics/segments, like total user data from carriers collection
* @param {object} db - countly standard metric data object
* @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {object} dataProperties - describing which properties and how to extract
* @param {object=} totalUserOverrideObj - data from total users api request to correct unique user values
* @returns {object} object to use in bar and pie charts with {"chartData":_.compact(tableData)}
* @example <caption>Extracting carriers data from carriers collection</caption>
* var chartData = countlyCommon.extractTwoLevelData(_carrierDb, ["At&t", "Verizon"], countlyCarrier.clearObject, [
*      {
*          name:"carrier",
*          func:function (rangeArr, dataObj) {
*              return rangeArr;
*          }
*      },
*      { "name":"t" },
*      { "name":"u" },
*      { "name":"n" }
* ]);
* @example <caption>Return data</caption>
* {"chartData":['
*    {"carrier":"At&t","t":71,"u":62,"n":36},
*    {"carrier":"Verizon","t":66,"u":60,"n":30}
* ]}
*/
countlyCommon.extractTwoLevelData = function(db, rangeArray, clearFunction, dataProperties, totalUserOverrideObj) {

    countlyCommon.periodObj = getPeriodObject();

    if (!rangeArray) {
        return {"chartData": tableData};
    }
    var periodMin = 0,
        periodMax = 0,
        dataObj = {},
        tableData = [],
        propertyNames = underscore.pluck(dataProperties, "name"),
        propertyFunctions = underscore.pluck(dataProperties, "func"),
        propertyValue = 0;

    if (!countlyCommon.periodObj.isSpecialPeriod) {
        periodMin = countlyCommon.periodObj.periodMin;
        periodMax = (countlyCommon.periodObj.periodMax + 1);
    }
    else {
        periodMin = 0;
        periodMax = countlyCommon.periodObj.currentPeriodArr.length;
    }

    var tableCounter = 0;

    if (!countlyCommon.periodObj.isSpecialPeriod) {
        for (let j = 0; j < rangeArray.length; j++) {
            dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

            if (!dataObj) {
                continue;
            }

            dataObj = clearFunction(dataObj);

            let propertySum = 0,
                tmpPropertyObj = {};

            for (let k = 0; k < propertyNames.length; k++) {

                if (propertyFunctions[k]) {
                    propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                }
                else {
                    propertyValue = dataObj[propertyNames[k]];
                }

                if (typeof propertyValue !== 'string') {
                    propertySum += propertyValue;
                }

                tmpPropertyObj[propertyNames[k]] = propertyValue;
            }

            if (propertySum > 0) {
                tableData[tableCounter] = {};
                tableData[tableCounter] = tmpPropertyObj;
                tableCounter++;
            }
        }
    }
    else {

        for (let j = 0; j < rangeArray.length; j++) {

            let tmpPropertyObj = {},
                tmp_x = {};

            for (let i = periodMin; i < periodMax; i++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }

                dataObj = clearFunction(dataObj);

                for (let k = 0; k < propertyNames.length; k++) {

                    if (propertyNames[k] === "u") {
                        propertyValue = 0;
                    }
                    else if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    }
                    else {
                        propertyValue = dataObj[propertyNames[k]];
                    }

                    if (!tmpPropertyObj[propertyNames[k]]) {
                        tmpPropertyObj[propertyNames[k]] = 0;
                    }

                    if (typeof propertyValue === 'string') {
                        tmpPropertyObj[propertyNames[k]] = propertyValue;
                    }
                    else {
                        tmpPropertyObj[propertyNames[k]] += propertyValue;
                    }
                }
            }

            if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                if (totalUserOverrideObj && typeof totalUserOverrideObj[rangeArray[j]] !== "undefined") {

                    tmpPropertyObj.u = totalUserOverrideObj[rangeArray[j]];

                }
                else {
                    var tmpUniqVal = 0,
                        tmpUniqValCheck = 0,
                        tmpCheckVal = 0;

                    for (let l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        propertyValue = tmp_x.u;

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj.u = propertyValue;
                        }
                        else {
                            tmpUniqVal += propertyValue;
                            tmpPropertyObj.u += propertyValue;
                        }
                    }

                    for (let l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        tmpCheckVal = tmp_x.u;

                        if (typeof tmpCheckVal !== 'string') {
                            tmpUniqValCheck += tmpCheckVal;
                        }
                    }

                    if (tmpUniqVal > tmpUniqValCheck) {
                        tmpPropertyObj.u = tmpUniqValCheck;
                    }
                }

                // Total users can't be less than new users
                if (tmpPropertyObj.u < tmpPropertyObj.n) {
                    tmpPropertyObj.u = tmpPropertyObj.n;
                }

                // Total users can't be more than total sessions
                if (tmpPropertyObj.u > tmpPropertyObj.t) {
                    tmpPropertyObj.u = tmpPropertyObj.t;
                }
            }

            tableData[tableCounter] = {};
            tableData[tableCounter] = tmpPropertyObj;
            tableCounter++;
        }
    }

    if (propertyNames.indexOf("u") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.u;
        });
    }
    else if (propertyNames.indexOf("t") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.t;
        });
    }
    else if (propertyNames.indexOf("c") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.c;
        });
    }

    for (let i = 0; i < tableData.length; i++) {
        if (underscore.isEmpty(tableData[i])) {
            tableData[i] = null;
        }
    }

    return {"chartData": underscore.compact(tableData)};
};

/**
* Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
* @param {object} db - countly standard metric data object
* @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {function} fetchFunction - function to fetch property, default used is function (rangeArr, dataObj) {return rangeArr;}
* @param {number} maxItems - amount of items to return, default 3
* @param {string=} metric - metric to output and use in sorting, default "t"
* @param {object=} totalUserOverrideObj - data from total users api request to correct unique user values
* @param {function} fixBarSegmentData - function to make any adjustments to the extracted data based on segment
* @returns {array} array with top 3 values
* @example <caption>Return data</caption>
* [
*    {"name":"iOS","percent":35},
*    {"name":"Android","percent":33},
*    {"name":"Windows Phone","percent":32}
* ]
*/
countlyCommon.extractBarData = function(db, rangeArray, clearFunction, fetchFunction, maxItems, metric, totalUserOverrideObj, fixBarSegmentData) {
    metric = metric || "t";
    maxItems = maxItems || 3;
    fetchFunction = fetchFunction || function(rangeArr) {
        return rangeArr;
    };
    var dataProps = [
        {
            name: "range",
            func: fetchFunction
        },
        { "name": metric }
    ];
        //include other default metrics for data correction
    if (metric === "u") {
        dataProps.push({name: "n"});
        dataProps.push({name: "t"});
    }
    if (metric === "n") {
        dataProps.push({name: "u"});
    }
    var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, dataProps, totalUserOverrideObj);

    if (fixBarSegmentData) {
        rangeData = fixBarSegmentData(rangeData);
    }

    rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, "range");
    rangeData.chartData = underscore.sortBy(rangeData.chartData, function(obj) {
        return -obj[metric];
    });
    var rangeNames = underscore.pluck(rangeData.chartData, 'range'),
        rangeTotal = underscore.pluck(rangeData.chartData, metric),
        barData = [],
        sum = 0,
        totalPercent = 0;

    rangeTotal.forEach(function(r) {
        sum += r;
    });

    for (let i = rangeNames.length - 1; i >= 0; i--) {
        var percent = countlyCommon.round((rangeTotal[i] / sum) * 100, 1);
        totalPercent += percent;

        barData[i] = {
            "name": rangeNames[i],
            value: rangeTotal[i],
            "percent": percent
        };
    }

    barData = countlyCommon.fixPercentageDelta(barData, totalPercent);

    if (rangeNames.length < maxItems) {
        maxItems = rangeNames.length;
    }

    barData = barData.slice(0, maxItems);

    return underscore.sortBy(barData, function(obj) {
        return -obj.value;
    });
};

/**
* Shortens the given number by adding K (thousand) or M (million) postfix. K is added only if the number is bigger than 10000, etc.
* @param {number} number - number to shorten
* @returns {string} shorter representation of number
* @example
* //outputs 10K
* countlyCommon.getShortNumber(10000);
*/
countlyCommon.getShortNumber = function(number) {

    var tmpNumber = "";

    if (number >= 1000000 || number <= -1000000) {
        tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
    }
    else if (number >= 10000 || number <= -10000) {
        tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
    }
    else {
        number += "";
        tmpNumber = number.replace(".0", "");
    }

    return tmpNumber;
};

/**
* Getting the date range shown on the dashboard like 1 Aug - 30 Aug, using {@link countlyCommon.periodObj) dateString property which holds the date format.
* @returns {string} string with  formatted date range as 1 Aug - 30 Aug
*/
countlyCommon.getDateRange = function() {

    countlyCommon.periodObj = getPeriodObject();
    var formattedDateStart, formattedDateEnd;
    if (!countlyCommon.periodObj.isSpecialPeriod) {
        if (countlyCommon.periodObj.dateString === "HH:mm") {
            formattedDateStart = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm");
            formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");

            var nowMin = _currMoment.format("mm");
            formattedDateEnd.add(nowMin, "minutes");

        }
        else if (countlyCommon.periodObj.dateString === "D MMM, HH:mm") {
            formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
            formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes");
        }
        else {
            formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
            formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
        }
    }
    else {
        formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
        formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D");
    }

    return formattedDateStart.format(countlyCommon.periodObj.dateString) + " - " + formattedDateEnd.format(countlyCommon.periodObj.dateString);
};

/**
* Extract single level data without metrics/segments, like total user data from users collection
* @param {object} db - countly standard metric data object
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {object} dataProperties - describing which properties and how to extract
* @returns {array} object to use in timeline graph
* @example <caption>Extracting total users data from users collection</caption>
* countlyCommon.extractData(_sessionDb, countlySession.clearObject, [
*     { name:"t" },
*     { name:"n" },
*     { name:"u" },
*     { name:"d" },
*     { name:"e" }
* ]);
* @example <caption>Returned data</caption>
* [
*    {"_id":"2017-1-30","t":6,"n":6,"u":6,"d":0,"e":6},
*    {"_id":"2017-1-31","t":2,"n":2,"u":2,"d":0,"e":2},
*    {"_id":"2017-2-1","t":5,"n":5,"u":5,"d":0,"e":5},
*    {"_id":"2017-2-2","t":5,"n":5,"u":5,"d":0,"e":5},
*    {"_id":"2017-2-3","t":8,"n":8,"u":8,"d":0,"e":8},
*    {"_id":"2017-2-4","t":7,"n":7,"u":7,"d":0,"e":7},
*    {"_id":"2017-2-5","t":6,"n":6,"u":6,"d":0,"e":6},
*    {"_id":"2017-2-6","t":5,"n":5,"u":5,"d":0,"e":5},
*    {"_id":"2017-2-7","t":6,"n":6,"u":6,"d":0,"e":6},
*    {"_id":"2017-2-8","t":5,"n":5,"u":5,"d":0,"e":5},
*    {"_id":"2017-2-9","t":4,"n":4,"u":4,"d":0,"e":4},
*    {"_id":"2017-2-10","t":6,"n":6,"u":6,"d":0,"e":6},
*    {"_id":"2017-2-11","t":8,"n":8,"u":8,"d":0,"e":8},
*    {"_id":"2017-2-12","t":3,"n":3,"u":3,"d":0,"e":3},
*    {"_id":"2017-2-13","t":8,"n":6,"u":7,"d":0,"e":8},
*    {"_id":"2017-2-14","t":7,"n":7,"u":7,"d":0,"e":7},
*    {"_id":"2017-2-15","t":4,"n":4,"u":4,"d":0,"e":4},
*    {"_id":"2017-2-16","t":2,"n":2,"u":2,"d":0,"e":2},
*    {"_id":"2017-2-17","t":4,"n":4,"u":4,"d":0,"e":4},
*    {"_id":"2017-2-18","t":14,"n":14,"u":14,"d":0,"e":14},
*    {"_id":"2017-2-19","t":20,"n":11,"u":20,"d":0,"e":20},
*    {"_id":"2017-2-20","t":25,"n":9,"u":25,"d":0,"e":25},
*    {"_id":"2017-2-21","t":33,"n":12,"u":33,"d":0,"e":33},
*    {"_id":"2017-2-22","t":36,"n":12,"u":36,"d":0,"e":36},
*    {"_id":"2017-2-23","t":37,"n":12,"u":37,"d":0,"e":37},
*    {"_id":"2017-2-24","t":29,"n":5,"u":29,"d":0,"e":29},
*    {"_id":"2017-2-25","t":28,"n":7,"u":28,"d":0,"e":28},
*    {"_id":"2017-2-26","t":3,"n":3,"u":3,"d":0,"e":3},
*    {"_id":"2017-2-27","t":3,"n":3,"u":3,"d":0,"e":3},
*    {"_id":"2017-2-28","t":7,"n":7,"u":7,"d":0,"e":7}
* ]
*/
countlyCommon.extractData = function(db, clearFunction, dataProperties) {

    countlyCommon.periodObj = getPeriodObject();

    var periodMin = countlyCommon.periodObj.periodMin,
        periodMax = (countlyCommon.periodObj.periodMax + 1),
        dataObj = {},
        formattedDate = "",
        tableData = [],
        propertyNames = underscore.pluck(dataProperties, "name"),
        propertyFunctions = underscore.pluck(dataProperties, "func"),
        currOrPrevious = underscore.pluck(dataProperties, "period"),
        activeDate,
        activeDateArr;

    for (var j = 0; j < propertyNames.length; j++) {
        if (currOrPrevious[j] === "previous") {
            if (countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                activeDateArr = countlyCommon.periodObj.previousPeriodArr;
            }
            else {
                activeDate = countlyCommon.periodObj.previousPeriod;
            }
        }
        else {
            if (countlyCommon.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                activeDateArr = countlyCommon.periodObj.currentPeriodArr;
            }
            else {
                activeDate = countlyCommon.periodObj.activePeriod;
            }
        }
        var dateString = "";
        for (var i = periodMin; i < periodMax; i++) {

            if (!countlyCommon.periodObj.isSpecialPeriod) {

                if (countlyCommon.periodObj.periodMin === 0) {
                    dateString = "YYYY-M-D H:00";
                    formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                }
                else if (("" + activeDate).indexOf(".") === -1) {
                    dateString = "YYYY-M";
                    formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                }
                else {
                    dateString = "YYYY-M-D";
                    formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                }

                dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
            }
            else {
                dateString = "YYYY-M-D";
                formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
            }

            dataObj = clearFunction(dataObj);

            if (!tableData[i]) {
                tableData[i] = {};
            }

            tableData[i]._id = formattedDate.format(dateString);
            var propertyValue;
            if (propertyFunctions[j]) {
                propertyValue = propertyFunctions[j](dataObj);
            }
            else {
                propertyValue = dataObj[propertyNames[j]];
            }
            tableData[i][propertyNames[j]] = propertyValue;
        }
    }

    return underscore.compact(tableData);
};

/**
* Extract metrics data break down by segments, like total user by carriers
* @param {object} db - countly standard metric data object
* @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {object} dataProperties - describing which properties and how to extract
* @param {object=} totalUserOverrideObj - data from total users api request to correct unique user values
* @returns {array} object to use in timeline graph
* @example <caption>Extracting total users data from users collection</caption>
* countlyCommon.extractData(countlyCarriers.getDb(), countlyCarriers.getMeta(), countlyCarriers.clearObject, [
*     {
*         name:"carriers",
*         func:function (rangeArr, dataObj) {
*             return rangeArr;
*         }
*     },
*     { "name":"t" },
*     { "name":"n" },
*     { "name":"u" }
* ]);
* @example <caption>Returned data</caption>
* [
*    {"_id":"Cricket Communications","t":37,"n":21,"u":34},
*    {"_id":"Tele2","t":32,"n":19,"u":31},
*    {"_id":"\tAt&amp;t","t":32,"n":20,"u":31},
*    {"_id":"O2","t":26,"n":19,"u":26},
*    {"_id":"Metro Pcs","t":28,"n":13,"u":26},
*    {"_id":"Turkcell","t":23,"n":11,"u":23},
*    {"_id":"Telus","t":22,"n":15,"u":22},
*    {"_id":"Rogers Wireless","t":21,"n":13,"u":21},
*    {"_id":"Verizon","t":21,"n":11,"u":21},
*    {"_id":"Sprint","t":21,"n":11,"u":20},
*    {"_id":"Vodafone","t":22,"n":12,"u":19},
*    {"_id":"Orange","t":18,"n":12,"u":18},
*    {"_id":"T-mobile","t":17,"n":9,"u":17},
*    {"_id":"Bell Canada","t":12,"n":6,"u":12}
* ]
*/
countlyCommon.extractMetric = function(db, rangeArray, clearFunction, dataProperties, totalUserOverrideObj) {

    countlyCommon.periodObj = getPeriodObject();

    var tableData = [];
    if (!rangeArray) {
        return tableData;
    }
    var periodMin = 0,
        periodMax = 0,
        dataObj = {},
        propertyNames = underscore.pluck(dataProperties, "name"),
        propertyFunctions = underscore.pluck(dataProperties, "func"),
        propertyValue = 0;

    if (!countlyCommon.periodObj.isSpecialPeriod) {
        periodMin = countlyCommon.periodObj.periodMin;
        periodMax = (countlyCommon.periodObj.periodMax + 1);
    }
    else {
        periodMin = 0;
        periodMax = countlyCommon.periodObj.currentPeriodArr.length;
    }

    var tableCounter = 0;

    if (!countlyCommon.periodObj.isSpecialPeriod) {
        for (let j = 0; j < rangeArray.length; j++) {
            dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

            if (!dataObj) {
                continue;
            }

            dataObj = clearFunction(dataObj);

            let propertySum = 0,
                tmpPropertyObj = {};

            for (let k = 0; k < propertyNames.length; k++) {

                if (propertyFunctions[k]) {
                    propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                }
                else {
                    propertyValue = dataObj[propertyNames[k]];
                }

                if (typeof propertyValue !== 'string') {
                    propertySum += propertyValue;
                }
                if (propertyFunctions[k]) {
                    tmpPropertyObj._id = propertyValue;
                }
                else {
                    tmpPropertyObj[propertyNames[k]] = propertyValue;
                }
            }

            if (propertySum > 0) {
                tableData[tableCounter] = {};
                tableData[tableCounter] = tmpPropertyObj;
                tableCounter++;
            }
        }
    }
    else {

        for (let j = 0; j < rangeArray.length; j++) {

            let tmpPropertyObj = {},
                tmp_x = {};

            for (let i = periodMin; i < periodMax; i++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }

                dataObj = clearFunction(dataObj);

                for (let k = 0; k < propertyNames.length; k++) {

                    if (propertyNames[k] === "u") {
                        propertyValue = 0;
                    }
                    else if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    }
                    else {
                        propertyValue = dataObj[propertyNames[k]];
                    }

                    if (propertyFunctions[k]) {
                        tmpPropertyObj._id = propertyValue;
                    }
                    else {
                        if (!tmpPropertyObj[propertyNames[k]]) {
                            tmpPropertyObj[propertyNames[k]] = 0;
                        }

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj[propertyNames[k]] = propertyValue;
                        }
                        else {
                            tmpPropertyObj[propertyNames[k]] += propertyValue;
                        }
                    }
                }
            }

            if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                if (totalUserOverrideObj && typeof totalUserOverrideObj[rangeArray[j]] !== "undefined") {

                    tmpPropertyObj.u = totalUserOverrideObj[rangeArray[j]];

                }
                else {
                    var tmpUniqVal = 0,
                        tmpUniqValCheck = 0,
                        tmpCheckVal = 0;

                    for (let l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        propertyValue = tmp_x.u;

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj.u = propertyValue;
                        }
                        else {
                            tmpUniqVal += propertyValue;
                            tmpPropertyObj.u += propertyValue;
                        }
                    }

                    for (let l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        tmpCheckVal = tmp_x.u;

                        if (typeof tmpCheckVal !== 'string') {
                            tmpUniqValCheck += tmpCheckVal;
                        }
                    }

                    if (tmpUniqVal > tmpUniqValCheck) {
                        tmpPropertyObj.u = tmpUniqValCheck;
                    }
                }

                // Total users can't be less than new users
                if (tmpPropertyObj.u < tmpPropertyObj.n) {
                    tmpPropertyObj.u = tmpPropertyObj.n;
                }

                // Total users can't be more than total sessions
                if (tmpPropertyObj.u > tmpPropertyObj.t) {
                    tmpPropertyObj.u = tmpPropertyObj.t;
                }
            }

            tableData[tableCounter] = {};
            tableData[tableCounter] = tmpPropertyObj;
            tableCounter++;
        }
    }

    if (propertyNames.indexOf("u") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.u;
        });
    }
    else if (propertyNames.indexOf("t") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.t;
        });
    }
    else if (propertyNames.indexOf("c") !== -1) {
        tableData = underscore.sortBy(tableData, function(obj) {
            return -obj.c;
        });
    }

    for (var i = 0; i < tableData.length; i++) {
        if (underscore.isEmpty(tableData[i])) {
            tableData[i] = null;
        }
    }

    return underscore.compact(tableData);
};

/**
* Format duration into highest unit of how much time have passed. Used in big numbers
* @param {number} timespent - amount in seconds or miliseconds passed since some reference point
* @returns {string} formated time with how much highest units passed
* @example
* //outputs 2824.7 yrs
* countlyCommon.timeString(1484654066);
*/
countlyCommon.timeString = function(timespent) {
    if (timespent.toString().length === 13) {
        timespent = Math.round(timespent / 1000);
    }
    var timeSpentString = (timespent.toFixed(1)) + " min";

    if (timespent >= 142560) {
        timeSpentString = (timespent / 525600).toFixed(1) + " years";
    }
    else if (timespent >= 1440) {
        timeSpentString = (timespent / 1440).toFixed(1) + " days";
    }
    else if (timespent >= 60) {
        timeSpentString = (timespent / 60).toFixed(1) + " hours";
    }
    return timeSpentString;
};

/**
* Get calculated totals for each property, usualy used as main dashboard data timeline data without metric segments
* @param {object} data - countly metric model data
* @param {array} properties - array of all properties to extract
* @param {array} unique - array of all properties that are unique from properties array. We need to apply estimation to them
* @param {object} totalUserOverrideObj - using unique property as key and total_users estimation property as value for all unique metrics that we want to have total user estimation overridden
* @param {object} prevTotalUserOverrideObj - using unique property as key and total_users estimation property as value for all unique metrics that we want to have total user estimation overridden for previous period
* @returns {object} dashboard data object
* @example
* countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u:"users"});
* //outputs
* {
*      "t":{"total":980,"prev-total":332,"change":"195.2%","trend":"u"},
*      "n":{"total":402,"prev-total":255,"change":"57.6%","trend":"u"},
*      "u":{"total":423,"prev-total":255,"change":"75.7%","trend":"u","isEstimate":false},
*      "d":{"total":0,"prev-total":0,"change":"NA","trend":"u"},
*      "e":{"total":980,"prev-total":332,"change":"195.2%","trend":"u"},
*      "p":{"total":103,"prev-total":29,"change":"255.2%","trend":"u","isEstimate":true},
*      "m":{"total":86,"prev-total":0,"change":"NA","trend":"u","isEstimate":true}
* }
*/
countlyCommon.getDashboardData = function(data, properties, unique, totalUserOverrideObj, prevTotalUserOverrideObj) {
    /**
    * Clear object, bu nulling out predefined properties, that does not exist
    * @param {object} obj - object to clear
    * @returns {object} cleard objects
    **/
    function clearObject(obj) {
        if (obj) {
            for (let i = 0; i < properties.length; i++) {
                if (!obj[properties[i]]) {
                    obj[properties[i]] = 0;
                }
            }
        }
        else {
            obj = {};
            for (let i = 0; i < properties.length; i++) {
                obj[properties[i]] = 0;
            }
        }

        return obj;
    }

    var _periodObj = countlyCommon.periodObj,
        dataArr = {},
        tmp_x,
        tmp_y,
        tmpUniqObj,
        tmpPrevUniqObj,
        current = {},
        previous = {},
        currentCheck = {},
        previousCheck = {},
        change = {},
        isEstimate = false;

    for (let i = 0; i < properties.length; i++) {
        current[properties[i]] = 0;
        previous[properties[i]] = 0;
        currentCheck[properties[i]] = 0;
        previousCheck[properties[i]] = 0;
    }

    if (_periodObj.isSpecialPeriod) {
        isEstimate = true;
        for (let j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j]);
            tmp_x = clearObject(tmp_x);
            for (let i = 0; i < properties.length; i++) {
                if (unique.indexOf(properties[i]) === -1) {
                    current[properties[i]] += tmp_x[properties[i]];
                }
            }
        }

        for (let j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j]);
            tmp_y = clearObject(tmp_y);
            for (let i = 0; i < properties.length; i++) {
                if (unique.indexOf(properties[i]) === -1) {
                    previous[properties[i]] += tmp_y[properties[i]];
                }
            }
        }

        //deal with unique values separately
        for (let j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodArr[j]);
            tmp_x = clearObject(tmp_x);
            for (let i = 0; i < unique.length; i++) {
                current[unique[i]] += tmp_x[unique[i]];
            }
        }

        for (let j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j]);
            tmp_y = clearObject(tmp_y);
            for (let i = 0; i < unique.length; i++) {
                previous[unique[i]] += tmp_y[unique[i]];
            }
        }

        //recheck unique values with larger buckets
        for (let j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
            tmpUniqObj = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j]);
            tmpUniqObj = clearObject(tmpUniqObj);
            for (let i = 0; i < unique.length; i++) {
                currentCheck[unique[i]] += tmpUniqObj[unique[i]];
            }
        }

        for (let j = 0; j < (_periodObj.previousUniquePeriodCheckArr.length); j++) {
            tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodCheckArr[j]);
            tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
            for (let i = 0; i < unique.length; i++) {
                previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
            }
        }

        //check if we should overwrite uniques
        for (let i = 0; i < unique.length; i++) {
            if (current[unique[i]] > currentCheck[unique[i]]) {
                current[unique[i]] = currentCheck[unique[i]];
            }

            if (previous[unique[i]] > previousCheck[unique[i]]) {
                previous[unique[i]] = previousCheck[unique[i]];
            }
        }

    }
    else {
        tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod);
        tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod);
        tmp_x = clearObject(tmp_x);
        tmp_y = clearObject(tmp_y);

        for (let i = 0; i < properties.length; i++) {
            current[properties[i]] = tmp_x[properties[i]];
            previous[properties[i]] = tmp_y[properties[i]];
        }
    }

    //check if we can correct data using total users correction
    if (totalUserOverrideObj) {
        for (let i = 0; i < unique.length; i++) {
            if (typeof current[unique[i]] !== "undefined" && typeof totalUserOverrideObj[unique[i]] !== "undefined" && totalUserOverrideObj[unique[i]]) {
                current[unique[i]] = totalUserOverrideObj[unique[i]];
            }
        }
    }

    if (prevTotalUserOverrideObj) {
        for (let i = 0; i < unique.length; i++) {
            if (typeof previous[unique[i]] !== "undefined" && typeof prevTotalUserOverrideObj[unique[i]] !== "undefined" && prevTotalUserOverrideObj[unique[i]]) {
                previous[unique[i]] = prevTotalUserOverrideObj[unique[i]];
            }
        }
    }

    // Total users can't be less than new users
    if (typeof current.u !== "undefined" && typeof current.n !== "undefined" && current.u < current.n) {
        if (totalUserOverrideObj && typeof totalUserOverrideObj.u !== "undefined") {
            current.n = current.u;
        }
        else {
            current.u = current.n;
        }
    }

    // Total users can't be more than total sessions
    if (typeof current.u !== "undefined" && typeof current.t !== "undefined" && current.u > current.t) {
        current.u = current.t;
    }

    for (let i = 0; i < properties.length; i++) {
        change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
        dataArr[properties[i]] = {
            "total": current[properties[i]],
            "prev-total": previous[properties[i]],
            "change": change[properties[i]].percent,
            "trend": change[properties[i]].trend
        };
        if (unique.indexOf(properties[i]) !== -1) {
            dataArr[properties[i]].is_estimate = isEstimate;
        }
    }

    //check if we can correct data using total users correction
    if (totalUserOverrideObj) {
        for (let i = 0; i < unique.length; i++) {
            if (dataArr[unique[i]] && typeof totalUserOverrideObj[unique[i]] !== "undefined") {
                dataArr[unique[i]].is_estimate = false;
            }
        }
    }

    return dataArr;
};

/**
* Get timestamp query range based on request data using period and app's timezone
* @param {params} params - params object
* @param {boolean} inSeconds - if true will output result in seconds, else in miliseconds
* @returns {object} mongodb query object with preset ts field to be queried
* @example
* countlyCommon.getTimestampRangeQuery(params, true)
* //outputs
* {
*    $gte:1488259482,
*    $lte:1488279482
* }
*/
countlyCommon.getTimestampRangeQuery = function(params, inSeconds) {
    var periodObj = countlyCommon.getPeriodObj(params);
    var now = (params.time && params.time.now) ? params.time.now : moment();
    //create current period array if it does not exist
    if (!periodObj.currentPeriodArr || periodObj.currentPeriodArr.length === 0) {
        periodObj.currentPeriodArr = [];

        //create a period array that starts from the beginning of the current year until today
        if (params.qstring.period === "month") {
            for (let i = 0; i < (now.getMonth() + 1); i++) {
                var daysInMonth = moment().month(i).daysInMonth();

                for (let j = 0; j < daysInMonth; j++) {
                    periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));

                    // If current day of current month, just break
                    if ((i === now.getMonth()) && (j === (now.getDate() - 1))) {
                        break;
                    }
                }
            }
        }
        //create a period array that starts from the beginning of the current month until today
        else if (params.qstring.period === "day") {
            for (let i = 0; i < now.getDate(); i++) {
                periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1));
            }
        }
        //create one day period array
        else {
            periodObj.currentPeriodArr.push(periodObj.activePeriod);
        }
    }
    var tmpArr;
    var ts = {};

    tmpArr = periodObj.currentPeriodArr[0].split(".");
    ts.$gte = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2]))));
    if (params.appTimezone) {
        ts.$gte.tz(params.appTimezone);
    }
    if (inSeconds) {
        ts.$gte = ts.$gte.valueOf() / 1000 - ts.$gte.utcOffset() * 60;
    }
    else {
        ts.$gte = ts.$gte.valueOf() - ts.$gte.utcOffset() * 60000;
    }

    tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
    ts.$lt = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])))).add(1, 'days');
    if (params.appTimezone) {
        ts.$lt.tz(params.appTimezone);
    }
    if (inSeconds) {
        ts.$lt = ts.$lt.valueOf() / 1000 - ts.$lt.utcOffset() * 60;
    }
    else {
        ts.$lt = ts.$lt.valueOf() - ts.$lt.utcOffset() * 60000;
    }
    return ts;
};

/**
* Merge metric data in chartData returned by @{link countlyCommon.extractChartData} or @{link countlyCommon.extractTwoLevelData }, just in case if after data transformation of countly standard metric data model, resulting chartData contains duplicated values, as for example converting null, undefined and unknown values to unknown
* @param {object} chartData - chartData returned by @{link countlyCommon.extractChartData} or @{link countlyCommon.extractTwoLevelData }
* @param {string} metric - metric name to merge
* @returns {object} chartData object with same metrics summed up
* @example <caption>Sample input</caption>
*    {"chartData":[
*        {"metric":"Test","t":71,"u":62,"n":36},
*        {"metric":"Test1","t":66,"u":60,"n":30},
*        {"metric":"Test","t":2,"u":3,"n":4}
*    ]}
* @example <caption>Sample output</caption>
*    {"chartData":[
*        {"metric":"Test","t":73,"u":65,"n":40},
*        {"metric":"Test1","t":66,"u":60,"n":30}
*    ]}
*/
countlyCommon.mergeMetricsByName = function(chartData, metric) {
    var uniqueNames = {},
        data;
    for (var i = 0; i < chartData.length; i++) {
        data = chartData[i];
        if (data[metric] && !uniqueNames[data[metric]]) {
            uniqueNames[data[metric]] = data;
        }
        else {
            for (var key in data) {
                if (typeof data[key] === "string") {
                    if (uniqueNames[data[metric]]) {
                        uniqueNames[data[metric]][key] = data[key];
                    }
                }
                else if (typeof data[key] === "number") {
                    if (uniqueNames[data[metric]]) {
                        if (!uniqueNames[data[metric]][key]) {
                            uniqueNames[data[metric]][key] = 0;
                        }
                        uniqueNames[data[metric]][key] += data[key];
                    }
                }
            }
        }
    }

    return underscore.values(uniqueNames);
};

/**
* Joined 2 arrays into one removing all duplicated values
* @param {array} x - first array
* @param {array} y - second array
* @returns {array} new array with only unique values from x and y
* @example
* //outputs [1,2,3]
* countlyCommon.union([1,2],[2,3]);
*/
countlyCommon.union = function(x, y) {
    if (!x) {
        return y;
    }
    else if (!y) {
        return x;
    }

    var obj = {};
    for (let i = x.length - 1; i >= 0; --i) {
        obj[x[i]] = true;
    }

    for (let i = y.length - 1; i >= 0; --i) {
        obj[y[i]] = true;
    }

    var res = [];

    for (let k in obj) {
        res.push(k);
    }

    return res;
};

/**
* Encode value to be passed to db as key, encoding $ symbol to &#36; if it is first and all . (dot) symbols to &#46; in the string
* @param {string} str - value to encode
* @returns {string} encoded string
*/
countlyCommon.encode = function(str) {
    return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
};

/**
* Decode value from db, decoding first &#36; to $ and all &#46; to . (dots). Decodes also url encoded values as &amp;#36;.
* @param {string} str - value to decode
* @returns {string} decoded string
*/
countlyCommon.decode = function(str) {
    return str.replace(/^&#36;/g, "$").replace(/^&amp;#36;/g, '$').replace(/&#46;/g, '.').replace(/&amp;#46;/g, '.');
};

/**
* Get period object in atomic way from params,
* getting params.qstring.period for period
* and params.appTimezone for timezone
* @param {params} params - params object with app timezone and period
* @param {(string|string[]|number[])} defaultPeriod - default period value in case it's not supplied in the params
* @returns {module:api/lib/countly.common.periodObj} period object
*/
countlyCommon.getPeriodObj = function(params, defaultPeriod = "30days") {
    let appTimezone = params.appTimezone || (params.app && params.app.timezone);

    params.qstring.period = params.qstring.period || defaultPeriod;
    if (params.qstring.period && typeof params.qstring.period === "string" && params.qstring.period.indexOf(",") !== -1) {
        try {
            params.qstring.period = JSON.parse(params.qstring.period);
        }
        catch (SyntaxError) {
            console.log("period JSON parse failed");
            params.qstring.period = defaultPeriod;
        }
    }
    _period = params.qstring.period;

    if (appTimezone && appTimezone.length) {
        _appTimezone = appTimezone;

        _currMoment = moment().tz(appTimezone);
        _currMoment.tz(appTimezone);
    }

    countlyCommon.periodObj = getPeriodObject();
    return countlyCommon.periodObj;
};

/**
* Validate email address
* @param {string} email - email address to validate
* @returns {boolean} true if valid and false if invalid
* @example
* //outputs true
* countlyCommon.validateEmail("test@test.test");
*
* //outputs false
* countlyCommon.validateEmail("test@test");
*/
countlyCommon.validateEmail = function(email) {
    var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    return re.test(email);
};

/**
* Round to provided number of digits
* @memberof countlyCommon
* @param {number} num - number to round
* @param {number} digits - amount of digits to round to
* @returns {number} rounded number
* @example
* //outputs 1.235
* countlyCommon.round(1.2345, 3);
*/
countlyCommon.round = function(num, digits) {
    digits = Math.pow(10, digits || 0);
    return Math.round(num * digits) / digits;
};

/**
 * Function to fix percentage difference
 * @param  {Array} items - All items
 * @param  {Number} totalPercent - Total percentage so far
 * @returns {Array} items
 */
countlyCommon.fixPercentageDelta = function(items, totalPercent) {
    if (!items.length) {
        return items;
    }

    var deltaFixEl = 0;
    if (totalPercent < 100) {
        //Add the missing delta to the first value
        deltaFixEl = 0;
    }
    else if (totalPercent > 100) {
        //Subtract the extra delta from the last value
        deltaFixEl = items.length - 1;
    }

    items[deltaFixEl].percent += 100 - totalPercent;
    items[deltaFixEl].percent = countlyCommon.round(items[deltaFixEl].percent, 1);

    return items;
};

/**
* Calculate period function
* @param {object} period - given period
* @returns {object} returns {@link countlyCommon.periodObj}
*/
countlyCommon.calculatePeriodObject = function(period) {
    return getPeriodObject(period);
};

module.exports = countlyCommon;