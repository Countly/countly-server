(function (countlyPush, $, undefined) {
	var api = {
		pushes: {
			"w":countlyCommon.API_URL + "/i/pushes",
			"r":countlyCommon.API_URL + "/o/pushes"
		}
	};
    window.MessageStatus = {
        Initial:        0,
        InQueue:        1 << 1,
        InProcessing:   1 << 2,
        Sent:           1 << 3,
        Error:          1 << 4,
        Aborted:        1 << 5,
        Deleted:        1 << 6
    };


    //Private Properties
    var _pushDb = {},
        _activeAppKey = 0,
        _initialized = false;

    countlyPush.debug = function() {
        console.log('debug');
    };

    //Public Methods
    countlyPush.initialize = function () {
        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                    type: "GET",
                    url:  api.pushes.r + '/all',
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "period": countlyCommon.getPeriodForAjax()
                    },
                    dataType: "jsonp",
                    success: function (json) {
                        _pushDb = prepareMessages(json);
                    }
                });
        } else {
            return true;
        }
    };

    countlyPush.refresh = countlyPush.initialize;

    countlyPush.getAudience = function(data, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/audience',
            data: { "api_key": countlyGlobal.member.api_key, args: JSON.stringify(data) },
            dataType: "jsonp",
            success: success,
            error: error
        })
    };

    countlyPush.createMessage = function(message, date, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/create',
            data: { "api_key": countlyGlobal.member.api_key, args: JSON.stringify(message), date: date ? date.toString() : '' },
            dataType: "jsonp",
            success: function(json){
                if (json.error) {
                    error (json.error);
                } else {
                    success(prepareMessage(json))
                }
            }
        })
    };

    countlyPush.refreshMessage = function(message, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/refresh',
            data: { "api_key": countlyGlobal.member.api_key, mid: message._id },
            dataType: "jsonp",
            success: function(json){
                var msg = prepareMessage(json);
                for (var i = 0; i < _pushDb.length; i++) {
                    if (_pushDb[i]._id == msg._id) _pushDb[i] = msg;
                }
                success(prepareMessage(json))
            },
            error: error
        })
    };

    countlyPush.retryMessage = function(messageId, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/retry',
            data: { "api_key": countlyGlobal.member.api_key, mid: messageId },
            dataType: "jsonp",
            success: function(json){
                if (json.error) error(json.error);
                else success(prepareMessage(json));
            }
        })
    };

    countlyPush.deleteMessage = function(messageId, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/delete',
            data: { "api_key": countlyGlobal.member.api_key, mid: messageId },
            dataType: "jsonp",
            success: function(json){
                if (json.error) error(json.error);
                else {
                    var msg = prepareMessage(json);
                    for (var i = 0; i < _pushDb.length; i++) {
                        if (_pushDb[i]._id == msg._id) {
                            _pushDb.splice(i, 1);
                            success(msg);
                        }
                    }
                }
            }
        })
    };

    countlyPush.reset = function () {
        _pushDb = {};
        _errorDb = {};
    };

    countlyPush.getMessagesForCurrApp = function () {
        var currAppMsg = [];

        for (var i = 0; i < _pushDb.length; i++) {
            if (_pushDb[i].apps.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1) {
                currAppMsg.push(_pushDb[i]);
            }

            if (currAppMsg.length >= 10) {
                break;
            }
        }

        return currAppMsg;
    };

    countlyPush.getAllMessages = function () {
        return _pushDb;
    };

    function prepareMessages(msg) {
        if (msg._id) {
            return prepareMessage(msg);
        } else {
            return _.map(msg, function(msg){ return prepareMessage(msg); });
        }
    }

    function prepareMessage(msg) {
        if (typeof msg.result.sent == 'undefined' || msg.result.sent == 0) {
            msg.percentDelivered = 0;
            msg.percentNotDelivered = 100;
        } else {
            msg.percentDelivered = +(100 * msg.result.delivered / msg.result.sent).toFixed(2);
            msg.percentNotDelivered = +(100 * (msg.result.sent - msg.result.delivered) / msg.result.sent).toFixed(2);
        }

        if (typeof msg.result.total == 'undefined' || msg.result.total == 0) {
            msg.percentSent = 0;
            msg.percentNotSent = 100;
        } else {
            msg.percentSent = +(100 * msg.result.sent / msg.result.total).toFixed(2);
            msg.percentNotSent = +(100 * (msg.result.total - msg.result.sent) / msg.result.total).toFixed(2);
        }

        msg.local = {
            created: moment(msg.created).format("D MMM, YYYY HH:mm")
        };

        if (msg.date) msg.local.date = moment(msg.date).format("D MMM, YYYY HH:mm");
        if (msg.sent) msg.local.sent = moment(msg.sent).format("D MMM, YYYY HH:mm");

        return msg;
    }

}(window.countlyPush = window.countlyPush || {}, jQuery));


(function (countlyPushEvents, $, undefined) {
    var _periodObj,
        _pushEventsDb = {},
        _activeAppKey,
        _initialized,
        _period = null;

    //Public Methods
    countlyPushEvents.initialize = function() {
        if (_initialized && _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyPushEvents.refresh();
        }

        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            function eventAjax(key) {
                return $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "event": key,
                        "segmentation": "no-segment",
                        "period":_period
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _pushEventsDb[key] = json;
                    }
                });
            }

            return $.when(
                eventAjax("[CLY]_push_sent"),
                eventAjax("[CLY]_push_open"),
                eventAjax("[CLY]_push_action")
            ).then(function(){
                return true;
            });
       } else {
            return true;
        }
    };

    countlyPushEvents.refresh = function() {
        if (!countlyCommon.DEBUG) {
            function eventAjax(key) {
                return $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "action" : "refresh",
                        "event": key,
                        "segmentation": "no-segment",
                        "period":_period
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        countlyCommon.extendDbObj(_pushEventsDb[key], json);
                    }
                })
            }

            return $.when(
                    eventAjax("[CLY]_push_sent"),
                    eventAjax("[CLY]_push_open"),
                    eventAjax("[CLY]_push_action")
                ).then(function(){
                    return true;
                });
        } else {
            _pushEventsDb = {"2012":{}};
            return true;
        }
    };

    countlyPushEvents.getDashDP = function() {
        var total = {
                chartDP: [],
                chartData: [],
                keyEvents: []
            },
            events = ["[CLY]_push_sent", "[CLY]_push_open", "[CLY]_push_action"],
            titles = [jQuery.i18n.map["common.sent"], jQuery.i18n.map["common.delivered"], jQuery.i18n.map["common.actions"]];
        events.forEach(function(event, i){
            var noSegmentIndex = _.pluck(_pushEventsDb[event], "_id"),
                eventDb = _pushEventsDb[event] || {},
                chartData = [
                    { data:[], label: titles[i], color: countlyCommon.GRAPH_COLORS[i] }
                ],
                dataProps = [
                    { name:"c" }
                ],
                eventData = countlyCommon.extractChartData(eventDb, countlyEvent.clearEventsObject, chartData, dataProps);

            total.chartDP.push(eventData.chartDP[0]);
            total.chartData.push(eventData.chartData[0]);
            total.keyEvents.push(eventData.keyEvents[0]);
        });
        return total;
    };

    countlyPushEvents.getDashSummary = function() {
        var events = ["[CLY]_push_sent", "[CLY]_push_open", "[CLY]_push_action"],
            titles = [jQuery.i18n.map["common.sent"], jQuery.i18n.map["common.delivered"], jQuery.i18n.map["common.actions"]],
            helps = ["dashboard.push.sent", "dashboard.push.delivered","dashboard.push.actions"],
            data = [];
        events.forEach(function(event, i){
            var ev = countlyPushEvents.getDashEventData(event);
            ev.title = titles[i];
            ev.help = helps[i];
            data.push(ev);
        });
        return data;
    };

    countlyPushEvents.getEventData = function(eventKey) {
        var chartData = [
                { data:[], label:jQuery.i18n.map["events.table.count"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["events.table.count"], color: countlyCommon.GRAPH_COLORS[1] }
            ],
            dataProps = [
                {
                    name:"pc",
                    func:function (dataObj) {
                        return dataObj["c"];
                    },
                    period:"previous"
                },
                { name:"c" }
            ];

        var eventData = countlyCommon.extractChartData(_pushEventsDb[eventKey], countlyEvent.clearEventsObject, chartData, dataProps);
        eventData["eventName"] = eventKey;
        eventData["dataLevel"] = 1;
        eventData["tableColumns"] = [jQuery.i18n.map["common.date"], jQuery.i18n.map["events.table.count"]];

        var countArr = _.pluck(eventData.chartData, "c");
        if (countArr.length) {
            eventData.totalCount = _.reduce(countArr, function(memo, num){ return memo + num; }, 0);
        }

        return eventData;
    };

    countlyPushEvents.getDashEventData = function(eventKey) {
        _periodObj = countlyCommon.periodObj;

        var noSegmentIndex = _.pluck(_pushEventsDb[eventKey], "_id"),
            eventDb = _pushEventsDb[eventKey] || {};

        if (!eventDb) {
            return {
                total: 0,
                change: 'NA',
                trend: 'u',
                sparkline: '0,0'
            };
        }

        var currentTotal = 0,
            previousTotal = 0;

        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                currentTotal += eventCount(eventDb, _periodObj.currentPeriodArr[i]);
                previousTotal += eventCount(eventDb, _periodObj.previousPeriodArr[i]);
            }
        } else {
            currentTotal = eventCount(eventDb, _periodObj.activePeriod);
            previousTotal = eventCount(eventDb, _periodObj.previousPeriod);
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal);

        return {
            "total":currentTotal,
            "change":changeTotal.percent,
            "trend":changeTotal.trend
        };
    };

    countlyPushEvents.calcSparklineData = function(eventKey) {
        var sparkLine = [];
        _periodObj = countlyCommon.periodObj;

        if (!_periodObj.isSpecialPeriod) {
            for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                var tmpObj = countlyCommon.getDescendantProp(_pushEventsDb[eventKey], _periodObj.activePeriod + "." + i);
                sparkLine.push((tmpObj && tmpObj.c) ? tmpObj.c : 0);
            }
        } else {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                var tmpObj = countlyCommon.getDescendantProp(_pushEventsDb[eventKey], _periodObj.currentPeriodArr[i]);
                sparkLine.push((tmpObj && tmpObj.c) ? tmpObj.c : 0);
            }
        }

        return sparkLine.join(',');
    };

    function eventCount(eventDb, period) {
        var tmpObj = countlyCommon.getDescendantProp(eventDb, period);
        return (tmpObj && tmpObj.c) ? tmpObj.c : 0;
    }

}(window.countlyPushEvents = window.countlyPushEvents || {}, jQuery));