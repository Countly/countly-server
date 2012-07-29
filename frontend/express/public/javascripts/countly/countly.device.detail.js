(function(countlyDeviceDetails, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_deviceDetailsDb = {};
		
	//Public Methods
	countlyDeviceDetails.initialize = function() {
		_periodObj = countlyCommon.periodObj;
		
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "device_details"
				},
				dataType: "jsonp",
				success: function(json) {
					_deviceDetailsDb = json;
					if (_deviceDetailsDb["os_versions"]) {
						_deviceDetailsDb["os_versions"] = _deviceDetailsDb["os_versions"].join(",").replace(/\./g, ":").split(",");
					}
				}
			});
		} else {
			_deviceDetailsDb = {"2012":{}};
			return true;
		}
	};
	
	countlyDeviceDetails.clearDeviceDetailsObject = function(obj) {
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

	countlyDeviceDetails.getPlatforms = function() {
		return _deviceDetailsDb["os"];
	}
	
	countlyDeviceDetails.getPlatformBars = function() {	
		return countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["os"], countlyDeviceDetails.clearDeviceDetailsObject);
	}
	
	countlyDeviceDetails.getPlatformData = function() {
		
		var chartData = countlyCommon.extractTwoLevelData(_deviceDetailsDb, _deviceDetailsDb["os"], countlyDeviceDetails.clearDeviceDetailsObject, [
			{ 
				name: "os_",
				func: function (rangeArr, dataObj) {
					return rangeArr;
				}
			},
			{ "name": "t" },
			{ "name": "u" },
			{ "name": "n" }
		]);
		
		var platformNames = _.pluck(chartData.chartData, 'os_'),
			platformTotal = _.pluck(chartData.chartData, 'u'),
			chartData2 = [];
		
		var sum = _.reduce(platformTotal, function(memo, num){ return memo + num; }, 0);
		
		for (var i = 0; i < platformNames.length; i++) {
			var percent = (platformTotal[i] / sum) * 100;
			chartData2[i] = {data: [[0, platformTotal[i]]], label: platformNames[i]};
		}
		
		chartData.chartDP = {};
		chartData.chartDP.dp = chartData2;
		
		return chartData;
	}
	
	countlyDeviceDetails.getResolutionBars = function() {	
		return countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["resolutions"], countlyDeviceDetails.clearDeviceDetailsObject);
	}
	
	countlyDeviceDetails.getOSVersionBars = function() {
		var osVersions = countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["os_versions"], countlyDeviceDetails.clearDeviceDetailsObject);
		
		for (var i = 0; i < osVersions.length; i++) {
			osVersions[i].name = osVersions[i].name.replace(/:/g, ".").replace(/i/g, "iOS ").replace(/a/g, "Android ");
		}
		
		return osVersions;
	}
	
	countlyDeviceDetails.getOSVersionData = function(os) {
		
		var oSVersionData = countlyCommon.extractTwoLevelData(_deviceDetailsDb, _deviceDetailsDb["os_versions"], countlyDeviceDetails.clearDeviceDetailsObject, [
			{ 
				name: "os_version",
				func: function (rangeArr, dataObj) {
					return rangeArr;
				}
			},
			{ "name": "t" },
			{ "name": "u" },
			{ "name": "n" }
		]);
		
		var osSegmentation = ((os)? os : ((_deviceDetailsDb["os"])? _deviceDetailsDb["os"][0] : null)),
			platformVersionTotal = _.pluck(oSVersionData.chartData, 'u'),
			chartData2 = [];
		
		if (oSVersionData.chartData) {
			for (var i = 0; i < oSVersionData.chartData.length; i++) {
				oSVersionData.chartData[i].os_version = oSVersionData.chartData[i].os_version.replace(/:/g, ".").replace(/i/g, "iOS ").replace(/a/g, "Android ");
				
				if (oSVersionData.chartData[i].os_version.indexOf(osSegmentation) == -1) {
					delete oSVersionData.chartData[i];
				}
			}
		}
		
		oSVersionData.chartData = _.compact(oSVersionData.chartData);
				
		var platformVersionNames = _.pluck(oSVersionData.chartData, 'os_version'),
			platformNames = [];
		
		var sum = _.reduce(platformVersionTotal, function(memo, num){ return memo + num; }, 0);
		
		for (var i = 0; i < platformVersionNames.length; i++) {
			var percent = (platformVersionTotal[i] / sum) * 100;
			
			chartData2[chartData2.length] = {data: [[0, platformVersionTotal[i]]], label: platformVersionNames[i].replace(osSegmentation + " ", "")};
		}
		
		oSVersionData.chartDP = {};
		oSVersionData.chartDP.dp = chartData2;
		oSVersionData.os = {};
		
		if (_deviceDetailsDb["os"] && _deviceDetailsDb["os"].length > 1) {
			for (var i = 0; i < _deviceDetailsDb["os"].length; i++) {
				if (_deviceDetailsDb["os"][i] != osSegmentation) {
					continue;
				}

				oSVersionData.os = {
					name: _deviceDetailsDb["os"][i],
					class: _deviceDetailsDb["os"][i].toLowerCase()
				};
			}
		}
		
		return oSVersionData;
	}
	
}(window.countlyDeviceDetails = window.countlyDeviceDetails || {}, jQuery));
