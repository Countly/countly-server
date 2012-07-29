(function(countlyAppVersion, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_appVersionsDb = {};
		
	//Public Methods
	countlyAppVersion.initialize = function() {
		_periodObj = countlyCommon.periodObj;
		
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "app_versions"
				},
				dataType: "jsonp",
				success: function(json) {
					_appVersionsDb = json;
				}
			});
		} else {
			_appVersionsDb = {"2012":{}};
			return true;
		}
	};
	
	countlyAppVersion.clearAppVersionsObject = function(obj) {
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

	countlyAppVersion.getAppVersionBars = function() {
		return countlyCommon.extractBarData(_appVersionsDb, _appVersionsDb["app_versions"], countlyAppVersion.clearAppVersionsObject);
	}
	
	countlyAppVersion.getAppVersionData = function(os) {
		
		var appVersionData = {chartData: {}, chartDP: {dp: [], ticks: []}};
		
		var tmpAppVersionData = countlyCommon.extractTwoLevelData(_appVersionsDb, _appVersionsDb["app_versions"], countlyAppVersion.clearAppVersionsObject, [
			{ 
				name: "app_version",
				func: function (rangeArr, dataObj) {
					return rangeArr;
				}
			},
			{ "name": "t" },
			{ "name": "u" },
			{ "name": "n" }
		]);
		
		appVersionData.chartData = tmpAppVersionData.chartData;
		
		if (appVersionData.chartData) {
			for (var i = 0; i < appVersionData.chartData.length; i++) {
				appVersionData.chartData[i].app_version = appVersionData.chartData[i].app_version.replace(/:/g, ".");
			}
		}

		var appVersions = _.pluck(appVersionData.chartData, "app_version"),
			appVersionTotal = _.pluck(appVersionData.chartData, 't'),
			appVersionNew = _.pluck(appVersionData.chartData, 'n'),
			chartDP = [{data: [], label: "Total Sessions"}, {data: [], label: "New Users"}];
				
		chartDP[0]["data"][0] = [-1,null];
		chartDP[0]["data"][appVersions.length+1] = [appVersions.length, null];
		
		appVersionData.chartDP.ticks.push([-1, ""]);
		appVersionData.chartDP.ticks.push([appVersions.length, ""]);
				
		for (var i = 0; i < appVersions.length; i++) {
			chartDP[0]["data"][i+1] = [i, appVersionTotal[i]];
			chartDP[1]["data"][i+1] = [i, appVersionNew[i]];
			appVersionData.chartDP.ticks.push([i, appVersions[i]]);
		}
		
		appVersionData.chartDP.dp = chartDP;
		
		return appVersionData;
	}
	
}(window.countlyAppVersion = window.countlyAppVersion || {}, jQuery));
