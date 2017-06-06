var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle event data
* @module "api/lib/countly.event"
* @extends module:api/lib/countly.model~countlyMetric
*/
function create(){
    var countlyEvent = countlyModel.create(function(val){
        return val.replace(/:/g, ".").replace(/\[CLY\]/g,"").replace(/.\/\//g, "://");
    });
    countlyEvent.setMetrics(["c","s","dur"]);
    countlyEvent.setUniqueMetrics([]);
    return countlyEvent;
}
module.exports = create;