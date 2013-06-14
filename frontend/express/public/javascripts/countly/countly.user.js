(function (countlyUser, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _userDb = {},
        _lolayties = [],
        _frequencies = [],
        _activeAppKey = 0,
        _initialized = false;

    //Public Methods
    countlyUser.initialize = function () {
        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"users"
                },
                dataType:"jsonp",
                success:function (json) {
                    _userDb = json;
                    setMeta();
                }
            });
        } else {
            _userDb = {"2012":{}};
            return true;
        }
    };

    countlyUser.refresh = countlyUser.initialize;

    countlyUser.reset = function () {
        _userDb = {};
        setMeta();
    };

    countlyUser.getFrequencyData = function () {

        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_userDb, "f", _frequencies, countlyUser.explainFrequencyRange);

        var frequencies = _.pluck(chartData.chartData, "f"),
            frequencyTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][frequencies.length + 1] = [frequencies.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([frequencies.length, ""]);

        for (var i = 0; i < frequencies.length; i++) {
            chartDP[0]["data"][i + 1] = [i, frequencyTotals[i]];
            chartData.chartDP.ticks.push([i, frequencies[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };

    countlyUser.getLoyaltyData = function () {

        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_userDb, "l", _lolayties, countlyUser.explainLoyaltyRange);

        var loyalties = _.pluck(chartData.chartData, "l"),
            loyaltyTotals = _.pluck(chartData.chartData, 't'),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][loyalties.length + 1] = [loyalties.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([loyalties.length, ""]);

        for (var i = 0; i < loyalties.length; i++) {
            chartDP[0]["data"][i + 1] = [i, loyaltyTotals[i]];
            chartData.chartDP.ticks.push([i, loyalties[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };

    countlyUser.getLoyaltyDP = function () {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = [
                { data:[], label:jQuery.i18n.map["user-loyalty.loyalty"] }
            ],
            ticks = [],
            rangeUsers;

        for (var j = 0; j < _lolayties.length; j++) {

            rangeUsers = 0;

            if (!_periodObj.isSpecialPeriod) {
                for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.activePeriod + "." + i + "." + "l");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_lolayties[j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, _lolayties[j]];
                }
            } else {
                for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.currentPeriodArr[i] + "." + "l");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_lolayties[j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, _lolayties[j]];
                }
            }
        }

        return {
            dp:dataArr,
            ticks:ticks
        };
    };

    countlyUser.explainFrequencyRange = function (index) {
        var localHours = jQuery.i18n.map["user-loyalty.range.hours"],
            localDay = jQuery.i18n.map["user-loyalty.range.day"],
            localDays = jQuery.i18n.map["user-loyalty.range.days"];

        var frequencyRange = [
            jQuery.i18n.map["user-loyalty.range.first-session"],
            "1-24 " + localHours,
            "1 " + localDay,
            "2 " + localDays,
            "3 " + localDays,
            "4 " + localDays,
            "5 " + localDays,
            "6 " + localDays,
            "7 " + localDays,
            "8-14 " + localDays,
            "15-30 " + localDays,
            "30+ " + localDays
        ];

        return frequencyRange[index];
    };

    countlyUser.explainLoyaltyRange = function (index) {
        var loyaltyRange = [
            "1",
            "2",
            "3-5",
            "6-9",
            "10-19",
            "20-49",
            "50-99",
            "100-499",
            "> 500"
        ];

        return loyaltyRange[index];
    };

    function setMeta() {
        if (_userDb['meta']) {
            _lolayties = (_userDb['meta']['l-ranges']) ? _userDb['meta']['l-ranges'] : [];
            _frequencies = (_userDb['meta']['f-ranges']) ? _userDb['meta']['f-ranges'] : [];
        } else {
            _lolayties = [];
            _frequencies = [];
        }
    }
}(window.countlyUser = window.countlyUser || {}, jQuery));