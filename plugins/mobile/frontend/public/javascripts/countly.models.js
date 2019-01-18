/*global countlyCommon, jQuery*/

(function(countlyMobileDashboard, $) {

    //Private Properties
    var _carriers = [],
        _platforms = [],
        _devices = [],
        _resolutions = [],
        _appId = "";

    //Public Methods
    countlyMobileDashboard.initialize = function(isRefresh) {
        if (_appId !== countlyCommon.ACTIVE_APP_ID) {
            countlyMobileDashboard.reset();
            _appId = countlyCommon.ACTIVE_APP_ID;
        }
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/analytics/tops",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "metrics": '["platforms", "devices", "carriers", "resolutions"]',
                "display_loader": !isRefresh
            },
            dataType: "json",
            success: function(json) {
                _platforms = json.platforms;
                _resolutions = json.resolutions;
                _devices = json.devices;
                _carriers = json.carriers;
            }
        });
    };

    countlyMobileDashboard.refresh = countlyMobileDashboard.initialize;

    countlyMobileDashboard.reset = function() {
        _platforms = [];
        _devices = [];
        _carriers = [];
        _resolutions = [];
    };

    countlyMobileDashboard.getPlatforms = function() {
        return _platforms;
    };

    countlyMobileDashboard.getDevices = function() {
        return _devices;
    };

    countlyMobileDashboard.getCarriers = function() {
        return _carriers;
    };

    countlyMobileDashboard.getResolutions = function() {
        return _resolutions;
    };

}(window.countlyMobileDashboard = window.countlyMobileDashboard || {}, jQuery));