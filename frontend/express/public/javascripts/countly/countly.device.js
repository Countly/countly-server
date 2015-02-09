(function (countlyDevice, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _deviceDb = {},
        _devices = [],
        _activeAppKey = 0,
        _initialized = false,
        _period = null;

    //Public Methods
    countlyDevice.initialize = function () {
        if (_initialized && _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyDevice.refresh();
        }

        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"devices",
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    _deviceDb = json;
                    setMeta();
                }
            });
        } else {
            _deviceDb = {"2012":{}};
            return true;
        }
    };

    countlyDevice.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyDevice.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"devices",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_deviceDb, json);
                    extendMeta();
                }
            });
        } else {
            _deviceDb = {"2012":{}};
            return true;
        }
    };

    countlyDevice.reset = function () {
        _deviceDb = {};
        setMeta();
    };

    countlyDevice.getDeviceData = function () {

        var chartData = countlyCommon.extractTwoLevelData(_deviceDb, _devices, countlyDevice.clearDeviceObject, [
            {
                name:"device",
                func:function (rangeArr, dataObj) {
                    return countlyDevice.getDeviceFullName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        var deviceNames = _.pluck(chartData.chartData, 'device'),
            deviceTotal = _.pluck(chartData.chartData, 'u'),
            deviceNew = _.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        var sum = _.reduce(deviceTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < deviceNames.length; i++) {
            var percent = (deviceTotal[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, deviceTotal[i]]
            ], label:deviceNames[i]};
        }

        var sum2 = _.reduce(deviceNew, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < deviceNames.length; i++) {
            var percent = (deviceNew[i] / sum2) * 100;
            chartData3[i] = {data:[
                [0, deviceNew[i]]
            ], label:deviceNames[i]};
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyDevice.getDeviceDP = function () {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = [
                { data:[], label:"Devices" }
            ],
            ticks = [],
            rangeUsers;

        for (var j = 0; j < _devices.length; j++) {

            rangeUsers = 0;

            if (!_periodObj.isSpecialPeriod) {
                for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_deviceDb, _periodObj.activePeriod + "." + i + ".device");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_deviceDb["devices"][j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, countlyDevice.getDeviceFullName(_deviceDb["devices"][j])];
                }
            } else {
                for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_deviceDb, _periodObj.currentPeriodArr[i] + ".device");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_deviceDb["devices"][j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, countlyDevice.getDeviceFullName(_deviceDb["devices"][j])];
                }
            }
        }

        return {
            dp:dataArr,
            ticks:ticks
        };
    };

    countlyDevice.clearDeviceObject = function (obj) {
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

    countlyDevice.getDeviceFullName = function(shortName) {
        var fullName = "";

        switch (shortName) {
            case "iPhone1,1":
                fullName = "iPhone 1G";
                break;
            case "iPhone1,2":
                fullName = "iPhone 3G";
                break;
            case "iPhone2,1":
                fullName = "iPhone 3GS";
                break;
            case "iPhone3,1":
                fullName = "iPhone 4 (GSM)";
                break;
            case "iPhone3,2":
                fullName = "iPhone 4 (GSM Rev A)";
                break;
            case "iPhone3,3":
                fullName = "iPhone 4 (CDMA)";
                break;
            case "iPhone4,1":
                fullName = "iPhone 4S";
                break;
            case "iPhone5,1":
                fullName = "iPhone 5 (GSM)";
                break;
            case "iPhone5,2":
                fullName = "iPhone 5 (Global)";
                break;
            case "iPhone5,3":
                fullName = "iPhone 5C (GSM)";
                break;
            case "iPhone5,4":
                fullName = "iPhone 5C (Global)";
                break;
            case "iPhone6,1":
                fullName = "iPhone 5S (GSM)";
                break;
            case "iPhone6,2":
                fullName = "iPhone 5S (Global)";
                break;
            case "iPhone7,1":
                fullName = "iPhone 6 Plus";
                break;
            case "iPhone7,2":
                fullName = "iPhone 6";
                break;
            case "iPod1,1":
                fullName = "iPod Touch 1G";
                break;
            case "iPod2,1":
                fullName = "iPod Touch 2G";
                break;
            case "iPod3,1":
                fullName = "iPod Touch 3G";
                break;
            case "iPod4,1":
                fullName = "iPod Touch 4G";
                break;
            case "iPod5,1":
                fullName = "iPod Touch 5G";
                break;
            case "iPad1,1":
                fullName = "iPad";
                break;
            case "iPad2,1":
                fullName = "iPad 2 (WiFi)";
                break;
            case "iPad2,2":
                fullName = "iPad 2 (GSM)";
                break;
            case "iPad2,3":
                fullName = "iPad 2 (CDMA)";
                break;
            case "iPad2,4":
                fullName = "iPad 2 (WiFi Rev A)";
                break;
            case "iPad3,1":
                fullName = "iPad 3 (WiFi)";
                break;
            case "iPad3,2":
                fullName = "iPad 3 (CDMA)";
                break;
            case "iPad3,3":
                fullName = "iPad 3 (Global)";
                break;
            case "iPad3,4":
                fullName = "iPad 4 (WiFi)";
                break;
            case "iPad3,5":
                fullName = "iPad 4 (GSM)";
                break;
            case "iPad3,6":
                fullName = "iPad 4 (Global)";
                break;
            case "iPad4,1":
                fullName = "iPad Air (WiFi)";
                break;
            case "iPad4,2":
                fullName = "iPad Air (Global)";
                break;
            case "iPad5,3":
                fullName = "iPad Air 2G (WiFi)";
                break;
            case "iPad5,4":
                fullName = "iPad Air 2G (Global)";
                break;
            case "iPad2,5":
                fullName = "iPad Mini (WiFi)";
                break;
            case "iPad2,6":
                fullName = "iPad Mini (GSM)";
                break;
            case "iPad2,7":
                fullName = "iPad Mini (Global)";
                break;
            case "iPad4,4":
                fullName = "iPad Mini 2G (WiFi)";
                break;
            case "iPad4,5":
                fullName = "iPad Mini 2G (Global)";
                break;
            case "iPad4,7":
                fullName = "iPad Mini 3G (WiFi)";
                break;
            case "iPad4,8":
                fullName = "iPad Mini 3G (Global)";
                break;
            case "i386":
                fullName = "Simulator";
                break;
            case "x86_64":
                fullName = "Simulator";
                break;
            default:
                fullName = shortName;
        }

        return fullName;
    };

    function setMeta() {
        if (_deviceDb['meta']) {
            _devices = (_deviceDb['meta']['devices']) ? _deviceDb['meta']['devices'] : [];
        } else {
            _devices = [];
        }
    }

    function extendMeta() {
        if (_deviceDb['meta']) {
            _devices = countlyCommon.union(_devices, _deviceDb['meta']['devices']);
        }
    }

}(window.countlyDevice = window.countlyDevice || {}, jQuery));