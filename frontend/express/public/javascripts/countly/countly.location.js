(function () {

    // Private Properties
    var _periodObj = {},
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
        _countryMap = {};

    // Load local country names
    $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
        _countryMap = data;
    });
    
    window.countlyLocation = window.countlyLocation || {};
    countlyLocation.getCountryName = function (cc) {
        var countryName = _countryMap[cc.toUpperCase()];
        if (countryName) {
            return countryName;
        } else if(cc.toUpperCase() == "EU") {
            return jQuery.i18n.map["common.eu"] || "European Union";
        } else {
            return jQuery.i18n.map["common.unknown"] || "Unknown";
        }
    };
    CountlyHelpers.createMetricModel(window.countlyLocation, {name: "countries", estOverrideMetric:"countries"}, jQuery, countlyLocation.getCountryName);

    // Public Methods
    countlyLocation.initialize = function () {
        countlyLocation.setDb(countlySession.getDb());
    };

    countlyLocation.refresh = function (newJSON) {
        if(newJSON)
            countlyLocation.extendDb(newJSON);
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
            draw(options.metric);
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:function(){draw(options.metric);}});
        }
    };

    countlyLocation.refreshGeoChart = function (metric) {
        if (google.visualization) {
            reDraw(metric);
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:function(){draw(metric);}});
        }
    };

    countlyLocation.getLocationData = function (options) {

        var locationData = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
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
        ], "countries");
        locationData.chartData = countlyCommon.mergeMetricsByName(locationData.chartData, "country");
        locationData.chartData = _.sortBy(locationData.chartData, function(obj) { return -obj.t; });

        if (options && options.maxCountries && locationData.chartData) {
            if (locationData.chartData.length > options.maxCountries) {
                locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
            }
        }

        for (var i = 0; i < locationData.chartData.length; i++) {
            locationData.chartData[i]['country_flag'] =
                "<div class='flag' style='background-image:url("+countlyGlobal["path"]+"/images/flags/" + locationData.chartData[i]['code'] + ".png);'></div>" +
                locationData.chartData[i]['country'];
        }

        return locationData.chartData;
    };

    countlyLocation.changeLanguage = function () {
        // Load local country names
        return $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
            _countryMap = data;
        });
    };

    //Private Methods
    function draw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "countries");

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == jQuery.i18n.map["common.unknown"]) {
                return {c:[
                    {v:""},
                    {v:value[ob.metric]}
                ]};
            }
            return {c:[
                {v:value.country},
                {v:value[ob.metric]}
            ]};
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions['region'] = "world";
        _chartOptions['resolution'] = 'countries';
        _chartOptions["displayMode"] = "region";

        if (ob.metric == "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        } else if (ob.metric == "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        } else if (ob.metric == "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        // This is how you handle regionClick and change zoom for only a specific country

        if (countlyCommon.CITY_DATA !== false && _chartOptions.height > 300) {
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

    function reDraw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "countries");

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == jQuery.i18n.map["common.unknown"]) {
                return {c:[
                    {v:""},
                    {v:value[ob.metric]}
                ]};
            }
            return {c:[
                {v:value.country},
                {v:value[ob.metric]}
            ]};
        });

        if (ob.metric == "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        } else if (ob.metric == "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        } else if (ob.metric == "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _dataTable = new google.visualization.DataTable(chartData);
        _chart.draw(_dataTable, _chartOptions);
    }

}());