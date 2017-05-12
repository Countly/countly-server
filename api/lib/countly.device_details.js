var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle device_details data
* @module "api/lib/countly.device_details"
* @extends module:api/lib/countly.model~countlyMetric
*/
var countlyDeviceDetails = countlyModel.create(function(rangeArr, dataObj){
    return rangeArr.replace(/:/g, ".");
});
module.exports = countlyDeviceDetails;