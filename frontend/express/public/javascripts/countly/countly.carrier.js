(function(countlyCarrier, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_carrierDb = {};
		
	//Public Methods
	countlyCarrier.initialize = function() {
		_periodObj = countlyCommon.periodObj;
		
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "carriers"
				},
				dataType: "jsonp",
				success: function(json) {
					_carrierDb = json;
				}
			});
		} else {
			_carrierDb = {"2012":{}};

			return true;
		}
	};

	countlyCarrier.getCarrierData = function() {
		
		var chartData = countlyCommon.extractTwoLevelData(_carrierDb, _carrierDb["carriers"], countlyCarrier.clearCarrierObject, [
			{ 
				name: "carrier",
				func: function (rangeArr, dataObj) {
					return rangeArr;
				}
			},
			{ "name": "t" },
			{ "name": "u" },
			{ "name": "n" }
		]);
		
		var carrierNames = _.pluck(chartData.chartData, 'carrier'),
			carrierTotal = _.pluck(chartData.chartData, 't'),
			carrierNew = _.pluck(chartData.chartData, 'n'),
			chartData2 = [],
			chartData3 = [];
		
		var sum = _.reduce(carrierTotal, function(memo, num){ return memo + num; }, 0);
		
		for (var i = 0; i < carrierNames.length; i++) {
			var percent = (carrierTotal[i] / sum) * 100;
			chartData2[i] = {data: [[0, carrierTotal[i]]], label: carrierNames[i]};
		}
		
		var sum2 = _.reduce(carrierNew, function(memo, num){ return memo + num; }, 0);
		
		for (var i = 0; i < carrierNames.length; i++) {
			var percent = (carrierNew[i] / sum) * 100;
			chartData3[i] = {data: [[0, carrierNew[i]]], label: carrierNames[i]};
		}
		
		chartData.chartDPTotal = {};
		chartData.chartDPTotal.dp = chartData2;
		
		chartData.chartDPNew = {};
		chartData.chartDPNew.dp = chartData3;
		
		return chartData;
	}

	countlyCarrier.clearCarrierObject = function(obj) {
		if (obj) {
			if(!obj["t"]) obj["t"] = 0;
			if(!obj["n"]) obj["n"] = 0;
			if(!obj["u"]) obj["u"] = 0;
		}
		else {
			obj = {"t": 0, "n": 0, "u": 0};
		}
		
		return obj;
	}
	
	countlyCarrier.getCarrierBars = function() {		
		return countlyCommon.extractBarData(_carrierDb, _carrierDb["carriers"], countlyCarrier.clearCarrierObject);
	}
	
}(window.countlyCarrier = window.countlyCarrier || {}, jQuery));