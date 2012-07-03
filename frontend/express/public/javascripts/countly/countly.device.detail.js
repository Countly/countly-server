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
					_deviceDetailsDb = jQuery.parseJSON(json);
					_deviceDetailsDb["os_versions"] = _deviceDetailsDb["os_versions"].join(",").replace(/\./g, ":").split(",");
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

	countlyDeviceDetails.getPlatformBars = function() {	
		return countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["os"], countlyDeviceDetails.clearDeviceDetailsObject);
	}
	
	countlyDeviceDetails.getResolutionBars = function() {	
		return countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["resolutions"], countlyDeviceDetails.clearDeviceDetailsObject);
	}
	
	countlyDeviceDetails.getOSVersionBars = function() {
		var osVersions = countlyCommon.extractBarData(_deviceDetailsDb, _deviceDetailsDb["os_versions"], countlyDeviceDetails.clearDeviceDetailsObject);
		
		for (var i = 0; i < osVersions.length; i++) {
			osVersions[i].name = osVersions[i].name.replace(/:/g, ".");
		}
		
		return osVersions;
	}
	
}(window.countlyDeviceDetails = window.countlyDeviceDetails || {}, jQuery));