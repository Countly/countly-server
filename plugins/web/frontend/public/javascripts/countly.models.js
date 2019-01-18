/* global countlyCommon, jQuery */
(function(countlyWebDashboard, $, undefined) {

    //Private Properties
    var _sources = [],
        _browsers = [],
        _platforms = [],
        _users = [],
        _appId = "";

    // get latest users
    countlyWebDashboard.initialize = function(isRefresh) {
        if (_appId !== countlyCommon.ACTIVE_APP_ID) {
            countlyWebDashboard.resetUsers();
            _appId = countlyCommon.ACTIVE_APP_ID;
        }
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "latest_users",
                "display_loader": !isRefresh
            },
            dataType: "json",
            success: function(json) {
                _users = json;
            }
        });
    };

    // get top bar metrics for web application
    countlyWebDashboard.initializeMetrics = function(isRefresh) {
        if (_appId !== countlyCommon.ACTIVE_APP_ID) {
            countlyWebDashboard.resetMetrics();
            _appId = countlyCommon.ACTIVE_APP_ID;
        }
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/analytics/tops",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "metrics": '["platforms", "sources", "browser"]',
                "display_loader": !isRefresh
            },
            dataType: "json",
            success: function(json) {
                _sources = json.sources;
                _browsers = json.browser;
                _platforms = json.platforms;
            }
        });
    };

    countlyWebDashboard.refresh = countlyWebDashboard.initialize;

    countlyWebDashboard.resetMetrics = function() {
        _sources = [];
        _browsers = [];
        _platforms = [];
    };

    countlyWebDashboard.resetUsers = function() {
        _users = [];
    };

    countlyWebDashboard.getSources = function() {
        return _sources;
    };

    countlyWebDashboard.getBrowsers = function() {
        return _browsers;
    };

    countlyWebDashboard.getPlatforms = function() {
        return _platforms;
    };

    countlyWebDashboard.getLatestUsers = function() {
        return _users;
    };

}(window.countlyWebDashboard = window.countlyWebDashboard || {}, jQuery));