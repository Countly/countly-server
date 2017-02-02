var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

var countlySession = countlyModel.create("session");
countlySession.getSessionData = function () {
    var map = {t:"total_sessions", n:"new_users", u:"total_users", d:"total_time", e:"events"};
    var ret = {};
    var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e"], ["u"], countlySession.getTotalUsersObj(), countlySession.clearObject);
    
    for(var i in data){
        ret[map[i]] = data[i];
    }
    
    //convert duration to minutes
    ret["total_time"]["total"] /= 60;
    ret["total_time"]["prev-total"] /= 60;
    
    //calculate average duration
    var changeAvgDuration = countlyCommon.getPercentChange(
        (ret["total_sessions"]["prev-total"] === 0) ? 0 : ret["total_time"]["prev-total"] / ret["total_sessions"]["prev-total"], 
        (ret["total_sessions"]["total"] === 0 ) ? 0 : ret["total_time"]["total"] / ret["total_sessions"]["total"]);
    ret["avg_time"] = {
        "total":(ret["total_sessions"]["prev-total"] === 0) ? 0 : ret["total_time"]["prev-total"] / ret["total_sessions"]["prev-total"],
        "prev-total":(ret["total_sessions"]["total"] === 0 ) ? 0 : ret["total_time"]["total"] / ret["total_sessions"]["total"],
        "change":changeAvgDuration.percent,
        "trend":changeAvgDuration.trend
    };
    
    ret["total_time"]["total"] = countlyCommon.timeString(ret["total_time"]["total"]);
    ret["total_time"]["prev-total"] = countlyCommon.timeString(ret["total_time"]["prev-total"]);
    ret["avg_time"]["total"] = countlyCommon.timeString(ret["avg_time"]["total"]);
    ret["avg_time"]["prev-total"] = countlyCommon.timeString(ret["avg_time"]["prev-total"]);
    
    //calculate average events
    var changeAvgEvents = countlyCommon.getPercentChange(
        (ret["total_users"]["prev-total"] === 0) ? 0 : ret["events"]["prev-total"] / ret["total_users"]["prev-total"], 
        (ret["total_users"]["total"] === 0 ) ? 0 : ret["events"]["total"] / ret["total_users"]["total"]);
    ret["avg_requests"] = {
        "total":(ret["total_users"]["prev-total"] === 0) ? 0 : ret["events"]["prev-total"] / ret["total_users"]["prev-total"],
        "prev-total":(ret["total_users"]["total"] === 0 ) ? 0 : ret["events"]["total"] / ret["total_users"]["total"],
        "change":changeAvgEvents.percent,
        "trend":changeAvgEvents.trend
    };
    
    ret["avg_requests"]["total"] = ret["avg_requests"]["total"].toFixed(1);
    ret["avg_requests"]["prev-total"] = ret["avg_requests"]["prev-total"].toFixed(1);
    
    delete ret["events"];
        
    return ret;
};

countlySession.getSubperiodData = function () {

   var dataProps = [
            { name:"t" },
            { name:"n" },
            { name:"u" },
            { name:"d" },
            { name:"e" }
        ];

    return countlyCommon.extractData(countlySession.getDb(), countlySession.clearObject, dataProps);
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

    var totalUserData = countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps),
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

    return underscore.sortBy(barData, function(obj) { return -obj.percent; });
};

module.exports = countlySession;