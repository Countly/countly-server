(function(countlyDevice, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_deviceDb = {};
		
	//Public Methods
	countlyDevice.initialize = function() {
		_periodObj = countlyCommon.periodObj;
		
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "devices"
				},
				dataType: "jsonp",
				success: function(json) {
					_deviceDb = jQuery.parseJSON(json);
				}
			});
		} else {
			_deviceDb = {"2012":{}};
			return true;
		}
	};
	
	countlyDevice.getDeviceData = function() {
		
		var chartData = countlyCommon.extractTwoLevelData(_deviceDb, _deviceDb["devices"], countlyDevice.clearDeviceObject, [
			{ 
				name: "device",
				func: function (rangeArr, dataObj) {
					return deviceFullName(rangeArr);
				}
			},
			{ "name": "t" },
			{ "name": "u" },
			{ "name": "n" }
		]);
		
		var deviceNames = _.pluck(chartData.chartData, 'device'),
			deviceTotal = _.pluck(chartData.chartData, 'u'),
			deviceNew = _.pluck(chartData.chartData, 'n'),
			chartData2 = [];
		
		for (var i = 0; i < deviceNames.length; i++) {
			chartData2[i] = {data: [[-1,null],[0, deviceTotal[i]], [1, deviceNew[i]], [2,null]], label: deviceFullName(deviceNames[i])};
		}
		
		if (chartData2.length == 0) {
			chartData2[0] = {data: [[-1,null], [0, null], [1, null], [2,null]]};
		}
		
		chartData.chartDP = {};
		chartData.chartDP.dp = chartData2;
		chartData.chartDP.ticks = [[-1,""],[0,"Total Users"],[1,"New Users"],[2,""]];
		
		return chartData;
	}
	
	countlyDevice.getDeviceDP = function() {
	
		//Update the current period object in case selected date is changed
		_periodObj = countlyCommon.periodObj;
		
		var dataArr = [ { data: [], label: "Devices" }],
			ticks = [],
			rangeUsers;
			
		for(var j = 0; j < _deviceDb["devices"].length; j++) {
		
			rangeUsers = 0;
		
			if (!_periodObj.isSpecialPeriod) {
				for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
				
					var tmp_x = countlyCommon.getDescendantProp(_deviceDb, _periodObj.activePeriod + "." + i + ".device");
					tmp_x = clearLoyaltyObject(tmp_x);

					rangeUsers += tmp_x[_deviceDb["devices"][j]];
				}
				
				if (rangeUsers != 0) {
					dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
					ticks[j] = [j, deviceFullName(_deviceDb["devices"][j])];
				}
			} else {	
				for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
				
					var tmp_x = countlyCommon.getDescendantProp(_deviceDb, _periodObj.currentPeriodArr[i] + ".device");
					tmp_x = clearLoyaltyObject(tmp_x);
					
					rangeUsers += tmp_x[_deviceDb["devices"][j]];
				}
								
				if (rangeUsers != 0) {
					dataArr[0]["data"][dataArr[0]["data"].length] = [j, rangeUsers];
					ticks[j] = [j, deviceFullName(_deviceDb["devices"][j])];
				}
			}
		}
		
		return {
			dp: dataArr,
			ticks: ticks
		};
	};

	countlyDevice.clearDeviceObject = function(obj) {
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
	
	function deviceFullName(shortName) {
		var fullName = "";

		switch (shortName) {
			case "iPhone1,1":	fullName = "iPhone 1G"; break;
			case "iPhone1,2":	fullName = "iPhone 3G"; break;
			case "iPhone2,1":	fullName = "iPhone 3GS"; break;
			case "iPhone3,1":	fullName = "iPhone 4"; break;
			case "iPhone3,3":	fullName = "Verizon iPhone 4"; break;
			case "iPhone4,1":	fullName = "iPhone 4S"; break;
			case "iPod1,1":	fullName = "iPod Touch 1G"; break;
			case "iPod2,1":	fullName = "iPod Touch 2G"; break;
			case "iPod3,1":	fullName = "iPod Touch 3G"; break;
			case "iPod4,1":	fullName = "iPod Touch 4G"; break;
			case "iPad1,1":	fullName = "iPad"; break;
			case "iPad2,1":	fullName = "iPad 2 (WiFi)"; break;
			case "iPad2,2":	fullName = "iPad 2 (GSM)"; break;
			case "iPad2,3":	fullName = "iPad 2 (CDMA)"; break;
			case "iPad2,4":	fullName = "iPad 2"; break;
			case "iPad3,1":	fullName = "iPad-3G (WiFi)"; break;
			case "iPad3,2":	fullName = "iPad-3G (4G)"; break;
			case "iPad3,3":	fullName = "iPad-3G (4G)"; break;
			case "i386":	fullName = "Simulator"; break;
			case "x86_64":	fullName = "Simulator"; break;
			default:	fullName = shortName;
		}
		
		return fullName;
	}
	
}(window.countlyDevice = window.countlyDevice || {}, jQuery));