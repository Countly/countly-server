(function (countlyMetric, _name, $) {
	//Private Properties
	var _periodObj = {},
		_Db = {},
		_metrics = [],
        _frequency = [],
		_activeAppKey = 0,
		_initialized = false,
		_period = null;

	//Public Methods
	countlyMetric.initialize = function () {
		if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
			return this.refresh();
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
					"method":_name,
					"period":_period
				},
				dataType:"jsonp",
				success:function (json) {
					_Db = json;
					setMeta();
				}
			});
		} else {
			_Db = {"2012":{}};
			return true;
		}
	};

	countlyMetric.refresh = function () {
		_periodObj = countlyCommon.periodObj;

		if (!countlyCommon.DEBUG) {

			if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
				_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
				return this.initialize();
			}

			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":_name,
					"action":"refresh"
				},
				dataType:"jsonp",
				success:function (json) {
					countlyCommon.extendDbObj(_Db, json);
					extendMeta();
				}
			});
		} else {
			_Db = {"2012":{}};

			return true;
		}
	};

	countlyMetric.reset = function () {
		_Db = {};
        _frequency = [];
		setMeta();
	};
    
    countlyMetric.getChartData = function(path, metric, name){
		var chartData = [
                { data:[], label:name, color:'#DDDDDD', mode:"ghost" },
                { data:[], label:name, color:'#333933' }
            ],
            dataProps = [
                {
                    name:"p"+metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    },
                    period:"previous"
                },
                { name:metric}
            ];

        return countlyCommon.extractChartData(_Db, countlyMetric.clearObject, chartData, dataProps, path);
	};

	countlyMetric.getData = function (clean) {

		var chartData = countlyCommon.extractTwoLevelData(_Db, _metrics, this.clearObject, [
			{
				name:_name,
				func:function (rangeArr, dataObj) {
                    return rangeArr;
				}
			},
			{ "name":"u" },
			{ "name":"t" },
			{ "name":"s" },
			{ "name":"b" },
			{ "name":"e" },
			{ "name":"d" },
			{ "name":"n" }
		]);

        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);

		return chartData;
	};

	countlyMetric.clearObject = function (obj) {
		if (obj) {
			if (!obj["u"]) obj["u"] = 0;
			if (!obj["t"]) obj["t"] = 0;
			if (!obj["n"]) obj["n"] = 0;
			if (!obj["s"]) obj["s"] = 0;
			if (!obj["e"]) obj["e"] = 0;
			if (!obj["b"]) obj["b"] = 0;
			if (!obj["d"]) obj["d"] = 0;
		}
		else {
			obj = {"u":0, "t":0, "n":0, "s":0, "e":0, "b":0, "d":0};
		}

		return obj;
	};

	countlyMetric.getBars = function () {
		return countlyCommon.extractBarData(_Db, _metrics, this.clearObject, fetchValue);
	};
    
    countlyMetric.getViewFrequencyData = function () {
        var _sessionDb = countlySession.getSessionDb();
        if(_frequency.length){
            if (_sessionDb['meta']) {
                _frequency = countlyCommon.union(_frequency, _sessionDb['meta']['v-ranges']);
            }
        }
        else{
            if (_sessionDb['meta']) {
                _frequency = (_sessionDb['meta']['v-ranges']) ? _sessionDb['meta']['v-ranges'] : [];
            } else {
                _frequency = [];
            }
        }
        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_sessionDb, "vc", _frequency, countlyMetric.explainFrequencyRange);

        var durations = _.pluck(chartData.chartData, "vc"),
            durationTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][durations.length + 1] = [durations.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([durations.length, ""]);

        for (var i = 0; i < durations.length; i++) {
            chartDP[0]["data"][i + 1] = [i, durationTotals[i]];
            chartData.chartDP.ticks.push([i, durations[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };
    
    countlyMetric.explainFrequencyRange = function (index) {
        var visits = jQuery.i18n.map["views.visits"].toLowerCase();
        var range = [
            "1-2 " + visits,
            "3-5 " + visits,
            "6-10 " + visits,
            "11-15 " + visits,
            "16-30 " + visits,
            "31-50 " + visits,
            "51-100 " + visits,
            "> 100 " + visits
        ];

        return range[index];
    };

    countlyMetric.getFrequencyIndex = function (value) {
        var visits = jQuery.i18n.map["views.visits"];

        var range = [
            "1-2 " + visits,
            "3-5 " + visits,
            "6-10 " + visits,
            "11-15 " + visits,
            "16-30 " + visits,
            "31-50 " + visits,
            "51-100 " + visits,
            "> 100 " + visits
        ];

        return range.indexOf(value);
    };

	function setMeta() {
		if (_Db['meta']) {
			_metrics = (_Db['meta'][_name]) ? _Db['meta'][_name] : [];
		} else {
			_metrics = [];
		}
	}

	function extendMeta() {
		if (_Db['meta']) {
			_metrics = countlyCommon.union(_metrics, _Db['meta'][_name]);
		}
	}

})(window.countlyViews = window.countlyViews || {}, "views", jQuery);