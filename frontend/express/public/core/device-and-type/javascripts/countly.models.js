/* global CountlyHelpers, countlyAuth, jQuery, $,countlyTotalUsers,countlyCommon,countlyVue,countlyDeviceList,countlyOsMapping,countlyDeviceDetails,countlyBrowser, countlyGlobal, countlyDensity, CV*/
(function(countlyDevicesAndTypes) {

    CountlyHelpers.createMetricModel(window.countlyDevicesAndTypes, {name: "device_details", estOverrideMetric: "platforms"}, jQuery);
    countlyDevicesAndTypes.os_mapping = countlyOsMapping; //./frontend/express/public/javascripts/countly/countly.device.osmapping.js

    //CountlyDeviceList - ./frontend/express/public/javascripts/countly/countly.device.list.js
    countlyDevicesAndTypes.getCleanVersion = function(version) {
        for (var i in countlyDevicesAndTypes.os_mapping) {
            version = version.replace(new RegExp("^" + countlyDevicesAndTypes.os_mapping[i].short, "g"), "");
        }
        return version;
    };

    countlyDevicesAndTypes.getPlatforms = function() {
        return countlyDevicesAndTypes.getMeta("os");
    };

    countlyDevicesAndTypes.checkOS = function(os, data, osName) {
        return new RegExp("^" + osName + "([0-9]+|unknown)").test(data);
    };


    countlyDevicesAndTypes.eliminateOSVersion = function(data, osSegmentation, segment, fullname) {
        var oSVersionData = JSON.parse(JSON.stringify(data));
        var chartData = [];
        var osName = osSegmentation;
        if (osSegmentation) {
            if (countlyDevicesAndTypes.os_mapping[osSegmentation.toLowerCase()]) {
                osName = countlyDevicesAndTypes.os_mapping[osSegmentation.toLowerCase()].short;
            }
            else {
                osName = osSegmentation.toLowerCase()[0];
            }
        }

        if (oSVersionData.chartData) {
            var regTest = new RegExp("^" + osName + "[0-9]");
            var reg = new RegExp("^" + osName);
            for (var i = 0; i < oSVersionData.chartData.length; i++) {
                var shouldDelete = true;
                oSVersionData.chartData[i][segment] = oSVersionData.chartData[i][segment].replace(/:/g, ".");
                if (regTest.test(oSVersionData.chartData[i][segment])) {
                    shouldDelete = false;
                    if (!fullname) {
                        oSVersionData.chartData[i][segment] = oSVersionData.chartData[i][segment].replace(reg, "");
                    }
                }
                else if (countlyDevicesAndTypes.checkOS && countlyDevicesAndTypes.checkOS(osSegmentation, oSVersionData.chartData[i][segment], osName)) {
                    shouldDelete = false;
                }
                if (!shouldDelete) {
                    chartData.push(oSVersionData.chartData[i]);
                }
            }
        }

        oSVersionData.chartData = chartData;

        return oSVersionData;
    };

    countlyDevicesAndTypes.helpers = {
        loadTableFromModel: function(dataModel, metric, parser) {
            var tableData = countlyCommon.extractTwoLevelData(dataModel.getDb(), dataModel.getMeta(metric), dataModel.clearObject, [
                {
                    name: metric,
                    func: parser || function(rangeArr) {
                        return rangeArr;
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], metric);

            tableData.chartData = countlyCommon.mergeMetricsByName(tableData.chartData, metric);
            return tableData;
        },
        setEmptyDefault: function(object) {
            object.chart = object.chart || {};
            object.table = object.table || [];
            object.totals = object.totals || {};
            object.pie = object.pie || {"newUsers": [], "totalSessions": []};
        },
        getDeviceFullName: function(shortName) {
            if (shortName === "Unknown") {
                return jQuery.i18n.map["common.unknown"];
            }
            if (countlyDeviceList && countlyDeviceList[shortName]) {
                return countlyDeviceList[shortName];
            }
            return shortName;
        },
        fixOSVersion: function(osName) {
            osName = (osName + "").replace(/:/g, ".");

            for (var i in countlyDeviceDetails.os_mapping) {
                osName = osName.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].short, "g"), countlyDeviceDetails.os_mapping[i].name + " ");
            }
            return osName;
        }
    };

    var countlyDevice = {};
    CountlyHelpers.createMetricModel(countlyDevice, {name: "devices", estOverrideMetric: "devices"}, jQuery, countlyDevicesAndTypes.helpers.getDeviceFullName);//Adds extra functions


    countlyDevicesAndTypes.service = {
        fetchData: function() {
            return $.when(countlyDevicesAndTypes.initialize());
        },
        fetchResolution: function() {
            return $.when(countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("resolutions"));
        },
        fetchAppVersion: function() {
            return $.when(countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("app_versions"));
        },
        fetchPlatform: function() {
            return $.when(countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("platform"));
        },
        fetchBrowser: function() {
            return $.when(countlyBrowser.initialize(), countlyTotalUsers.initialize("browser"));
        },
        fetchDensity: function() {
            return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("densities"), countlyDensity.initialize());
        },
        fetchDevices: function() {
            return $.when(countlyDevice.initialize(), countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("devices"),
                countlyTotalUsers.initialize("platforms"),
                countlyTotalUsers.initialize("platform_versions"),
                countlyTotalUsers.initialize("resolutions"));
        },
        fetchHomeDashboardData: function() {
            //app type is mobile

            var appType = "";
            if (countlyGlobal && countlyGlobal.apps && countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
                appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            }

            if (appType === "web") {
                if (countlyAuth.validateRead('browser')) {
                    return $.when(countlyDevice.initialize(), countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("platforms"), countlyTotalUsers.initialize("devices"), countlyBrowser.initialize(), countlyTotalUsers.initialize("browser"));
                }
                else {
                    return $.when(countlyDevice.initialize(), countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("platforms"), countlyTotalUsers.initialize("devices"));
                }
            }
            else {
                return $.when(countlyDevice.initialize(), countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("platforms"), countlyTotalUsers.initialize("devices"), countlyTotalUsers.initialize("app_versions"), countlyTotalUsers.initialize("device_type"));
            }
        },
        fetchDeviceTypes: function() {
            return $.when(countlyDevicesAndTypes.initialize(), countlyTotalUsers.initialize("device_type"));
        },
        calculatePlatform: function() {
            var chartData = countlyCommon.extractTwoLevelData(countlyDevicesAndTypes.getDb(), countlyDevicesAndTypes.getMeta("os"), countlyDevicesAndTypes.clearObject, [
                {
                    name: "os_",
                    func: function(rangeArr) {
                        if (countlyDevicesAndTypes.os_mapping[rangeArr.toLowerCase()]) {
                            return countlyDevicesAndTypes.os_mapping[rangeArr.toLowerCase()].name;
                        }
                        return rangeArr;
                    }
                },
                {
                    name: "origos_",
                    func: function(rangeArr) {
                        return rangeArr;
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], "platforms");


            var totals = {"u": 0, "t": 0, "n": 0};
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "os_");

            /*var sum = _.reduce(platformTotal, function(memo, num) {
				return memo + num;
			}, 0);*/

            for (var k = 0; k < chartData.chartData.length; k++) {
                totals.u += chartData.chartData[k].u || 0;
                totals.t += chartData.chartData[k].t || 0;
                totals.n += chartData.chartData[k].n || 0;
            }

            //chartData.chartDP = {};
            //chartData.chartDP.dp = chartData2;
            var stacked_version = [];
            for (var i = 0; i < chartData.chartData.length; i++) {
                var tmpOsVersion = countlyDevicesAndTypes.getOSSegmentedData(chartData.chartData[i].os_, false, "os_versions", "platform_versions");
                stacked_version.push({"label": chartData.chartData[i].os_, "u": chartData.chartData[i].u, "t": chartData.chartData[i].t, "n": chartData.chartData[i].n, "data": tmpOsVersion.chartData});
            }
            chartData.versions = stacked_version;
            chartData.totals = totals;
            return chartData;

        },
        calculateBrowser: function() {
            var chartData = countlyCommon.extractTwoLevelData(countlyBrowser.getDb(), countlyBrowser.getMeta("browser"), countlyBrowser.clearObject, [
                {
                    name: "browser",
                    func: function(rangeArr) {
                        return rangeArr;
                    }
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], "browser");


            var totals = {"u": 0, "t": 0, "n": 0};
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "browser");

            for (var k = 0; k < chartData.chartData.length; k++) {
                totals.u += chartData.chartData[k].u || 0;
                totals.t += chartData.chartData[k].t || 0;
                totals.n += chartData.chartData[k].n || 0;
            }
            chartData.totals = totals;

            var stacked_version = [];
            for (var i = 0; i < chartData.chartData.length; i++) {
                var tmpBrowserVersion = countlyBrowser.getBrowserVersionData(chartData.chartData[i].browser);
                stacked_version.push({"label": chartData.chartData[i].browser, "u": chartData.chartData[i].u, "t": chartData.chartData[i].t, "n": chartData.chartData[i].n, "data": tmpBrowserVersion});
            }
            chartData.versions = stacked_version;

            return chartData;
        },
        calculateDensity: function() {
            var chartData = [];
            var calculatedchartData = [];
            var segmentedDataTotalSession, segmentedDataTotalUsers, segmentedDataNewUsers;

            // calculate chartData
            var segmentedData = countlyDeviceDetails.getPlatformData().chartData;
            for (var i = 0; i < segmentedData.length; i++) {
                segmentedDataTotalSession = 0;
                segmentedDataTotalUsers = 0;
                segmentedDataNewUsers = 0;
                var versionsSegmentedData = countlyDensity.getOSSegmentedData(segmentedData[i].os_).chartData;
                for (var j = 0; j < versionsSegmentedData.length; j++) {
                    segmentedDataTotalSession += versionsSegmentedData[j].t;
                    segmentedDataTotalUsers += versionsSegmentedData[j].u;
                    segmentedDataNewUsers += versionsSegmentedData[j].n;
                }
                calculatedchartData.push({density: segmentedData[i].os_, t: segmentedDataTotalSession, u: segmentedDataTotalUsers, n: segmentedDataNewUsers});
            }
            chartData.chartData = calculatedchartData;

            // calculate totals
            var totals = {"u": 0, "t": 0, "n": 0};
            for (var k = 0; k < chartData.chartData.length; k++) {
                totals.u += chartData.chartData[k].u || 0;
                totals.t += chartData.chartData[k].t || 0;
                totals.n += chartData.chartData[k].n || 0;
            }
            chartData.totals = totals;

            // calculate versions
            var stacked_version = [];
            for (var t = 0; t < chartData.chartData.length; t++) {
                var tmpDensityVersion = countlyDensity.getOSSegmentedData(chartData.chartData[t].density).chartData;
                stacked_version.push({"label": chartData.chartData[t].density, "u": chartData.chartData[t].u, "t": chartData.chartData[t].t, "n": chartData.chartData[t].n, "data": tmpDensityVersion});
            }
            chartData.versions = stacked_version;

            return chartData;
        },
        calculateHomeTotals: function() {

            var tops = {};
            var loadTotalsFor = [
                {"model": countlyDevice, "label": "devices", "func": countlyDevicesAndTypes.helpers.getDeviceFullName},
                {
                    "model": countlyBrowser,
                    "label": "browser",
                    "func": function(rangeArr) {
                        return rangeArr;
                    }
                },
                {
                    "model": countlyDevicesAndTypes,
                    "label": "os",
                    "func": function(rangeArr) {
                        if (countlyDevicesAndTypes.os_mapping[rangeArr.toLowerCase()]) {
                            return countlyDevicesAndTypes.os_mapping[rangeArr.toLowerCase()].name;
                        }
                        return rangeArr;
                    }
                },
                {
                    "model": countlyDevicesAndTypes,
                    "label": "app_versions",
                    "func": function(rangeArr) {
                        return rangeArr.replace(/:/g, ".");
                    }
                },
                {
                    "model": countlyDevicesAndTypes,
                    "label": "device_type",
                    "func": function(rangeArr) {
                        return rangeArr;
                    }
                }
            ];
            //countlyDevicesAndTypes.helpers.loadTableFromModel(countlyDevicesAndTypes, metric, options.func)


            var property = "t";
            for (var pp = 0; pp < loadTotalsFor.length; pp++) {

                var tableData = countlyDevicesAndTypes.helpers.loadTableFromModel(loadTotalsFor[pp].model, loadTotalsFor[pp].label, loadTotalsFor[pp].func);
                tableData = tableData || {};
                tableData = tableData.chartData || [];

                var totals = 0;
                var topN = [];


                for (var k = 0; k < tableData.length; k++) {
                    totals += tableData[k][property];
                    if (topN.length < 5) {
                        topN.push(tableData[k]);
                        topN = topN.sort(function(a, b) {
                            return b[property] - a[property];
                        });
                    }
                    else {
                        if (topN[4][property] < tableData[k][property]) {
                            topN[4] = tableData[k];
                            topN = topN.sort(function(a, b) {
                                return b[property] - a[property];
                            });
                        }
                    }
                }
                for (var z = 0; z < topN.length; z++) {
                    topN[z] = {"name": topN[z][loadTotalsFor[pp].label], "percent": Math.round((topN[z][property] || 0) * 1000 / (totals || 1)) / 10, "value": topN[z][property]};
                }
                tops[loadTotalsFor[pp].label] = topN;
            }

            for (var key in tops) {
                for (var z1 = 0; z1 < tops[key].length; z1++) {
                    tops[key][z1].bar = [{
                        percentage: tops[key][z1].percent,
                        color: "#017AFF"
                    }
                    ];
                }
            }
            return tops;
        },
        calculateDevices: function() {
            var metric = "devices";
            var tableData = countlyDevicesAndTypes.helpers.loadTableFromModel(countlyDevice, "devices", countlyDevicesAndTypes.helpers.getDeviceFullName);
            tableData = tableData.chartData || [];
            var totals = {"totalSessions": 0, "newUsers": 0, "totalUsers": 0};
            var graphs = {"newUsers": [], "totalSessions": []};
            for (var k = 0; k < tableData.length; k++) {
                graphs.newUsers.push({"name": tableData[k][metric], "value": tableData[k].n});
                graphs.totalSessions.push({"name": tableData[k][metric], "value": tableData[k].t});
                totals.newUsers += tableData[k].n;
                totals.totalSessions += tableData[k].t;
            }

            var tops = {
                "version": countlyDevicesAndTypes.getBarsWPercentageOfTotal("os_versions", "u", "platform_versions"),
                "platform": countlyDevicesAndTypes.getBarsWPercentageOfTotal("os", "u", "platforms"),
                "resolution": countlyDevicesAndTypes.getBarsWPercentageOfTotal("resolutions", "u", "resolutions")
            };

            for (var i = 0; i < tops.version.length; i++) {
                tops.version[i].name = countlyDevicesAndTypes.helpers.fixOSVersion(tops.version[i].name);
            }

            for (var key in tops) {
                for (var z = 0; z < tops[key].length; z++) {
                    tops[key][z].bar = [{
                        percentage: tops[key][z].percent,
                        color: "#017AFF"
                    }
                    ];
                }
            }

            return {"table": tableData, "pie": graphs, totals: totals, tops: tops};
        },
        calculateData: function(metric, options) {
            var tableData = countlyDevicesAndTypes.helpers.loadTableFromModel(countlyDevicesAndTypes, metric, options.func);
            tableData = tableData.chartData || [];
            var graphs = {"newUsers": [], "totalSessions": []};
            var chart = {
                xAxis: {data: []},
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: [],
                    },
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: [],
                    }
                ]
            };
            var totals = {"totalSessions": 0, "newUsers": 0, "totalUsers": 0};

            if (options.pie) {
                for (var k = 0; k < tableData.length; k++) {
                    graphs.newUsers.push({"name": tableData[k][metric], "value": tableData[k].n});
                    graphs.totalSessions.push({"name": tableData[k][metric], "value": tableData[k].t});
                    totals.newUsers += tableData[k].n;
                    totals.totalSessions += tableData[k].t;
                }
            }
            if (options.chart) {
                for (var kz = 0; kz < tableData.length; kz++) {
                    chart.xAxis.data.push(tableData[kz][metric]);
                    chart.series[0].data.push(tableData[kz].n || 0);
                    chart.series[1].data.push(tableData[kz].t || 0);
                }
            }
            return {"table": tableData, "chart": chart, "pie": graphs, totals: totals};
        },
        validateStates: function(data) {
            for (var p = 0; p < data.length; p++) {

                if (!data[p].init || !data[p].period || data[p].period !== countlyCommon.getPeriodForAjax()) {
                    return true;
                }
            }
            return false;
        }

    };

    countlyDevicesAndTypes.getVuexModule = function() {
        var getInitialState = function() {
            return {
                DevicesAndTypes: {"chart": {}, "totals": {}, "table": []},
                appResolution: {"pie": {"newUsers": [], "totalSessions": []}, "chart": {}, "table": []},
                appVersion: {"chart": {}, "table": []},
                appPlatform: {"chart": {}, "table": []},
                appBrowser: {"chart": {}, "table": []},
                appDensity: {"chart": {}, "table": []},
                deviceTypes: {"pie": {"newUsers": [], "totalSessions": []}, "chart": {}, "totals": {}, "table": []},
                appDevices: {"pie": {"newUsers": [], "totalSessions": []}, "totals": {}, "table": []},
                dashboardTotals: [],
                minNonEmptyBucketsLength: 0,
                nonEmptyBuckets: [],
                isLoading: false,
                hasError: false,
                error: null,
                selectedDatePeriod: "day",
                selectedProperty: "t",
                selectedPlatform: "",
                selectedBrowser: "",
                selectedDensity: "",
                platformLoading: true,
                deviceTypesLoading: true,
                typeLoading: true,
                resolutionLoading: true,
                versionLoading: true,
                browserLoading: true,
                densityLoading: true
            };
        };

        var devicesAndTypesActions = {
            fetchResolution: function(context) {
                context.dispatch('onFetchInit', "resolution");
                countlyDevicesAndTypes.service.fetchResolution().then(function() {
                    var resolutions = countlyDevicesAndTypes.service.calculateData("resolutions", {"pie": true});
                    context.commit('setResolution', resolutions);
                    context.dispatch('onFetchSuccess', "resolution");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchAppVersion: function(context) {
                context.dispatch('onFetchInit', "version");
                countlyDevicesAndTypes.service.fetchAppVersion().then(function() {
                    var versions = countlyDevicesAndTypes.service.calculateData("app_versions", {
                        "chart": true,
                        func: function(rangeArr) {
                            return rangeArr.replace(/:/g, ".");
                        }
                    });
                    context.commit('setAppVersion', versions);
                    context.dispatch('onFetchSuccess', "version");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchPlatform: function(context) {
                if (countlyDevicesAndTypes.service.validateStates([countlyDevicesAndTypes.getCurrentLoadState()])) {
                    context.dispatch('onFetchInit', "platform");
                }
                countlyDevicesAndTypes.service.fetchPlatform().then(function() {
                    var platforms = countlyDevicesAndTypes.service.calculatePlatform();
                    context.commit('setAppPlatform', platforms);
                    context.dispatch('onFetchSuccess', "platform");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchBrowser: function(context) {
                context.dispatch('onFetchInit', "browser");
                countlyDevicesAndTypes.service.fetchBrowser().then(function() {
                    var browsers = countlyDevicesAndTypes.service.calculateBrowser();
                    context.commit('setAppBrowser', browsers);
                    context.dispatch('onFetchSuccess', "browser");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchDensity: function(context) {
                context.dispatch('onFetchInit', "density");
                countlyDevicesAndTypes.service.fetchDensity().then(function() {
                    var densities = countlyDevicesAndTypes.service.calculateDensity();
                    context.commit('setAppDensity', densities);
                    context.dispatch('onFetchSuccess', "density");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchDeviceTypes: function(context) {
                context.dispatch('onFetchInit', "deviceType");
                countlyDevicesAndTypes.service.fetchDeviceTypes().then(function() {
                    var deviceTypes = countlyDevicesAndTypes.service.calculateData("device_type", {"pie": true});
                    context.commit('setDeviceTypes', deviceTypes);
                    context.dispatch('onFetchSuccess', "deviceType");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchDevices: function(context) {
                context.dispatch('onFetchInit', "device");
                countlyDevicesAndTypes.service.fetchDevices().then(function() {
                    var devices = countlyDevicesAndTypes.service.calculateDevices();
                    context.commit('setAppDevices', devices);
                    context.dispatch('onFetchSuccess', "device");
                }).catch(function(error) {
                    context.dispatch('onFetchError', error);
                });
            },
            fetchHomeDashboard: function(context) {
                return countlyDevicesAndTypes.service.fetchHomeDashboardData().then(function() {
                    var totals = countlyDevicesAndTypes.service.calculateHomeTotals();
                    return context.commit('setDashboardTotals', totals);

                });
            },
            onFetchInit: function(context, part) {
                context.commit('setFetchInit', part);
            },
            onFetchError: function(context, error) {
                context.commit('setFetchError', error);
            },
            onFetchSuccess: function(context, part) {
                context.commit('setFetchSuccess', part);
            },
            onSetSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            },
            onSetSelectedProperty: function(context, value) {
                context.commit('setSelectedProperty', value);
            },
            onSetSelectedPlatform: function(context, value) {
                context.commit('setSelectedPlatform', value);
            },
            onSetSelectedBrowser: function(context, value) {
                context.commit('setSelectedBrowser', value);
            },
            onSetSelectedDensity: function(context, value) {
                context.commit('setSelectedDensity', value);
            }
        };

        var devicesAndTypesMutations = {
            setResolution: function(state, value) {
                state.appResolution = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appResolution);
                state.resolutionLoading = false;
            },
            setDashboardTotals: function(state, value) {
                state.dashboardTotals = value;
            },
            setDeviceTypes: function(state, value) {
                state.deviceTypes = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.deviceTypes);
                state.deviceTypesLoading = false;
            },
            setAppVersion: function(state, value) {
                state.appVersion = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appVersion);
                state.versionLoading = false;
            },
            setAppPlatform: function(state, value) {
                state.appPlatform = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appPlatform);
                state.platformLoading = false;
            },
            setAppBrowser: function(state, value) {
                state.appBrowser = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appBrowser);
                state.browserLoading = false;
            },
            setAppDensity: function(state, value) {
                state.appDensity = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appDensity);
                state.densityLoading = false;
            },
            setAppDevices: function(state, value) {
                state.appDevices = value;
                countlyDevicesAndTypes.helpers.setEmptyDefault(state.appDevices);
            },
            setSelectedProperty: function(state, value) {
                state.selectedProperty = value;
            },
            setSelectedPlatform: function(state, value) {
                state.selectedPlatform = value;
            },
            setSelectedBrowser: function(state, value) {
                state.selectedBrowser = value;
            },
            setSelectedDensity: function(state, value) {
                state.selectedDensity = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
                countlyCommon.setPeriod(value);

            },
            setFetchInit: function(state, part) {
                if (part) {
                    if (part === "platform") {
                        state.platformLoading = true;
                    }
                }
                else {
                    state.isLoading = true;
                }
                state.hasError = false;
                state.error = null;

            },
            setFetchError: function(state, error) {
                state.isLoading = false;
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state, part) {
                state.isLoading = false;
                state.hasError = false;
                state.error = null;

                if (part) {
                    if (part === "platform") {
                        state.platformLoading = false;
                    }
                    else if (part === "device") {
                        state.deviceTypesLoading = false;
                    }
                    else if (part === "deviceType") {
                        state.typeLoading = false;
                    }
                    else if (part === "resolution") {
                        state.resolutionLoading = false;
                    }
                    else if (part === "version") {
                        state.versionLoading = false;
                    }
                    else if (part === "browser") {
                        state.browserLoading = false;
                    }
                    else if (part === "density") {
                        state.densityLoading = false;
                    }
                }
            }
        };
        return countlyVue.vuex.Module("countlyDevicesAndTypes", {
            state: getInitialState,
            actions: devicesAndTypesActions,
            mutations: devicesAndTypesMutations
        });
    };


}(window.countlyDevicesAndTypes = window.countlyDevicesAndTypes || {}));