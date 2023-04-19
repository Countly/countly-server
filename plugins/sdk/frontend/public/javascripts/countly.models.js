/*global countlyCommon, countlyVue, CV, CountlyHelpers, jQuery, _, $, countlyTotalUsers */

(function(countlySDK) {

    CountlyHelpers.createMetricModel(countlySDK, {name: "sdks", estOverrideMetric: "sdks"}, jQuery);

    countlySDK.getSDKData = function() {
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
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "sdks");
        var sdkNames = _.pluck(chartData.chartData, 'sdks'),
            sdkTotal = _.pluck(chartData.chartData, 'u'),
            chartData2 = [];

        for (var i = 0; i < sdkNames.length; i++) {
            chartData2[i] = {
                data: [
                    [0, sdkTotal[i]]
                ],
                label: sdkNames[i]
            };
        }

        chartData.chartDP = {};
        chartData.chartDP.dp = chartData2;

        return chartData;
    };

    countlySDK.getSegmentedData = function(sdk) {
        sdk = sdk.toLowerCase();
        var metric = "sdk_version";
        var versionData = {};
        versionData = countlyCommon.extractTwoLevelData(countlySDK.getDb(), countlySDK.getMeta(metric), countlySDK.clearObject, [
            {
                name: metric,
                func: function(rangeArr) {
                    var parts = (rangeArr).split("]_");
                    if (parts.length > 2) {
                        //remove duplicates, only single prefix
                        rangeArr = parts[0] + "]_" + parts[parts.length - 1];
                    }
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], metric);
        versionData.chartData = countlyCommon.mergeMetricsByName(versionData.chartData, metric);
        var versionTotal = _.pluck(versionData.chartData, 'u'),
            chartData2 = [];
        if (versionData.chartData) {
            for (var i = 0; i < versionData.chartData.length; i++) {
                var shouldDelete = true;
                if (versionData.chartData[i][metric].indexOf("[" + sdk + "]_") === 0) {
                    shouldDelete = false;
                    versionData.chartData[i][metric] = versionData.chartData[i][metric].replace("[" + sdk + "]_", "").replace(/:/g, ".");
                }
                if (shouldDelete) {
                    delete versionData.chartData[i];
                }
            }
        }

        versionData.chartData = _.compact(versionData.chartData);

        var versionNames = _.pluck(versionData.chartData, metric);

        for (var versionNameIndex = 0; versionNameIndex < versionNames.length; versionNameIndex++) {
            chartData2[chartData2.length] = {
                data: [
                    [0, versionTotal[versionNameIndex]]
                ],
                label: versionNames[versionNameIndex]
            };
        }

        versionData.chartDP = {};
        versionData.chartDP.dp = chartData2;

        return versionData;
    };

    countlySDK.fixSDKVersion = function(val, data) {
        var sdks = data || countlySDK.getMeta("sdks");
        for (var i = 0; i < sdks.length; i++) {
            if (sdks[i] && val.indexOf("[" + sdks[i] + "]_") === 0) {
                return sdks[i] + " " + val.replace(new RegExp("\\[" + sdks[i] + "\\]_", "g"), "").replace(/:/g, ".");
            }
        }
        return val;
    };

    countlySDK.getSDKVersionList = function(name, data) {
        var lowerCase = name.toLowerCase();
        var codes = [];
        var sdks = data || countlySDK.getMeta("sdks");

        for (var i = 0; i < sdks.length; i++) {
            if (sdks[i] && lowerCase.indexOf(sdks[i]) === 0) { //have fll sdk name
                //codes.push(
                var vv = lowerCase;
                vv = vv.replace(sdks[i], "[" + sdks[i] + "]_");
                vv = vv.replace(/ /g, "");//remove spaces in middle
                vv = vv.replace(/\./g, ":");//replace . to :
                codes.push(vv);
            }
            else if (sdks[i] && sdks[i].indexOf(lowerCase) > -1) {
                codes.push("[" + sdks[i] + "]_");
            }
        }
        return codes;
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
            },
            onSetSelectedProperty: function(context, value) {
                context.commit('stats/setSelectedProperty', value);
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