/**
* This module defines default model to handle users collection data
* @module "api/lib/countly.common"
*/

/** @lends module:api/lib/countly.common */
var countlyCommon = {},
    time = require('time')(Date),
    moment = require('moment'),
    underscore = require('underscore');

(function (countlyCommon) {

    // Private Properties
    var _period = "hour",
        _appTimezone = "UTC",
        _currMoment = moment();

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
    countlyCommon.periodObj = getPeriodObj();

    // Public Methods

    /**
    * Change timezone of internal Date object
    * @param {string} appTimezone - name of the timezone
    */
    countlyCommon.setTimezone = function(appTimezone) {
        _appTimezone = appTimezone;

        var currTime = new Date();
        currTime.setTimezone(appTimezone);

        _currMoment = moment(currTime);

        countlyCommon.periodObj = getPeriodObj();
    };

    /**
    * Change currently selected period
    * @param {string|array} period - new period, supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
    */
    countlyCommon.setPeriod = function(period) {
        _period = period;
        countlyCommon.periodObj = getPeriodObj();
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
    countlyCommon.getPercentChange = function (previous, current) {
        var pChange = 0,
            trend = "";

        if (previous == 0) {
            pChange = "NA";
            trend = "u"; //upward
        } else if (current == 0) {
            pChange = "∞";
            trend = "d"; //downward
        } else {
            var change = (((current - previous) / previous) * 100).toFixed(1);
            pChange = countlyCommon.getShortNumber(change) + "%";

            if (change < 0) {
                trend = "d";
            } else {
                trend = "u";
            }
        }

        return {"percent":pChange, "trend":trend};
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
    countlyCommon.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

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
    countlyCommon.extractRangeData = function (db, propertyName, rangeArray, explainRange) {

        countlyCommon.periodObj = getPeriodObj();

        var dataArr = [],
            dataArrCounter = 0,
            rangeTotal,
            total = 0;

        if (!rangeArray) {
            return dataArr;
        }

        for (var j = 0; j < rangeArray.length; j++) {

            rangeTotal = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    rangeTotal += tmp_x[rangeArray[j]];
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            } else {
                var tmpRangeTotal = 0;

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        rangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        tmpRangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                if (rangeTotal > tmpRangeTotal) {
                    rangeTotal = tmpRangeTotal;
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            }
        }

        for (var j = 0; j < dataArr.length; j++) {
            dataArr[j].percent = ((dataArr[j]["t"] / total) * 100).toFixed(1);
        }

        dataArr.sort(function (a, b) {
            return -(a["t"] - b["t"]);
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
    countlyCommon.extractChartData = function (db, clearFunction, chartData, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

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
                } else {
                    activeDate = countlyCommon.periodObj.previousPeriod;
                }
            } else {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.activePeriod;
                }
            }

            for (var i = periodMin; i < periodMax; i++) {

                if (!countlyCommon.periodObj.isSpecialPeriod) {

                    if (countlyCommon.periodObj.periodMin == 0) {
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                    } else if (("" + activeDate).indexOf(".") == -1) {
                        formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                    } else {
                        formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                    }

                    dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
                } else {
                    formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                    dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
                }

                dataObj = clearFunction(dataObj);

                if (!tableData[i]) {
                    tableData[i] = {};
                }

                tableData[i]["date"] = formattedDate.format(countlyCommon.periodObj.dateString);

                if (propertyFunctions[j]) {
                    propertyValue = propertyFunctions[j](dataObj);
                } else {
                    propertyValue = dataObj[propertyNames[j]];
                }

                chartData[j]["data"][chartData[j]["data"].length] = [i, propertyValue];
                tableData[i][propertyNames[j]] = propertyValue;
            }
        }

        var keyEvents = [];

        for (var k = 0; k < chartData.length; k++) {
            var flatChartData = underscore.flatten(chartData[k]["data"]);
            var chartVals = underscore.reject(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });
            var chartIndexes = underscore.filter(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });

            keyEvents[k] = {};
            keyEvents[k].min = underscore.min(chartVals);
            keyEvents[k].max = underscore.max(chartVals);
        }

        return {"chartDP":chartData, "chartData":underscore.compact(tableData), "keyEvents":keyEvents};
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
    *     "avg-duration-per-session": function(tmp_x){return (tmp_x["t"] == 0) ? 0 : (tmp_x["d"] / tmp_x["t"]);},
    *     "avg-events": function(tmp_x){return (tmp_x["u"] == 0) ? 0 : (tmp_x["e"] / tmp_x["u"]);}
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
        var _periodObj = countlyCommon.periodObj
        var sparkLines = {};
        for(var p in props){
            sparkLines[p] = [];
        }

        if (!_periodObj.isSpecialPeriod) {
            for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                var tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + "." + i);
                tmp_x = clearObject(tmp_x);
                
                for(var p in props){
                    if(typeof props[p] === "string")
                        sparkLines[p].push(tmp_x[props[p]]);
                    else if(typeof props[p] === "function")
                        sparkLines[p].push(props[p](tmp_x));
                }
            }
        } else {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                var tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[i]);
                tmp_x = clearObject(tmp_x);

                for(var p in props){
                    if(typeof props[p] === "string")
                        sparkLines[p].push(tmp_x[props[p]]);
                    else if(typeof props[p] === "function")
                        sparkLines[p].push(props[p](tmp_x));
                }
            }
        }

        for (var key in sparkLines) {
            sparkLines[key] = sparkLines[key].join(",");
        }

        return sparkLines;
    }

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
    countlyCommon.extractTwoLevelData = function (db, rangeArray, clearFunction, dataProperties, totalUserOverrideObj) {

        countlyCommon.periodObj = getPeriodObj();

        if (!rangeArray) {
            return {"chartData":tableData};
        }
        var periodMin = 0,
            periodMax = 0,
            dataObj = {},
            formattedDate = "",
            tableData = [],
            chartData = [],
            propertyNames = underscore.pluck(dataProperties, "name"),
            propertyFunctions = underscore.pluck(dataProperties, "func"),
            propertyValue = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            periodMin = countlyCommon.periodObj.periodMin;
            periodMax = (countlyCommon.periodObj.periodMax + 1);
        } else {
            periodMin = 0;
            periodMax = countlyCommon.periodObj.currentPeriodArr.length;
        }

        var tableCounter = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            for (var j = 0; j < rangeArray.length; j++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }

                dataObj = clearFunction(dataObj);

                var propertySum = 0,
                    tmpPropertyObj = {};

                for (var k = 0; k < propertyNames.length; k++) {

                    if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    } else {
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
        } else {

            for (var j = 0; j < rangeArray.length; j++) {

                var propertySum = 0,
                    tmpPropertyObj = {},
                    tmp_x = {};

                for (var i = periodMin; i < periodMax; i++) {
                    dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                    if (!dataObj) {
                        continue;
                    }

                    dataObj = clearFunction(dataObj);

                    for (var k = 0; k < propertyNames.length; k++) {

                        if (propertyNames[k] == "u") {
                            propertyValue = 0;
                        } else if (propertyFunctions[k]) {
                            propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                        } else {
                            propertyValue = dataObj[propertyNames[k]];
                        }

                        if (!tmpPropertyObj[propertyNames[k]]) {
                            tmpPropertyObj[propertyNames[k]] = 0;
                        }

                        if (typeof propertyValue === 'string') {
                            tmpPropertyObj[propertyNames[k]] = propertyValue;
                        } else {
                            propertySum += propertyValue;
                            tmpPropertyObj[propertyNames[k]] += propertyValue;
                        }
                    }
                }

                if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                    if (countlyCommon.periodObj.periodContainsToday && totalUserOverrideObj && totalUserOverrideObj[rangeArray[j]]) {

                        tmpPropertyObj["u"] = totalUserOverrideObj[rangeArray[j]];

                    } else {
                        var tmpUniqVal = 0,
                            tmpUniqValCheck = 0,
                            tmpCheckVal = 0;

                        for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                            if (!tmp_x) {
                                continue;
                            }
                            tmp_x = clearFunction(tmp_x);
                            propertyValue = tmp_x["u"];

                            if (typeof propertyValue === 'string') {
                                tmpPropertyObj["u"] = propertyValue;
                            } else {
                                propertySum += propertyValue;
                                tmpUniqVal += propertyValue;
                                tmpPropertyObj["u"] += propertyValue;
                            }
                        }

                        for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                            if (!tmp_x) {
                                continue;
                            }
                            tmp_x = clearFunction(tmp_x);
                            tmpCheckVal = tmp_x["u"];

                            if (typeof tmpCheckVal !== 'string') {
                                propertySum += tmpCheckVal;
                                tmpUniqValCheck += tmpCheckVal;
                            }
                        }

                        if (tmpUniqVal > tmpUniqValCheck) {
                            tmpPropertyObj["u"] = tmpUniqValCheck;
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
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["u"];
            });
        } else if (propertyNames.indexOf("t") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["t"];
            });
        } else if (propertyNames.indexOf("c") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["c"];
            });
        }

        for (var i = 0; i < tableData.length; i++) {
            if (underscore.isEmpty(tableData[i])) {
                tableData[i] = null;
            }
        }

        return {"chartData":underscore.compact(tableData)};
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
    * @returns {array} array with top 3 values
    * @example <caption>Return data</caption>
    * [
    *    {"name":"iOS","percent":35},
    *    {"name":"Android","percent":33},
    *    {"name":"Windows Phone","percent":32}
    * ]
    */
    countlyCommon.extractBarData = function (db, rangeArray, clearFunction, fetchFunction, maxItems, metric, totalUserOverrideObj) {
        metric =  metric || "t";
        maxItems = maxItems || 3;
        fetchFunction = fetchFunction || function (rangeArr, dataObj) {return rangeArr;};
        var dataProps = [
            {
                name:"range",
                func:fetchFunction
            },
            { "name":metric }
        ];
        //include other default metrics for data correction
        if(metric === "u"){
            dataProps.push({name:"n"});
            dataProps.push({name:"t"});
        }
        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, dataProps, totalUserOverrideObj);
        var rangeNames = underscore.pluck(rangeData.chartData, 'range'),
            rangeTotal = underscore.pluck(rangeData.chartData, metric),
            barData = [],
            sum = 0,
            totalPercent = 0;

        if (rangeNames.length < maxItems) {
            maxItems = rangeNames.length;
        }

        for (var i = 0; i < maxItems; i++) {
            sum += rangeTotal[i];
        }

        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((rangeTotal[i] / sum) * 100);
            totalPercent += percent;

            if (i == (maxItems - 1)) {
                percent += 100 - totalPercent;
            }

            barData[i] = { "name":rangeNames[i], value:rangeTotal[i], "percent":percent };
        }

        return underscore.sortBy(barData, function(obj) { return -obj.value; });
    };

    /**
    * Shortens the given number by adding K (thousand) or M (million) postfix. K is added only if the number is bigger than 10000, etc.
    * @param {number} number - number to shorten
    * @returns {string} shorter representation of number
    * @example
    * //outputs 10K
    * countlyCommon.getShortNumber(10000);
    */
    countlyCommon.getShortNumber = function (number) {

        var tmpNumber = "";

        if (number >= 1000000 || number <= -1000000) {
            tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
        } else if (number >= 10000 || number <= -10000) {
            tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
        } else {
            number += "";
            tmpNumber = number.replace(".0", "");
        }

        return tmpNumber;
    };

    /**
    * Getting the date range shown on the dashboard like 1 Aug - 30 Aug, using {@link countlyCommon.periodObj) dateString property which holds the date format.
    * @returns {string} string with  formatted date range as 1 Aug - 30 Aug
    */
    countlyCommon.getDateRange = function () {

        countlyCommon.periodObj = getPeriodObj();

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            if (countlyCommon.periodObj.dateString == "HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");

                var nowMin = _currMoment.format("mm");
                formattedDateEnd.add(nowMin, "minutes");

            } else if (countlyCommon.periodObj.dateString == "D MMM, HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes");
            } else {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
            }
        } else {
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
	countlyCommon.extractData = function (db, clearFunction, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

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
                } else {
                    activeDate = countlyCommon.periodObj.previousPeriod;
                }
            } else {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.activePeriod;
                }
            }
			var dateString = "";
            for (var i = periodMin; i < periodMax; i++) {

                if (!countlyCommon.periodObj.isSpecialPeriod) {

                    if (countlyCommon.periodObj.periodMin == 0) {
						dateString = "YYYY-M-D H:00";
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                    } else if (("" + activeDate).indexOf(".") == -1) {
						dateString = "YYYY-M";
                        formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                    } else {
						dateString = "YYYY-M-D";
                        formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                    }

                    dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
                } else {
					dateString = "YYYY-M-D";
                    formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                    dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
                }

                dataObj = clearFunction(dataObj);

                if (!tableData[i]) {
                    tableData[i] = {};
                }

                tableData[i]["_id"] = formattedDate.format(dateString);

                if (propertyFunctions[j]) {
                    propertyValue = propertyFunctions[j](dataObj);
                } else {
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
	countlyCommon.extractMetric = function (db, rangeArray, clearFunction, dataProperties, totalUserOverrideObj) {

        countlyCommon.periodObj = getPeriodObj();

        if (!rangeArray) {
            return tableData;
        }
        var periodMin = 0,
            periodMax = 0,
            dataObj = {},
            formattedDate = "",
            tableData = [],
            chartData = [],
            propertyNames = underscore.pluck(dataProperties, "name"),
            propertyFunctions = underscore.pluck(dataProperties, "func"),
            propertyValue = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            periodMin = countlyCommon.periodObj.periodMin;
            periodMax = (countlyCommon.periodObj.periodMax + 1);
        } else {
            periodMin = 0;
            periodMax = countlyCommon.periodObj.currentPeriodArr.length;
        }

        var tableCounter = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            for (var j = 0; j < rangeArray.length; j++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }

                dataObj = clearFunction(dataObj);

                var propertySum = 0,
                    tmpPropertyObj = {};

                for (var k = 0; k < propertyNames.length; k++) {

                    if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    } else {
                        propertyValue = dataObj[propertyNames[k]];
                    }

                    if (typeof propertyValue !== 'string') {
                        propertySum += propertyValue;
                    }
					if (propertyFunctions[k])
						tmpPropertyObj["_id"] = propertyValue;
					else
						tmpPropertyObj[propertyNames[k]] = propertyValue;
                }

                if (propertySum > 0) {
                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj;
                    tableCounter++;
                }
            }
        } else {

            for (var j = 0; j < rangeArray.length; j++) {

                var propertySum = 0,
                    tmpPropertyObj = {},
                    tmp_x = {};

                for (var i = periodMin; i < periodMax; i++) {
                    dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);

                    if (!dataObj) {
                        continue;
                    }

                    dataObj = clearFunction(dataObj);

                    for (var k = 0; k < propertyNames.length; k++) {

                        if (propertyNames[k] == "u") {
                            propertyValue = 0;
                        } else if (propertyFunctions[k]) {
                            propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                        } else {
                            propertyValue = dataObj[propertyNames[k]];
                        }
						
						if (propertyFunctions[k])
							tmpPropertyObj["_id"] = propertyValue;
						else
						{
							if (!tmpPropertyObj[propertyNames[k]]) {
								tmpPropertyObj[propertyNames[k]] = 0;
							}
	
							if (typeof propertyValue === 'string') {
								tmpPropertyObj[propertyNames[k]] = propertyValue;
							} else {
								propertySum += propertyValue;
								tmpPropertyObj[propertyNames[k]] += propertyValue;
							}
						}
                    }
                }

                if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                    if (countlyCommon.periodObj.periodContainsToday && totalUserOverrideObj && totalUserOverrideObj[rangeArray[j]]) {

                        tmpPropertyObj["u"] = totalUserOverrideObj[rangeArray[j]];

                    } else {
                        var tmpUniqVal = 0,
                            tmpUniqValCheck = 0,
                            tmpCheckVal = 0;

                        for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
                            if (!tmp_x) {
                                continue;
                            }
                            tmp_x = clearFunction(tmp_x);
                            propertyValue = tmp_x["u"];

                            if (typeof propertyValue === 'string') {
                                tmpPropertyObj["u"] = propertyValue;
                            } else {
                                propertySum += propertyValue;
                                tmpUniqVal += propertyValue;
                                tmpPropertyObj["u"] += propertyValue;
                            }
                        }

                        for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                            if (!tmp_x) {
                                continue;
                            }
                            tmp_x = clearFunction(tmp_x);
                            tmpCheckVal = tmp_x["u"];

                            if (typeof tmpCheckVal !== 'string') {
                                propertySum += tmpCheckVal;
                                tmpUniqValCheck += tmpCheckVal;
                            }
                        }

                        if (tmpUniqVal > tmpUniqValCheck) {
                            tmpPropertyObj["u"] = tmpUniqValCheck;
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
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["u"];
            });
        } else if (propertyNames.indexOf("t") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["t"]
            });
        } else if (propertyNames.indexOf("c") !== -1) {
            tableData = underscore.sortBy(tableData, function (obj) {
                return -obj["c"]
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
    * @param {number} timestamp - amount in seconds or miliseconds passed since some reference point
    * @returns {string} formated time with how much highest units passed
    * @example
    * //outputs 2824.7 yrs
    * countlyCommon.timeString(1484654066);
    */
    countlyCommon.timeString = function(timespent){
        if(timespent.toString().length === 13)
            timespent = Math.round(timespent/1000);
        var timeSpentString = (timespent.toFixed(1)) + " min";

        if (timespent >= 142560) {
            timeSpentString = (timespent / 525600).toFixed(1) + " years";
        } else if (timespent >= 1440) {
            timeSpentString = (timespent / 1440).toFixed(1) + " days";
        } else if (timespent >= 60) {
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
    countlyCommon.getDashboardData = function(data, properties, unique, totalUserOverrideObj){
        function clearObject(obj){
            if (obj) {
                for(var i = 0; i < properties.length; i++){
                    if (!obj[properties[i]]) obj[properties[i]] = 0;
                }
            }
            else {
                obj = {}
                for(var i = 0; i < properties.length; i++){
                    obj[properties[i]] = 0;
                }
            }
    
            return obj;
        };

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
            sparkLines = {},
            change = {},
            isEstimate = false;

            for(var i = 0; i < properties.length; i++){
                current[properties[i]] = 0;
                previous[properties[i]] = 0;
                currentCheck[properties[i]] = 0;
                previousCheck[properties[i]] = 0;
            }

        if (_periodObj.isSpecialPeriod) {
            isEstimate = true;
            for (var j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j]);
                tmp_x = clearObject(tmp_x);
                for(var i = 0; i < properties.length; i++){
                    if(unique.indexOf(properties[i]) === -1)
                        current[properties[i]] += tmp_x[properties[i]];
                }
            }

            for (var j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j]);
                tmp_y = clearObject(tmp_y);
                for(var i = 0; i < properties.length; i++){
                    if(unique.indexOf(properties[i]) === -1)
                        previous[properties[i]] += tmp_y[properties[i]];
                }
            }
            
            //deal with unique values separately
            for (var j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodArr[j]);
                tmp_x = clearObject(tmp_x);
                for(var i = 0; i < unique.length; i++){
                    current[unique[i]] += tmp_x[unique[i]];
                }
            }

            for (var j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j]);
                tmp_y = clearObject(tmp_y);
                for(var i = 0; i < unique.length; i++){
                    previous[unique[i]] += tmp_y[unique[i]];
                }
            }
            
            //recheck unique values with larger buckets
            for (var j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
                tmpUniqObj = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j]);
                tmpUniqObj = clearObject(tmpUniqObj);
                for(var i = 0; i < unique.length; i++){
                    currentCheck[unique[i]] += tmpUniqObj[unique[i]];
                }
            }
            
            for (var j = 0; j < (_periodObj.previousUniquePeriodCheckArr.length); j++) {
                tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodCheckArr[j]);
                tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
                for(var i = 0; i < unique.length; i++){
                    previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
                }
            }
            
            //check if we should overwrite uniques
            for(var i = 0; i < unique.length; i++){
                if (current[unique[i]] > currentCheck[unique[i]]) {
                    current[unique[i]] = currentCheck[unique[i]];
                }
                
                if (previous[unique[i]] > previousCheck[unique[i]]) {
                    previous[unique[i]] = previousCheck[unique[i]];
                }
            }
            
        } else {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod);
            tmp_x = clearObject(tmp_x);
            tmp_y = clearObject(tmp_y);

            for(var i = 0; i < properties.length; i++){
                current[properties[i]] = tmp_x[properties[i]];
                previous[properties[i]] = tmp_y[properties[i]];
            }
        }
        
        // Total users can't be less than new users
        if (typeof current.u !== "undefined" && typeof current.n !== "undefined" && current.u < current.n) {
            current.u = current.n;
        }

        // Total users can't be more than total sessions
        if (typeof current.u !== "undefined" && typeof current.t !== "undefined" && current.u > current.t) {
            current.u = current.t;
        }

        for(var i = 0; i < properties.length; i++){
            change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
            dataArr[properties[i]] = {
                "total":current[properties[i]],
                "prev-total":previous[properties[i]],
                "change":change[properties[i]].percent,
                "trend":change[properties[i]].trend
            };
            if(unique.indexOf(properties[i]) !== -1){
                dataArr[properties[i]].is_estimate = isEstimate;
            }
        }
        
        //check if we can correct data using total users correction
        if (_periodObj.periodContainsToday && totalUserOverrideObj) {
            for(var i = 0; i < unique.length; i++){
                if(dataArr[unique[i]] && typeof totalUserOverrideObj[unique[i]] !== "undefined" && totalUserOverrideObj[unique[i]]){
                    dataArr[unique[i]].total = totalUserOverrideObj[unique[i]];
                    dataArr[unique[i]].is_estimate = false;
                }
            }
        }

        return dataArr;
    }

    /**
    * Get timestamp query range based on request data using period and app's timezone
    * @param {params} params - params object
    * @param {boolean} inSeconds - if true will output result in seconds, else in miliseconds
    * @returns {object} mongodb query object with preset ts field to be queried
    * @example
    * countlyCommon.getTimestampRangeQuery(params, true)
    * //outputs
    * {
    *      ts:{$gte:1488259482, $lte:1488279482},
    * }
    */
    countlyCommon.getTimestampRangeQuery = function(params, inSeconds){
        var periodObj = countlyCommon.periodObj;
        //create current period array if it does not exist
        if (!periodObj.currentPeriodArr || periodObj.currentPeriodArr.length == 0) {
            periodObj.currentPeriodArr = [];

            //create a period array that starts from the beginning of the current year until today
            if (params.qstring.period == "month") {
                for (var i = 0; i < (now.getMonth() + 1); i++) {
                    var daysInMonth = moment().month(i).daysInMonth();

                    for (var j = 0; j < daysInMonth; j++) {
                        periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));

                        // If current day of current month, just break
                        if ((i == now.getMonth()) && (j == (now.getDate() - 1))) {
                            break;
                        }
                    }
                }
            }
            //create a period array that starts from the beginning of the current month until today
            else if(params.qstring.period == "day") {
                for(var i = 0; i < now.getDate(); i++) {
                    periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1));
                }
            }
            //create one day period array
            else{
                periodObj.currentPeriodArr.push(periodObj.activePeriod);
            }
        }
        var tmpArr;
        var ts = {};

        tmpArr = periodObj.currentPeriodArr[0].split(".");
        ts.$gte = new Date(Date.UTC(parseInt( tmpArr[0]),parseInt(tmpArr[1])-1,parseInt(tmpArr[2]) ));
        ts.$gte.setTimezone(params.appTimezone);
        if(inSeconds)
            ts.$gte = ts.$gte.getTime() / 1000 + ts.$gte.getTimezoneOffset()*60;
        else
            ts.$gte = ts.$gte.getTime() + ts.$gte.getTimezoneOffset()*60000;

        tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
        ts.$lt = new Date(Date.UTC(parseInt( tmpArr[0]),parseInt(tmpArr[1])-1,parseInt(tmpArr[2]) ));
        ts.$lt.setDate(ts.$lt.getDate() + 1);
        ts.$lt.setTimezone(params.appTimezone);
        if(inSeconds)
            ts.$lt = ts.$lt.getTime() / 1000 + ts.$lt.getTimezoneOffset()*60;
        else
            ts.$lt = ts.$lt.getTime() + ts.$lt.getTimezoneOffset()*60000;
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
    countlyCommon.mergeMetricsByName = function(chartData, metric){
        var uniqueNames = {},
            data;
        for(var i = 0; i < chartData.length; i++){
            data = chartData[i];
            if(data[metric] && !uniqueNames[data[metric]]){
                uniqueNames[data[metric]] = data
            }
            else{
                for(var key in data){
                    if(typeof data[key] == "string")
                       uniqueNames[data[metric]][key] = data[key];
                    else if(typeof data[key] == "number"){
                        if(!uniqueNames[data[metric]][key])
                            uniqueNames[data[metric]][key] = 0;
                        uniqueNames[data[metric]][key] += data[key];
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
        } else if (!y) {
            return x;
        }

        var obj = {};
        for (var i = x.length-1; i >= 0; -- i) {
            obj[x[i]] = true;
        }

        for (var i = y.length-1; i >= 0; -- i) {
            obj[y[i]] = true;
        }

        var res = [];

        for (var k in obj) {
            res.push(k);
        }

        return res;
    };
    
    /**
    * Encode value to be passed to db as key, encoding $ symbol to &#36; if it is first and all . (dot) symbols to &#46; in the string
    * @param {string} str - value to encode
    * @returns {string} encoded string
    */
    countlyCommon.encode = function(str){
        return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
    };
    
    /**
    * Decode value from db, decoding first &#36; to $ and all &#46; to . (dots). Decodes also url encoded values as &amp;#36;.
    * @param {string} str - value to decode
    * @returns {string} decoded string
    */
    countlyCommon.decode = function(str){
        return str.replace(/^&#36;/g, "$").replace(/^&amp;#36;/g, '$').replace(/&#46;/g, '.').replace(/&amp;#46;/g, '.');
    };

    /**
    * Decode escaped HTML from db
    * @param {string} str - value to decode
    * @returns {string} decoded string
    */
    countlyCommon.decodeHtml = function(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    };
    
    // Private Methods

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    // Returns a period object used by all time related data calculation functions.
    function getPeriodObj() {
        var year = _currMoment.year(),
            month = _currMoment.month() + 1,
            day = _currMoment.date(),
            hour = _currMoment.hours(),
            endTimestamp = moment(_currMoment).utc().hours(23).minutes(59).seconds(59).unix(),
            startTimestamp = moment(_currMoment).utc().hours(0).minutes(0).seconds(0).unix(),
            activePeriod = "NA",
            previousPeriod = "NA",
            periodMax = "NA",
            periodMin = "NA",
            isSpecialPeriod = false,
            daysInPeriod = 0,
            rangeEndDay = null,
            dateString  = "NA",
            currWeeksArr = [],
            currWeekCounts = {},
            currMonthsArr = [],
            currMonthCounts = {},
            currPeriodArr = [],
            prevWeeksArr = [],
            prevWeekCounts = {},
            prevMonthsArr = [],
            prevMonthCounts = {},
            prevPeriodArr = [],
            periodContainsToday = true;

        switch (_period) {
            case "month": {
                activePeriod = year;
                previousPeriod = year - 1;
                periodMax = month;
                periodMin = 1;
                dateString = "MMM";
                daysInPeriod = parseInt(_currMoment.format("DDD"),10);
                startTimestamp = moment(_currMoment).utc().month(1).date(1).hours(0).minutes(0).seconds(0).unix();

                _currMoment.subtract(daysInPeriod, 'days');
                for (var i = 0; i < daysInPeriod; i++) {
                    _currMoment.add(1, 'days');
                    currPeriodArr.push(_currMoment.format("YYYY.M.D"));
                }

                _currMoment.subtract(daysInPeriod + 365, 'days');
                for (var i = 0; i < daysInPeriod; i++) {
                    prevPeriodArr.push(_currMoment.format("YYYY.M.D"));
                    _currMoment.add(1, 'days');
                }
                _currMoment.add(365, 'days');

                break;
            }
            case "day": {
                activePeriod = _currMoment.format("YYYY.M");
                startTimestamp = moment(_currMoment).utc().date(1).hours(0).minutes(0).seconds(0).unix();
                _currMoment.subtract(day, 'days');
                previousPeriod = _currMoment.format("YYYY.M");
                _currMoment.add(day, 'days');

                periodMax = day;
                periodMin = 1;
                dateString = "D MMM";
                daysInPeriod = day;

                for (var i = periodMin; i <= periodMax; i++) {
                    currPeriodArr.push(activePeriod + "." + i);
                }

                _currMoment.subtract(day + 1, 'days');
                var daysInMonth = _currMoment.daysInMonth();
                _currMoment.subtract(daysInMonth - 1, 'days');
                for (var i = 0; i < day; i++) {
                    _currMoment.add(1, 'days');
                    prevPeriodArr.push(_currMoment.format("YYYY.M.D"));
                }
                _currMoment.add(daysInMonth, 'days');

                break;
            }
            case "hour": {
                activePeriod = _currMoment.format("YYYY.M.D");
                _currMoment.subtract(1, 'days');
                previousPeriod = _currMoment.format("YYYY.M.D");
                _currMoment.add(1, 'days');

                periodMax = hour;
                periodMin = 0;
                dateString = "HH:mm";
                daysInPeriod = 1;

                currPeriodArr.push(activePeriod);
                prevPeriodArr.push(previousPeriod);
                break;
            }
            case "yesterday": {
                _currMoment.subtract(1, 'days');
                endTimestamp = moment(_currMoment).utc().hours(23).minutes(59).seconds(59).unix();
                startTimestamp = moment(_currMoment).utc().hours(0).minutes(0).seconds(0).unix();
                activePeriod = _currMoment.format("YYYY.M.D");
                _currMoment.add(1, 'days');
                _currMoment.subtract(2, 'days');
                previousPeriod = _currMoment.format("YYYY.M.D");
                _currMoment.add(2, 'days');

                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
                daysInPeriod = 1;

                currPeriodArr.push(activePeriod);
                prevPeriodArr.push(previousPeriod);
                periodContainsToday = false;
                break;
            }
            case "7days": {
                daysInPeriod = 7;
                isSpecialPeriod = true;
                break;
            }
            case "30days": {
                daysInPeriod = 30;
                isSpecialPeriod = true;
                break;
            }
            case "60days": {
                daysInPeriod = 60;
                isSpecialPeriod = true;
                break;
            }
            case "90days": {
                daysInPeriod = 90;
                isSpecialPeriod = true;
                break;
            }
            default: {
                break;
            }
        }
        
        if(isSpecialPeriod){
            _currMoment.subtract(daysInPeriod-1, 'days');
            startTimestamp = moment(_currMoment).utc().hours(0).minutes(0).seconds(0).unix();
            _currMoment.add(daysInPeriod-1, 'days');
        }

        // Check whether period object is array
        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            var fromDate = new Date(_period[0]),
                toDate = new Date(_period[1]);

            startTimestamp = moment(fromDate).utc().hours(0).minutes(0).seconds(0).unix();
            endTimestamp = moment(toDate).utc().hours(23).minutes(59).seconds(59).unix();
            fromDate.setTimezone(_appTimezone);
            toDate.setTimezone(_appTimezone);

            // One day is selected from the datepicker
            if (_period[0] == _period[1]) {
                var selectedDate = moment(fromDate);

                activePeriod = selectedDate.format("YYYY.M.D");
                selectedDate.subtract(1, 'days');
                previousPeriod = selectedDate.format("YYYY.M.D");
                selectedDate.add(1, 'days');

                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
                currPeriodArr.push(activePeriod);
                prevPeriodArr.push(previousPeriod);
                periodContainsToday = (moment(_period[0]).utc().format("YYYYMMDD") == _currMoment.utc().format("YYYYMMDD"));
            } else {
                var a = moment(fromDate),
                    b = moment(toDate);

                daysInPeriod = b.diff(a, 'days') + 1;
                isSpecialPeriod = true;
                rangeEndDay = _period[1];
                periodContainsToday = (b.utc().format("YYYYMMDD") == _currMoment.utc().format("YYYYMMDD"));
            }
        }

        if (isSpecialPeriod) {
            var yearChanged = false,
                currentYear = 0;

            for (var i = (daysInPeriod - 1); i > -1; i--) {

                var currTime = new Date();
                currTime.setTimezone(_appTimezone);

                var currTime2 = new Date();
                currTime2.setTimezone(_appTimezone);

                var momentOne = moment(currTime),
                    momentTwo = moment(currTime2);

                var currRangeEndDate = new Date(rangeEndDay);
                currRangeEndDate.setTimezone(_appTimezone);

                var prevRangeEndDate = new Date(rangeEndDay);
                prevRangeEndDate.setTimezone(_appTimezone);

                var currIndex = (!rangeEndDay) ? momentOne.subtract(i, 'days') : moment(currRangeEndDate).subtract(i, 'days'),
                    currIndexYear = currIndex.year(),
                    prevIndex = (!rangeEndDay) ? momentTwo.subtract((daysInPeriod + i), 'days') : moment(prevRangeEndDate).subtract((daysInPeriod + i), 'days'),
                    prevYear = prevIndex.year();

                if (i != (daysInPeriod - 1) && currentYear != currIndexYear) {
                    yearChanged = true;
                }
                currentYear = currIndexYear;

                // Current period variables

                var currWeek = currentYear + "." + "w" + Math.ceil(currIndex.format("DDD") / 7);
                currWeeksArr[currWeeksArr.length] = currWeek;
                currWeekCounts[currWeek] = (currWeekCounts[currWeek]) ? (currWeekCounts[currWeek] + 1) : 1;

                var currMonth = currIndex.format("YYYY.M");
                currMonthsArr[currMonthsArr.length] = currMonth;
                currMonthCounts[currMonth] = (currMonthCounts[currMonth]) ? (currMonthCounts[currMonth] + 1) : 1;

                currPeriodArr[currPeriodArr.length] = currIndex.format("YYYY.M.D");

                // Previous period variables

                var prevWeek = prevYear + "." + "w" + Math.ceil(prevIndex.format("DDD") / 7);
                prevWeeksArr[prevWeeksArr.length] = prevWeek;
                prevWeekCounts[prevWeek] = (prevWeekCounts[prevWeek]) ? (prevWeekCounts[prevWeek] + 1) : 1;

                var prevMonth = prevIndex.format("YYYY.M");
                prevMonthsArr[prevMonthsArr.length] = prevMonth;
                prevMonthCounts[prevMonth] = (prevMonthCounts[prevMonth]) ? (prevMonthCounts[prevMonth] + 1) : 1;

                prevPeriodArr[prevPeriodArr.length] = prevIndex.format("YYYY.M.D");
            }

            dateString = (yearChanged) ? "D MMM, YYYY" : "D MMM";
        }

        var requiredDbDateIds = [],
            requiredZeroDbDateIds = [],
            dateIdSplits;

        for (var i = 0; i < prevPeriodArr.length; i++) {
            dateIdSplits = prevPeriodArr[i].split(".");
            arrayAddUniq(requiredZeroDbDateIds, dateIdSplits[0] + ":0");
            arrayAddUniq(requiredDbDateIds, dateIdSplits[0] + ":" + dateIdSplits[1]);
        }

        for (var i = 0; i < currPeriodArr.length; i++) {
            dateIdSplits = currPeriodArr[i].split(".");
            arrayAddUniq(requiredZeroDbDateIds, dateIdSplits[0] + ":0");
            arrayAddUniq(requiredDbDateIds, dateIdSplits[0] + ":" + dateIdSplits[1]);
        }

        return {
            "start":startTimestamp*1000,
            "end":endTimestamp*1000,
            "activePeriod":activePeriod,
            "periodMax":periodMax,
            "periodMin":periodMin,
            "previousPeriod":previousPeriod,
            "currentPeriodArr":currPeriodArr,
            "previousPeriodArr":prevPeriodArr,
            "uniquePeriodArr":getUniqArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts, currPeriodArr),
            "uniquePeriodCheckArr":getUniqCheckArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts),
            "previousUniquePeriodArr":getUniqArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts, prevPeriodArr),
            "previousUniquePeriodCheckArr":getUniqCheckArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts),
            "dateString":dateString,
            "daysInPeriod":daysInPeriod,
            "isSpecialPeriod":isSpecialPeriod,
            "reqMonthDbDateIds":requiredDbDateIds,
            "reqZeroDbDateIds":requiredZeroDbDateIds,
            "periodContainsToday": periodContainsToday
        };
    }

    function getUniqArray(weeksArray, weekCounts, monthsArray, monthCounts, periodArr) {
        if (_period == "month" || _period == "day" || _period == "hour" || _period == "yesterday") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts),
            periodArr = clone(periodArr);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1,
            rejectedWeeks = [],
            rejectedWeekDayCounts = {};

        for (var key in weekCounts) {

            // If this is the current week we can use it
            if (key === _currMoment.format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 7) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (_currMoment.format("YYYY.M") === key) {
                    tmpDaysInMonth = _currMoment.format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < tmpDaysInMonth) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0 || (rejectedWeeks.indexOf(weeksArray[i]) != -1)) {
                    uniquePeriods[i] = periodArr[i];
                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
                uniquePeriods[i] = monthsArray[i];

                if (rejectedWeekDayCounts[weeksArray[i]]) {
                    rejectedWeekDayCounts[weeksArray[i]].count++;
                } else {
                    rejectedWeekDayCounts[weeksArray[i]] = {
                        count:1,
                        index:i
                    };
                }
            }
        }

        var totalWeekCounts = underscore.countBy(weeksArray, function (per) {
            return per;
        });

        for (var weekDayCount in rejectedWeekDayCounts) {

            // If the whole week is rejected continue
            if (rejectedWeekDayCounts[weekDayCount].count == 7) {
                continue;
            }

            // If its the current week continue
            if (_currMoment.format("YYYY.\\w w").replace(" ", "") == weekDayCount && totalWeekCounts[weekDayCount] == rejectedWeekDayCounts[weekDayCount].count) {
                continue;
            }

            // If only some part of the week is rejected we should add back daily buckets

            var startIndex = rejectedWeekDayCounts[weekDayCount].index - (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count),
                limit = startIndex + (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count);

            for (var i = startIndex; i < limit; i++) {
                // If there isn't already a monthly bucket for that day
                if (monthsArray[i] == 0) {
                    uniquePeriods[i] = periodArr[i];
                }
            }
        }

        rejectedWeeks = underscore.uniq(rejectedWeeks);
        uniquePeriods = underscore.uniq(underscore.difference(uniquePeriods, rejectedWeeks));

        return uniquePeriods;
    }

    function getUniqCheckArray(weeksArray, weekCounts, monthsArray, monthCounts) {

        if (_period == "month" || _period == "day" || _period == "hour" || _period == "yesterday") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1;

        for (var key in weekCounts) {
            if (key === _currMoment.format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 1) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (_currMoment.format("YYYY.M") === key) {
                    tmpDaysInMonth = _currMoment.format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < (tmpDaysInMonth * 0.5)) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0) {

                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                uniquePeriods[i] = monthsArray[i];
            }
        }

        uniquePeriods = underscore.uniq(uniquePeriods);

        return uniquePeriods;
    }

    function clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;

        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
    }

    function arrayAddUniq(arr, item) {
        if (!arr) {
            arr = [];
        }

        if (toString.call(item) === "[object Array]") {
            for (var i = 0; i < item.length; i++) {
                if (arr.indexOf(item[i]) === -1) {
                    arr[arr.length] = item[i];
                }
            }
        } else {
            if (arr.indexOf(item) === -1) {
                arr[arr.length] = item;
            }
        }
    }

}(countlyCommon));

module.exports = countlyCommon;