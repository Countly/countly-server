/*global countlyVue, CV, _, countlyCommon, jQuery */
(function(countlyCompareEvents) {
    countlyCompareEvents.helpers = {
        getTableRows: function(context) {
            var tableData = [];

            for (var i = 0; i < context.state.selectedEvents.length; i++) {
                var props = countlyCompareEvents.helpers.getProperties(),
                    tableRow = {
                        "id": context.state.selectedEvents[i],
                        "name": countlyCompareEvents.helpers.getEventLongName(context.state.selectedEvents[i]),
                        "checked": true
                    };

                for (var prop in props) {
                    var data = countlyCompareEvents.helpers.getChartData(context, context.state.selectedEvents[i], prop),
                        tmpPropVals = _.pluck(data.chartData, prop);

                    if (tmpPropVals.length) {
                        tableRow[prop] = _.reduce(tmpPropVals, function(memo, num) {
                            return memo + num;
                        }, 0);
                    }
                }

                tableData.push(tableRow);
            }

            return tableData;
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
        getProperties: function() {
            return {
                "c": jQuery.i18n.map["events.count"],
                "s": jQuery.i18n.map["events.sum"],
                "dur": jQuery.i18n.map["events.dur"]
            };
        },
        clearObject: function(obj) {
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
                obj = {"c": 0, "s": 0, "dur": 0};
            }

            return obj;
        },
        getChartData: function(context, forEvent, metric) {
            var chartData = [
                    { data: [], label: forEvent, color: '#DDDDDD', mode: "ghost" },
                    { data: [], label: forEvent, color: '#333933' }
                ],
                dataProps = [
                    {
                        name: "p" + metric,
                        func: function(dataObj) {
                            return dataObj[metric];
                        },
                        period: "previous"
                    },
                    { name: metric}
                ];

            return countlyCommon.extractChartData(context.state.allEventsCompareData[forEvent], countlyCompareEvents.helpers.clearObject, chartData, dataProps);
        },
        getLineChartData: function(context, selectedEvents) {
            var series = [];
            if (selectedEvents.length === 1) {
                var dataObj = countlyCompareEvents.helpers.getChartData(context, selectedEvents[0], context.state.selectedGraphMetric);
                var data = [];
                var prevData = [];
                for (var j = 0;j < dataObj.chartData.length;j++) {
                    data.push(dataObj.chartData[j][context.state.selectedGraphMetric]);
                    prevData.push(dataObj.chartData[j]["p" + context.state.selectedGraphMetric]);
                }
                var obj = {
                    name: selectedEvents[0],
                    data: data,
                };
                var prevObj = {
                    name: CV.i18n("events.compare.previous.period"),
                    data: prevData,
                };
                series.push(obj, prevObj);
            }
            else {
                for (var i = 0;i < selectedEvents.length; i++) {
                    var dataOb = countlyCompareEvents.helpers.getChartData(context, selectedEvents[i], context.state.selectedGraphMetric);
                    var seriesData = [];
                    for (var k = 0;k < dataOb.chartData.length;k++) {
                        seriesData.push(dataOb.chartData[k][context.state.selectedGraphMetric]);
                    }
                    var ob = {
                        name: selectedEvents[i],
                        data: seriesData,
                    };
                    series.push(ob);
                }
            }
            return {series: series};
        },
        getLegendData: function(selectedEvents) {
            var lineLegend = {};
            var legendData = [];
            if (selectedEvents.length === 1) {
                var obj = {};
                var prevObj = {};
                obj.name = selectedEvents[0];
                prevObj.name = CV.i18n("events.compare.previous.period");
                legendData.push(obj, prevObj);
            }
            else {
                for (var i = 0;i < selectedEvents.length; i++) {
                    var ob = {};
                    ob.name = selectedEvents[i];
                    legendData.push(ob);
                }
            }
            lineLegend.data = legendData;
            lineLegend.show = true;
            lineLegend.type = "secondary";
            return lineLegend;
        }
    };

    countlyCompareEvents.service = {
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
        fetchCompareEventsData: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/compare/events",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "period": context.state.selectedDatePeriod,
                    "events": JSON.stringify(context.state.selectedEvents)
                },
                dataType: "json",
            });
        }
    };

    countlyCompareEvents.getVuexModule = function() {

        var getCompareInitialState = function() {
            return {
                allEventsData: {},
                allEventsCompareData: {},
                selectedDatePeriod: "30days",
                selectedEvents: [],
                tableRows: [],
                lineChartData: {},
                selectedGraphMetric: "c",
                lineLegend: {}
            };
        };

        var compareEventsActions = {
            fetchAllEventsData: function(context) {
                return countlyCompareEvents.service.fetchAllEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                        }
                    });
            },
            fetchCompareEventsData: function(context) {
                return countlyCompareEvents.service.fetchCompareEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsCompareData", res);
                            context.commit("setTableRows", countlyCompareEvents.helpers.getTableRows(context));
                            context.commit("setLineChartData", countlyCompareEvents.helpers.getLineChartData(context, context.state.selectedEvents));
                            context.commit("setLineLegend", countlyCompareEvents.helpers.getLegendData(context.state.selectedEvents));
                        }
                    });
            },
            fetchSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            fetchSelectedEvents: function(context, events) {
                context.commit('setSelectedEvents', events);
            },
            fetchLineChartData: function(context, selectedEvents) {
                context.commit("setLineChartData", countlyCompareEvents.helpers.getLineChartData(context, selectedEvents));
            },
            fetchSelectedGraphMetric: function(context, metric) {
                context.commit("setSelectedGraphMetric", metric);
            },
            fetchLegendData: function(context, selectedEvents) {
                context.commit('setLineLegend', countlyCompareEvents.helpers.getLegendData(selectedEvents));
            }
        };

        var compareEventsMutations = {
            setAllEventsData: function(state, value) {
                state.allEventsData = value;
            },
            setAllEventsCompareData: function(state, value) {
                state.allEventsCompareData = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
            },
            setSelectedEvents: function(state, value) {
                state.selectedEvents = value;
            },
            setTableRows: function(state, value) {
                state.tableRows = value;
            },
            setLineChartData: function(state, value) {
                state.lineChartData = value;
            },
            setLineLegend: function(state, value) {
                state.lineLegend = value;
            },
            setSelectedGraphMetric: function(state, value) {
                state.selectedGraphMetric = value;
            }
        };
        var compareEventsGetters = {
            allEvents: function(_state) {
                return _state.allEventsData;
            },
            allEventsCompareData: function(_state) {
                return _state.allEventsCompareData;
            },
            selectedDatePeriod: function(_state) {
                return _state.selectedDatePeriod;
            },
            selectedEvents: function(_state) {
                return _state.selectedEvents;
            },
            tableRows: function(_state) {
                return _state.tableRows;
            },
            lineChartData: function(_state) {
                return _state.lineChartData;
            },
            lineLegend: function(_state) {
                return _state.lineLegend;
            },
            selectedGraphMetric: function(_state) {
                return _state.selectedGraphMetric;
            }
        };
        return countlyVue.vuex.Module("countlyCompareEvents", {
            state: getCompareInitialState,
            actions: compareEventsActions,
            mutations: compareEventsMutations,
            getters: compareEventsGetters,
        });
    };
}(window.countlyCompareEvents = window.countlyCompareEvents || {}));