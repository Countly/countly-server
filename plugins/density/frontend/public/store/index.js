import jQuery from 'jquery';
import { createMetricModel } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

var countlyDensity = {};

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

createMetricModel(countlyDensity, {name: "density", estOverrideMetric: "densities"}, jQuery);

window.countlyDensity = countlyDensity;

export default countlyDensity;
