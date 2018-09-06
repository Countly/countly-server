var countlyModel = require('./countly.model.js');

/**
* This module defines default model to handle device_details data
* @module "api/lib/countly.device_details"
* @extends module:api/lib/countly.model~countlyMetric
*/

/**
* Model creator
* @returns {object} new model
*/
function create() {
    /** @lends module:api/lib/countly.device_details */
    var countlyDeviceDetails = countlyModel.create(function(rangeArr) {
        return rangeArr.replace(/:/g, ".");
    });
    return countlyDeviceDetails;
}
module.exports = create;