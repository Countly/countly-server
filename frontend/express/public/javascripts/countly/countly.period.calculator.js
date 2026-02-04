import moment from "moment";
import _ from "underscore";

/**
 * PeriodCalculator class for isolated period calculations.
 * Use this when you need to calculate period-related data without affecting
 * the global countlyCommon singleton state.
 *
 * @example
 * import { PeriodCalculator } from './countly.period.calculator.js';
 *
 * const calculator = new PeriodCalculator();
 * calculator.setPeriod("30days");
 * const tickObj = calculator.getTickObj();
 * const chartData = calculator.extractChartData(db, clearFn, chartData, dataProps);
 */
export class PeriodCalculator {
    /**
     * Creates a new PeriodCalculator instance
     * @param {object} options - configuration options
     * @param {string|array} [options.period="30days"] - initial period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {string} [options.browserLangShort="en"] - browser language short code for date formatting (e.g., "en", "ko", "ja", "zh")
     */
    constructor(options = {}) {
        this._period = options.period || "30days";
        this._browserLangShort = options.browserLangShort || "en";
        this.periodObj = this._calculatePeriodObject(this._period);
    }

    /**
     * Set the period and recalculate periodObj
     * @param {string|array} period - period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {number} [timeStamp] - optional timestamp to base calculations on
     * @returns {void}
     */
    setPeriod(period, timeStamp) {
        this._period = period;
        if (timeStamp) {
            this.periodObj = this._calculatePeriodObject(period, timeStamp);
        }
        else {
            this.periodObj = this._calculatePeriodObject(period);
        }
    }

    /**
     * Get currently set period
     * @returns {string|array} current period value
     */
    getPeriod() {
        return this._period;
    }

    /**
     * Get the period object
     * @returns {object} periodObj with all calculated period data
     */
    getPeriodObj() {
        if (this.periodObj._period !== this._period) {
            this.periodObj = this._calculatePeriodObject(this._period);
        }
        return this.periodObj;
    }

    /**
     * Calculate period object for a specific period and timestamp
     * @param {string|array} period - period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {number} [currentTimeStamp] - optional timestamp to base calculations on (defaults to current time)
     * @returns {object} calculated period object containing activePeriod, periodMax, periodMin, etc.
     */
    calcSpecificPeriodObj(period, currentTimeStamp) {
        return this._calculatePeriodObject(period, currentTimeStamp);
    }

    /**
     * Get timestamp range for a period
     * @param {string|array} period - period value
     * @param {number} baseTimeStamp - base timestamp for calculation
     * @returns {array} [startTimestamp, endTimestamp]
     */
    getPeriodRange(period, baseTimeStamp) {
        var periodRange;
        period = period || "30days";

        var excludeCurrentDay = false;
        if (period.period) {
            excludeCurrentDay = period.exclude_current_day || false;
            period = period.period;
        }

        var start;
        var endTimeStamp = excludeCurrentDay ? moment(baseTimeStamp).subtract(1, 'day').hour(23).minute(59).second(59).toDate().getTime() : baseTimeStamp;

        if (period.since) {
            period = [period.since, endTimeStamp];
        }
        else if (typeof period === "string" && period.indexOf(",") !== -1) {
            try {
                period = JSON.parse(period);
            }
            catch (SyntaxError) {
                period = "30days";
            }
        }

        if (Object.prototype.toString.call(period) === '[object Array]' && period.length === 2) {
            periodRange = [period[0] + this.getOffsetCorrectionForTimestamp(period[0]), period[1] + this.getOffsetCorrectionForTimestamp(period[1])];
            return periodRange;
        }

        switch (period) {
        case 'hour':
            start = moment(baseTimeStamp).hour(0).minute(0).second(0);
            break;
        case 'yesterday':
            start = moment(baseTimeStamp).subtract(1, 'day').hour(0).minute(0).second(0);
            endTimeStamp = moment(baseTimeStamp).subtract(1, 'day').hour(23).minute(59).second(59).toDate().getTime();
            break;
        case 'day':
            start = moment(baseTimeStamp).date(1).hour(0).minute(0).second(0);
            break;
        case 'prevMonth':
            start = moment(baseTimeStamp).subtract(1, "month").date(1).hour(0).minute(0).second(0);
            endTimeStamp = moment(baseTimeStamp).subtract(1, "month").endOf('month').hour(23).minute(59).second(59).toDate().getTime();
            break;
        case 'month':
            start = moment(baseTimeStamp).month(0).date(1).hour(0).minute(0).second(0);
            break;
        default:
            if (/([1-9][0-9]*)days/.test(period)) {
                var nDays = parseInt(/([1-9][0-9]*)days/.exec(period)[1]);
                start = moment(baseTimeStamp).startOf("day").subtract(nDays - 1, "days");
            }
            else if (/([1-9][0-9]*)weeks/.test(period)) {
                var nWeeks = parseInt(/([1-9][0-9]*)weeks/.exec(period)[1]);
                start = moment(baseTimeStamp).startOf("week").subtract((nWeeks - 1), "weeks");
            }
            else if (/([1-9][0-9]*)months/.test(period)) {
                var nMonths = parseInt(/([1-9][0-9]*)months/.exec(period)[1]);
                start = moment(baseTimeStamp).startOf("month").subtract((nMonths - 1), "months");
            }
            else if (/([1-9][0-9]*)years/.test(period)) {
                var nYears = parseInt(/([1-9][0-9]*)years/.exec(period)[1]);
                start = moment(baseTimeStamp).startOf("year").subtract((nYears - 1), "years");
            }
            else {
                // Default to 30 days
                start = moment(baseTimeStamp).startOf("day").subtract(29, "days");
            }
        }
        periodRange = [start.toDate().getTime(), endTimeStamp];
        return periodRange;
    }

    /**
     * Correct timezone offset on the timestamp for current browser's timezone
     * @param {number} inTS - second or millisecond timestamp
     * @returns {number} corrected timestamp applying user's timezone offset
     */
    getOffsetCorrectionForTimestamp(inTS) {
        var intLength = Math.round(inTS).toString().length,
            timeZoneOffset = new Date((intLength === 13) ? inTS : inTS * 1000).getTimezoneOffset(),
            tzAdjustment = 0;

        if (timeZoneOffset !== 0) {
            if (intLength === 13) {
                tzAdjustment = timeZoneOffset * 60000;
            }
            else if (intLength === 10) {
                tzAdjustment = timeZoneOffset * 60;
            }
        }

        return tzAdjustment;
    }

    /**
     * Get Date graph ticks for chart rendering
     * @param {string} [bucket] - time bucket (hourly, weekly, monthly)
     * @param {boolean} [overrideBucket] - override existing bucket logic to use single day view
     * @param {boolean} [newChart] - new chart implementation flag that affects tick reduction behavior
     * @returns {object} object containing min, max, tickTexts, ticks, labelCn, and tickKeys for graphs
     */
    getTickObj(bucket, overrideBucket, newChart) {
        var days = parseInt(this.periodObj.numberOfDays, 10),
            ticks = [],
            tickTexts = [],
            tickKeys = [],
            skipReduction = false,
            limitAdjustment = 0;
        var thisDay;
        var i = 0;

        if (overrideBucket) {
            if (this.periodObj.activePeriod) {
                thisDay = moment(this.periodObj.activePeriod, "YYYY.M.D");
            }
            else {
                thisDay = moment(this.periodObj.currentPeriodArr[0], "YYYY.M.D");
            }
            ticks.push([0, this.formatDate(thisDay, "D MMM")]);
            tickTexts[0] = this.formatDate(thisDay, "D MMM, dddd");
            tickKeys[0] = this.formatDate(thisDay, "YYYY:M:D");
        }
        else if ((days === 1 && this._period !== "month" && this._period !== "day") || (days === 1 && bucket === "hourly")) {
            // Single day
            if (this.periodObj.activePeriod) {
                thisDay = moment(this.periodObj.activePeriod, "YYYY.M.D");
            }
            else {
                thisDay = moment(this.periodObj.currentPeriodArr[0], "YYYY.M.D");
            }
            var dayValue = this.formatDate(thisDay, "YYYY:M:D");
            for (var z = 0; z < 24; z++) {
                ticks.push([z, (z + ":00")]);
                tickTexts.push((z + ":00"));
                tickKeys.push(dayValue + ":" + z);
            }
            skipReduction = true;
        }
        else {
            var start = moment().subtract(days, 'days');
            if (Object.prototype.toString.call(this.getPeriod()) === '[object Array]') {
                start = moment(this.periodObj.currentPeriodArr[this.periodObj.currentPeriodArr.length - 1], "YYYY.MM.DD").subtract(days, 'days');
            }

            if (bucket === "monthly") {
                var allMonths = [];
                var allKeys = [];

                start.add(1, 'day');

                var monthCount = 12;

                for (i = 0; i < monthCount; i++) {
                    allMonths.push(start.format(this.getDateFormat("MMM YYYY")));
                    allKeys.push(start.format("YYYY:M"));
                    start.add(1, 'months');
                }

                allMonths = _.uniq(allMonths);
                allKeys = _.uniq(allKeys);

                for (i = 0; i < allMonths.length; i++) {
                    ticks.push([i, allMonths[i]]);
                    tickTexts[i] = allMonths[i];
                    tickKeys[i] = allKeys[i];
                }
            }
            else if (bucket === "weekly") {
                var allWeeks = [];
                for (i = 0; i < days; i++) {
                    start.add(1, 'days');
                    if (i === 0 && start.isoWeekday() === 7) {
                        continue;
                    }
                    allWeeks.push(start.isoWeek() + " " + start.isoWeekYear());
                }

                allWeeks = _.uniq(allWeeks);

                for (i = 0; i < allWeeks.length; i++) {
                    var parts = allWeeks[i].split(" ");
                    if (parseInt(parts[1]) === moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).isoWeekday(4).year()) {
                        ticks.push([i, "W" + allWeeks[i]]);

                        var weekText = this.formatDate(moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).isoWeekday(1), ", D MMM YYYY");
                        tickTexts[i] = "W" + parts[0] + weekText;
                    }
                }
            }
            else if (bucket === "hourly") {
                for (i = 0; i < days; i++) {
                    start.add(1, 'days');

                    for (var j = 0; j < 24; j++) {
                        ticks.push([((24 * i) + j), this.formatDate(start, "D MMM") + " 0:00"]);
                        tickKeys.push(this.formatDate(start, "YYYY:M:D") + j);
                        tickTexts.push(this.formatDate(start, "D MMM, ") + j + ":00");
                    }
                }
            }
            else {
                if (this._period === "day") {
                    start.add(1, 'days');
                    var now = new Date();
                    var currentMonthCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    for (i = 0; i < currentMonthCount; i++) {
                        ticks.push([i, this.formatDate(start, "D MMM")]);
                        tickTexts[i] = this.formatDate(start, "D MMM, dddd");
                        tickKeys.push(this.formatDate(start, "YYYY:M:D"));
                        start.add(1, 'days');
                    }
                }
                else if (this._period === "prevMonth") {
                    start = moment().subtract(1, "month").startOf("month");
                    var current = new Date();
                    var prevMonthCount = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
                    for (i = 0; i < prevMonthCount; i++) {
                        ticks.push([i, this.formatDate(start, "D MMM")]);
                        tickTexts[i] = this.formatDate(start, "D MMM, dddd");
                        tickKeys.push(this.formatDate(start, "YYYY:M:D"));
                        start.add(1, 'days');
                    }
                }
                else {
                    var startYear = start.year();
                    var endYear = moment().year();
                    for (i = 0; i < days; i++) {
                        start.add(1, 'days');
                        if (startYear < endYear) {
                            ticks.push([i, this.formatDate(start, "D MMM YYYY")]);
                            tickTexts[i] = this.formatDate(start, "D MMM YYYY, dddd");
                        }
                        else {
                            ticks.push([i, this.formatDate(start, "D MMM")]);
                            tickTexts[i] = this.formatDate(start, "D MMM, dddd");
                        }
                        tickKeys.push(this.formatDate(start, "YYYY:M:D"));
                    }
                }
            }

            ticks = _.compact(ticks);
            tickTexts = _.compact(tickTexts);
        }

        var labelCn = ticks.length;
        if (!newChart) {
            if (ticks.length <= 2) {
                limitAdjustment = 0.02;
                var tmpTicks = [],
                    tmpTickTexts = [];

                tmpTickTexts[0] = "";
                tmpTicks[0] = [-0.02, ""];

                for (var m = 0; m < ticks.length; m++) {
                    tmpTicks[m + 1] = [m, ticks[m][1]];
                    tmpTickTexts[m + 1] = tickTexts[m];
                }

                tmpTickTexts.push("");
                tmpTicks.push([tmpTicks.length - 1 - 0.98, ""]);

                ticks = tmpTicks;
                tickTexts = tmpTickTexts;
            }
            else if (!skipReduction && ticks.length > 10) {
                var reducedTicks = [],
                    step = (Math.floor(ticks.length / 10) < 1) ? 1 : Math.floor(ticks.length / 10),
                    pickStartIndex = (Math.floor(ticks.length / 30) < 1) ? 1 : Math.floor(ticks.length / 30);

                for (var l = pickStartIndex; l < (ticks.length - 1); l = l + step) {
                    reducedTicks.push(ticks[l]);
                }

                ticks = reducedTicks;
            }
            else {
                ticks[0] = null;

                if (!(bucket === "hourly" && days !== 1)) {
                    ticks[ticks.length - 1] = null;
                }
            }
        }

        return {
            min: 0 - limitAdjustment,
            max: (limitAdjustment) ? tickTexts.length - 3 + limitAdjustment : tickTexts.length - 1,
            tickTexts: tickTexts,
            ticks: _.compact(ticks),
            labelCn: labelCn,
            tickKeys: tickKeys
        };
    }

    /**
     * Extract chart data from database object
     * @param {object} db - countly standard metric data object
     * @param {function} clearFunction - function to prefill expected properties with 0
     * @param {array} chartData - prefill chart data with labels, colors, etc
     * @param {array} dataProperties - describing which properties and how to extract
     * @param {string} [metric] - metric to select (optional, used as suffix for data path)
     * @param {boolean} [disableHours] - disable hourly data for graphs
     * @returns {object} object containing chartDP (chart data points), chartData (table data), and keyEvents (min/max values)
     */
    extractChartData(db, clearFunction, chartData, dataProperties, metric, disableHours) {
        if (metric) {
            metric = "." + metric;
        }
        else {
            metric = "";
        }
        this.periodObj = this.getPeriodObj();

        var periodMin = this.periodObj.periodMin,
            periodMax = (this.periodObj.periodMax + 1),
            dataObj = {},
            formattedDate = "",
            tableData = [],
            propertyNames = _.pluck(dataProperties, "name"),
            propertyFunctions = _.pluck(dataProperties, "func"),
            currOrPrevious = _.pluck(dataProperties, "period"),
            activeDate,
            activeDateArr,
            dateString = this.periodObj.dateString;
        var previousDateArr = [];

        if (this.periodObj.daysInPeriod === 1 && disableHours) {
            periodMax = 1;
            dateString = "D MMM";
        }

        for (var j = 0; j < propertyNames.length; j++) {
            if (currOrPrevious[j] === "previous") {
                if (this.periodObj.daysInPeriod === 1 && !disableHours) {
                    periodMin = 0;
                    periodMax = 24;
                    activeDate = this.periodObj.previousPeriodArr[0];
                }
                else {
                    if (this.periodObj.isSpecialPeriod) {
                        periodMin = 0;
                        periodMax = this.periodObj.previousPeriodArr.length;
                        activeDateArr = this.periodObj.previousPeriodArr;
                    }
                    else {
                        activeDate = this.periodObj.previousPeriod;
                        activeDateArr = this.periodObj.previousPeriodArr;
                    }
                }
            }
            else if (currOrPrevious[j] === "previousThisMonth") {
                var date = new Date();
                var lastDay = new Date(date.getFullYear(), date.getMonth(), 1);
                var currentMonthCount = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                var firstDay = new Date(lastDay.getTime());
                firstDay.setDate(lastDay.getDate() - currentMonthCount);

                for (var arr = [], dt = new Date(firstDay); dt <= new Date(lastDay); dt.setDate(dt.getDate() + 1)) {
                    arr.push(dt.getFullYear() + '.' + (dt.getMonth() + 1) + '.' + dt.getDate());
                }
                previousDateArr = arr;
            }
            else {
                if (this.periodObj.isSpecialPeriod) {
                    if (this.periodObj.isHourly) {
                        periodMin = 0;
                        periodMax = this.periodObj.currentPeriodArr.length;
                        activeDateArr = this.periodObj.currentPeriodArr;
                    }
                    else if (this.periodObj.daysInPeriod === 1 && !disableHours) {
                        periodMin = 0;
                        periodMax = 24;
                        activeDate = this.periodObj.currentPeriodArr[0];
                    }
                    else {
                        periodMin = 0;
                        periodMax = this.periodObj.currentPeriodArr.length;
                        activeDateArr = this.periodObj.currentPeriodArr;
                    }
                }
                else {
                    activeDate = this.periodObj.activePeriod;
                    activeDateArr = this.periodObj.currentPeriodArr;
                }
            }

            if (currOrPrevious[j] === "previousThisMonth") {
                for (var p = 0, counter_ = 0; p < previousDateArr.length - 1; p++, counter_++) {
                    formattedDate = moment((previousDateArr[p]).replace(/\./g, "/"), "YYYY/MM/DD");
                    dataObj = this.getDescendantProp(db, previousDateArr[p] + metric);
                    dataObj = clearFunction(dataObj);

                    if (!tableData[counter_]) {
                        tableData[counter_] = {};
                    }

                    tableData[counter_].date = this.formatDate(formattedDate, dateString);
                    var propertyValue_ = "";
                    if (propertyFunctions[j]) {
                        propertyValue_ = propertyFunctions[j](dataObj);
                    }
                    else {
                        propertyValue_ = dataObj[propertyNames[j]];
                    }

                    chartData[j].data[chartData[j].data.length] = [counter_, propertyValue_];
                    tableData[counter_][propertyNames[j]] = propertyValue_;
                }
            }
            else {
                for (var i = periodMin, counter = 0; i < periodMax; i++, counter++) {
                    if ((!this.periodObj.isSpecialPeriod && !disableHours) || (!this.periodObj.isSpecialPeriod && disableHours && this.periodObj.daysInPeriod !== 1)) {
                        if (this.periodObj.periodMin === 0) {
                            formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                        }
                        else if (("" + activeDate).indexOf(".") === -1) {
                            formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                        }
                        else {
                            formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                        }

                        dataObj = this.getDescendantProp(db, activeDate + "." + i + metric);
                    }
                    else if (this.periodObj.isHourly) {
                        formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                        dataObj = this.getDescendantProp(db, activeDateArr[i] + metric);
                    }
                    else if (this.periodObj.daysInPeriod === 1 && !disableHours) {
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                        dataObj = this.getDescendantProp(db, activeDate + "." + i + metric);
                    }
                    else {
                        formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                        dataObj = this.getDescendantProp(db, activeDateArr[i] + metric);
                    }

                    dataObj = clearFunction(dataObj);

                    if (!tableData[counter]) {
                        tableData[counter] = {};
                    }

                    tableData[counter].date = this.formatDate(formattedDate, dateString);
                    var propertyValue = "";
                    if (propertyFunctions[j]) {
                        propertyValue = propertyFunctions[j](dataObj);
                    }
                    else {
                        propertyValue = dataObj[propertyNames[j]];
                    }

                    chartData[j].data[chartData[j].data.length] = [counter, propertyValue];
                    tableData[counter][propertyNames[j]] = propertyValue;
                }
            }
        }

        var keyEvents = [];

        for (var k = 0; k < chartData.length; k++) {
            var flatChartData = _.flatten(chartData[k].data);
            var chartVals = _.reject(flatChartData, function(context, value) {
                return value % 2 === 0;
            });
            keyEvents[k] = {};
            keyEvents[k].min = _.min(chartVals);
            keyEvents[k].max = _.max(chartVals);
        }

        return { "chartDP": chartData, "chartData": _.compact(tableData), "keyEvents": keyEvents };
    }

    /**
     * Get descendant property from object using dot notation path
     * @param {object} obj - object to traverse
     * @param {string} path - dot-separated path (e.g., "2017.1.2")
     * @param {*} [def] - default value if path not found
     * @returns {*} value at path or default
     */
    getDescendantProp(obj, path, def) {
        for (var i = 0, my_path = (path + "").split('.'), len = my_path.length; i < len; i++) {
            if (!obj || typeof obj !== 'object') {
                return def;
            }
            obj = obj[my_path[i]];
        }

        if (obj === undefined) {
            return def;
        }
        return obj;
    }

    /**
     * Format date based on locale settings
     * @param {moment} date - moment js object
     * @param {string} format - format string
     * @returns {string} formatted date string
     */
    formatDate(date, format) {
        format = this.getDateFormat(format);
        return date.format(format);
    }

    /**
     * Get locale-specific date format
     * @param {string} format - format string
     * @returns {string} adjusted format string
     */
    getDateFormat(format) {
        if (this._browserLangShort.toLowerCase() === "ko") {
            format = format.replace("MMM D", "MMM D[일]").replace("D MMM", "MMM D[일]");
        }
        else if (this._browserLangShort.toLowerCase() === "ja") {
            format = format
                .replace("D MMM YYYY", "YYYY年 MMM D")
                .replace("MMM D, YYYY", "YYYY年 MMM D")
                .replace("D MMM, YYYY", "YYYY年 MMM D")
                .replace("MMM YYYY", "YYYY年 MMM")
                .replace("MMM D", "MMM D[日]")
                .replace("D MMM", "MMM D[日]");
        }
        else if (this._browserLangShort.toLowerCase() === "zh") {
            format = format.replace("MMMM", "M").replace("MMM", "M").replace("MM", "M").replace("DD", "D").replace("D M, YYYY", "YYYY M D").replace("D M", "M D").replace("D", "D[日]").replace("M", "M[月]").replace("YYYY", "YYYY[年]");
        }
        return format;
    }

    /**
     * Set browser language for date formatting
     * @param {string} langShort - short language code (e.g., "en", "ko", "ja")
     * @returns {void}
     */
    setBrowserLangShort(langShort) {
        this._browserLangShort = langShort;
    }

    // Private helper methods

    /**
     * Calculate the period object containing all period-related data
     * @private
     * @param {string|array} period - period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {number} [currentTimestamp] - optional timestamp to base calculations on (defaults to current time)
     * @returns {object} periodObject containing activePeriod, periodMax, periodMin, previousPeriod,
     *                   currentPeriodArr, previousPeriodArr, isSpecialPeriod, dateString, daysInPeriod,
     *                   numberOfDays, uniquePeriodArr, uniquePeriodCheckArr, previousUniquePeriodArr,
     *                   previousUniquePeriodCheckArr, periodContainsToday, start, end, uniqueMap, uniquePrevMap
     */
    _calculatePeriodObject(period, currentTimestamp) {
        var startTimestamp, endTimestamp, periodObject, cycleDuration, nDays;

        currentTimestamp = moment(currentTimestamp || undefined);

        periodObject = {
            activePeriod: undefined,
            periodMax: undefined,
            periodMin: undefined,
            previousPeriod: undefined,
            currentPeriodArr: [],
            previousPeriodArr: [],
            isSpecialPeriod: false,
            dateString: undefined,
            daysInPeriod: 0,
            numberOfDays: 0,
            uniquePeriodArr: [],
            uniquePeriodCheckArr: [],
            previousUniquePeriodArr: [],
            previousUniquePeriodCheckArr: [],
            periodContainsToday: true,
            _period: period
        };

        endTimestamp = currentTimestamp.clone().endOf("day");
        if (period && typeof period === "string" && period.indexOf(",") !== -1) {
            try {
                period = JSON.parse(period);
            }
            catch (SyntaxError) {
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

            if (fromDate.format("YYYY.M.D") === toDate.format("YYYY.M.D")) {
                cycleDuration = moment.duration(1, "day");
                Object.assign(periodObject, {
                    dateString: "D MMM, HH:mm",
                    periodMax: 23,
                    periodMin: 0,
                    activePeriod: fromDate.format("YYYY.M.D"),
                    currentPeriodArr: [fromDate.format("YYYY.M.D")],
                    previousPeriod: fromDate.clone().subtract(1, "day").format("YYYY.M.D")
                });
            }
            else if (fromDate.valueOf() > toDate.valueOf()) {
                nDays = 30;

                startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
                endTimestamp = currentTimestamp.clone().endOf("day");

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
            startTimestamp = currentTimestamp.clone().startOf("year");
            cycleDuration = moment.duration(1, "year");
            Object.assign(periodObject, {
                dateString: "MMM",
                periodMax: 12,
                periodMin: 1,
                activePeriod: currentTimestamp.year(),
                previousPeriod: currentTimestamp.year() - 1
            });
        }
        else if (period === "day") {
            startTimestamp = currentTimestamp.clone().startOf("month");
            cycleDuration = moment.duration(1, "month");
            Object.assign(periodObject, {
                dateString: "D MMM",
                periodMax: currentTimestamp.clone().endOf("month").date(),
                periodMin: 1,
                activePeriod: currentTimestamp.format("YYYY.M"),
                previousPeriod: currentTimestamp.clone().subtract(1, "month").format("YYYY.M")
            });
        }
        else if (period === "prevMonth") {
            startTimestamp = currentTimestamp.clone().subtract(1, "month").startOf("month");
            endTimestamp = currentTimestamp.clone().subtract(1, "month").endOf("month");
            cycleDuration = moment.duration(1, "month");
            Object.assign(periodObject, {
                dateString: "D MMM",
                periodMax: currentTimestamp.clone().subtract(1, "month").endOf("month").date(),
                periodMin: 1,
                activePeriod: currentTimestamp.clone().subtract(1, "month").format("YYYY.M"),
                previousPeriod: currentTimestamp.clone().subtract(2, "month").format("YYYY.M")
            });
        }
        else if (period === "hour") {
            startTimestamp = currentTimestamp.clone().startOf("day");
            cycleDuration = moment.duration(1, "day");
            Object.assign(periodObject, {
                dateString: "HH:mm",
                periodMax: 23,
                periodMin: 0,
                activePeriod: currentTimestamp.format("YYYY.M.D"),
                previousPeriod: currentTimestamp.clone().subtract(1, "day").format("YYYY.M.D")
            });
        }
        else if (period === "yesterday") {
            var yesterday = currentTimestamp.clone().subtract(1, "day");

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
        else if (/([1-9][0-9]*)minutes/.test(period)) {
            var nMinutes = parseInt(/([1-9][0-9]*)minutes/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("minute").subtract(nMinutes - 1, "minutes");
            cycleDuration = moment.duration(nMinutes, "minutes");
            Object.assign(periodObject, {
                dateString: "HH:mm",
                isSpecialPeriod: true
            });
        }
        else if (/([1-9][0-9]*)hours/.test(period)) {
            var nHours = parseInt(/([1-9][0-9]*)hours/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("hour").subtract(nHours - 1, "hours");
            endTimestamp = currentTimestamp.clone().endOf("hour");
            cycleDuration = moment.duration(nHours, "hours");
            Object.assign(periodObject, {
                isHourly: true,
                dateString: "D MMM, HH:mm",
                isSpecialPeriod: true,
            });
        }
        else if (/([1-9][0-9]*)days/.test(period)) {
            nDays = parseInt(/([1-9][0-9]*)days/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
            cycleDuration = moment.duration(nDays, "days");
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
        else if (/([1-9][0-9]*)weeks/.test(period)) {
            var nWeeks = parseInt(/([1-9][0-9]*)weeks/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("week").subtract((nWeeks - 1), "weeks");
            cycleDuration = moment.duration(currentTimestamp.clone().diff(startTimestamp)).asDays() + 1;
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
        else if (/([1-9][0-9]*)months/.test(period)) {
            var nMonths = parseInt(/([1-9][0-9]*)months/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("month").subtract((nMonths - 1), "months");
            cycleDuration = moment.duration(currentTimestamp.clone().diff(startTimestamp)).asDays() + 1;
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
        else if (/([1-9][0-9]*)years/.test(period)) {
            var nYears = parseInt(/([1-9][0-9]*)years/.exec(period)[1]);
            startTimestamp = currentTimestamp.clone().startOf("year").subtract((nYears - 1), "years");
            cycleDuration = moment.duration(currentTimestamp.clone().diff(startTimestamp)).asDays() + 1;
            Object.assign(periodObject, {
                dateString: "D MMM",
                isSpecialPeriod: true
            });
        }
        else {
            // Incorrect period, defaulting to 30 days
            nDays = 30;

            startTimestamp = currentTimestamp.clone().startOf("day").subtract(nDays - 1, "days");
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
            numberOfDays: Math.round(moment.duration(endTimestamp - startTimestamp).asDays()),
            periodContainsToday: (startTimestamp <= currentTimestamp) && (currentTimestamp <= endTimestamp),
        });

        if (startTimestamp.weekYear() !== endTimestamp.weekYear()) {
            Object.assign(periodObject, {
                dateString: (periodObject.dateString + ", YYYY")
            });
        }

        var uniqueMap = {};
        var uniquePrevMap = {};

        var date0 = startTimestamp.clone().format("YYYY.M.D");
        date0 = date0.split(".");
        var sY = date0[0];
        var sM = date0[1];

        var date1 = endTimestamp.clone().format("YYYY.M.D");
        date1 = date1.split(".");
        var eY = date1[0];
        var eM = date1[1];

        date0 = startTimestamp.clone().subtract(cycleDuration).format("YYYY.M.D");
        date0 = date0.split(".");
        var psY = date0[0];
        var psM = date0[1];

        date1 = endTimestamp.clone().subtract(cycleDuration).format("YYYY.M.D");
        date1 = date1.split(".");
        var peY = date1[0];
        var peM = date1[1];

        for (var dayIt = startTimestamp.clone(); dayIt < endTimestamp; dayIt.add(1, "day")) {
            var dateVal = dayIt.format("YYYY.M.D");
            var week = Math.ceil(dayIt.format("DDD") / 7);
            dateVal = dateVal.split(".");

            uniqueMap[dateVal[0]] = uniqueMap[dateVal[0]] || {};
            if (dateVal[0] === sY || dateVal[0] === eY) {
                uniqueMap[dateVal[0]][dateVal[1]] = uniqueMap[dateVal[0]][dateVal[1]] || {};
                if ((dateVal[0] === sY && dateVal[1] === sM) || (dateVal[0] === eY && dateVal[1] === eM)) {
                    uniqueMap[dateVal[0]][dateVal[1]]["w" + week] = uniqueMap[dateVal[0]][dateVal[1]]["w" + week] || {};
                    uniqueMap[dateVal[0]][dateVal[1]]["w" + week][dateVal[2]] = uniqueMap[dateVal[0]][dateVal[1]]["w" + week][dateVal[2]] || {};
                }
            }
            if (!periodObject.isHourly) {
                periodObject.currentPeriodArr.push(dayIt.format("YYYY.M.D"));
                periodObject.previousPeriodArr.push(dayIt.clone().subtract(cycleDuration).format("YYYY.M.D"));
            }
            dateVal = dayIt.clone().subtract(cycleDuration).format("YYYY.M.D");
            week = Math.ceil(dayIt.clone().subtract(cycleDuration).format("DDD") / 7);
            dateVal = dateVal.split(".");

            uniquePrevMap[dateVal[0]] = uniquePrevMap[dateVal[0]] || {};
            if (dateVal[0] === psY || dateVal[0] === peY) {
                uniquePrevMap[dateVal[0]][dateVal[1]] = uniquePrevMap[dateVal[0]][dateVal[1]] || {};
                if ((dateVal[0] === psY && dateVal[1] === psM) || (dateVal[0] === peY && dateVal[1] === peM)) {
                    uniquePrevMap[dateVal[0]][dateVal[1]]["w" + week] = uniquePrevMap[dateVal[0]][dateVal[1]]["w" + week] || {};
                    uniquePrevMap[dateVal[0]][dateVal[1]]["w" + week][dateVal[2]] = uniquePrevMap[dateVal[0]][dateVal[1]]["w" + week][dateVal[2]] || {};
                }
            }
        }

        if (periodObject.daysInPeriod === 1 && periodObject.currentPeriodArr && Array.isArray(periodObject.currentPeriodArr)) {
            periodObject.activePeriod = periodObject.currentPeriodArr[0];
        }

        if (periodObject.isHourly) {
            var startHour = startTimestamp.clone(),
                endHour = endTimestamp.clone();
            for (startHour; startHour < endHour; startHour.add(1, "hours")) {
                periodObject.currentPeriodArr.push(startHour.format("YYYY.M.D.H"));
                periodObject.previousPeriodArr.push(startHour.clone().subtract(cycleDuration).format("YYYY.M.D.H"));
            }
        }

        var currentYear = 0,
            currWeeksArr = [],
            currWeekCounts = {},
            currMonthsArr = [],
            currMonthCounts = {},
            currPeriodArr = [],
            prevWeeksArr = [],
            prevWeekCounts = {},
            prevMonthsArr = [],
            prevMonthCounts = {},
            prevPeriodArr = [];

        if (periodObject.daysInPeriod !== 0) {
            for (var i = (periodObject.daysInPeriod - 1); i > -1; i--) {
                var currIndex = moment(endTimestamp).subtract(i, 'days'),
                    currIndexYear = currIndex.year(),
                    prevIndex = moment(endTimestamp).subtract((periodObject.daysInPeriod + i), 'days'),
                    prevYear = prevIndex.year();

                currentYear = currIndexYear;

                var currWeek = currentYear + "." + "w" + Math.ceil(currIndex.format("DDD") / 7);
                currWeeksArr[currWeeksArr.length] = currWeek;
                currWeekCounts[currWeek] = (currWeekCounts[currWeek]) ? (currWeekCounts[currWeek] + 1) : 1;

                var currMonth = currIndex.format("YYYY.M");
                currMonthsArr[currMonthsArr.length] = currMonth;
                currMonthCounts[currMonth] = (currMonthCounts[currMonth]) ? (currMonthCounts[currMonth] + 1) : 1;

                currPeriodArr[currPeriodArr.length] = currIndex.format("YYYY.M.D");

                var prevWeek = prevYear + "." + "w" + Math.ceil(prevIndex.format("DDD") / 7);
                prevWeeksArr[prevWeeksArr.length] = prevWeek;
                prevWeekCounts[prevWeek] = (prevWeekCounts[prevWeek]) ? (prevWeekCounts[prevWeek] + 1) : 1;

                var prevMonth = prevIndex.format("YYYY.M");
                prevMonthsArr[prevMonthsArr.length] = prevMonth;
                prevMonthCounts[prevMonth] = (prevMonthCounts[prevMonth]) ? (prevMonthCounts[prevMonth] + 1) : 1;

                prevPeriodArr[prevPeriodArr.length] = prevIndex.format("YYYY.M.D");
            }
        }

        periodObject.uniquePeriodArr = this._getUniqArray(period, currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts, currPeriodArr);
        periodObject.uniquePeriodCheckArr = this._getUniqCheckArray(period, currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts);
        periodObject.previousUniquePeriodArr = this._getUniqArray(period, prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts, prevPeriodArr);
        periodObject.previousUniquePeriodCheckArr = this._getUniqCheckArray(period, prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts);
        periodObject.uniqueMap = uniqueMap;
        periodObject.uniquePrevMap = uniquePrevMap;

        return periodObject;
    }

    /**
     * Get unique period array for data aggregation
     * @private
     * @param {string|array} period - period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {array} weeksArray_pd - array of week identifiers for the period
     * @param {object} weekCounts_pd - object with week counts keyed by week identifier
     * @param {array} monthsArray_pd - array of month identifiers for the period
     * @param {object} monthCounts_pd - object with month counts keyed by month identifier
     * @param {array} periodArr_pd - array of day identifiers for the period
     * @returns {array} unique period array for aggregation queries
     */
    _getUniqArray(period, weeksArray_pd, weekCounts_pd, monthsArray_pd, monthCounts_pd, periodArr_pd) {
        if (period === "month" || period === "day" || period === "yesterday" || period === "hour") {
            return [];
        }

        if (Object.prototype.toString.call(period) === '[object Array]' && period.length === 2) {
            if (period[0] + 24 * 60 * 60 * 1000 >= period[1]) {
                return [];
            }
        }

        var weeksArray = this._clone(weeksArray_pd),
            weekCounts = this._clone(weekCounts_pd),
            monthsArray = this._clone(monthsArray_pd),
            monthCounts = this._clone(monthCounts_pd),
            periodArr = this._clone(periodArr_pd);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1,
            rejectedWeeks = [],
            rejectedWeekDayCounts = {};
        var key = 0;
        var i = 0;

        for (key in weekCounts) {
            if (key === moment().format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 7) {
                for (i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (key in monthCounts) {
            if (tmpPrevKey !== key) {
                if (moment().format("YYYY.M") === key) {
                    tmpDaysInMonth = moment().format("D");
                }
                else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < tmpDaysInMonth) {
                for (i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (i = 0; i < monthsArray.length; i++) {
            if (parseInt(monthsArray[i]) === 0) {
                if (parseInt(weeksArray[i]) === 0 || (rejectedWeeks.indexOf(weeksArray[i]) !== -1)) {
                    uniquePeriods[i] = periodArr[i];
                }
                else {
                    uniquePeriods[i] = weeksArray[i];
                }
            }
            else {
                rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
                uniquePeriods[i] = monthsArray[i];

                if (rejectedWeekDayCounts[weeksArray[i]]) {
                    rejectedWeekDayCounts[weeksArray[i]].count++;
                }
                else {
                    rejectedWeekDayCounts[weeksArray[i]] = {
                        count: 1,
                        index: i
                    };
                }
            }
        }

        var totalWeekCounts = _.countBy(weeksArray, function(per) {
            return per;
        });

        for (var weekDayCount in rejectedWeekDayCounts) {
            if (rejectedWeekDayCounts[weekDayCount].count === 7) {
                continue;
            }

            if (moment().format("YYYY.\\w w").replace(" ", "") === weekDayCount && totalWeekCounts[weekDayCount] === rejectedWeekDayCounts[weekDayCount].count) {
                continue;
            }

            var startIndex = rejectedWeekDayCounts[weekDayCount].index - (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count),
                limit = startIndex + (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count);

            for (i = startIndex; i < limit; i++) {
                if (parseInt(monthsArray[i]) === 0) {
                    uniquePeriods[i] = periodArr[i];
                }
            }
        }

        rejectedWeeks = _.uniq(rejectedWeeks);
        uniquePeriods = _.uniq(_.difference(uniquePeriods, rejectedWeeks));

        return uniquePeriods;
    }

    /**
     * Get unique period check array for validation
     * @private
     * @param {string|array} period - period value (e.g., "30days", "7days", "month", [startMs, endMs])
     * @param {array} weeksArray_pd - array of week identifiers for the period
     * @param {object} weekCounts_pd - object with week counts keyed by week identifier
     * @param {array} monthsArray_pd - array of month identifiers for the period
     * @param {object} monthCounts_pd - object with month counts keyed by month identifier
     * @returns {array} unique period check array for validation
     */
    _getUniqCheckArray(period, weeksArray_pd, weekCounts_pd, monthsArray_pd, monthCounts_pd) {
        if (period === "month" || period === "day" || period === "yesterday" || period === "hour") {
            return [];
        }

        if (Object.prototype.toString.call(period) === '[object Array]' && period.length === 2) {
            if (period[0] + 24 * 60 * 60 * 1000 >= period[1]) {
                return [];
            }
        }

        var weeksArray = this._clone(weeksArray_pd),
            weekCounts = this._clone(weekCounts_pd),
            monthsArray = this._clone(monthsArray_pd),
            monthCounts = this._clone(monthCounts_pd);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1;
        var key = 0;
        var i = 0;

        for (key in weekCounts) {
            if (key === moment().format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 1) {
                for (i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (key in monthCounts) {
            if (tmpPrevKey !== key) {
                if (moment().format("YYYY.M") === key) {
                    tmpDaysInMonth = moment().format("D");
                }
                else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < (tmpDaysInMonth * 0.5)) {
                for (i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (i = 0; i < monthsArray.length; i++) {
            if (parseInt(monthsArray[i]) === 0) {
                if (parseInt(weeksArray[i]) !== 0) {
                    uniquePeriods[i] = weeksArray[i];
                }
            }
            else {
                uniquePeriods[i] = monthsArray[i];
            }
        }

        uniquePeriods = _.uniq(uniquePeriods);

        return uniquePeriods;
    }

    /**
     * Deep clone helper for creating independent copies of objects
     * @private
     * @param {*} obj - object, array, date, or primitive to clone
     * @returns {*} deep cloned copy of the input
     */
    _clone(obj) {
        if (null === obj || "object" !== typeof obj) {
            return obj;
        }

        var copy = "";
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = this._clone(obj[i]);
            }
            return copy;
        }

        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, attr)) {
                    copy[attr] = this._clone(obj[attr]);
                }
            }
            return copy;
        }
    }
}