/*global CountlyHelpers, jQuery, countlyAppVersion, countlyDeviceDetails*/
(function() {
    window.countlyAppVersion = window.countlyAppVersion || {};
    CountlyHelpers.createMetricModel(window.countlyAppVersion, {name: "app_versions", estOverrideMetric: "app_versions"}, jQuery, function(rangeArr) {
        return rangeArr.replace(/:/g, ".");
    });

    //Public Methods
    countlyAppVersion.initialize = function() {
        countlyAppVersion.setDb(countlyDeviceDetails.getDb());
    };

    countlyAppVersion.refresh = function(newJSON) {
        if (newJSON) {
            countlyAppVersion.extendDb(newJSON);
        }
    };
}(window.countlyAppVersion = window.countlyAppVersion || {}, jQuery));