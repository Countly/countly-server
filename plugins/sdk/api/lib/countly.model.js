var countlyModel = require('../../../../api/lib/countly.model.js');

/**
* This module defines default model to handle devices data
* @module "plugins/sdk/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/

/**
* Model creator
* @returns {object} new model
*/
function create() {
    var _sdk = "";
    var countlySDK = countlyModel.create(function(rangeArr) {
        if (rangeArr.startsWith("[" + _sdk + "]_")) {
            return rangeArr.replace("[" + _sdk + "]_", "").replace(/:/g, ".");
        }
        return "";
    });

    countlySDK.setSDK = function(sdk) {
        _sdk = sdk;
    };
    return countlySDK;
}
module.exports = create;