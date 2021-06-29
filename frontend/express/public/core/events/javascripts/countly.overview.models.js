/*global window, countlyVue, CV, countlyCommon */
(function(countlyEventsOverview) {

    countlyEventsOverview.helpers = {
        getEventOverview: function(ob) {
            var eventsOverview = [];
            var totalEvents = {};
            totalEvents["name"] = "Total Events";
            totalEvents["value"] = ob.totalCount;
            var res = countlyCommon.getPercentChange(ob.prevTotalCount, ob.totalCount);
            totalEvents["change"] = res.percent;
            totalEvents["trend"] = res.trend;
            eventsOverview.push(totalEvents);
            var epr = {};
            epr["name"] = "Events Per Session";
            epr["value"] = countlyCommon.getShortNumber((ob.totalCount / ob.totalSessionCount).toFixed(1));
            res = countlyCommon.getPercentChange(countlyCommon.getShortNumber((ob.prevTotalCount / ob.prevSessionCount).toFixed(1)), countlyCommon.getShortNumber((ob.totalCount / ob.totalSessionCount).toFixed(1)));
            epr["change"] = res.percent;
            epr["trend"] = res.trend;
            eventsOverview.push(epr);
            return eventsOverview;
        },
        getTopEvents: function(ob) {
            var topEvents = [];
            if (ob.data && ob.data.length > 0) {
                var data = ob.data;
                for (var i = 0; i < ob.data.length; i++) {
                    var event = {};
                    event["name"] = data[i].name;
                    event["value"] = countlyCommon.getShortNumber((data[i].count));
                    event["change"] = data[i].change;
                    event["trend"] = data[i].trend;
                    event["percentage"] = ((data[i].count / ob.totalCount) * 100).toFixed(1);
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
            ob["name"] = eventProperty;
            ob["data"] = sparklines;
            series.push(ob);
            grid["height"] = "100px";
            grid["top"] = "-25px";
            yAxis["show"] = false;
            legend["show"] = false;
            tooltip["show"] = false;
            obj["grid"] = grid;
            obj["yAxis"] = yAxis;
            obj["legend"] = legend;
            obj["tooltip"] = tooltip;
            obj["series"] = series;
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
                    if (data && data.data) {
                        var values = data["data"][eventProperty];
                        obj["change"] = values["change"];
                        obj["prev-total"] = values["prev-total"];
                        obj["sparkline"] = values["sparkline"];
                        obj["barData"] = countlyEventsOverview.helpers.getBarData(obj["sparkline"], eventProperty);
                        obj["total"] = countlyCommon.getShortNumber((values["total"]));
                        obj["trend"] = values["trend"];
                        obj["eventProperty"] = monitorEvents.overview[i].eventProperty ? monitorEvents.overview[i].eventProperty.toUpperCase() : '';
                        obj["name"] = key;
                        monitorData.push(obj);
                    }
                }
            }
            return monitorData;
        }
    };

    countlyEventsOverview.service = {
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
            });
        },
        fetchMonitorEvents: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events",
                    "period": context.state.selectedDatePeriod,
                    "preventRequestAbort": true
                },
                dataType: "json",
            });
        },
        fetchMonitorEventsData: function(my_events, context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "events": JSON.stringify(my_events),
                    "period": context.state.selectedDatePeriod,
                    "timestamp": new Date().getTime(),
                    "overview": true
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
                selectedDatePeriod: "30days"
            };
        };

        var eventsOverviewActions = {
            fetchDetailEvents: function(context) {
                return countlyEventsOverview.service.fetchEvents()
                    .then(function(res) {
                        if (res) {
                            context.commit("setDetailEvents", res || {});
                            context.commit("setEventOverview", countlyEventsOverview.helpers.getEventOverview(res) || []);
                            return;
                        }
                    });
            },
            fetchTopEvents: function(context) {
                return countlyEventsOverview.service.fetchTopEvents("count", 3)
                    .then(function(res) {
                        if (res) {
                            return context.commit("setTopEvents", countlyEventsOverview.helpers.getTopEvents(res) || []);
                        }
                    });
            },
            fetchMonitorEvents: function(context) {
                return countlyEventsOverview.service.fetchMonitorEvents(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setMonitorEvents", res || {});
                            var events = [];
                            if (res && res.overview) {
                                for (var i = 0; i < res.overview.length; i++) {
                                    events.push(res.overview[i].eventKey);
                                }
                            }
                            countlyEventsOverview.service.fetchMonitorEventsData(events, context)
                                .then(function(res) {
                                    if (res) {
                                        return context.commit("setMonitorEventsData", countlyEventsOverview.helpers.getMonitorEvents(res, context) || []);
                                    }
                                });
                        }
                    });
            },
            fetchSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            }

        };

        var eventsOverviewMutations = {
            setDetailEvents: function(state, value) {
                state.detailEvents = value;
            },
            setEventOverview: function(state, value) {
                state.eventsOverview = value;
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