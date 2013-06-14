var countlySession = {},
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

(function (countlySession) {

    //Private Properties
    var _periodObj = {},
        _sessionDb = {};

    //Public Methods

    countlySession.setDb = function(db) {
       _sessionDb = db;
    };

    countlySession.getSessionData = function () {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
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
            }

            var tmpUniqObj,
                tmpCurrentUniq = 0;

            for (var i = 0; i < (_periodObj.uniquePeriodCheckArr.length); i++) {
                tmpUniqObj = countlyCommon.getDescendantProp(_sessionDb, _periodObj.uniquePeriodCheckArr[i]);
                tmpUniqObj = countlySession.clearSessionObject(tmpUniqObj);
                tmpCurrentUniq += tmpUniqObj["u"];
            }

            if (currentUnique > tmpCurrentUniq) {
                currentUnique = tmpCurrentUniq;
            }

            for (var i = 0; i < (_periodObj.previousUniquePeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodArr[i]);
                tmp_y = countlySession.clearSessionObject(tmp_y);
                previousUnique += tmp_y["u"];
            }

            var tmpUniqObj2,
                tmpPreviousUniq = 0;

            for (var i = 0; i < (_periodObj.previousUniquePeriodCheckArr.length); i++) {
                tmpUniqObj2 = countlyCommon.getDescendantProp(_sessionDb, _periodObj.previousUniquePeriodCheckArr[i]);
                tmpUniqObj2 = countlySession.clearSessionObject(tmpUniqObj2);
                tmpPreviousUniq += tmpUniqObj2["u"];
            }

            if (previousUnique > tmpPreviousUniq) {
                previousUnique = tmpPreviousUniq;
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
            changeEventsPerUser = countlyCommon.getPercentChange(previousEventsPerUser, eventsPerUser);

        var timeSpentString = (sessionDuration.toFixed(1)) + " min";

        if (sessionDuration >= 1440) {
            timeSpentString = (sessionDuration / 1440).toFixed(1) + " days";
        } else if (sessionDuration >= 60) {
            timeSpentString = (sessionDuration / 60).toFixed(1) + " hours";
        }

        return {
            "total_sessions":{
                "total":currentTotal,
                "change":changeTotal.percent,
                "trend":changeTotal.trend
            },
            "total_users":{
                "total":currentUnique,
                "change":changeUnique.percent,
                "trend":changeUnique.trend,
                "is_estimate":isEstimate
            },
            "new_users":{
                "total":currentNew,
                "change":changeNew.percent,
                "trend":changeNew.trend
            },
            "total_time":{
                "total":timeSpentString,
                "change":changeDuration.percent,
                "trend":changeDuration.trend
            },
            "avg_time":{
                "total":(durationPerUser.toFixed(1)) + " min",
                "change":changeDurationPerUser.percent,
                "trend":changeDurationPerUser.trend
            },
            "avg_requests":{
                "total":eventsPerUser.toFixed(1),
                "change":changeEventsPerUser.percent,
                "trend":changeEventsPerUser.trend
            }
        };
    };

    countlySession.clearSessionObject = function (obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
            if (!obj["d"]) obj["d"] = 0;
            if (!obj["e"]) obj["e"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0, "d":0, "e":0};
        }

        return obj;
    };

    countlySession.getTopUserBars = function () {

        var barData = [],
            sum = 0,
            maxItems = 3,
            totalPercent = 0;

        var chartData = [
                { data:[], label:"Total Users" }
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
            topUsers = underscore.sortBy(underscore.reject(totalUserData.chartData, function (obj) {
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

}(countlySession));

module.exports = countlySession;