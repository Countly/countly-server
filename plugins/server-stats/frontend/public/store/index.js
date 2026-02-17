import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { ajax } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { Module } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';

var _dataPointsObj = {};
var _todPunchCardData = [];
var _top = [];

function getAppName(appId) {
    if (appId === "all-apps") {
        return "(" + (jQuery.i18n.map["server-stats.all-datapoints"] || "All Datapoints") + ")";
    }
    else if (appId === "[CLY]_consolidated") {
        return "(" + (jQuery.i18n.map["server-stats.consolidated-datapoints"] || "Consolidated Datapoints") + ")";
    }
    else if (appId === "natural-dp") {
        return "(" + (jQuery.i18n.map["server-stats.natural-datapoints"] || "Natural Datapoints") + ")";
    }
    else if (countlyGlobal.apps[appId]) {
        return countlyGlobal.apps[appId].name;
    }
    else {
        return "App name not available (" + appId + ")";
    }
}

var service = {
    initialize: function(options) {
        return ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/server-stats/data-points",
            data: {
                "period": countlyCommon.getPeriodAsDateStrings(),
                "selected_app": options.app_id || "",
            },
            dataType: "json"
        }).then(function(json) {
            _dataPointsObj = json;
            return true;
        });
    },
    punchCard: function(options) {
        var data = {};
        data.period = countlyCommon.getPeriodAsDateStrings();
        if (options.app_id) {
            data.selected_app = options.app_id;
        }
        return ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/server-stats/punch-card",
            dataType: "json",
            data: data
        }).then(function(json) {
            _todPunchCardData = json;
            return true;
        });
    },
    calculateTop: function() {
        return ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/server-stats/top",
            dataType: "json"
        }).then(function(json) {
            _top = json;
            return true;
        });
    },
    getPunchCardData: function() {
        return _todPunchCardData;
    },
    getTop: function() {
        _top = _top || [];
        for (var z = 0; z < _top.length; z++) {
            _top[z].value = countlyCommon.formatNumber(_top[z].v || 0);
            _top[z].name = getAppName(_top[z].a);
        }
        return _top;
    },
    getTableData: function() {
        var tableData = [];
        for (var app in _dataPointsObj) {
            var periodData = _dataPointsObj[app];
            var approx = false;
            var total = ((periodData.sessions || 0) + (periodData.events || 0) + (periodData.push || 0));
            if (app !== "all-apps" && app !== "natural-dp" && app !== "[CLY]_consolidated" && total < periodData.dp) {
                periodData.sessions = null;
                periodData.events = null;
                approx = true;
            }
            var appId = app;
            if (appId === "all-apps" || appId === "natural-dp") {
                appId = null;
            }
            var brokendownEvents = {
                "crashes": periodData.crash,
                "views": periodData.views,
                "actions": periodData.actions,
                "nps": periodData.nps,
                "surveys": periodData.surveys,
                "ratings": periodData.ratings,
                "apm": periodData.apm,
                "push": periodData.push,
                "ps": periodData.ps,
                "cs": periodData.cs,
                "custom": periodData.custom,
                llm: periodData.llm,
                aclk: periodData.aclk,
            };
            var sortable = [];
            for (var event in brokendownEvents) {
                sortable.push([event, brokendownEvents[event]]);
            }
            sortable.sort(function(a, b) {
                return b[1] - a[1];
            });
            tableData.push({
                "appName": getAppName(app),
                "appId": appId,
                "sessions": periodData.sessions,
                "data-points": periodData.dp,
                "change": periodData.change,
                "approximated": approx,
                "events": periodData.events,
                "events_breakdown": {
                    "crashes": periodData.crash,
                    "views": periodData.views,
                    "actions": periodData.actions,
                    "nps": periodData.nps,
                    "surveys": periodData.surveys,
                    "ratings": periodData.ratings,
                    "apm": periodData.apm,
                    "push": periodData.push,
                    "ps": periodData.ps,
                    "cs": periodData.cs,
                    "custom": periodData.custom,
                    llm: periodData.llm,
                    aclk: periodData.aclk,
                },
                "sorted_breakdown": sortable,
            });
        }
        return tableData;
    }
};

var countlyDataPoints = Module("countlyDataPoints", {
    state: function() {
        return {};
    },
    getters: {},
    actions: {},
    submodules: []
});

export { service };
export default countlyDataPoints;
