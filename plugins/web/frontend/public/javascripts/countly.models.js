/*global countlyCommon, jQuery*/

(function(countlyWebDashboard, $) {

    //Private Properties
    var _users = [],
        _appId = "";

    //Public Methods
    countlyWebDashboard.initialize = function(isRefresh) {
        if (_appId !== countlyCommon.ACTIVE_APP_ID) {
            countlyWebDashboard.reset();
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

    countlyWebDashboard.refresh = countlyWebDashboard.initialize;

    countlyWebDashboard.reset = function() {
        _users = [];
    };

    countlyWebDashboard.getLatestUsers = function() {
        return _users;
    };

}(window.countlyWebDashboard = window.countlyWebDashboard || {}, jQuery));