import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import * as countlyAuth from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import * as CountlyHelpers from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import jQuery from 'jquery';
import _ from 'underscore';

const FEATURE_NAME = "alerts";

/**
 * Rating options for alert filters
 */
export const RatingOptions = [
    { value: 1, label: jQuery.i18n.map["star.one-star"] },
    { value: 2, label: jQuery.i18n.map["star.two-star"] },
    { value: 3, label: jQuery.i18n.map["star.three-star"] },
    { value: 4, label: jQuery.i18n.map["star.four-star"] },
    { value: 5, label: jQuery.i18n.map["star.five-star"] },
];

const eventMaps = {};

/**
 * Extract event name & value
 * @param {array} data - original event list
 * @param {array} returnArray - target format
 */
function extractEvents(data, returnArray) {
    var eventData = _.isArray(data) ? data[0] : data;
    if (eventData && eventData.list) {
        for (var i = 0; i < eventData.list.length; i++) {
            returnArray.push({
                value: eventData.list[i],
                name: getEventLongName(eventData.list[i], eventData.map),
            });
        }
    }
}

/**
 * Extract getEventLongName
 * @param {string} eventKey - event key in db
 * @param {object} eventMap - for caching
 * @return {string} eventKey - return event parsed key name
 */
function getEventLongName(eventKey, eventMap) {
    var mapKey = eventKey
        .replace(/\\/g, "\\\\")
        .replace(/\$/g, "\\u0024")
        .replace(/\./g, "\\u002e");
    if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
        return eventMap[mapKey].name;
    }
    else {
        return eventKey;
    }
}

/**
 * Get event definition
 * @param {string} appId - which app to fetch
 * @param {array} results - for store fetch result
 * @return {object} promise - return request promise object
 */
function getEventsDfd(appId, results) {
    var dfd = jQuery.Deferred();

    if (eventMaps[appId]) {
        results.push(eventMaps[appId]);
        dfd.resolve();
    }
    else {
        jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                app_id: appId,
                method: "get_events",
            },
            dataType: "json",
            success: function(data) {
                if (data && data._id) {
                    eventMaps[data._id] = data;
                }
                results.push(data);
                dfd.resolve();
            },
        });
    }

    return dfd.promise();
}

/**
 * Get cohorts for the specified app.
 * @param {string} appId - The ID of the app.
 * @param {function} callback - The callback function.
 */
export function getCohortsForApp(appId, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r,
        data: {
            app_id: appId,
            method: "get_cohorts"
        },
        dataType: "json",
        success: function(res) {
            if (res && Array.isArray(res)) {
                return callback(res);
            }
            return callback([]);
        },
    });
}

/**
 * Get surveys for the specified app.
 * @param {string} appId - The ID of the app.
 * @param {function} callback - The callback function.
 */
export function getSurveysForApp(appId, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/surveys/survey/widgets",
        data: {
            app_id: appId,
        },
        dataType: "json",
        success: function(res) {
            if (res && Array.isArray(res.aaData)) {
                return callback(res.aaData);
            }
            return callback([]);
        },
    });
}

/**
 * Get NPS for the specified app.
 * @param {*} appId - The ID of the app.
 * @param {*} callback - The callback function.
 */
export function getNPSForApp(appId, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/surveys/nps/widgets",
        data: {
            app_id: appId,
        },
        dataType: "json",
        success: function(res) {
            if (res && Array.isArray(res.aaData)) {
                return callback(res.aaData);
            }
            return callback([]);
        },
    });
}

/**
 * Get crashes for the specified app for filtering.
 * @param {*} appId - The ID of the app.
 * @param {*} callback - The callback function.
 */
export function getCrashesForFilter(appId, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r,
        data: {
            app_id: appId,
            period: "60days",
            method: "crashes",
            graph: "1",
            display_loader: true,
        },
        dataType: "json",
        success: function(res) {
            if (res.crashes && res.crashes.app_version) {
                return callback(res.crashes.app_version);
            }
            return callback([]);
        },
    });
}

/**
 * Get rating for the specified app
 * @param {*} appId - The ID of the app.
 * @param {*} callback - The callback function.
 */
export function getRatingForApp(appId, callback) {
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/feedback/widgets",
        data: {
            app_id: appId,
        },
        dataType: "json",
        success: function(res) {
            if (res && Array.isArray(res)) {
                return callback(res);
            }
            return callback([]);
        },
    });
}

/**
 * Get events for the specified app
 * @param {string} appId - The ID of the app.
 * @param {function} callback - The callback function.
 */
export function getEventsForApp(appId, callback) {
    if (!appId) {
        callback([]);
        return;
    }
    var results = [];
    var ret = { events: [], segments: null };
    getEventsDfd(appId, results).then(function() {
        extractEvents(results, ret.events);
        if (results.length > 0) {
            var eventData = Array.isArray(results) ? results[0] : null;
            if (eventData && eventData.segments) {
                ret.segments = eventData.segments;
            }
        }
        for (var key in ret.segments) {
            if (key.indexOf(":") > -1) {
                var key2 = key.replace(/:/g, ".");
                ret.segments[key2] = [];
                for (var k = 0; k < ret.segments[key].length; k++) {
                    ret.segments[key2].push(ret.segments[key][k]);
                }
            }
        }
        callback(ret);
    });
}

/**
 * Get views for the specified app
 * @param {string} appId - The ID of the app.
 * @param {function} callback - The callback function.
 */
export function getViewForApp(appId, callback) {
    if (!appId) {
        return callback([]);
    }
    jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r,
        data: {
            app_id: appId,
            method: "views",
            action: "getTableNames",
        },
        dataType: "json",
        success: function(res) {
            if (res && res.aaData && res.aaData.length > 0) {
                var data = [];
                for (var i = 0; i < res.aaData.length; i++) {
                    data.push({
                        value: res.aaData[i]._id,
                        name: res.aaData[i].view,
                    });
                }
                return callback(data);
            }
            return callback([]);
        },
    });
}

/**
 * Default drawer configuration value
 * @returns {object} Default drawer config
 */
export function defaultDrawerConfigValue() {
    return {
        _id: null,
        alertName: null,
        alertDataType: null,
        alertDataSubType: null,
        alertDataSubType2: null,
        compareType: null,
        period: null,
        compareValue: null,
        selectedApps: [""],
        filterKey: null,
        filterValue: null,
        alertBy: "email",
        enabled: true,
        compareDescribe: "",
        alertValues: [],
    };
}

/**
 * Get the Vuex module for alerts
 * @returns {object} Vuex module
 */
export function getVuexModule() {
    var getEmptyState = function() {
        return {
            tableData: [],
        };
    };

    var getters = {
        tableData: function(state) {
            return state.tableData;
        },
    };

    var mutations = {
        setTableData: function(state, list) {
            state.tableData = list;
        },
    };

    var actions = {
        initialize: function(context) {
            context.dispatch("refresh");
        },
        refresh: function(context) {
            context.dispatch("countlyAlerts/table/fetchAll", null, {
                root: true,
            });
        },
        saveAlert: function(context, alertConfig) {
            delete alertConfig._canUpdate;
            delete alertConfig._canDelete;
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + "/alert/save",
                data: {
                    alert_config: JSON.stringify(alertConfig),
                    app_id:
                        alertConfig.selectedApps[0] === "all"
                            ? countlyCommon.ACTIVE_APP_ID
                            : alertConfig.selectedApps[0],
                },
                dataType: "json",
                success: function() {
                    context.dispatch("countlyAlerts/table/fetchAll", null, {
                        root: true,
                    });
                },
            }, { disableAutoCatch: true });
        },
        deleteAlert: function(context, options) {
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + "/alert/delete",
                data: {
                    alertID: options.alertID,
                    app_id:
                        options.appid === "all"
                            ? countlyCommon.ACTIVE_APP_ID
                            : options.appid,
                },
                dataType: "json",
                success: function() {
                    context.dispatch("countlyAlerts/table/fetchAll", null, {
                        root: true,
                    });
                },
            }, { disableAutoCatch: true });
        },
        deleteOnlineUsersAlert: function(context, options) {
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/delete",
                data: {
                    app_id: options.appid,
                    alertId: options.alertID,
                },
                dataType: "json",
                success: function() {
                    context.dispatch("countlyAlerts/table/fetchAll", null, {
                        root: true,
                    });
                },
                error: function(e) {
                    CountlyHelpers.notify({ message: e });
                },
            });
        },
        saveOnlineUsersAlert: function(context, alertConfig) {
            delete alertConfig._canUpdate;
            delete alertConfig._canDelete;

            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/save",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    alert: JSON.stringify(alertConfig),
                },
                dataType: "json",
                success: function(data) {
                    if (typeof data === "object" && data.result) {
                        CountlyHelpers.alert(data.result, "red");
                        return;
                    }
                    CountlyHelpers.notify({
                        message: jQuery.i18n.map["alerts.save-alert-success"],
                    });
                    context.dispatch("countlyAlerts/table/fetchAll", null, {
                        root: true,
                    });
                },
                error: function(e) {
                    CountlyHelpers.notify({ message: e });
                },
            }).then(function() {});
        },
    };

    var tableResource = countlyVue.vuex.Module("table", {
        state: function() {
            return {
                all: [],
                count: {
                    t: 0,
                    r: 0,
                    today: 0,
                },
                initialized: false,
            };
        },
        getters: {
            all: function(state) {
                return state.all;
            },
            count: function(state) {
                return state.count;
            },
            getInitialized: function(state) {
                return state.initialized;
            },
        },
        mutations: {
            setAll: function(state, val) {
                state.all = val;
            },
            setCount: function(state, val) {
                state.count = val;
            },
            setInitialized: function(state, val) {
                state.initialized = val;
            },
        },
        actions: {
            updateStatus: function(context, status) {
                return countlyVue.$.ajax({
                    type: "post",
                    url: countlyCommon.API_PARTS.data.w + "/alert/status",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        status: JSON.stringify(status),
                    },
                    dataType: "json",
                    success: function() {
                        // Status updated
                    },
                });
            },
            updateOnlineusersAlertStatus: function(context, status) {
                return countlyVue.$.ajax({
                    type: "post",
                    url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/status",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        status: JSON.stringify(status),
                    },
                    dataType: "json",
                    success: function() {
                        CountlyHelpers.notify({
                            message: jQuery.i18n.map["alerts.update-status-success"],
                        });
                    },
                });
            },
            fetchAll: function(context) {
                context.commit("setInitialized", false);
                return countlyVue.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/alert/list",
                    dataType: "json",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        preventGlobalAbort: true,
                    },
                }).then(function(data) {
                    var alertsList = data.alertsList;
                    var count = data.count;

                    var tableData = [];
                    for (var i = 0; i < alertsList.length; i++) {
                        var appNameList = [];
                        if (alertsList[i].selectedApps) {
                            appNameList = _.map(
                                alertsList[i].selectedApps,
                                function(appID) {
                                    if (appID === "all") {
                                        return "All apps";
                                    }
                                    return (
                                        countlyGlobal.apps[appID] &&
                                        countlyGlobal.apps[appID].name
                                    );
                                }
                            );
                        }
                        var rowData0 = Object.assign({}, alertsList[i]);
                        rowData0 = Object.assign(rowData0, {
                            _id: alertsList[i]._id,
                            app_id: alertsList[i].selectedApps[0],
                            appNameList: appNameList.join(", "),
                            alertName: alertsList[i].alertName || "",
                            type: alertsList[i].alertDataSubType || "",
                            condtionText: alertsList[i].compareDescribe || "",
                            enabled: alertsList[i].enabled || false,
                            createdByUser: alertsList[i].createdByUser || "",
                            createdAt: alertsList[i].createdAt || "",
                            _canUpdate: countlyAuth.validateUpdate(
                                FEATURE_NAME,
                                countlyGlobal.member,
                                alertsList[i].selectedApps[0]
                            ),
                            _canDelete: countlyAuth.validateDelete(
                                FEATURE_NAME,
                                countlyGlobal.member,
                                alertsList[i].selectedApps[0]
                            ),
                        });
                        tableData.push(rowData0);
                    }

                    if (
                        countlyGlobal.plugins.indexOf("concurrent_users") < 0 ||
                        !countlyAuth.validateRead("concurrent_users")
                    ) {
                        context.commit("setInitialized", true);
                        context.commit("setAll", tableData);
                        context.commit("setCount", count);
                        return;
                    }
                    countlyVue.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        dataType: "json",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: "concurrent_alerts",
                            preventGlobalAbort: true,
                        },
                    }).then(function(list) {
                        for (var j = 0; j < list.length; j++) {
                            var rowData = Object.assign({}, list[j]);
                            if (list[j].enabled === true) {
                                count.r++;
                            }
                            rowData = Object.assign(rowData, {
                                _id: list[j]._id,
                                alertName: list[j].name,
                                appNameList: countlyGlobal.apps[list[j].app].name,
                                condtionText: list[j].condition_title,
                                enabled: list[j].enabled,
                                selectedApps: [list[j].app],
                                alertDataType: "onlineUsers",
                                alertDataSubType: list[j].type,
                                compareType: list[j].def,
                                compareValue: list[j].users,
                                compareValue2: list[j].minutes,
                                alertValues: list[j].email,
                                createdByUser: list[j].createdByUser || '-',
                                _canUpdate: countlyAuth.validateUpdate(
                                    FEATURE_NAME,
                                    countlyGlobal.member,
                                    list[j].app
                                ),
                                _canDelete: countlyAuth.validateDelete(
                                    FEATURE_NAME,
                                    countlyGlobal.member,
                                    list[j].app
                                ),
                            });
                            tableData.push(rowData);
                        }
                        context.commit("setInitialized", true);
                        context.commit("setAll", tableData);
                        context.commit("setCount", count);
                    });
                });
            },
        },
    });

    return countlyVue.vuex.Module("countlyAlerts", {
        resetFn: getEmptyState,
        getters: getters,
        actions: actions,
        mutations: mutations,
        submodules: [tableResource],
    });
}

const countlyAlerts = {
    RatingOptions,
    getCohortsForApp,
    getSurveysForApp,
    getNPSForApp,
    getCrashesForFilter,
    getRatingForApp,
    getEventsForApp,
    getViewForApp,
    defaultDrawerConfigValue,
    getVuexModule,
};

export default countlyAlerts;