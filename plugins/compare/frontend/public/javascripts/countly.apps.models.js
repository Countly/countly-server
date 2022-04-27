/*global countlyVue, CV,_, CountlyHelpers, countlyCommon */
(function(countlyCompareApps) {
    countlyCompareApps.helpers = {
        getTableRows: function(context) {
            var tableData = [];
            var tableStateMap = context.state.tableStateMap;
            for (var key in context.state.allAppsCompareData) {
                var obj = {};
                var item = context.state.allAppsCompareData[key];
                obj.name = item.name;
                obj.totalSessions = item.sessions && item.sessions.total ? countlyCommon.formatNumber(item.sessions.total) : 0,
                obj.totalUsers = item.users && item.users.total ? countlyCommon.formatNumber(item.users.total) : 0,
                obj.newUsers = item.newusers && item.newusers.total ? countlyCommon.formatNumber(item.newusers.total) : 0,
                obj.timeSpent = item.duration && item.duration.total ? item.duration.total : 0,
                obj.avgSessionDuration = item.avgduration && item.avgduration.total ? item.avgduration.total : 0;
                obj.checked = _.isEmpty(tableStateMap) ? true : tableStateMap[key];
                obj.id = item.id;
                tableData.push(obj);
            }

            return tableData;
        },
        getLineChartData: function(context, selectedApps) {
            var series = [];
            var allAppsCompareData = context.state.allAppsCompareData;
            var selectedGraphMetric = context.state.selectedGraphMetric;
            var allAppsInfo = context.rootGetters["countlyCommon/getAllApps"];
            if (selectedApps.length > 0) {
                for (var i = 0;i < selectedApps.length;i++) {
                    if (allAppsCompareData && allAppsCompareData[selectedApps[i]] && allAppsCompareData[selectedApps[i]].charts && allAppsCompareData[selectedApps[i]].charts[selectedGraphMetric]) {
                        var obj = {
                            name: allAppsInfo[selectedApps[i]].label,
                            data: allAppsCompareData[selectedApps[i]].charts[selectedGraphMetric]
                        };
                        series.push(obj);
                    }
                }
            }
            return {series: series};
        },
        getLegendData: function(context, selectedApps) {
            var lineLegend = {};
            var legendData = [];
            var allAppsInfo = context.rootGetters["countlyCommon/getAllApps"];
            for (var i = 0;i < selectedApps.length; i++) {
                var ob = {};
                ob.name = allAppsInfo[selectedApps[i]].label;
                legendData.push(ob);
            }
            if (legendData.length > 3) {
                lineLegend.position = "right";
            }
            lineLegend.data = legendData;
            lineLegend.show = true;
            lineLegend.type = "secondary";
            return lineLegend;
        },
        getAllAppsCompareData: function(res) {
            if (res.length > 0) {
                var obj = {};
                for (var i = 0;i < res.length;i++) {
                    var appID = res[i].id;
                    obj[appID] = res[i];
                }
                return obj;
            }
            return {};
        },
        getTableStateMap: function(context) {
            var obj = {};
            var allAppsInfo = context.rootGetters["countlyCommon/getAllApps"];
            for (var key in allAppsInfo) {
                obj[key] = true;
            }
            return obj;
        },
        filterSelectedApps: function(tableStateMap, selectedApps) {
            var maxItems = 0;
            if (_.isEmpty(tableStateMap)) {
                return selectedApps;

            }
            return selectedApps.filter(function(item) {
                if (tableStateMap[item] && maxItems < 12) {
                    maxItems++;
                    return item;
                }
            });
        }
    };

    countlyCompareApps.service = {
        fetchCompareAppsData: function(context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/compare/apps",
                data: {
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
                    "apps": JSON.stringify(context.state.selectedApps)
                },
                dataType: "json",
            });
        }
    };
    countlyCompareApps.getVuexModule = function() {

        var getCompareInitialState = function() {
            return {
                allAppsCompareData: {},
                selectedApps: [],
                selectedGraphMetric: "total-sessions",
                lineChartData: {},
                lineLegend: {},
                tableRows: [],
                tableStateMap: {},
                isChartLoading: false,
                isTableLoading: false
            };
        };

        var compareAppsActions = {
            fetchCompareAppsData: function(context) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyCompareApps.service.fetchCompareAppsData(context, period)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllAppsCompareData", countlyCompareApps.helpers.getAllAppsCompareData(res));
                            context.commit("setLineChartData", countlyCompareApps.helpers.getLineChartData(context, countlyCompareApps.helpers.filterSelectedApps(context.state.tableStateMap, context.state.selectedApps)));
                            context.commit('setLineLegend', countlyCompareApps.helpers.getLegendData(context, countlyCompareApps.helpers.filterSelectedApps(context.state.tableStateMap, context.state.selectedApps)));
                            context.commit("setTableRows", countlyCompareApps.helpers.getTableRows(context));
                            context.dispatch('setTableLoading', false);
                            context.dispatch('setChartLoading', false);
                        }
                    }).catch(function() {
                        context.dispatch('setTableLoading', false);
                        context.dispatch('setChartLoading', false);
                    });
            },
            fetchLineChartData: function(context, selectedApps) {
                context.commit("setLineChartData", countlyCompareApps.helpers.getLineChartData(context, countlyCompareApps.helpers.filterSelectedApps(context.state.tableStateMap, selectedApps)));
                context.dispatch('setTableLoading', false);
                context.dispatch('setChartLoading', false);
            },
            setSelectedApps: function(context, apps) {
                context.commit('setSelectedApps', apps);
            },
            setSelectedGraphMetric: function(context, metric) {
                context.commit("setSelectedGraphMetric", metric);
            },
            fetchLegendData: function(context, selectedApps) {
                context.commit('setLineLegend', countlyCompareApps.helpers.getLegendData(context, countlyCompareApps.helpers.filterSelectedApps(context.state.tableStateMap, selectedApps)));
            },
            initializeTableStateMap: function(context) {
                context.commit("setTableStateMap", countlyCompareApps.helpers.getTableStateMap(context));
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
            },
            setTableLoading: function(context, value) {
                context.commit("setTableLoading", value);
            },
            setChartLoading: function(context, value) {
                context.commit("setChartLoading", value);
            }
        };

        var compareAppsMutations = {
            setSelectedApps: function(state, value) {
                state.selectedApps = value;
            },
            setAllAppsCompareData: function(state, value) {
                state.allAppsCompareData = value;
            },
            setSelectedGraphMetric: function(state, value) {
                state.selectedGraphMetric = value;
            },
            setLineChartData: function(state, value) {
                state.lineChartData = value;
            },
            setLineLegend: function(state, value) {
                state.lineLegend = value;
            },
            setTableRows: function(state, value) {
                state.tableRows = value;
            },
            setTableStateMap: function(state, value) {
                state.tableStateMap = value;
            },
            setTableLoading: function(state, value) {
                state.isTableLoading = value;
            },
            setChartLoading: function(state, value) {
                state.isChartLoading = value;
            }
        };
        var compareAppsGetters = {
            selectedApps: function(_state) {
                return _state.selectedApps;
            },
            allAppsCompareData: function(_state) {
                return _state.allAppsCompareData;
            },
            selectedGraphMetric: function(_state) {
                return _state.selectedGraphMetric;
            },
            lineChartData: function(_state) {
                return _state.lineChartData;
            },
            lineLegend: function(_state) {
                return _state.lineLegend;
            },
            tableRows: function(_state) {
                return _state.tableRows;
            },
            tableStateMap: function(_state) {
                return _state.tableStateMap;
            },
            isTableLoading: function(_state) {
                return _state.isTableLoading;
            },
            isChartLoading: function(_state) {
                return _state.isChartLoading;
            }
        };
        return countlyVue.vuex.Module("countlyCompareApps", {
            state: getCompareInitialState,
            actions: compareAppsActions,
            mutations: compareAppsMutations,
            getters: compareAppsGetters,
        });
    };
}(window.countlyCompareApps = window.countlyCompareApps || {}));