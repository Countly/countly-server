/*global
    jQuery,
    store
*/

(function(countlyAlerts, $) {
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
    countlyAlerts.saveAlert = function saveAlert(alertConfig, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/alert/save",
            data: {
                "alert_config": JSON.stringify(alertConfig),
                "app_id": alertConfig.selectedApps[0]
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
    countlyAlerts.requestAlertsList = function requestAlertsList(callback) {
        var dfd = jQuery.Deferred();
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/alert/list',
            data: {
                app_id: store.get('countly_active_app')
            },
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

    countlyAlerts.getAlertsList = function getAlertsList() {
        return _alertsList;
    };
    countlyAlerts.getCount = function getCount() {
        return _count;
    };

    countlyAlerts.getAlert = function getAlert(alertID) {
        for (var i = 0; i < _alertsList.length; i++) {
            if (_alertsList[i]._id === alertID) {
                return _alertsList[i];
            }
        }
    };

    countlyAlerts.deleteAlert = function deleteAlert(alertID, appId, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/alert/delete",
            data: {
                "alertID": alertID,
                "app_id": appId
            },
            dataType: "json",
            success: function(res) {
                if (callback) {
                    callback(res);
                }
            }
        });

    };

    countlyAlerts.updateAlertStatus = function deleteAlert(status, appId, callback) {
        $.ajax({
            type: "post",
            url: countlyCommon.API_PARTS.data.w + "/alert/status",
            data: {
                "status": JSON.stringify(status),
                "app_id": appId
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

    countlyAlerts.getEventName = function(eventId, callback) {
        var eventKey = eventId.split("***")[1],
            appId = eventId.split("***")[0],
            results = [];

        $.when(getEventsDfd(appId, results)).then(function() {
            callback(getEventLongName(eventKey, (results[0].map) ? results[0].map : null));
        });
    };

    countlyAlerts.getEventsForApps = function(appId, callback) {
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

    countlyAlerts.getViewForApp = function(appId, callback) {
        if (!appId) {
            callback([]);
            return;
        }
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": appId,
                "method": "views",
                "action": "getTable",
            },
            dataType: "json",
            success: function(res) {
                if (res && res.aaData && res.aaData.length > 0 && callback) {
                    var data = [];
                    for (var i = 0; i < res.aaData.length; i++) {
                        data.push({
                            value: res.aaData[i]._id,
                            name: res.aaData[i].view
                        });
                    }
                    callback(data);
                }
            }
        });
    };

    countlyAlerts.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                tableData: [],
            };
        };

        var getters = {
            tableData(state) {
                return state.tableData;
            }
        };

        var mutations = {
            setTableData: function (state, list) {
                state.tableData = list;
            }
        };

        var actions = {
            initialize: function(context) {
                context.dispatch("refresh");
            },
            refresh: function(context) {
                context.dispatch("countlyAlerts/table/fetchAll", null, {root: true});
            },
            saveAlert: function(context, alertConfig) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/alert/save",
                    data: {
                        "alert_config": JSON.stringify(alertConfig),
                        "app_id": alertConfig.selectedApps[0]
                    },
                    dataType: "json",
                }).then(function(data) {
                    console.log(data,"!!!");
                });
            },
            deleteAlert: function(context, alertID) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/alert/delete",
                    data: {
                        "alertID": alertID,
                    },
                    dataType: "json",
                });
            },
        }

        var tableResource = countlyVue.vuex.Module("table", {
            state: function() {
                return {
                    all: [],
                    count: {
                        t: 0,
                        r: 0,
                        today: 0,
                    },
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                count: function(state) {
                    return state.count;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setCount: function(state, val) {
                    state.count = val;
                }
            },
            actions: {
                updateStatus: function(context, status) {
                    return CV.$.ajax({
                        type: "post",
                        url: countlyCommon.API_PARTS.data.w + "/alert/status",
                        data: {
                            "status": JSON.stringify(status),
                        },
                        dataType: "json",
                    })
                },
              
                fetchAll: function(context) {
                    return CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/alert/list",
                        dataType: "json",
                        data: {
                            preventGlobalAbort: true,
                            "app_id": countlyCommon.ACTIVE_APP_ID
                        },
                    },).then(function(data) {
                        var alertsList = data.alertsList;
                        var count = data.count;

                        var tableData = [];
                        for (var i = 0; i < alertsList.length; i++) {
                            var appNameList = [];
                            if (alertsList[i].selectedApps) {
                                appNameList = _.map(alertsList[i].selectedApps, function(appID) {
                                    if (appID === "all-apps") {
                                        return "All apps";
                                    }
                                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                                });
                            }
                            tableData.push({
                                ...alertsList[i],
                                _id: alertsList[i]._id,
                                app_id: alertsList[i].selectedApps[0],
                                appNameList: appNameList.join(', '),
                                alertName: alertsList[i].alertName || '',
                                type: alertsList[i].alertDataSubType || '',
                                condtionText: alertsList[i].compareDescribe || '',
                                enabled: alertsList[i].enabled || false,
                                createdByUser: alertsList[i].createdByUser || ''
                            });
                        }
                        context.commit("setAll", tableData);
                        context.commit("setCount", count);

                    });
                },
            }
        });
        return countlyVue.vuex.Module("countlyAlerts", {
            resetFn: getEmptyState,
            getters: getters,
            actions: actions,
            mutations: mutations,
            submodules: [tableResource]
        });
    };

    countlyAlerts.defaultDrawerConfigValue = function () {
        return {
            _id: null,
            alertName: null,
            alertDataType: "metric",
            alertDataSubType: null,
            alertDataSubType2: null,
            compareType: null,
            compareValue: null,
            selectedApps:[""],

            period: "every 1 hour on the 59th min",
            alertBy: "email",
            enabled: true,
            compareDescribe: '',
            alertValues: [],    
        }
    }
}(window.countlyAlerts = window.countlyAlerts || {}, jQuery));