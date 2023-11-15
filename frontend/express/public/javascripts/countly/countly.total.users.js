/* global countlyCommon, countlyGlobal, _, jQuery */
(function(countlyTotalUsers, $) {

    //Private Properties
    var _activeAppId = 0,
        _initialized = {},
        _period = null,
        _totalUserObjects = {},
        _isEstimate = {};

    //Public Methods
    countlyTotalUsers.initialize = function(forMetric) {
        _period = countlyCommon.getPeriodForAjax();
        _activeAppId = countlyCommon.ACTIVE_APP_ID;

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
        if (_period === "hour") {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": _activeAppId,
                    "method": "total_users",
                    "metric": forMetric,
                    "period": _period
                },
                dataType: "json",
                success: function(json) {
                    setCalculatedObj(forMetric, json.totalUsersObj);
                    setRefreshObj(forMetric, json.totalUsersObj);
                    setIsEstimate(forMetric, json.isEstimate);
                }
            });
        }
        else {
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": _activeAppId,
                        "method": "total_users",
                        "metric": forMetric,
                        "period": _period
                    },
                    dataType: "json",
                    success: function(json) {
                        setCalculatedObj(forMetric, json.totalUsersObj);
                        setIsEstimate(forMetric, json.isEstimate);
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "total_users",
                        "metric": forMetric,
                        "period": "hour"
                    },
                    dataType: "json",
                    success: function(json) {
                        setRefreshObj(forMetric, json.totalUsersObj);
                    }
                })
            ).then(function() {
                return true;
            });
        }
    };

    countlyTotalUsers.refresh = function(forMetric) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "total_users",
                "metric": forMetric,
                "period": "hour",
                "action": "refresh",
                "_dt": Date.now()
            },
            dataType: "json",
            success: function(todaysJson) {
                refreshData(forMetric, todaysJson.totalUsersObj);
                //setIsEstimate(forMetric, todaysJson.isEstimate);
            }
        });
    };

    countlyTotalUsers.get = function(forMetric, prev) {
        if (_totalUserObjects[_activeAppId] && _totalUserObjects[_activeAppId][forMetric]) {
            if (prev) {
                return _totalUserObjects[_activeAppId][forMetric]["prev_" + _period] || {};
            }
            return _totalUserObjects[_activeAppId][forMetric][_period] || {};
        }
        else {
            return {};
        }
    };

    /*
        Total user override can only be used if selected period contains today
        unless overwritten by plugin
        API returns empty object if requested date doesn't contain today
     */
    countlyTotalUsers.isUsable = function() {
        if (countlyGlobal.plugins.indexOf("drill") !== -1) {
            return true;
        }
        return countlyCommon.periodObj.periodContainsToday;
    };

    countlyTotalUsers.isEstimate = function(forMetric) {
        return _isEstimate[_activeAppId] && _isEstimate[_activeAppId][forMetric] && _isEstimate[_activeAppId][forMetric][_period];
    };

    /**Sets init status for forMetric in below format
     * { "APP_KEY": { "countries": { "60days": true } } }
     * We don't directly use _totalUserObjects for init check because it is init after AJAX and might take time
     * @param {string} forMetric   - metric for which set init status
     */
    function setInit(forMetric) {
        if (!_initialized[_activeAppId]) {
            _initialized[_activeAppId] = {};
        }

        if (!_initialized[_activeAppId][forMetric]) {
            _initialized[_activeAppId][forMetric] = {};
        }

        _initialized[_activeAppId][forMetric][_period] = true;
    }

    /** function checks if metric is initialized
     * @param {string} forMetric - metric name to check
     * @returns {boolean} if initialized
     */
    function isInitialized(forMetric) {
        return _initialized[_activeAppId] &&
                _initialized[_activeAppId][forMetric] &&
                _initialized[_activeAppId][forMetric][_period];
    }

    /** Sets isEstimate status for forMetric in below format
     * { "APP_KEY": { "countries": { "60days": true } } }
     * @param {string} forMetric   - metric for which set init status
     * @param {boolean} isEstimate - is estimate
    */
    function setIsEstimate(forMetric, isEstimate) {
        if (!_isEstimate[_activeAppId]) {
            _isEstimate[_activeAppId] = {};
        }
        if (!_isEstimate[_activeAppId][forMetric]) {
            _isEstimate[_activeAppId][forMetric] = {};
        }
        _isEstimate[_activeAppId][forMetric][_period] = isEstimate;
    }

    /** Adds data for forMetric to _totalUserObjects object in below format
     *   { "APP_ID": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} data  - data to set
     */
    function setCalculatedObj(forMetric, data) {
        if (!_totalUserObjects[_activeAppId]) {
            _totalUserObjects[_activeAppId] = {};
        }

        if (!_totalUserObjects[_activeAppId][forMetric]) {
            _totalUserObjects[_activeAppId][forMetric] = {};
        }

        _totalUserObjects[_activeAppId][forMetric][_period] = formatCalculatedObj(data, forMetric);
        _totalUserObjects[_activeAppId][forMetric]["prev_" + _period] = formatCalculatedObj(data, forMetric, true);
    }

    /** sets refresh  obj for metric
     *   { "APP_KEY": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} data  - data to set
     */
    function setRefreshObj(forMetric, data) {
        if (!_totalUserObjects[_activeAppId]) {
            _totalUserObjects[_activeAppId] = {};
        }

        if (!_totalUserObjects[_activeAppId][forMetric]) {
            _totalUserObjects[_activeAppId][forMetric] = {};
        }

        _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = formatCalculatedObj(data, forMetric);
    }

    /** Response from the API is in [{"_id":"TR","u":1},{"_id":"UK","u":5}] format
     *  We convert it to {"TR": 1, "UK": 5} format in this function
     *  processingFunction is used for cases where keys are converted before being processed (e.g. device names)
     * @param {object} obj - data object
     * @param {string} forMetric - metric name
     * @param {boolean} prev - get data for previous period
     * @returns {object} converted object
     */
    function formatCalculatedObj(obj, forMetric, prev) {
        var tmpObj = {},
            processingFunction;

        // no need to format current metrics, as we are matching them in unformated way
        /*switch (forMetric) {
        case "devices":
            processingFunction = countlyDevice.getDeviceFullName;
            break;
        }*/

        for (var i = 0; i < obj.length; i++) {
            var tmpKey = (processingFunction) ? processingFunction(obj[i]._id) : obj[i]._id;

            if (prev) {
                tmpObj[tmpKey] = obj[i].pu || 0;
            }
            else {
                tmpObj[tmpKey] = obj[i].u || 0;
            }
        }

        return tmpObj;
    }

    /** Refreshes data based the diff between current "refresh" and the new one retrieved from the API
     *  { "APP_KEY": { "countries": { "30days_refresh": {"TR": 1, "UK": 5} } } }
     * @param {string} forMetric - metric name
     * @param {object} todaysJson - data
     */
    function refreshData(forMetric, todaysJson) {
        if (_totalUserObjects[_activeAppId] &&
            _totalUserObjects[_activeAppId][forMetric] &&
            _totalUserObjects[_activeAppId][forMetric][_period] &&
            _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"]) {

            var currObj = _totalUserObjects[_activeAppId][forMetric][_period],
                currRefreshObj = _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"],
                newRefreshObj = formatCalculatedObj(todaysJson, forMetric);

            _.each(newRefreshObj, function(value, key) {
                if (typeof currRefreshObj[key] !== "undefined") {
                    // If existing refresh object contains the key we refresh the value
                    // in total user object to curr value + new refresh value - curr refresh value
                    currObj[key] += value - currRefreshObj[key];
                }
                else {
                    // Total user object doesn't have this key so we just add it
                    currObj[key] = value;
                }
            });

            // Both total user obj and refresh object is changed, update our var
            _totalUserObjects[_activeAppId][forMetric][_period] = currObj;
            _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = newRefreshObj;
        }
    }

    // Triggered when app data is cleared
    $(document).on("/i/apps/reset", function(event, args) {
        delete _totalUserObjects[args.app_id];
        delete _initialized[args.app_id];
    });

    // Triggered when app is deleted
    $(document).on("/i/apps/delete", function(event, args) {
        delete _totalUserObjects[args.app_id];
        delete _initialized[args.app_id];
    });

}(window.countlyTotalUsers = window.countlyTotalUsers || {}, jQuery));