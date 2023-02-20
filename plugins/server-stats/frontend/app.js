var pluginExported = {};
var countlyConfig = require('../../../frontend/express/config');
var versionInfo = require('../../../frontend/express/version.info');
var request = require('countly-request');
var moment = require('moment');
const { getUserApps } = require('../../../api/utils/rights');

(function(plugin) {
    plugin.init = function(app, countlyDb) {
        plugin.loginSuccessful = function(ob) {
            var member = ob.data;
            if (!countlyConfig.web.track || countlyConfig.web.track === "GA" && member.global_admin || countlyConfig.web.track === "noneGA" && !member.global_admin) {
                var match = {};
                if (versionInfo.trial) {
                    match.a = {$in: getUserApps(member) || []};
                }
                countlyDb.collection("server_stats_data_points").aggregate([
                    {
                        $match: match
                    },
                    {
                        $group: {
                            _id: "$m",
                            e: { $sum: "$e"},
                            s: { $sum: "$s"}
                        }
                    }
                ], { allowDiskUse: true }, function(error, allData) {
                    var custom = {};
                    if (!error && allData && allData.length) {
                        var data = {};
                        data.all = 0;
                        data.month3 = [];
                        var utcMoment = moment.utc();
                        var months = {};
                        for (let i = 0; i < 3; i++) {
                            months[utcMoment.format("YYYY:M")] = true;
                            utcMoment.subtract(1, 'months');
                        }
                        for (let i = 0; i < allData.length; i++) {
                            data.all += allData[i].e + allData[i].s;
                            if (months[allData[i]._id]) {
                                data.month3.push(allData[i]._id + " - " + (allData[i].e + allData[i].s));
                            }
                        }
                        data.avg = Math.round((data.all / allData.length) * 100) / 100;
                        custom.dataPointsAll = data.all;
                        custom.dataPointsMonthlyAvg = data.avg;
                        custom.dataPointsLast3Months = data.month3;
                        var date = new Date();
                        request({
                            uri: "https://stats.count.ly/i",
                            method: "GET",
                            timeout: 4E3,
                            qs: {
                                device_id: member.email,
                                app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
                                timestamp: Math.round(date.getTime() / 1000),
                                hour: date.getHours(),
                                dow: date.getDay(),
                                user_details: JSON.stringify(
                                    {
                                        custom: custom
                                    }
                                )
                            }
                        }, function(/*error, response, body*/) {});
                    }
                });
            }
        };
    };
}(pluginExported));

module.exports = pluginExported;