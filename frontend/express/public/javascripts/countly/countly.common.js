/**
 * Countly Common Module
 *
 * This module provides common utilities for Countly frontend.
 * It has been refactored to import from sub-modules to prevent circular dependencies.
 *
 * @module countly.common
 */

// ============================================================================
// Import from sub-modules
// ============================================================================

import * as COUNTLY_CONFIG from './countly.config.js';

// State management - import store directly
import vuexStore from './vue/data/store.js';

// Pure utility functions
import {
    encode,
    decode,
    decodeHtml,
    encodeHtml,
    unescapeHtml,
    unescapeString,
    encodeSomeHtml,
    toFirstUpper,
    leadingZero,
    round,
    getPercentChange,
    getShortNumber,
    formatNumber,
    formatNumberSafe,
    union,
    deepObjectExtend,
    getDescendantProp,
    dot,
    sortByProperty,
    mergeMetricsByName,
    generateId,
    Levenshtein,
    getExternalDrawerData
} from './countly.common.utils.js';

// Formatters
import {
    getDateFormat,
    formatDate,
    getDate,
    getTime,
    formatTimeAndDateShort,
    formatTimeAgoText,
    formatTimeAgo,
    formatTimeAgoTextFromDiff,
    formatDuration,
    formatTime,
    timeString,
    formatSecond,
    getMonths,
    processPeriod,
    getTimePeriodDescriptions,
    convertToTimePeriodObj
} from './countly.common.formatters.js';

// Other dependencies
import countlyGlobal from './countly.global.js';
// Note: storejs is no longer imported here - persistence is handled by Vuex store actions
import jQuery from 'jquery';
import moment from 'moment';
import _ from 'underscore';
import { get as getTotalUsers, isUsable as isTotalUsersUsable } from './countly.total.users.js';
import { getPeriodUrlQueryParameter } from './countly.utils.js';

// ============================================================================
// Re-export utility functions for convenience
// Note: For state management, import the store default export from
// './vue/data/store.js' and access state via store.state.countlyCommon.*
// ============================================================================

export {
    // Utils
    encode,
    decode,
    decodeHtml,
    encodeHtml,
    unescapeHtml,
    unescapeString,
    encodeSomeHtml,
    toFirstUpper,
    leadingZero,
    round,
    getPercentChange,
    getShortNumber,
    formatNumber,
    formatNumberSafe,
    union,
    deepObjectExtend,
    getDescendantProp,
    dot,
    sortByProperty,
    mergeMetricsByName,
    generateId,
    Levenshtein,
    getExternalDrawerData,

    // Formatters
    getDateFormat,
    formatDate,
    getDate,
    getTime,
    formatTimeAndDateShort,
    formatTimeAgoText,
    formatTimeAgo,
    formatTimeAgoTextFromDiff,
    formatDuration,
    formatTime,
    timeString,
    formatSecond,
    getMonths,
    processPeriod,
    getTimePeriodDescriptions,
    convertToTimePeriodObj,
};

// ============================================================================
// CommonConstructor - Main class for backward compatibility
// ============================================================================

/**
 * Object with common functions to be used for multiple purposes
 * @name countlyCommon
 * @global
 * @namespace countlyCommon
 */
var CommonConstructor = function() {
    var countlyCommon = this;

    // ========================================================================
    // Properties with getters/setters for state synchronization
    // ========================================================================

    Object.defineProperty(countlyCommon, 'ACTIVE_APP_KEY', {
        get: function() {
            return vuexStore.state.countlyCommon.activeAppKey;
        },
        set: function(val) {
            vuexStore.commit('countlyCommon/setActiveAppKey', val);
        },
        enumerable: true
    });

    Object.defineProperty(countlyCommon, 'ACTIVE_APP_ID', {
        get: function() {
            return vuexStore.state.countlyCommon.activeAppId;
        },
        set: function(val) {
            vuexStore.commit('countlyCommon/setActiveAppId', val);
        },
        enumerable: true
    });

    Object.defineProperty(countlyCommon, 'BROWSER_LANG', {
        get: function() {
            return vuexStore.state.countlyCommon.browserLang;
        },
        set: function(val) {
            vuexStore.commit('countlyCommon/setBrowserLang', val);
        },
        enumerable: true
    });

    Object.defineProperty(countlyCommon, 'BROWSER_LANG_SHORT', {
        get: function() {
            return vuexStore.state.countlyCommon.browserLangShort;
        },
        set: function(val) {
            vuexStore.commit('countlyCommon/setBrowserLangShort', val);
        },
        enumerable: true
    });

    // Copy config constants
    Object.assign(countlyCommon, COUNTLY_CONFIG);

    // ========================================================================
    // Initialize periodObj from store
    // ========================================================================

    countlyCommon.periodObj = vuexStore.state.countlyCommon.periodCalculator.periodObj;

    // ========================================================================
    // Persistent Settings (delegating to store)
    // ========================================================================

    countlyCommon.setPersistentSettings = function(data) {
        vuexStore.dispatch('countlyCommon/updatePersistentSettings', data);
    };
    countlyCommon.getPersistentSettings = function() {
        return vuexStore.state.countlyCommon.persistentSettings;
    };

    // ========================================================================
    // Period Management
    // ========================================================================

    /**
     * Change currently selected period
     * @param {string|array} period - new period
     * @param {int} timeStamp - timestamp for the period based
     */
    countlyCommon.setPeriod = function(period, timeStamp) {
        var calculator = vuexStore.state.countlyCommon.periodCalculator;
        // Use store to update period (handles persistence)
        vuexStore.dispatch('countlyCommon/updatePeriod', {
            period: period,
            timeStamp: timeStamp,
            browserLangShort: countlyCommon.BROWSER_LANG_SHORT,
            label: countlyCommon.getDateRangeForCalendar()
        });
        countlyCommon.periodObj = calculator.periodObj;
    };

    /**
     * Get currently selected period
     * @returns {string|array} current period
     */
    countlyCommon.getPeriod = function() {
        return vuexStore.state.countlyCommon.periodCalculator._period;
    };

    /**
     * Getter for period object
     * @returns {object} periodObj
     */
    countlyCommon.getPeriodObj = function() {
        var calculator = vuexStore.state.countlyCommon.periodCalculator;
        var currentPeriod = calculator._period;
        if (countlyCommon.periodObj._period !== currentPeriod) {
            calculator.setBrowserLangShort(countlyCommon.BROWSER_LANG_SHORT);
            calculator.setPeriod(currentPeriod);
            countlyCommon.periodObj = calculator.periodObj;
        }
        return countlyCommon.periodObj;
    };

    /**
     * Get period object for a specific period
     * @param {object} period - period to calculate
     * @param {number} currentTimeStamp - timestamp
     * @returns {object} period object
     */
    countlyCommon.calcSpecificPeriodObj = function(period, currentTimeStamp) {
        var calculator = vuexStore.state.countlyCommon.periodCalculator;
        calculator.setBrowserLangShort(countlyCommon.BROWSER_LANG_SHORT);
        return calculator.calcSpecificPeriodObj(period, currentTimeStamp);
    };

    /**
     * Returns period as date strings
     * @param {object} passed_period - optional period to use
     * @returns {string} period as date strings
     */
    countlyCommon.getPeriodAsDateStrings = function(passed_period) {
        var array = [];
        var splitted;
        var currentPeriod = vuexStore.state.countlyCommon.periodCalculator._period;
        if (passed_period) {
            if (Array.isArray(passed_period)) {
                var periodObj = countlyCommon.calcSpecificPeriodObj(passed_period);
                splitted = periodObj.currentPeriodArr[0].split('.');
                array.push(splitted[2] + '-' + splitted[1] + '-' + splitted[0] + ' 00:00:00');
                splitted = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split('.');
                array.push(splitted[2] + '-' + splitted[1] + '-' + splitted[0] + ' 23:59:59');
                return JSON.stringify(array);
            }
            return passed_period;
        }
        else if (Array.isArray(currentPeriod)) {
            if (countlyCommon.periodObj.currentPeriodArr && countlyCommon.periodObj.currentPeriodArr.length > 0) {
                splitted = countlyCommon.periodObj.currentPeriodArr[0].split('.');
                array.push(splitted[2] + '-' + splitted[1] + '-' + splitted[0] + ' 00:00:00');
                splitted = countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1].split('.');
                array.push(splitted[2] + '-' + splitted[1] + '-' + splitted[0] + ' 23:59:59');
            }
            return JSON.stringify(array);
        }
        return countlyCommon.getPeriodForAjax();
    };

    countlyCommon.removePeriodOffset = function(period) {
        var newPeriod = period;
        if (Array.isArray(period)) {
            newPeriod = [];
            newPeriod[0] = period[0] + countlyCommon.getOffsetCorrectionForTimestamp(period[0]);
            newPeriod[1] = period[1] + countlyCommon.getOffsetCorrectionForTimestamp(period[1]);
        }
        return newPeriod;
    };

    countlyCommon.getPeriodWithOffset = function(period) {
        var newPeriod = period;
        if (Array.isArray(period)) {
            newPeriod = [];
            newPeriod[0] = period[0] - countlyCommon.getOffsetCorrectionForTimestamp(period[0]);
            newPeriod[1] = period[1] - countlyCommon.getOffsetCorrectionForTimestamp(period[1]);
        }
        return newPeriod;
    };

    countlyCommon.getPeriodForAjax = function() {
        return getPeriodUrlQueryParameter(countlyCommon.getPeriodWithOffset(vuexStore.state.countlyCommon.periodCalculator._period));
    };

    countlyCommon.getOffsetCorrectionForTimestamp = function(inTS) {
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
    };

    countlyCommon.getPeriodRange = function(period, baseTimeStamp) {
        return vuexStore.state.countlyCommon.periodCalculator.getPeriodRange(period, baseTimeStamp);
    };

    // ========================================================================
    // App Management
    // ========================================================================

    /**
     * Change currently selected app by app ID
     * Uses the Vuex store as single source of truth for app state.
     * The store action handles:
     * - Setting activeAppKey, activeAppId, and activeApp in state
     * - Persisting to localStorage
     * - Persisting to server via Ajax
     * @param {string} appId - new app ID
     * @param {boolean} [persistToServer=true] - whether to persist to server
     */
    countlyCommon.setActiveApp = function(appId, persistToServer) {
        vuexStore.dispatch('countlyCommon/setActiveAppById', {
            appId: appId,
            persistToServer: persistToServer !== false
        });
    };

    // ========================================================================
    // Notifications (delegating to store functions)
    // ========================================================================

    countlyCommon.dispatchNotificationToast = function(payload) {
        vuexStore.dispatch('countlyCommon/onAddNotificationToast', payload);
    };
    countlyCommon.dispatchPersistentNotification = function(payload) {
        vuexStore.dispatch('countlyCommon/onAddPersistentNotification', payload);
    };
    countlyCommon.removePersistentNotification = function(notificationId) {
        vuexStore.dispatch('countlyCommon/onRemovePersistentNotification', notificationId);
    };

    // ========================================================================
    // Utility Methods (delegating to imported functions)
    // ========================================================================

    countlyCommon.encode = encode;
    countlyCommon.decode = decode;
    countlyCommon.decodeHtml = decodeHtml;
    countlyCommon.encodeHtml = encodeHtml;
    countlyCommon.unescapeHtml = unescapeHtml;
    countlyCommon.unescapeString = unescapeString;
    countlyCommon.encodeSomeHtml = encodeSomeHtml;
    countlyCommon.toFirstUpper = toFirstUpper;
    countlyCommon.round = round;
    countlyCommon.getPercentChange = getPercentChange;
    countlyCommon.getShortNumber = getShortNumber;
    countlyCommon.formatNumber = formatNumber;
    countlyCommon.formatNumberSafe = formatNumberSafe;
    countlyCommon.union = union;
    countlyCommon.deepObjectExtend = deepObjectExtend;
    countlyCommon.getDescendantProp = getDescendantProp;
    countlyCommon.dot = dot;
    countlyCommon.sortByProperty = sortByProperty;
    countlyCommon.generateId = generateId;
    countlyCommon.Levenshtein = Levenshtein;
    countlyCommon.getExternalDrawerData = getExternalDrawerData;

    // ========================================================================
    // Formatter Methods (delegating with state)
    // ========================================================================

    countlyCommon.formatDate = function(date, format) {
        return formatDate(date, format, countlyCommon.BROWSER_LANG_SHORT);
    };

    countlyCommon.getDateFormat = function(format) {
        return getDateFormat(format, countlyCommon.BROWSER_LANG_SHORT);
    };

    countlyCommon.getDate = getDate;
    countlyCommon.getTime = getTime;
    countlyCommon.formatTimeAndDateShort = formatTimeAndDateShort;
    countlyCommon.formatTimeAgo = formatTimeAgo;
    countlyCommon.formatTimeAgoText = formatTimeAgoText;
    countlyCommon.formatTimeAgoTextFromDiff = formatTimeAgoTextFromDiff;
    countlyCommon.formatTime = formatTime;
    countlyCommon.timeString = timeString;
    countlyCommon.formatSecond = formatSecond;
    countlyCommon.getMonths = getMonths;
    countlyCommon.processPeriod = processPeriod;
    countlyCommon.getTimePeriodDescriptions = getTimePeriodDescriptions;
    countlyCommon.convertToTimePeriodObj = convertToTimePeriodObj;

    // ========================================================================
    // Date Range Methods
    // ========================================================================

    countlyCommon.getDateRange = function() {
        countlyCommon.periodObj = countlyCommon.getPeriodObj();
        var formattedDateStart = '';
        var formattedDateEnd = '';

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            if (countlyCommon.periodObj.dateString === 'HH:mm') {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + ' ' + countlyCommon.periodObj.periodMin + ':00', 'YYYY.M.D HH:mm');
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + ' ' + countlyCommon.periodObj.periodMax + ':00', 'YYYY.M.D HH:mm');
                var nowMin = moment().format('mm');
                formattedDateEnd.add(nowMin, 'minutes');
            }
            else if (countlyCommon.periodObj.dateString === 'D MMM, HH:mm') {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod, 'YYYY.M.D');
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, 'YYYY.M.D').add(23, 'hours').add(59, 'minutes');
            }
            else {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMin, 'YYYY.M.D');
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMax, 'YYYY.M.D');
            }
        }
        else {
            formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], 'YYYY.M.D');
            formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], 'YYYY.M.D');
        }

        var fromStr = countlyCommon.formatDate(formattedDateStart, countlyCommon.periodObj.dateString),
            toStr = countlyCommon.formatDate(formattedDateEnd, countlyCommon.periodObj.dateString);

        if (fromStr === toStr) {
            return fromStr;
        }
        return fromStr + ' - ' + toStr;
    };

    countlyCommon.getDateRangeForCalendar = function() {
        countlyCommon.periodObj = countlyCommon.getPeriodObj();
        var formattedDateStart = '';
        var formattedDateEnd = '';

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            if (countlyCommon.periodObj.dateString === 'HH:mm') {
                formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + ' ' + countlyCommon.periodObj.periodMin + ':00', 'YYYY.M.D HH:mm'), 'D MMM, YYYY HH:mm');
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + ' ' + countlyCommon.periodObj.periodMax + ':00', 'YYYY.M.D HH:mm');
                formattedDateEnd = formattedDateEnd.add(59, 'minutes');
                formattedDateEnd = countlyCommon.formatDate(formattedDateEnd, 'D MMM, YYYY HH:mm');
            }
            else if (countlyCommon.periodObj.dateString === 'D MMM, HH:mm') {
                formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod, 'YYYY.M.D'), 'D MMM, YYYY HH:mm');
                formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod, 'YYYY.M.D').add(23, 'hours').add(59, 'minutes'), 'D MMM, YYYY HH:mm');
            }
            else if (countlyCommon.periodObj.dateString === 'MMM') {
                formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMin + '.1', 'YYYY.M.D'), 'D MMM, YYYY');
                formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMax + '.31', 'YYYY.M.D'), 'D MMM, YYYY');
            }
            else {
                formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMin, 'YYYY.M.D'), 'D MMM, YYYY');
                formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.activePeriod + '.' + countlyCommon.periodObj.periodMax, 'YYYY.M.D'), 'D MMM, YYYY');
            }
        }
        else {
            formattedDateStart = countlyCommon.formatDate(moment(countlyCommon.periodObj.currentPeriodArr[0], 'YYYY.M.D'), 'D MMM, YYYY');
            formattedDateEnd = countlyCommon.formatDate(moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], 'YYYY.M.D'), 'D MMM, YYYY');
        }
        return formattedDateStart + ' - ' + formattedDateEnd;
    };

    // ========================================================================
    // Tick Object
    // ========================================================================

    countlyCommon.getTickObj = function(bucket, overrideBucket, newChart) {
        var calculator = vuexStore.state.countlyCommon.periodCalculator;
        var currentPeriod = calculator._period;
        calculator.setBrowserLangShort(countlyCommon.BROWSER_LANG_SHORT);
        if (calculator.periodObj._period !== currentPeriod) {
            calculator.setPeriod(currentPeriod);
        }
        return calculator.getTickObj(bucket, overrideBucket, newChart);
    };

    // ========================================================================
    // Graph Type Check
    // ========================================================================

    countlyCommon.checkGraphType = function(type, settings) {
        var eType = 'line';
        if (settings && settings.series && settings.series.bars && settings.series.bars.show === true) {
            if (settings.series.stack === true) {
                eType = 'bar';
            }
            else {
                eType = 'seperate-bar';
            }
        }
        else if (settings && settings.series && settings.series.pie && settings.series.pie.show === true) {
            eType = 'pie';
        }

        return type === eType;
    };

    // ========================================================================
    // Data Extraction Methods
    // ========================================================================

    countlyCommon.extractRangeData = function(db, propertyName, rangeArray, explainRange, myorder) {
        countlyCommon.periodObj = countlyCommon.getPeriodObj();

        var dataArr = [],
            dataArrCounter = 0,
            rangeTotal,
            total = 0;
        var tmp_x = 0;

        if (!rangeArray) {
            return dataArr;
        }

        for (var j = 0; j < rangeArray.length; j++) {
            rangeTotal = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + '.' + propertyName);

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
                var i = 0;
                for (i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                    tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + '.' + propertyName);
                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        rangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                for (i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                    tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + '.' + propertyName);
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

        for (var z = 0; z < dataArr.length; z++) {
            dataArr[z].percent = ((dataArr[z].t / total) * 100).toFixed(1);
        }

        if (myorder && Array.isArray(myorder)) {
            dataArr.sort(function(a, b) {
                return (myorder.indexOf(a[propertyName]) - myorder.indexOf(b[propertyName]));
            });
        }
        else {
            dataArr.sort(function(a, b) {
                return -(a.t - b.t);
            });
        }
        return dataArr;
    };

    countlyCommon.extractChartData = function(db, clearFunction, chartData, dataProperties, metric, disableHours) {
        if (metric) {
            metric = '.' + metric;
        }
        else {
            metric = '';
        }
        countlyCommon.periodObj = countlyCommon.getPeriodObj();

        var periodMin = countlyCommon.periodObj.periodMin,
            periodMax = (countlyCommon.periodObj.periodMax + 1),
            dataObj = {},
            formattedDate = '',
            tableData = [],
            propertyNames = _.pluck(dataProperties, 'name'),
            propertyFunctions = _.pluck(dataProperties, 'func'),
            currOrPrevious = _.pluck(dataProperties, 'period'),
            activeDate,
            activeDateArr,
            dateString = countlyCommon.periodObj.dateString;
        var previousDateArr = [];

        if (countlyCommon.periodObj.daysInPeriod === 1 && disableHours) {
            periodMax = 1;
            dateString = 'D MMM';
        }

        for (var j = 0; j < propertyNames.length; j++) {
            if (currOrPrevious[j] === 'previous') {
                if (countlyCommon.periodObj.daysInPeriod === 1 && !disableHours) {
                    periodMin = 0;
                    periodMax = 24;
                    activeDate = countlyCommon.periodObj.previousPeriodArr[0];
                }
                else {
                    if (countlyCommon.periodObj.isSpecialPeriod) {
                        periodMin = 0;
                        periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                        activeDateArr = countlyCommon.periodObj.previousPeriodArr;
                    }
                    else {
                        activeDate = countlyCommon.periodObj.previousPeriod;
                        activeDateArr = countlyCommon.periodObj.previousPeriodArr;
                    }
                }
            }
            else if (currOrPrevious[j] === 'previousThisMonth') {
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
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    if (countlyCommon.periodObj.isHourly) {
                        periodMin = 0;
                        periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                        activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                    }
                    else if (countlyCommon.periodObj.daysInPeriod === 1 && !disableHours) {
                        periodMin = 0;
                        periodMax = 24;
                        activeDate = countlyCommon.periodObj.currentPeriodArr[0];
                    }
                    else {
                        periodMin = 0;
                        periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                        activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                    }
                }
                else {
                    activeDate = countlyCommon.periodObj.activePeriod;
                    activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                }
            }

            if (currOrPrevious[j] === 'previousThisMonth') {
                for (var p = 0, counter_ = 0; p < previousDateArr.length - 1; p++, counter_++) {
                    formattedDate = moment((previousDateArr[p]).replace(/\./g, '/'), 'YYYY/MM/DD');
                    dataObj = countlyCommon.getDescendantProp(db, previousDateArr[p] + metric);
                    dataObj = clearFunction(dataObj);

                    if (!tableData[counter_]) {
                        tableData[counter_] = {};
                    }

                    tableData[counter_].date = countlyCommon.formatDate(formattedDate, dateString);
                    var propertyValue_ = '';
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
                    if ((!countlyCommon.periodObj.isSpecialPeriod && !disableHours) || (!countlyCommon.periodObj.isSpecialPeriod && disableHours && countlyCommon.periodObj.daysInPeriod !== 1)) {
                        if (countlyCommon.periodObj.periodMin === 0) {
                            formattedDate = moment((activeDate + ' ' + i + ':00:00').replace(/\./g, '/'), 'YYYY/MM/DD HH:mm:ss');
                        }
                        else if (('' + activeDate).indexOf('.') === -1) {
                            formattedDate = moment((activeDate + '/' + i + '/1').replace(/\./g, '/'), 'YYYY/MM/DD');
                        }
                        else {
                            formattedDate = moment((activeDate + '/' + i).replace(/\./g, '/'), 'YYYY/MM/DD');
                        }

                        dataObj = countlyCommon.getDescendantProp(db, activeDate + '.' + i + metric);
                    }
                    else if (countlyCommon.periodObj.isHourly) {
                        formattedDate = moment((activeDateArr[i]).replace(/\./g, '/'), 'YYYY/MM/DD HH:mm:ss');
                        dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i] + metric);
                    }
                    else if (countlyCommon.periodObj.daysInPeriod === 1 && !disableHours) {
                        formattedDate = moment((activeDate + ' ' + i + ':00:00').replace(/\./g, '/'), 'YYYY/MM/DD HH:mm:ss');
                        dataObj = countlyCommon.getDescendantProp(db, activeDate + '.' + i + metric);
                    }
                    else {
                        formattedDate = moment((activeDateArr[i]).replace(/\./g, '/'), 'YYYY/MM/DD');
                        dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i] + metric);
                    }

                    dataObj = clearFunction(dataObj);

                    if (!tableData[counter]) {
                        tableData[counter] = {};
                    }

                    tableData[counter].date = countlyCommon.formatDate(formattedDate, dateString);
                    var propertyValue = '';
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

        return { chartDP: chartData, chartData: _.compact(tableData), keyEvents: keyEvents };
    };

    countlyCommon.extractTwoLevelData = function(db, rangeArray, clearFunction, dataProperties, estOverrideMetric) {
        countlyCommon.periodObj = countlyCommon.getPeriodObj();

        var periodMin = 0,
            periodMax = 0,
            dataObj = {},
            tableData = [],
            propertyNames = _.pluck(dataProperties, 'name'),
            propertyFunctions = _.pluck(dataProperties, 'func'),
            propertyValue = 0;

        if (!rangeArray) {
            return { chartData: tableData };
        }

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            periodMin = countlyCommon.periodObj.periodMin;
            periodMax = (countlyCommon.periodObj.periodMax + 1);
        }
        else {
            periodMin = 0;
            periodMax = countlyCommon.periodObj.currentPeriodArr.length;
        }

        var tableCounter = 0;
        var j = 0;
        var k = 0;
        var i = 0;

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            for (j = 0; j < rangeArray.length; j++) {
                dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + '.' + rangeArray[j]);

                if (!dataObj) {
                    continue;
                }
                var tmpPropertyObj1 = {};
                dataObj = clearFunction(dataObj);

                var propertySum = 0;
                for (k = 0; k < propertyNames.length; k++) {
                    if (propertyFunctions[k]) {
                        propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
                    }
                    else {
                        propertyValue = dataObj[propertyNames[k]];
                    }

                    if (typeof propertyValue !== 'string') {
                        propertySum += propertyValue;
                    }

                    tmpPropertyObj1[propertyNames[k]] = propertyValue;
                }

                if (propertySum > 0) {
                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj1;
                    tableCounter++;
                }
            }
        }
        else {
            var calculatedObj = (estOverrideMetric) ? getTotalUsers(estOverrideMetric) : {};

            for (j = 0; j < rangeArray.length; j++) {
                var tmp_x = {};
                var tmpPropertyObj = {};

                for (i = periodMin; i < periodMax; i++) {
                    dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + '.' + rangeArray[j]);

                    if (!dataObj) {
                        continue;
                    }

                    dataObj = clearFunction(dataObj);

                    for (k = 0; k < propertyNames.length; k++) {
                        if (propertyNames[k] === 'u') {
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

                if (propertyNames.indexOf('u') !== -1 && Object.keys(tmpPropertyObj).length) {
                    if (isTotalUsersUsable() && estOverrideMetric && typeof calculatedObj[rangeArray[j]] !== 'undefined') {
                        tmpPropertyObj.u = calculatedObj[rangeArray[j]];
                    }
                    else {
                        var tmpUniqVal = 0,
                            tmpUniqValCheck = 0,
                            tmpCheckVal = 0,
                            l = 0;

                        for (l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + '.' + rangeArray[j]);
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

                        for (l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                            tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + '.' + rangeArray[j]);
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

                    if (tmpPropertyObj.u < tmpPropertyObj.n) {
                        if (isTotalUsersUsable() && estOverrideMetric && typeof calculatedObj[rangeArray[j]] !== 'undefined') {
                            tmpPropertyObj.n = calculatedObj[rangeArray[j]];
                        }
                        else {
                            tmpPropertyObj.u = tmpPropertyObj.n;
                        }
                    }

                    if (tmpPropertyObj.u > tmpPropertyObj.t) {
                        tmpPropertyObj.u = tmpPropertyObj.t;
                    }
                }

                tableData[tableCounter] = {};
                tableData[tableCounter] = tmpPropertyObj;
                tableCounter++;
            }
        }

        for (i = 0; i < tableData.length; i++) {
            if (_.isEmpty(tableData[i])) {
                tableData[i] = null;
            }
        }

        tableData = _.compact(tableData);

        if (propertyNames.indexOf('u') !== -1) {
            countlyCommon.sortByProperty(tableData, 'u');
        }
        else if (propertyNames.indexOf('t') !== -1) {
            countlyCommon.sortByProperty(tableData, 't');
        }
        else if (propertyNames.indexOf('c') !== -1) {
            countlyCommon.sortByProperty(tableData, 'c');
        }

        return { chartData: tableData };
    };

    countlyCommon.mergeMetricsByName = function(chartData, metric) {
        var uniqueNames = {},
            data;
        for (var i = 0; i < chartData.length; i++) {
            data = chartData[i];
            var newName = (data[metric] + '').trim();
            if (newName === '') {
                newName = jQuery.i18n.map['common.unknown'];
            }
            data[metric] = newName;
            if (newName && !uniqueNames[newName]) {
                uniqueNames[newName] = data;
            }
            else {
                for (var key in data) {
                    if (typeof data[key] === 'string') {
                        uniqueNames[newName][key] = data[key];
                    }
                    else if (typeof data[key] === 'number') {
                        if (!uniqueNames[newName][key]) {
                            uniqueNames[newName][key] = 0;
                        }
                        uniqueNames[newName][key] += data[key];
                    }
                }
            }
        }

        return _.values(uniqueNames);
    };

    countlyCommon.extractBarDataWPercentageOfTotal = function(db, rangeArray, clearFunction, fetchFunction, metric, estOverrideMetric, fixBarSegmentData) {
        fetchFunction = fetchFunction || function(rangeArr) {
            return rangeArr;
        };

        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            { name: 'range', func: fetchFunction },
            { name: metric }
        ], estOverrideMetric);

        return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData, metric, fixBarSegmentData);
    };

    countlyCommon.extractBarData = function(db, rangeArray, clearFunction, fetchFunction) {
        fetchFunction = fetchFunction || function(rangeArr) {
            return rangeArr;
        };

        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            { name: 'range', func: fetchFunction },
            { name: 't' }
        ]);
        return countlyCommon.calculateBarData(rangeData);
    };

    countlyCommon.calculateBarDataWPercentageOfTotal = function(rangeData, metric, fixBarSegmentData) {
        rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, 'range');

        if (fixBarSegmentData) {
            rangeData = fixBarSegmentData(rangeData);
        }

        rangeData.chartData = _.sortBy(rangeData.chartData, function(obj) {
            return -obj[metric];
        });

        var rangeNames = _.pluck(rangeData.chartData, 'range'),
            rangeTotal = _.pluck(rangeData.chartData, metric),
            barData = [],
            maxItems = 3,
            totalSum = 0;

        rangeTotal.forEach(function(r) {
            totalSum += r;
        });

        rangeTotal.sort(function(a, b) {
            if (a < b) {
                return 1;
            }
            if (b < a) {
                return -1;
            }
            return 0;
        });

        var totalPercent = 0;

        for (var i = rangeNames.length - 1; i >= 0; i--) {
            var percent = countlyCommon.round((rangeTotal[i] / totalSum) * 100, 1);
            totalPercent += percent;
            barData[i] = { name: rangeNames[i], percent: percent };
        }

        var deltaFixEl = 0;
        if (totalPercent < 100) {
            deltaFixEl = 0;
        }
        else if (totalPercent > 100) {
            deltaFixEl = barData.length - 1;
        }
        if (barData.length > 0) {
            barData[deltaFixEl].percent += 100 - totalPercent;
            barData[deltaFixEl].percent = countlyCommon.round(barData[deltaFixEl].percent, 1);
        }
        if (rangeNames.length < maxItems) {
            maxItems = rangeNames.length;
        }

        return barData.slice(0, maxItems);
    };

    countlyCommon.calculateBarData = function(rangeData) {
        rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, 'range');
        rangeData.chartData = _.sortBy(rangeData.chartData, function(obj) {
            return -obj.t;
        });

        var rangeNames = _.pluck(rangeData.chartData, 'range'),
            rangeTotal = _.pluck(rangeData.chartData, 't'),
            barData = [],
            sum = 0,
            maxItems = 3,
            totalPercent = 0;

        rangeTotal.sort(function(a, b) {
            if (a < b) {
                return 1;
            }
            if (b < a) {
                return -1;
            }
            return 0;
        });

        if (rangeNames.length < maxItems) {
            maxItems = rangeNames.length;
        }

        var i = 0;
        for (i = 0; i < maxItems; i++) {
            sum += rangeTotal[i];
        }

        for (i = maxItems - 1; i >= 0; i--) {
            var percent = Math.floor((rangeTotal[i] / sum) * 100);
            totalPercent += percent;

            if (i === 0) {
                percent += 100 - totalPercent;
            }

            barData[i] = { name: rangeNames[i], percent: percent };
        }

        return barData;
    };

    countlyCommon.extractUserChartData = function(db, label, sec) {
        var ret = { data: [], label: label };
        countlyCommon.periodObj = countlyCommon.getPeriodObj();
        var periodMin, periodMax, dateob;

        if (countlyCommon.periodObj.isSpecialPeriod) {
            periodMin = 0;
            periodMax = (countlyCommon.periodObj.daysInPeriod);
            var dateob1 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[0].toString());
            var dateob2 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1].toString());
            dateob = { timestart: dateob1.timestart, timeend: dateob2.timeend, range: 'd' };
        }
        else {
            periodMin = countlyCommon.periodObj.periodMin;
            periodMax = countlyCommon.periodObj.periodMax + 1;
            dateob = countlyCommon.processPeriod(countlyCommon.periodObj.activePeriod.toString());
        }

        var res = [],
            ts;
        var i = 0;
        var l;

        for (i = 0, l = db.length; i < l; i++) {
            ts = db[i];
            if (sec) {
                ts.ts = ts.ts * 1000;
            }
            if (ts.ts > dateob.timestart && ts.ts <= dateob.timeend) {
                res.push(ts);
            }
        }

        var lastStart,
            lastEnd = dateob.timestart,
            total,
            data = ret.data;

        for (i = periodMin; i < periodMax; i++) {
            total = 0;
            lastStart = lastEnd;
            lastEnd = moment(lastStart).add(moment.duration(1, dateob.range)).valueOf();
            for (var j = 0, len = res.length; j < len; j++) {
                ts = res[j];
                if (ts.ts > lastStart && ts.ts <= lastEnd) {
                    if (ts.c) {
                        total += ts.c;
                    }
                    else {
                        total++;
                    }
                }
            }
            data.push([i, total]);
        }
        return ret;
    };

    // ========================================================================
    // Dashboard Data Methods
    // ========================================================================

    countlyCommon.getDashboardData = function(data, properties, unique, estOverrideMetric, clearObject, segment) {
        if (segment) {
            segment = '.' + segment;
        }
        else {
            segment = '';
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

        var i = 0;
        var j = 0;

        for (i = 0; i < properties.length; i++) {
            current[properties[i]] = 0;
            previous[properties[i]] = 0;
            currentCheck[properties[i]] = 0;
            previousCheck[properties[i]] = 0;
        }

        if (_periodObj.isSpecialPeriod) {
            isEstimate = true;
            for (j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j] + segment);
                tmp_x = clearObject(tmp_x);
                for (i = 0; i < properties.length; i++) {
                    if (unique.indexOf(properties[i]) === -1) {
                        current[properties[i]] += tmp_x[properties[i]];
                    }
                }
            }

            for (j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j] + segment);
                tmp_y = clearObject(tmp_y);
                for (i = 0; i < properties.length; i++) {
                    if (unique.indexOf(properties[i]) === -1) {
                        previous[properties[i]] += tmp_y[properties[i]];
                    }
                }
            }

            for (j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodArr[j] + segment);
                tmp_x = clearObject(tmp_x);
                for (i = 0; i < unique.length; i++) {
                    current[unique[i]] += tmp_x[unique[i]];
                }
            }

            for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                tmp_y = clearObject(tmp_y);
                for (i = 0; i < unique.length; i++) {
                    previous[unique[i]] += tmp_y[unique[i]];
                }
            }

            for (j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
                tmpUniqObj = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j] + segment);
                tmpUniqObj = clearObject(tmpUniqObj);
                for (i = 0; i < unique.length; i++) {
                    currentCheck[unique[i]] += tmpUniqObj[unique[i]];
                }
            }

            for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
                for (i = 0; i < unique.length; i++) {
                    previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
                }
            }

            for (i = 0; i < unique.length; i++) {
                if (current[unique[i]] > currentCheck[unique[i]]) {
                    current[unique[i]] = currentCheck[unique[i]];
                }

                if (previous[unique[i]] > previousCheck[unique[i]]) {
                    previous[unique[i]] = previousCheck[unique[i]];
                }
            }
        }
        else {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + segment);
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod + segment);
            tmp_x = clearObject(tmp_x);
            tmp_y = clearObject(tmp_y);

            for (i = 0; i < properties.length; i++) {
                current[properties[i]] = tmp_x[properties[i]];
                previous[properties[i]] = tmp_y[properties[i]];
            }
        }

        if (estOverrideMetric && isTotalUsersUsable()) {
            for (i = 0; i < unique.length; i++) {
                if (estOverrideMetric[unique[i]] && getTotalUsers(estOverrideMetric[unique[i]]).users) {
                    current[unique[i]] = getTotalUsers(estOverrideMetric[unique[i]]).users;
                }
                if (estOverrideMetric[unique[i]] && getTotalUsers(estOverrideMetric[unique[i]], true).users) {
                    previous[unique[i]] = getTotalUsers(estOverrideMetric[unique[i]], true).users;
                }
            }
        }

        if (typeof current.u !== 'undefined' && typeof current.n !== 'undefined' && current.u < current.n) {
            if (estOverrideMetric && isTotalUsersUsable() && estOverrideMetric.u && getTotalUsers(estOverrideMetric.u).users) {
                current.n = current.u;
            }
            else {
                current.u = current.n;
            }
        }

        if (typeof current.u !== 'undefined' && typeof current.t !== 'undefined' && current.u > current.t) {
            current.u = current.t;
        }

        for (i = 0; i < properties.length; i++) {
            change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
            dataArr[properties[i]] = {
                total: current[properties[i]],
                'prev-total': previous[properties[i]],
                change: change[properties[i]].percent,
                trend: change[properties[i]].trend
            };
            if (unique.indexOf(properties[i]) !== -1) {
                dataArr[properties[i]].isEstimate = isEstimate;
            }
        }

        if (estOverrideMetric && isTotalUsersUsable()) {
            for (i = 0; i < unique.length; i++) {
                if (estOverrideMetric[unique[i]] && getTotalUsers(estOverrideMetric[unique[i]]).users) {
                    dataArr[unique[i]].isEstimate = false;
                }
            }
        }

        return dataArr;
    };

    countlyCommon.getSparklineData = function(data, props, clearObject) {
        var _periodObj = countlyCommon.periodObj;
        var sparkLines = {};
        for (var pp in props) {
            sparkLines[pp] = [];
        }
        var tmp_x = '';
        var i = 0;
        var p = 0;

        if (!_periodObj.isSpecialPeriod) {
            for (i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + '.' + i);
                tmp_x = clearObject(tmp_x);

                for (p in props) {
                    if (typeof props[p] === 'string') {
                        sparkLines[p].push(tmp_x[props[p]]);
                    }
                    else if (typeof props[p] === 'function') {
                        sparkLines[p].push(props[p](tmp_x));
                    }
                }
            }
        }
        else {
            for (i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[i]);
                tmp_x = clearObject(tmp_x);

                for (p in props) {
                    if (typeof props[p] === 'string') {
                        sparkLines[p].push(tmp_x[props[p]]);
                    }
                    else if (typeof props[p] === 'function') {
                        sparkLines[p].push(props[p](tmp_x));
                    }
                }
            }
        }

        for (var key in sparkLines) {
            sparkLines[key] = sparkLines[key].join(',');
        }

        return sparkLines;
    };

    // ========================================================================
    // Extend DB Object
    // ========================================================================

    countlyCommon.extendDbObj = function(dbObj, updateObj) {
        var now = moment(),
            year = now.year(),
            month = (now.month() + 1),
            day = now.date(),
            weekly = Math.ceil(now.format('DDD') / 7),
            intRegex = /^\d+$/,
            tmpUpdateObj = {},
            tmpOldObj = {};

        if (updateObj[year] && updateObj[year][month] && updateObj[year][month][day]) {
            if (!dbObj[year]) {
                dbObj[year] = {};
            }
            if (!dbObj[year][month]) {
                dbObj[year][month] = {};
            }
            if (!dbObj[year][month][day]) {
                dbObj[year][month][day] = {};
            }
            if (!dbObj[year]['w' + weekly]) {
                dbObj[year]['w' + weekly] = {};
            }

            tmpUpdateObj = updateObj[year][month][day];
            tmpOldObj = dbObj[year][month][day];

            dbObj[year][month][day] = updateObj[year][month][day];
        }

        if (updateObj.meta) {
            if (!dbObj.meta) {
                dbObj.meta = {};
            }
            dbObj.meta = updateObj.meta;
        }

        for (var level1 in tmpUpdateObj) {
            if (!Object.prototype.hasOwnProperty.call(tmpUpdateObj, level1)) {
                continue;
            }

            if (intRegex.test(level1)) {
                continue;
            }

            if (_.isObject(tmpUpdateObj[level1])) {
                if (!dbObj[year][level1]) {
                    dbObj[year][level1] = {};
                }
                if (!dbObj[year][month][level1]) {
                    dbObj[year][month][level1] = {};
                }
                if (!dbObj[year]['w' + weekly][level1]) {
                    dbObj[year]['w' + weekly][level1] = {};
                }
            }
            else {
                if (dbObj[year][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    }
                    else {
                        dbObj[year][level1] += tmpUpdateObj[level1];
                    }
                }
                else {
                    dbObj[year][level1] = tmpUpdateObj[level1];
                }

                if (dbObj[year][month][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year][month][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    }
                    else {
                        dbObj[year][month][level1] += tmpUpdateObj[level1];
                    }
                }
                else {
                    dbObj[year][month][level1] = tmpUpdateObj[level1];
                }

                if (dbObj[year]['w' + weekly][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year]['w' + weekly][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    }
                    else {
                        dbObj[year]['w' + weekly][level1] += tmpUpdateObj[level1];
                    }
                }
                else {
                    dbObj[year]['w' + weekly][level1] = tmpUpdateObj[level1];
                }
            }

            if (tmpUpdateObj[level1]) {
                for (var level2 in tmpUpdateObj[level1]) {
                    if (!Object.prototype.hasOwnProperty.call(tmpUpdateObj[level1], level2)) {
                        continue;
                    }

                    if (dbObj[year][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        }
                        else {
                            dbObj[year][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    }
                    else {
                        dbObj[year][level1][level2] = tmpUpdateObj[level1][level2];
                    }

                    if (dbObj[year][month][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year][month][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        }
                        else {
                            dbObj[year][month][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    }
                    else {
                        dbObj[year][month][level1][level2] = tmpUpdateObj[level1][level2];
                    }

                    if (dbObj[year]['w' + weekly][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year]['w' + weekly][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        }
                        else {
                            dbObj[year]['w' + weekly][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    }
                    else {
                        dbObj[year]['w' + weekly][level1][level2] = tmpUpdateObj[level1][level2];
                    }
                }
            }
        }

        if (updateObj[year]) {
            if (updateObj[year].u) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }
                dbObj[year].u = updateObj[year].u;
            }

            if (updateObj[year][month] && updateObj[year][month].u) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }
                if (!dbObj[year][month]) {
                    dbObj[year][month] = {};
                }
                dbObj[year][month].u = updateObj[year][month].u;
            }

            if (updateObj[year]['w' + weekly] && updateObj[year]['w' + weekly].u) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }
                if (!dbObj[year]['w' + weekly]) {
                    dbObj[year]['w' + weekly] = {};
                }
                dbObj[year]['w' + weekly].u = updateObj[year]['w' + weekly].u;
            }
        }
    };

    // ========================================================================
    // Graph Notes
    // ========================================================================

    countlyCommon.getGraphNotes = function(appIds, filter, callBack) {
        if (!appIds) {
            appIds = [];
        }
        var args = {
            app_id: countlyCommon.ACTIVE_APP_ID,
            notes_apps: JSON.stringify(appIds),
            period: JSON.stringify([countlyCommon.periodObj.start, countlyCommon.periodObj.end]),
            method: 'notes',
            dt: Date.now()
        };
        if (filter && filter.noteType) {
            args.note_type = filter.noteType;
        }
        if (filter && filter.category) {
            args.category = JSON.stringify(filter.category);
        }
        if (filter && filter.customPeriod) {
            args.period = JSON.stringify(filter.customPeriod);
        }
        return jQuery.ajax({
            type: 'GET',
            url: countlyCommon.API_PARTS.data.r,
            data: args,
            success: function(json) {
                var notes = json && json.aaData || [];
                var noteSortByApp = {};
                notes.forEach(function(note) {
                    if (!noteSortByApp[note.app_id]) {
                        noteSortByApp[note.app_id] = [];
                    }
                    noteSortByApp[note.app_id].push(note);
                });
                appIds.forEach(function(appId) {
                    if (countlyGlobal.apps[appId]) {
                        countlyGlobal.apps[appId].notes = noteSortByApp[appId] || [];
                    }
                });
                callBack && callBack(notes);
            }
        });
    };
};

// ============================================================================
// Create the singleton instance
// ============================================================================

var countlyCommon = new CommonConstructor();

// ============================================================================
// ES6 exports
// ============================================================================

export { CommonConstructor, countlyCommon };
export default countlyCommon;