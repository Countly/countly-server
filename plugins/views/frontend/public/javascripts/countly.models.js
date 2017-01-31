(function () {
    window.countlyViews = window.countlyViews || {};
    CountlyHelpers.createMetricModel(window.countlyViews, {name: "views"}, jQuery);
    //Private Properties
    var _periodObj = {},
        _actionData = {},
        _activeAppKey = 0,
        _initialized = false,
        _segment = null,
        _segments = [],
        _name = "views",
        _period = null;

    //Public Methods
    countlyViews.initialize = function () {
        if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return this.refresh();
        }

        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.when(
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":"get_view_segments",
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        if(json && json.segments){
                            for(var i = 0; i < json.segments.length; i++){
                                json.segments[i] = countlyCommon.decode(json.segments[i]);
                            }
                            _segments = json.segments;
                        }
                    }
                }),
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":_name,
                        "segmentation": _segment,
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        countlyViews.setDb(json);
                    }
                })
            ).then(function(){
                return true;
            });
        } else {
            _Db = {"2012":{}};
            return true;
        }
    };

    countlyViews.refresh = function () {
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
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":"get_view_segments",
                        "period":_period,
                        "display_loader": false
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        if(json && json.segments){
                            for(var i = 0; i < json.segments.length; i++){
                                json.segments[i] = countlyCommon.decode(json.segments[i]);
                            }
                            _segments = json.segments;
                        }
                    }
                }),
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":_name,
                        "segmentation": _segment,
                        "action":"refresh"
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        countlyViews.extendDb(json);
                    }
                })
            ).then(function(){
                return true;
            });
        } else {
            _Db = {"2012":{}};

            return true;
        }
    };

    countlyViews._reset = countlyViews.reset;
    countlyViews.reset = function () {
        _actionData = {};
        _segment - null;
        _initialized = false;
        countlyViews._reset();
    };
    
    countlyViews.setSegment = function(segment){
        _segment = countlyCommon.decode(segment);
    };
    
    countlyViews.getSegments = function(){
        return _segments;
    };
    
    countlyViews.loadActionsData = function (view) {
        _period = countlyCommon.getPeriodForAjax();

        return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"get_view_segments",
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    if(json && json.segments){
                        for(var i = 0; i < json.segments.length; i++){
                            json.segments[i] = countlyCommon.decode(json.segments[i]);
                        }
                        _segments = json.segments;
                    }
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r+"/actions",
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "view":view,
                    "segment": _segment,
                    "period":_period
                },
                dataType:"json",
                success:function (json) {
                    _actionData = json;
                }
            })
        ).then(function(){
            return true;
        });
    };
    
    countlyViews.testUrl = function(url, callback){
        $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/urltest",
            data:{
                "url":url
            },
            dataType:"json",
            success:function (json) {
                if(callback)
                    callback(json.result);
            }
        });
    };
    
    countlyViews.getActionsData = function (view) {
        return _actionData;
    };
    
    countlyViews.getChartData = function(path, metric, name){
        var chartData = [
                { data:[], label:name, color:'#DDDDDD', mode:"ghost" },
                { data:[], label:name, color:'#333933' }
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

        return countlyCommon.extractChartData(countlyViews.getDb(), countlyViews.clearObject, chartData, dataProps, path);
    };

    countlyViews.getData = function (clean) {

        var chartData = countlyCommon.extractTwoLevelData(countlyViews.getDb(), countlyViews.getMeta(), countlyViews.clearObject, [
            {
                name:_name,
                func:function (rangeArr, dataObj) {
                    return countlyCommon.decode(rangeArr);
                }
            },
            { "name":"u" },
            { "name":"t" },
            { "name":"s" },
            { "name":"b" },
            { "name":"e" },
            { "name":"d" },
            { "name":"n" }
        ]);

        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);

        return chartData;
    };
    
    countlyViews.clearObject = function (obj) {
        if (obj) {
            if (!obj["u"]) obj["u"] = 0;
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["s"]) obj["s"] = 0;
            if (!obj["e"]) obj["e"] = 0;
            if (!obj["b"]) obj["b"] = 0;
            if (!obj["d"]) obj["d"] = 0;
        }
        else {
            obj = {"u":0, "t":0, "n":0, "s":0, "e":0, "b":0, "d":0};
        }
        return obj;
    };
    
    countlyViews.getViewFrequencyData = function () {
        var _Db = countlyViews.getDb();
        countlyViews.setDb(countlySession.getDb());
        
        var data = countlyViews.getRangeData("vc", "v-ranges", countlyViews.explainFrequencyRange);
        
        countlyViews.setDb(_Db);
        
        return data;
    };
    
    var getRange = function(){
        var visits = jQuery.i18n.map["views.visits"].toLowerCase();
        return [
            "1 - 2 " + visits,
            "3 - 5 " + visits,
            "6 - 10 " + visits,
            "11 - 15 " + visits,
            "16 - 30 " + visits,
            "31 - 50 " + visits,
            "51 - 100 " + visits,
            "> 100 " + visits
        ];
    };
    
    countlyViews.explainFrequencyRange = function (index) {
        return getRange()[index];
    };

    countlyViews.getFrequencyIndex = function (value) {
        return getRange().indexOf(value);
    };

})();