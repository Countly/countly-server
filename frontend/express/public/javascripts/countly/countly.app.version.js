(function (countlyAppVersion, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _appVersionsDb = {},
        _app_versions = [],
        _activeAppKey = 0,
        _initialized = false;

    //Public Methods
    countlyAppVersion.initialize = function () {
        if (_initialized && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyAppVersion.refresh();
        }

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r || "/o",
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"app_versions"
                },
                dataType:"jsonp",
                success:function (json) {
                    _appVersionsDb = json;
                    setMeta();
                }
            });
        } else {
            _appVersionsDb = {"2012":{}};
            return true;
        }
    };

    countlyAppVersion.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyAppVersion.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"app_versions",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_appVersionsDb, json);
                    setMeta();
                }
            });
        } else {
            _appVersionsDb = {"2012":{}};
            return true;
        }
    };

    countlyAppVersion.reset = function () {
        _appVersionsDb = {};
        setMeta();
    };

    countlyAppVersion.clearAppVersionsObject = function (obj) {
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

    countlyAppVersion.getAppVersionBars = function () {
        return countlyCommon.extractBarData(_appVersionsDb, _app_versions, countlyAppVersion.clearAppVersionsObject);
    };

    countlyAppVersion.getAppVersionData = function (os) {

        var appVersionData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        var tmpAppVersionData = countlyCommon.extractTwoLevelData(_appVersionsDb, _app_versions, countlyAppVersion.clearAppVersionsObject, [
            {
                name:"app_version",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        appVersionData.chartData = tmpAppVersionData.chartData;

        if (appVersionData.chartData) {
            for (var i = 0; i < appVersionData.chartData.length; i++) {
                appVersionData.chartData[i].app_version = appVersionData.chartData[i].app_version.replace(/:/g, ".");
            }
        }

        var appVersions = _.pluck(appVersionData.chartData, "app_version"),
            appVersionTotal = _.pluck(appVersionData.chartData, 't'),
            appVersionNew = _.pluck(appVersionData.chartData, 'n'),
            chartDP = [
                {data:[], label:jQuery.i18n.map["common.table.total-sessions"]},
                {data:[], label:jQuery.i18n.map["common.table.new-users"]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][appVersions.length + 1] = [appVersions.length, null];

        appVersionData.chartDP.ticks.push([-1, ""]);
        appVersionData.chartDP.ticks.push([appVersions.length, ""]);

        for (var i = 0; i < appVersions.length; i++) {
            chartDP[0]["data"][i + 1] = [i, appVersionTotal[i]];
            chartDP[1]["data"][i + 1] = [i, appVersionNew[i]];
            appVersionData.chartDP.ticks.push([i, appVersions[i]]);
        }

        appVersionData.chartDP.dp = chartDP;

        return appVersionData;
    };

    function setMeta() {
        if (_appVersionsDb['meta']) {
            _app_versions = (_appVersionsDb['meta']['app_versions']) ? _appVersionsDb['meta']['app_versions'] : [];
        } else {
            _app_versions = [];
        }
    }

}(window.countlyAppVersion = window.countlyAppVersion || {}, jQuery));
