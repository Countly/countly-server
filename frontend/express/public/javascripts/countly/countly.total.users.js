(function (countlyTotalUsers, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _activeAppKey = 0,
        _initialized = {},
        _period = null,
        _calculatedObjects = {};

    //Public Methods
    countlyTotalUsers.initialize = function (forMetric) {
        if (!countlyTotalUsers.isUsable()) {
            return true;
        }

        if (isInitialized(forMetric)) {
            return countlyTotalUsers.refresh(forMetric);
        }

        _period = countlyCommon.getPeriodForAjax();
        _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
        _initialized[forMetric] = true;

        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key": countlyGlobal.member.api_key,
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "total_users",
                "metric": forMetric,
                "period": _period
            },
            dataType:"jsonp",
            success:function (json) {
                _calculatedObjects[forMetric] = formatCalculatedObj(json, forMetric);
            }
        });
    };

    countlyTotalUsers.refresh = function (forMetric) {
        return true;
    };

    countlyTotalUsers.get  = function (forMetric) {
        return _calculatedObjects[forMetric] || {};
    };

    countlyTotalUsers.isUsable = function() {
        return countlyCommon.periodObj.periodContainsToday;
    };

    function isInitialized(forMetric) {
        return  _initialized[forMetric] == true &&
                _period == countlyCommon.getPeriodForAjax() &&
                _activeAppKey == countlyCommon.ACTIVE_APP_KEY;
    }

    function formatCalculatedObj(obj, forMetric) {
        var tmpObj = {},
            processingFunction;

        switch(forMetric) {
            case "devices":
                processingFunction = countlyDevice.getDeviceFullName;
                break;
        }

        for (var i = 0; i < obj.length; i++) {
            var tmpKey = (processingFunction)? processingFunction(obj[i]["_id"]) : obj[i]["_id"];

            tmpObj[tmpKey] = obj[i]["u"];
        }

        return tmpObj;
    }

}(window.countlyTotalUsers = window.countlyTotalUsers || {}, jQuery));