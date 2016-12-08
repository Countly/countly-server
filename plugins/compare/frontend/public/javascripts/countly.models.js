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


(function (countlyAppCompare, $) {

    //Private Properties
    var _appData = {},
        _sessions = {};

    //Public Methods
    countlyAppCompare.initialize = function (forApps) {
        if (!forApps || forApps.length == 0) {
            return true;
        }

        _period = countlyCommon.getPeriodForAjax();

        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r + "/compare/apps",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "apps": JSON.stringify(forApps),
                "period":_period
            },
            dataType:"jsonp",
            success:function (json) {

                _appData["all"] = {};
                _appData["all"].id = "all";
                _appData["all"].name = jQuery.i18n.map["compare.apps.all-apps"] || "All apps";
                _appData["all"].sessions = {total:0, trend:0};
                _appData["all"].users = {total:0, trend:0};
                _appData["all"].newusers = {total:0, trend:0};
                _appData["all"].duration = {total:0, trend:0};
                _appData["all"].avgduration = {total:0, trend:0};
                _sessions["all"] = {};

                for(var i = 0; i <  json.length; i++){
                    var appID = json[i].id;
                    _appData[appID] = json[i];
                    _appData[appID].duration.total = 0;
                    _appData[appID].avgduration.total = 0;
                    _sessions[appID] = {};

                    for(var metric in json[i].charts){
                        var key = "draw-"+metric;
                        _sessions[appID][key] = {
                            data: json[i].charts[metric]
                        };

                        for(var j = 0, l = json[i].charts[metric].length; j < l; j++){

                            if(!_sessions["all"][key]){
                                _sessions["all"][key] = {};
                                _sessions["all"][key].data = [];
                            }
                            if(!_sessions["all"][key].data[j]){
                                _sessions["all"][key].data[j] = [0,0];
                            }
                            _sessions["all"][key].data[j][0] = _sessions[appID][key].data[j][0];
                            _sessions["all"][key].data[j][1] += parseFloat(_sessions[appID][key].data[j][1]);
                            if(key == "draw-total-time-spent"){
                                _appData["all"].duration.total += parseFloat(_sessions[appID][key].data[j][1]);
                                _appData[appID].duration.total += parseFloat(_sessions[appID][key].data[j][1]);
                            }
                        }
                    }

                    _appData["all"].sessions.total += _appData[appID].sessions.total;
                    _appData["all"].users.total += _appData[appID].users.total;
                    _appData["all"].newusers.total += _appData[appID].newusers.total;
                    _appData["all"].sessions.trend += fromShortNumber(_appData[appID].sessions.change);
                    _appData["all"].users.trend += fromShortNumber(_appData[appID].users.change);
                    _appData["all"].newusers.trend += fromShortNumber(_appData[appID].newusers.change);
                    _appData["all"].duration.trend += fromShortNumber(_appData[appID].duration.change);
                    _appData["all"].avgduration.trend += fromShortNumber(_appData[appID].avgduration.change);
                    _appData[appID].avgduration.total = (_appData[appID].sessions.total == 0 ) ? 0 : _appData[appID].duration.total/_appData[appID].sessions.total;
                }

                for(var i in _appData["all"]){
                    if(_appData["all"][i].trend < 0)
                        _appData["all"][i].trend = "d";
                    else
                        _appData["all"][i].trend = "u";
                }

                _appData["all"].avgduration.total = (_appData["all"].sessions.total == 0 ) ? 0 : _appData["all"].duration.total/_appData["all"].sessions.total;
            }
        });
    };

    countlyAppCompare.refresh = function () {
        return true;
    };

    countlyAppCompare.reset = function () {
        _appData = {};
        _sessions = {};
    };

    countlyAppCompare.getChartData = function(forApp, metric) {
        if (_sessions[forApp] && _sessions[forApp][metric] && _sessions[forApp][metric].data) {
            var props = countlyAppCompare.getProperties();

            return {
                chartDP: [[], {
                    data: _sessions[forApp][metric].data,
                    label: props[metric]
                }]
            };
        } else {
            return {
                chartDP: [[], []]
            };
        }
    };

    countlyAppCompare.getTableData = function() {
        var data = [];

        for(var i in _appData){
            data.push(_appData[i]);
        }

        return data;
    };

    countlyAppCompare.getProperties = function() {
        return {
            "draw-total-sessions":jQuery.i18n.map["common.total-sessions"],
            "draw-total-users":jQuery.i18n.map["compare.apps.total-unique"],
            "draw-new-users":jQuery.i18n.map["compare.apps.new-unique"],
            "draw-total-time-spent":jQuery.i18n.map["dashboard.time-spent"],
            "draw-time-spent":jQuery.i18n.map["dashboard.avg-time-spent"]
        };
    };

    var fromShortNumber = function(str){
        if(str == "NA" || str == "∞"){
            return 0;
        }
        else{
            str = str.slice(0, -1);
            var rate = 1;
            if(str.slice(-1) == "K"){
                str = str.slice(0, -1);
                rate = 1000;
            }
            else if(str.slice(-1) == "M"){
                str = str.slice(0, -1);
                rate = 1000000;
            }
            return parseFloat(str)*rate;
        }
    };
    
}(window.countlyAppCompare = window.countlyAppCompare || {}, jQuery));