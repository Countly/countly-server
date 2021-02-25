/*global CountlyHelpers, jQuery, countlyBrowser, countlyCommon, _*/
CountlyHelpers.createMetricModel(window.countlyBrowser = window.countlyBrowser || {}, {name: "browser", estOverrideMetric: "browser"}, jQuery);

countlyBrowser.getBrowserData = function() {
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
    chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "browser");
    var browserNames = _.pluck(chartData.chartData, 'browser'),
        browserTotal = _.pluck(chartData.chartData, 'u'),
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
};

countlyBrowser.getSegmentedData = function(browser) {
    browser = browser.toLowerCase();
    var metric = "browser_version";
    var versionData = {};
    versionData = countlyCommon.extractTwoLevelData(countlyBrowser.getDb(), countlyBrowser.getMeta(metric), countlyBrowser.clearObject, [
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
            if (versionData.chartData[i][metric].indexOf("[" + browser + "]_") === 0) {
                shouldDelete = false;
                versionData.chartData[i][metric] = versionData.chartData[i][metric].replace("[" + browser + "]_", "").replace(/:/g, ".");
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

countlyBrowser.fixBrowserVersion = function(val, data) {
    var browsers = data || countlyBrowser.getMeta("browser");
    for (var i = 0; i < browsers.length; i++) {
        if (browsers[i] && val.indexOf("[" + browsers[i].toLowerCase() + "]_") === 0) {
            return browsers[i] + " " + val.replace(new RegExp("\\[" + browsers[i].toLowerCase() + "\\]_", "g"), "").replace(/:/g, ".");
        }
    }
    return val;
};

countlyBrowser.getBrowserVersionList = function(name, data) {
    var lowerCase = name.toLowerCase();
    var codes = [];
    var browsers = data || countlyBrowser.getMeta("browser");

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
};
countlyBrowser.getBrowserVersionData = function(browser) {
    browser = browser.toLowerCase();
    var data = countlyBrowser.getData(true, false, "browser_version").chartData;
    var ret = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i].browser_version.indexOf("[" + browser + "]_") === 0) {
            data[i].browser_version = data[i].browser_version.replace(new RegExp("\\[" + browser + "\\]_", "g"), "").replace(/:/g, ".");
            ret.push(data[i]);
        }
    }
    return ret;
};