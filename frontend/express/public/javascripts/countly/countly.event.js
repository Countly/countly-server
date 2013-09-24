(function(countlyEvent, $, undefined) {

    //Private Properties
    var _activeEventDbArr = [],
        _activeEventDbIndex = [],
        _activeEventDb = {},
        _activeEvents = {},
        _activeEvent = "",
        _activeSegmentation = "",
        _activeSegmentations = [],
        _activeSegmentationValues = [],
        _activeAppId = 0,
        _activeAppKey = 0,
        _initialized = false;

    //Public Methods
    countlyEvent.initialize = function(eventChanged) {
        if (!eventChanged && _initialized && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyEvent.refresh();
        }

        _activeAppId = countlyCommon.ACTIVE_APP_ID;

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "get_events"
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _activeEvents = json;
                        if (!_activeEvent && countlyEvent.getEvents()[0]) {
                            _activeEvent = countlyEvent.getEvents()[0].key;
                        }
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "event": _activeEvent
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        if (json.length){
                            _activeEventDbArr = json;
                            _activeEventDbIndex = _.pluck(json, "_id");
                            _activeEventDb = _activeEventDbArr[_activeEventDbIndex.indexOf("no-segment")] || {};
                        }

                        setMeta();
                    }
                })
            ).then(function(){
                return true;
            });
        } else {
            _activeEventDb = {"2012":{}};
            _activeEvents = {};
            return true;
        }
    };

    countlyEvent.refresh = function() {
        if (!countlyCommon.DEBUG) {

            if (_activeAppId != countlyCommon.ACTIVE_APP_ID) {
                _activeAppId = countlyCommon.ACTIVE_APP_ID;
                return countlyEvent.initialize();
            }

            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "get_events"
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _activeEvents = json;
                        if (!_activeEvent && countlyEvent.getEvents()[0]) {
                            _activeEvent = countlyEvent.getEvents()[0].key;
                        }
                    }
                }),
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "action" : "refresh",
                        "event": _activeEvent
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        for (var i=0; i < json.length; i++) {
                            var segIndex = _activeEventDbIndex.indexOf(json[i]["_id"]);

                            if (segIndex == -1) {
                                _activeEventDbArr.push(json[i]);
                                _activeEventDbIndex.push(json[i]["_id"]);
                            } else {
                                _activeEventDbArr[segIndex] = $.extend(true, _activeEventDbArr[segIndex], json[i]);
                            }
                        }

                        _activeEventDb = _activeEventDbArr[_activeEventDbIndex.indexOf(_activeSegmentation || "no-segment")] || {};

                        setMeta();
                    }
                })
            ).then(function(){
                    return true;
                });
        } else {
            _activeEventDb = {"2012":{}};
            _activeEvents = {};
            return true;
        }
    };

    countlyEvent.reset = function () {
        _activeEventDbArr = [];
        _activeEventDbIndex = [];
        _activeEventDb = {};
        _activeEvents = {};
        _activeEvent = "";
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];
        _activeAppId = 0;
        _activeAppKey = 0;
        _initialized = false;
    };

    countlyEvent.refreshEvents = function () {
        if (!countlyCommon.DEBUG) {
            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key": countlyGlobal.member.api_key,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method":"get_events"
                },
                dataType:"jsonp",
                success:function (json) {
                    _activeEvents = json;
                    if (!_activeEvent && countlyEvent.getEvents()[0]) {
                        _activeEvent = countlyEvent.getEvents()[0].key;
                    }
                }
            });
        } else {
            _activeEvents = {};
            return true;
        }
    };

    countlyEvent.setActiveEvent = function (activeEvent, callback) {
        _activeEventDbArr = [];
        _activeEventDbIndex = [];
        _activeEventDb = {};
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];

        _activeEvent = activeEvent;

        $.when(countlyEvent.initialize()).then(callback);
    };

    countlyEvent.setActiveSegmentation = function (activeSegmentation) {
        _activeSegmentation = activeSegmentation;
    };

    countlyEvent.getActiveSegmentation = function () {
        return (_activeSegmentation) ? _activeSegmentation : jQuery.i18n.map["events.no-segmentation"];
    };

    countlyEvent.getEventData = function () {

        var eventData = {},
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            countString = (eventMap[_activeEvent] && eventMap[_activeEvent].count) ? eventMap[_activeEvent].count : jQuery.i18n.map["events.table.count"],
            sumString = (eventMap[_activeEvent] && eventMap[_activeEvent].sum) ? eventMap[_activeEvent].sum : jQuery.i18n.map["events.table.sum"];

        if (_activeSegmentation) {
            eventData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

            var tmpEventData = countlyCommon.extractTwoLevelData(_activeEventDb, _activeSegmentationValues, countlyEvent.clearEventsObject, [
                {
                    name:"curr_segment",
                    func:function (rangeArr, dataObj) {
                        return rangeArr.replace(/:/g, ".");
                    }
                },
                { "name":"c" },
                { "name":"s" }
            ]);

            eventData.chartData = tmpEventData.chartData;

            var segments = _.pluck(eventData.chartData, "curr_segment").slice(0,15),
                segmentsCount = _.pluck(eventData.chartData, 'c'),
                segmentsSum = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN),
                chartDP = [
                    {data:[], color: countlyCommon.GRAPH_COLORS[0]}
                ];

            if (_.reduce(segmentsSum, function(memo, num) { return memo + num;  }, 0) == 0) {
                segmentsSum = [];
            }

            if (segmentsSum.length) {
                chartDP[chartDP.length] = {data:[], color: countlyCommon.GRAPH_COLORS[1]};
                chartDP[1]["data"][0] = [-1, null];
                chartDP[1]["data"][segments.length + 1] = [segments.length, null];
            }

            chartDP[0]["data"][0] = [-1, null];
            chartDP[0]["data"][segments.length + 1] = [segments.length, null];

            eventData.chartDP.ticks.push([-1, ""]);
            eventData.chartDP.ticks.push([segments.length, ""]);

            for (var i = 0; i < segments.length; i++) {
                chartDP[0]["data"][i + 1] = [i, segmentsCount[i]];
                if (segmentsSum.length) {
                    chartDP[1]["data"][i + 1] = [i, segmentsSum[i]];
                }
                eventData.chartDP.ticks.push([i, segments[i]]);
            }

            eventData.chartDP.dp = chartDP;

            eventData["eventName"] = countlyEvent.getEventLongName(_activeEvent);
            eventData["dataLevel"] = 2;
            eventData["tableColumns"] = [jQuery.i18n.map["events.table.segmentation"], countString];
            if (segmentsSum.length) {
                eventData["tableColumns"][eventData["tableColumns"].length] = sumString;
            } else {
                _.each(eventData.chartData, function (element, index, list) {
                    list[index] = _.pick(element, "curr_segment", "c");
                });
            }
        } else {
            var chartData = [
                    { data:[], label:countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data:[], label:sumString, color: countlyCommon.GRAPH_COLORS[1] }
                ],
                dataProps = [
                    { name:"c" },
                    { name:"s" }
                ];

            eventData = countlyCommon.extractChartData(_activeEventDb, countlyEvent.clearEventsObject, chartData, dataProps);

            eventData["eventName"] = countlyEvent.getEventLongName(_activeEvent);
            eventData["dataLevel"] = 1;
            eventData["tableColumns"] = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);

            if (_.reduce(cleanSumCol, function(memo, num) { return memo + num;  }, 0) != 0) {
                eventData["tableColumns"][eventData["tableColumns"].length] = sumString;
            } else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function (element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }
        }

        var countArr = _.pluck(eventData.chartData, "c");

        if (countArr.length) {
            eventData.totalCount = _.reduce(countArr, function(memo, num){ return memo + num; }, 0);
        }

        var sumArr = _.pluck(eventData.chartData, "s");

        if (sumArr.length) {
            eventData.totalSum = _.reduce(sumArr, function(memo, num){ return memo + num; }, 0);
        }

        return eventData;
    };

    countlyEvent.getEvents = function() {
        var events = (_activeEvents)? ((_activeEvents.list)? _activeEvents.list : []) : [],
            eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
            eventOrder = (_activeEvents)? ((_activeEvents.order)? _activeEvents.order : []) : [],
            eventsWithOrder = [],
            eventsWithoutOrder = [];

        for (var i = 0; i < events.length; i++) {
            var arrayToUse = eventsWithoutOrder;

            if (eventOrder.indexOf(events[i]) !== -1) {
                arrayToUse = eventsWithOrder;
            }

            if (eventMap[events[i]] && eventMap[events[i]]["name"]) {
                arrayToUse.push({
                    "key": events[i],
                    "name": eventMap[events[i]]["name"],
                    "count": eventMap[events[i]]["count"],
                    "sum": eventMap[events[i]]["sum"],
                    "is_active": (_activeEvent == events[i])
                });
            } else {
                arrayToUse.push({
                    "key": events[i],
                    "name": events[i],
                    "count": "",
                    "sum": "",
                    "is_active": (_activeEvent == events[i])
                });
            }
        }

        eventsWithOrder = _.sortBy(eventsWithOrder, function(event){ return eventOrder.indexOf(event.key); });
        eventsWithoutOrder = _.sortBy(eventsWithoutOrder, function(event){ return event.key; });

        return eventsWithOrder.concat(eventsWithoutOrder);
    };

    countlyEvent.getEventsWithSegmentations = function() {
        var eventSegmentations = (_activeEvents)? ((_activeEvents.segments)? _activeEvents.segments : []) : [],
            eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
            eventNames = [];

        for (var event in eventSegmentations) {

            if (eventMap[event] && eventMap[event]["name"]) {
                eventNames.push({
                    "key": event,
                    "name": eventMap[event]["name"]
                });
            } else {
                eventNames.push({
                    "key": event,
                    "name": event
                });
            }

            for (var i = 0; i < eventSegmentations[event].length; i++) {
                if (eventMap[event] && eventMap[event]["name"]) {
                    eventNames.push({
                        "key": event,
                        "name": eventMap[event]["name"] + " / " + eventSegmentations[event][i]
                    });
                } else {
                    eventNames.push({
                        "key": event,
                        "name": event + " / " + eventSegmentations[event][i]
                    });
                }
            }
        }

        return eventNames;
    };

    countlyEvent.getEventMap = function() {
        var events = countlyEvent.getEvents(),
            eventMap = {};

        for (var i = 0; i < events.length; i++) {
            eventMap[events[i].key] = events[i];
        }

        return eventMap;
    };

    countlyEvent.getEventLongName = function (eventKey) {
        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {};

        if (eventMap[eventKey] && eventMap[eventKey]["name"]) {
            return eventMap[eventKey]["name"];
        } else {
            return eventKey;
        }
    };

    countlyEvent.getEventSegmentations = function() {
        return _activeSegmentations;
    };

    countlyEvent.clearEventsObject = function (obj) {
        if (obj) {
            if (!obj["c"]) obj["c"] = 0;
            if (!obj["s"]) obj["s"] = 0;
        }
        else {
            obj = {"c":0, "s":0};
        }

        return obj;
    };

    countlyEvent.getEventSummary = function() {
        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentSum = 0,
            previousSum = 0;

        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriodArr[i]);
                tmp_x = countlyEvent.clearEventsObject(tmp_x);
                tmp_y = countlyEvent.clearEventsObject(tmp_y);

                if (_activeSegmentation) {
                    var tmpCurrCount = _.reduce(_.map(_.filter(tmp_x, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.c || 0; }), function(memo, num){ return memo + num; }, 0),
                        tmpCurrSum = _.reduce(_.map(_.filter(tmp_x, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.s || 0; }), function(memo, num){ return memo + num; }, 0),
                        tmpPrevCount = _.reduce(_.map(_.filter(tmp_y, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.c || 0; }), function(memo, num){ return memo + num; }, 0),
                        tmpPrevSum = _.reduce(_.map(_.filter(tmp_y, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.s || 0; }), function(memo, num){ return memo + num; }, 0);

                    tmp_x = {
                        "c": tmpCurrCount,
                        "s": tmpCurrSum
                    };

                    tmp_y = {
                        "c": tmpPrevCount,
                        "s": tmpPrevSum
                    };
                }

                currentTotal += tmp_x["c"];
                previousTotal += tmp_y["c"];
                currentSum += tmp_x["s"];
                previousSum += tmp_y["s"];
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriod);
            tmp_x = countlyEvent.clearEventsObject(tmp_x);
            tmp_y = countlyEvent.clearEventsObject(tmp_y);

            if (_activeSegmentation) {
                var tmpCurrCount = _.reduce(_.map(_.filter(tmp_x, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.c || 0; }), function(memo, num){ return memo + num; }, 0),
                    tmpCurrSum = _.reduce(_.map(_.filter(tmp_x, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.s || 0; }), function(memo, num){ return memo + num; }, 0),
                    tmpPrevCount = _.reduce(_.map(_.filter(tmp_y, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.c || 0; }), function(memo, num){ return memo + num; }, 0),
                    tmpPrevSum = _.reduce(_.map(_.filter(tmp_y, function(num, key){ return _activeSegmentationValues.indexOf(key) != -1; }), function(num, key){ return num.s || 0; }), function(memo, num){ return memo + num; }, 0);

                tmp_x = {
                    "c": tmpCurrCount,
                    "s": tmpCurrSum
                };

                tmp_y = {
                    "c": tmpPrevCount,
                    "s": tmpPrevSum
                };
            }

            currentTotal = tmp_x["c"];
            previousTotal = tmp_y["c"];
            currentSum = tmp_x["s"];
            previousSum = tmp_y["s"];
        }

        var	changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeSum = countlyCommon.getPercentChange(previousSum, currentSum);

        dataArr =
        {
            usage:{
                "event-total":{
                    "total":currentTotal,
                    "change":changeTotal.percent,
                    "trend":changeTotal.trend
                },
                "event-sum":{
                    "total":currentSum,
                    "change":changeSum.percent,
                    "trend":changeSum.trend
                }
            }
        };

        var eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
            countString = (eventMap[_activeEvent] && eventMap[_activeEvent].count)? eventMap[_activeEvent].count.toUpperCase() : jQuery.i18n.map["events.count"],
            sumString = (eventMap[_activeEvent] && eventMap[_activeEvent].sum)? eventMap[_activeEvent].sum.toUpperCase() : jQuery.i18n.map["events.sum"];

        var bigNumbers = {
            "class": "one-column",
            "items": [
                {
                    "title": countString,
                    "total": dataArr.usage["event-total"].total,
                    "trend": dataArr.usage["event-total"].trend
                }
            ]
        };

        if (currentSum != 0) {
            bigNumbers["class"] = "two-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": sumString,
                "total": dataArr.usage["event-sum"].total,
                "trend": dataArr.usage["event-sum"].trend
            }
        }

        return bigNumbers;
    };

    countlyEvent.getMultiEventData = function(eventKeysArr, callback) {
        _activeAppId = countlyCommon.ACTIVE_APP_ID;

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "api_key": countlyGlobal.member.api_key,
                "app_id" : countlyCommon.ACTIVE_APP_ID,
                "method" : "events",
                "events": JSON.stringify(eventKeysArr)
            },
            dataType: "jsonp",
            success: function(json) {
                callback(extractDataForGraphAndChart(json));
            }
        });


        function extractDataForGraphAndChart(dataFromDb) {
            var eventData = {},
                eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
                countString = (eventMap[_activeEvent] && eventMap[_activeEvent].count) ? eventMap[_activeEvent].count : jQuery.i18n.map["events.table.count"],
                sumString = (eventMap[_activeEvent] && eventMap[_activeEvent].sum) ? eventMap[_activeEvent].sum : jQuery.i18n.map["events.table.sum"];

            var chartData = [
                    { data:[], label:countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data:[], label:sumString, color: countlyCommon.GRAPH_COLORS[1] }
                ],
                dataProps = [
                    { name:"c" },
                    { name:"s" }
                ];

            eventData = countlyCommon.extractChartData(dataFromDb, countlyEvent.clearEventsObject, chartData, dataProps);

            eventData["eventName"] = countlyEvent.getEventLongName(_activeEvent);
            eventData["dataLevel"] = 1;
            eventData["tableColumns"] = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);

            if (_.reduce(cleanSumCol, function(memo, num) { return memo + num;  }, 0) != 0) {
                eventData["tableColumns"][eventData["tableColumns"].length] = sumString;
            } else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function (element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }

            var countArr = _.pluck(eventData.chartData, "c");

            if (countArr.length) {
                eventData.totalCount = _.reduce(countArr, function(memo, num){ return memo + num; }, 0);
            }

            var sumArr = _.pluck(eventData.chartData, "s");

            if (sumArr.length) {
                eventData.totalSum = _.reduce(sumArr, function(memo, num){ return memo + num; }, 0);
            }

            return eventData;
        }
    };

    function setMeta() {
        var noSegIndex = _activeEventDbIndex.indexOf("no-segment");

        if (noSegIndex != -1 && _activeEventDbArr[noSegIndex]["meta"]) {
            var tmpMeta = _activeEventDbArr[noSegIndex]["meta"];
            _activeSegmentations = tmpMeta["segments"] || [];

            _activeSegmentations.sort();

            if (_activeSegmentation) {
                _activeSegmentationValues = (tmpMeta[_activeSegmentation])? tmpMeta[_activeSegmentation]: [];
            }
        } else {
            _activeSegmentations = [];
            _activeSegmentationValues = [];
        }
    }

}(window.countlyEvent = window.countlyEvent || {}, jQuery));