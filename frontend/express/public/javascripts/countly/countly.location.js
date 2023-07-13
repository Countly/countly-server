/* global countlyCommon, countlyLocation, CountlyHelpers, countlySession, google, _, countlyGlobal, Backbone, jQuery, $, T*/
(function() {

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
        _regionMap = {},
        _countryMap = {};

    // Load local country names
    T.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
        _countryMap = data;
    });

    T.get('/localization/countries/en/region.json', function(data) {
        _regionMap = data;
    });

    window.countlyLocation = window.countlyLocation || {};
    countlyLocation.getCountryName = function(cc) {
        var countryName = _countryMap[cc && (cc + "").toUpperCase()];
        if (countryName) {
            return countryName;
        }
        else if (cc && (cc + "").toUpperCase() === "EU") {
            return jQuery.i18n.map["common.eu"] || "European Union";
        }
        else {
            return jQuery.i18n.map["common.unknown"] || "Unknown";
        }
    };

    countlyLocation.getCodesFromName = function(name) {
        var codes = [];
        var lowerCase = name.toLowerCase();
        for (var p in _countryMap) {
            if (_countryMap[p].toLowerCase().startsWith(lowerCase)) {
                codes.push(p);
            }
        }
        return codes;
    };


    CountlyHelpers.createMetricModel(window.countlyLocation, {name: "countries", estOverrideMetric: "countries"}, jQuery, countlyLocation.getCountryName);

    countlyLocation.getRegionName = function(rgn, country) {
        return _regionMap[rgn] || _regionMap[country + "-" + rgn] || rgn;
    };

    // Public Methods
    countlyLocation.initialize = function() {
        countlyLocation.setDb(countlySession.getDb());
    };

    countlyLocation.refresh = function(newJSON) {
        if (newJSON) {
            countlyLocation.extendDb(newJSON);
        }
    };

    countlyLocation.drawGeoChart = function(options) {
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
        }
        else {
            var googleChartsOptions = {
                packages: ['geochart'],
                callback: function() {
                    draw(options.metric);
                }
            };

            if (countlyGlobal.config.google_maps_api_key) {
                googleChartsOptions.mapsApiKey = countlyGlobal.config.google_maps_api_key;
            }

            google.charts.load("current", googleChartsOptions);
        }
    };

    countlyLocation.refreshGeoChart = function(metric) {
        if (google.visualization) {
            if (_chart === undefined) {
                draw(metric);
            }
            else {
                reDraw(metric);
            }
        }
        else {
            var googleChartsOptions = {
                packages: ['geochart'],
                callback: function() {
                    draw(metric);
                }
            };

            if (countlyGlobal.config.google_maps_api_key) {
                googleChartsOptions.mapsApiKey = countlyGlobal.config.google_maps_api_key;
            }

            google.charts.load("current", googleChartsOptions);
        }
    };

    countlyLocation.orderByType = function(type, locationData) {
        return _.sortBy(locationData, function(obj) {
            return -obj[type];
        });
    };

    countlyLocation.getLocationData = function(options) {

        var locationData = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            {
                "name": "code",
                "func": function(rangeArr) {
                    return rangeArr.toLowerCase();
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");
        locationData.chartData = countlyCommon.mergeMetricsByName(locationData.chartData, "country");
        locationData.chartData = _.sortBy(locationData.chartData, function(obj) {
            return -obj.t;
        });

        if (options && options.maxCountries && locationData.chartData) {
            if (locationData.chartData.length > options.maxCountries) {
                locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
            }
        }

        for (var i = 0; i < locationData.chartData.length; i++) {
            locationData.chartData[i].country_flag =
                "<div class='flag " + locationData.chartData[i].code + "' style='margin-top:2px; background-image:url(" + countlyGlobal.path + "/images/flags/" + locationData.chartData[i].code + ".png);'></div>" +
                locationData.chartData[i].country;
        }

        return locationData.chartData;
    };

    countlyLocation.changeLanguage = function() {
        // Load local country names
        return T.get('/localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function(data) {
            _countryMap = data;
        });
    };

    //Private Methods
    /** funstion draw
    * @param {object} ob - data
    */
    function draw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value[ob.metric] === 0) {
                return;
            }
            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric] === 0 ? null : value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    //v - value, f - formatted value
                    {v: value.country, f: countlyLocation.getCountryName(value.country)},
                    {v: value[ob.metric] === 0 ? null : value[ob.metric]}
                ]
            };
        }).filter(function(row) {
            return row;
        });

        _dataTable = new google.visualization.DataTable(chartData);

        _chartOptions.region = "world";
        _chartOptions.resolution = 'countries';
        _chartOptions.displayMode = "region";
        _chartOptions.datalessRegionColor = "#F5F5F5";
        _chartOptions.defaultColor = "#F5F5F5";

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        // This is how you handle regionClick and change zoom for only a specific country
        if (countlyCommon.CITY_DATA !== false && Backbone.history.fragment === "/analytics/countries") {
            google.visualization.events.addListener(_chart, 'regionClick', function(eventData) {
                var activeAppCountry = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
                if (activeAppCountry && eventData.region === activeAppCountry) {
                    _chartOptions.region = eventData.region;
                    _chartOptions.resolution = 'countries';
                    _chart.draw(_dataTable, _chartOptions);

                    $(document).trigger('selectMapCountry');
                }
            });
        }

        _chart.draw(_dataTable, _chartOptions);
    }
    /** function redraw
    * @param {object} ob - data
    */
    function reDraw(ob) {
        ob = ob || {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"};
        var chartData = {cols: [], rows: []};

        var tt = countlyCommon.extractTwoLevelData(countlyLocation.getDb(), countlyLocation.getMeta(), countlyLocation.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");

        chartData.cols = [
            {id: 'country', label: jQuery.i18n.map["countries.table.country"], type: 'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function(value) {
            if (value[ob.metric] === 0) {
                return;
            }
            if (value.country === "European Union" || value.country === jQuery.i18n.map["common.unknown"]) {
                return {
                    c: [
                        {v: ""},
                        {v: value[ob.metric]}
                    ]
                };
            }
            return {
                c: [
                    //v - value, f - formatted value
                    {v: value.country, f: countlyLocation.getCountryName(value.country)},
                    {v: value[ob.metric]}
                ]
            };
        }).filter(function(row) {
            return row;
        });

        if (ob.metric === "t") {
            _chartOptions.colorAxis.colors = ['#CAE3FB', '#52A3EF'];
        }
        else if (ob.metric === "u") {
            _chartOptions.colorAxis.colors = ['#FFDBB2', '#FF8700'];
        }
        else if (ob.metric === "n") {
            _chartOptions.colorAxis.colors = ['#B2ECEA', '#0EC1B9'];
        }

        _dataTable = new google.visualization.DataTable(chartData);
        _chart.draw(_dataTable, _chartOptions);
    }

}());