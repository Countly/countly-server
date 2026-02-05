import countlyGlobal from "./countly.global.js";
import _ from 'underscore';
import jQuery from 'jquery';
import { countlyCommon } from './countly.common.js';
import { app } from './countly.template.js';
import countlyDeviceDetails from './countly.device.detail.js';
import { i18n } from './vue/core.js';
const $ = jQuery;
import {
    encodeHtml,
    encodeSomeHtml,
    decode,
    union,
} from './countly.common.utils.js';
import vuexGlobalStore from './vue/data/store.js';
import * as COUNTLY_CONFIG from './countly.config.js';

/**
 * Some helper functions to be used throughout all views. Includes custom popup, alert and confirm dialogs for the time being.
 * @module countly.helpers
 */

/**
 * Checks if a Countly plugin is enabled.
 * @param {string|string[]} name - The name of the plugin(s) to check for. Can be either a string or an array of strings.
 * @returns {boolean} Returns true when at least one plugin is enabled, false otherwise.
 * @example
 * // Check single plugin
 * isPluginEnabled('push');
 *
 * // Check multiple plugins
 * isPluginEnabled(['push', 'crashes']);
 */
export function isPluginEnabled(name) {
    if (countlyGlobal && countlyGlobal.pluginsFull && Array.isArray(countlyGlobal.pluginsFull)) {
        if (!Array.isArray(name)) {
            name = [name];
        }
        var isPluginsFull = false;
        for (var i = 0; i < name.length; i++) {
            if (countlyGlobal.pluginsFull.indexOf(name[i]) > -1) {
                isPluginsFull = true;
                break;
            }
        }
        if (isPluginsFull && countlyGlobal.plugins && Array.isArray(countlyGlobal.plugins)) {
            for (var j = 0; j < name.length; j++) {
                if (countlyGlobal.plugins.indexOf(name[j]) > -1) {
                    return true;
                }
            }
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}

/**
 * Logs out the user and redirects to the specified path or reloads the page.
 * @param {string} [path] - Optional path to redirect to after logout. If provided, redirects to "logout", otherwise reloads the page.
 */
export function logout(path) {
    if (path) {
        window.location = "logout";
    }
    else {
        window.location.reload();
    }
}

/**
 * Display dashboard notification using toast or persistent notification.
 * @param {Object|string} msg - Notification message object or string
 * @param {string} [msg.title] - Title of the notification (deprecated)
 * @param {string} [msg.message] - Main notification text
 * @param {string} [msg.info] - Additional information to display (deprecated)
 * @param {number} [msg.delay=10000] - Delay time in milliseconds before displaying notification (deprecated)
 * @param {string} [msg.type='ok'] - Message type: 'ok', 'error', 'warning', 'info', 'blue', 'purple', 'success'
 * @param {string} [msg.position='top right'] - Message position (deprecated)
 * @param {boolean} [msg.sticky=false] - Should message stick until closed
 * @param {boolean} [msg.clearAll=false] - Clear all previous notifications (deprecated)
 * @param {boolean} [msg.closeOnClick=false] - Should notification auto-close when clicked (deprecated)
 * @param {Function} [msg.onClick] - Click event listener (deprecated)
 * @param {boolean} [msg.persistent] - Flag to determine if notification should be displayed persistently or as a toast
 * @param {string} [msg.id] - Unique identifier for the notification
 * @param {string} [msg.width] - Width of the notification
 * @param {string} [msg.goTo] - URL to navigate to when notification is clicked
 * @param {boolean} [msg.html] - If true, message will not be HTML encoded
 * @example
 * notify({
 *    message: "Main message text",
 *    type: "ok"
 * });
 */
export function notify(msg) {
    if (typeof msg === "string") {
        msg = {message: msg};
    }
    var payload = {};
    var persistent = msg.persistent;
    if (msg.html) {
        payload.text = msg.message;
    }
    else {
        payload.text = encodeHtml(msg.message);
    }
    payload.autoHide = !msg.sticky;
    payload.id = msg.id;
    payload.width = msg.width;
    payload.goTo = msg.goTo;
    var colorToUse;

    if (countlyGlobal.ssr) {
        return;
    }

    switch (msg.type) {
    case "error":
        colorToUse = "light-destructive";
        break;
    case "warning":
        colorToUse = "light-warning";
        break;
    case "yellow":
        colorToUse = "light-warning";
        break;
    case "info":
    case "blue":
        colorToUse = "light-informational";
        break;
    case "purple":
    case "ok":
    case "success":
    default:
        colorToUse = "light-successful";
        break;
    }
    payload.color = colorToUse;

    if (persistent) {
        vuexGlobalStore.dispatch('countlyCommon/onAddPersistentNotification', payload);
    }
    else {
        vuexGlobalStore.dispatch('countlyCommon/onAddNotificationToast', payload);
    }
}

/**
 * Removes a notification from persistent notification list based on id.
 * @param {string} notificationId - The unique identifier of the notification to remove
 */
export function removePersistentNotification(notificationId) {
    vuexGlobalStore.dispatch('countlyCommon/onRemovePersistentNotification', notificationId);
}

/**
 * Navigate to a URL or open an external link.
 * @param {Object} options - Navigation options
 * @param {string} options.url - The URL to navigate to
 * @param {string} [options.from] - The origin of the view (for backlink)
 * @param {string} [options.title] - The text to display for the backlink
 * @param {boolean} [options.isExternalLink] - If true, opens the URL in a new tab
 * @param {string} [options.download] - If provided, triggers a download with this filename
 */
export function goTo(options) {
    if (options.isExternalLink) {
        window.open(options.url, '_blank', 'noopener,noreferrer');
    }
    else if (options.download) {
        var a = document.createElement('a');
        a.href = options.url;
        a.download = options.download;
        a.click();
    }
    else {
        app.backlinkUrl = options.from;
        app.backlinkTitle = options.title;
        window.location.hash = options.url;
    }
}

/**
 * Get the backlink URL and title that were set by goTo() method.
 * @returns {Object} Object containing url and title properties for the backlink
 */
export function getBacklink() {
    var url = app.backlinkUrl;
    var title = app.backlinkTitle;
    app.backlinkUrl = null;
    app.backlinkTitle = null;
    return {url: url, title: title};
}

/**
 * Checks if the active app type is mobile.
 * @returns {boolean} true when active app type is mobile, otherwise false
 */
export function isActiveAppMobile() {
    return countlyGlobal.apps[vuexGlobalStore.state.countlyCommon.activeAppId].type === 'mobile';
}

/**
 * Display modal alert popup for quick short messages that require immediate user's attention.
 * @param {string} msg - Message to display in alert popup
 * @param {string} type - Type of alert: 'red' for errors, 'popStyleGreen' for success
 * @param {Object} [moreData] - Additional data to display
 * @param {string} [moreData.image] - Image id
 * @param {string} [moreData.title] - Alert title
 * @param {string} [moreData.button_title] - Custom button text
 * @example
 * showAlert("Some error happened", "red");
 */
export function showAlert(msg, type, moreData) {
    if (countlyGlobal.ssr) {
        return;
    }
    var confirmLabel = i18n('common.ok'),
        convertedType = "secondary";

    if (moreData && moreData.button_title) {
        confirmLabel = moreData.button_title;
    }

    if (type === "popStyleGreen") {
        convertedType = "success";
    }
    else if (type === "red") {
        convertedType = "danger";
    }

    var payload = {
        intent: 'message',
        message: (moreData && moreData.title) ? encodeSomeHtml(msg) : "",
        type: convertedType,
        confirmLabel: confirmLabel,
        title: (moreData && moreData.title) || encodeSomeHtml(msg),
        image: moreData && moreData.image
    };

    vuexGlobalStore.dispatch('countlyCommon/onAddDialog', payload);
}

/**
 * Display modal popup that requires confirmation input from user.
 * @param {string} msg - Message to display in confirm popup
 * @param {string} type - Type of confirm: 'red' for danger, 'popStyleGreen' for success
 * @param {Function} callback - Callback to determine result of the input
 * @param {string[]} [buttonText] - Array where [0] is cancel button text and [1] is confirm button text
 * @param {Object} [moreData] - Additional data to display
 * @param {string} [moreData.image] - Image id
 * @param {string} [moreData.title] - Alert title
 * @param {boolean} [moreData.showClose] - Whether to show close button (default: true)
 * @param {boolean} [moreData.alignCenter] - Whether to align content center (default: true)
 * @param {string} [testId='cly-confirm-test-id'] - Test id for UI tests
 * @example
 * showConfirm("Are you sure?", "red", function (result) {
 *    if (!result) {
 *        // User did not confirm, just exit
 *        return true;
 *    }
 *    // User confirmed, do what you need to do
 * });
 */
export function showConfirm(msg, type, callback, buttonText, moreData, testId = 'cly-confirm-test-id') {
    if (countlyGlobal.ssr) {
        return;
    }

    var cancelLabel = i18n('common.cancel'),
        confirmLabel = i18n('common.continue'),
        convertedType = "danger",
        showClose = moreData && moreData.showClose !== false,
        alignCenter = moreData && moreData.alignCenter !== false;

    if (buttonText && buttonText.length === 2) {
        cancelLabel = buttonText[0];
        confirmLabel = buttonText[1];
    }

    if (type === "popStyleGreen") {
        convertedType = "success";
    }

    var payload = {
        intent: 'confirm',
        message: encodeSomeHtml(msg),
        type: convertedType,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        title: moreData && moreData.title,
        image: moreData && moreData.image,
        showClose: showClose,
        alignCenter: alignCenter,
        callback: callback,
        testId: testId
    };

    vuexGlobalStore.dispatch('countlyCommon/onAddDialog', payload);
}

/**
 * Display modal popup that blocks the screen and cannot be closed.
 * @param {string} msg - Message to display in popup
 * @param {Object} [moreData] - Additional data to display
 * @param {string} [moreData.title] - Alert title
 * @param {string} [moreData.width='400px'] - Width of the dialog
 * @example
 * showBlockerDialog("Some message");
 */
export function showBlockerDialog(msg, moreData) {
    if (countlyGlobal.ssr) {
        return;
    }

    var payload = {
        intent: "blocker",
        message: msg,
        title: (moreData && moreData.title) || "",
        width: (moreData && moreData.width) || "400px",
    };

    vuexGlobalStore.dispatch('countlyCommon/onAddDialog', payload);
}

/**
 * Display modal popup that shows quickstart guide.
 * @param {string} content - Modal popup content
 */
export function showQuickstartPopover(content) {
    if (countlyGlobal.ssr) {
        return;
    }

    var payload = {
        intent: "quickstart",
        message: content,
        width: "314",
    };

    vuexGlobalStore.dispatch('countlyCommon/onAddDialog', payload);
}

/**
 * Check if the value is a valid JSON string.
 * @param {*} val - Value to check
 * @returns {boolean} true if the value is valid JSON, false otherwise
 * @example
 * isJSON('{"key": "value"}'); // true
 * isJSON('not json'); // false
 */
export function isJSON(val) {
    try {
        JSON.parse(val);
        return true;
    }
    catch (notJSONError) {
        return false;
    }
}

/**
 * Display export status notification.
 * @param {string|null} error - Error message if export failed
 * @param {string|null} export_id - Export ID if export completed
 * @param {string|null} task_id - Task ID if export started or completed
 */
export function displayExportStatus(error, export_id, task_id) {
    if (error) {
        showAlert(error, "red");
    }
    else if (export_id) {
        notify({
            type: "ok",
            title: jQuery.i18n.map["common.success"],
            message: jQuery.i18n.map["export.export-finished"],
            info: jQuery.i18n.map["app-users.export-finished-click"],
            sticky: false,
            clearAll: true,
            onClick: function() {
                var win = window.open(COUNTLY_CONFIG.API_PARTS.data.r + "/export/download/" + task_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + vuexGlobalStore.state.countlyCommon.activeAppId, '_blank');
                win.focus();
            }
        });
    }
    else if (task_id) {
        notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["export.export-started"], sticky: false, clearAll: false});
    }
    else {
        showAlert(jQuery.i18n.map["export.export-failed"], "red");
    }
}

/**
 * Convert array of app ids to comma separated string of app names.
 * @param {string[]} context - Array with app ids
 * @returns {string} Comma-separated list of app names
 * @example
 * // outputs "Test1, Test2, Test3"
 * appIdsToNames(["586e3216326a8b0a07b8d87f", "586e339a326a8b0a07b8ecb9", "586e3343c32cb30a01558cc3"]);
 */
export function appIdsToNames(context) {
    var ret = "";

    for (var i = 0; i < context.length; i++) {
        if (!context[i]) {
            continue;
        }
        else if (!countlyGlobal.apps[context[i]]) {
            ret += 'deleted app';
        }
        else {
            ret += countlyGlobal.apps[context[i]].name;
        }

        if (context.length > 1 && i !== context.length - 1) {
            ret += ", ";
        }
    }

    return ret;
}

/**
 * Load a JavaScript file dynamically.
 * @param {string} js - Path or URL to the JS file
 * @param {Function} [callback] - Callback when file is loaded
 * @example
 * loadJS("/myplugin/javascripts/custom.js");
 */
export function loadJS(js, callback) {
    var fileref = document.createElement('script'),
        loaded;
    fileref.setAttribute("type", "text/javascript");
    fileref.setAttribute("src", js);
    if (callback) {
        fileref.onreadystatechange = fileref.onload = function() {
            if (!loaded) {
                callback();
            }
            loaded = true;
        };
    }
    document.getElementsByTagName("head")[0].appendChild(fileref);
}

/**
 * Load a CSS file dynamically.
 * @param {string} css - Path or URL to the CSS file
 * @param {Function} [callback] - Callback when file is loaded
 * @example
 * loadCSS("/myplugin/stylesheets/custom.css");
 */
export function loadCSS(css, callback) {
    var fileref = document.createElement("link"),
        loaded;
    fileref.setAttribute("rel", "stylesheet");
    fileref.setAttribute("type", "text/css");
    fileref.setAttribute("href", css);
    if (callback) {
        fileref.onreadystatechange = fileref.onload = function() {
            if (!loaded) {
                callback();
            }
            loaded = true;
        };
    }
    document.getElementsByTagName("head")[0].appendChild(fileref);
}

/**
 * Create Countly metric model to fetch metric data from server and provide it to views.
 * @param {Object} countlyMetric - Initial metric object if you want to pre-provide some methods
 * @param {string|Object} metric - Metric name to retrieve from server, or object with name and estOverrideMetric
 * @param {Object} [_jQueryRef] - Deprecated: jQuery reference (no longer needed, jQuery is imported at module level)
 * @param {Function} [fetchValue] - Default function to fetch and transform value from standard metric model
 * @example
 * window.countlyDensity = {};
 * countlyDensity.checkOS = function(os, density){
 *     var lastIndex = density.toUpperCase().lastIndexOf("DPI");
 *     if(os.toLowerCase() == "android" && lastIndex !== -1 && lastIndex === density.length - 3)
 *         return true;
 *     if(os.toLowerCase() == "ios" && density[0] == "@")
 *         return true;
 *     return false;
 * };
 * createMetricModel(window.countlyDensity, {name: "density", estOverrideMetric: "densities"}, jQuery, function(val, data, separate){
 *     if(separate){
 *         return val;
 *     }
 *     else{
 *         return val[0];
 *     }
 * });
 */
export function createMetricModel(countlyMetric, metric, _jQueryRef, fetchValue) {
    countlyMetric = countlyMetric || {};
    countlyMetric.fetchValue = fetchValue;

    var _Db = {},
        _metrics = {},
        _activeAppKey = 0,
        _initialized = false,
        _processed = false,
        _period = null,
        _name = (metric.name) ? metric.name : metric,
        _estOverrideMetric = (metric.estOverrideMetric) ? metric.estOverrideMetric : "";
    var _promises = {};

    countlyMetric.getCurrentLoadState = function() {
        return {"init": _initialized, "period": _period};
    };

    countlyMetric.initialize = function(processed) {
        var periodToFetch = countlyCommon.getPeriodForAjax();

        var key = vuexGlobalStore.state.countlyCommon.activeAppId + "-" + _name + "-" + periodToFetch;
        var key_refresh = vuexGlobalStore.state.countlyCommon.activeAppId + "-" + _name + "-refresh";
        if (_promises[key]) {
            return _promises[key];
        }
        else if (_promises[key_refresh]) {
            return _promises[key_refresh];
        }
        if (_initialized && _period === periodToFetch && _activeAppKey === vuexGlobalStore.state.countlyCommon.activeAppKey) {
            return this.refresh();
        }
        _period = countlyCommon.getPeriodForAjax();

        if (!COUNTLY_CONFIG.DEBUG) {
            _activeAppKey = vuexGlobalStore.state.countlyCommon.activeAppKey;
            _initialized = true;

            if (processed) {
                _processed = true;
                return $.ajax({
                    type: "GET",
                    url: COUNTLY_CONFIG.API_PARTS.data.r + "/analytics/metric",
                    data: {
                        "app_id": vuexGlobalStore.state.countlyCommon.activeAppId,
                        "metric": _name,
                        "period": _period
                    },
                    success: function(json) {
                        _Db = json;
                        if (countlyMetric.callback) {
                            countlyMetric.callback(false, json);
                        }
                    }
                });
            }
            else {
                _promises[key] = $.ajax({
                    type: "GET",
                    url: COUNTLY_CONFIG.API_PARTS.data.r,
                    data: {
                        "app_id": vuexGlobalStore.state.countlyCommon.activeAppId,
                        "method": _name,
                        "period": _period
                    },
                    success: function(json) {
                        _Db = json;
                        setMeta();
                        if (countlyMetric.callback) {
                            countlyMetric.callback(false, json);
                        }
                        delete _promises[key];
                    },
                    error: function() {
                        delete _promises[key];
                    }
                });

                return _promises[key];
            }
        }
        else {
            _Db = {"2012": {}};
            if (countlyMetric.callback) {
                countlyMetric.callback(false, _Db);
            }
            return true;
        }
    };

    countlyMetric.refresh = function() {
        if (!COUNTLY_CONFIG.DEBUG) {
            if (_activeAppKey !== vuexGlobalStore.state.countlyCommon.activeAppKey) {
                _activeAppKey = vuexGlobalStore.state.countlyCommon.activeAppKey;
                return this.initialize();
            }

            if (_processed) {
                if (countlyMetric.callback) {
                    countlyMetric.callback(true);
                }
            }
            else {
                var key = vuexGlobalStore.state.countlyCommon.activeAppId + "-" + _name + "-refresh";
                if (_promises[key]) {
                    return _promises[key];
                }
                _promises[key] = $.ajax({
                    type: "GET",
                    url: COUNTLY_CONFIG.API_PARTS.data.r,
                    data: {
                        "app_id": vuexGlobalStore.state.countlyCommon.activeAppId,
                        "method": _name,
                        "action": "refresh"
                    },
                    success: function(json) {
                        countlyCommon.extendDbObj(_Db, json);
                        extendMeta();
                        if (countlyMetric.callback) {
                            countlyMetric.callback(true, json);
                        }
                        delete _promises[key];
                    },
                    error: function() {
                        delete _promises[key];
                    }
                });

                return _promises[key];
            }
        }
        else {
            _Db = {"2012": {}};
            if (countlyMetric.callback) {
                countlyMetric.callback(true, _Db);
            }
            return true;
        }
    };

    countlyMetric.callback;

    countlyMetric.reset = function() {
        if (_processed) {
            _Db = [];
        }
        else {
            _Db = {};
            setMeta();
        }
    };

    countlyMetric.getDb = function() {
        return _Db;
    };

    countlyMetric.setDb = function(db) {
        _Db = db;
        setMeta();
    };

    countlyMetric.extendDb = function(data) {
        countlyCommon.extendDbObj(_Db, data);
        extendMeta();
    };

    countlyMetric.getMeta = function(metric1) {
        metric1 = metric1 || _name;
        return _metrics[metric1] || [];
    };

    countlyMetric.getData = function(clean, join, metric1, estOverrideMetric) {
        var chartData = {};
        var i = 0;
        if (_processed) {
            chartData.chartData = [];
            var data = JSON.parse(JSON.stringify(_Db));
            for (i = 0; i < _Db.length; i++) {
                if (fetchValue && !clean) {
                    data[i][metric1 || _name] = fetchValue(decode(data[i]._id));
                }
                else {
                    data[i][metric1 || _name] = decode(data[i]._id);
                }
                chartData.chartData[i] = data[i];
            }
        }
        else {
            chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric1), this.clearObject, [
                {
                    name: metric1 || _name,
                    func: function(rangeArr) {
                        rangeArr = decode(rangeArr);
                        if (fetchValue && !clean) {
                            return fetchValue(rangeArr);
                        }
                        else {
                            return rangeArr;
                        }
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], estOverrideMetric || _estOverrideMetric);
        }
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1 || _name);
        chartData.chartData.sort(function(a, b) {
            return b.t - a.t;
        });
        var namesData = _.pluck(chartData.chartData, metric1 || _name),
            totalData = _.pluck(chartData.chartData, 't'),
            newData = _.pluck(chartData.chartData, 'n');

        if (join) {
            chartData.chartDP = {ticks: []};
            var chartDP = [
                {data: [], label: jQuery.i18n.map["common.table.total-sessions"]},
                {data: [], label: jQuery.i18n.map["common.table.new-users"]}
            ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[namesData.length + 1] = [namesData.length, null];
            chartDP[1].data[0] = [-1, null];
            chartDP[1].data[namesData.length + 1] = [namesData.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([namesData.length, ""]);

            for (i = 0; i < namesData.length; i++) {
                chartDP[0].data[i + 1] = [i, totalData[i]];
                chartDP[1].data[i + 1] = [i, newData[i]];
                chartData.chartDP.ticks.push([i, namesData[i]]);
            }

            chartData.chartDP.dp = chartDP;
        }
        else {
            var chartData2 = [],
                chartData3 = [];

            for (i = 0; i < namesData.length; i++) {
                chartData2[i] = {
                    data: [
                        [0, totalData[i]]
                    ],
                    label: namesData[i]
                };
            }

            for (i = 0; i < namesData.length; i++) {
                chartData3[i] = {
                    data: [
                        [0, newData[i]]
                    ],
                    label: namesData[i]
                };
            }

            chartData.chartDPTotal = {};
            chartData.chartDPTotal.dp = chartData2;

            chartData.chartDPNew = {};
            chartData.chartDPNew.dp = chartData3;
        }
        return chartData;
    };

    countlyMetric.clearObject = function(obj) {
        if (obj) {
            if (!obj.t) {
                obj.t = 0;
            }
            if (!obj.n) {
                obj.n = 0;
            }
            if (!obj.u) {
                obj.u = 0;
            }
        }
        else {
            obj = {"t": 0, "n": 0, "u": 0};
        }

        return obj;
    };

    countlyMetric.getBarsWPercentageOfTotal = function(segment, mtric, estOverrideMetric) {
        mtric = mtric || "t";
        if (_processed) {
            var rangeData = {};
            rangeData.chartData = [];
            var data = JSON.parse(JSON.stringify(_Db));
            for (var i = 0; i < _Db.length; i++) {
                if (fetchValue) {
                    data[i].range = fetchValue(decode(data[i]._id));
                }
                else {
                    data[i].range = decode(data[i]._id);
                }
                rangeData.chartData[i] = data[i];
            }

            return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData, mtric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
        }
        else {
            return countlyCommon.extractBarDataWPercentageOfTotal(_Db, this.getMeta(segment), this.clearObject, fetchValue, mtric, estOverrideMetric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
        }
    };

    countlyMetric.getBars = function(metric_pd) {
        if (_processed) {
            var rangeData = {};
            rangeData.chartData = [];
            var data = JSON.parse(JSON.stringify(_Db));
            for (var i = 0; i < _Db.length; i++) {
                if (fetchValue) {
                    data[i].range = fetchValue(decode(data[i]._id));
                }
                else {
                    data[i].range = decode(data[i]._id);
                }
                rangeData.chartData[i] = data[i];
            }
            return countlyCommon.calculateBarData(rangeData);
        }
        else {
            return countlyCommon.extractBarData(_Db, this.getMeta(metric_pd), this.clearObject, fetchValue);
        }
    };

    countlyMetric.getOSSegmentedData = function(os, clean, metric_pd, estOverrideMetric) {
        var _os = countlyDeviceDetails.getPlatforms();
        var oSVersionData = {};
        var i = 0;
        if (_processed) {
            oSVersionData.chartData = [];
            var data = JSON.parse(JSON.stringify(_Db));
            for (i = 0; i < _Db.length; i++) {
                if (fetchValue && !clean) {
                    data[i][metric_pd || _name] = fetchValue(decode(data[i]._id));
                }
                else {
                    data[i][metric_pd || _name] = decode(data[i]._id);
                }
                oSVersionData.chartData[i] = data[i];
            }
        }
        else {
            oSVersionData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric_pd), this.clearObject, [
                {
                    name: metric_pd || _name,
                    func: function(rangeArr) {
                        rangeArr = decode(rangeArr);
                        if (fetchValue && !clean) {
                            return fetchValue(rangeArr);
                        }
                        else {
                            return rangeArr;
                        }
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], estOverrideMetric || _estOverrideMetric);
        }

        os = ((os) ? os : ((_os) ? _os[0] : null));

        var chartData2 = [];
        var osSegmentation = os;
        oSVersionData = countlyDeviceDetails.eliminateOSVersion(oSVersionData, osSegmentation, metric_pd || _name, false);

        var platformVersionTotal = _.pluck(oSVersionData.chartData, 'u');
        oSVersionData.chartData = _.compact(oSVersionData.chartData);
        platformVersionTotal = _.without(platformVersionTotal, false, null, "", undefined, NaN);

        var platformVersionNames = _.pluck(oSVersionData.chartData, metric_pd || _name);

        for (i = 0; i < platformVersionNames.length; i++) {
            chartData2[chartData2.length] = {
                data: [
                    [0, platformVersionTotal[i]]
                ],
                label: platformVersionNames[i].replace(((countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) ? countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].name : osSegmentation) + " ", "")
            };
        }

        oSVersionData.chartDP = {};
        oSVersionData.chartDP.dp = chartData2;
        oSVersionData.os = [];

        if (_os && _os.length > 1) {
            for (i = 0; i < _os.length; i++) {
                oSVersionData.os.push({
                    "name": _os[i],
                    "class": _os[i].toLowerCase()
                });
            }
        }

        return oSVersionData;
    };

    countlyMetric.getRangeData = function(metric_pd, meta, explain, order) {
        var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};

        chartData.chartData = countlyCommon.extractRangeData(_Db, metric_pd, this.getMeta(meta), explain, order);

        var frequencies = _.pluck(chartData.chartData, metric_pd),
            frequencyTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data: []}
            ];

        chartDP[0].data[0] = [-1, null];
        chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([frequencies.length, ""]);
        var i = 0;
        for (i = 0; i < frequencies.length; i++) {
            chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
            chartData.chartDP.ticks.push([i, frequencies[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i].percentageNumber = chartData.chartData[i].percent;
            chartData.chartData[i].percent = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i].percent) + "px;'></div>" + chartData.chartData[i].percent + "%";
        }

        return chartData;
    };

    /**
     * Set metric meta information from the database.
     */
    function setMeta() {
        if (_Db.meta) {
            for (var i in _Db.meta) {
                _metrics[i] = (_Db.meta[i]) ? _Db.meta[i] : [];
            }
        }
        else {
            _metrics = {};
        }
    }

    /**
     * Extend existing metric meta information with new data from the database.
     */
    function extendMeta() {
        if (_Db.meta) {
            for (var i in _Db.meta) {
                _metrics[i] = union(_metrics[i], _Db.meta[i]);
            }
        }
    }
}

/**
 * Shuffle string characters randomly using crypto.getRandomValues.
 * @param {string[]} text - Array of characters to be shuffled
 * @returns {string} Shuffled string
 */
export function shuffleString(text) {
    var j, x, i;
    for (i = text.length; i; i--) {
        j = Math.floor(Math.random() * i);
        x = text[i - 1];
        text[i - 1] = text[j];
        text[j] = x;
    }

    return text.join("");
}

/**
 * Gets a random string from given character set string with given length.
 * @param {string} charSet - Character set string to pick from
 * @param {number} [length=1] - Length of the random string
 * @returns {string} Random string from charset
 */
export function getRandomValue(charSet, length = 1) {
    const randomValues = crypto.getRandomValues(new Uint8Array(charSet.length));
    let randomValue = "";

    if (length > charSet.length) {
        length = charSet.length;
    }

    for (let i = 0; i < length; i++) {
        randomValue += charSet[randomValues[i] % charSet.length];
    }

    return randomValue;
}

/**
 * Generate random password with specified length and character requirements.
 * @param {number} length - Length of the password
 * @param {boolean} [no_special] - If true, do not include special characters
 * @returns {string} Generated password
 * @example
 * // outputs something like "4UBHvRBG1v"
 * generatePassword(10, true);
 */
export function generatePassword(length, no_special) {
    var text = [];
    var chars = "abcdefghijklmnopqrstuvwxyz";
    var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var numbers = "0123456789";
    var specials = '!@#$%^&*()_+{}:"<>?\|[];\x27,./\x60~';
    var all = chars + upchars + numbers;
    if (!no_special) {
        all += specials;
    }

    // 1 uppercase char
    text.push(getRandomValue(upchars));
    // 1 number
    text.push(getRandomValue(numbers));
    // 1 special char
    if (!no_special) {
        text.push(getRandomValue(specials));
        length--;
    }

    // remaining chars
    text.push(getRandomValue(all, Math.max(length - 2, 5)));

    // randomize order
    return shuffleString(text);
}

/**
 * Validate email address format.
 * @param {string} email - Email address to validate
 * @returns {boolean} true if valid, false if invalid
 * @example
 * validateEmail("test@test.test"); // true
 * validateEmail("test@test"); // false
 */
export function validateEmail(email) {
    var re = /[a-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_\`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    return re.test(email);
}

/**
 * Validate password based on settings provided via security configuration.
 * @param {string} password - Password to validate
 * @returns {boolean|string} false if valid, or error message string if invalid
 */
export function validatePassword(password) {
    if (password.length < countlyGlobal.security.password_min) {
        return jQuery.i18n.prop("management-users.password.length", countlyGlobal.security.password_min);
    }
    if (countlyGlobal.security.password_char && !/[A-Z]/.test(password)) {
        return jQuery.i18n.map["management-users.password.has-char"];
    }
    if (countlyGlobal.security.password_number && !/\d/.test(password)) {
        return jQuery.i18n.map["management-users.password.has-number"];
    }
    if (countlyGlobal.security.password_symbol && !/[^A-Za-z\d]/.test(password)) {
        return jQuery.i18n.map["management-users.password.has-special"];
    }
    return false;
}

/**
 * Get currently selected period that can be used in ajax requests.
 * @param {string|number[]} period - Selected date period
 * @returns {string} Supported values are: 'month', '60days', '30days', '7days', 'yesterday', 'hour' or JSON string of [startMilliseconds, endMilliseconds]
 */
export { getPeriodUrlQueryParameter } from './countly.utils.js';

/**
 * Format number to percentage value.
 * @param {number} value - Number to be converted to percentage
 * @param {number} [decimalPlaces=2] - Number of decimal places to keep
 * @returns {number} Percentage number for given value, or 0 for falsy/non-number values
 */
export function formatPercentage(value, decimalPlaces) {
    if (isNaN(value) || !value) {
        return 0;
    }
    if (!decimalPlaces) {
        decimalPlaces = 2;
    }
    return parseFloat((Math.round(value * 100)).toFixed(decimalPlaces));
}

/**
 * Calculate SHA1 hash of a string.
 * @param {string} str - String to encode
 * @returns {string} SHA1 hash of the input string
 */
export function sha1(str) {
    var rotate_left = function(n, s) {
        var t4 = (n << s) | (n >>> (32 - s));
        return t4;
    };

    var cvt_hex = function(val) {
        var str1 = '';
        var i;
        var v;

        for (i = 7; i >= 0; i--) {
            v = (val >>> (i * 4)) & 0x0f;
            str1 += v.toString(16);
        }
        return str1;
    };

    var blockstart;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;

    var str_len = str.length;

    var word_array = [];
    for (i = 0; i < str_len - 3; i += 4) {
        j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
        word_array.push(j);
    }

    switch (str_len % 4) {
    case 0:
        i = 0x080000000;
        break;
    case 1:
        i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
        break;
    case 2:
        i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
        break;
    case 3:
        i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) <<
        8 | 0x80;
        break;
    }

    word_array.push(i);

    while ((word_array.length % 16) !== 14) {
        word_array.push(0);
    }

    word_array.push(str_len >>> 29);
    word_array.push((str_len << 3) & 0x0ffffffff);

    for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
        for (i = 0; i < 16; i++) {
            W[i] = word_array[blockstart + i];
        }
        for (i = 16; i <= 79; i++) {
            W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
        }

        A = H0;
        B = H1;
        C = H2;
        D = H3;
        E = H4;

        for (i = 0; i <= 19; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 20; i <= 39; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 40; i <= 59; i++) {
            temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        for (i = 60; i <= 79; i++) {
            temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
            E = D;
            D = C;
            C = rotate_left(B, 30);
            B = A;
            A = temp;
        }

        H0 = (H0 + A) & 0x0ffffffff;
        H1 = (H1 + B) & 0x0ffffffff;
        H2 = (H2 + C) & 0x0ffffffff;
        H3 = (H3 + D) & 0x0ffffffff;
        H4 = (H4 + E) & 0x0ffffffff;
    }

    temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
    return temp.toLowerCase();
}

/**
 * Template loader for loading static resources over jQuery.
 * @class
 */
class Template {
    /**
     * Template loader constructor.
     */
    constructor() {
        this.cached = {};
        this.raw = {};
    }

    /**
     * Process and return fetched template.
     * @param {string} name - Template path
     * @param {Function} [callback] - Callback when done
     * @returns {Promise|string} Ajax promise or cached template
     */
    render(name, callback) {
        if (this.isCached(name)) {
            if (typeof callback === "function") {
                callback(this.cached[name]);
            }
            return this.cached[name];
        }
        else {
            const self = this;
            return $.get(this.urlFor(name), function(raw) {
                self.store(name, raw);
                self.render(name, callback);
            });
        }
    }

    /**
     * Fetch and return raw template.
     * @param {string} name - Template path
     * @param {Function} [callback] - Callback when done
     * @returns {Promise|string} Ajax promise or cached raw template
     */
    get(name, callback) {
        if (this.isCached(name)) {
            if (typeof callback === "function") {
                callback(this.raw[name]);
            }
            return this.raw[name];
        }
        else {
            const self = this;
            return $.get(this.urlFor(name), function(raw) {
                self.store(name, raw);
                self.get(name, callback);
            });
        }
    }

    /**
     * Fetch and return raw template synchronously.
     * @param {string} name - Template path
     * @param {Function} [callback] - Callback when done
     */
    renderSync(name, callback) {
        if (!this.isCached(name)) {
            this.fetch(name);
        }
        this.render(name, callback);
    }

    /**
     * Prefetch template asynchronously.
     * @param {string} name - Template path
     */
    prefetch(name) {
        const self = this;
        $.get(this.urlFor(name), function(raw) {
            self.store(name, raw);
        });
    }

    /**
     * Fetch template synchronously.
     * @param {string} name - Template path
     */
    fetch(name) {
        if (!this.isCached(name)) {
            var raw = $.ajax({ 'url': this.urlFor(name), 'async': false }).responseText;
            this.store(name, raw);
        }
    }

    /**
     * Check if template is cached.
     * @param {string} name - Template path
     * @returns {boolean} true if template is cached
     */
    isCached(name) {
        return !!this.cached[name];
    }

    /**
     * Store template in cache.
     * @param {string} name - Template path
     * @param {string} raw - Raw template data
     */
    store(name, raw) {
        this.raw[name] = raw;
        this.cached[name] = raw;
    }

    /**
     * Generate request URL for template.
     * @param {string} name - Template path
     * @returns {string} URL where to fetch template
     */
    urlFor(name) {
        if (countlyGlobal.path && countlyGlobal.path.length && name.indexOf(countlyGlobal.path) !== 0) {
            name = countlyGlobal.path + name;
        }
        return name + "?" + countlyGlobal.countlyVersion;
    }
}

/**
 * Global template loader instance.
 * @type {Template}
 * @example
 * // Get Handlebar compiled HTML
 * $.when(T.render('/density/templates/density.html', function(src){
 *     self.template = src;
 * })).then(function () {});
 *
 * // Get raw resources
 * $.when(T.get('/density/templates/density.html', function(src){
 *     self.template = Handlebar.compile(src);
 * })).then(function () {});
 */
export const T = new Template();

// Backward compatibility aliases for legacy code
export { showConfirm as confirm };
export { showAlert as alert };