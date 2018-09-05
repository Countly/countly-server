var countlyModel = require('../../../../api/lib/countly.model.js'),
    countlyCommon = require('../../../../api/lib/countly.common.js'),
    underscore = require('underscore');

/**
* This module defines default model to handle views data
* @module "plugins/views/api/lib/countly.model"
* @extends module:api/lib/countly.model~countlyMetric
*/
function create() {
    var countlyViews = countlyModel.create();

    countlyViews.setMetrics(["u", "t", "s", "b", "e", "n", "d"]);
    countlyViews.setUniqueMetrics(["u"]);
    countlyViews.getViewsData = function(clean) {

        var data = countlyViews.getDb();
        var meta = countlyViews.getMeta("views");
        var _name = "views";

        var chartData = countlyCommon.extractTwoLevelData(data, meta, countlyViews.clearObject, [
            {
                name: _name,
                func: function(rangeArr, dataObj) {
                    return countlyCommon.decode(rangeArr);
                }
            },
            { "name": "u" },
            { "name": "t" },
            { "name": "s" },
            { "name": "b" },
            { "name": "e" },
            { "name": "d" },
            { "name": "n" }
        ]);

        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);

        return chartData;
    };

    countlyViews.clearObject = function(obj) {
        if (obj) {
            if (!obj["u"]) {
                obj["u"] = 0;
            }
            if (!obj["t"]) {
                obj["t"] = 0;
            }
            if (!obj["n"]) {
                obj["n"] = 0;
            }
            if (!obj["s"]) {
                obj["s"] = 0;
            }
            if (!obj["e"]) {
                obj["e"] = 0;
            }
            if (!obj["b"]) {
                obj["b"] = 0;
            }
            if (!obj["d"]) {
                obj["d"] = 0;
            }
        }
        else {
            obj = {"u": 0, "t": 0, "n": 0, "s": 0, "e": 0, "b": 0, "d": 0};
        }
        return obj;
    };

    return countlyViews;
}
module.exports = create;