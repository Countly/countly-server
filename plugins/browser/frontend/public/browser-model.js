import { createMetricModel } from "../../../../frontend/express/public/javascripts/countly/countly.helpers.js";
import { pluck, compact } from "underscore";
import countlyCommon from "../../../../frontend/express/public/javascripts/countly/countly.common.js";

const browserModel = {
    getBrowserData() {
        var chartData = countlyCommon.extractTwoLevelData(this.getDb(), this.getMeta("browser"), this.clearObject, [
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
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "browser");
        var browserNames = pluck(chartData.chartData, 'browser'),
            browserTotal = pluck(chartData.chartData, 'u'),
            chartData2 = [];

        for (var i = 0; i < browserNames.length; i++) {
            chartData2[i] = {
                data: [
                    [0, browserTotal[i]]
                ],
                label: browserNames[i]
            };
        }

        chartData.chartDP = {};
        chartData.chartDP.dp = chartData2;

        return chartData;
    },

    getSegmentedData(browser) {
        browser = browser.toLowerCase();
        var metric = "browser_version";
        var versionData = {};
        versionData = countlyCommon.extractTwoLevelData(this.getDb(), this.getMeta(metric), this.clearObject, [
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
        var versionTotal = pluck(versionData.chartData, 'u'),
            chartData2 = [];
        if (versionData.chartData) {
            for (var i = 0; i < versionData.chartData.length; i++) {
                var shouldDelete = true;
                if (versionData.chartData[i][metric].indexOf("[" + browser + "]_") === 0) {
                    shouldDelete = false;
                    versionData.chartData[i][metric] = versionData.chartData[i][metric].replace("[" + browser + "]_", "").replace(/:/g, ".");
                }
                if (shouldDelete) {
                    delete versionData.chartData[i];
                }
            }
        }

        versionData.chartData = compact(versionData.chartData);

        var versionNames = pluck(versionData.chartData, metric);

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
    },

    fixBrowserVersion(val, data) {
        var browsers = data || this.getMeta("browser");
        for (var i = 0; i < browsers.length; i++) {
            if (browsers[i] && val.indexOf("[" + browsers[i].toLowerCase() + "]_") === 0) {
                return browsers[i] + " " + val.replace(new RegExp("\\[" + browsers[i].toLowerCase() + "\\]_", "g"), "").replace(/:/g, ".");
            }
        }
        return val;
    },

    getBrowserVersionList(name, data) {
        var lowerCase = name.toLowerCase();
        var codes = [];
        var browsers = data || this.getMeta("browser");

        for (var i = 0; i < browsers.length; i++) {
            if (browsers[i] && lowerCase.indexOf(browsers[i].toLowerCase()) === 0) { //have fll browser name
                //codes.push(
                var vv = lowerCase;
                vv = vv.replace(browsers[i].toLowerCase(), "[" + browsers[i].toLowerCase() + "]_");
                vv = vv.replace(/ /g, "");//remove spaces in middle
                vv = vv.replace(/\./g, ":");//replace . to :
                codes.push(vv);
            }
            else if (browsers[i] && browsers[i].toLowerCase().indexOf(lowerCase) > -1) {
                codes.push("[" + browsers[i].toLowerCase() + "]_");
            }
        }
        return codes;
    },

    getBrowserVersionData(browser) {
        browser = browser.toLowerCase();
        var data = this.getData(true, false, "browser_version").chartData;
        var ret = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].browser_version.indexOf("[" + browser + "]_") === 0) {
                data[i].browser_version = data[i].browser_version.replace(new RegExp("\\[" + browser + "\\]_", "g"), "").replace(/:/g, ".");
                ret.push(data[i]);
            }
        }
        return ret;
    },
};

createMetricModel(browserModel, { name: "browser", estOverrideMetric: "browser" });

export default browserModel;