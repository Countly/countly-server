import jQuery from 'jquery';
import _ from 'underscore';
import { countlyCommon } from './countly.common.js';
import { createMetricModel } from './countly.helpers.js';
import countlyOsMapping from './countly.device.osmapping.js';

const countlyDeviceDetails = {};
createMetricModel(countlyDeviceDetails, {name: "device_details", estOverrideMetric: "platforms"}, jQuery);

//If you add something to the os mappings, dont forget to add it to the os mappings in the backend
countlyDeviceDetails.os_mapping = countlyOsMapping;

countlyDeviceDetails.getCleanVersion = function(version) {
    for (var i in countlyDeviceDetails.os_mapping) {
        version = version.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].short, "g"), "");
    }
    return version;
};

countlyDeviceDetails.callback = function(isRefresh, data) {
    if (isRefresh) {
        window.countlyAppVersion.refresh(data);
    }
    else {
        window.countlyAppVersion.initialize();
    }
};

countlyDeviceDetails.getPlatforms = function() {
    return countlyDeviceDetails.getMeta("os");
};

countlyDeviceDetails.checkOS = function(os, data, osName) {
    return new RegExp("^" + "\\[" + osName + "\\]").test(data);
};

countlyDeviceDetails.getPlatformData = function() {

    var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("os"), countlyDeviceDetails.clearObject, [
        {
            name: "os_",
            func: function(rangeArr) {
                if (countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()]) {
                    return countlyDeviceDetails.os_mapping[rangeArr.toLowerCase()].name;
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
    chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "os_");
    var platformNames = _.pluck(chartData.chartData, 'os_'),
        platformTotal = _.pluck(chartData.chartData, 'u'),
        chartData2 = [];

    for (var i = 0; i < platformNames.length; i++) {
        chartData2[i] = {
            data: [
                [0, platformTotal[i]]
            ],
            label: platformNames[i]
        };
    }

    chartData.chartDP = {};
    chartData.chartDP.dp = chartData2;

    return chartData;
};

countlyDeviceDetails.getResolutionData = function() {
    var chartData = countlyCommon.extractTwoLevelData(countlyDeviceDetails.getDb(), countlyDeviceDetails.getMeta("resolutions"), countlyDeviceDetails.clearObject, [
        {
            name: "resolution",
            func: function(rangeArr) {
                return rangeArr;
            }
        },
        {
            name: "width",
            func: function(rangeArr) {
                return "<a>" + rangeArr.split("x")[0] + "</a>";
            }
        },
        {
            name: "height",
            func: function(rangeArr) {
                return "<a>" + rangeArr.split("x")[1] + "</a>";
            }
        },
        { "name": "t" },
        { "name": "u" },
        { "name": "n" }
    ], "resolutions");

    var resolutions = _.pluck(chartData.chartData, 'resolution'),
        resolutionTotal = _.pluck(chartData.chartData, 'u'),
        resolutionNew = _.pluck(chartData.chartData, 'n'),
        chartData2 = [],
        chartData3 = [];

    var i = 0;
    for (i = 0; i < resolutions.length; i++) {
        chartData2[i] = {
            data: [
                [0, resolutionTotal[i]]
            ],
            label: resolutions[i]
        };
    }

    for (i = 0; i < resolutions.length; i++) {
        chartData3[i] = {
            data: [
                [0, resolutionNew[i]]
            ],
            label: resolutions[i]
        };
    }

    chartData.chartDPTotal = {};
    chartData.chartDPTotal.dp = chartData2;

    chartData.chartDPNew = {};
    chartData.chartDPNew.dp = chartData3;

    return chartData;
};

countlyDeviceDetails.__getBars = countlyDeviceDetails.getBars;
countlyDeviceDetails.getBars = function(metric) {
    var data = countlyDeviceDetails.__getBars(metric);

    if (metric === "os_versions") {
        for (var i = 0; i < data.length; i++) {
            data[i].name = countlyDeviceDetails.fixOSVersion(data[i].name);
        }
    }

    return data;
};

countlyDeviceDetails.fixOSVersion = function(osName) {
    osName = (osName + "").replace(/:/g, ".");

    for (var i in countlyDeviceDetails.os_mapping) {
        osName = osName.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].short, "g"), countlyDeviceDetails.os_mapping[i].name + " ");
    }
    return osName;
};

countlyDeviceDetails.eliminateOSVersion = function(data, osSegmentation, segment, fullname) {
    var oSVersionData = JSON.parse(JSON.stringify(data));
    var chartData = [];
    var osName = osSegmentation;
    if (osSegmentation) {
        if (countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) {
            osName = countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].short;
        }
    }

    if (oSVersionData.chartData) {
        var regTest = new RegExp("^" + osName);
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
            else if (countlyDeviceDetails.checkOS && countlyDeviceDetails.checkOS(osSegmentation, oSVersionData.chartData[i][segment], osName)) {
                oSVersionData.chartData[i][segment] = oSVersionData.chartData[i][segment].replace("[" + osName + "]", "");
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

countlyDeviceDetails.getOSVersionList = function(name) {
    var codes = {};
    var lowerCase = name.toLowerCase();
    for (var i in countlyDeviceDetails.os_mapping) {
        if (countlyDeviceDetails.os_mapping[i].name.toLowerCase().startsWith(lowerCase)) {
            codes[countlyDeviceDetails.os_mapping[i].short] = true;
        }
        else {
            var changed = lowerCase.replace(new RegExp("^" + countlyDeviceDetails.os_mapping[i].name.toLowerCase(), "g"), countlyDeviceDetails.os_mapping[i].short);
            changed = changed.replace(/ /g, ""); //removes spaces
            changed = (changed + "").replace(/\./g, ":");
            codes[changed] = true;
        }

    }
    return Object.keys(codes);
};

countlyDeviceDetails.fixBarSegmentData = function(segment, rangeData) {
    var i;
    if (segment === "os_versions") {
        var _os = countlyDeviceDetails.getPlatforms();
        var newRangeData = {chartData: []};
        var doneOs = {};
        for (i = 0; i < _os.length; i++) {
            var osSegmentation = _os[i];

            if (doneOs[osSegmentation.toLowerCase()]) {
                continue;
            }

            doneOs[osSegmentation.toLowerCase()] = 1;
            //Important to note here that segment parameter is passed as "range" because its extracted under name range from extractTwoLevelData
            var fixedRangeData = countlyDeviceDetails.eliminateOSVersion(rangeData, osSegmentation, "range", true);
            newRangeData.chartData = [].concat.apply([], [newRangeData.chartData, fixedRangeData.chartData]);
        }

        rangeData = newRangeData.chartData.length ? newRangeData : rangeData;
    }

    if (segment === "os") {
        var chartData = rangeData.chartData;
        for (i = 0; i < chartData.length; i++) {
            if (countlyDeviceDetails.os_mapping[chartData[i].range.toLowerCase()]) {
                chartData[i].os = countlyDeviceDetails.os_mapping[chartData[i].range.toLowerCase()].name;
            }
        }

        chartData = countlyCommon.mergeMetricsByName(chartData, "os");
        rangeData.chartData = chartData;
    }

    return rangeData;
};

export default countlyDeviceDetails;
