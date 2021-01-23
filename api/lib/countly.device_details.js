var countlyModel = require('./countly.model.js');
var countlyCommon = require('./countly.common.js');
var countlyOsMapping = require('../../frontend/express/public/javascripts/countly/countly.device.osmapping.js');

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

    /**
     * Function to fix data based on segement for Bars
     * @param  {String} segment - name of the segment/metric to get data for, by default will use default _name provided on initialization
     * @param  {Object} rangeData - countly standard metric data object
     * @returns {Object} - metric data object
     */
    countlyDeviceDetails.fixBarSegmentData = function(segment, rangeData) {
        var i;

        if (segment === "os") {
            var chartData = rangeData.chartData;
            for (i = 0; i < chartData.length; i++) {
                if (countlyOsMapping[chartData[i].range.toLowerCase()]) {
                    chartData[i].os = countlyOsMapping[chartData[i].range.toLowerCase()].name;
                }
            }

            chartData = countlyCommon.mergeMetricsByName(chartData, "os");
            rangeData.chartData = chartData;
        }

        return rangeData;
    };

    return countlyDeviceDetails;
}
module.exports = create;