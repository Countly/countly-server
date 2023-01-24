var moment = require('moment-timezone'),
PeriodObjV2 = require('./PeriodObjV2.js'),
underscore = require('underscore');

/**
 * CountlyCommonV2 class has been created to be used instead of the existing countlyCommon in future
 */
class CountlyCommonV2 {
constructor(period){
    this.period = new PeriodObjV2(period);
    this.periodObj = this.period.getPeriodObj();
}

/**
* Extract single level data without metrics/segments, like total user data from users collection
* @param {object} db - countly standard metric data object
* @param {function} clearFunction - function to prefill all expected properties as u, t, n, etc with 0, so you would not have null in the result which won't work when drawing graphs
* @param {object} dataProperties - describing which properties and how to extract
* @returns {array} object to use in timeline graph
* @example <caption>Extracting total users data from users collection</caption>
* extractData(_sessionDb, countlySession.clearObject, [
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

extractData(db, clearFunction, dataProperties) {

    var periodMin = this.periodObj.periodMin,
        periodMax = (this.periodObj.periodMax + 1),
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
            if (this.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = this.periodObj.previousPeriodArr.length;
                activeDateArr = this.periodObj.previousPeriodArr;
            }
            else {
                activeDate = this.periodObj.previousPeriod;
            }
        }
        else {
            if (this.periodObj.isSpecialPeriod) {
                periodMin = 0;
                periodMax = this.periodObj.currentPeriodArr.length;
                activeDateArr = this.periodObj.currentPeriodArr;
            }
            else {
                activeDate = this.periodObj.activePeriod;
            }
        }
        var dateString = "";
        for (var i = periodMin; i < periodMax; i++) {

            if (!this.periodObj.isSpecialPeriod) {

                if (this.periodObj.periodMin === 0) {
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

                dataObj = this.getDescendantProp(db, activeDate + "." + i);
            }
            else {
                dateString = "YYYY-M-D";
                formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                dataObj = this.getDescendantProp(db, activeDateArr[i]);
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
* Fetches nested property values from an obj.
* @param {object} obj - standard countly metric object
* @param {string} desc - dot separate path to fetch from object
* @returns {object} fetched object from provided path
* @example <caption>Path found</caption>
* //outputs {"u":20,"t":20,"n":5}
* this.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
*/

getDescendantProp(obj, desc) {
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
* Decode value from db, decoding first &#36; to $ and all &#46; to . (dots). Decodes also url encoded values as &amp;#36;.
* @param {string} str - value to decode
* @returns {string} decoded string
*/
decode(str) {
    return str.replace(/^&#36;/g, "$").replace(/^&amp;#36;/g, '$').replace(/&#46;/g, '.').replace(/&amp;#46;/g, '.');
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
* var chartData = extractTwoLevelData(_carrierDb, ["At&t", "Verizon"], countlyCarrier.clearObject, [
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
extractTwoLevelData(db, rangeArray, clearFunction, dataProperties, totalUserOverrideObj) {
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

    if (!this.periodObj.isSpecialPeriod) {
        periodMin = this.periodObj.periodMin;
        periodMax = (this.periodObj.periodMax + 1);
    }
    else {
        periodMin = 0;
        periodMax = this.periodObj.currentPeriodArr.length;
    }

    var tableCounter = 0;

    if (!this.periodObj.isSpecialPeriod) {
        for (let j = 0; j < rangeArray.length; j++) {
            dataObj = this.getDescendantProp(db, this.periodObj.activePeriod + "." + rangeArray[j]);

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
                dataObj = this.getDescendantProp(db, this.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);
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

                    for (let l = 0; l < (this.periodObj.uniquePeriodArr.length); l++) {
                        tmp_x = this.getDescendantProp(db, this.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
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

                    for (let l = 0; l < (this.periodObj.uniquePeriodCheckArr.length); l++) {
                        tmp_x = this.getDescendantProp(db, this.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
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
* Fetches nested property values from an obj.
* @param {object} obj - standard countly metric object
* @param {string} desc - dot separate path to fetch from object
* @returns {object} fetched object from provided path
* @example <caption>Path found</caption>
* //outputs {"u":20,"t":20,"n":5}
* this.getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2");
*/
getDescendantProp = function(obj, desc) {
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
* Merge metric data in chartData returned by @{link extractChartData} or @{link extractTwoLevelData }, just in case if after data transformation of countly standard metric data model, resulting chartData contains duplicated values, as for example converting null, undefined and unknown values to unknown
* @param {object} chartData - chartData returned by @{link extractChartData} or @{link extractTwoLevelData }
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
mergeMetricsByName = function(chartData, metric) {
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
extractBarData = function(db, rangeArray, clearFunction, fetchFunction, maxItems, metric, totalUserOverrideObj, fixBarSegmentData) {
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
    var rangeData = this.extractTwoLevelData(db, rangeArray, clearFunction, dataProps, totalUserOverrideObj);

    if (fixBarSegmentData) {
        rangeData = fixBarSegmentData(rangeData);
    }

    rangeData.chartData = this.mergeMetricsByName(rangeData.chartData, "range");
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
        var percent = this.round((rangeTotal[i] / sum) * 100, 1);
        totalPercent += percent;

        barData[i] = {
            "name": rangeNames[i],
            value: rangeTotal[i],
            "percent": percent
        };
    }

    barData = this.fixPercentageDelta(barData, totalPercent);

    if (rangeNames.length < maxItems) {
        maxItems = rangeNames.length;
    }

    barData = barData.slice(0, maxItems);

    return underscore.sortBy(barData, function(obj) {
        return -obj.value;
    });
};

/**
 * Function to fix percentage difference
 * @param  {Array} items - All items
 * @param  {Number} totalPercent - Total percentage so far
 * @returns {Array} items
 */
 fixPercentageDelta = function(items, totalPercent) {
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
    items[deltaFixEl].percent = this.round(items[deltaFixEl].percent, 1);

    return items;
};

/**
* Round to provided number of digits
* @memberof countlyCommon
* @param {number} num - number to round
* @param {number} digits - amount of digits to round to
* @returns {number} rounded number
* @example
* //outputs 1.235
* round(1.2345, 3);
*/
round = function(num, digits) {
    digits = Math.pow(10, digits || 0);
    return Math.round(num * digits) / digits;
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
* getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u:"users"});
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
getDashboardData = function(data, properties, unique, totalUserOverrideObj, prevTotalUserOverrideObj) {
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
            tmp_x = this.getDescendantProp(data, _periodObj.currentPeriodArr[j]);
            tmp_x = clearObject(tmp_x);
            for (let i = 0; i < properties.length; i++) {
                if (unique.indexOf(properties[i]) === -1) {
                    current[properties[i]] += tmp_x[properties[i]];
                }
            }
        }

        for (let j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
            tmp_y = this.getDescendantProp(data, _periodObj.previousPeriodArr[j]);
            tmp_y = clearObject(tmp_y);
            for (let i = 0; i < properties.length; i++) {
                if (unique.indexOf(properties[i]) === -1) {
                    previous[properties[i]] += tmp_y[properties[i]];
                }
            }
        }

        //deal with unique values separately
        for (let j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
            tmp_x = this.getDescendantProp(data, _periodObj.uniquePeriodArr[j]);
            tmp_x = clearObject(tmp_x);
            for (let i = 0; i < unique.length; i++) {
                current[unique[i]] += tmp_x[unique[i]];
            }
        }

        for (let j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
            tmp_y = this.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j]);
            tmp_y = clearObject(tmp_y);
            for (let i = 0; i < unique.length; i++) {
                previous[unique[i]] += tmp_y[unique[i]];
            }
        }

        //recheck unique values with larger buckets
        for (let j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
            tmpUniqObj = this.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j]);
            tmpUniqObj = clearObject(tmpUniqObj);
            for (let i = 0; i < unique.length; i++) {
                currentCheck[unique[i]] += tmpUniqObj[unique[i]];
            }
        }

        for (let j = 0; j < (_periodObj.previousUniquePeriodCheckArr.length); j++) {
            tmpPrevUniqObj = this.getDescendantProp(data, _periodObj.previousUniquePeriodCheckArr[j]);
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
        tmp_x = this.getDescendantProp(data, _periodObj.activePeriod);
        tmp_y = this.getDescendantProp(data, _periodObj.previousPeriod);
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
        change[properties[i]] = this.getPercentChange(previous[properties[i]], current[properties[i]]);
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
* Calculates the percent change between previous and current values.
* @param {number} previous - data for previous period
* @param {number} current - data for current period
* @returns {object} in the following format {"percent": "20%", "trend": "u"}
* @example
*   //outputs {"percent":"100%","trend":"u"}
*   getPercentChange(100, 200);
*/
getPercentChange(previous, current) {
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
        pChange = this.getShortNumber(change) + "%";

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
* Shortens the given number by adding K (thousand) or M (million) postfix. K is added only if the number is bigger than 10000, etc.
* @param {number} number - number to shorten
* @returns {string} shorter representation of number
* @example
* //outputs 10K
* getShortNumber(10000);
*/
getShortNumber(number) {

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
getSparklineData(data, props, clearObject) {
    var _periodObj = countlyCommon.periodObj;
    var sparkLines = {};
    for (let p in props) {
        sparkLines[p] = [];
    }

    if (!_periodObj.isSpecialPeriod) {
        for (let i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
            let tmp_x = this.getDescendantProp(data, _periodObj.activePeriod + "." + i);
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
            let tmp_x = this.getDescendantProp(data, _periodObj.currentPeriodArr[i]);
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
* Extract range data from standard countly metric data model
* @param {object} db - countly standard metric data object
* @param {string} propertyName - name of the property to extract
* @param {object} rangeArray - array of all metrics/segments to extract (usually what is contained in meta)
* @param {function} explainRange - function to convert range/bucket index to meaningful label
* @returns {array} array containing extracted ranged data as [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
* @example <caption>Extracting session frequency from users collection</caption>
*    //outputs [{"f":"First session","t":352,"percent":"88.4"},{"f":"2 days","t":46,"percent":"11.6"}]
*    extractRangeData(_userDb, "f", _frequencies, countlySession.explainFrequencyRange);
*/
extractRangeData(db, propertyName, rangeArray, explainRange) {

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
            let tmp_x = this.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

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
                let tmp_x = this.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    rangeTotal += tmp_x[rangeArray[j]];
                }
            }

            for (let i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                let tmp_x = this.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

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
* Joined 2 arrays into one removing all duplicated values
* @param {array} x - first array
* @param {array} y - second array
* @returns {array} new array with only unique values from x and y
* @example
* //outputs [1,2,3]
* union([1,2],[2,3]);
*/
union = function(x, y) {
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

}

module.exports = CountlyCommonV2;
