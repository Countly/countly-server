/**
 * Countly Common Utilities Module
 *
 * Pure utility functions with no state dependencies.
 * These can be safely imported without causing circular dependencies.
 *
 * @module countly.common.utils
 */

import { filterXSS } from '../utils/xss.js';
import { mergeWith } from 'lodash';
import _ from 'underscore';

// ============================================================================
// String Encoding/Decoding
// ============================================================================

/**
 * Encode value to be passed to db as key, encoding $ symbol to &#36; if it is first
 * and all . (dot) symbols to &#46; in the string
 * @param {string} str - value to encode
 * @returns {string} encoded string
 */
export function encode(str) {
    return str.replace(/^\$/g, '&#36;').replace(/\./g, '&#46;');
}

/**
 * Decode value from db, decoding first &#36; to $ and all &#46; to . (dots).
 * Decodes also url encoded values as &amp;#36;.
 * @param {string} str - value to decode
 * @returns {string} decoded string
 */
export function decode(str) {
    return str.replace(/^&#36;/g, '$').replace(/&#46;/g, '.');
}

/**
 * Decode escaped HTML from db
 * @param {string} html - value to decode
 * @returns {string} decoded string
 */
export function decodeHtml(html) {
    return (html + '').replace(/&amp;/g, '&');
}

/**
 * Encode html
 * @param {string} html - value to encode
 * @returns {string} encoded string
 */
export function encodeHtml(html) {
    const div = document.createElement('div');
    div.innerText = html;
    return div.innerHTML;
}

/**
 * Unescape HTML entities
 * @param {string} htmlStr - HTML string to unescape
 * @returns {string} unescaped string
 */
export function unescapeHtml(htmlStr) {
    if (htmlStr && typeof htmlStr === 'string') {
        htmlStr = htmlStr.replace(/&lt;/g, '<');
        htmlStr = htmlStr.replace(/&gt;/g, '>');
        htmlStr = htmlStr.replace(/&quot;/g, '"');
        htmlStr = htmlStr.replace(/&#39;/g, "'");
        htmlStr = htmlStr.replace(/&amp;/g, '&');
    }
    return htmlStr;
}

/**
 * Unescapes provided string.
 * -- Please use carefully --
 * Mainly for rendering purposes.
 * @param {string} text - Arbitrary string
 * @param {string} df - Default value
 * @returns {string} unescaped string
 */
export function unescapeString(text, df) {
    if (text === undefined && df === undefined) {
        return undefined;
    }
    return _.unescape(text || df).replace(/&#39;/g, "'");
}

// Default HTML encode options for XSS filtering
const defaultHtmlEncodeOptions = {
    whiteList: {
        a: ['href', 'class', 'target'],
        ul: [],
        li: [],
        b: [],
        br: [],
        strong: [],
        p: [],
        span: ['class'],
        div: ['class']
    },
    onTagAttr: function(tag, name, value) {
        if (tag === 'a') {
            const re = new RegExp(/{[0-9]*}/);
            const tested = re.test(value);
            if (name === 'target') {
                if (!(value === '_blank' || value === '_self' || value === '_top' || value === '_parent' || tested)) {
                    return 'target="_blank"';
                }
                return 'target="' + value + '"';
            }
            if (name === 'href') {
                if (!(value.substr(0, 1) === '#' || value.substr(0, 1) === '/' || value.substr(0, 4) === 'http' || tested)) {
                    return 'href="#"';
                }
                return 'href="' + value + '"';
            }
        }
    }
};

/**
 * Encode some tags, leaving those set in whitelist as they are.
 * @param {string} html - value to encode
 * @param {object} options - options for encoding. Optional. If not passed, using default.
 * @returns {string} encoded string
 */
export function encodeSomeHtml(html, options) {
    if (options) {
        return filterXSS(html, options);
    }
    return filterXSS(html, defaultHtmlEncodeOptions);
}

// ============================================================================
// String Manipulation
// ============================================================================

/**
 * Convert string to first letter uppercase and all other letters - lowercase for each word
 * @param {string} str - string to convert
 * @returns {string} converted string
 * @example
 * //outputs Hello World
 * toFirstUpper("hello world");
 */
export function toFirstUpper(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Function adds leading zero to value.
 * @param {number} value - given value
 * @returns {string|number} fixed value
 */
export function leadingZero(value) {
    if (value > 9) {
        return value;
    }
    return '0' + value;
}

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Round to provided number of digits
 * @param {number} num - number to round
 * @param {number} digits - amount of digits to round to
 * @returns {number} rounded number
 * @example
 * //outputs 1.235
 * round(1.2345, 3);
 */
export function round(num, digits) {
    digits = Math.pow(10, digits || 0);
    return Math.round(num * digits) / digits;
}

/**
 * Calculates the percent change between previous and current values.
 * @param {number} previous - data for previous period
 * @param {number} current - data for current period
 * @returns {object} in the following format {"percent": "20%", "trend": "u"}
 * @example
 *   //outputs {"percent":"100%","trend":"u"}
 *   getPercentChange(100, 200);
 */
export function getPercentChange(previous, current) {
    var pChange = 0,
        trend = '';

    previous = parseFloat(previous);
    current = parseFloat(current);

    if (previous === 0) {
        pChange = 'NA';
        trend = 'u'; //upward
    }
    else if (current === 0) {
        pChange = '∞';
        trend = 'd'; //downward
    }
    else {
        var change = (((current - previous) / previous) * 100).toFixed(1);
        pChange = getShortNumber(change) + '%';

        if (change < 0) {
            trend = 'd';
        }
        else {
            trend = 'u';
        }
    }

    return { percent: pChange, trend: trend };
}

/**
 * Shortens the given number by adding K (thousand) or M (million) postfix.
 * K is added only if the number is bigger than 10000, etc.
 * @param {number} number - number to shorten
 * @returns {string} shorter representation of number
 * @example
 * //outputs 10K
 * getShortNumber(10000);
 */
export function getShortNumber(number) {
    var tmpNumber = '';

    if (number >= 1000000000 || number <= -1000000000) {
        tmpNumber = ((number / 1000000000).toFixed(1).replace('.0', '')) + 'B';
    }
    else if (number >= 1000000 || number <= -1000000) {
        tmpNumber = ((number / 1000000).toFixed(1).replace('.0', '')) + 'M';
    }
    else if (number >= 10000 || number <= -10000) {
        tmpNumber = ((number / 1000).toFixed(1).replace('.0', '')) + 'K';
    }
    else if (number >= 0.1 || number <= -0.1) {
        number += '';
        tmpNumber = number.replace('.0', '');
    }
    else {
        tmpNumber = number + '';
    }

    return tmpNumber;
}

/**
 * Formats the number by separating each 3 digits with comma
 * @param {number} x - number to format
 * @returns {string} formatted number
 * @example
 * //outputs 1,234,567
 * formatNumber(1234567);
 */
export function formatNumber(x) {
    x = parseFloat(parseFloat(x).toFixed(2));
    var parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * Formats the number by separating each 3 digits with comma, falls back to
 * a default value in case of NaN
 * @param {number} x - number to format
 * @param {string} fallback - fallback value for unparsable numbers
 * @returns {string} formatted number or fallback
 * @example
 * //outputs 1,234,567
 * formatNumberSafe(1234567);
 */
export function formatNumberSafe(x, fallback) {
    if (isNaN(parseFloat(x))) {
        return fallback || 'N/A';
    }
    return formatNumber(x);
}

// ============================================================================
// Array/Object Utilities
// ============================================================================

/**
 * Join 2 arrays into one removing all duplicated values
 * @param {array} x - first array
 * @param {array} y - second array
 * @returns {array} new array with only unique values from x and y
 * @example
 * //outputs [1,2,3]
 * union([1,2],[2,3]);
 */
export function union(x, y) {
    if (!x) {
        return y;
    }
    if (!y) {
        return x;
    }

    var obj = {};
    var i = 0;
    for (i = x.length - 1; i >= 0; --i) {
        obj[x[i]] = true;
    }

    for (i = y.length - 1; i >= 0; --i) {
        obj[y[i]] = true;
    }

    var res = [];
    for (var k in obj) {
        res.push(k);
    }

    return res;
}

/**
 * Recursively merges an object into another
 * @param {Object} target - object to be merged into
 * @param {Object} source - object to merge into the target
 * @returns {Object} target after the merge
 */
export function deepObjectExtend(target, source) {
    return mergeWith({}, target, source);
}

/**
 * Fetches nested property values from an obj.
 * @param {object} obj - standard countly metric object
 * @param {string} path - dot separated path to fetch from object
 * @param {object} def - stub object to return if nothing is found on provided path
 * @returns {object} fetched object from provided path
 * @example <caption>Path found</caption>
 * //outputs {"u":20,"t":20,"n":5}
 * getDescendantProp({"2017":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2", {"u":0,"t":0,"n":0});
 * @example <caption>Path not found</caption>
 * //outputs {"u":0,"t":0,"n":0}
 * getDescendantProp({"2016":{"1":{"2":{"u":20,"t":20,"n":5}}}}, "2017.1.2", {"u":0,"t":0,"n":0});
 */
export function getDescendantProp(obj, path, def) {
    for (var i = 0, pathArr = (path + '').split('.'), len = pathArr.length; i < len; i++) {
        if (!obj || typeof obj !== 'object') {
            return def;
        }
        obj = obj[pathArr[i]];
    }

    if (obj === undefined) {
        return def;
    }
    return obj;
}

/**
 * Getter/setter for dot notations:
 * @param {object} obj - object to use
 * @param {string} is - path of properties to get
 * @param {varies} value - value to set
 * @returns {varies} value at provided path
 * @example
 * dot({a: {b: {c: 'string'}}}, 'a.b.c') === 'string'
 * dot({a: {b: {c: 'string'}}}, ['a', 'b', 'c']) === 'string'
 * dot({a: {b: {c: 'string'}}}, 'a.b.c', 5) === 5
 * dot({a: {b: {c: 'string'}}}, 'a.b.c') === 5
 */
export function dot(obj, is, value) {
    if (typeof is === 'string') {
        return dot(obj, is.split('.'), value);
    }
    else if (is.length === 1 && value !== undefined) {
        obj[is[0]] = value;
        return value;
    }
    else if (is.length === 0) {
        return obj;
    }
    else if (!obj) {
        return obj;
    }
    else {
        if (typeof obj[is[0]] === 'undefined' && value !== undefined) {
            obj[is[0]] = {};
        }
        return dot(obj[is[0]], is.slice(1), value);
    }
}

/**
 * Sort array of objects by property value
 * @param {array} tableData - array to sort
 * @param {string} prop - property name to sort by
 */
export function sortByProperty(tableData, prop) {
    tableData.sort(function(a, b) {
        a = (a && a[prop]) ? a[prop] : 0;
        b = (b && b[prop]) ? b[prop] : 0;
        return b - a;
    });
}

/**
 * Merge metric data in chartData by metric name
 * @param {array} chartData - array of chart data objects
 * @param {string} metric - metric name to merge by
 * @returns {array} merged chartData array
 */
export function mergeMetricsByName(chartData, metric) {
    var uniqueNames = {},
        data;
    for (var i = 0; i < chartData.length; i++) {
        data = chartData[i];
        var newName = (data[metric] + '').trim();
        if (newName === '') {
            // Note: jQuery.i18n.map would need to be passed or handled differently
            newName = 'Unknown';
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
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates unique id string using unsigned integer array.
 * @returns {string} unique id
 */
export function generateId() {
    var crypto = window.crypto || window.msCrypto;
    var uint32 = crypto.getRandomValues(new Uint32Array(1))[0];
    return uint32.toString(16);
}

// ============================================================================
// Levenshtein Distance
// ============================================================================

/*
 * fast-levenshtein - Levenshtein algorithm in Javascript
 * (MIT License) Copyright (c) 2013 Ramesh Nair
 * https://github.com/hiddentao/fast-levenshtein
 */
let collator;
try {
    collator = (typeof Intl !== 'undefined' && typeof Intl.Collator !== 'undefined')
        ? Intl.Collator('generic', { sensitivity: 'base' })
        : null;
}
catch (err) {
    // Failed to initialize collator for Levenshtein
}

// arrays to re-use
const prevRow = [];
const str2Char = [];

/**
 * Levenshtein distance calculator
 * Based on the algorithm at http://en.wikipedia.org/wiki/Levenshtein_distance.
 */
export const Levenshtein = {
    /**
     * Calculate levenshtein distance of the two strings.
     *
     * @param {string} str1 - the first string.
     * @param {string} str2 - the second string.
     * @param {object} [options] - Additional options.
     * @param {boolean} [options.useCollator] - Use `Intl.Collator` for locale-sensitive string comparison.
     * @return {number} the levenshtein distance (0 and above).
     */
    get: function(str1, str2, options) {
        var useCollator = (options && collator && options.useCollator);

        var str1Len = str1.length,
            str2Len = str2.length;

        // base cases
        if (str1Len === 0) {
            return str2Len;
        }

        if (str2Len === 0) {
            return str1Len;
        }

        // two rows
        var curCol, nextCol, i, j, tmp;

        // initialise previous row
        for (i = 0; i < str2Len; ++i) {
            prevRow[i] = i;
            str2Char[i] = str2.charCodeAt(i);
        }
        prevRow[str2Len] = str2Len;

        var strCmp;
        if (useCollator) {
            // calculate current row distance from previous row using collator
            for (i = 0; i < str1Len; ++i) {
                nextCol = i + 1;

                for (j = 0; j < str2Len; ++j) {
                    curCol = nextCol;

                    // substution
                    strCmp = 0 === collator.compare(str1.charAt(i), String.fromCharCode(str2Char[j]));

                    nextCol = prevRow[j] + (strCmp ? 0 : 1);

                    // insertion
                    tmp = curCol + 1;
                    if (nextCol > tmp) {
                        nextCol = tmp;
                    }
                    // deletion
                    tmp = prevRow[j + 1] + 1;
                    if (nextCol > tmp) {
                        nextCol = tmp;
                    }

                    // copy current col value into previous (in preparation for next iteration)
                    prevRow[j] = curCol;
                }

                // copy last col value into previous (in preparation for next iteration)
                prevRow[j] = nextCol;
            }
        }
        else {
            // calculate current row distance from previous row without collator
            for (i = 0; i < str1Len; ++i) {
                nextCol = i + 1;

                for (j = 0; j < str2Len; ++j) {
                    curCol = nextCol;

                    // substution
                    strCmp = str1.charCodeAt(i) === str2Char[j];

                    nextCol = prevRow[j] + (strCmp ? 0 : 1);

                    // insertion
                    tmp = curCol + 1;
                    if (nextCol > tmp) {
                        nextCol = tmp;
                    }
                    // deletion
                    tmp = prevRow[j + 1] + 1;
                    if (nextCol > tmp) {
                        nextCol = tmp;
                    }

                    // copy current col value into previous (in preparation for next iteration)
                    prevRow[j] = curCol;
                }

                // copy last col value into previous (in preparation for next iteration)
                prevRow[j] = nextCol;
            }
        }
        return nextCol;
    }
};

// ============================================================================
// Drawer Utilities
// ============================================================================

/**
 * Get external drawer data structure
 * @param {string} name - drawer name
 * @returns {object} drawer data used by hasDrawers() mixin
 */
export function getExternalDrawerData(name) {
    var result = {};
    result[name] = {
        name: name,
        isOpened: false,
        initialEditedObject: {}
    };
    result[name].closeFn = function() {
        result[name].isOpened = false;
    };
    return result;
}