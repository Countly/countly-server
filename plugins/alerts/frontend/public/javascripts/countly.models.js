/*global
    jQuery
 */

(function(alertsPlugin, $) {
    var _alertsList = {};
    var eventMaps = {};
    var _count = {};
    var countlyCommon = window.countlyCommon;
    var _ = window._;
    /**
	* Save alert settings
    * @param {object} alertConfig - alertConfig record
    * @param {function} callback - callback function
	*/
    alertsPlugin.saveAlert = function saveAlert(alertConfig, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/alert/save",
            data: {
                "alert_config": JSON.stringify(alertConfig)
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };

    /**
	* request alert list
    * @param {function} callback - callback function
    * @returns {function} promise
	*/
    alertsPlugin.requestAlertsList = function requestAlertsList(callback) {
        var dfd = jQuery.Deferred();
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/alert/list',
            data: {},
            dataType: "json",
            success: function(data) {
                _alertsList = data.alertsList;
                _count = data.count;
                if (callback) {
                    callback();
                }
                dfd.resolve();
            }
        });

        return dfd.promise();
    };

    alertsPlugin.getAlertsList = function getAlertsList() {
        return _alertsList;
    };
    alertsPlugin.getCount = function getCount() {
        return _count;
    };

    alertsPlugin.getAlert = function getAlert(alertID) {
        for (var i = 0; i < _alertsList.length; i++) {
            if (_alertsList[i]._id === alertID) {
                return _alertsList[i];
            }
        }
    };

    alertsPlugin.deleteAlert = function deleteAlert(alertID, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/alert/delete",
            data: {
                "alertID": alertID
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });

    };

    alertsPlugin.updateAlertStatus = function deleteAlert(status, callback) {
        $.ajax({
            type: "post",
            url: countlyCommon.API_PARTS.data.w + "/alert/status",
            data: {
                "status": JSON.stringify(status)
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });
    };


    /**
	* extract event name & value
    * @param {array} data - original event list
    * @param {array} returnArray - target format
	*/
    function extractEvents(data, returnArray) {
        var eventData = (_.isArray(data)) ? data[0] : data;
        if (eventData && eventData.list) {
            for (var i = 0; i < eventData.list.length; i++) {
                // var eventNamePostfix = " (" + countlyGlobal.apps[eventData._id].name + ")";
                returnArray.push({
                    value: eventData.list[i],
                    name: getEventLongName(eventData.list[i], eventData.map)
                });
            }
        }
    }

    /**
	* extract getEventLongName
    * @param {string} eventKey - event key in db
    * @param {object} eventMap - for caching
    * @return {string} eventKey - return event parsed key name
	*/
    function getEventLongName(eventKey, eventMap) {
        var mapKey = eventKey.replace("\\", "\\\\").replace('$', "\\u0024").replace(".", "\\u002e");
        if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
            return eventMap[mapKey].name;
        }
        else {
            return eventKey;
        }
    }
    /**
	* get event definition
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
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": appId,
                    "method": "get_events"
                },
                dataType: "json",
                success: function(data) {
                    if (data && data._id) {
                        eventMaps[data._id] = data;
                    }
                    results.push(data);
                    dfd.resolve();
                }
            });
        }

        return dfd.promise();
    }

    alertsPlugin.getEventName = function(eventId, callback) {
        var eventKey = eventId.split("***")[1],
            appId = eventId.split("***")[0],
            results = [];

        $.when(getEventsDfd(appId, results)).then(function() {
            callback(getEventLongName(eventKey, (results[0].map) ? results[0].map : null));
        });
    };

    alertsPlugin.getEventsForApps = function(appId, callback) {
        if (!appId) {
            callback([]);
            return;
        }
        var results = [];
        var ret = [];
        getEventsDfd(appId, results).then(function() {
            extractEvents(results, ret);
            callback(ret);
        });
    };

    alertsPlugin.getViewForApp = function(appId, callback) {
        if (!appId) {
            callback([]);
            return;
        }
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": appId,
                "method": "views"
            },
            dataType: "json",
            success: function(res) {
                if (res && res.meta && res.meta.views && callback) {
                    var data = [];
                    for (var i = 0; i < res.meta.views.length; i++) {
                        data.push({
                            value: res.meta.views[i],
                            name: res.meta.views[i]
                        });
                    }
                    callback(data);
                }
            }
        });
    };
}(window.alertsPlugin = window.alertsPlugin || {}, jQuery));