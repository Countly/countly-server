/* global CountlyHelpers, countlySession, countlyLocation, countlyCommon, _, jQuery*/
(function() {

    window.countlySession = window.countlySession || {};
    CountlyHelpers.createMetricModel(window.countlySession, {name: "users", estOverrideMetric: "users"}, jQuery);

    countlySession.callback = function(isRefresh, data) {
        if (isRefresh) {
            countlyLocation.refresh(data);
        }
        else {
            countlyLocation.initialize();
        }
    };
    countlySession.getSessionData = function(sessionModel) {
        if (!sessionModel) {
            sessionModel = countlySession.getDb();
        }
        var map = {t: "total-sessions", n: "new-users", u: "total-users", d: "total-duration", e: "events", p: "paying-users", m: "messaging-users"};
        var ret = {};
        var data = countlyCommon.getDashboardData(sessionModel, ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u: "users"}, countlySession.clearObject);

        for (var i in data) {
            ret[map[i]] = data[i];
        }

        //calculate returning users
        var changeReturning = countlyCommon.getPercentChange(
            Math.max(ret["total-users"]["prev-total"] - ret["new-users"]["prev-total"], 0),
            Math.max(ret["total-users"].total - ret["new-users"].total, 0));
        ret["returning-users"] = {
            "total": Math.max(ret["total-users"].total - ret["new-users"].total, 0),
            "prev-total": Math.max(ret["total-users"]["prev-total"] - ret["new-users"]["prev-total"], 0),
            "change": changeReturning.percent,
            "trend": changeReturning.trend
        };

        //convert duration to minutes
        ret["total-duration"].total /= 60;
        ret["total-duration"]["prev-total"] /= 60;

        //calculate average duration
        var changeAvgDuration = countlyCommon.getPercentChange(
            (ret["total-sessions"]["prev-total"] === 0) ? 0 : ret["total-duration"]["prev-total"] / ret["total-sessions"]["prev-total"],
            (ret["total-sessions"].total === 0) ? 0 : ret["total-duration"].total / ret["total-sessions"].total);
        ret["avg-duration-per-session"] = {
            "prev-total": (ret["total-sessions"]["prev-total"] === 0) ? 0 : ret["total-duration"]["prev-total"] / ret["total-sessions"]["prev-total"],
            "total": (ret["total-sessions"].total === 0) ? 0 : ret["total-duration"].total / ret["total-sessions"].total,
            "change": changeAvgDuration.percent,
            "trend": changeAvgDuration.trend
        };

        ret["total-duration"].total = countlyCommon.timeString(ret["total-duration"].total);
        ret["total-duration"]["prev-total"] = countlyCommon.timeString(ret["total-duration"]["prev-total"]);
        ret["avg-duration-per-session"].total = countlyCommon.timeString(ret["avg-duration-per-session"].total);
        ret["avg-duration-per-session"]["prev-total"] = countlyCommon.timeString(ret["avg-duration-per-session"]["prev-total"]);

        //calculate average events
        var changeAvgEvents = countlyCommon.getPercentChange(
            (ret["total-users"]["prev-total"] === 0) ? 0 : ret.events["prev-total"] / ret["total-users"]["prev-total"],
            (ret["total-users"].total === 0) ? 0 : ret.events.total / ret["total-users"].total);
        ret["avg-events"] = {
            "prev-total": (ret["total-users"]["prev-total"] === 0) ? 0 : ret.events["prev-total"] / ret["total-users"]["prev-total"],
            "total": (ret["total-users"].total === 0) ? 0 : ret.events.total / ret["total-users"].total,
            "change": changeAvgEvents.percent,
            "trend": changeAvgEvents.trend
        };

        ret["avg-events"].total = ret["avg-events"].total.toFixed(1);
        ret["avg-events"]["prev-total"] = ret["avg-events"]["prev-total"].toFixed(1);

        //get sparkleLine data
        var sparkLines = countlyCommon.getSparklineData(sessionModel, {
            "total-sessions": "t",
            "new-users": "n",
            "total-users": "u",
            "total-duration": "d",
            "events": "e",
            "returning-users": function(tmp_x) {
                return Math.max(tmp_x.u - tmp_x.n, 0);
            },
            "avg-duration-per-session": function(tmp_x) {
                return (parseInt(tmp_x.t) === 0) ? 0 : (tmp_x.d / tmp_x.t);
            },
            "avg-events": function(tmp_x) {
                return (parseInt(tmp_x.u) === 0) ? 0 : (tmp_x.e / tmp_x.u);
            }
        }, countlySession.clearObject);

        for (var z in sparkLines) {
            ret[z].sparkline = sparkLines[z];
        }
        return {usage: ret};
    };

    countlySession.getSessionDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"] },
                { data: [], label: jQuery.i18n.map["common.table.new-sessions"] },
                { data: [], label: jQuery.i18n.map["common.table.unique-sessions"] }
            ],
            dataProps = [
                { name: "t" },
                { name: "n" },
                { name: "u" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getSessionDPTotal = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["common.table.total-sessions"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pt",
                    func: function(dataObj) {
                        return dataObj.t;
                    },
                    period: countlyCommon.getPeriod() === 'day' ? "previousThisMonth" : "previous"
                },
                { name: "t" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"] },
                { data: [], label: jQuery.i18n.map["common.table.new-users"] },
                { data: [], label: jQuery.i18n.map["common.table.returning-users"] }
            ],
            dataProps = [
                { name: "u" },
                { name: "n" },
                {
                    name: "returning",
                    func: function(dataObj) {
                        return dataObj.u - dataObj.n;
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDPActive = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pt",
                    func: function(dataObj) {
                        return dataObj.u;
                    },
                    period: "previous"
                },
                {
                    name: "t",
                    func: function(dataObj) {
                        return dataObj.u;
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getUserDPNew = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.new-users"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.table.new-users"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pn",
                    func: function(dataObj) {
                        return dataObj.n;
                    },
                    period: "previous"
                },
                { name: "n" }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getMsgUserDPActive = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"], color: countlyCommon.GRAPH_COLORS[0]},
                { data: [], label: jQuery.i18n.map["common.table.messaging-users"], color: countlyCommon.GRAPH_COLORS[1] }
            ],
            dataProps = [
                {
                    name: "u"
                },
                {
                    name: "m"
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getDurationDP = function(use_seconds) {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.time-spent"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.time-spent"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_t",
                    func: function(dataObj) {
                        if (use_seconds) {
                            return dataObj.d;
                        }
                        else {
                            return ((dataObj.d / 60).toFixed(1));
                        }
                    },
                    period: "previous"
                },
                {
                    name: "t",
                    func: function(dataObj) {
                        if (use_seconds) {
                            return dataObj.d;
                        }
                        else {
                            return ((dataObj.d / 60).toFixed(1));
                        }
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getDurationDPAvg = function(use_seconds) {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.average-time"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.average-time"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_average",
                    func: function(dataObj) {
                        if (use_seconds) {
                            return ((parseInt(dataObj.t) === 0) ? 0 : (dataObj.d / dataObj.t).toFixed(1));
                        }
                        else {
                            return ((parseInt(dataObj.t) === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                        }
                    },
                    period: "previous"
                },
                {
                    name: "average",
                    func: function(dataObj) {
                        if (use_seconds) {
                            return ((parseInt(dataObj.t) === 0) ? 0 : (dataObj.d / dataObj.t).toFixed(1));
                        }
                        else {
                            return ((parseInt(dataObj.t) === 0) ? 0 : ((dataObj.d / dataObj.t) / 60).toFixed(1));
                        }
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getEventsDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.reqs-received"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.reqs-received"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "pe",
                    func: function(dataObj) {
                        return dataObj.e;
                    },
                    period: "previous"
                },
                {
                    name: "e"
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };

    countlySession.getEventsDPAvg = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.graph.avg-reqs-received"], color: '#DDDDDD', mode: "ghost"},
                { data: [], label: jQuery.i18n.map["common.graph.avg-reqs-received"], color: '#333933' }
            ],
            dataProps = [
                {
                    name: "previous_average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.u) === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                    },
                    period: "previous"
                },
                {
                    name: "average",
                    func: function(dataObj) {
                        return ((parseInt(dataObj.u) === 0) ? 0 : ((dataObj.e / dataObj.u).toFixed(1)));
                    }
                }
            ];

        return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
    };
    /** gets duration range
    * @returns {array} duration ranges
    */
    function durationRange() {
        var sec = jQuery.i18n.map["common.seconds"],
            min = jQuery.i18n.map["common.minutes"],
            hr = jQuery.i18n.map["common.hour"];

        return [
            "0 - 10 " + sec,
            "11 - 30 " + sec,
            "31 - 60 " + sec,
            "1 - 3 " + min,
            "3 - 10 " + min,
            "10 - 30 " + min,
            "30 - 60 " + min,
            "> 1 " + hr
        ];
    }
    countlySession.getDurationRange = function() {
        return durationRange();
    };
    countlySession.explainDurationRange = function(index) {
        return durationRange()[index];
    };

    countlySession.getDurationIndex = function(duration) {
        return durationRange().indexOf(duration);
    };

    /** gets frequency ranges
    * @returns {array} frequency ranges
    */
    function frequencyRange() {
        var localHours = jQuery.i18n.map["user-loyalty.range.hours"],
            localDay = jQuery.i18n.map["user-loyalty.range.day"],
            localDays = jQuery.i18n.map["user-loyalty.range.days"];

        return [
            jQuery.i18n.map["user-loyalty.range.first-session"],
            "1-24 " + localHours,
            "1 " + localDay,
            "2 " + localDays,
            "3 " + localDays,
            "4 " + localDays,
            "5 " + localDays,
            "6 " + localDays,
            "7 " + localDays,
            "8-14 " + localDays,
            "15-30 " + localDays,
            "30+ " + localDays
        ];
    }

    countlySession.getFrequencyRange = function() {
        return frequencyRange();
    };
    countlySession.explainFrequencyRange = function(index) {
        return frequencyRange()[index];
    };

    countlySession.getFrequencyIndex = function(frequency) {
        return frequencyRange().indexOf(frequency);
    };

    /** gets loyalty ranges
    * @returns {array} loyalty ranges
    */
    function loyaltyRange() {
        return [
            "1",
            "2",
            "3-5",
            "6-9",
            "10-19",
            "20-49",
            "50-99",
            "100-499",
            "> 500"
        ];
    }
    countlySession.getLoyalityRange = function() {
        return loyaltyRange();
    };
    countlySession.explainLoyaltyRange = function(index) {
        return loyaltyRange()[index];
    };

    countlySession.getLoyaltyIndex = function(loyalty) {
        return loyaltyRange().indexOf(loyalty);
    };

    countlySession.getTopUserBars = function() {

        var barData = [],
            maxItems = 3;

        var chartData = [
                { data: [], label: jQuery.i18n.map["common.table.total-users"] }
            ],
            dataProps = [
                {
                    name: "t",
                    func: function(dataObj) {
                        return dataObj.u;
                    }
                }
            ];

        var _db = countlySession.getDb(),
            dashboardData = countlyCommon.getDashboardData(_db, ["t", "n", "u", "d", "e", "p", "m"], ["u", "p", "m"], {u: "users"}, countlySession.clearObject),
            totalUserData = countlyCommon.extractChartData(_db, countlySession.clearObject, chartData, dataProps),
            topUsers = _.sortBy(_.reject(totalUserData.chartData, function(obj) {
                return parseInt(obj.t) === 0;
            }), function(obj) {
                return -obj.t;
            });

        if (topUsers.length < 3) {
            maxItems = topUsers.length;
        }

        var totalUsers = (dashboardData && dashboardData.u && dashboardData.u.total);

        for (var i = 0; i < maxItems; i++) {
            var percent = Math.floor((topUsers[i].t / totalUsers) * 100);
            barData[i] = { "name": topUsers[i].date, "count": topUsers[i].t, "type": "user", "percent": percent, "unit": jQuery.i18n.map["sidebar.analytics.users"] };
        }

        return barData;
    };

    countlySession.clearObject = function(obj) {
        if (obj) {
            if (!obj.t) {
                obj.t = 0;
            }
            if (!obj.n) {
                obj.n = 0;
            }
            if (!obj.u) {
                obj.u = 0;
            }
            if (!obj.d) {
                obj.d = 0;
            }
            if (!obj.e) {
                obj.e = 0;
            }
            if (!obj.p) {
                obj.p = 0;
            }
            if (!obj.m) {
                obj.m = 0;
            }
        }
        else {
            obj = {"t": 0, "n": 0, "u": 0, "d": 0, "e": 0, "p": 0, "m": 0};
        }

        return obj;
    };

}());