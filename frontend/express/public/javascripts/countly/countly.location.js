(function (countlyLocation, $, undefined) {

    // Private Properties
    var _periodObj = {},
        _locationsDb = {},
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
		_countryEnMap = {},
		_echart,
		_echartOption = {
			title : {
				text: '',
				x:'center'
			},tooltip : {
				trigger: 'item'
			},dataRange: {
				min: 0,
				max: 0,
				calculable : true,
				splitNumber:0,
				color: ['orangered','yellow','lightskyblue']
			}, series : [
				{
					name: '',
					type: 'map',
					mapType: 'world',
					selectedMode : 'single',
					itemStyle:{
						normal:{label:{show:false}},
						emphasis:{label:{show:true}}
					}
				}
			]
		};

    // Load local country names
    $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
        _countryMap = data;
    });
	
	$.get('localization/countries/en/country.json', function (data) {
        _countryEnMap = data;
    });

    // Public Methods
    countlyLocation.initialize = function () {
        _locationsDb = countlyUser.getDbObj();
        setMeta();
    };

    countlyLocation.refresh = function (newJSON) {
        countlyCommon.extendDbObj(_locationsDb, newJSON);
        extendMeta();
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
			if(google.visualization.GeoChart){
				draw(options.metric);
			}else{
				if (window.echarts) {
					drawByECharts(options.metric);
				}else{
					CountlyHelpers.loadJS("province/javascripts/baidu/echarts-all.js", drawByECharts);
				}
			}
        } else {
            google.load('visualization', '1', {'packages':['geochart'], callback:draw});
        }
    };

    countlyLocation.refreshGeoChart = function (metric) {
        if (google.visualization) {
            reDraw(metric);
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
        return $.get('localization/countries/' + countlyCommon.BROWSER_LANG_SHORT + '/country.json', function (data) {
            _countryMap = data;
        });
    };

    //Private Methods
    function draw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

		if(!google.visualization.GeoChart){
			return;
		}

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _countries, countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == "Unknown") {
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

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _countries, countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return _echart?countlyLocation.getCountryEnName(rangeArr):countlyLocation.getCountryName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        chartData.cols = [
            {id:'country', label:jQuery.i18n.map["countries.table.country"], type:'string'}
        ];
        chartData.cols.push(ob);
        chartData.rows = _.map(tt.chartData, function (value, key, list) {
            if (value.country == "European Union" || value.country == "Unknown") {
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

		if(google.visualization.GeoChart){
			_dataTable = new google.visualization.DataTable(chartData);
			_chart.draw(_dataTable, _chartOptions);
		}else{
			if (window.echarts) {
				var max_value = 0;
				var geoData = [];
				for(var j=0;j<tt.chartData.length;j++){
					var item = {};
					item.name = tt.chartData[j].country;
					switch(ob.metric){
						case "t":
							item.value = tt.chartData[j].t;
							break;
						case "u":
							item.value = tt.chartData[j].u;
							break;
						case "n":
							item.value = tt.chartData[j].n;
							break;
					}
					if(item.value > max_value){
						max_value = item.value;
					}
					geoData.push(item);
				}
				_echart.setOption( {
					title : {
						text: ob.label,
					},dataRange: {
						max: max_value,
					}, series : [
						{
							name: ob.label
							, data: geoData
						}
					]
				} );
				_echart.refresh();
			}
		}
    }

    function setMeta() {
        if (_locationsDb['meta']) {
            _countries = (_locationsDb['meta']['countries']) ? _locationsDb['meta']['countries'] : [];
        } else {
            _countries = [];
        }
    }

    function extendMeta() {
        if (_locationsDb['meta']) {
            _countries = countlyCommon.union(_countries, _locationsDb['meta']['countries']);
        }
    }

	countlyLocation.getCountryEnName = function (cc) {
        var countryName = _countryEnMap[cc.toUpperCase()];

        if (countryName) {
            return countryName;
        } else {
            return "Unknown";
        }
    };
	
	function drawByECharts(ob){
		ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
		
		var tt = countlyCommon.extractTwoLevelData(_locationsDb, _countries, countlyLocation.clearLocationObject, [
            {
                "name":"country",
                "func":function (rangeArr, dataObj) {
                    return countlyLocation.getCountryEnName(rangeArr);
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);
		
		var max_value = 0;
		var geoData = [];
		for(var j=0;j<tt.chartData.length;j++){
			var item = {};
			item.name = tt.chartData[j].country;
			switch(ob.metric){
				case "t":
					item.value = tt.chartData[j].t;
					break;
				case "u":
					item.value = tt.chartData[j].u;
					break;
				case "n":
					item.value = tt.chartData[j].n;
					break;
			}
			if(item.value > max_value){
				max_value = item.value;
			}
			geoData.push(item);
		}
		
		$("#geo-chart").height( _chartOptions.height );
		$("#geo-chart").width( _chartOptions.width );
		_echartOption.title.text = ob.label;
		_echartOption.dataRange.max = max_value;
		_echartOption.series[0].name = ob.label;
		_echartOption.series[0].data = geoData;
		
		_echart = echarts.init(document.getElementById(_chartElementId));
		
		if (countlyCommon.CITY_DATA !== false && _chartOptions.height > 300) {
			_echart.on(echarts.config.EVENT.MAP_SELECTED, function(param){
				var selected = param.selected;
				var selectedCountry;
				var name;
				for (var i = 0, l = _echartOption.series[0].data.length; i < l; i++) {
					name = _echartOption.series[0].data[i].name;
					_echartOption.series[0].data[i].selected = selected[name];
					if (selected[name]) {
						selectedCountry = name;
					}
				}
				// for some region has no ddata
				if(!selectedCountry){
					return;
				}
				
				var activeAppCountry = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country;
				if (activeAppCountry && selectedCountry == countlyLocation.getCountryEnName(activeAppCountry)) {
					_chartOptions['region'] = selectedCountry;
					_chartOptions['resolution'] = 'countries';

					$(document).trigger('selectMapCountry');
				}
			});
		}else{
			_echartOption.dataRange.show = false;
		}
		_echart.setOption(_echartOption);
	}

}(window.countlyLocation = window.countlyLocation || {}, jQuery));
