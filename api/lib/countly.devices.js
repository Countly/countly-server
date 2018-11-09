var countlyModel = require('./countly.model.js'),
    countlyDeviceList = require('../../frontend/express/public/javascripts/countly/countly.device.list.js');

/**
* This module defines default model to handle devices data
* @module "api/lib/countly.devices"
* @extends module:api/lib/countly.model~countlyMetric
*/

/**
* Model creator
* @returns {object} new model
*/
function create() {
    /** @lends module:api/lib/countly.devices */
    var countlyDevices = countlyModel.create(function(shortName) {
        if (countlyDeviceList && countlyDeviceList[shortName]) {
            return countlyDeviceList[shortName];
        }
        return shortName;
    });
    return countlyDevices;
}
module.exports = create;