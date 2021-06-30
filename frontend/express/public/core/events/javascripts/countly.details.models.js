/*global window, countlyVue, CV, _, countlyCommon, jQuery */
(function(countlyAllEvents) {

    countlyAllEvents.helpers = {
        getLineChartData: function(context, eventData) {
            var chartData = eventData.chartData;
            var graphData = [[], [], [], []];

            for (var i = 0; i < chartData.length; i++) {
                graphData[0].push(chartData[i].c);
                graphData[1].push(chartData[i].s);
                graphData[2].push(chartData[i].dur);
            }
            var obj = {
                series: [
                    {
                        name: jQuery.i18n.map['events.overview.count'],
                        data: graphData[0],
                        color: "#017AFF"
                    },
                    {
                        name: jQuery.i18n.map['events.overview.sum'],
                        data: graphData[1],
                        color: "#F96300"
                    },
                    {
                        name: jQuery.i18n.map['events.overview.duration'],
                        data: graphData[2],
                        color: "#FF9382"
                    }
                ],
                legend: {
                    show: false
                }
            };
            context.commit('setLineChartData', obj);
        },
        getBarChartData: function(context, eventData) {
            var arrCount = [];
            var arrSum = [];
            var arrDuration = [];
            var xAxisData = [];
            var obj = {};
            var xAxis = {};
            var legend = {};
            var series = [];
            var obCount = {};
            var obSum = {};
            var obDuration = {};
            for (var i = 0; i < eventData.chartData.length; i++) {
                arrCount.push(eventData.chartData[i].c);
                if (eventData.chartData[i].s) {
                    arrSum.push(eventData.chartData[i].s);
                }
                if (eventData.chartData[i].dur) {
                    arrDuration.push(eventData.chartData[i].dur);
                }
                xAxisData.push(eventData.chartData[i].curr_segment);
            }
            obCount["name"] = "Count";
            obCount["data"] = arrCount;
            obCount["color"] = "#017AFF";
            xAxis["data"] = xAxisData;
            series.push(obCount);
            if (arrSum.length > 0) {
                obSum["name"] = "Sum";
                obSum["data"] = arrSum;
                obSum["color"] = "#F96300";
                series.push(obSum);
            }
            if (arrDuration.length > 0) {
                obDuration["name"] = "Duration";
                obDuration["data"] = arrDuration;
                obDuration["color"] = "#FF9382";
                series.push(obDuration);
            }
            legend["show"] = false;
            obj["legend"] = legend;
            obj["series"] = series;
            obj["xAxis"] = xAxis;
            context.commit('setBarData', obj);
        },
        clearEventsObject: function(obj) {
            if (obj) {
                if (!obj.c) {
                    obj.c = 0;
                }
                if (!obj.s) {
                    obj.s = 0;
                }
                if (!obj.dur) {
                    obj.dur = 0;
                }
            }
            else {
                obj = { "c": 0, "s": 0, "dur": 0 };
            }

            return obj;
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
        getEventsData: function(context, res) {
            var eventData = { chartData: {}, chartDP: { dp: [], ticks: [] } };
            var allEvents = context.state.allEventsData;
            var eventMap = allEvents["map"];
            var mapKey = context.state.selectedEventName.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e');
            var countString = (allEvents[mapKey] && allEvents[mapKey].count) ? allEvents[mapKey].count : (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"];
            var sumString = (allEvents[mapKey] && allEvents[mapKey].sum) ? allEvents[mapKey].sum : (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"];
            var durString = (allEvents[mapKey] && allEvents[mapKey].dur) ? allEvents[mapKey].dur : (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

            if (context.state.currentActiveSegmentation !== "segment" && context.state.hasSegments) {
                var segments = res.meta[context.state.currentActiveSegmentation].slice();
                var tmpEventData = countlyCommon.extractTwoLevelData(res, segments, countlyAllEvents.helpers.clearEventsObject, [
                    {
                        name: "curr_segment",
                        func: function(rangeArr) {
                            return rangeArr.replace(/:/g, ".").replace(/\[CLY\]/g, "").replace(/.\/\//g, "://");
                        }
                    },
                    { "name": "c" },
                    { "name": "s" },
                    { "name": "dur" }
                ]);

                eventData.chartData = tmpEventData.chartData;

                var segmentsSum = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
                var segmentsDur = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

                if (_.reduce(segmentsSum, function(memo, num) {
                    return memo + num;
                }, 0) === 0) {
                    segmentsSum = [];
                }

                if (_.reduce(segmentsDur, function(memo, num) {
                    return memo + num;
                }, 0) === 0) {
                    segmentsDur = [];
                }

                if (allEvents[context.state.selectedEventName]) {
                    eventData.eventName = allEvents[context.state.selectedEventName].label;
                    eventData.is_event_group = true;
                }
                else {
                    eventData.eventName = countlyAllEvents.helpers.getEventLongName(context.state.selectedEventName);
                    eventData.is_event_group = false;
                }

                if (mapKey && eventMap && eventMap[mapKey]) {
                    eventData.eventDescription = eventMap[mapKey].description || "";
                }
                eventData.dataLevel = 2;
                eventData.tableColumns = [jQuery.i18n.map["events.table.segmentation"], countString];
                if (segmentsSum.length || segmentsDur.length) {
                    if (segmentsSum.length) {
                        eventData.tableColumns[eventData.tableColumns.length] = sumString;
                    }
                    if (segmentsDur.length) {
                        eventData.tableColumns[eventData.tableColumns.length] = durString;
                    }
                }
                else {
                    _.each(eventData.chartData, function(element, index, list) {
                        list[index] = _.pick(element, "curr_segment", "c");
                    });
                }
            }
            else {
                var chartData = [
                        { data: [], label: countString },
                        { data: [], label: sumString },
                        { data: [], label: durString }
                    ],
                    dataProps = [
                        { name: "c" },
                        { name: "s" },
                        { name: "dur" }
                    ];

                eventData = countlyCommon.extractChartData(res, countlyAllEvents.helpers.clearEventsObject, chartData, dataProps);

                if (allEvents[context.state.selectedEventName]) {
                    eventData.eventName = allEvents[context.state.selectedEventName].label;
                    eventData.is_event_group = true;
                }
                else {
                    eventData.eventName = countlyAllEvents.helpers.getEventLongName(context.state.selectedEventName);
                    eventData.is_event_group = false;
                }

                if (mapKey && eventMap && eventMap[mapKey]) {
                    eventData.eventDescription = eventMap[mapKey].description || "";
                }
                eventData.dataLevel = 1;
                eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

                var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
                var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

                var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                    return memo + num;
                }, 0);
                var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                    return memo + num;
                }, 0);

                if (reducedSum !== 0 || reducedDur !== 0) {
                    if (reducedSum !== 0) {
                        eventData.tableColumns[eventData.tableColumns.length] = sumString;
                    }
                    if (reducedDur !== 0) {
                        eventData.tableColumns[eventData.tableColumns.length] = durString;
                    }
                }
                else {
                    eventData.chartDP[1] = false;
                    eventData.chartDP = _.compact(eventData.chartDP);
                    _.each(eventData.chartData, function(element, index, list) {
                        list[index] = _.pick(element, "date", "c");
                    });
                }
            }
            var countArr = _.pluck(eventData.chartData, "c");

            if (countArr.length) {
                eventData.totalCount = _.reduce(countArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var sumArr = _.pluck(eventData.chartData, "s");

            if (sumArr.length) {
                eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var durArr = _.pluck(eventData.chartData, "dur");

            if (durArr.length) {
                eventData.totalDur = _.reduce(durArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }
            context.commit('setAllEventsProcessed', eventData);
            return eventData;
        },
        getSegments: function(context, res) {
            var segments = [];
            if (res.meta && res.meta.segments.length > 0) {
                segments = res.meta.segments.slice();
                segments.push("segment");
                context.commit('setHasSegments', true);
            }
            else {
                context.commit('setHasSegments', false);
            }
            var eventData = countlyAllEvents.helpers.getEventsData(context, res);
            if (context.state.currentActiveSegmentation !== "segment") {
                countlyAllEvents.helpers.getBarChartData(context, eventData);
            }
            else {
                countlyAllEvents.helpers.getLineChartData(context, eventData);
            }
            return segments;
        }
    };

    countlyAllEvents.service = {
        fetchAllEventsData: function(context) {
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
        fetchAllEventsGroupData: function() {
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
        fetchSelectedEventsData: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "event": context.state.selectedEventName,
                    "segmentation": context.state.currentActiveSegmentation === "segment" ? "" : context.state.currentActiveSegmentation,
                    "period": context.state.selectedDatePeriod,
                    "preventRequestAbort": true
                },
                dataType: "json",
            });
        }
    };

    countlyAllEvents.getVuexModule = function() {

        var getInitialState = function() {
            return {
                allEventsData: {},
                allEventsGroupsData: [],
                selectedEventsData: {},
                selectedDatePeriod: "30days",
                selectedEventName: "",
                isGroup: false,
                description: "",
                currentActiveSegmentation: "segment",
                hasSegments: false,
                availableSegments: [],
                allEventsProcessed: {},
                barData: {},
                lineChartData: {}
            };
        };

        var allEventsActions = {
            fetchAllEventsData: function(context) {
                return countlyAllEvents.service.fetchAllEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                            countlyAllEvents.service.fetchSelectedEventsData(context)
                                .then(function(res) {
                                    if (res) {
                                        context.commit("setSelectedEventsData", res);
                                        context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, res) || []);
                                    }
                                });
                        }
                    });
            },
            fetchAllEventsGroupData: function(context) {
                return countlyAllEvents.service.fetchAllEventsGroupData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsGroupData", res);
                        }
                    });
            },
            fetchSelectedEventsData: function(context) {
                return countlyAllEvents.service.fetchSelectedEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setSelectedEventsData", res);
                            context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, res) || []);
                        }
                    });
            },
            fetchSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            fetchSelectedEventName: function(context, name) {
                context.commit('setSelectedEventName', name);
            },
            fetchCurrentActiveSegmentation: function(context, name) {
                context.commit('setCurrentActiveSegmentation', name);
            },
            fetchHasSegments: function(context, hasSegments) {
                context.commit('setHasSegments', hasSegments);
            }

        };

        var allEventsMutations = {
            setAllEventsData: function(state, value) {
                state.allEventsData = value;
            },
            setAllEventsGroupData: function(state, value) {
                state.allEventsGroupData = value;
            },
            setSelectedEventsData: function(state, value) {
                state.selectedEventsData = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
            },
            setSelectedEventName: function(state, value) {
                state.selectedEventName = value;
            },
            setIsGroup: function(state, value) {
                state.isGroup = value;
            },
            setDescription: function(state, value) {
                state.description = value;
            },
            setCurrentActiveSegmentation: function(state, value) {
                state.currentActiveSegmentation = value;
            },
            setHasSegments: function(state, value) {
                state.hasSegments = value;
            },
            setAvailableSegments: function(state, value) {
                state.availableSegments = value;
            },
            setAllEventsProcessed: function(state, value) {
                state.allEventsProcessed = value;
            },
            setBarData: function(state, value) {
                state.barData = value;
            },
            setLineChartData: function(state, value) {
                state.lineChartData = value;
            }
        };
        var allEventsGetters = {
            allEvents: function(_state) {
                return _state.allEventsData;
            },
            allEventsGroup: function(_state) {
                return _state.allEventsGroupData;
            },
            selectedEvent: function(_state) {
                return _state.selectedEventsData;
            },
            selectedDatePeriod: function(_state) {
                return _state.selectedDatePeriod;
            },
            selectedEventName: function(_state) {
                return _state.selectedEventName;
            },
            isGroup: function(_state) {
                return _state.isGroup;
            },
            description: function(_state) {
                return _state.description;
            },
            currentActiveSegmentation: function(_state) {
                return _state.currentActiveSegmentation;
            },
            hasSegments: function(_state) {
                return _state.hasSegments;
            },
            availableSegments: function(_state) {
                return _state.availableSegments;
            },
            allEventsProcessed: function(_state) {
                return _state.allEventsProcessed;
            },
            barData: function(_state) {
                return _state.barData;
            },
            lineChartData: function(_state) {
                return _state.lineChartData;
            }
        };
        return countlyVue.vuex.Module("countlyAllEvents", {
            state: getInitialState,
            actions: allEventsActions,
            mutations: allEventsMutations,
            getters: allEventsGetters,
        });
    };
}(window.countlyAllEvents = window.countlyAllEvents || {}));