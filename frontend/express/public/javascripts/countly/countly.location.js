(function (countlyLocation, $, undefined) {

    // Private Properties
    var _periodObj = {},
        _locationsDb = {},
        _activeAppKey = 0,
        _countries = [],
        _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode:'region',
            colorAxis:{minValue:0, colors:['#D7F1D8', '#6BB96E']},
            resolution:'countries',
            toolTip:{textStyle:{color:'#FF0000'}, showColorCode:false},
            legend:"none",
            backgroundColor:"transparent",
            datalessRegionColor:"#FFF"
        },
        _countryMap = {},
        _initialized = false;

    // Public Methods
    countlyLocation.initialize = function () {
        if (_initialized && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyLocation.refresh();
        }

        // Load local country names
        $.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
            _countryMap = data;
        });

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"locations"
                },
                dataType:"jsonp",
                success:function (json) {
                    _locationsDb = json;
                    setMeta();
                }
            });
        } else {
            _locationsDb = {"2012":{}};
            return true;
        }
    };

    countlyLocation.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return countlyLocation.initialize();
            }

            return $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"locations",
                    "action":"refresh"
                },
                dataType:"jsonp",
                success:function (json) {
                    countlyCommon.extendDbObj(_locationsDb, json);
                    setMeta();
                }
            });
        } else {
            _locationsDb = {"2012":{}};
            return true;
        }
    };

    countlyLocation.reset = function () {
        _locationsDb = {};
        setMeta();
    };

    countlyLocation.drawGeoChart = function (options) {

        _periodObj = countlyCommon.periodObj;

        if (options) {
            if (options.chartElementId) {
                _chartElementId = options.chartElementId;
            }

            if (options.height) {
                _chartOptions.height = options.height;

                //preserve the aspect ratio of the chart if height is given
                _chartOptions.width = (options.height * 556 / 347);
            }
        }

        if (google.visualization) {
            draw();
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:draw});
        }
    };

    countlyLocation.refreshGeoChart = function () {
        if (google.visualization) {
            reDraw();
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:draw});
        }
    };

    countlyLocation.getLocationData = function (options) {

        var locationData = countlyCommon.extractTwoLevelData(_locationsDb, _countries, countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            {
                "name":"code",
                "func":function (rangeArr, dataObj) {
                    return rangeArr.toLowerCase();
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        if (options && options.maxCountries && locationData.chartData) {
            if (locationData.chartData.length > options.maxCountries) {
                locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
            }
        }

        return locationData.chartData;
    };

    countlyLocation.clearLocationObject = function (obj) {
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

    countlyLocation.getCountryName = function (cc) {
        var countryName = _countryMap[cc.toUpperCase()];

        if (countryName) {
            return countryName;
        } else {
            return "Unknown";
        }
    };

    countlyLocation.changeLanguage = function () {
        // Load local country names
        return $.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
            _countryMap = data;
        });
    };

    //Private Methods
    function draw() {
        var chartData = {cols:[], rows:[]};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _countries, countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" }
        ]);

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'},
            {id:'total', label:jQuery.i18n.map["common.total"], type:'number'}
        ];
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == "Unknown") {
                return {c:[
                    {v:""},
                    {v:value["t"]}
                ]};
            }
            return {c:[
                {v:value.country},
                {v:value["t"]}
            ]};
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions['region'] = "world";
        _chartOptions['resolution'] = 'countries';
        _chartOptions["displayMode"] = "region";

        // This is how you handle regionClick and change zoom for only a specific country

        if (countlyCommon.CITY_DATA === true && _chartOptions.height > 300) {
            google.visualization.events.addListener(_chart, 'regionClick', function (eventData) {
                var activeAppCountry = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country;
                if (activeAppCountry && eventData.region == activeAppCountry) {
                    _chartOptions['region'] = eventData.region;
                    _chartOptions['resolution'] = 'countries';
                    _chart.draw(_dataTable, _chartOptions);

                    $(document).trigger('selectMapCountry');
                }
            });
        }

        _chart.draw(_dataTable, _chartOptions);
    }

    function reDraw() {
        var chartData = {cols:[], rows:[]};

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _locationsDb["countries"], countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" }
        ]);

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'},
            {id:'total', label:jQuery.i18n.map["common.total"], type:'number'}
        ];
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == "Unknown") {
                return {c:[
                    {v:""},
                    {v:value["t"]}
                ]};
            }
            return {c:[
                {v:value.country},
                {v:value["t"]}
            ]};
        });

        _dataTable = new google.visualization.DataTable(chartData);
        _chart.draw(_dataTable, _chartOptions);
    }

    function geoDataSortHelper(a, b) {
        return ((a["t"] > b["t"]) ? -1 : ((a["t"] < b["t"]) ? 1 : 0));
    }

    function setMeta() {
        if (_locationsDb['meta']) {
            _countries = (_locationsDb['meta']['countries']) ? _locationsDb['meta']['countries'] : [];
        } else {
            _countries = [];
        }
    }
}(window.countlyLocation = window.countlyLocation || {}, jQuery));