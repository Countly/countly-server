(function (countlyCity, $, undefined) {

    // Private Properties
    var _periodObj = {},
        _locationsDb = {},
        _activeAppKey = 0,
        _cities = [],
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
        },
        _initialized = false,
        _period = null,
		_geoCoord = {
			"海门":[121.15,31.89],
			"鄂尔多斯":[109.781327,39.608266],
			"招远":[120.38,37.35],
			"Zhoushan":[122.207216,29.985295],
			"齐齐哈尔":[123.97,47.33],
			"Yancheng":[120.13,33.38],
			"赤峰":[118.87,42.28],
			"Qingdao":[120.33,36.07],
			"乳山":[121.52,36.89],
			"金昌":[102.188043,38.520089],
			"Quanzhou":[118.58,24.93],
			"莱西":[120.53,36.86],
			"Rizhao":[119.46,35.42],
			"胶南":[119.97,35.88],
			"Nantong":[121.05,32.08],
			"Lasa":[91.11,29.97],
			"Yunfu":[112.02,22.93],
			"Meizhou":[116.1,24.55],
			"Wendeng":[122.05,37.2],
			"Shanghai":[121.48,31.22],
			"Panzhihua":[101.718637,26.582347],
			"威海":[122.1,37.5],
			"Chengde":[117.93,40.97],
			"Xiamen":[118.1,24.46],
			"Shanwei":[115.375279,22.786211],
			"潮州":[116.63,23.68],
			"丹东":[124.37,40.13],
			"太仓":[121.1,31.45],
			"曲靖":[103.79,25.51],
			"Yantai":[121.39,37.52],
			"Fuzhou":[119.3,26.08],
			"瓦房店":[121.979603,39.627114],
			"Jimo":[120.45,36.38],
			"Fushun":[123.97,41.97],
			"玉溪":[102.52,24.35],
			"张家口":[114.87,40.82],
			"阳泉":[113.57,37.85],
			"莱州":[119.942327,37.177017],
			"湖州":[120.1,30.86],
			"汕头":[116.69,23.39],
			"Kunshan":[120.95,31.39],
			"Ningbo":[121.56,29.86],
			"湛江":[110.359377,21.270708],
			"揭阳":[116.35,23.55],
			"荣成":[122.41,37.16],
			"连云港":[119.16,34.59],
			"葫芦岛":[120.836932,40.711052],
			"常熟":[120.74,31.64],
			"Dongguan":[113.75,23.04],
			"河源":[114.68,23.73],
			"淮安":[119.15,33.5],
			"Taizhou":[119.9,32.49],
			"Nanning":[108.33,22.84],
			"营口":[122.18,40.65],
			"Huizhou":[114.4,23.09],
			"Jiangyin":[120.26,31.91],
			"蓬莱":[120.75,37.8],
			"Shaoguan":[113.62,24.84],
			"嘉峪关":[98.289152,39.77313],
			"Guangzhou":[113.23,23.16],
			"延安":[109.47,36.6],
			"Taiyuan":[112.53,37.87],
			"Qingyuan":[113.01,23.7],
			"Zhongshan":[113.38,22.52],
			"Kunming":[102.73,25.04],
			"Shouguang":[118.73,36.86],
			"盘锦":[122.070714,41.119997],
			"长治":[113.08,36.18],
			"Shenzhen":[114.07,22.62],
			"Zhuhai":[113.52,22.3],
			"Suqian":[118.3,33.96],
			"Xianyang":[108.72,34.36],
			"铜川":[109.11,35.09],
			"平度":[119.97,36.77],
			"Foshan":[113.11,23.05],
			"Haikou":[110.35,20.02],
			"Jiangmen":[113.06,22.61],
			"章丘":[117.53,36.72],
			"Zhaoqing":[112.44,23.05],
			"Dalian":[121.62,38.92],
			"临汾":[111.5,36.08],
			"吴江":[120.63,31.16],
			"Shizuishan":[106.39,39.04],
			"Shenyang":[123.38,41.8],
			"Suzhou":[120.62,31.32],
			"Maoming":[110.88,21.68],
			"Jiaxing":[120.76,30.77],
			"Changchun":[125.35,43.88],
			"胶州":[120.03336,36.264622],
			"Yinchuan":[106.27,38.47],
			"Zhangjiagang":[120.555821,31.875428],
			"三门峡":[111.19,34.76],
			"锦州":[121.15,41.13],
			"Nanchang":[115.89,28.68],
			"Liuzhou":[109.4,24.33],
			"Sanya":[109.511909,18.252847],
			"自贡":[104.778442,29.33903],
			"Jining":[126.57,43.87],
			"Yangjiang":[111.95,21.85],
			"泸州":[105.39,28.91],
			"Xining":[101.74,36.56],
			"Yibin":[104.56,29.77],
			"Huhehaote":[111.65,40.82],
			"Chengdu":[104.06,30.67],
			"Datong":[113.3,40.12],
			"镇江":[119.44,32.2],
			"Guilin":[110.28,25.29],
			"张家界":[110.479191,29.117096],
			"宜兴":[119.82,31.36],
			"北海":[109.12,21.49],
			"Xian":[108.95,34.27],
			"Jintan":[119.56,31.74],
			"Dongying":[118.49,37.46],
			"牡丹江":[129.58,44.6],
			"Zunyi":[106.9,27.7],
			"Shaoxing":[120.58,30.01],
			"Yangzhou":[119.42,32.39],
			"常州":[119.95,31.79],
			"Weifang":[119.1,36.62],
			"Chongqing":[106.54,29.59],
			"Taizhou":[121.420757,28.656386],
			"Nanjing":[118.78,32.04],
			"Binzhou":[118.03,37.36],
			"Guiyang":[106.71,26.57],
			"Wuxi":[120.29,31.59],
			"本溪":[123.73,41.3],
			"克拉玛依":[84.77,45.59],
			"渭南":[109.5,34.52],
			"Maanshan":[118.48,31.56],
			"Baoji":[107.15,34.38],
			"焦作":[113.21,35.24],
			"句容":[119.16,31.95],
			"Beijing":[116.46,39.92],
			"Xuzhou":[117.2,34.26],
			"Hengshui":[115.72,37.72],
			"Baotou":[110,40.58],
			"Mianyang":[104.73,31.48],
			"乌鲁木齐":[87.68,43.77],
			"Zaozhuang":[117.57,34.86],
			"Hangzhou":[120.19,30.26],
			"Zibo":[118.05,36.78],
			"鞍山":[122.85,41.12],
			"Liyang":[119.48,31.43],
			"库尔勒":[86.06,41.68],
			"Anyang":[114.35,36.1],
			"开封":[114.35,34.79],
			"Jinan":[117,36.65],
			"Deyang":[104.37,31.13],
			"温州":[120.65,28.01],
			"九江":[115.97,29.71],
			"邯郸":[114.47,36.6],
			"临安":[119.72,30.23],
			"Lanzhou":[103.73,36.03],
			"沧州":[116.83,38.33],
			"临沂":[118.35,35.05],
			"南充":[106.110698,30.837793],
			"Tianjin":[117.2,39.13],
			"富阳":[119.95,30.07],
			"Taian":[117.13,36.18],
			"诸暨":[120.23,29.71],
			"Zhengzhou":[113.65,34.76],
			"Haerbin":[126.63,45.75],
			"Liaocheng":[115.97,36.45],
			"Wuhu":[118.38,31.33],
			"唐山":[118.02,39.63],
			"Pingdingshan":[113.29,33.75],
			"Xingtai":[114.48,37.05],
			"Dezhou":[116.29,37.45],
			"Jining":[116.59,35.38],
			"荆州":[112.239741,30.335165],
			"Yichang":[111.3,30.7],
			"Yiwu":[120.06,29.32],
			"Lishui":[119.92,28.45],
			"Luoyang":[112.44,34.7],
			"Qinhuangdao":[119.57,39.95],
			"株洲":[113.16,27.83],
			"Shijiazhuang":[114.48,38.03],
			"Laiwu":[117.67,36.19],
			"常德":[111.69,29.05],
			"Changsha":[115.48,38.85],
			"湘潭":[112.91,27.87],
			"金华":[119.64,29.12],
			"岳阳":[113.09,29.37],
			"Changsha":[113,28.21],
			"衢州":[118.88,28.97],
			"Langfang":[116.7,39.53],
			"Heze":[115.480656,35.23375],
			"Hefei":[117.27,31.86],
			"Wuhan":[114.31,30.52],
			"Daqing":[125.03,46.58],
			"Anqing":[0,0],
			"Anji":[0,0]
		},
		_echart,
		_echartOption = {
			title : {
				text: '',
				x:'center'
			},tooltip : {
				trigger: 'item'
			},
			dataRange: {
				min : 0,
				max : 1,
				calculable : true,
				color: ['orangered','yellow','lightskyblue']
			},
			roamController: {
				show: true,
				x: 'right',
				mapTypeControl: {
					'china': true
				}
			},
			series : [
				{
					name: '',
					type: 'map',
					mapType: 'china',
					hoverable: false,
					roam:true,
					data : [],
					markPoint : {
						symbolSize: 5,       // 标注大小，半宽（半径）参数，当图形为方向或菱形则总宽度为symbolSize * 2
						itemStyle: {
							normal: {
								borderColor: '#87cefa',
								borderWidth: 1,            // 标注边线线宽，单位px，默认为1
								label: {
									show: false
								}
							},
							emphasis: {
								borderColor: '#1e90ff',
								borderWidth: 5,
								label: {
									show: false
								}
							}
						}
					}
				}
			]
		};

    if (countlyCommon.CITY_DATA === false) {
        countlyCity.initialize = function() { return true; };
        countlyCity.refresh = function() { return true; };
        countlyCity.drawGeoChart = function() { return true; };
        countlyCity.refreshGeoChart = function() { return true; };
        countlyCity.getLocationData = function() { return []; };
    } else {
        // Public Methods
        countlyCity.initialize = function () {

            if (_initialized && _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
                return countlyCity.refresh();
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
                        "method":"cities",
                        "period":_period
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

        countlyCity.refresh = function () {

            _periodObj = countlyCommon.periodObj;

            if (!countlyCommon.DEBUG) {

                if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return countlyCity.initialize();
                }

                return $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":"cities",
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

        countlyCity.reset = function () {
            _locationsDb = {};
            setMeta();
        };

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

        countlyCity.refreshGeoChart = function (metric) {
            if (google.visualization) {
                reDraw(metric);
            } else {
                google.load('visualization', '1', {'packages':['geochart'], callback:draw});
            }
        };

        countlyCity.getLocationData = function (options) {

            var locationData = countlyCommon.extractTwoLevelData(_locationsDb, _cities, countlyCity.clearLocationObject, [
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
            ]);

            if (options && options.maxCountries && locationData.chartData) {
                if (locationData.chartData.length > options.maxCountries) {
                    locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
                }
            }

            return locationData.chartData;
        };
    }

    countlyCity.clearLocationObject = function (obj) {
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

    //Private Methods
    function draw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};
		
		if(!google.visualization.GeoChart){
			return;
		}

        _chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _cities, countlyCity.clearLocationObject, [
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
        ]);

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

        _chart.draw(_dataTable, _chartOptions);
    }

    function reDraw(ob) {
        ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
        var chartData = {cols:[], rows:[]};

        var tt = countlyCommon.extractTwoLevelData(_locationsDb, _cities, countlyCity.clearLocationObject, [
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
        ]);

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

		if(google.visualization.GeoChart){
			_dataTable = new google.visualization.DataTable(chartData);
			_chart.draw(_dataTable, _chartOptions);
		}else{
			if (window.echarts) {
				
				var geoData = [];
				max_value=0;
				for(var j=0;j<tt.chartData.length;j++){
					var item = {};
					item.name = tt.chartData[j].city;
					switch(ob.metric){
						case 't':
							item.value = tt.chartData[j].t;
							break;
						case 'u':
							item.value = tt.chartData[j].u;
							break;
						case 'n':
							item.value = tt.chartData[j].n;
							break;
					}
					if(item.value > max_value){
						max_value = item.value;
					}
					geoData.push(item);
				}
				
				_echart.setOption( {
					title: {
						text: ob.label
					},
					dataRange: {
						max : max_value,
					},
					series : [
						{
							name: ob.label
							,markPoint : {
								data: geoData
							}
						}
					]
				} );
				
				_echart.refresh();
			}
		}
    }

    function setMeta() {
        if (_locationsDb['meta']) {
            _cities = (_locationsDb['meta']['cities']) ? _locationsDb['meta']['cities'] : [];
        } else {
            _cities = [];
        }
    }

	function drawByECharts(ob){
		ob = ob || {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"};
		var tt = countlyCommon.extractTwoLevelData(_locationsDb, _cities, countlyCity.clearLocationObject, [
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
        ]);
		
		var geoData = [];
		max_value=0;
		for(var j=0;j<tt.chartData.length;j++){
			var item = {};
			item.name = tt.chartData[j].city;
			switch(ob.metric){
				case 't':
					item.value = tt.chartData[j].t;
					break;
				case 'u':
					item.value = tt.chartData[j].u;
					break;
				case 'n':
					item.value = tt.chartData[j].n;
					break;
			}
			if(item.value > max_value){
				max_value = item.value;
			}
			geoData.push(item);
		}
		
		_echartOption.title.text = ob.label;
		_echartOption.series[0].name = ob.label;
		_echartOption.dataRange.max = max_value;
		// TODO
		_echartOption.series[0].geoCoord = _geoCoord;
		_echartOption.series[0].markPoint.data = geoData;
		
		$("#geo-chart").height( _chartOptions.height );
		$("#geo-chart").width( _chartOptions.width );
		_echart = echarts.init(document.getElementById(_chartElementId));
		_echart.setOption(_echartOption);
	}
	
}(window.countlyCity = window.countlyCity || {}, jQuery));