(function (countlyEventCompare, $) {
    //Private Properties
    var _periodObj = {},
        _dbOb = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = null,
        _events = [];

    //Public Methods
    countlyEventCompare.initialize = function (forEvents) {
        if (_initialized &&
            _period == countlyCommon.getPeriodForAjax() &&
            _activeAppKey == countlyCommon.ACTIVE_APP_KEY &&
            _.isEqual(_events, forEvents)) {
            return this.refresh();
        }

        if (!forEvents || forEvents.length == 0) {
            return true;
        }

        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;
            _events = _.clone(forEvents);

            return $.when(
                    $.ajax({
                        type:"GET",
                        url:countlyCommon.API_PARTS.data.r + "/compare/events",
                        data:{
                            "api_key":countlyGlobal.member.api_key,
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "period":_period,
                            "events": JSON.stringify(forEvents)
                        },
                        dataType:"jsonp",
                        success:function (json) {
                            _dbOb = json;
                        }
                    })
                ).then(function(){
                    return true;
                });
        } else {
            _dbOb = {"2012":{}};
            return true;
        }
    };

    countlyEventCompare.refresh = function () {
        _periodObj = countlyCommon.periodObj;

        if (!countlyCommon.DEBUG) {

            if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                return this.initialize();
            }

            if(!_initialized)
                return this.initialize();

            return $.when(
                    $.ajax({
                        type:"GET",
                        url:countlyCommon.API_PARTS.data.r+ "/compare/events",
                        data:{
                            "api_key":countlyGlobal.member.api_key,
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "action":"refresh",
                            "events": JSON.stringify(_events)
                        },
                        dataType:"jsonp",
                        success:function (json) {
                            var events = _.keys(json);

                            for (var i = 0; i < events.length; i++) {
                                countlyCommon.extendDbObj(_dbOb[events[i]], json[events[i]]);
                            }
                        }
                    })
                ).then(function(){
                    return true;
                });
        } else {
            _dbOb = {"2012":{}};

            return true;
        }
    };

    countlyEventCompare.reset = function () {
        _periodObj = {};
        _dbOb = {};
        _activeAppKey = 0;
        _initialized = false;
        _period = null;
        _events = [];
    };

    countlyEventCompare.getChartData = function(forEvent, metric) {
        var props = countlyEventCompare.getProperties(),
            chartData = [
                { data:[], label:props[metric], color:'#DDDDDD', mode:"ghost" },
                { data:[], label:props[metric], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"p"+metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    },
                    period:"previous"
                },
                { name:metric}
            ];

        return countlyCommon.extractChartData(_dbOb[forEvent], countlyEventCompare.clearObject, chartData, dataProps);
    };

    countlyEventCompare.getTableData = function () {

        var tableData = [];

        for (var i = 0; i < _events.length; i++) {
            var props = countlyEventCompare.getProperties(),
                tableRow = {
                    "id": _events[i],
                    "name": countlyEvent.getEventLongName(_events[i])
                };

            for (var prop in props) {
                var data = countlyEventCompare.getChartData(_events[i], prop, props[prop]),
                    tmpPropVals = _.pluck(data.chartData, prop);

                if (tmpPropVals.length) {
                    tableRow[prop] = _.reduce(tmpPropVals, function(memo, num){ return memo + num; }, 0);
                }
            }

            tableData.push(tableRow);
        }

        return tableData;
    };

    countlyEventCompare.clearObject = function (obj) {
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

    countlyEventCompare.getProperties = function() {
        return {
            "c":jQuery.i18n.map["events.count"],
            "s":jQuery.i18n.map["events.sum"],
            "dur":jQuery.i18n.map["events.dur"]
        }
    };

})(window.countlyEventCompare = window.countlyEventCompare || {}, jQuery);