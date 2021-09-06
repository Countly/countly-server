/*global countlyVue, CV, _, countlyCommon, jQuery */
(function(countlyCompareEvents) {
    countlyCompareEvents.helpers = {
        getTableRows: function(context) {
            var tableData = [];
            var tableStateMap = context.state.tableStateMap;
            for (var i = 0; i < context.state.selectedEvents.length; i++) {
                var props = countlyCompareEvents.helpers.getProperties(),
                    tableRow = {
                        "id": context.state.selectedEvents[i],
                        "name": context.state.selectedEvents[i].startsWith("[CLY]_group") ? context.state.groupData[context.state.selectedEvents[i]] : countlyCompareEvents.helpers.getEventLongName(context.state.selectedEvents[i], context.state.allEventsData.map),
                        "checked": _.isEmpty(tableStateMap) ? true : tableStateMap[context.state.selectedEvents[i]]
                    };

                for (var prop in props) {
                    var data = countlyCompareEvents.helpers.getChartData(context, context.state.selectedEvents[i], prop),
                        tmpPropVals = _.pluck(data.chartData, prop);

                    if (tmpPropVals.length) {
                        tableRow[prop] = countlyCommon.formatNumber(_.reduce(tmpPropVals, function(memo, num) {
                            return memo + num;
                        }, 0));
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
                    name: selectedEvents[0].startsWith('[CLY]_group') ? context.state.groupData[selectedEvents[0]] : countlyCompareEvents.helpers.getEventLongName(selectedEvents[0], context.state.allEventsData.map),
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
                        name: selectedEvents[i].startsWith('[CLY]_group') ? context.state.groupData[selectedEvents[i]] : countlyCompareEvents.helpers.getEventLongName(selectedEvents[i], context.state.allEventsData.map),
                        data: seriesData,
                    };
                    series.push(ob);
                }
            }
            return {series: series};
        },
        getLegendData: function(selectedEvents, groupData, map) {
            var lineLegend = {};
            var legendData = [];
            if (selectedEvents.length === 1) {
                var obj = {};
                var prevObj = {};
                obj.name = selectedEvents[0].startsWith('[CLY]_group') ? groupData[selectedEvents[0]] : countlyCompareEvents.helpers.getEventLongName(selectedEvents[0], map);
                prevObj.name = CV.i18n("events.compare.previous.period");
                legendData.push(obj, prevObj);
            }
            else {
                for (var i = 0;i < selectedEvents.length; i++) {
                    var ob = {};
                    ob.name = selectedEvents[i].startsWith('[CLY]_group') ? groupData[selectedEvents[i]] : countlyCompareEvents.helpers.getEventLongName(selectedEvents[i], map);
                    legendData.push(ob);
                }
            }
            lineLegend.data = legendData;
            lineLegend.show = true;
            lineLegend.type = "secondary";
            return lineLegend;
        },
        getAllEventsList: function(eventsList, groupList) {
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
                            "label": item.name + "(" + CV.i18n("events.all.group") + ")",
                            "value": item._id
                        };
                        allEvents.push(obj);
                    }
                });
            }
            return allEvents;
        },
        getGroupData: function(groupData) {
            var obj = {};
            groupData.forEach(function(item) {
                obj[item._id] = item.name;
            });
            return obj;
        },
        getTableStateMap: function(eventsList, groupList) {
            var map = eventsList.map || {};
            var allEvents = {};
            if (eventsList) {
                eventsList.list.forEach(function(item) {
                    if (!map[item] || (map[item] && (map[item].is_visible || map[item].is_visible === undefined))) {
                        allEvents[item] = true;
                    }
                });
            }
            if (groupList) {
                groupList.forEach(function(item) {
                    if (item.status) {
                        allEvents[item._id] = true;
                    }
                });
            }
            return allEvents;
        },
        filterSelectedEvents: function(tableStateMap, selectedEvents) {
            if (_.isEmpty(tableStateMap)) {
                return selectedEvents;

            }
            return selectedEvents.filter(function(item) {
                if (tableStateMap[item]) {
                    return item;
                }
            });
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
        fetchRefreshCompareEventsData: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/compare/events",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "action": "refresh",
                    "events": JSON.stringify(context.state.selectedEvents)
                },
                dataType: "json",
            });
        },
    };
    countlyCompareEvents.getVuexModule = function() {

        var getCompareInitialState = function() {
            return {
                allEventsData: {},
                allEventsGroupData: {},
                allEventsList: [],
                allEventsCompareData: {},
                selectedDatePeriod: countlyCommon.getPeriod(),
                selectedEvents: [],
                tableRows: [],
                lineChartData: {},
                selectedGraphMetric: "c",
                lineLegend: {},
                groupData: {},
                tableStateMap: {}
            };
        };

        var compareEventsActions = {
            fetchAllEventsData: function(context) {
                return countlyCompareEvents.service.fetchAllEventsData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                            countlyCompareEvents.service.fetchAllEventsGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setAllEventsGroupData", result);
                                        context.commit("setGroupData", countlyCompareEvents.helpers.getGroupData(result));
                                        context.commit("setAllEventsList", countlyCompareEvents.helpers.getAllEventsList(res, result));
                                        context.commit("setTableStateMap", countlyCompareEvents.helpers.getTableStateMap(res, result));
                                    }
                                });
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
                            context.commit("setLineLegend", countlyCompareEvents.helpers.getLegendData(context.state.selectedEvents, context.state.groupData, context.state.allEventsData.map));
                        }
                    });
            },
            fetchRefreshCompareEventsData: function(context) {
                return countlyCompareEvents.service.fetchRefreshCompareEventsData(context)
                    .then(function(res) {
                        if (res) {
                            var events = _.keys(res);
                            for (var i = 0; i < events.length; i++) {
                                countlyCommon.extendDbObj(context.state.allEventsCompareData[events[i]], res[events[i]]);
                            }
                            context.commit("setTableRows", countlyCompareEvents.helpers.getTableRows(context));
                            context.commit("setLineChartData", countlyCompareEvents.helpers.getLineChartData(context, countlyCompareEvents.helpers.filterSelectedEvents(context.state.tableStateMap, context.state.selectedEvents)));
                            context.commit("setLineLegend", countlyCompareEvents.helpers.getLegendData(countlyCompareEvents.helpers.filterSelectedEvents(context.state.tableStateMap, context.state.selectedEvents), context.state.groupData, context.state.allEventsData.map));
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
                context.commit("setLineChartData", countlyCompareEvents.helpers.getLineChartData(context, countlyCompareEvents.helpers.filterSelectedEvents(context.state.tableStateMap, selectedEvents)));
            },
            fetchSelectedGraphMetric: function(context, metric) {
                context.commit("setSelectedGraphMetric", metric);
            },
            fetchLegendData: function(context, selectedEvents) {
                context.commit('setLineLegend', countlyCompareEvents.helpers.getLegendData(selectedEvents, context.state.groupData, context.state.allEventsData.map));
            },
            updateTableStateMap: function(context, selection) {
                var tableRows = context.state.tableRows;
                for (var i = 0;i < tableRows.length; i++) {
                    var isSelected = false;
                    for (var j = 0;j < selection.length;j++) {
                        if (tableRows[i].id === selection[j].id) {
                            isSelected = true;
                            continue;
                        }
                    }
                    context.state.tableStateMap[tableRows[i].id] = isSelected;
                }
            }
        };

        var compareEventsMutations = {
            setAllEventsData: function(state, value) {
                state.allEventsData = value;
            },
            setAllEventsGroupData: function(state, value) {
                state.allEventsGroupData = value;
            },
            setAllEventsList: function(state, value) {
                state.allEventsList = value;
            },
            setGroupData: function(state, value) {
                state.groupData = value;
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
            },
            setTableStateMap: function(state, value) {
                state.tableStateMap = value;
            }
        };
        var compareEventsGetters = {
            allEvents: function(_state) {
                return _state.allEventsData;
            },
            allEventsGroupData: function(_state) {
                return _state.allEventsGroupData;
            },
            allEventsList: function(_state) {
                return _state.allEventsList;
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
            },
            groupData: function(_state) {
                return _state.groupData;
            },
            tableStateMap: function(_state) {
                return _state.tableStateMap;
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