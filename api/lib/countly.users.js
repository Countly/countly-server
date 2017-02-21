var countlyModel = require('./countly.model.js'),
    countlyCommon = require('./countly.common.js'),
    underscore = require('underscore');

var countlySession = countlyModel.create();
countlySession.setMetrics(["t", "n", "u", "d", "e", "m", "p"]);
countlySession.setUniqueMetrics(["u", "m", "p"]);

countlySession.getSessionData = function () {
    var map = {t:"total_sessions", n:"new_users", u:"total_users", d:"total_time", e:"events"};
    var ret = {};
    var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e"], ["u"], {u:countlySession.getTotalUsersObj().users}, countlySession.clearObject);
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

module.exports = countlySession;