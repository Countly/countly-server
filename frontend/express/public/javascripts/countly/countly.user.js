(function(countlyUser, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_userDb = {};
		
	//Public Methods
	countlyUser.initialize = function() {
		_periodObj = countlyCommon.periodObj;
		
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "users"
				},
				dataType: "jsonp",
				success: function(json) {
					_userDb = jQuery.parseJSON(json);
				}
			});
		} else {
			_userDb = {"2012":{}};
			return true;
		}
	};

	countlyUser.getFrequencyData = function() {
	
		var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};
		
		chartData.chartData = countlyCommon.extractRangeData(_userDb, "f", _userDb["f-ranges"], countlyUser.explainFrequencyRange);
		
		var frequencies = _.pluck(chartData.chartData, "f"),
			frequencyTotals = _.pluck(chartData.chartData, "t"),
			chartDP = [{data: []}];
		
		chartDP[0]["data"][0] = [-1,null];
		chartDP[0]["data"][frequencies.length+1] = [frequencies.length, null];
		
		chartData.chartDP.ticks.push([-1, ""]);
		chartData.chartDP.ticks.push([frequencies.length, ""]);
		
		for (var i = 0; i < frequencies.length; i++) {
			chartDP[0]["data"][i+1] = [i, frequencyTotals[i]];
			chartData.chartDP.ticks.push([i, frequencies[i]]);
		}
		
		chartData.chartDP.dp = chartDP;
		
		return chartData;
	}
	
	countlyUser.getLoyaltyData = function() {
	
		var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};
		
		chartData.chartData = countlyCommon.extractRangeData(_userDb, "l", _userDb["l-ranges"], countlyUser.explainLoyaltyRange);
		
		var loyalties = _.pluck(chartData.chartData, "l"),
			loyaltyTotals = _.pluck(chartData.chartData, 't'),
			chartDP = [{data: []}];
		
		chartDP[0]["data"][0] = [-1,null];
		chartDP[0]["data"][loyalties.length+1] = [loyalties.length, null];
		
		chartData.chartDP.ticks.push([-1, ""]);
		chartData.chartDP.ticks.push([loyalties.length, ""]);
		
		for (var i = 0; i < loyalties.length; i++) {
			chartDP[0]["data"][i+1] = [i, loyaltyTotals[i]];
			chartData.chartDP.ticks.push([i, loyalties[i]]);
		}
		
		chartData.chartDP.dp = chartDP;
		
		return chartData;
	}
	
	countlyUser.getLoyaltyDP = function() {
	
		//Update the current period object in case selected date is changed
		_periodObj = countlyCommon.periodObj;
		
		var dataArr = [ { data: [], label: "Loyalty" }],
			ticks = [],
			rangeUsers;
			
		for(var j = 0; j < _userDb["l-ranges"].length; j++) {
		
			rangeUsers = 0;
		
			if (!_periodObj.isSpecialPeriod) {
				for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
				
					var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.activePeriod + "." + i + "." + "l");
					tmp_x = clearLoyaltyObject(tmp_x);

					rangeUsers += tmp_x[_userDb["l-ranges"][j]];
				}
				
				if (rangeUsers != 0) {
					dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
					ticks[j] = [j, _userDb["l-ranges"][j]];
				}
			} else {	
				for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
				
					var tmp_x = countlyCommon.getDescendantProp(_userDb, _periodObj.currentPeriodArr[i] + "." + "l");
					tmp_x = clearLoyaltyObject(tmp_x);
					
					rangeUsers += tmp_x[_userDb["l-ranges"][j]];
				}
								
				if (rangeUsers != 0) {
					dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
					ticks[j] = [j, _userDb["l-ranges"][j]];
				}
			}
		}
		
		return {
			dp: dataArr,
			ticks: ticks
		};
	};

	countlyUser.explainFrequencyRange = function(index) {
		var frequencyRange = [
			"First session",
			"1-24 hours",
			"1 day",
			"2 days",
			"3 days",
			"4 days",
			"5 days",
			"6 days",
			"7 days",
			"8-14 days",
			"15-30 days",
			"30+ days"
		];
		
		return frequencyRange[index];
	}
	
	countlyUser.explainLoyaltyRange = function(index) {
		var loyaltyRange = [
			"1st",
			"2nd",
			"3rd-5th",
			"6th-9th",
			"10th-19th",
			"20th-49th",
			"50th-99th",
			"100-499th",
			"> 500th"
		];
		
		return loyaltyRange[index];
	}
			
}(window.countlyUser = window.countlyUser || {}, jQuery));