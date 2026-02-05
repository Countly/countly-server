/**
 * Countly Common Formatters Module
 *
 * Date, time, and duration formatting functions.
 * Some functions require state (like BROWSER_LANG_SHORT) which should be passed as parameters.
 *
 * @module countly.common.formatters
 */

import moment from 'moment';
import jQuery from 'jquery';
import { leadingZero } from './countly.common.utils.js';

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Get date format adjusted for locale
 * @param {string} format - date format string
 * @param {string} browserLangShort - short browser language code (e.g., 'en', 'ko', 'ja', 'zh')
 * @returns {string} adjusted format string
 */
export function getDateFormat(format, browserLangShort) {
    const lang = (browserLangShort || 'en').toLowerCase();

    if (lang === 'ko') {
        format = format.replace('MMM D', 'MMM D[일]').replace('D MMM', 'MMM D[일]');
    }
    else if (lang === 'ja') {
        format = format
            .replace('D MMM YYYY', 'YYYY年 MMM D')
            .replace('MMM D, YYYY', 'YYYY年 MMM D')
            .replace('D MMM, YYYY', 'YYYY年 MMM D')
            .replace('MMM YYYY', 'YYYY年 MMM')
            .replace('MMM D', 'MMM D[日]')
            .replace('D MMM', 'MMM D[日]');
    }
    else if (lang === 'zh') {
        format = format
            .replace('MMMM', 'M')
            .replace('MMM', 'M')
            .replace('MM', 'M')
            .replace('DD', 'D')
            .replace('D M, YYYY', 'YYYY M D')
            .replace('D M', 'M D')
            .replace('D', 'D[日]')
            .replace('M', 'M[月]')
            .replace('YYYY', 'YYYY[年]');
    }
    return format;
}

/**
 * Format date based on some locale settings
 * @param {moment} date - moment js object
 * @param {string} format - format string to use
 * @param {string} browserLangShort - short browser language code
 * @returns {string} date in formatted string
 * @example
 * //outputs Jan 20
 * formatDate(moment(), "MMM D", "en");
 */
export function formatDate(date, format, browserLangShort) {
    format = getDateFormat(format, browserLangShort);
    return date.format(format);
}

/**
 * Get date from seconds timestamp
 * @param {number} timestamp - timestamp in seconds or milliseconds
 * @returns {string} formatted date
 * @example
 * //outputs Tue, 17 Jan 2017
 * getDate(1484654066);
 */
export function getDate(timestamp) {
    if (Math.round(timestamp).toString().length === 10) {
        timestamp *= 1000;
    }
    var d = new Date(timestamp);
    return moment(d).format('ddd, D MMM YYYY');
}

/**
 * Get time from seconds timestamp
 * @param {number} timestamp - timestamp in seconds or milliseconds
 * @param {boolean} [showSeconds=false] - used to return seconds
 * @returns {string} formatted time
 * @example
 * //outputs 13:54
 * getTime(1484654066);
 */
export function getTime(timestamp, showSeconds = false) {
    if (Math.round(timestamp).toString().length === 10) {
        timestamp *= 1000;
    }
    var d = new Date(timestamp);
    var formattedTime = leadingZero(d.getHours()) + ':' + leadingZero(d.getMinutes());
    if (showSeconds) {
        formattedTime += ':' + leadingZero(d.getSeconds());
    }
    return formattedTime;
}

/**
 * Format timestamp to D MMM YYYY, HH:mm
 * @param {number} timestamp - timestamp in seconds or milliseconds
 * @returns {string} formatted time and date
 * @example
 * //outputs 16 Dec 2022, 12:16
 * formatTimeAndDateShort(1671192960000);
 */
export function formatTimeAndDateShort(timestamp) {
    if (Math.round(timestamp).toString().length === 10) {
        timestamp *= 1000;
    }
    return moment(new Date(timestamp)).format('D MMM YYYY, HH:mm');
}

// ============================================================================
// Time Ago Formatting
// ============================================================================

/**
 * Format timestamp to twitter like time ago format text
 * @param {number} timestamp - timestamp in seconds or milliseconds
 * @returns {object} object with text, tooltip, and color properties
 */
export function formatTimeAgoText(timestamp) {
    if (Math.round(timestamp).toString().length === 10) {
        timestamp *= 1000;
    }
    var target = new Date(timestamp);
    var tooltip = moment(target).format('ddd, D MMM YYYY HH:mm:ss');
    var text = tooltip;
    var color = null;
    var now = new Date();
    var diff = Math.floor((now - target) / 1000);

    if (diff <= -2592000) {
        return { text: tooltip, tooltip: tooltip, color: color };
    }
    else if (diff < -86400) {
        text = jQuery.i18n.prop('common.in.days', Math.abs(Math.round(diff / 86400)));
    }
    else if (diff < -3600) {
        text = jQuery.i18n.prop('common.in.hours', Math.abs(Math.round(diff / 3600)));
    }
    else if (diff < -60) {
        text = jQuery.i18n.prop('common.in.minutes', Math.abs(Math.round(diff / 60)));
    }
    else if (diff <= -1) {
        color = '#50C354';
        text = jQuery.i18n.prop('common.in.seconds', Math.abs(diff));
    }
    else if (diff <= 1) {
        color = '#50C354';
        text = jQuery.i18n.map['common.ago.just-now'];
    }
    else if (diff < 20) {
        color = '#50C354';
        text = jQuery.i18n.prop('common.ago.seconds-ago', diff);
    }
    else if (diff < 40) {
        color = '#50C354';
        text = jQuery.i18n.map['common.ago.half-minute'];
    }
    else if (diff < 60) {
        color = '#50C354';
        text = jQuery.i18n.map['common.ago.less-minute'];
    }
    else if (diff <= 90) {
        text = jQuery.i18n.map['common.ago.one-minute'];
    }
    else if (diff <= 3540) {
        text = jQuery.i18n.prop('common.ago.minutes-ago', Math.round(diff / 60));
    }
    else if (diff <= 5400) {
        text = jQuery.i18n.map['common.ago.one-hour'];
    }
    else if (diff <= 86400) {
        text = jQuery.i18n.prop('common.ago.hours-ago', Math.round(diff / 3600));
    }
    else if (diff <= 129600) {
        text = jQuery.i18n.map['common.ago.one-day'];
    }
    else if (diff < 604800) {
        text = jQuery.i18n.prop('common.ago.days-ago', Math.round(diff / 86400));
    }
    else if (diff <= 777600) {
        text = jQuery.i18n.map['common.ago.one-week'];
    }
    else if (diff <= 2592000) {
        text = jQuery.i18n.prop('common.ago.days-ago', Math.round(diff / 86400));
    }
    else {
        text = tooltip;
    }

    return {
        text: text,
        tooltip: tooltip,
        color: color
    };
}

/**
 * Format timestamp to twitter like time ago format with real date as tooltip and hidden data for exporting
 * @param {number} timestamp - timestamp in seconds or milliseconds
 * @returns {string} formatted time ago HTML
 * @example
 * //outputs <span title="Tue, 17 Jan 2017 13:54:26">3 days ago<a style="display: none;">|Tue, 17 Jan 2017 13:54:26</a></span>
 * formatTimeAgo(1484654066);
 */
export function formatTimeAgo(timestamp) {
    var meta = formatTimeAgoText(timestamp);
    var elem = jQuery('<span>');
    elem.prop('title', meta.tooltip);
    if (meta.color) {
        elem.css('color', meta.color);
    }
    elem.text(meta.text);
    elem.append("<a style='display: none;'>|" + meta.tooltip + '</a>');
    return elem.prop('outerHTML');
}

/**
 * Format time ago from a diff value
 * @param {number} diff - difference in seconds
 * @returns {string} formatted time ago text
 */
export function formatTimeAgoTextFromDiff(diff) {
    if (Math.round(diff).toString().length === 10) {
        diff *= 1000;
    }
    var target = new Date(Date.now() - diff);
    var tooltip = moment(target).format('ddd, D MMM YYYY HH:mm:ss');
    var text = tooltip;

    if (diff <= -2592000) {
        return tooltip;
    }
    else if (diff < -86400) {
        text = jQuery.i18n.prop('common.in.days', Math.abs(Math.round(diff / 86400)));
    }
    else if (diff < -3600) {
        text = jQuery.i18n.prop('common.in.hours', Math.abs(Math.round(diff / 3600)));
    }
    else if (diff < -60) {
        text = jQuery.i18n.prop('common.in.minutes', Math.abs(Math.round(diff / 60)));
    }
    else if (diff <= -1) {
        text = jQuery.i18n.prop('common.in.seconds', Math.abs(diff));
    }
    else if (diff <= 1) {
        text = jQuery.i18n.map['common.ago.just-now'];
    }
    else if (diff < 20) {
        text = jQuery.i18n.prop('common.ago.seconds-ago', diff);
    }
    else if (diff < 40) {
        text = jQuery.i18n.map['common.ago.half-minute'];
    }
    else if (diff < 60) {
        text = jQuery.i18n.map['common.ago.less-minute'];
    }
    else if (diff <= 90) {
        text = jQuery.i18n.map['common.ago.one-minute'];
    }
    else if (diff <= 3540) {
        text = jQuery.i18n.prop('common.ago.minutes-ago', Math.round(diff / 60));
    }
    else if (diff <= 5400) {
        text = jQuery.i18n.map['common.ago.one-hour'];
    }
    else if (diff <= 86400) {
        text = jQuery.i18n.prop('common.ago.hours-ago', Math.round(diff / 3600));
    }
    else if (diff <= 129600) {
        text = jQuery.i18n.map['common.ago.one-day'];
    }
    else if (diff < 604800) {
        text = jQuery.i18n.prop('common.ago.days-ago', Math.round(diff / 86400));
    }
    else if (diff <= 777600) {
        text = jQuery.i18n.map['common.ago.one-week'];
    }
    else if (diff <= 2592000) {
        text = jQuery.i18n.prop('common.ago.days-ago', Math.round(diff / 86400));
    }
    return text;
}

// ============================================================================
// Duration Formatting
// ============================================================================

/**
 * Format duration to units of how much time have passed
 * @param {number} timestamp - amount in seconds passed since some reference point
 * @returns {string} formatted time with how much units passed
 * @example
 * //outputs 47 year(s) 28 day(s) 11:54:26
 * formatDuration(1484654066);
 */
export function formatDuration(timestamp) {
    var str = '';
    var seconds = timestamp % 60;
    str = str + leadingZero(seconds);
    timestamp -= seconds;
    var minutes = timestamp % (60 * 60);
    str = leadingZero(minutes / 60) + ':' + str;
    timestamp -= minutes;
    var hours = timestamp % (60 * 60 * 24);
    str = leadingZero(hours / (60 * 60)) + ':' + str;
    timestamp -= hours;
    if (timestamp > 0) {
        var days = timestamp % (60 * 60 * 24 * 365);
        str = (days / (60 * 60 * 24)) + ' day(s) ' + str;
        timestamp -= days;
        if (timestamp > 0) {
            str = (timestamp / (60 * 60 * 24 * 365)) + ' year(s) ' + str;
        }
    }
    return str;
}

// Alias for backward compatibility
export const formatTime = formatDuration;

/**
 * Format duration into highest unit of how much time have passed. Used in big numbers
 * @param {number} timespent - amount in minutes passed since some reference point
 * @returns {string} formatted time with how much highest units passed
 * @example
 * //outputs 2824.7 yrs
 * timeString(1484654066);
 */
export function timeString(timespent) {
    var timeSpentString = (timespent.toFixed(1)) + ' ' + jQuery.i18n.map['common.minute.abrv'];

    if (timespent >= 142560) {
        timeSpentString = (timespent / 525600).toFixed(1) + ' ' + jQuery.i18n.map['common.year.abrv'];
    }
    else if (timespent >= 1440) {
        timeSpentString = (timespent / 1440).toFixed(1) + ' ' + jQuery.i18n.map['common.day.abrv'];
    }
    else if (timespent >= 60) {
        timeSpentString = (timespent / 60).toFixed(1) + ' ' + jQuery.i18n.map['common.hour.abrv'];
    }
    return timeSpentString;
}

/**
 * Parse seconds to standard time format
 * @param {number} second - number of seconds
 * @param {number} [trimTo=5] - number [1,5] to limit result length
 * @returns {string} return format "Xh Xm Xs", if trimTo is specified the length of the result is trimmed
 * @example trimTo = 2, "Xh Xm Xs" result will be trimmed to "Xh Xm"
 */
export function formatSecond(second, trimTo = 5) {
    var timeLeft = parseFloat(second);
    var dict = [
        { k: 'year', v: 31536000 },
        { k: 'day', v: 86400 },
        { k: 'hour', v: 3600 },
        { k: 'minute', v: 60 },
        { k: 'second', v: 1 }
    ];
    var result = { year: 0, day: 0, hour: 0, minute: 0, second: 0 };
    var resultStrings = [];

    for (var i = 0; i < dict.length && resultStrings.length < 3; i++) {
        if (dict[i].k === 'second') {
            if (timeLeft < 0.1) {
                result.second = 0;
            }
            else {
                result.second = Math.round(timeLeft * 10) / 10;
            }
        }
        else {
            result[dict[i].k] = Math.floor(timeLeft / dict[i].v);
        }
        timeLeft = timeLeft % dict[i].v;
        if (result[dict[i].k] > 0) {
            if (result[dict[i].k] === 1) {
                resultStrings.push(result[dict[i].k] + '' + jQuery.i18n.map['common.' + dict[i].k + '.abrv2']);
            }
            else {
                resultStrings.push(result[dict[i].k] + '' + jQuery.i18n.map['common.' + dict[i].k + '.abrv']);
            }
        }
    }

    if (resultStrings.length === 0) {
        return '0';
    }
    else {
        if (trimTo > 5 || trimTo < 1) {
            trimTo = 5;
        }
        return (resultStrings.slice(0, Math.min(trimTo, resultStrings.length))).join(' ');
    }
}

// ============================================================================
// Months
// ============================================================================

let __months = [];

/**
 * Get array of localized short month names from moment js
 * @param {boolean} reset - used to reset months cache when changing locale
 * @returns {array} array of short localized month names used in moment js MMM formatting
 * @example
 * //outputs ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
 * getMonths();
 */
export function getMonths(reset) {
    if (reset) {
        __months = [];
    }

    if (!__months.length) {
        for (var i = 0; i < 12; i++) {
            __months.push(moment.localeData().monthsShort(moment([0, i]), ''));
        }
    }
    return __months;
}

// ============================================================================
// Period Processing
// ============================================================================

/**
 * Process period string to get time range
 * @param {string} period - period string like "2017.1.15"
 * @returns {object} object with timestart, timeend, and range
 */
export function processPeriod(period) {
    var date = period.split('.');
    var range,
        timestart,
        timeend;
    if (date.length === 1) {
        range = 'M';
        timestart = moment(period, 'YYYY').valueOf();
        timeend = moment(period, 'YYYY').add(moment.duration(1, 'y')).valueOf();
    }
    else if (date.length === 2) {
        range = 'd';
        timestart = moment(period, 'YYYY.MM').valueOf();
        timeend = moment(period, 'YYYY.MM').add(moment.duration(1, 'M')).valueOf();
    }
    else if (date.length === 3) {
        range = 'h';
        timestart = moment(period, 'YYYY.MM.DD').valueOf();
        timeend = moment(period, 'YYYY.MM.DD').add(moment.duration(1, 'd')).valueOf();
    }
    return { timestart: timestart, timeend: timeend, range: range };
}

// ============================================================================
// Time Period Descriptions
// ============================================================================

/**
 * Converts cohort time period to string.
 * @param {Object} obj - Inferred time object. Must contain "value", "type" and optionally "level".
 * @returns {Object} String fields
 */
export function getTimePeriodDescriptions(obj) {
    if (obj.type === 'all-time') {
        return { name: jQuery.i18n.map['common.all-time'], valueAsString: '0days' };
    }
    if (obj.type === 'last-n') {
        var level = obj.level || 'days';
        return {
            name: jQuery.i18n.prop('common.in-last-' + level + (obj.value > 1 ? '-plural' : ''), obj.value),
            valueAsString: obj.value + level
        };
    }
    if (obj.type === 'hour') {
        return {
            name: jQuery.i18n.map['common.today'],
            valueAsString: 'hour'
        };
    }
    if (obj.type === 'yesterday') {
        return {
            name: jQuery.i18n.map['common.yesterday'],
            valueAsString: 'yesterday'
        };
    }
    if (obj.type === 'day') {
        return {
            name: moment().format('MMMM, YYYY'),
            valueAsString: 'day'
        };
    }
    if (obj.type === 'prevMonth') {
        return {
            name: moment().subtract(1, 'month').format('MMMM, YYYY'),
            valueAsString: 'prevMonth'
        };
    }
    if (obj.type === 'month') {
        return {
            name: moment().year(),
            valueAsString: 'month'
        };
    }

    var valueAsString = JSON.stringify(obj.value);
    var name = valueAsString;

    var formatDatePoint = function(point, isShort) {
        var format = 'MMMM DD, YYYY';
        if (isShort) {
            format = 'MMM DD, YYYY';
        }

        if (point.toString().length === 10) {
            point *= 1000;
        }

        return formatDate(moment(point), format, 'en');
    };

    if (Array.isArray(obj.value)) {
        name = jQuery.i18n.prop('common.time-period-name.range', formatDatePoint(obj.value[0], true), formatDatePoint(obj.value[1], true));
    }
    else {
        name = jQuery.i18n.prop('common.time-period-name.' + obj.type, formatDatePoint(obj.value[obj.type]));
    }

    return {
        name: name,
        valueAsString: valueAsString
    };
}

/**
 * Cohort time period is a string (may still contain an array or an object). The needed
 * meta data, however, is not included within the field. This function infers the meta data
 * and returns as an object.
 *
 * @param {string} period - Period string
 * @returns {Object} An object containing meta fields
 */
export function convertToTimePeriodObj(period) {
    var inferredLevel = 'days',
        inferredType = null,
        inferredValue = null;

    if (typeof period === 'string' && (period.indexOf('{') > -1 || period.indexOf('[') > -1)) {
        period = JSON.parse(period);
    }

    if (!period && period === 0) {
        inferredType = 'all-time';
        inferredValue = 0;
    }
    else if (Array.isArray(period)) {
        inferredType = 'range';
    }
    else if (period === 'hour') {
        inferredType = 'hour';
        inferredValue = 'hour';
    }
    else if (period === 'yesterday') {
        inferredType = 'yesterday';
        inferredValue = 'yesterday';
    }
    else if (period === 'day') {
        inferredType = 'day';
        inferredValue = 'day';
    }
    else if (period === 'prevMonth') {
        inferredType = 'prevMonth';
        inferredValue = 'prevMonth';
    }
    else if (period === 'month') {
        inferredType = 'month';
        inferredValue = 'month';
    }
    else if (typeof period === 'object') {
        if (Object.prototype.hasOwnProperty.call(period, 'since')) {
            inferredType = 'since';
        }
        else if (Object.prototype.hasOwnProperty.call(period, 'on')) {
            inferredType = 'on';
        }
        else if (Object.prototype.hasOwnProperty.call(period, 'before')) {
            inferredType = 'before';
        }
    }
    else if (period.endsWith('minutes')) {
        inferredLevel = 'minutes';
        inferredType = 'last-n';
    }
    else if (period.endsWith('hours')) {
        inferredLevel = 'hours';
        inferredType = 'last-n';
    }
    else if (period.endsWith('days')) {
        inferredLevel = 'days';
        inferredType = 'last-n';
    }
    else if (period.endsWith('weeks')) {
        inferredLevel = 'weeks';
        inferredType = 'last-n';
    }
    else if (period.endsWith('months')) {
        inferredLevel = 'months';
        inferredType = 'last-n';
    }
    else if (period.endsWith('years')) {
        inferredLevel = 'years';
        inferredType = 'last-n';
    }
    else {
        inferredType = 'all-time';
        inferredValue = 0;
    }

    if (inferredValue !== 0 && inferredType === 'last-n') {
        inferredValue = parseInt((period.replace(inferredLevel, '')));
    }
    else if (inferredValue !== 0) {
        var stringified = JSON.stringify(period);
        inferredValue = JSON.parse(stringified);
    }

    var obj = {
        value: inferredValue,
        type: inferredType,
        level: inferredLevel
    };

    var descriptions = getTimePeriodDescriptions(obj);

    obj.valueAsString = descriptions.valueAsString;
    obj.name = obj.longName = descriptions.name;
    return obj;
}