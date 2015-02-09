(function (countlyMetric, _name, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _Db = {},
        _metrics = [],
        _activeAppKey = 0,
        _initialized = false,
        _period = null;

    //Public Methods
    countlyMetric.initialize = function () {
        if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return this.refresh();
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
                    "method":_name,
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    _Db = json;
                    setMeta();
                }
            });
        } else {
            _Db = {"2012":{}};
            return true;
        }
    };

    countlyMetric.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return this.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":_name,
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_Db, json);
                    extendMeta();
                }
            });
        } else {
            _Db = {"2012":{}};

            return true;
        }
    };

    countlyMetric.reset = function () {
        _Db = {};
        setMeta();
    };

    countlyMetric.getData = function () {

        var chartData = countlyCommon.extractTwoLevelData(_Db, _metrics, this.clearObject, [
            {
                name:_name,
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        var namesData = _.pluck(chartData.chartData, _name),
            totalData = _.pluck(chartData.chartData, 't'),
            newData = _.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        var sum = _.reduce(totalData, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < namesData.length; i++) {
            var percent = (totalData[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, totalData[i]]
            ], label:namesData[i]};
        }

        var sum2 = _.reduce(newData, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < namesData.length; i++) {
            var percent = (newData[i] / sum) * 100;
            chartData3[i] = {data:[
                [0, newData[i]]
            ], label:namesData[i]};
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyMetric.clearObject = function (obj) {
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

    countlyMetric.getBars = function () {
        return countlyCommon.extractBarData(_Db, _metrics, this.clearObject);
    };

    function setMeta() {
        if (_Db['meta']) {
            _metrics = (_Db['meta'][_name]) ? _Db['meta'][_name] : [];
        } else {
            _metrics = [];
        }
    }

    function extendMeta() {
        if (_Db['meta']) {
            _metrics = countlyCommon.union(_metrics, _Db['meta'][_name]);
        }
    }

}(window.countlyDensity = window.countlyDensity || {}, "density", jQuery));