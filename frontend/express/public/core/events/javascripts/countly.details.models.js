/*global countlyVue, CV, _, countlyCommon, jQuery */
(function(countlyAllEvents) {

    countlyAllEvents.helpers = {
        getLineChartData: function(context, eventData) {
            var chartData = eventData.chartData;
            var graphData = [[], [], []];
            for (var i = 0; i < chartData.length; i++) {
                graphData[0].push(chartData[i].c ? chartData[i].c : 0);
                graphData[1].push(chartData[i].s ? chartData[i].s : 0);
                graphData[2].push(chartData[i].dur ? chartData[i].dur : 0);
            }
            var series = [];
            var countObj = {
                name: eventData.chartDP[0].label,
                data: graphData[0],
                color: "#017AFF"
            };
            series.push(countObj);
            var sumObj = {
                name: eventData.chartDP[1].label,
                data: graphData[1],
                color: "#F96300"
            };
            series.push(sumObj);
            var durObj = {
                name: eventData.chartDP[2].label,
                data: graphData[2],
                color: "#FF9382"
            };
            series.push(durObj);
            var obj = {
                series: series
            };
            context.commit('setLineChartData', obj);
        },
        getTableRows: function(context) {
            var eventData = context.state.allEventsProcessed;
            var tableRows = eventData.chartData.slice();
            if (eventData.tableColumns.indexOf("Sum") !== -1 && eventData.tableColumns.indexOf("Duration") !== -1) {
                tableRows.forEach(function(row) {
                    row.avgSum = (parseInt(row.c) === 0 || parseInt(row.s) === 0) ? 0 : countlyCommon.formatNumber(row.s / row.c);
                    row.avgDur = (parseInt(row.c) === 0 || parseInt(row.dur) === 0) ? 0 : countlyCommon.formatNumber(row.dur / row.c);
                    row.c = countlyCommon.formatNumber(row.c);
                    row.s = countlyCommon.formatNumber(row.s);
                    row.dur = countlyCommon.formatNumber(row.dur);
                });
                eventData.tableColumns.push("AvgSum");
                eventData.tableColumns.push("AvgDur");
            }
            else if (eventData.tableColumns.indexOf("Sum") !== -1) {
                tableRows.forEach(function(row) {
                    row.avgSum = (parseInt(row.c) === 0 || parseInt(row.s) === 0) ? 0 : countlyCommon.formatNumber(row.s / row.c);
                    row.c = countlyCommon.formatNumber(row.c);
                    row.s = countlyCommon.formatNumber(row.s);
                    row.dur = countlyCommon.formatNumber(row.dur);
                });
                eventData.tableColumns.push("AvgSum");
            }
            else if (eventData.tableColumns.indexOf("Duration") !== -1) {
                tableRows.forEach(function(row) {
                    row.avgDur = (parseInt(row.c) === 0 || parseInt(row.dur) === 0) ? 0 : countlyCommon.formatNumber(row.dur / row.c);
                    row.c = countlyCommon.formatNumber(row.c);
                    row.s = countlyCommon.formatNumber(row.s);
                    row.dur = countlyCommon.formatNumber(row.dur);
                });
                eventData.tableColumns.push("AvgDur");
            }
            else {
                tableRows.forEach(function(row) {
                    row.c = countlyCommon.formatNumber(row.c);
                });
            }
            return tableRows;
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
                arrSum.push(eventData.chartData[i].s);

                arrDuration.push(eventData.chartData[i].dur);
                xAxisData.push(eventData.chartData[i].curr_segment);
            }
            obCount.name = "Count";
            obCount.data = arrCount;
            obCount.color = "#017AFF";
            xAxis.data = xAxisData;
            series.push(obCount);
            obSum.name = "Sum";
            obSum.data = arrSum;
            obSum.color = "#F96300";
            series.push(obSum);
            obDuration.name = "Duration";
            obDuration.data = arrDuration;
            obDuration.color = "#FF9382";
            series.push(obDuration);

            legend.show = false;
            obj.legend = legend;
            obj.series = series;
            obj.xAxis = xAxis;
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
            var eventMap = allEvents.map;
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
        },
        getLegendData: function(context) {
            if (!context.state.allEventsProcessed) {
                return;
            }
            var lineLegend = {};
            var legendData = [];
            var eventsOverview = context.state.selectedEventsOverview;
            var labels = context.state.allEventsProcessed.chartDP;
            var count = {};
            count.name = labels[0] ? labels[0].label : CV.i18n("events.overview.count");
            count.value = eventsOverview.count.total;
            count.trend = eventsOverview.count.trend === "u" ? "up" : "down";
            count.percentage = eventsOverview.count.change;
            count.tooltip = labels[0] ? labels[0].label : CV.i18n("events.overview.count");
            legendData.push(count);
            var sum = {};
            sum.name = labels[1] ? labels[1].label : CV.i18n("events.overview.sum");
            sum.value = eventsOverview.sum.total;
            sum.trend = eventsOverview.sum.trend === "u" ? "up" : "down";
            sum.percentage = eventsOverview.sum.change;
            sum.tooltip = labels[1] ? labels[1].label : CV.i18n("events.overview.sum");
            legendData.push(sum);
            var dur = {};
            dur.name = labels[2] ? labels[2].label : CV.i18n("events.overview.duration");
            dur.value = eventsOverview.dur.total;
            dur.trend = eventsOverview.dur.trend === "u" ? "up" : "down";
            dur.percentage = eventsOverview.dur.change;
            dur.tooltip = labels[2] ? labels[2].label : CV.i18n("events.overview.duration");
            legendData.push(dur);
            lineLegend.show = true;
            lineLegend.type = "primary";
            lineLegend.data = legendData;
            return lineLegend;
        },
        getSelectedEventsOverview: function(context, res) {
            return res[context.state.selectedEventName].data;
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
        },
        fetchSelectedEventsOverview: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "events": JSON.stringify([context.state.selectedEventName]),
                    "period": context.state.selectedDatePeriod,
                    "timestamp": new Date().getTime(),
                    "overview": true
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
                selectedEventName: undefined,
                isGroup: false,
                description: "",
                currentActiveSegmentation: "segment",
                hasSegments: false,
                availableSegments: [],
                allEventsProcessed: {},
                barData: {},
                lineChartData: {},
                legendData: {},
                tableRows: [],
                selectedEventsOverview: {}
            };
        };

        var allEventsActions = {
            fetchAllEventsData: function(context) {
                return countlyAllEvents.service.fetchAllEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                            if (!context.state.selectedEventName) {
                                localStorage.setItem("eventKey", res.list[0]);
                                context.commit('setSelectedEventName', res.list[0]);
                            }
                            countlyAllEvents.service.fetchSelectedEventsData(context)
                                .then(function(response) {
                                    if (response) {
                                        context.commit("setSelectedEventsData", response);
                                        context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, response) || []);
                                        context.commit("setTableRows", countlyAllEvents.helpers.getTableRows(context) || []);

                                        countlyAllEvents.service.fetchSelectedEventsOverview(context)
                                            .then(function(resp) {
                                                if (resp) {
                                                    context.commit("setSelectedEventsOverview", countlyAllEvents.helpers.getSelectedEventsOverview(context, resp) || {});
                                                    context.commit("setLegendData", countlyAllEvents.helpers.getLegendData(context || {}));
                                                }
                                            });
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
                            context.commit("setTableRows", countlyAllEvents.helpers.getTableRows(context) || []);
                        }
                    });
            },
            fetchSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            fetchSelectedEventName: function(context, name) {
                localStorage.setItem("eventKey", name);
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
            },
            setLegendData: function(state, value) {
                state.legendData = value;
            },
            setTableRows: function(state, value) {
                state.tableRows = value;
            },
            setSelectedEventsOverview: function(state, value) {
                state.selectedEventsOverview = value;
            },
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
            },
            legendData: function(_state) {
                return _state.legendData;
            },
            tableRows: function(_state) {
                return _state.tableRows;
            },
            selectedEventsOverview: function(_state) {
                return _state.selectedEventsOverview;
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