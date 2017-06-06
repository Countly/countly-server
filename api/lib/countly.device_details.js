var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle device_details data
* @module "api/lib/countly.device_details"
* @extends module:api/lib/countly.model~countlyMetric
*/
function create(){
    var countlyDeviceDetails = countlyModel.create(function(rangeArr, dataObj){
        return rangeArr.replace(/:/g, ".");
    });
    return countlyDeviceDetails;
}
module.exports = create;