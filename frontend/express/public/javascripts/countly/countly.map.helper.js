/* global countlyGlobal, google, _, jQuery, countlyLocation*/
(function(countlyMapHelper) {

    // Private Properties
    var _chart,
        _dataTable,
        _chartElementId = "geo-chart",
        _chartOptions = {
            displayMode: 'region',
            colorAxis: {minValue: 0, colors: ['#D7F1D8', '#6BB96E']},
            resolution: 'countries',
            toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
            legend: "none",
            backgroundColor: "transparent",
            datalessRegionColor: "#FFF"
        },
        _mapData = [];

    countlyMapHelper.drawGeoChart = function(options, locationData) {
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
        }
        else {
            var googleChartsOptions = {packages: ['geochart'], callback: draw};

            if (countlyGlobal.config.google_maps_api_key) {
                googleChartsOptions.mapsApiKey = countlyGlobal.config.google_maps_api_key;
            }

            google.charts.load('current', googleChartsOptions);
        }
    };

    //Private Methods
    /** draw function
    */
    function draw() {
        var chartData = {cols: [], rows: []};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'},
            {id: 'total', label: jQuery.i18n.map["common.total"], type: 'number'}
        ];

        chartData.rows = _.map(_mapData, function(value) {
            if (value.value === 0) {
                return;
            }
            value.country = countlyLocation.getCountryName(value.country);

            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value.value}
                    ]
                };
            }
            return {
                c: [
                    {v: value.country},
                    {v: value.value}
                ]
            };
        }).filter(function(row) {
            return row;
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions.region = "world";
        _chartOptions.resolution = 'countries';
        _chartOptions.displayMode = "region";

        _chart.draw(_dataTable, _chartOptions);
    }

}(window.countlyMapHelper = window.countlyMapHelper || {}));