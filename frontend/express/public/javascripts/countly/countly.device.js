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

    /** Function gets list of device id's. If there is more than limit - list of substrings is returned(To ensure we don't miss those in db)
    * @param {string} search  - device name
    * @param {integer} limit - max list limit
    * @returns{array} list if device id's or id's substrings
    */
    function getDeviceNames(search, limit) {
        var codes = [];
        var mkl = 100;
        for (var p in countlyDeviceList) {
            if (countlyDeviceList[p].startsWith(search)) {
                codes.push(p);
                mkl = Math.min(mkl, p.length);
            }
        }
        while (codes.length > limit && mkl > 0) {
            var map = {};
            for (var k = 0; k < codes.length; k++) {
                map[codes[k].substr(0, mkl)] = true;
            }
            codes = Object.keys(map);
            mkl = mkl - 1;
        }
        return codes;
    }

    window.countlyDevice = window.countlyDevice || {};
    window.countlyDevice.getDeviceFullName = getDeviceFullName;
    window.countlyDevice.getDeviceNames = getDeviceNames;
    CountlyHelpers.createMetricModel(window.countlyDevice, {name: "devices", estOverrideMetric: "devices"}, jQuery, getDeviceFullName);
}());