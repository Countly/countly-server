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
            epr["value"] = parseFloat(countlyCommon.getShortNumber((ob.totalCount / ob.totalSessionCount).toFixed(1)));
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
                    event["value"] = data[i].count;
                    event["change"] = data[i].change;
                    event["trend"] = data[i].trend;
                    event["percentage"] = ((data[i].count / ob.totalCount) * 100).toFixed(1);
                    topEvents.push(event);
                }
            }
            return topEvents;
        },
        formatPercentage: function(value) {
            return parseFloat((Math.round(value * 100)).toFixed(this.DECIMAL_PLACES));
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
        }
    };

    countlyEventsOverview.getVuexModule = function() {

        var getInitialState = function() {
            return {
                eventsOverview: [],
                detailEvents: {},
                topEvents: []
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