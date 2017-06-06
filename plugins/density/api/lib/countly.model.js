var countlyModel = require('../../../../api/lib/countly.model.js'),
    countlyCommon = require('../../../../api/lib/countly.common.js'),
    common = require('../../../../api/utils/common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle devices data
* @module "plugins/density/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/
function create(){
    var countlyDensity = countlyModel.create(function(rangeArr, dataObj){
        var stripped = false;
        for(var os in common.os_mapping){
            if(rangeArr.startsWith(common.os_mapping[os])){
                rangeArr = rangeArr.replace(common.os_mapping[os], "");
                stripped = true;
                break;
            }
        }
        if(!stripped)
            rangeArr = rangeArr.substr(1);
        return rangeArr.replace(/:/g, ".");
    });
    return countlyDensity;
}
module.exports = create;