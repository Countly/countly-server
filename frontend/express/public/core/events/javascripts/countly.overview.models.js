/*global countlyVue, CV, countlyCommon, CountlyHelpers, Promise */
(function(countlyEventsOverview) {

    countlyEventsOverview.helpers = {
        getEventOverview: function(ob) {
            var eventsOverview = [];
            var totalEvents = {};
            totalEvents.name = CV.i18n("events.overview.total.events.count");
            totalEvents.value = ob.totalCount;
            var res = countlyCommon.getPercentChange(ob.prevTotalCount, ob.totalCount);
            totalEvents.change = res.percent;
            totalEvents.trend = res.trend;
            eventsOverview.push(totalEvents);
            var epu = {};
            epu.name = CV.i18n("events.overview.events.per.user");
            epu.value = ob.totalCount === 0 && ob.totalUsersCount === 0 ? 0 : Number((ob.totalCount / ob.totalUsersCount).toFixed(1));
            var prevEpu = ob.prevTotalCount === 0 && ob.prevUsersCount === 0 ? 0 : Number((ob.prevTotalCount / ob.prevUsersCount).toFixed(1));
            res = countlyCommon.getPercentChange(prevEpu, epu.value);
            epu.change = res.percent;
            epu.trend = res.trend;
            eventsOverview.push(epu);
            var epr = {};
            epr.name = CV.i18n("events.overview.events.per.session");
            epr.value = ob.totalCount === 0 && ob.totalSessionCount === 0 ? 0 : Number((ob.totalCount / ob.totalSessionCount).toFixed(1));
            var prevEpr = ob.prevTotalCount === 0 && ob.prevSessionCount === 0 ? 0 : Number((ob.prevTotalCount / ob.prevSessionCount).toFixed(1));
            res = countlyCommon.getPercentChange(prevEpr, epr.value);
            epr.change = res.percent;
            epr.trend = res.trend;
            eventsOverview.push(epr);
            return eventsOverview;
        },
        getTopEvents: function(ob, map) {
            var topEvents = [];
            if (ob.data && ob.data.length > 0) {
                var data = ob.data;
                for (var i = 0; i < ob.data.length; i++) {
                    var event = {};
                    event.name = countlyEventsOverview.helpers.getEventLongName(data[i].name, map);
                    event.value = countlyCommon.getShortNumber((data[i].count));
                    event.change = data[i].change;
                    event.trend = data[i].trend;
                    event.percentage = ob.totalCount === 0 ? 0 : ((data[i].count / ob.totalCount) * 100).toFixed(1);
                    topEvents.push(event);
                }
            }
            return topEvents;
        },
        getBarData: function(sparklines, eventProperty) {
            var obj = {};
            var grid = {};
            var yAxis = {};
            var legend = {};
            var tooltip = {};
            var series = [];
            var ob = {};
            ob.name = eventProperty;
            ob.data = sparklines;
            series.push(ob);
            grid.height = "100px";
            grid.top = "-25px";
            yAxis.show = false;
            legend.show = false;
            tooltip.show = false;
            obj.grid = grid;
            obj.yAxis = yAxis;
            obj.legend = legend;
            obj.tooltip = tooltip;
            obj.series = series;
            return obj;
        },
        formatPercentage: function(value) {
            return parseFloat((Math.round(value * 100)).toFixed(this.DECIMAL_PLACES));
        },
        getMonitorEvents: function(ob, context) {
            var monitorEvents = context.state.monitorEvents;
            var monitorData = [];
            if (monitorEvents && monitorEvents.overview) {
                for (var i = 0; i < monitorEvents.overview.length; i++) {
                    var obj = {};
                    var key = monitorEvents.overview[i].eventKey;
                    var eventProperty = monitorEvents.overview[i].eventProperty;
                    var data = ob[key];
                    var mapping = context.state.eventMapping[key];
                    if (data && data.data) {
                        var values = data.data[eventProperty];
                        obj.change = values.change;
                        obj["prev-total"] = values["prev-total"];
                        obj.sparkline = values.sparkline;
                        obj.barData = countlyEventsOverview.helpers.getBarData(obj.sparkline, eventProperty);
                        obj.total = countlyCommon.getShortNumber((values.total));
                        obj.trend = values.trend;
                        obj.eventProperty = mapping[eventProperty].toUpperCase();
                        obj.name = mapping.eventName;
                        monitorEvents.overview[i].propertyName = mapping[eventProperty];
                        monitorEvents.overview[i].eventName = mapping.eventName;
                        monitorData.push(obj);
                    }
                }
            }
            return monitorData;
        },
        getOverviewConfigureList: function(eventsList, groupList) {
            var map = eventsList.map || {};
            var allEvents = [];
            if (eventsList) {
                eventsList.list.forEach(function(item) {
                    if (!map[item] || (map[item] && (map[item].is_visible || map[item].is_visible === undefined))) {
                        var obj = {
                            "label": map[item] && map[item].name ? map[item].name : item,
                            "value": item
                        };
                        allEvents.push(obj);
                    }
                });
            }
            if (groupList) {
                groupList.forEach(function(item) {
                    if (item.status) {
                        var obj = {
                            "label": item.name,
                            "value": item._id
                        };
                        allEvents.push(obj);
                    }
                });
            }
            return allEvents;
        },
        getEventMapping: function(eventsList, groupList) {
            var map = eventsList.map || {};
            var mapping = {};
            if (eventsList) {
                eventsList.list.forEach(function(item) {
                    var obj = {
                        "eventKey": item,
                        "eventName": map[item] && map[item].name ? map[item].name : item,
                        "count": map[item] && map[item].count ? map[item].count : CV.i18n("events.overview.count"),
                        "sum": map[item] && map[item].sum ? map[item].sum : CV.i18n("events.overview.sum"),
                        "dur": map[item] && map[item].dur ? map[item].dur : CV.i18n("events.overview.dur"),
                        "group": false

                    };
                    mapping[item] = obj;
                });
            }
            if (groupList) {
                groupList.forEach(function(item) {
                    var obj = {
                        "eventKey": item._id,
                        "eventName": item.name,
                        "count": item.display_map.c ? item.display_map.c : CV.i18n("events.overview.count"),
                        "sum": item.display_map.s ? item.display_map.s : CV.i18n("events.overview.sum"),
                        "dur": item.display_map.d ? item.display_map.d : CV.i18n("events.overview.dur"),
                        "group": true
                    };
                    mapping[item._id] = obj;
                });
            }
            return mapping;
        },
        getEventProperties: function(context, selectedEventName) {
            var obj;
            if (selectedEventName.startsWith('[CLY]_group')) {
                context.state.overviewGroupData.every(function(item) {
                    if (item._id === selectedEventName) {
                        obj = [
                            {
                                "label": item.display_map.c ? item.display_map.c : CV.i18n("events.overview.count"),
                                "value": "count"
                            },
                            {
                                "label": item.display_map.s ? item.display_map.s : CV.i18n("events.overview.sum"),
                                "value": "sum"
                            },
                            {
                                "label": item.display_map.d ? item.display_map.d : CV.i18n("events.overview.duration"),
                                "value": "dur"
                            }
                        ];
                    }
                    return true;
                });
            }
            else {
                obj = [
                    {
                        "label": context.state.monitorEvents.map[selectedEventName] ? context.state.monitorEvents.map[selectedEventName].count : CV.i18n("events.overview.count"),
                        "value": "count"
                    },
                    {
                        "label": context.state.monitorEvents.map[selectedEventName] ? context.state.monitorEvents.map[selectedEventName].sum : CV.i18n("events.overview.sum"),
                        "value": "sum"
                    },
                    {
                        "label": context.state.monitorEvents.map[selectedEventName] ? context.state.monitorEvents.map[selectedEventName].dur : CV.i18n("events.overview.duration"),
                        "value": "dur"
                    }
                ];
            }
            return obj;
        },
        getConfigureOverview: function(context) {
            return context.state.monitorEvents.overview ? context.state.monitorEvents.overview.slice() : [];
        },
        getTableRows: function(data, map) {
            if (data && data.length > 0) {
                return data.map(function(item) {
                    return {
                        "count": countlyCommon.formatNumber(item.count),
                        "sum": countlyCommon.formatNumber(item.sum),
                        "duration": countlyCommon.formatNumber(item.duration),
                        "name": countlyEventsOverview.helpers.getEventLongName(item.name, map)
                    };
                });
            }
            return [];
        },
        getEventLongName: function(eventKey, eventMap) {
            var mapKey = eventKey.replace("\\", "\\\\").replace("\$", "\\u0024").replace(".", "\\u002e");
            if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
                return eventMap[mapKey].name;
            }
            else {
                return eventKey;
            }
        },
    };

    countlyEventsOverview.service = {
        fetchAllEvents: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: "get_events",
                }
            });
        },
        fetchEvents: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "top_events",
                    "period": "30days"
                },
                dataType: "json",
            });
        },
        fetchGroupData: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_event_groups",
                    "preventRequestAbort": true
                },
                dataType: "json",
            });
        },
        fetchTopEvents: function(filter, limit) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "top_events",
                    "period": "30days",
                    "filter": filter,
                    "limit": limit
                },
                dataType: "json",
            }, {"disableAutoCatch": true});//to be able to see if discarded
        },
        fetchMonitorEvents: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events",
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(context.state.selectedDatePeriod),
                    "preventRequestAbort": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});//to be able to see if discarded
        },
        fetchMonitorEventsData: function(my_events, context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "events": JSON.stringify(my_events),
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(context.state.selectedDatePeriod),
                    "timestamp": new Date().getTime(),
                    "overview": true
                },
                dataType: "json",
            });
        },
        fetchEditMap: function(event_overview) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/events/edit_map",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "event_map": "",
                    "event_order": "",
                    "event_overview": JSON.stringify(event_overview),
                    "omitted_segments": ""
                },
                dataType: "json",
            });
        }
    };

    countlyEventsOverview.getVuexModule = function() {

        var getInitialState = function() {
            return {
                eventsOverview: [],
                detailEvents: {},
                topEvents: [],
                monitorEvents: {},
                monitorEventsData: [],
                selectedDatePeriod: countlyCommon.getPeriod(),
                configureEventsList: [],
                overviewGroupData: [],
                configureOverview: [],
                eventMapping: {},
                tableRows: [],
                eventProperties: [{
                    "label": CV.i18n("events.overview.count"),
                    "value": "count"
                },
                {
                    "label": CV.i18n("events.overview.sum"),
                    "value": "sum"
                },
                {
                    "label": CV.i18n("events.overview.duration"),
                    "value": "dur"
                }
                ],
            };
        };

        var eventsOverviewActions = {
            fetchEventsOverview: function(context) {
                return countlyEventsOverview.service.fetchMonitorEvents(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setMonitorEvents", res || {});
                            var events = [];
                            if (res && res.overview) {
                                context.commit("setConfigureOverview", res.overview.slice());
                                for (var i = 0; i < res.overview.length; i++) {
                                    events.push(res.overview[i].eventKey);
                                }
                            }
                            countlyEventsOverview.service.fetchGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setOverviewGroupData", result);
                                        context.commit("setConfigureEventsList", countlyEventsOverview.helpers.getOverviewConfigureList(res, result));
                                        context.commit("setEventMapping", countlyEventsOverview.helpers.getEventMapping(res, result));
                                        countlyEventsOverview.service.fetchMonitorEventsData(events, context)
                                            .then(function(response) {
                                                if (response) {
                                                    return context.commit("setMonitorEventsData", countlyEventsOverview.helpers.getMonitorEvents(response, context) || []);
                                                }
                                            });
                                    }
                                });
                            countlyEventsOverview.service.fetchTopEvents("count", 3)
                                .then(function(resp) {
                                    if (resp) {
                                        return context.commit("setTopEvents", countlyEventsOverview.helpers.getTopEvents(resp, res.map) || []);

                                    }
                                }).catch(function(/*error*/) {
                                    //catched error. Could be duplicate warning.
                                    //return Promise.reject(error);
                                });
                            countlyEventsOverview.service.fetchEvents()
                                .then(function(response) {
                                    if (response) {
                                        context.commit("setDetailEvents", response || {});
                                        context.commit("setEventOverview", countlyEventsOverview.helpers.getEventOverview(response) || []);
                                        context.commit("setTableRows", countlyEventsOverview.helpers.getTableRows(response.data, res.map) || []);
                                        return;
                                    }
                                });
                        }
                    }).catch(function(/*error*/) {
                        //catched error. Could be duplicate warning.
                        //return Promise.reject(error);
                    });
            },
            fetchTopEvents: function(context, count) {
                return countlyEventsOverview.service.fetchMonitorEvents(context).then(function(res) {
                    if (res) {
                        return countlyEventsOverview.service.fetchTopEvents("count", count).then(function(resp) {
                            if (resp) {
                                return context.commit("setTopEvents", countlyEventsOverview.helpers.getTopEvents(resp, res.map) || []);
                            }
                        }).catch(function(error) {
                            return Promise.reject(error);
                        });
                    }
                }).catch(function(error) {
                    return Promise.reject(error);
                });
            },
            fetchMonitorEvents: function(context) {
                return countlyEventsOverview.service.fetchMonitorEvents(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setMonitorEvents", res || {});
                            var events = [];
                            if (res && res.overview) {
                                context.commit("setConfigureOverview", res.overview.slice());
                                for (var i = 0; i < res.overview.length; i++) {
                                    events.push(res.overview[i].eventKey);
                                }
                            }
                            countlyEventsOverview.service.fetchGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setOverviewGroupData", result);
                                        context.commit("setConfigureEventsList", countlyEventsOverview.helpers.getOverviewConfigureList(res, result));
                                        context.commit("setEventMapping", countlyEventsOverview.helpers.getEventMapping(res, result));
                                        countlyEventsOverview.service.fetchMonitorEventsData(events, context)
                                            .then(function(response) {
                                                if (response) {
                                                    return context.commit("setMonitorEventsData", countlyEventsOverview.helpers.getMonitorEvents(response, context) || []);
                                                }
                                            });
                                    }
                                });
                        }
                    }).catch(function(error) {
                        return Promise.reject(error);
                    });
            },
            fetchSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            fetchEventProperties: function(context, selectedEvent) {
                context.commit("setEventProperties", countlyEventsOverview.helpers.getEventProperties(context, selectedEvent));
            },
            fetchConfigureOverview: function(context) {
                context.commit("setConfigureOverview", countlyEventsOverview.helpers.getConfigureOverview(context));
            },
            fetchEditMap: function(context, payload) {
                return countlyEventsOverview.service.fetchEditMap(payload)
                    .then(function(res) {
                        if (res) {
                            context.dispatch("fetchMonitorEvents");
                        }
                    });
            }

        };

        var eventsOverviewMutations = {
            setDetailEvents: function(state, value) {
                state.detailEvents = value;
            },
            setTableRows: function(state, value) {
                state.tableRows = value;
            },
            setEventOverview: function(state, value) {
                state.eventsOverview = value;
            },
            setConfigureOverview: function(state, value) {
                state.configureOverview = value;
            },
            setTopEvents: function(state, value) {
                state.topEvents = value;
            },
            setMonitorEvents: function(state, value) {
                state.monitorEvents = value;
            },
            setMonitorEventsData: function(state, value) {
                state.monitorEventsData = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
            },
            setOverviewGroupData: function(state, value) {
                state.overviewGroupData = value;
            },
            setConfigureEventsList: function(state, value) {
                state.configureEventsList = value;
            },
            setEventProperties: function(state, value) {
                state.eventProperties = value;
            },
            setEventMapping: function(state, value) {
                state.eventMapping = value;
            }
        };
        var eventsOverviewGetters = {
            detailEvents: function(_state) {
                return _state.detailEvents;
            },
            eventsOverview: function(_state) {
                return _state.eventsOverview;
            },
            topEvents: function(_state) {
                return _state.topEvents;
            },
            monitorEvents: function(_state) {
                return _state.monitorEvents;
            },
            monitorEventsData: function(_state) {
                return _state.monitorEventsData;
            },
            selectedDatePeriod: function(_state) {
                return _state.selectedDatePeriod;
            },
            configureEventsList: function(_state) {
                return _state.configureEventsList;
            },
            overviewGroupData: function(_state) {
                return _state.overviewGroupData;
            },
            eventProperties: function(_state) {
                return _state.eventProperties;
            },
            configureOverview: function(_state) {
                return _state.configureOverview;
            },
            eventMapping: function(_state) {
                return _state.eventMapping;
            },
            tableRows: function(_state) {
                return _state.tableRows;
            }
        };
        return countlyVue.vuex.Module("countlyEventsOverview", {
            state: getInitialState,
            actions: eventsOverviewActions,
            mutations: eventsOverviewMutations,
            getters: eventsOverviewGetters,
        });
    };
}(window.countlyEventsOverview = window.countlyEventsOverview || {}));