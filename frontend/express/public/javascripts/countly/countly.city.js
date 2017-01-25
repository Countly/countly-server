(function () {

    // Private Properties
    var _periodObj = {},
        _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode:'markers',
            colorAxis:{minValue:0, colors:['#D7F1D8', '#6BB96E']},
            resolution:'countries',
            toolTip:{textStyle:{color:'#FF0000'}, showColorCode:false},
            legend:"none",
            backgroundColor:"transparent",
            datalessRegionColor:"#FFF",
            region:"TR"
        };

    if (countlyCommon.CITY_DATA === false) {
        countlyCity.initialize = function() { return true; };
        countlyCity.refresh = function() { return true; };
        countlyCity.drawGeoChart = function() { return true; };
        countlyCity.refreshGeoChart = function() { return true; };
        countlyCity.getLocationData = function() { return []; };
    } else {
        window.countlyCity = window.countlyCity || {};
        CountlyHelpers.createMetricModel(window.countlyCity, {name: "cities", estOverrideMetric:"cities"}, jQuery, function (rangeArr, dataObj) {
            if(rangeArr == "Unknown")
                return jQuery.i18n.map["common.unknown"];
            return rangeArr;
        });

        countlyCity.drawGeoChart = function (options) {

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
                google.load('visualization', '1', {'packages':['geochart'], callback:draw});
            }
        };

        countlyCity.refreshGeoChart = function (metric) {
            if (google.visualization) {
                reDraw(metric);
            } else {
                google.load('visualization', '1', {'packages':['geochart'], callback:draw});
            }
        };

        countlyCity.getLocationData = function (options) {

            var locationData = countlyCity.getData();

            if (options && options.maxCountries && locationData.chartData) {
                if (locationData.chartData.length > options.maxCountries) {
                    locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
                }
            }

            return locationData.chartData;
        };
    }

    //Private Methods
    function draw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
            {
                "name":"city",
                "func":function (rangeArr, dataObj) {
                    if(rangeArr == "Unknown")
                        return jQuery.i18n.map["common.unknown"];
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "cities");

        chartData.cols = [
            {id:'city', label:"City", type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.city == jQuery.i18n.map["common.unknown"]) {
                return {c:[
                    {v:""},
                    {v:value[ob.metric]}
                ]};
            }
            return {c:[
                {v:value.city},
                {v:value[ob.metric]}
            ]};
        });

        _dataTable = new google.visualization.DataTable(chartData);

        if (countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country) {
            _chartOptions['region'] = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country;
        }

        _chartOptions['resolution'] = 'countries';
        _chartOptions["displayMode"] = "markers";

        if (ob.metric == "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        } else if (ob.metric == "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        } else if (ob.metric == "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _chart.draw(_dataTable, _chartOptions);
    }

    function reDraw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

        var tt = countlyCommon.extractTwoLevelData(countlyCity.getDb(), countlyCity.getMeta(), countlyCity.clearObject, [
            {
                "name":"city",
                "func":function (rangeArr, dataObj) {
                    if(rangeArr == "Unknown")
                        return jQuery.i18n.map["common.unknown"];
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], "cities");

        chartData.cols = [
            {id:'city', label:"City", type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.city == jQuery.i18n.map["common.unknown"]) {
                return {c:[
                    {v:""},
                    {v:value[ob.metric]}
                ]};
            }
            return {c:[
                {v:value.city},
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