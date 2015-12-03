(function (countlyMapHelper, $, undefined) {

    // Private Properties
    var _chart,
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
        _mapData = [],
        _countryMap = {};

    $.get('localization/countries/en/country.json', function (data) {
        _countryMap = data;
    });

    countlyMapHelper.drawGeoChart = function (options, locationData) {
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

        _mapData = locationData;

        if (google.visualization) {
            draw();
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:draw});
        }
    };

    //Private Methods
    function draw() {
        var chartData = {cols:[], rows:[]};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'},
            {id:'total', label:jQuery.i18n.map["common.total"], type:'number'}
        ];

        chartData.rows = _.map(_mapData, function (value, key, list) {
            value.country = _countryMap[value.country] || jQuery.i18n.map["common.unknown"] || "Unknown";

            if (value.country == "European Union" || value.country == jQuery.i18n.map["common.unknown"]) {
                return {c:[
                    {v:""},
                    {v:value.value}
                ]};
            }
            return {c:[
                {v:value.country},
                {v:value.value}
            ]};
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions['region'] = "world";
        _chartOptions['resolution'] = 'countries';
        _chartOptions["displayMode"] = "region";

        _chart.draw(_dataTable, _chartOptions);
    }

}(window.countlyMapHelper = window.countlyMapHelper || {}, jQuery));