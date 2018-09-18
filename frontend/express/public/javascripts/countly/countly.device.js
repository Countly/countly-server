/*global CountlyHelpers, countlyDeviceList, jQuery */
(function() {
    /** Function gets full device name
    * @param {string} shortName  - short device name
    * @returns{string} full device name
    */
    function getDeviceFullName(shortName) {
        if (shortName === "Unknown") {
            return jQuery.i18n.map["common.unknown"];
        }
        if (countlyDeviceList && countlyDeviceList[shortName]) {
            return countlyDeviceList[shortName];
        }
        return shortName;
    }

    window.countlyDevice = window.countlyDevice || {};
    window.countlyDevice.getDeviceFullName = getDeviceFullName;
    CountlyHelpers.createMetricModel(window.countlyDevice, {name: "devices", estOverrideMetric: "devices"}, jQuery, getDeviceFullName);
}());