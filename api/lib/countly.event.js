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
    
    /**
    * Get event data by periods
    * @returns {array} with event data objects
    */
    countlyEvent.getSubperiodData = function () {
    
        var dataProps = [
                { name:"c" },
                { name:"s" },
                { name:"dur" }
            ];
    
        return countlyCommon.extractData(countlyEvent.getDb(), countlyEvent.clearObject, dataProps);
    };
    
    /**
    * Get event data by segments
    * @returns {array} with event data objects
    */
    countlyEvent.getSegmentedData = function(segment){
        return countlyCommon.extractMetric(countlyEvent.getDb(), countlyEvent.getMeta(segment), countlyEvent.clearObject, [
            {
                name:segment,
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"c" },
            { "name":"s" },
            { "name":"dur" }
        ]);
    };
    
    return countlyEvent;
}
module.exports = create;