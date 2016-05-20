(function (countlyTotalUsers, $, undefined) {

    //Private Properties
    var _activeAppKey = 0,
        _initialized = {},
        _period = null,
        _totalUserObjects = {};

    //Public Methods
    countlyTotalUsers.initialize = function (forMetric) {
        _period = countlyCommon.getPeriodForAjax();
        _activeAppKey = countlyCommon.ACTIVE_APP_KEY;

        if (!countlyTotalUsers.isUsable()) {
            return true;
        }

        if (isInitialized(forMetric)) {
            return countlyTotalUsers.refresh(forMetric);
        }

        setInit(forMetric);

        /*
            Format of the API request is
            /o?method=total_users & metric=countries & period=X & api_key=Y & app_id=Y
         */
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
                setCalculatedObj(forMetric, json, forMetric);
            }
        });
    };

    countlyTotalUsers.refresh = function (forMetric) {
        return true;
    };

    countlyTotalUsers.get = function (forMetric) {
        if (_totalUserObjects[_activeAppKey] && _totalUserObjects[_activeAppKey][forMetric]) {
            return _totalUserObjects[_activeAppKey][forMetric][_period] || {};
        } else {
            return {};
        }
    };

    /*
        Total user override can only be used if selected period contains today
        API returns empty object if requested date doesn't contain today
     */
    countlyTotalUsers.isUsable = function() {
        return countlyCommon.periodObj.periodContainsToday;
    };

    /*
        Sets init status for forMetric in below format
        { "APP_KEY": { "countries": { "60days": true } } }
        We don't directly use _totalUserObjects for init check because it is init after AJAX and might take time
     */
    function setInit(forMetric) {
        if (!_initialized[_activeAppKey]) {
            _initialized[_activeAppKey] = {};
        }

        if (!_initialized[_activeAppKey][forMetric]) {
            _initialized[_activeAppKey][forMetric] = {};
        }

        _initialized[_activeAppKey][forMetric][_period] = true;
    }

    function isInitialized(forMetric) {
        return  _initialized[_activeAppKey] &&
                _initialized[_activeAppKey][forMetric] &&
                _initialized[_activeAppKey][forMetric][_period];
    }

    /*
        Adds data for forMetric to _totalUserObjects object in below format
        { "APP_KEY": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
     */
    function setCalculatedObj(forMetric, data) {
        if (!_totalUserObjects[_activeAppKey]) {
            _totalUserObjects[_activeAppKey] = {};
        }

        if (!_totalUserObjects[_activeAppKey][forMetric]) {
            _totalUserObjects[_activeAppKey][forMetric] = {};
        }

        _totalUserObjects[_activeAppKey][forMetric][_period] = formatCalculatedObj(data, forMetric);
    }

    /*
        Response from the API is in [{"_id":"TR","u":1},{"_id":"UK","u":5}] format
        We convert it to {"TR": 1, "UK": 5} format in this function
        processingFunction is used for cases where keys are converted before being processed (e.g. device names)
     */
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