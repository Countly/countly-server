import jQuery from 'jquery';
import { createMetricModel } from './countly.helpers.js';
import countlyDeviceDetails from './countly.device.detail.js';

const countlyAppVersion = {};
createMetricModel(countlyAppVersion, {name: "app_versions", estOverrideMetric: "app_versions"}, jQuery, function(rangeArr) {
    return rangeArr.replace(/:/g, ".");
});

countlyAppVersion.initialize = function() {
    countlyAppVersion.setDb(countlyDeviceDetails.getDb());
};

countlyAppVersion.refresh = function(newJSON) {
    if (newJSON) {
        countlyAppVersion.extendDb(newJSON);
    }
};

export default countlyAppVersion;
