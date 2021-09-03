/*global
    jQuery,
    store
*/

(function(countlyAlerts, $) {
    
    countlyAlerts.RatingOptions = [
        {value: 1, label: jQuery.i18n.map["star.one-star"]},
        {value: 2, label: jQuery.i18n.map["star.two-star"]},
        {value: 3, label: jQuery.i18n.map["star.three-star"]},
        {value: 4, label: jQuery.i18n.map["star.four-star"]},
        {value: 5, label: jQuery.i18n.map["star.five-star"]},
    ];
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
            tableData: function (state) {
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
                    },
                    dataType: "json",
                }).then(function(data) {
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
            deleteOnlineUsersAlert: function(context, alertConfig) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/delete",
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "alertId": alertConfig._id,
                    },
                    dataType: "json",
                });
            },
            saveOnlineUsersAlert: function(context, alertConfig) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/save",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        "alert": JSON.stringify(alertConfig),
                    },
                    dataType: "json",
                }).then(function(data) {
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
                updateOnlineusersAlertStatus: function(context, status) {
                    return CV.$.ajax({
                        type: "post",
                        url: countlyCommon.API_PARTS.data.w + "/concurrent_alert/status",
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
                        },
                    }).then(function(data) {
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
                            /*eslint-disable */
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
                            /*eslint-enable */
                        }
                        
                    
                        if (countlyGlobal.plugins.indexOf("concurrent_users") < 0) {
                            context.commit("setAll", tableData);
                            context.commit("setCount", count);
                            return;
                        }
                        CV.$.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r, 
                            dataType: "json",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID,
                                method: "concurrent_alerts",
                                preventGlobalAbort: true,
                            },
                        }).then(function(list) {
                            for(var i = 0; i < list.length; i++) {
                                tableData.push({
                                    ...list[i],
                                    _id: list[i]._id,
                                    alertName: list[i].name,
                                    appNameList: countlyGlobal.apps[list[i].app].name,
                                    condtionText: list[i].condition_title,
                                    enabled: list[i].enabled,
                                    selectedApps: [list[i].app],
                                    alertDataType: "online-users",
                                    alertDataSubType: list[i].type,
                                    compareType: list[i].def,
                                    compareValue: list[i].users,
                                    compareValue2: list[i].minutes,
                                    alertValues: list[i].email,
                                 });

                            }
                            context.commit("setAll", tableData);
                            context.commit("setCount", count);
                        })

                        
                        

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