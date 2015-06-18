(function (countlyUser, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _userDb = {},
        _loyalties = [],
        _frequencies = [],
        _activeAppKey = 0,
        _initialized = false,
        _period = null;

    //Public Methods
    countlyUser.initialize = function () {
        if (_initialized && _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyUser.refresh();
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
                    "method":"users",
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    _userDb = json;
                    setMeta();

                    countlySession.initialize();
                    countlyLocation.initialize();
                }
            });
        } else {
            return true;
        }
    };

    countlyUser.refresh = function () {
        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyUser.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"users",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_userDb, json);
                    extendMeta();

                    countlySession.refresh(json);
                    countlyLocation.refresh(json);
                }
            });
        } else {
            return true;
        }
    };

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

        chartData.chartData = countlyCommon.extractRangeData(_userDb, "l", _loyalties, countlyUser.explainLoyaltyRange);

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

        for (var j = 0; j < _loyalties.length; j++) {

            rangeUsers = 0;

            if (!_periodObj.isSpecialPeriod) {
                for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.activePeriod + "." + i + "." + "l");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_loyalties[j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, _loyalties[j]];
                }
            } else {
                for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {

                    var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.currentPeriodArr[i] + "." + "l");
                    tmp_x = clearLoyaltyObject(tmp_x);

                    rangeUsers += tmp_x[_loyalties[j]];
                }

                if (rangeUsers != 0) {
                    dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
                    ticks[j] = [j, _loyalties[j]];
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

    countlyUser.getFrequencyIndex = function (frequency) {
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

        return frequencyRange.indexOf(frequency);
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

    countlyUser.getLoyaltyIndex = function (loyalty) {
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

        return loyaltyRange.indexOf(loyalty);
    };

    countlyUser.isInitialized = function() {
        return _initialized;
    };

    countlyUser.getDbObj = function() {
        return _userDb;
    };

    function setMeta() {
        if (_userDb['meta']) {
            _loyalties = (_userDb['meta']['l-ranges']) ? _userDb['meta']['l-ranges'] : [];
            _frequencies = (_userDb['meta']['f-ranges']) ? _userDb['meta']['f-ranges'] : [];
        } else {
            _loyalties = [];
            _frequencies = [];
        }
    }

    function extendMeta() {
        if (_userDb['meta']) {
            _loyalties = countlyCommon.union(_loyalties, _userDb['meta']['l-ranges']);
            _frequencies = countlyCommon.union(_frequencies, _userDb['meta']['f-ranges']);
        }
    }

}(window.countlyUser = window.countlyUser || {}, jQuery));