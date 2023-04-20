/*global countlyCommon, countlyVue, CV, CountlyHelpers, jQuery, $, countlyTotalUsers */

(function(countlySDK) {

    CountlyHelpers.createMetricModel(countlySDK, {name: "sdks", estOverrideMetric: "sdks"}, jQuery);

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

    countlySDK.getChartData = function(sdk, metric) {
        if (!metric) {
            metric = "u";
        }
        var data = countlySDK.getData(true, false, "sdk_version").chartData;
        var chartData = [];
        var dataProps = [];
        for (let i = 0; i < data.length; i++) {
            if (data[i].sdk_version.indexOf("[" + sdk + "]_") === 0) {
                chartData.push({ data: [], label: data[i].sdk_version.replace(new RegExp("\\[" + sdk + "\\]_", "g"), "").replace(/:/g, ".") });
                dataProps.push({ name: data[i].sdk_version });
            }
        }

        var series = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearObject, chartData, dataProps, "", true).chartDP;
        var legend = {"type": "primary", data: []};
        for (let i = 0; i < series.length; i++) {
            series[i].name = series[i].label;
            legend.data[i] = {
                "name": series[i].label,
                "value": 0,
                "trend": "",
                "tooltip": "",
                "percentage": 0
            };
            for (let j = 0; j < series[i].data.length; j++) {
                if (series[i].data[j][1]) {
                    series[i].data[j] = series[i].data[j][1][metric] || 0;
                }
                else {
                    series[i].data[j] = 0;
                }
                legend.data[i].value += series[i].data[j];
            }
        }
        return {series: series, legend: legend};
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
                    context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty));
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
                context.commit('stats/setSDKChartData', countlySDK.getChartData(context.state.stats.selectedSDK, context.state.stats.selectedProperty));
            },
            onSetSelectedProperty: function(context, value) {
                context.commit('stats/setSelectedProperty', value);
                context.commit('stats/setSDKChartData', countlySDK.getChartData("java-native-android", context.state.stats.selectedProperty));
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
                    isLoading: true,
                    selectedSDK: "",
                    selectedProperty: "t"
                };
            },
            getters: {

            },
            mutations: {
                setSelectedSDK: function(state, value) {
                    state.selectedSDK = value;
                },
                setFetchInit: function(state) {
                    state.isLoading = true;
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
                    state.chartData = {series: value.series};
                    state.legendData = value.legend;
                },
                setSelectedProperty: function(state, value) {
                    state.selectedProperty = value;
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