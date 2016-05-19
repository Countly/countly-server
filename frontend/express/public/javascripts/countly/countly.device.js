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
        ], "devices");
        
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, "device");

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
		if(countlyDeviceList && countlyDeviceList[shortName])
			return countlyDeviceList[shortName];
        return shortName;
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