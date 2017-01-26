(function () {
        
    window.countlyDeviceDetails = window.countlyDeviceDetails || {};
    CountlyHelpers.createMetricModel(window.countlyDeviceDetails, {name: "device_details", estOverrideMetric:"platforms"}, jQuery);
        
    countlyDeviceDetails.os_mapping = {
        "unknown":{short: "unk", name: "Unknown"},
        "undefined":{short: "unk", name: "Unknown"},
        "tvos":{short: "atv", name: "Apple TV"},
        "watchos":{short: "wos", name: "Apple Watch"},
        "unity editor":{short: "uty", name: "Unknown"},
        "qnx":{short: "qnx", name: "QNX"},
        "os/2":{short: "os2", name: "OS/2"},
        "windows":{short: "mw", name: "Windows"},
        "open bsd":{short: "ob", name: "Open BSD"},
        "searchbot":{short: "sb", name: "SearchBot"},
        "sun os":{short: "so", name: "Sun OS"},
        "beos":{short: "bo", name: "BeOS"},
        "mac osx":{short: "o", name: "Mac"},
        "macos":{short: "o", name: "Mac"},
        "mac":{short: "o", name: "Mac"},
        "osx":{short: "o", name: "Mac"},
        "linux":{short: "l", name: "Linux"},
        "unix":{short: "u", name: "UNIX"},
        "ios":{short: "i", name: "iOS"},
        "android":{short: "a", name: "Android"},
        "blackberry":{short: "b", name: "BlackBerry"},
        "windows phone":{short: "w", name: "Windows Phone"},
        "wp":{short: "w", name: "Windows Phone"},
        "roku":{short: "r", name: "Roku"},
        "symbian":{short: "s", name: "Symbian"},
        "chrome":{short: "c", name: "Chrome OS"},
        "debian":{short: "d", name: "Debian"},
        "nokia":{short: "n", name: "Nokia"},
        "firefox":{short: "f", name: "Firefox OS"},
        "tizen":{short: "t", name: "Tizen"}
    };

    countlyDeviceDetails.callback = function(isRefresh, data){
      if(isRefresh){
          countlyAppVersion.refresh(data);
      }
      else{
          countlyAppVersion.initialize();
      }
    };

    countlyDeviceDetails.getPlatforms = function () {
        return countlyDeviceDetails.getMeta("os");
    };
    
    countlyDeviceDetails.checkOS = function(os, data, osName){
        return new RegExp("^"+osName+"([0-9]+|unknown)").test(data);
    };

    countlyDeviceDetails.getPlatformData = function () {

        var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("os"), countlyDeviceDetails.clearObject, [
            {
                name:"os_",
                func:function (rangeArr, dataObj) {
                    if(countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()])
                        return countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()].name;
                    return rangeArr;
                }
            },
            {
                name:"origos_",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "platforms");
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "os_");
        var platformNames = _.pluck(chartData.chartData, 'os_'),
            platformTotal = _.pluck(chartData.chartData, 'u'),
            chartData2 = [];

        var sum = _.reduce(platformTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < platformNames.length; i++) {
            var percent = (platformTotal[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, platformTotal[i]]
            ], label:platformNames[i]};
        }

        chartData.chartDP = {};
        chartData.chartDP.dp = chartData2;

        return chartData;
    };

    countlyDeviceDetails.getResolutionData = function () {
        var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("resolutions"), countlyDeviceDetails.clearObject, [
            {
                name:"resolution",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            {
                name:"width",
                func:function (rangeArr, dataObj) {
                    return "<a>" + rangeArr.split("x")[0] + "</a>";
                }
            },
            {
                name:"height",
                func:function (rangeArr, dataObj) {
                    return "<a>" + rangeArr.split("x")[1] + "</a>";
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "resolutions");

        var resolutions = _.pluck(chartData.chartData, 'resolution'),
            resolutionTotal = _.pluck(chartData.chartData, 'u'),
            resolutionNew = _.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        var sum = _.reduce(resolutionTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < resolutions.length; i++) {
            var percent = (resolutionTotal[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, resolutionTotal[i]]
            ], label:resolutions[i]};
        }

        var sum2 = _.reduce(resolutionNew, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < resolutions.length; i++) {
            var percent = (resolutionNew[i] / sum) * 100;
            chartData3[i] = {data:[
                [0, resolutionNew[i]]
            ], label:resolutions[i]};
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyDeviceDetails.__getBars = countlyDeviceDetails.getBars
    countlyDeviceDetails.getBars = function (metric) {
        var data = countlyDeviceDetails.__getBars(metric);

        if(metric === "os_versions"){
            for (var i = 0; i < data.length; i++) {
                data[i].name = countlyDeviceDetails.fixOSVersion(data[i].name);
            }
        }

        return data;
    };

    countlyDeviceDetails.fixOSVersion = function(osName) {
        osName = (osName+"").replace(/:/g, ".");
        
        for(var i in countlyDeviceDetails.os_mapping){
            osName = osName.replace(new RegExp("^"+countlyDeviceDetails.os_mapping[i].short,"g"), countlyDeviceDetails.os_mapping[i].name+" ");
        }
        return osName;
    };
}());
