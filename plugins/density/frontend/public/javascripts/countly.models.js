/*global countlyDensity, CountlyHelpers, jQuery*/
window.countlyDensity = {};
countlyDensity.checkOS = function(os, density) {
    var lastIndex = density.toUpperCase().lastIndexOf("DPI");
    if (os.toLowerCase() === "android" && lastIndex !== -1 && lastIndex === density.length - 3) {
        return true;
    }
    if (os.toLowerCase() === "ios" && density[0] === "@") {
        return true;
    }
    return false;
};
CountlyHelpers.createMetricModel(window.countlyDensity = window.countlyDensity || {}, {name: "density", estOverrideMetric: "densities"}, jQuery);