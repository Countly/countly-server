var countlyCarrier = {},
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

(function (countlyCarrier) {

    //Private Properties
    var _periodObj = {},
        _carrierDb = {},
        _carriers = [];

    //Public Methods

    countlyCarrier.setDb = function(db) {
        _carrierDb = db;
        setMeta();
    };

    countlyCarrier.getCarrierData = function () {

        var chartData = countlyCommon.extractTwoLevelData(_carrierDb, _carriers, countlyCarrier.clearCarrierObject, [
            {
                name:"carrier",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" },
            { "name":"u" },
            { "name":"n" }
        ]);

        var carrierNames = underscore.pluck(chartData.chartData, 'carrier'),
            carrierTotal = underscore.pluck(chartData.chartData, 't'),
            carrierNew = underscore.pluck(chartData.chartData, 'n'),
            chartData2 = [],
            chartData3 = [];

        var sum = underscore.reduce(carrierTotal, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < carrierNames.length; i++) {
            var percent = (carrierTotal[i] / sum) * 100;
            chartData2[i] = {data:[
                [0, carrierTotal[i]]
            ], label:carrierNames[i]};
        }

        var sum2 = underscore.reduce(carrierNew, function (memo, num) {
            return memo + num;
        }, 0);

        for (var i = 0; i < carrierNames.length; i++) {
            var percent = (carrierNew[i] / sum) * 100;
            chartData3[i] = {data:[
                [0, carrierNew[i]]
            ], label:carrierNames[i]};
        }

        chartData.chartDPTotal = {};
        chartData.chartDPTotal.dp = chartData2;

        chartData.chartDPNew = {};
        chartData.chartDPNew.dp = chartData3;

        return chartData;
    };

    countlyCarrier.clearCarrierObject = function (obj) {
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

    countlyCarrier.getCarrierBars = function () {
        return countlyCommon.extractBarData(_carrierDb, _carriers, countlyCarrier.clearCarrierObject);
    };

    function setMeta() {
        if (_carrierDb['meta']) {
            _carriers = (_carrierDb['meta']['carriers']) ? _carrierDb['meta']['carriers'] : [];
        } else {
            _carriers = [];
        }
    }
}(countlyCarrier));

module.exports = countlyCarrier;