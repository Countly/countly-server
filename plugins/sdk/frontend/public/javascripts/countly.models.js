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
            if (!obj.d_total) {
                obj.d_total = 0;
            }
            if (!obj.d_count) {
                obj.d_count = 0;
            }
            if (!obj.d_min) {
                obj.d_min = 0;
            }
            if (!obj.d_max) {
                obj.d_max = 0;
            }
            if (!obj.hc_hc) {
                obj.hc_hc = 0;
            }
            if (!obj.hc_el) {
                obj.hc_el = 0;
            }
            if (!obj.hc_wl) {
                obj.hc_wl = 0;
            }
            if (!obj.hc_sc) {
                obj.hc_sc = 0;
            }
            if (!obj.hc_em) {
                obj.hc_em = 0;
            }
        }
        else {
            obj = {"r": 0, "c": 0, "q": 0, "d_total": 0, "d_count": 0, "d_min": 0, "d_max": 0, hc_hc: 0, hc_el: 0, hc_wl: 0, hc_sc: 0, hc_em: 0};
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
                chartData3[i] = {
                    data: [
                        [0, canceledData[i]]
                    ],
                    label: namesData[i]
                };
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
    countlySDK.getHealthCheckTotals = function() {
        return countlyCommon.getDashboardData(countlySDK.getDb(), ["hc_hc", "hc_el", "hc_wl"], [], {}, countlySDK.clearRequestObject);
    };

    countlySDK.getHealthCheckData = function(clean, join, metric1) {
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
            { "name": "hc_sc" },
            { "name": "hc_em" },
        ]);
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1);
        chartData.chartData.sort(function(a, b) {
            return b.t - a.t;
        });
        var namesData = _.pluck(chartData.chartData, metric1),
            totalData = _.pluck(chartData.chartData, 'hc_sc'),
            canceledData = _.pluck(chartData.chartData, 'hc_em');

        if (join) {
            chartData.chartDP = {ticks: []};
            var chartDP = [
                {data: [], label: "hc_sc"},
                {data: [], label: "hc_em"}
            ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[namesData.length + 1] = [namesData.length, null];
            chartDP[1].data[0] = [-1, null];
            chartDP[1].data[namesData.length + 1] = [namesData.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([namesData.length, ""]);

            for (i = 0; i < namesData.length; i++) {
                chartDP[0].data[i + 1] = [i, totalData[i]];
                chartDP[1].data[i + 1] = [i, canceledData[i]];
                chartData.chartDP.ticks.push([i, namesData[i]]);
            }

            chartData.chartDP.dp = chartDP;
        }
        else {
            var chartData2 = [],
                chartData3 = [];

            for (i = 0; i < namesData.length; i++) {
                chartData2[i] = {
                    data: [
                        [0, totalData[i]]
                    ],
                    label: namesData[i]
                };
                chartData3[i] = {
                    data: [
                        [0, canceledData[i]]
                    ],
                    label: namesData[i]
                };
            }

            chartData.chartDPTotal = {};
            chartData.chartDPTotal.dp = chartData2;

            chartData.chartDPCanceled = {};
            chartData.chartDPCanceled.dp = chartData3;
        }
        return chartData;
    };

    countlySDK.getHealthCheckChartData = function(metric, segment, displayType) {
        if (!metric) {
            metric = "r";
        }
        var isPercentage = displayType === "percentage";
        var data = countlySDK.getHealthCheckData(true, false, segment).chartData;
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

    countlySDK.getDelayTotals = function() {
        var data = countlySDK.getDb(),
            properties = ["d_total", "d_count", "d_min", "d_max"],
            unique = [];
        var estOverrideMetric = {},
            clearObject = countlySDK.clearRequestObject,
            segment = "";
        var _periodObj = countlyCommon.periodObj,
            dataArr = {},
            tmp_x,
            tmp_y,
            tmpUniqObj,
            tmpPrevUniqObj,
            current = {},
            previous = {},
            currentCheck = {},
            previousCheck = {},
            change = {},
            isEstimate = false;

        var i = 0;
        var j = 0;

        for (i = 0; i < properties.length; i++) {
            current[properties[i]] = 0;
            previous[properties[i]] = 0;
            currentCheck[properties[i]] = 0;
            previousCheck[properties[i]] = 0;
        }
        if (_periodObj.isSpecialPeriod) {
            isEstimate = true;
            for (j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j] + segment);
                tmp_x = clearObject(tmp_x);
                for (i = 0; i < properties.length; i++) {
                    if (properties[i] === "d_min") {
                        current[properties[i]] = Math.min(tmp_x[properties[i]], current[properties[i]]);
                    }
                    else if (properties[i] === "d_max") {
                        current[properties[i]] = Math.max(tmp_x[properties[i]], current[properties[i]]);
                    }
                    else {
                        current[properties[i]] += tmp_x[properties[i]];
                    }
                }
            }

            for (j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j] + segment);
                tmp_y = clearObject(tmp_y);
                for (i = 0; i < properties.length; i++) {
                    if (properties[i] === "d_min") {
                        previous[properties[i]] = Math.min(tmp_y[properties[i]], previous[properties[i]]);
                    }
                    else if (properties[i] === "d_max") {
                        previous[properties[i]] = Math.max(tmp_y[properties[i]], previous[properties[i]]);
                    }
                    else {
                        previous[properties[i]] += tmp_y[properties[i]];
                    }
                }
            }

            //deal with unique values separately
            for (j = 0; j < (_periodObj.uniquePeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodArr[j] + segment);
                tmp_x = clearObject(tmp_x);
                for (i = 0; i < unique.length; i++) {
                    current[unique[i]] += tmp_x[unique[i]];
                }
            }

            for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                tmp_y = clearObject(tmp_y);
                for (i = 0; i < unique.length; i++) {
                    previous[unique[i]] += tmp_y[unique[i]];
                }
            }

            //recheck unique values with larger buckets
            for (j = 0; j < (_periodObj.uniquePeriodCheckArr.length); j++) {
                tmpUniqObj = countlyCommon.getDescendantProp(data, _periodObj.uniquePeriodCheckArr[j] + segment);
                tmpUniqObj = clearObject(tmpUniqObj);
                for (i = 0; i < unique.length; i++) {
                    currentCheck[unique[i]] += tmpUniqObj[unique[i]];
                }
            }

            for (j = 0; j < (_periodObj.previousUniquePeriodArr.length); j++) {
                tmpPrevUniqObj = countlyCommon.getDescendantProp(data, _periodObj.previousUniquePeriodArr[j] + segment);
                tmpPrevUniqObj = clearObject(tmpPrevUniqObj);
                for (i = 0; i < unique.length; i++) {
                    previousCheck[unique[i]] += tmpPrevUniqObj[unique[i]];
                }
            }

            //check if we should overwrite uniques
            for (i = 0; i < unique.length; i++) {
                if (current[unique[i]] > currentCheck[unique[i]]) {
                    current[unique[i]] = currentCheck[unique[i]];
                }

                if (previous[unique[i]] > previousCheck[unique[i]]) {
                    previous[unique[i]] = previousCheck[unique[i]];
                }
            }

        }
        else {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod + segment);
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod + segment);
            tmp_x = clearObject(tmp_x);
            tmp_y = clearObject(tmp_y);

            for (i = 0; i < properties.length; i++) {
                current[properties[i]] = tmp_x[properties[i]];
                previous[properties[i]] = tmp_y[properties[i]];
            }
        }

        //check if we can correct data using total users correction
        if (estOverrideMetric && countlyTotalUsers.isUsable()) {
            for (i = 0; i < unique.length; i++) {
                if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]]).users) {
                    current[unique[i]] = countlyTotalUsers.get(estOverrideMetric[unique[i]]).users;
                }
                if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]], true).users) {
                    previous[unique[i]] = countlyTotalUsers.get(estOverrideMetric[unique[i]], true).users;
                }
            }
        }

        for (i = 0; i < properties.length; i++) {
            change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
            dataArr[properties[i]] = {
                "total": countlyCommon.formatSecond(current[properties[i]]),
                "prev-total": countlyCommon.formatSecond(previous[properties[i]]),
                "change": change[properties[i]].percent,
                "trend": change[properties[i]].trend
            };
            if (unique.indexOf(properties[i]) !== -1) {
                dataArr[properties[i]].isEstimate = isEstimate;
            }
        }

        change.d = countlyCommon.getPercentChange(Math.round(previous.d_total / Math.max(previous.d_count, 1)), Math.round(current.d_total / Math.max(current.d_count, 1)));
        dataArr.d = {
            "total": countlyCommon.formatSecond(Math.round(current.d_total / Math.max(current.d_count, 1))),
            "prev-total": countlyCommon.formatSecond(Math.round(previous.d_total / Math.max(previous.d_count, 1))),
            "change": change.d.percent,
            "trend": change.d.trend
        };

        //check if we can correct data using total users correction
        if (estOverrideMetric && countlyTotalUsers.isUsable()) {
            for (i = 0; i < unique.length; i++) {
                if (estOverrideMetric[unique[i]] && countlyTotalUsers.get(estOverrideMetric[unique[i]]).users) {
                    dataArr[unique[i]].isEstimate = false;
                }
            }
        }

        return dataArr;
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
        series.push({
            name: "Received requests",
            data: graphData[0],
            color: "#017AFF"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Canceled requests",
            data: graphData[1],
            color: "#F96300"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Queued requests",
            data: graphData[2],
            color: "#FF9382"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        return {
            series: series,
            yAxis: yAxis,
        };
    };

    countlySDK.getHealthCheckTimeData = function() {
        var cData = [
                { data: [], label: "Health Checks", color: countlyCommon.GRAPH_COLORS[0] },
                { data: [], label: "Error Logs", color: countlyCommon.GRAPH_COLORS[1] },
                { data: [], label: "Warning Logs", color: countlyCommon.GRAPH_COLORS[2] }
            ],
            dataProps = [
                { name: "hc_hc" },
                { name: "hc_el" },
                { name: "hc_wl" }
            ];
        var data = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearRequestObject, cData, dataProps);
        var chartData = data.chartData;
        var graphData = [[], [], []];
        for (var i = 0; i < chartData.length; i++) {
            graphData[0].push(chartData[i].hc_hc ? chartData[i].hc_hc : 0);
            graphData[1].push(chartData[i].hc_el ? chartData[i].hc_el : 0);
            graphData[2].push(chartData[i].hc_wl ? chartData[i].hc_wl : 0);
        }
        var series = [];
        var yAxis = [];
        series.push({
            name: "Received Health Checks",
            data: graphData[0],
            color: "#017AFF"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Error Logs",
            data: graphData[1],
            color: "#F96300"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Warning Logs",
            data: graphData[2],
            color: "#FF9382"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        return {
            series: series,
            yAxis: yAxis,
        };
    };

    countlySDK.getRequestDelayData = function() {
        var cData = [
                { data: [], label: "Minimum Delay", color: countlyCommon.GRAPH_COLORS[0] },
                { data: [], label: "Average Delay", color: countlyCommon.GRAPH_COLORS[1] },
                { data: [], label: "Maximum Delay", color: countlyCommon.GRAPH_COLORS[2] },
            ],
            dataProps = [
                { name: "d_min" },
                {
                    name: "d",
                    func: function(dataObj) {
                        return dataObj.d_total / Math.max(dataObj.d_count, 1);
                    }
                },
                { name: "d_max" }
            ];
        var data = countlyCommon.extractChartData(countlySDK.getDb(), countlySDK.clearRequestObject, cData, dataProps);
        var chartData = data.chartData;
        var graphData = [[], [], []];
        for (var i = 0; i < chartData.length; i++) {
            graphData[0].push(chartData[i].d_min ? chartData[i].d_min : 0);
            graphData[1].push(chartData[i].d ? chartData[i].d : 0);
            graphData[2].push(chartData[i].d_max ? chartData[i].d_max : 0);
        }
        var series = [];
        var yAxis = [];
        series.push({
            name: "Minimum Delay",
            data: graphData[0],
            color: "#017AFF"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Average Delay",
            data: graphData[1],
            color: "#F96300"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        series.push({
            name: "Maximum Delay",
            data: graphData[2],
            color: "#FF9382"
        });
        yAxis.push({
            type: 'value',
            alignTicks: true
        });
        return {
            series: series,
            yAxis: yAxis,
            valFormatter: function(val) {
                return countlyCommon.formatSecond(val);
            }
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
                        timedelays: countlySDK.getRequestDelayData(),
                        totals: countlySDK.getRequestTotals(),
                        delays: countlySDK.getDelayTotals()
                    });
                    context.commit('stats/setHCChartData', {
                        statusCodes: countlySDK.getHealthCheckChartData("hc_sc", "status", context.state.stats.selectedDisplay),
                        errorMessages: countlySDK.getHealthCheckChartData("hc_em", "error", context.state.stats.selectedDisplay),
                        timeseries: countlySDK.getHealthCheckTimeData(),
                        totals: countlySDK.getHealthCheckTotals()
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
                    timedelays: countlySDK.getRequestDelayData(),
                    totals: countlySDK.getRequestTotals(),
                    delays: countlySDK.getDelayTotals()
                });
                context.commit('stats/setHCChartData', {
                    statusCodes: countlySDK.getHealthCheckChartData("hc_sc", "status", context.state.stats.selectedDisplay),
                    errorMessages: countlySDK.getHealthCheckChartData("hc_em", "error", context.state.stats.selectedDisplay),
                    timeseries: countlySDK.getHealthCheckTimeData(),
                    totals: countlySDK.getHealthCheckTotals()
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
                    statusCodesChartData: {},
                    errorMessagesChartData: {},
                    requestChartData: {},
                    healthCheckChartData: {},
                    delayChartData: {},
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
                    delayTotals: {
                        "d": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "d_min": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "d_max": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                    },
                    HCTotals: {
                        "hc_hc": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "hc_el": {
                            change: "NA",
                            "prev-total": 0,
                            total: 0,
                            trend: "u"
                        },
                        "hc_wl": {
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
                    state.delayChartData = value.timedelays;
                    state.requestTotals = value.totals;
                    state.delayTotals = value.delays;
                },
                setHCChartData: function(state, value) {
                    state.statusCodesChartData = {
                        series: value.statusCodes.series,
                        xAxis: value.statusCodes.xAxis,
                        yAxis: value.statusCodes.yAxis,
                        valFormatter: value.statusCodes.valFormatter
                    };
                    state.errorMessagesChartData = {
                        series: value.errorMessages.series,
                        xAxis: value.errorMessages.xAxis,
                        yAxis: value.errorMessages.yAxis,
                        valFormatter: value.errorMessages.valFormatter
                    };
                    state.healthCheckChartData = value.timeseries;
                    state.HCTotals = value.totals;
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