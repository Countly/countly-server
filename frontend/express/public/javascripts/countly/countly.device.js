(function () {
    function getDeviceFullName(shortName) {
        if(shortName == "Unknown")
            return jQuery.i18n.map["common.unknown"];
		if(countlyDeviceList && countlyDeviceList[shortName])
			return countlyDeviceList[shortName];
        return shortName;
    };

    window.countlyDevice = window.countlyDevice || {};
    window.countlyDevice.getDeviceFullName=getDeviceFullName;
    CountlyHelpers.createMetricModel(window.countlyDevice, {name: "devices", estOverrideMetric:"devices"}, jQuery, getDeviceFullName);
}());