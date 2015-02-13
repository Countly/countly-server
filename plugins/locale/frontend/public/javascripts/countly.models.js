(function (countlyLanguage, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _languageDb = {},
        _languages = [],
        _activeAppKey = 0,
        _initialized = false,
        _period = null;

    //Public Methods
    countlyLanguage.initialize = function () {
        if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyLanguage.refresh();
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
                    "method":"langs",
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    _languageDb = json;
                    setMeta();
                }
            });
        } else {
            _languageDb = {"2012":{}};
            return true;
        }
    };

    countlyLanguage.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyLanguage.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"langs",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_languageDb, json);
                    extendMeta();
                }
            });
        } else {
            _languageDb = {"2012":{}};

            return true;
        }
    };

    countlyLanguage.reset = function () {
        _languageDb = {};
        setMeta();
    };

    countlyLanguage.getLanguageData = function () {

        var chartData = countlyCommon.extractTwoLevelData(_languageDb, _languages, countlyLanguage.clearLanguageObject, [
            {
                name:"language",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        var languageNames = _.pluck(chartData.chartData, 'language'),
            languageTotal = _.pluck(chartData.chartData, 't'),
            languageNew = _.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        var sum = _.reduce(languageTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < languageNames.length; i++) {
            var percent = (languageTotal[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, languageTotal[i]]
            ], label:languageNames[i]};
        }

        var sum2 = _.reduce(languageNew, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < languageNames.length; i++) {
            var percent = (languageNew[i] / sum) * 100;
            chartData3[i] = {data:[
                [0, languageNew[i]]
            ], label:languageNames[i]};
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyLanguage.clearLanguageObject = function (obj) {
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

    countlyLanguage.getLanguageBars = function () {
        return countlyCommon.extractBarData(_languageDb, _languages, countlyLanguage.clearLanguageObject);
    };

    function setMeta() {
        if (_languageDb['meta']) {
            _languages = (_languageDb['meta']['langs']) ? _languageDb['meta']['langs'] : [];
        } else {
            _languages = [];
        }
    }

    function extendMeta() {
        if (_languageDb['meta']) {
            _languages = countlyCommon.union(_languages, _languageDb['meta']['langs']);
        }
    }

}(window.countlyLanguage = window.countlyLanguage || {}, jQuery));