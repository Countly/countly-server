(function (countlySession, $, undefined) {

    //Private Properties
    var _periodObj = {},
        _sessionDb = {},
        _durations = [];

    //Public Methods
    countlySession.initialize = function () {
        _sessionDb = countlyUser.getDbObj();
        setMeta();
    };

    countlySession.refresh = function (newJSON) {
        countlyCommon.extendDbObj(_sessionDb, newJSON);
        extendMeta();
    };

    countlySession.reset = function () {
        _sessionDb = {};
        setMeta();
    };

    countlySession.getSessionData = function () {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentPayingTotal = 0,
            previousPayingTotal = 0,
            currentMsgEnabledTotal = 0,
            previousMsgEnabledTotal = 0,
            currentNew = 0,
            previousNew = 0,
            currentUnique = 0,
            previousUnique = 0,
            currentDuration = 0,
            previousDuration = 0,
            currentEvents = 0,
            previousEvents = 0,
            isEstimate = false;

        if (_periodObj.isSpecialPeriod) {

            isEstimate = true;

            for (var i = 0; i < (_periodObj.uniquePeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodArr[i]);
                tmp_x = countlySession.clearSessionObject(tmp_x);
                currentUnique += tmp_x["u"];
                currentPayingTotal += tmp_x["p"];
                currentMsgEnabledTotal += tmp_x["m"];
            }

            var tmpUniqObj,
                tmpCurrentUniq = 0,
                tmpCurrentPaying = 0,
                tmpCurrentMsgEnabled = 0;

            for (var i = 0; i < (_periodObj.uniquePeriodCheckArr.length); i++) {
                tmpUniqObj = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodCheckArr[i]);
                tmpUniqObj = countlySession.clearSessionObject(tmpUniqObj);
                tmpCurrentUniq += tmpUniqObj["u"];
                tmpCurrentPaying += tmpUniqObj["p"];
                tmpCurrentMsgEnabled += tmpUniqObj["m"];
            }

            //console.log(currentPayingTotal + " " + tmpCurrentPaying)

            if (currentUnique > tmpCurrentUniq) {
                currentUnique = tmpCurrentUniq;
            }

            if (currentPayingTotal > tmpCurrentPaying) {
                currentPayingTotal = tmpCurrentPaying;
            }

            if (currentMsgEnabledTotal > tmpCurrentMsgEnabled) {
                currentMsgEnabledTotal = tmpCurrentMsgEnabled;
            }

            for (var i = 0; i < (_periodObj.previousUniquePeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodArr[i]);
                tmp_y = countlySession.clearSessionObject(tmp_y);
                previousUnique += tmp_y["u"];
                previousPayingTotal += tmp_y["p"];
                previousMsgEnabledTotal += tmp_y["m"];
            }

            var tmpUniqObj2,
                tmpPreviousUniq = 0,
                tmpPreviousPaying = 0,
                tmpPreviousMsgEnabled = 0;

            for (var i = 0; i < (_periodObj.previousUniquePeriodCheckArr.length); i++) {
                tmpUniqObj2 = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodCheckArr[i]);
                tmpUniqObj2 = countlySession.clearSessionObject(tmpUniqObj2);
                tmpPreviousUniq += tmpUniqObj2["u"];
                tmpPreviousPaying += tmpUniqObj2["p"];
                tmpPreviousMsgEnabled += tmpUniqObj2["m"];
            }

            if (previousUnique > tmpPreviousUniq) {
                previousUnique = tmpPreviousUniq;
            }

            if (previousPayingTotal > tmpPreviousPaying) {
                previousPayingTotal = tmpPreviousPaying;
            }

            if (currentMsgEnabledTotal > tmpCurrentMsgEnabled) {
                currentMsgEnabledTotal = tmpCurrentMsgEnabled;
            }

            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriodArr[i]);
                tmp_x = countlySession.clearSessionObject(tmp_x);
                tmp_y = countlySession.clearSessionObject(tmp_y);

                currentTotal += tmp_x["t"];
                previousTotal += tmp_y["t"];
                currentNew += tmp_x["n"];
                previousNew += tmp_y["n"];
                currentDuration += tmp_x["d"];
                previousDuration += tmp_y["d"];
                currentEvents += tmp_x["e"];
                previousEvents += tmp_y["e"];
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousPeriod);
            tmp_x = countlySession.clearSessionObject(tmp_x);
            tmp_y = countlySession.clearSessionObject(tmp_y);

            currentTotal = tmp_x["t"];
            previousTotal = tmp_y["t"];
            currentNew = tmp_x["n"];
            previousNew = tmp_y["n"];
            currentUnique = tmp_x["u"];
            previousUnique = tmp_y["u"];
            currentDuration = tmp_x["d"];
            previousDuration = tmp_y["d"];
            currentEvents = tmp_x["e"];
            previousEvents = tmp_y["e"];
            currentPayingTotal = tmp_x["p"];
            previousPayingTotal = tmp_y["p"];
            currentMsgEnabledTotal = tmp_x["m"];
            previousMsgEnabledTotal = tmp_y["m"];
        }

        var sessionDuration = (currentDuration / 60),
            previousSessionDuration = (previousDuration / 60),
            previousDurationPerUser = (previousTotal == 0) ? 0 : previousSessionDuration / previousTotal,
            durationPerUser = (currentTotal == 0) ? 0 : (sessionDuration / currentTotal),
            previousEventsPerUser = (previousUnique == 0) ? 0 : previousEvents / previousUnique,
            eventsPerUser = (currentUnique == 0) ? 0 : (currentEvents / currentUnique),
            changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeDuration = countlyCommon.getPercentChange(previousDuration, currentDuration),
            changeDurationPerUser = countlyCommon.getPercentChange(previousDurationPerUser, durationPerUser),
            changeNew = countlyCommon.getPercentChange(previousNew, currentNew),
            changeUnique = countlyCommon.getPercentChange(previousUnique, currentUnique),
            changeReturning = countlyCommon.getPercentChange((previousUnique - previousNew), (currentNew - currentNew)),
            changeEvents = countlyCommon.getPercentChange(previousEvents, currentEvents),
            changeEventsPerUser = countlyCommon.getPercentChange(previousEventsPerUser, eventsPerUser),
            changePaying = countlyCommon.getPercentChange(previousPayingTotal, currentPayingTotal),
            changeMsgEnabled = countlyCommon.getPercentChange(previousMsgEnabledTotal, currentMsgEnabledTotal),
            sparkLines = calcSparklineData();

        var timeSpentString = (sessionDuration.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"];

        if (sessionDuration >= 142560) {
            timeSpentString = (sessionDuration / 525600).toFixed(1) + " " + jQuery.i18n.map["common.year.abrv"];
        } else if (sessionDuration >= 1440) {
            timeSpentString = (sessionDuration / 1440).toFixed(1) + " " + jQuery.i18n.map["common.day.abrv"];
        } else if (sessionDuration >= 60) {
            timeSpentString = (sessionDuration / 60).toFixed(1) + " " + jQuery.i18n.map["common.hour.abrv"];
        }

        dataArr =
        {
            usage:{
                "total-sessions":{
                    "total":currentTotal,
                    "change":changeTotal.percent,
                    "trend":changeTotal.trend,
                    "sparkline":sparkLines.total
                },
                "paying-users":{
                    "total":currentPayingTotal,
                    "prev-total":previousPayingTotal,
                    "change":changePaying.percent,
                    "trend":changePaying.trend,
                    "isEstimate":isEstimate
                },
                "total-users":{
                    "total":currentUnique,
                    "prev-total":previousUnique,
                    "change":changeUnique.percent,
                    "trend":changeUnique.trend,
                    "sparkline":sparkLines.unique,
                    "isEstimate":isEstimate
                },
                "messaging-users":{
                    "total":currentMsgEnabledTotal,
                    "prev-total":previousMsgEnabledTotal,
                    "change":changeMsgEnabled.percent,
                    "trend":changeMsgEnabled.trend,
                    "sparkline":sparkLines.msg,
                    "isEstimate":isEstimate
                },
                "new-users":{
                    "total":currentNew,
                    "change":changeNew.percent,
                    "trend":changeNew.trend,
                    "sparkline":sparkLines.nev
                },
                "returning-users":{
                    "total":(currentUnique - currentNew),
                    "change":changeReturning.percent,
                    "trend":changeReturning.trend,
                    "sparkline":sparkLines.returning
                },
                "total-duration":{
                    "total":timeSpentString,
                    "change":changeDuration.percent,
                    "trend":changeDuration.trend,
                    "sparkline":sparkLines["total-time"]
                },
                "avg-duration-per-session":{
                    "total":(durationPerUser.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"],
                    "change":changeDurationPerUser.percent,
                    "trend":changeDurationPerUser.trend,
                    "sparkline":sparkLines["avg-time"]
                },
                "events":{
                    "total":currentEvents,
                    "change":changeEvents.percent,
                    "trend":changeEvents.trend,
                    "sparkline":sparkLines["events"]
                },
                "avg-events":{
                    "total":eventsPerUser.toFixed(1),
                    "change":changeEventsPerUser.percent,
                    "trend":changeEventsPerUser.trend,
                    "sparkline":sparkLines["avg-events"]
                }
            }
        };

        return dataArr;
    };

    countlySession.getDurationData = function () {
        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_sessionDb, "ds", _durations, countlySession.explainDurationRange);

        var durations = _.pluck(chartData.chartData, "ds"),
            durationTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][durations.length + 1] = [durations.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([durations.length, ""]);

        for (var i = 0; i < durations.length; i++) {
            chartDP[0]["data"][i + 1] = [i, durationTotals[i]];
            chartData.chartDP.ticks.push([i, durations[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };

    countlySession.getSessionDP = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-sessions"] },
                { data:[], label:jQuery.i18n.map["common.table.new-sessions"] },
                { data:[], label:jQuery.i18n.map["common.table.unique-sessions"] }
            ],
            dataProps = [
                { name:"t" },
                { name:"n" },
                { name:"u" }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getSessionDPTotal = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-sessions"], color:'#DDDDDD', mode:"ghost" },
                { data:[], label:jQuery.i18n.map["common.table.total-sessions"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"pt",
                    func:function (dataObj) {
                        return dataObj["t"]
                    },
                    period:"previous"
                },
                { name:"t" }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getUserDP = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-users"] },
                { data:[], label:jQuery.i18n.map["common.table.new-users"] },
                { data:[], label:jQuery.i18n.map["common.table.returning-users"] }
            ],
            dataProps = [
                { name:"u" },
                { name:"n" },
                {
                    name:"returning",
                    func:function (dataObj) {
                        return dataObj["u"] - dataObj["n"];
                    }
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getUserDPActive = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-users"], color:'#DDDDDD', mode:"ghost" },
                { data:[], label:jQuery.i18n.map["common.table.total-users"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"pt",
                    func:function (dataObj) {
                        return dataObj["u"]
                    },
                    period:"previous"
                },
                {
                    name:"t",
                    func:function (dataObj) {
                        return dataObj["u"]
                    }
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getUserDPNew = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.new-users"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["common.table.new-users"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"pn",
                    func:function (dataObj) {
                        return dataObj["n"]
                    },
                    period:"previous"
                },
                { name:"n" }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getMsgUserDPActive = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-users"], color: countlyCommon.GRAPH_COLORS[0]},
                { data:[], label:jQuery.i18n.map["common.table.messaging-users"], color:countlyCommon.GRAPH_COLORS[1] }
            ],
            dataProps = [
                {
                    name:"u"
                },
                {
                    name:"m"
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getDurationDP = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.graph.time-spent"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["common.graph.time-spent"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"previous_t",
                    func:function (dataObj) {
                        return ((dataObj["d"] / 60).toFixed(1));
                    },
                    period:"previous"
                },
                {
                    name:"t",
                    func:function (dataObj) {
                        return ((dataObj["d"] / 60).toFixed(1));
                    }
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getDurationDPAvg = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.graph.average-time"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["common.graph.average-time"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"previous_average",
                    func:function (dataObj) {
                        return ((dataObj["t"] == 0) ? 0 : ((dataObj["d"] / dataObj["t"]) / 60).toFixed(1));
                    },
                    period:"previous"
                },
                {
                    name:"average",
                    func:function (dataObj) {
                        return ((dataObj["t"] == 0) ? 0 : ((dataObj["d"] / dataObj["t"]) / 60).toFixed(1));
                    }
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getEventsDP = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.graph.reqs-received"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["common.graph.reqs-received"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"pe",
                    func:function (dataObj) {
                        return dataObj["e"]
                    },
                    period:"previous"
                },
                {
                    name:"e"
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.getEventsDPAvg = function () {

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.graph.avg-reqs-received"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["common.graph.avg-reqs-received"], color:'#333933' }
            ],
            dataProps = [
                {
                    name:"previous_average",
                    func:function (dataObj) {
                        return ((dataObj["u"] == 0) ? 0 : ((dataObj["e"] / dataObj["u"]).toFixed(1)));
                    },
                    period:"previous"
                },
                {
                    name:"average",
                    func:function (dataObj) {
                        return ((dataObj["u"] == 0) ? 0 : ((dataObj["e"] / dataObj["u"]).toFixed(1)));
                    }
                }
            ];

        return countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps);
    };

    countlySession.clearSessionObject = function (obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
            if (!obj["d"]) obj["d"] = 0;
            if (!obj["e"]) obj["e"] = 0;
            if (!obj["p"]) obj["p"] = 0;
            if (!obj["m"]) obj["m"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0, "d":0, "e":0, "p":0, "m":0};
        }

        return obj;
    };

    countlySession.explainDurationRange = function (index) {
        var sec = jQuery.i18n.map["common.seconds"],
            min = jQuery.i18n.map["common.minutes"],
            hr = jQuery.i18n.map["common.hour"];

        var durationRange = [
            "0-10 " + sec,
            "11-30 " + sec,
            "31-60 " + sec,
            "1-3 " + min,
            "3-10 " + min,
            "10-30 " + min,
            "30-60 " + min,
            "> 1 " + hr
        ];

        return durationRange[index];
    };

    countlySession.getDurationIndex = function (duration) {
        var sec = jQuery.i18n.map["common.seconds"],
            min = jQuery.i18n.map["common.minutes"],
            hr = jQuery.i18n.map["common.hour"];

        var durationRange = [
            "0-10 " + sec,
            "11-30 " + sec,
            "31-60 " + sec,
            "1-3 " + min,
            "3-10 " + min,
            "10-30 " + min,
            "30-60 " + min,
            "> 1 " + hr
        ];

        return durationRange.indexOf(duration);
    };

    countlySession.getTopUserBars = function () {

        var barData = [],
            sum = 0,
            maxItems = 3,
            totalPercent = 0;

        var chartData = [
                { data:[], label:jQuery.i18n.map["common.table.total-users"] }
            ],
            dataProps = [
                {
                    name:"t",
                    func:function (dataObj) {
                        return dataObj["u"]
                    }
                }
            ];

        var totalUserData = countlyCommon.extractChartData(_sessionDb, countlySession.clearSessionObject, chartData, dataProps),
            topUsers = _.sortBy(_.reject(totalUserData.chartData, function (obj) {
                return obj["t"] == 0;
            }), function (obj) {
                return -obj["t"];
            });

        if (topUsers.length < 3) {
            maxItems = topUsers.length;
        }

        for (var i = 0; i < maxItems; i++) {
            sum += topUsers[i]["t"];
        }

        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((topUsers[i]["t"] / sum) * 100);
            totalPercent += percent;

            if (i == (maxItems - 1)) {
                percent += 100 - totalPercent;
            }

            barData[i] = { "name":topUsers[i]["date"], "percent":percent };
        }

        return barData;
    };

    countlySession.getSessionDb = function () {
        return _sessionDb;
    };

    //Private Methods
    function calcSparklineData() {

        var sparkLines = {"total":[], "nev":[], "unique":[], "returning":[], "total-time":[], "avg-time":[], "events":[], "avg-events":[], "msg":[]};

        if (!_periodObj.isSpecialPeriod) {
            for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                var tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.activePeriod + "." + i);
                tmp_x = countlySession.clearSessionObject(tmp_x);

                sparkLines["total"][sparkLines["total"].length] = tmp_x["t"];
                sparkLines["nev"][sparkLines["nev"].length] = tmp_x["n"];
                sparkLines["unique"][sparkLines["unique"].length] = tmp_x["u"];
                sparkLines["returning"][sparkLines["returning"].length] = (tmp_x["t"] - tmp_x["n"]);
                sparkLines["total-time"][sparkLines["total-time"].length] = tmp_x["d"];
                sparkLines["avg-time"][sparkLines["avg-time"].length] = (tmp_x["t"] == 0) ? 0 : (tmp_x["d"] / tmp_x["t"]);
                sparkLines["events"][sparkLines["events"].length] = tmp_x["e"];
                sparkLines["avg-events"][sparkLines["avg-events"].length] = (tmp_x["u"] == 0) ? 0 : (tmp_x["e"] / tmp_x["u"]);
                sparkLines["msg"][sparkLines["msg"].length] = tmp_x["m"];
            }
        } else {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                var tmp_x = countlyCommon.getDescendantProp(_sessionDb, _periodObj.currentPeriodArr[i]);
                tmp_x = countlySession.clearSessionObject(tmp_x);

                sparkLines["total"][sparkLines["total"].length] = tmp_x["t"];
                sparkLines["nev"][sparkLines["nev"].length] = tmp_x["n"];
                sparkLines["unique"][sparkLines["unique"].length] = tmp_x["u"];
                sparkLines["returning"][sparkLines["returning"].length] = (tmp_x["t"] - tmp_x["n"]);
                sparkLines["total-time"][sparkLines["total-time"].length] = tmp_x["d"];
                sparkLines["avg-time"][sparkLines["avg-time"].length] = (tmp_x["t"] == 0) ? 0 : (tmp_x["d"] / tmp_x["t"]);
                sparkLines["events"][sparkLines["events"].length] = tmp_x["e"];
                sparkLines["avg-events"][sparkLines["avg-events"].length] = (tmp_x["u"] == 0) ? 0 : (tmp_x["e"] / tmp_x["u"]);
                sparkLines["msg"][sparkLines["msg"].length] = tmp_x["m"];
            }
        }

        for (var key in sparkLines) {
            sparkLines[key] = sparkLines[key].join(",");
        }

        return sparkLines;
    }

    function setMeta() {
        if (_sessionDb['meta']) {
            _durations = (_sessionDb['meta']['d-ranges']) ? _sessionDb['meta']['d-ranges'] : [];
        } else {
            _durations = [];
        }
    }

    function extendMeta() {
        if (_sessionDb['meta']) {
            _durations = countlyCommon.union(_durations, _sessionDb['meta']['d-ranges']);
        }
    }

}(window.countlySession = window.countlySession || {}, jQuery));
