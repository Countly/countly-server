/*global countlyCommon, countlyVue, CV, CountlyHelpers, jQuery, $, countlyTotalUsers, _ */

(function(countlySDK) {

    CountlyHelpers.createMetricModel(countlySDK, {name: "sdks", estOverrideMetric: "sdks"}, jQuery);

    countlySDK.clearRequestObject = function(obj) {
        if (obj) {
            if (!obj.r) {
                obj.r = 0;
            }
            if (!obj.c) {
                obj.c = 0;
            }
            if (!obj.q) {
                obj.q = 0;
            }
        }
        else {
            obj = {"r": 0, "c": 0, "q": 0};
        }

        return obj;
    };

    countlySDK.getSDKVersionData = function(sdk) {
        sdk = sdk.toLowerCase();
        var data = countlySDK.getData(true, false, "sdk_version").chartData;
        var ret = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].sdk_version.indexOf("[" + sdk + "]_") === 0) {
                data[i].sdk_version = data[i].sdk_version.replace(new RegExp("\\[" + sdk + "\\]_", "g"), "").replace(/:/g, ".");
                ret.push(data[i]);
            }
        }
        return ret;
    };

    countlySDK.loadListOfSDKs = function(app_id, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": app_id,
                "method": "sdks",
                "action": "refresh"
            },
            success: function(json) {
                callback(json);
            },
            error: function() {
                callback();
            }
        });
    };

    countlySDK.getRequestData = function(clean, join, metric1) {
        var chartData = {};
        var i = 0;
        chartData = countlyCommon.extractTwoLevelData(countlySDK.getDb(), countlySDK.getMeta(metric1), countlySDK.clearRequestObject, [
            {
                name: metric1,
                func: function(rangeArr) {
                    rangeArr = countlyCommon.decode(rangeArr);
                    return rangeArr;
                }
            },
            { "name": "r" },
            { "name": "q" },
            { "name": "c" }
        ]);
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1);
        chartData.chartData.sort(function(a, b) {
            return b.t - a.t;
        });
        var namesData = _.pluck(chartData.chartData, metric1),
            totalData = _.pluck(chartData.chartData, 'r'),
            canceledData = _.pluck(chartData.chartData, 'c'),
            queuedData = _.pluck(chartData.chartData, 'q');

        if (join) {
            chartData.chartDP = {ticks: []};
            var chartDP = [
                {data: [], label: "Requests"},
                {data: [], label: "Canceled"},
                {data: [], label: "Queued"}
            ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[namesData.length + 1] = [namesData.length, null];
            chartDP[1].data[0] = [-1, null];
            chartDP[1].data[namesData.length + 1] = [namesData.length, null];
            chartDP[2].data[0] = [-1, null];
            chartDP[2].data[namesData.length + 1] = [namesData.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([namesData.length, ""]);

            for (i = 0; i < namesData.length; i++) {
                chartDP[0].data[i + 1] = [i, totalData[i]];
                chartDP[1].data[i + 1] = [i, canceledData[i]];
                chartDP[2].data[i + 1] = [i, queuedData[i]];
                chartData.chartDP.ticks.push([i, namesData[i]]);
            }

            chartData.chartDP.dp = chartDP;
        }
        else {
            var chartData2 = [],
                chartData3 = [],
                chartData4 = [];

            for (i = 0; i < namesData.length; i++) {
                chartData2[i] = {
                    data: [
                        [0, totalData[i]]
                    ],
                    label: namesData[i]
                };
            }

            for (i = 0; i < namesData.length; i++) {
                chartData3[i] = {
                    data: [
                        [0, canceledData[i]]
                    ],
                    label: namesData[i]
                };
            }

            for (i = 0; i < namesData.length; i++) {
                chartData4[i] = {
                    data: [
                        [0, queuedData[i]]
                    ],
                    label: namesData[i]
                };
            }

            chartData.chartDPTotal = {};
            chartData.chartDPTotal.dp = chartData2;

            chartData.chartDPCanceled = {};
            chartData.chartDPCanceled.dp = chartData3;

            chartData.chartDPQueued = {};
            chartData.chartDPQueued.dp = chartData4;
        }
        return chartData;
    };

    countlySDK.getChartData = function(sdk, metric, displayType) {
        if (!metric) {
            metric = "u";
        }
        var isPercentage = displayType === "percentage";
        var data = countlySDK.getData(true, false, "sdk_version").chartData;
        var chartData = [];
        var dataProps = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i].sdk_version.indexOf("[" + sdk + "]_") === 0) {
                chartData.push({ data: [], label: data[i].sdk_version.replace(new RegExp("\\[" + sdk + "\\]_", "g"), "").replace(/:/g, ".") });
                dataProps.push({ name: data[i].sdk_version });
            }
        }
        var dd = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearObject, chartData, dataProps, "", true);
        var series = dd.chartDP;
        var totals = [];
        var percent = [];
        var labels = [];

        for (let z = 0; z < dd.chartData.length; z++) {
            labels.push(dd.chartData[z].date);
        }

        var legend = {"type": "primary", data: []};
        //lets sort series
        series = series.sort(function(a, b) {
            var v1 = a.label;
            var v2 = b.label;
            v1 = v1.split(".");
            v2 = v2.split(".");
            var longest = Math.max(v1.length, v2.length);

            for (let z = 0; z < longest; z++) {
                var i1 = 0;
                var i2 = 0;
                if (v1[z]) {
                    i1 = parseInt(v1[z], 10);
                }
                if (v2[z]) {
                    i2 = parseInt(v2[z], 10);
                }
                if (i1 !== i2) {
                    if (i2 > i1) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                }
            }
            return 1;
        });
        for (let i = 0; i < series.length; i++) {
            for (let j = 0; j < series[i].data.length; j++) {
                totals[j] = totals[j] || 0;
                if (series[i].data[j][1]) {
                    totals[j] += series[i].data[j][1][metric] || 0;
                    percent[j] = 100;
                    series[i].data[j] = series[i].data[j][1][metric] || 0;
                }
                else {
                    series[i].data[j] = 0;
                    if (!percent[j]) {
                        percent[j] = 0;
                    }
                }
            }
        }
        for (let i = 0; i < series.length; i++) {
            series[i].name = series[i].label;
            series[i].stack = "default";
            legend.data[i] = {
                "name": series[i].label,
                "value": 0,
                "trend": "",
                "tooltip": "",
                "percentage": 0
            };
            for (let j = 0; j < series[i].data.length; j++) {
                legend.data[i].value += series[i].data[j];
                if (isPercentage) {
                    var value = Math.round(series[i].data[j] * 100 / totals[j]);
                    if ((percent[j] - value) > 0) {
                        series[i].data[j] = value;
                        percent[j] = percent[j] - value;
                        //if last value
                        if (i + 1 === series.length && percent[j] > 0) {
                            //find the largest value and assign the remainder to it
                            let index = -1;
                            let val = 0;
                            for (let z = 0; z < series.length; z++) {
                                if (series[z].data[j] > val) {
                                    val = series[z].data[j];
                                    index = z;
                                }
                            }
                            if (index > -1) {
                                series[index].data[j] += percent[j];
                            }
                        }
                    }
                    else {
                        series[i].data[j] = percent[j];
                        percent[j] = 0;
                    }
                }
            }
        }

        var xAxis = {
            type: 'category',
            data: labels
        };

        var yAxis = {};
        if (isPercentage) {
            yAxis.axisLabel = {formatter: '{value} %'};
            return {
                xAxis: xAxis,
                legend: legend,
                yAxis: yAxis,
                series: series,
                valFormatter: function(val) {
                    return val + " %";
                }
            };
        }
        else {
            return {xAxis: xAxis, legend: legend, yAxis: yAxis, series: series};
        }

    };

    countlySDK.getRequestChartData = function(metric, segment, displayType) {
        if (!metric) {
            metric = "r";
        }
        var isPercentage = displayType === "percentage";
        var data = countlySDK.getRequestData(true, false, segment).chartData;
        var chartData = [];
        var dataProps = [];
        for (let i = 0; i < data.length; i++) {
            chartData.push({ data: [], label: data[i][segment] });
            dataProps.push({ name: data[i][segment] });
        }
        var dd = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearRequestObject, chartData, dataProps, "", true);
        var series = dd.chartDP;
        var totals = [];
        var percent = [];
        var labels = [];

        for (let z = 0; z < dd.chartData.length; z++) {
            labels.push(dd.chartData[z].date);
        }

        var legend = {"type": "primary", data: []};
        //lets sort series
        series = series.sort(function(a, b) {
            var valueA = a.label;
            var valueB = b.label;
            if (valueA < valueB) {
                return -1;
            }
            else if (valueA > valueB) {
                return 1;
            }
            else {
                return 0;
            }
        });
        for (let i = 0; i < series.length; i++) {
            for (let j = 0; j < series[i].data.length; j++) {
                totals[j] = totals[j] || 0;
                if (series[i].data[j][1]) {
                    totals[j] += series[i].data[j][1][metric] || 0;
                    percent[j] = 100;
                    series[i].data[j] = series[i].data[j][1][metric] || 0;
                }
                else {
                    series[i].data[j] = 0;
                    if (!percent[j]) {
                        percent[j] = 0;
                    }
                }
            }
        }
        for (let i = 0; i < series.length; i++) {
            series[i].name = series[i].label;
            series[i].stack = "default";
            legend.data[i] = {
                "name": series[i].label,
                "value": 0,
                "trend": "",
                "tooltip": "",
                "percentage": 0
            };
            for (let j = 0; j < series[i].data.length; j++) {
                legend.data[i].value += series[i].data[j];
                if (isPercentage) {
                    var value = Math.round(series[i].data[j] * 100 / totals[j]);
                    if ((percent[j] - value) > 0) {
                        series[i].data[j] = value;
                        percent[j] = percent[j] - value;
                        //if last value
                        if (i + 1 === series.length && percent[j] > 0) {
                            //find the largest value and assign the remainder to it
                            let index = -1;
                            let val = 0;
                            for (let z = 0; z < series.length; z++) {
                                if (series[z].data[j] > val) {
                                    val = series[z].data[j];
                                    index = z;
                                }
                            }
                            if (index > -1) {
                                series[index].data[j] += percent[j];
                            }
                        }
                    }
                    else {
                        series[i].data[j] = percent[j];
                        percent[j] = 0;
                    }
                }
            }
        }

        var xAxis = {
            type: 'category',
            data: labels
        };

        var yAxis = {};
        if (isPercentage) {
            yAxis.axisLabel = {formatter: '{value} %'};
            return {
                xAxis: xAxis,
                legend: legend,
                yAxis: yAxis,
                series: series,
                valFormatter: function(val) {
                    return val + " %";
                }
            };
        }
        else {
            return {xAxis: xAxis, legend: legend, yAxis: yAxis, series: series};
        }

    };

    countlySDK.getRequestTotals = function() {
        return countlyCommon.getDashboardData(countlySDK.getDb(), ["r", "c", "q"], [], {}, countlySDK.clearRequestObject);
    };

    countlySDK.getRequestTimeData = function() {
        var cData = [
                { data: [], label: "Received", color: countlyCommon.GRAPH_COLORS[0] },
                { data: [], label: "Canceled", color: countlyCommon.GRAPH_COLORS[1] },
                { data: [], label: "Queued", color: countlyCommon.GRAPH_COLORS[2] }
            ],
            dataProps = [
                { name: "r" },
                { name: "c" },
                { name: "q" }
            ];
        var data = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearRequestObject, cData, dataProps);
        var chartData = data.chartData;
        var graphData = [[], [], []];
        for (var i = 0; i < chartData.length; i++) {
            graphData[0].push(chartData[i].r ? chartData[i].r : 0);
            graphData[1].push(chartData[i].c ? chartData[i].c : 0);
            graphData[2].push(chartData[i].q ? chartData[i].q : 0);
        }
        var series = [];
        var yAxis = [];
        var countObj = {
            name: "Received requests",
            data: graphData[0],
            color: "#017AFF"
        };
        series.push(countObj);
        var countYAxisObj = {
            type: 'value',
            alignTicks: true
        };
        yAxis.push(countYAxisObj);
        var sumObj = {
            name: "Canceled requests",
            data: graphData[1],
            color: "#F96300"
        };
        series.push(sumObj);
        var sumYAxisObj = {
            type: 'value',
            alignTicks: true
        };
        yAxis.push(sumYAxisObj);
        var durObj = {
            name: "Queued requests",
            data: graphData[2],
            color: "#FF9382"
        };
        series.push(durObj);
        var durYAxisObj = {
            type: 'value',
            alignTicks: true
        };
        yAxis.push(durYAxisObj);
        return {
            series: series,
            yAxis: yAxis,
        };
    };

    countlySDK.service = {
        initialize: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: 'sdk-config'
                },
                dataType: "json"
            }).then(function(res) {
                return res || {};
            });
        },
        fetchSDKStats: function() {
            return $.when(countlySDK.initialize(), countlyTotalUsers.initialize("sdks"));
        },
        updateParameter: function(parameter) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/sdk-config/update-parameter",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    parameter: JSON.stringify(parameter)
                },
                dataType: "json"
            });
        },
        calculate: function() {
            var chartData = countlyCommon.extractTwoLevelData(countlySDK.getDb(), countlySDK.getMeta("sdks"), countlySDK.clearObject, [
                {
                    name: "sdks",
                    func: function(rangeArr) {
                        return rangeArr;
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], "sdks");


            var totals = {"u": 0, "t": 0, "n": 0};
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "sdks");

            for (var k = 0; k < chartData.chartData.length; k++) {
                totals.u += chartData.chartData[k].u || 0;
                totals.t += chartData.chartData[k].t || 0;
                totals.n += chartData.chartData[k].n || 0;
            }
            chartData.totals = totals;

            var stacked_version = [];
            for (var i = 0; i < chartData.chartData.length; i++) {
                var tmpVersion = countlySDK.getSDKVersionData(chartData.chartData[i].sdks);
                stacked_version.push({"label": chartData.chartData[i].sdks, "u": chartData.chartData[i].u, "t": chartData.chartData[i].t, "n": chartData.chartData[i].n, "data": tmpVersion});
            }
            chartData.versions = stacked_version;

            return chartData;
        },
    };

    countlySDK.getVuexModule = function() {
        var actions = {
            initialize: function(context) {
                return countlySDK.service.initialize().then(function(sdk) {
                    context.dispatch("countlySDK/sdk/all", sdk, {root: true});
                });
            },
            fetchSDKStats: function(context) {
                context.dispatch('onFetchInit', "sdks");
                countlySDK.service.fetchSDKStats().then(function() {
                    var sdks = countlySDK.service.calculate();
                    if (!context.state.stats.selectedSDK) {
                        context.dispatch('onSetSelectedSDK', sdks.versions[0].label);
                    }
                    context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty, context.state.stats.selectedDisplay));
                    context.commit('stats/setRequestChartData', {
                        received: countlySDK.getRequestChartData("r", "type", context.state.stats.selectedDisplay),
                        canceled: countlySDK.getRequestChartData("c", "reason", context.state.stats.selectedDisplay),
                        timeseries: countlySDK.getRequestTimeData(),
                        totals: countlySDK.getRequestTotals()
                    });
                    context.commit('stats/setSDKData', sdks);
                    context.dispatch('onFetchSuccess', "sdks");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            onFetchInit: function(context, part) {
                context.commit('stats/setFetchInit', part);
            },
            onFetchError: function(context, error) {
                context.commit('stats/setFetchError', error);
            },
            onFetchSuccess: function(context, part) {
                context.commit('stats/setFetchSuccess', part);
            },
            onSetSelectedSDK: function(context, value) {
                context.commit('stats/setSelectedSDK', value);
                context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty, context.state.stats.selectedDisplay));
            },
            onSetSelectedProperty: function(context, value) {
                context.commit('stats/setSelectedProperty', value);
                context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty, context.state.stats.selectedDisplay));
            },
            onSetSelectedDisplay: function(context, value) {
                context.commit('stats/setSelectedDisplay', value);
                context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty, context.state.stats.selectedDisplay));
                context.commit('stats/setRequestChartData', {
                    received: countlySDK.getRequestChartData("r", "type", context.state.stats.selectedDisplay),
                    canceled: countlySDK.getRequestChartData("c", "reason", context.state.stats.selectedDisplay),
                    timeseries: countlySDK.getRequestTimeData(),
                    totals: countlySDK.getRequestTotals()
                });
            }
        };

        var sdkResource = countlyVue.vuex.Module("sdk", {
            state: function() {
                return {
                    all: {},
                    isTableLoading: true
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                isTableLoading: function(_state) {
                    return _state.isTableLoading;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setTableLoading: function(state, value) {
                    state.isTableLoading = value;
                }
            },
            actions: {
                all: function(context, val) {
                    context.commit("setAll", val);
                },
                update: function(context, parameter) {
                    var updateParameter = Object.assign({}, parameter);
                    return countlySDK.service.updateParameter(updateParameter);
                },
                setTableLoading: function(context, value) {
                    context.commit("setTableLoading", value);
                }
            }
        });

        var sdkStats = countlyVue.vuex.Module("stats", {
            state: function() {
                return {
                    sdk: {"chart": {}, "table": []},
                    chartData: {},
                    legendData: {},
                    receivedChartData: {},
                    canceledChartData: {},
                    requestChartData: {},
                    requestTotals: {
                        "r": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "c": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "q": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                    },
                    isLoading: true,
                    selectedSDK: "",
                    selectedProperty: "u",
                    selectedDisplay: "percentage"
                };
            },
            getters: {

            },
            mutations: {
                setSelectedSDK: function(state, value) {
                    state.selectedSDK = value;
                },
                setFetchInit: function(state) {
                    //state.isLoading = true;
                    state.hasError = false;
                    state.error = null;

                },
                setFetchError: function(state, error) {
                    state.isLoading = false;
                    state.hasError = true;
                    state.error = error;
                },
                setFetchSuccess: function(state) {
                    state.isLoading = false;
                    state.hasError = false;
                    state.error = null;
                },
                setSDKData: function(state, value) {
                    state.sdk = value;
                    state.sdk.chart = state.sdk.chart || {};
                    state.sdk.table = state.sdk.table || [];
                    state.sdk.totals = state.sdk.totals || {};
                    state.sdk.pie = state.sdk.pie || {"newUsers": [], "totalSessions": []};
                    state.isLoading = false;
                },
                setSDKChartData: function(state, value) {
                    state.chartData = {series: value.series, xAxis: value.xAxis, yAxis: value.yAxis, valFormatter: value.valFormatter};
                    state.legendData = value.legend;
                },
                setRequestChartData: function(state, value) {
                    state.receivedChartData = {
                        series: value.received.series,
                        xAxis: value.received.xAxis,
                        yAxis: value.received.yAxis,
                        valFormatter: value.received.valFormatter
                    };
                    state.canceledChartData = {
                        series: value.canceled.series,
                        xAxis: value.canceled.xAxis,
                        yAxis: value.canceled.yAxis,
                        valFormatter: value.canceled.valFormatter
                    };
                    state.requestChartData = value.timeseries;
                    state.requestTotals = value.totals;
                },
                setSelectedProperty: function(state, value) {
                    state.selectedProperty = value;
                },
                setSelectedDisplay: function(state, value) {
                    state.selectedDisplay = value;
                },
            },
            actions: {

            }
        });

        return countlyVue.vuex.Module("countlySDK", {
            actions: actions,
            submodules: [sdkResource, sdkStats]
        });
    };

})(window.countlySDK = window.countlySDK || {});