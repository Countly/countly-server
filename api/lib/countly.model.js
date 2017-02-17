var countlyCommon = require('./countly.common.js'),
    _ = require('underscore');
/**
* This module loads existing model or create one from default module if it does not exist
* @module api/lib/countly_model
*/

/** @lends module:api/lib/countly_model */
var countlyModel = {};

/**
* Loads countly model for provided metric if it already exists in api/lib folder or creates new one from default model if it does not exist
* @param {string} metric - metric name to retrieve from server
* @example
* var countlyModel = require("api/lib/countly.mode.js");
* var countlyDensity = countlyModel.load("density");
*/
countlyModel.load = function(metric){
    var _name = (metric.name)? metric.name : metric;
    var model;
    try{
        model = require("./countly."+_name+".js");
    }
    catch(ex){
        model = this.create(metric);
    }
    return model;
};

/**
* Create Countly metric model to fetch metric data from server and provide it to views
* @param {string} metric - metric name to retrieve from server
* @param {function=} fetchValue - default function to fetch and transform if needed value from standard metric model
* @example
* var countlyModel = require("api/lib/countly.mode.js");
* var countlyDensity = countlyModel.create("density", function(val, data, separate){
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
countlyModel.create = function (metric, fetchValue) {
    /**
    * Common metric object, all metric models inherit from it and should have these methods
    * @name countlyMetric
    * @namespace countlyMetric
    */
    var countlyMetric = {};
    //Private Properties
    var _periodObj = {},
        _Db = {},
        _metrics = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = null,
        _totalUsersObj = {},
        _name = metric;

    /**
    * Reset/delete all retrieved metric data, like when changing app or selected time period
    * @memberof countlyMetric
    */
    countlyMetric.reset = function () {
        _Db = {};
        setMeta();
    };
    
    /**
    * Get current data, if some view or model requires access to raw data
    * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
    */
    countlyMetric.getDb = function () {
        return _Db;
    };
    
    /**
    * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
    * @param {object} db - set new data to be used by model
    */
    countlyMetric.setDb = function (db) {
        _Db = db;
        setMeta();
    };
    
    /**
    * Extend current data for model with some additional information about latest period (like data from action=refresh request)
    * @param {object} db - set new data to be used by model
    */
    countlyMetric.extendDb = function (data) {
        countlyCommon.extendDbObj(_Db, data);
        extendMeta();
    };
    
    /**
    * Set total user object for this metric to use for unique user correction
    * @param {object} totalUsersObj - object with total user data from {@link module:api/parts/data/fetch.getTotalUsersObj}
    */
    countlyMetric.setTotalUsersObj = function(totalUsersObj) {
        _totalUsersObj = totalUsersObj;
    };
    
    /**
    * Get total user object for this metric to use for unique user correction
    * @returns {object} object with total user data from {@link module:api/parts/data/fetch.getTotalUsersObj}
    */
    countlyMetric.getTotalUsersObj = function() {
        return _totalUsersObj;
    };
    
    /**
    * Get array of unique segments available for metric data
    * @param {string} metric - name of the segment/metric to get meta for, by default will use default _name provided on initialization
    * @returns {array} array of unique metric values
    */
    countlyMetric.getMeta = function (metric) {
        metric = metric || _name;
        return _metrics[metric] || [];
    };

    /**
    * Get data after initialize finished and data was retrieved
    * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
    * @param {boolean} join - join new and total users into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
    * @param {string} metric - name of the segment/metric to get data for, by default will use default _name provided on initialization
    * returns {object} chartData
    * @example <caption>Example output of separate data for 2 pie charts</caption>
    *{"chartData":[
    *    {"langs":"English","t":124,"u":112,"n":50},
    *    {"langs":"Italian","t":83,"u":74,"n":30},
    *    {"langs":"German","t":72,"u":67,"n":26},
    *    {"langs":"Japanese","t":62,"u":61,"n":19},
    *    {"langs":"French","t":66,"u":60,"n":28},
    *    {"langs":"Korean","t":64,"u":58,"n":26}
    *],
    *"chartDPTotal":{
    *    "dp":[
    *        {"data":[[0,124]],"label":"English"},
    *        {"data":[[0,83]],"label":"Italian"},
    *        {"data":[[0,72]],"label":"German"},
    *        {"data":[[0,62]],"label":"Japanese"},
    *        {"data":[[0,66]],"label":"French"},
    *        {"data":[[0,64]],"label":"Korean"}
    *    ]
    *},
    *"chartDPNew":{
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
    *        {"data":[[-1,null],[0,124],[1,83],[2,72],[3,62],[4,66],[5,64],[6,null]],"label":"Total Sessions"},
    *        {"data":[[-1,null],[0,50],[1,30],[2,26],[3,19],[4,28],[5,26],[6,null]],"label":"New Users"}
    *    ],
    *   "ticks":[
    *        [-1,""], //used for padding for bars
    *        [23,""], //used for padding for bars
    *        [0,"English"],
    *        [1,"Italian"],
    *        [2,"German"],
    *        [3,"Japanese"],
    *        [4,"French"],
    *        [5,"Korean"]
    *    ]
    *}}
    */
    countlyMetric.getData = function (clean, join, metric) {
        var chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric), this.clearObject, [
            {
                name:metric || _name,
                func:function (rangeArr, dataObj) {
                    rangeArr = countlyCommon.decode(rangeArr);
                    if(fetchValue && !clean)
                        return fetchValue(rangeArr);
                    else
                        return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ], _totalUsersObj);
        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric || _name);
        chartData.chartData.sort(function(a,b){return b.t-a.t})
        var namesData = _.pluck(chartData.chartData, metric || _name),
            totalData = _.pluck(chartData.chartData, 't'),
            newData = _.pluck(chartData.chartData, 'n');
            
        if(join){
            chartData.chartDP = {ticks:[]};
            var chartDP = [
                {data:[], label:"common.table.total-sessions"},
                {data:[], label:"common.table.new-users"}
            ];

            chartDP[0]["data"][0] = [-1, null];
            chartDP[0]["data"][namesData.length + 1] = [namesData.length, null];
            chartDP[1]["data"][0] = [-1, null];
            chartDP[1]["data"][namesData.length + 1] = [namesData.length, null];
    
            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([namesData.length, ""]);
    
            for (var i = 0; i < namesData.length; i++) {
                chartDP[0]["data"][i + 1] = [i, totalData[i]];
                chartDP[1]["data"][i + 1] = [i, newData[i]];
                chartData.chartDP.ticks.push([i, namesData[i]]);
            }
    
            chartData.chartDP.dp = chartDP;
        }
        else{
            var chartData2 = [],
            chartData3 = [];

            var sum = _.reduce(totalData, function (memo, num) {
                return memo + num;
            }, 0);

            for (var i = 0; i < namesData.length; i++) {
                var percent = (totalData[i] / sum) * 100;
                chartData2[i] = {data:[
                    [0, totalData[i]]
                ], label:namesData[i]};
            }

            var sum2 = _.reduce(newData, function (memo, num) {
                return memo + num;
            }, 0);

            for (var i = 0; i < namesData.length; i++) {
                var percent = (newData[i] / sum) * 100;
                chartData3[i] = {data:[
                    [0, newData[i]]
                ], label:namesData[i]};
            }

            chartData.chartDPTotal = {};
            chartData.chartDPTotal.dp = chartData2;

            chartData.chartDPNew = {};
            chartData.chartDPNew.dp = chartData3;
        }
        return chartData;
    };

    /**
    * Prefill all expected properties as u, t, n with 0, to avoid null values in the result, if they don't exist, which won't work when drawing graphs
    * @param {object} obj - oject to prefill with  values if they don't exist
    * @returns prefilled object
    */
    countlyMetric.clearObject = function (obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0};
        }

        return obj;
    };

    /**
    * Get bar data for metric
    * @param {string} segment - name of the segment to get data for, by default will use default _name provided on initialization
    * @param {number} maxItems - amount of top items to return
    * @param {string} metric - name of the to use for ordering and returning
    * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
    */
    countlyMetric.getBars = function (segment, maxItems, metric) {
        return countlyCommon.extractBarData(_Db, this.getMeta(segment), this.clearObject, fetchValue, maxItems, metric);
    };
    
    /**
    * Get data for dynamic tables
    * @param {string} segment - name of the segment to get data for, by default will use default _name provided on initialization
    * @param {number} maxItems - amount of top items to return
    * @param {array} metrics - array of metrics to return, will order and cut by first metric
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
    countlyMetric.getTableData = function (segment, maxItems, metrics) {
        metrics = metrics || ["u"];
        var cols = metrics.slice();
        cols.unshift(segment || "date");
        var ret = {
            cols: cols,
            rows:[]
        };
        var data = this.getData(false, true, segment).chartData;
        data.sort(function(a, b){
            return b[cols[1]] - a[cols[1]];
        });
        if (data.length < maxItems) {
            maxItems = data.length;
        }
        for(var i = 0; i < maxItems; i++){
            var ob = [];
            for(var j = 0; j < cols.length; j++){
                ob.push(data[i][cols[j]]);
            }
            ret.rows.push(ob);
        }
        return ret;
    };
    
    /**
    * Get value of single metric with changes and sparkle lines
    * @param {array} metrics - array of metrics to display
    * @returns {array} object to use when displaying number {value: 123, change: 12, sparkline: [1,2,3,4,5,6,7]}
    */
    countlyMetric.getNumber = function (metric) {
         var data = countlyCommon.getDashboardData(this.getDb(), [metric], [], {}, this.clearObject);
         var ob = {};
         ob[metric] = metric;
         var sparkLines = countlyCommon.getSparklineData(this.getDb(), ob, function(obj){
            if (obj) {
                if (!obj[metric]) obj[metric] = 0;
            }
            else {
                obj = {};
                obj[metric] = 0;
            }
    
            return obj;
         });
        for(var i in data){
            data[i].sparkline = sparkLines[i].split(",").map(function(item){return parseInt(item);});
        }
         return data[metric];
    };
    
    /**
    * Get timeline data for higher metrics without segments
    * @param {string} metric - name of the to use for ordering and returning
    * @returns {array} object to use when displaying number {value: 123, change: 12, sparkline: [1,2,3,4,5,6,7]}
    */
    countlyMetric.getTimelineData = function (metrics) {
        var dataProps = [];
        for(var i = 0; i <  metrics.length; i++){
            dataProps.push({name:metrics[i]});
        }
        var data = countlyCommon.extractData(this.getDb(), function(obj){
            if (obj) {
                for(var i = 0; i < metrics.length; i++)
                    if (!obj[metrics[i]]) obj[metrics[i]] = 0;
            }
            else {
                obj = {};
                for(var i = 0; i < metrics.length; i++)
                    obj[metrics[i]] = 0;
            }
    
            return obj;
         }, dataProps);
        var ret = {};
        for(var i = 0; i <  data.length; i++){
            ret[data[i]._id] = {};
            for(var j = 0; j < metrics.length; j++){
                ret[data[i]._id][metrics[j]] = data[i][metrics[j]];
            }
        }
        return ret;
    };
    
    /**
    * Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
    * @param {string} metric - name of the property in the model to fetch
    * @param {string} meta - name of the meta where property's ranges are stored
    * @param {string} explain - function that receives index of the bucket and returns bucket name
    * @returns {object} 
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
    countlyMetric.getRangeData = function (metric, meta, explain) {

        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_Db, metric, this.getMeta(meta), explain);

        var frequencies = _.pluck(chartData.chartData, metric),
            frequencyTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][frequencies.length + 1] = [frequencies.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([frequencies.length, ""]);

        for (var i = 0; i < frequencies.length; i++) {
            chartDP[0]["data"][i + 1] = [i, frequencyTotals[i]];
            chartData.chartDP.ticks.push([i, frequencies[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };

    function setMeta() {
        if (_Db['meta']) {
            for(var i in _Db['meta']){
                _metrics[i] = (_Db['meta'][i]) ? _Db['meta'][i] : [];
            }
        } else {
            _metrics = {};
        }
    }

    function extendMeta() {
        if (_Db['meta']) {
            for(var i in _Db['meta']){
                _metrics[i] = countlyCommon.union(_metrics[i], _Db['meta'][i]);
            }
        }
    }
    
    return countlyMetric;
};

module.exports = countlyModel;