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

    countlyCommon.periodObj = getPeriodObj();

    // Public Methods

    countlyCommon.setTimezone = function(appTimezone) {
        _appTimezone = appTimezone;

        var currTime = new Date();
        currTime.setTimezone(appTimezone);

        _currMoment = moment(currTime);

        countlyCommon.periodObj = getPeriodObj();
    };

    countlyCommon.setPeriod = function(period) {
        _period = period;
        countlyCommon.periodObj = getPeriodObj();
    };

    // Calculates the percent change between previous and current values.
    // Returns an object in the following format {"percent": "20%", "trend": "u"}
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

    // Fetches nested property values from an obj.
    countlyCommon.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

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
                                tmpPropertyObj["u"] += tmpCheckVal;
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

    // Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
    countlyCommon.extractBarData = function (db, rangeArray, clearFunction, fetchFunction, maxItems) {
        maxItems = maxItems || 3;
        fetchFunction = fetchFunction || function (rangeArr, dataObj) {return rangeArr;};
        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            {
                name:"range",
                func:fetchFunction
            },
            { "name":"t" }
        ]);

        var rangeNames = underscore.pluck(rangeData.chartData, 'range'),
            rangeTotal = underscore.pluck(rangeData.chartData, 't'),
            barData = [],
            sum = 0,
            totalPercent = 0;

        rangeTotal.sort(function (a, b) {
            if (Math.floor(a) <  Math.floor(b)) return 1;
            if (Math.floor(b) <  Math.floor(a)) return -1;
            return 0;
        });

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

            barData[i] = { "name":rangeNames[i], "percent":percent };
        }

        return underscore.sortBy(barData, function(obj) { return -obj.percent; });
    };

    // Shortens the given number by adding K (thousand) or M (million) postfix.
    // K is added only if the number is bigger than 10000.
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

    // Function for getting the date range shown on the dashboard like 1 Aug - 30 Aug.
    // countlyCommon.periodObj holds a dateString property which holds the date format.
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
                                tmpPropertyObj["u"] += tmpCheckVal;
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
                    current[properties[i]] += tmp_x[properties[i]];
                }
            }

            for (var j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j]);
                tmp_y = clearObject(tmp_y);
                for(var i = 0; i < properties.length; i++){
                    previous[properties[i]] += tmp_y[properties[i]];
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
            
            for (var j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j]);
                tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
                for(var i = 0; i < unique.length; i++){
                    previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
                }
            }
            
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
                if(totalUserOverrideObj[unique[i]] && typeof totalUserOverrideObj[unique[i]].users !== "undefined"){
                    dataArr[unique[i]].total = totalUserOverrideObj[unique[i]].users;
                    dataArr[unique[i]].is_estimate = false;
                }
            }
        }

        return dataArr;
    }

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