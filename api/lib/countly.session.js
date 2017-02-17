var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

var countlySession = countlyModel.create("session");
countlySession.getData = function (clean, join, metric) {
    var chartData = [
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" },
            { data:[], label:"Total Users" }
        ],
        dataProps = [
            { name:"t" },
            { name:"n" },
            { name:"u" },
            { name:"d" },
            { name:"e" },
            { name:"m" },
            { name:"p" }
        ];

    return countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps);
}
countlySession.getSessionData = function () {
    var map = {t:"total_sessions", n:"new_users", u:"total_users", d:"total_time", e:"events"};
    var ret = {};
    var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e"], ["u"], {u:countlySession.getTotalUsersObj()}, countlySession.clearObject);
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
        
    //delete previous period data
    for(var i in ret){
        delete ret[i]["prev-total"];
    }
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
    return countlySession.getBars();
};

countlySession.getBars = function (segment, maxItems, metric) {
    var barData = [],
        sum = 0,
        maxItems = maxItems || 3,
        metric = metric || "u",
        totalPercent = 0;

    var chartData = [
            { data:[], label:"Total Users" }
        ],
        dataProps = [
            {
                name:metric,
                func:function (dataObj) {
                    return dataObj[metric]
                }
            }
        ];

    var totalUserData = countlyCommon.extractChartData(countlySession.getDb(), countlySession.clearObject, chartData, dataProps),
        topUsers = underscore.sortBy(underscore.reject(totalUserData.chartData, function (obj) {
            return obj[metric] == 0;
        }), function (obj) {
            return -obj[metric];
        });

    if (topUsers.length < maxItems) {
        maxItems = topUsers.length;
    }

    for (var i = 0; i < maxItems; i++) {
        sum += topUsers[i][metric];
    }

    for (var i = 0; i < maxItems; i++) {
        var percent = Math.floor((topUsers[i][metric] / sum) * 100);
        totalPercent += percent;

        if (i == (maxItems - 1)) {
            percent += 100 - totalPercent;
        }

        barData[i] = { "name":topUsers[i]["date"], value:topUsers[i][metric], "percent":percent };
    }

    return underscore.sortBy(barData, function(obj) { return -obj.percent; });
};

countlySession.clearObject = function (obj) {
        if (obj) {
            if (!obj["t"]) obj["t"] = 0;
            if (!obj["n"]) obj["n"] = 0;
            if (!obj["u"]) obj["u"] = 0;
            if (!obj["d"]) obj["d"] = 0;
            if (!obj["e"]) obj["e"] = 0;
            if (!obj["m"]) obj["m"] = 0;
            if (!obj["p"]) obj["p"] = 0;
        }
        else {
            obj = {"t":0, "n":0, "u":0, "d":0, "e":0, "m":0, "p":0};
        }

        return obj;
    };

module.exports = countlySession;