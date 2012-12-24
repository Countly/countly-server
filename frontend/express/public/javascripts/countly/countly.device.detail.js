(function (countlyDeviceDetails, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _deviceDetailsDb = {},
        _os = [],
        _resolutions = [],
        _os_versions = [],
        _activeAppKey = 0;

    //Public Methods
    countlyDeviceDetails.initialize = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {
            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"device_details"
                },
                dataType:"jsonp",
                success:function (json) {
                    _deviceDetailsDb = json;
                    setMeta();
                }
            });
        } else {
            _deviceDetailsDb = {"2012":{}};
            return true;
        }
    };

    countlyDeviceDetails.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyDeviceDetails.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"device_details",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_deviceDetailsDb, json);
                    setMeta();
                }
            });
        } else {
            _deviceDetailsDb = {"2012":{}};
            return true;
        }
    };

    countlyDeviceDetails.reset = function () {
        _deviceDetailsDb = {};
        setMeta();
    };

    countlyDeviceDetails.clearDeviceDetailsObject = function (obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0};
        }

        return obj;
    };

    countlyDeviceDetails.getPlatforms = function () {
        return _os;
    };

    countlyDeviceDetails.getPlatformBars = function () {
        return countlyCommon.extractBarData(_deviceDetailsDb, _os, countlyDeviceDetails.clearDeviceDetailsObject);
    };

    countlyDeviceDetails.getPlatformData = function () {

        var chartData = countlyCommon.extractTwoLevelData(_deviceDetailsDb, _os, countlyDeviceDetails.clearDeviceDetailsObject, [
            {
                name:"os_",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

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

    countlyDeviceDetails.getResolutionBars = function () {
        return countlyCommon.extractBarData(_deviceDetailsDb, _resolutions, countlyDeviceDetails.clearDeviceDetailsObject);
    };

    countlyDeviceDetails.getOSVersionBars = function () {
        var osVersions = countlyCommon.extractBarData(_deviceDetailsDb, _os_versions, countlyDeviceDetails.clearDeviceDetailsObject);

        for (var i = 0; i < osVersions.length; i++) {
            osVersions[i].name = fixOSVersion(osVersions[i].name);
        }

        return osVersions;
    };

    countlyDeviceDetails.getOSVersionData = function (os) {

        var oSVersionData = countlyCommon.extractTwoLevelData(_deviceDetailsDb, _os_versions, countlyDeviceDetails.clearDeviceDetailsObject, [
            {
                name:"os_version",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        var osSegmentation = ((os) ? os : ((_os) ? _os[0] : null)),
            platformVersionTotal = _.pluck(oSVersionData.chartData, 'u'),
            chartData2 = [];

        if (oSVersionData.chartData) {
            for (var i = 0; i < oSVersionData.chartData.length; i++) {
                oSVersionData.chartData[i].os_version = fixOSVersion(oSVersionData.chartData[i].os_version);

                if (oSVersionData.chartData[i].os_version.indexOf(osSegmentation) == -1) {
                    delete oSVersionData.chartData[i];
                }
            }
        }

        oSVersionData.chartData = _.compact(oSVersionData.chartData);

        var platformVersionNames = _.pluck(oSVersionData.chartData, 'os_version'),
            platformNames = [];

        var sum = _.reduce(platformVersionTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < platformVersionNames.length; i++) {
            var percent = (platformVersionTotal[i] / sum) * 100;

            chartData2[chartData2.length] = {data:[
                [0, platformVersionTotal[i]]
            ], label:platformVersionNames[i].replace(osSegmentation + " ", "")};
        }

        oSVersionData.chartDP = {};
        oSVersionData.chartDP.dp = chartData2;
        oSVersionData.os = [];

        if (_os && _os.length > 1) {
            for (var i = 0; i < _os.length; i++) {
                //if (_os[i] != osSegmentation) {
                //    continue;
                //}

                oSVersionData.os.push({
                    "name":_os[i],
                    "class":_os[i].toLowerCase()
                });
            }
        }

        return oSVersionData;
    };

    function setMeta() {
        if (_deviceDetailsDb['meta']) {
            _os = (_deviceDetailsDb['meta']['os']) ? _deviceDetailsDb['meta']['os'] : [];
            _resolutions = (_deviceDetailsDb['meta']['resolutions']) ? _deviceDetailsDb['meta']['resolutions'] : [];
            _os_versions = (_deviceDetailsDb['meta']['os_versions']) ? _deviceDetailsDb['meta']['os_versions'] : [];
        } else {
            _os = [];
            _resolutions = [];
            _os_versions = [];
        }

        if (_os_versions.length) {
            _os_versions = _os_versions.join(",").replace(/\./g, ":").split(",");
        }
    }

    function fixOSVersion(osName) {
        return osName.replace(/:/g, ".").replace(/i/g, "iOS ").replace(/a/g, "Android ").replace(/b/g, "BlackBerry ").replace(/w/g, "Windows Phone ");
    }

}(window.countlyDeviceDetails = window.countlyDeviceDetails || {}, jQuery));
