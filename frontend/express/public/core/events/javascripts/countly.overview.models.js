/*global countlyVue, CV, countlyCommon, CountlyHelpers */
(function(countlyEventsOverview) {

    countlyEventsOverview.helpers = {
        decode: function(str) {
            if (typeof str === 'string') {
                return str.replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=');
            }
            return str;
        },
        encode: function(str) {
            return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/<=/g, "&le;").replace(/>=/g, "&ge;");
        },
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
                    var eventKey = countlyEventsOverview.helpers.decode(data[i].name);
                    event.key = eventKey;
                    event.name = countlyEventsOverview.helpers.getEventLongName(eventKey, map);
                    event.value = countlyCommon.formatNumber((data[i].count));
                    event.change = data[i].change;
                    event.trend = data[i].trend;
                    event.tooltip = countlyEventsOverview.helpers.getEventLongName(data[i].name, map);
                    event.percentage = ob.totalCount === 0 ? 0 : ((data[i].count / ob.totalCount) * 100).toFixed(1);
                    topEvents.push(event);
                }
            }
            return topEvents;
        },
        getBarData: function(sparklines, eventProperty) {
            var obj = {};
            var yAxis = {
                show: true,
                splitNumber: 1,
                minInterval: 1,
                position: "right"
            };
            var series = [];
            var ob = {};
            ob.name = eventProperty;
            ob.data = sparklines;
            series.push(ob);
            obj.yAxis = yAxis;
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
                        obj.total = values.total;
                        obj.trend = values.trend;
                        obj.eventProperty = mapping[eventProperty].toUpperCase();
                        obj.name = mapping.eventName;
                        obj.eventKey = key;
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
            if (eventsList && eventsList.list) {
                eventsList.list.forEach(function(item) {
                    if (!map[item] || (map[item] && (map[item].is_visible || map[item].is_visible === undefined))) {
                        var label;
                        if (map[item] && map[item].name && typeof map[item].name === 'string') {
                            label = countlyEventsOverview.helpers.decode(map[item].name);
                        }
                        if (item && typeof item === 'string') {
                            item = countlyEventsOverview.helpers.decode(item);
                        }
                        var obj = {
                            "label": map[item] && map[item].name ? label : item,
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
                            "label": countlyEventsOverview.helpers.decode(item.name),
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
            if (eventsList && eventsList.list) {
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
            var tableRows = [];
            if (data && data.length > 0) {
                data.forEach(function(item) {
                    var eventKey;
                    if (map) {
                        if (!map[item.name] || (map[item.name] && (map[item.name].is_visible || map[item.name].is_visible === undefined))) {
                            eventKey = countlyEventsOverview.helpers.decode(item.name);
                            if (map[item] && map[item].name && typeof map[item].name === 'string') {
                                eventKey = countlyEventsOverview.helpers.decode(map[item].name);
                            }
                            tableRows.push({
                                "count": item.count,
                                "sum": item.sum,
                                "duration": item.duration,
                                "key": eventKey,
                                "name": countlyEventsOverview.helpers.getEventLongName(eventKey, map)
                            });
                        }
                    }
                    else {
                        eventKey = countlyEventsOverview.helpers.decode(item.name);
                        tableRows.push({
                            "count": item.count,
                            "sum": item.sum,
                            "duration": item.duration,
                            "key": eventKey,
                            "name": countlyEventsOverview.helpers.getEventLongName(eventKey, map)
                        });
                    }
                });
            }
            return tableRows;
        },
        getEventLongName: function(eventKey, eventMap) {
            var mapKey = eventKey.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, "\\u002e");
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
        fetchMonitorEvents: function(context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events",
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
                    "preventRequestAbort": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});//to be able to see if discarded
        },
        fetchMonitorEventsData: function(my_events, context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "events": JSON.stringify(my_events),
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
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
                isMonitorEventsLoading: true,
                isTableLoading: true
            };
        };

        var eventsOverviewActions = {
            fetchEventsOverview: function(context) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyEventsOverview.service.fetchMonitorEvents(context, period)
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
                                        countlyEventsOverview.service.fetchMonitorEventsData(events, context, period)
                                            .then(function(response) {
                                                context.dispatch("setMonitorEventsLoading", false);
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
                                    context.dispatch("setTableLoading", false);
                                    if (response) {
                                        context.commit("setDetailEvents", response || {});
                                        context.commit("setEventOverview", countlyEventsOverview.helpers.getEventOverview(response) || []);
                                        context.commit("setTableRows", countlyEventsOverview.helpers.getTableRows(response.data, res.map) || []);
                                        return;
                                    }
                                });
                        }
                    }).catch(function(/*error*/) {
                        context.dispatch("setTableLoading", false);
                        context.dispatch("setMonitorEventsLoading", false);
                        //catched error. Could be duplicate warning.
                        //return Promise.reject(error);
                    });
            },
            fetchTopEvents: function(context, count) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyEventsOverview.service.fetchMonitorEvents(context, period).then(function(res) {
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
                var period = context.rootGetters["countlyCommon/period"];
                return countlyEventsOverview.service.fetchMonitorEvents(context, period)
                    .then(function(res) {
                        if (res) {
                            context.commit("setMonitorEvents", res || {});
                            var events = [];
                            if (res && res.overview) {
                                context.commit("setConfigureOverview", res.overview.slice());
                                for (var i = 0; i < res.overview.length; i++) {
                                    events.push(countlyEventsOverview.helpers.decode(res.overview[i].eventKey));
                                }
                            }
                            countlyEventsOverview.service.fetchGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setOverviewGroupData", result);
                                        context.commit("setConfigureEventsList", countlyEventsOverview.helpers.getOverviewConfigureList(res, result));
                                        context.commit("setEventMapping", countlyEventsOverview.helpers.getEventMapping(res, result));
                                        countlyEventsOverview.service.fetchMonitorEventsData(events, context, period)
                                            .then(function(response) {
                                                context.dispatch("setMonitorEventsLoading", false);

                                                if (response) {
                                                    return context.commit("setMonitorEventsData", countlyEventsOverview.helpers.getMonitorEvents(response, context) || []);
                                                }
                                            });
                                    }
                                });
                        }
                    }).catch(function(error) {
                        context.dispatch("setMonitorEventsLoading", false);
                        return Promise.reject(error);
                    });
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
            },
            setMonitorEventsLoading: function(context, value) {
                context.commit("setMonitorEventsLoading", value);
            },
            setTableLoading: function(context, value) {
                context.commit("setTableLoading", value);
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
            },
            setMonitorEventsLoading: function(state, value) {
                state.isMonitorEventsLoading = value;
            },
            setTableLoading: function(state, value) {
                state.isTableLoading = value;
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
            },
            isMonitorEventsLoading: function(_state) {
                return _state.isMonitorEventsLoading;
            },
            isTableLoading: function(_state) {
                return _state.isTableLoading;
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