var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

var countlyEvent = countlyModel.create("events");

countlyEvent.__getBars = countlyEvent.getBars;
countlyEvent.getBars = function (segment, maxItems, metric) {
    if(segment){
        return countlyEvent.__getBars(segment, maxItems, metric);
    }
    else{
        var barData = [],
            sum = 0,
            maxItems = maxItems || 3,
            metric = metric || "c",
            totalPercent = 0;
    
        var chartData = [
                { data:[], label:"Total Count" }
            ],
            dataProps = [
                {
                    name:metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    }
                }
            ];
    
        var totalUserData = countlyCommon.extractChartData(countlyEvent.getDb(), countlyEvent.clearObject, chartData, dataProps),
            topUsers = underscore.sortBy(underscore.reject(totalUserData.chartData, function (obj) {
                return obj[metric] == 0;
            }), function (obj) {
                return -obj[metric];
            });
    
        if (topUsers.length < maxItems) {
            maxItems = topUsers.length;
        }
    
        for (var i = 0; i < maxItems; i++) {
            sum += topUsers[i][metric];
        }
    
        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((topUsers[i][metric] / sum) * 100);
            totalPercent += percent;
    
            if (i == (maxItems - 1)) {
                percent += 100 - totalPercent;
            }
    
            barData[i] = { "name":topUsers[i]["date"], value:topUsers[i][metric], "percent":percent };
        }
    
        return underscore.sortBy(barData, function(obj) { return -obj.percent; });
    }
};

countlyEvent.getData = function (clean, join, metric) {
    if(metric){
    var chartData = countlyCommon.extractTwoLevelData(this.getDb(), this.getMeta(metric), this.clearObject, [
        {
            name:metric || _name,
            func:function (rangeArr, dataObj) {
                rangeArr = countlyCommon.decode(rangeArr);
                return rangeArr;
            }
        },
        { "name":"c" },
        { "name":"s" },
        { "name":"dur" }
    ], this.getTotalUsersObj());
    chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric);
    chartData.chartData.sort(function(a,b){return b.c-a.c})
    var namesData = underscore.pluck(chartData.chartData, metric),
        totalData = underscore.pluck(chartData.chartData, 'c'),
        newData = underscore.pluck(chartData.chartData, 's');
        
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

        var sum = underscore.reduce(totalData, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < namesData.length; i++) {
            var percent = (totalData[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, totalData[i]]
            ], label:namesData[i]};
        }

        var sum2 = underscore.reduce(newData, function (memo, num) {
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
    }
    else{
        var chartData = [
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" }
        ],
        dataProps = [
            { name:"c" },
            { name:"s" },
            { name:"dur" }
        ];

    return countlyCommon.extractChartData(countlyEvent.getDb(), countlyEvent.clearObject, chartData, dataProps);
    }
};

countlyEvent.clearObject = function (obj) {
    if (obj) {
        if (!obj["c"]) obj["c"] = 0;
        if (!obj["s"]) obj["s"] = 0;
        if (!obj["dur"]) obj["dur"] = 0;
    }
    else {
        obj = {"c":0, "s":0, "dur":0};
    }

    return obj;
};

module.exports = countlyEvent;