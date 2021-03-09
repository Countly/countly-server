var countlyModel = require('../../../../api/lib/countly.model.js'),
    countlyCommon = require('../../../../api/lib/countly.common.js'),
    stores = require("../../stores.json");
/**
* This module defines default model to handle devices data
* @module "plugins/sources/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/

/**
 * create countlySources instance
 * @return {object} - countlySources instance
 */
function create() {
    var countlySources = countlyModel.create(function(code, data, separate, appType) {
        code = countlyCommon.decode(code + "");
        if (appType === "mobile") {
            //ignore incorrect Android values, which are numbers
            if (!isNaN(parseFloat(code)) && isFinite(code)) {
                return "Unknown";
            }
            if (separate) {
                return code;
            }
            if (stores && stores[code]) {
                return stores[code];
            }
            else {
                for (var i in stores) {
                    if (code.indexOf(i) === 0) {
                        return stores[i];
                    }
                }
                return code;
            }
        }
        else {
            if (code.indexOf("://") === -1 && code.indexOf(".") === -1) {
                if (separate) {
                    return "Organic (" + code + ")";
                }
                return "Direct";
            }
            else if (separate) {
                return code;
            }
            code = code.replace("://www.", "://");
            /*eslint-disable */
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            /*eslint-enable */
            var domain = matches && matches[1] || code;
            return domain.split("/")[0];
        }
    });

    countlySources.fixBarSegmentData = function(params, rangeData) {
        var fetchValue = countlySources.fetchValue;
        var chartData = rangeData.chartData || [];
        var appType = params.app && params.app.type;

        if (appType) {
            for (var i = 0; i < chartData.length; i++) {
                var str = chartData[i]._id || chartData[i].range; // range = _id when caller is dashboards
                chartData[i].sources = fetchValue(countlyCommon.decode(str), undefined, undefined,);
            }

            chartData = countlyCommon.mergeMetricsByName(chartData, "sources");
        }

        chartData.sort(function(a, b) {
            return b.t - a.t;
        });

        rangeData.chartData = chartData;

        return rangeData;
    };

    return countlySources;
}
module.exports = create;