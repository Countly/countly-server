var countlyCommon = require('./countly.common.js'),
    _ = require('underscore');
/**
* This module loads existing model or create one from default module if it does not exist
* @module "api/lib/countly.model"
*/

/** @lends module:api/lib/countly.model */
var countlyModel = {};

/**
* Loads countly model for provided data if it already exists in api/lib folder or in plugins, or creates new one from default model if it does not exist
* @param {string} segment - data segment name to process
* @returns {module:api/lib/countly.model~countlyMetric} countly metric model for provided name
* @example
* var countlyModel = require("api/lib/countly.mode.js");
* var countlyDensity = countlyModel.load("densities");
*/
countlyModel.load = function(segment) {
    var _name = (segment.name) ? segment.name : segment;
    var model;
    try {
        //try loading model from core
        model = require("./countly." + _name + ".js")();
    }
    catch (ex) {
        try {
            //try loading model from plugin
            model = require("../../plugins/" + _name + "/api/lib/countly.model.js")();
        }
        catch (ex2) {
            //just create standard model
            model = this.create();
        }
    }
    return model;
};

/**
* Create Countly data model to process data segment from fetched from server
* @param {function=} fetchValue - default function to fetch and transform if needed value from standard data model
* @returns {module:api/lib/countly.model~countlyMetric} new countly metric model
* @example
* var countlyModel = require("api/lib/countly.mode.js");
* var countlyDensity = countlyModel.create(function(val, data, separate){
*      if(separate){
*          //request separated/unprocessed data
*          return val;
*      }
*      else{
*          //we can preprocess data and group, for example, by first letter
*          return val[0];
*      }
* });
*/
countlyModel.create = function(fetchValue) {
    /**
    * Common metric object, all metric models inherit from it and should have these methods
    * @class countlyMetric
    */
    var countlyMetric = {};

    /**
    * Fetching method to modify segment values, like changing name or grouping them
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} val - val to fetch, which might map to some other value if needed
    * @returns {string} returns fetched value
    */
    countlyMetric.fetchValue = fetchValue || function(val) {
        return val;
    };
    //Private Properties
    var _Db = {},
        _period = null,
        _metas = {},
        _uniques = ["u"],
        _metrics = ["t", "u", "n"],
        _totalUsersObj = {},
        _prevTotalUsersObj = {};

    /**
    * Get the current period Object for the model
    * @memberof module:api/lib/countly.model~countlyMetric
    * @return {module:api/lib/countly.common.periodObj} period object
    */
    countlyMetric.getPeriod = function() {
        return _period;
    };

    /**
    * Set period object for the model to use, for overriding calls to common methods
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {module:api/lib/countly.common.periodObj} period - set period Object used by the model
    */
    countlyMetric.setPeriod = function(period) {
        _period = period;
    };

    /**
    * Reset/delete all retrieved metric data, like when changing app or selected time period
    * @memberof module:api/lib/countly.model~countlyMetric
    */
    countlyMetric.reset = function() {
        _Db = {};
        setMeta();
    };

    /**
    * Get current data, if some view or model requires access to raw data
    * @memberof module:api/lib/countly.model~countlyMetric
    * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
    */
    countlyMetric.getDb = function() {
        return _Db;
    };

    /**
    * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {object} db - set new data to be used by model
    */
    countlyMetric.setDb = function(db) {
        _Db = db;
        setMeta();
    };

    /**
    * Extend current data for model with some additional information about latest period (like data from action=refresh request)
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {object} data - set new data to be used by model
    */
    countlyMetric.extendDb = function(data) {
        countlyCommon.extendDbObj(_Db, data);
        extendMeta();
    };

    /**
    * Set total user object for this metric to use for unique user correction
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {object} totalUsersObj - object with total user data from {@link module:api/parts/data/fetch.getTotalUsersObj}
    * @param {object} prevTotalUserObj - object with total user data from {@link module:api/parts/data/fetch.getTotalUsersObj} for previous period
    */
    countlyMetric.setTotalUsersObj = function(totalUsersObj, prevTotalUserObj) {
        _totalUsersObj = totalUsersObj || {};
        _prevTotalUsersObj = prevTotalUserObj || {};
    };

    /**
    * Get total user object for this metric to use for unique user correction
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {boolean} prev - get correction data for previous period
    * @returns {object} object with total user data from {@link module:api/parts/data/fetch.getTotalUsersObj}
    */
    countlyMetric.getTotalUsersObj = function(prev) {
        if (prev) {
            return _prevTotalUsersObj;
        }
        return _totalUsersObj;
    };

    /**
    * Sets array of metric names that are unique and estimation should be applied to them
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {array} uniques - array of strings with unique metrics for current data, default: ["u"]
    */
    countlyMetric.setUniqueMetrics = function(uniques) {
        _uniques = uniques;
    };

    /**
    * Get array of unique metric names, for which user estimation should be applied
    * @memberof module:api/lib/countly.model~countlyMetric
    * @returns {array} uniques - array of strings with unique metrics for current data, for example: ["u"]
    */
    countlyMetric.getUniqueMetrics = function() {
        return _uniques;
    };

    /**
    * Sets array of metric names that is used by this model
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {array} metrics - array of strings with metric names for current data, return will be sorted by first metric, default: ["t", "u", "n"]
    */
    countlyMetric.setMetrics = function(metrics) {
        _metrics = metrics;
    };

    /**
    * Get array of metric names, for this data
    * @memberof module:api/lib/countly.model~countlyMetric
    * @returns {array} uniques - array of strings with metrics for current data, for example: ["t", "u", "n"]
    */
    countlyMetric.getMetrics = function() {
        return _metrics;
    };

    /**
    * Get array of unique segment values available for provided segment data
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} metric - name of the segment/metric to get meta for, by default will use default _name provided on initialization
    * @returns {array} array of unique segment values
    */
    countlyMetric.getMeta = function(metric) {
        return _metas[metric] || [];
    };

    /**
    * Get data after initialize finished and data was retrieved
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} segment - name of the segment to get data for, or will try to get higher level data, like from users collection, without segments
    * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
    * @param {boolean} join - join none unique metrics into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
    * @returns {object} chartData
    * @example <caption>Example output of separate data for 2 pie charts</caption>
    *{"chartData":[
    *    {"langs":"English","t":124,"u":112,"n":50},
    *    {"langs":"Italian","t":83,"u":74,"n":30},
    *    {"langs":"German","t":72,"u":67,"n":26},
    *    {"langs":"Japanese","t":62,"u":61,"n":19},
    *    {"langs":"French","t":66,"u":60,"n":28},
    *    {"langs":"Korean","t":64,"u":58,"n":26}
    *],
    *"chart_t":{
    *    "dp":[
    *        {"data":[[0,124]],"label":"English"},
    *        {"data":[[0,83]],"label":"Italian"},
    *        {"data":[[0,72]],"label":"German"},
    *        {"data":[[0,62]],"label":"Japanese"},
    *        {"data":[[0,66]],"label":"French"},
    *        {"data":[[0,64]],"label":"Korean"}
    *    ]
    *},
    *"chart_n":{
    *    "dp":[
    *        {"data":[[0,50]],"label":"English"},
    *        {"data":[[0,30]],"label":"Italian"},
    *        {"data":[[0,26]],"label":"German"},
    *        {"data":[[0,19]],"label":"Japanese"},
    *        {"data":[[0,28]],"label":"French"},
    *        {"data":[[0,26]],"label":"Korean"}
    *    ]
    *}}
    * @example <caption>Example output of joined data for 1 bar chart</caption>
    *{"chartData":[
    *    {"langs":"English","t":124,"u":112,"n":50},
    *    {"langs":"Italian","t":83,"u":74,"n":30},
    *    {"langs":"German","t":72,"u":67,"n":26},
    *    {"langs":"Japanese","t":62,"u":61,"n":19},
    *    {"langs":"French","t":66,"u":60,"n":28},
    *    {"langs":"Korean","t":64,"u":58,"n":26}
    *],
    *"chartDP":{
    *    "dp":[
    *        {"data":[[-1,null],[0,124],[1,83],[2,72],[3,62],[4,66],[5,64],[6,null]],"label":"t"},
    *        {"data":[[-1,null],[0,50],[1,30],[2,26],[3,19],[4,28],[5,26],[6,null]],"label":"n"}
    *    ],
    *   "ticks":[
    *        [-1,""], //used for padding for bars
    *        [6,""], //used for padding for bars
    *        [0,"English"],
    *        [1,"Italian"],
    *        [2,"German"],
    *        [3,"Japanese"],
    *        [4,"French"],
    *        [5,"Korean"]
    *    ]
    *}}
    * @example <caption>Example output of higher level data without segments</caption>
    */
    countlyMetric.getData = function(segment, clean, join) {
        if (segment) {
            let dataProps = [
                {
                    name: segment,
                    func: function(rangeArr) {
                        rangeArr = countlyCommon.decode(rangeArr);
                        if (fetchValue && !clean) {
                            return fetchValue(rangeArr);
                        }
                        else {
                            return rangeArr;
                        }
                    }
                }];

            //add metrics
            for (let i = 0; i < _metrics.length; i++) {
                dataProps.push({ "name": _metrics[i] });
            }
            let chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(segment), this.clearObject, dataProps, _totalUsersObj);
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, segment);
            chartData.chartData.sort(function(a, b) {
                return b[_metrics[0]] - a[_metrics[0]];
            });
            var namesData = _.pluck(chartData.chartData, segment),
                otherData = {};
            for (let i = 0; i < _metrics.length; i++) {
                otherData[_metrics[i]] = _.pluck(chartData.chartData, _metrics[i]);
            }

            if (join) {
                chartData.chartDP = { ticks: [] };
                var chartDP = [];

                for (let i = 0; i < _metrics.length; i++) {
                    chartDP.push({
                        data: [],
                        label: _metrics[i]
                    });
                    chartDP[i].data[0] = [-1, null];
                    chartDP[i].data[namesData.length + 1] = [namesData.length, null];
                }

                chartData.chartDP.ticks.push([-1, ""]);
                chartData.chartDP.ticks.push([namesData.length, ""]);

                for (let i = 0; i < namesData.length; i++) {
                    for (let j = 0; j < _metrics.length; j++) {
                        chartDP[j].data[i + 1] = [i, otherData[_metrics[i]]];
                    }
                    chartData.chartDP.ticks.push([i, namesData[i]]);
                }

                chartData.chartDP.dp = chartDP;
            }
            else {
                for (let j = 0; j < _metrics.length; j++) {
                    var chartData2 = [];

                    for (let i = 0; i < namesData.length; i++) {
                        chartData2[i] = {
                            data: [
                                [0, otherData[_metrics[j]][i]]
                            ],
                            label: namesData[i]
                        };
                    }

                    chartData["chartDP" + _metrics[j]] = {};
                    chartData["chartDP" + _metrics[j]].dp = chartData2;
                }
            }
            return chartData;
        }
        else {
            //try to fetch higher level data without segments
            let chartData = [],
                dataProps = [];

            for (let i = 0; i < _metrics.length; i++) {
                chartData.push({
                    data: [],
                    label: _metrics[i]
                });
                dataProps.push({ name: _metrics[i] });
            }

            return countlyCommon.extractChartData(this.getDb(), this.clearObject, chartData, dataProps);
        }
    };

    /**
    * Prefill all expected metrics as u, t, n with 0 if they don't exist, to avoid null values in the result, which won't work when drawing graphs
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {object} obj - oject to prefill with  values if they don't exist
    * @returns {object} prefilled object
    */
    countlyMetric.clearObject = function(obj) {
        if (obj) {
            for (let i = 0; i < _metrics.length; i++) {
                if (!obj[_metrics[i]]) {
                    obj[_metrics[i]] = 0;
                }
            }
        }
        else {
            obj = {};
            for (let i = 0; i < _metrics.length; i++) {
                obj[_metrics[i]] = 0;
            }
        }

        return obj;
    };

    /**
    * Get bar data for metric
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} segment - name of the segment to get data for, or use date, for higher level metric without segments
    * @param {number} maxItems - amount of top items to return
    * @param {string} metric - name of the to use for ordering and returning
    * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
    */
    countlyMetric.getBars = function(segment, maxItems, metric) {
        metric = metric || _metrics[0];
        if (segment) {
            return countlyCommon.extractBarData(_Db, this.getMeta(segment), this.clearObject, fetchValue, maxItems, metric, this.getTotalUsersObj(), this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
        }
        else {
            var barData = [],
                sum = 0,
                totalPercent = 0;

            maxItems = maxItems || 3;

            var chartData = [
                    {
                        data: [],
                        label: metric
                    }
                ],
                dataProps = [
                    {
                        name: metric,
                        func: function(dataObj) {
                            return dataObj[metric];
                        }
                    }
                ];

            var totalUserData = countlyCommon.extractChartData(this.getDb(), this.clearObject, chartData, dataProps),
                topUsers = _.sortBy(_.reject(totalUserData.chartData, function(obj) {
                    return obj[metric] === 0;
                }), function(obj) {
                    return -obj[metric];
                });

            topUsers.forEach(function(r) {
                sum += r[metric];
            });

            for (var i = topUsers.length - 1; i >= 0; i--) {
                var percent = countlyCommon.round((topUsers[i][metric] / sum) * 100, 1);
                totalPercent += percent;

                barData[i] = {
                    "name": topUsers[i].date,
                    value: topUsers[i][metric],
                    "percent": percent
                };
            }

            barData = countlyCommon.fixPercentageDelta(barData, totalPercent);

            if (topUsers.length < maxItems) {
                maxItems = topUsers.length;
            }

            barData = barData.slice(0, maxItems);

            return _.sortBy(barData, function(obj) {
                return -obj.value;
            });
        }
    };

    /**
    * Get data for dynamic tables
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} segment - name of the segment to get data for, by default will use default _name provided on initialization
    * @param {number} maxItems - amount of top items to return
    * @returns {array} object to use when displaying table 
    * @example 
    *{
    *    cols: [ segment1, count, sum, duration ] 
    *    rows: [
    *    [segmentValue1, 15, 10, 10],
    *    [segmentValue2, 14, 10, 10],
    *    [segmentValue3, 12, 10, 10]          
    *    ]
    *}
    */
    countlyMetric.getTableData = function(segment, maxItems) {
        var cols = _metrics.slice();
        cols.unshift(segment || "date");
        var ret = {
            cols: cols,
            rows: []
        };
        var data = this.getData(segment, false, true).chartData;
        data = _.sortBy(_.reject(data, function(obj) {
            return obj[cols[1]] === 0;
        }), function(obj) {
            return -obj[cols[1]];
        });
        if (data.length < maxItems) {
            maxItems = data.length;
        }
        for (var i = 0; i < maxItems; i++) {
            var ob = [];
            for (var j = 0; j < cols.length; j++) {
                if (typeof data[i][cols[j]] === "number") {
                    data[i][cols[j]] = Math.round(data[i][cols[j]] * 100) / 100;
                }
                ob.push(data[i][cols[j]]);
            }
            ret.rows.push(ob);
        }
        return ret;
    };

    /**
    * Get value of single metric with changes and sparkle lines
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} metric - metric name to return value for
    * @param {boolean} isSparklineNotRequired - boolean to identify if sparkLines object is required in response
    * @returns {array} object to use when displaying number {value: 123, change: 12, sparkline: [1,2,3,4,5,6,7]}
    */
    countlyMetric.getNumber = function(metric, isSparklineNotRequired) {
        var periodObject = null;
        if (this.getPeriod()) { // only set custom period if it was explicitly set on the model object
            periodObject = countlyCommon.getPeriodObj({qstring: {}}, this.getPeriod());
        }
        metric = metric || _metrics[0];
        var metrics = [metric];
        //include other default metrics for data correction
        if (metric === "u") {
            metrics.push("n");
            metrics.push("t");
        }
        if (metric === "n") {
            metrics.push("u");
        }
        var data = countlyCommon.getDashboardData(this.getDb(), metrics, _uniques, { u: this.getTotalUsersObj().users }, { u: this.getTotalUsersObj(true).users }, periodObject);
        if (isSparklineNotRequired) {
            return data[metric];
        }
        var ob = {};
        ob[metric] = metric;
        var sparkLines = countlyCommon.getSparklineData(this.getDb(), ob, function(obj) {
            if (obj) {
                if (!obj[metric]) {
                    obj[metric] = 0;
                }
            }
            else {
                obj = {};
                obj[metric] = 0;
            }

            return obj;
        }, periodObject);
        for (let i in data) {
            if (sparkLines[i]) {
                data[i].sparkline = sparkLines[i].split(",").map(function(item) {
                    return parseInt(item);
                });
            }
        }
        return data[metric];
    };

    /**
    * Get timeline data for higher metrics without segments
    * @memberof module:api/lib/countly.model~countlyMetric
    * @returns {array} object to use when displaying number {value: 123, change: 12, sparkline: [1,2,3,4,5,6,7]}
    */
    countlyMetric.getTimelineData = function() {
        var dataProps = [];
        var periodObject = null;
        for (let i = 0; i < _metrics.length; i++) {
            dataProps.push({ name: _metrics[i] });
        }
        if (this.getPeriod()) { // only set custom period if it was explicitly set on the model object
            periodObject = countlyCommon.getPeriodObj({qstring: {}}, this.getPeriod());
        }
        var data = countlyCommon.extractData(this.getDb(), this.clearObject, dataProps, periodObject);
        var ret = {};
        for (let i = 0; i < data.length; i++) {
            ret[data[i]._id] = {};
            for (let j = 0; j < _metrics.length; j++) {
                ret[data[i]._id][_metrics[j]] = data[i][_metrics[j]];
            }
        }
        return ret;
    };

    /**
    * Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
    * @memberof module:api/lib/countly.model~countlyMetric
    * @param {string} metric - name of the property in the model to fetch
    * @param {string} meta - name of the meta where property's ranges are stored
    * @param {string} explain - function that receives index of the bucket and returns bucket name
    * @returns {object}  with range data
    * @example <caption>Example output</caption>
    * //call
    * //countlyMetric.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange);
    * //returns
    * {"chartData":[
    *    {"f":"First session","t":271,"percent":"<div class='percent-bar' style='width:171px;'></div>85.5%"},
    *    {"f":"2 days","t":46,"percent":"<div class='percent-bar' style='width:29px;'></div>14.5%"}
    *  ],
    *  "chartDP":{
    *      "dp":[
    *        {"data":[[-1,null],[0,271],[1,46],[2,null]]}
    *      ],
    *      "ticks":[
    *        [-1,""],
    *        [2,""],
    *        [0,"First session"],
    *        [1,"2 days"]
    *      ]
    *   }
    *  }
    **/
    countlyMetric.getRangeData = function(metric, meta, explain) {

        var chartData = {
            chartData: {},
            chartDP: {
                dp: [],
                ticks: []
            }
        };

        chartData.chartData = countlyCommon.extractRangeData(_Db, metric, this.getMeta(meta), explain);

        var frequencies = _.pluck(chartData.chartData, metric),
            frequencyTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                { data: [] }
            ];

        chartDP[0].data[0] = [-1, null];
        chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([frequencies.length, ""]);

        for (let i = 0; i < frequencies.length; i++) {
            chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
            chartData.chartDP.ticks.push([i, frequencies[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (let i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i].percent = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i].percent) + "px;'></div>" + chartData.chartData[i].percent + "%";
        }

        return chartData;
    };

    /**
    * Sets meta object
    **/
    function setMeta() {
        if (_Db.meta) {
            for (let i in _Db.meta) {
                _metas[i] = (_Db.meta[i]) ? _Db.meta[i] : [];
            }
        }
        else {
            _metas = {};
        }
    }

    /**
    * Extends meta object
    **/
    function extendMeta() {
        if (_Db.meta) {
            for (let i in _Db.meta) {
                _metas[i] = countlyCommon.union(_metas[i], _Db.meta[i]);
            }
        }
    }

    return countlyMetric;
};

module.exports = countlyModel;