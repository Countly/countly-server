CountlyHelpers.createMetricModel(window.countlyBrowser = window.countlyBrowser || {}, {name: "browser", estOverrideMetric: "browsers"}, jQuery);

countlyBrowser.getBrowserData = function () {
    var chartData = countlyCommon.extractTwoLevelData(countlyBrowser.getDb(), countlyBrowser.getMeta("browser"), countlyBrowser.clearObject, [
        {
            name:"browser",
            func:function (rangeArr, dataObj) {
                return rangeArr;
            }
        },
        { "name":"t" },
        { "name":"u" },
        { "name":"n" }
    ], "browsers");
    chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "browser");
    var browserNames = _.pluck(chartData.chartData, 'browser'),
        browserTotal = _.pluck(chartData.chartData, 'u'),
        chartData2 = [];

    var sum = _.reduce(browserTotal, function (memo, num) {
        return memo + num;
    }, 0);

    for (var i = 0; i < browserNames.length; i++) {
        var percent = (browserTotal[i] / sum) * 100;
        chartData2[i] = {data:[
            [0, browserTotal[i]]
        ], label:browserNames[i]};
    }

    chartData.chartDP = {};
    chartData.chartDP.dp = chartData2;

    return chartData;
};

countlyBrowser.getSegmentedData = function (browser) {
    browser = browser.toLowerCase();
    var metric = "browser_version";
    var versionData = {};
    versionData = countlyCommon.extractTwoLevelData(countlyBrowser.getDb(), countlyBrowser.getMeta(metric), countlyBrowser.clearObject, [
        {
            name:metric,
            func:function (rangeArr, dataObj) {
                return rangeArr;
            }
        },
        { "name":"t" },
        { "name":"u" },
        { "name":"n" }
    ], metric);
    var versionTotal = _.pluck(versionData.chartData, 'u'),
        chartData2 = [];
    if (versionData.chartData) {
        for (var i = 0; i < versionData.chartData.length; i++) {
            var shouldDelete = true;
            if(versionData.chartData[i][metric].indexOf("["+browser+"]_") === 0){
                shouldDelete = false;
                versionData.chartData[i][metric] = versionData.chartData[i][metric].replace("["+browser+"]_", "").replace(/:/g, ".");
            }
            if(shouldDelete)
                delete versionData.chartData[i];
        }
    }

    versionData.chartData = _.compact(versionData.chartData);

    var versionNames = _.pluck(versionData.chartData, metric),
        browserNames = [];

    var sum = _.reduce(versionTotal, function (memo, num) {
        return memo + num;
    }, 0);

    for (var i = 0; i < versionNames.length; i++) {
        var percent = (versionTotal[i] / sum) * 100;

        chartData2[chartData2.length] = {data:[
            [0, versionTotal[i]]
        ], label:versionNames[i]};
    }

    versionData.chartDP = {};
    versionData.chartDP.dp = chartData2;

    return versionData;
};

countlyBrowser.fixBrowserVersion = function (val, data) {
    var browsers = data || countlyBrowser.getMeta("browser");
    for(var i = 0; i <  browsers.length; i++){
        if(browsers[i] && val.indexOf("["+browsers[i].toLowerCase()+"]_") === 0){
            return browsers[i]+" "+val.replace("["+browsers[i].toLowerCase()+"]_", "").replace(/:/g, ".");
        }
    }
    return val;
};

countlyBrowser.getBrowserVersionData = function (browser) {
    browser = browser.toLowerCase();
    var data = countlyBrowser.getData(true, false, "browser_version").chartData;
    var ret = [];
    for(var i = 0; i < data.length; i++){
        if(data[i].browser_version.indexOf("["+browser+"]_") === 0){
            data[i].browser_version = data[i].browser_version.replace("["+browser+"]_", "").replace(/:/g, ".");
            ret.push(data[i]);
        }
    }
    return ret;
}