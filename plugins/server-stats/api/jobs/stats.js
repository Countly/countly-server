'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    tracker = require('../../../../api/parts/mgmt/tracker.js'),
    log = require('../../../../api/utils/log.js')('job:stats'),
    config = require("../../../../frontend/express/config.js"),
    pluginManager = require('../../../pluginManager.js'),
    moment = require('moment-timezone'),
    request = require('countly-request')(pluginManager.getConfig("security"));

const promisedLoadConfigs = function(db) {
    return new Promise((resolve) => {
        pluginManager.loadConfigs(db, () => {
            resolve();
        });
    });
};

/** Representing a StatsJob. Inherits api/parts/jobs/job.js (job.Job) */
class StatsJob extends job.Job {
    /**
    * Inherits api/parts/jobs/job.js, please review for detailed description
    * @param {string|Object} name - Name for job
    * @param {Object} data - Data for job
    */
    constructor(name, data) {
        super(name, data);
    }

    /**
    * Returns a human readable name given application id.
    * @param {Object} db - Database object, used for querying
    * @param {function} done - Completion callback
    * @returns {undefined} Returns nothing, only callback
    **/
    run(db, done) {
        if (config.web.track !== "none") {
            db.collection("members").find({global_admin: true}).toArray(function(err, members) {
                if (!err && members.length > 0) {
                    db.collection("server_stats_data_points").aggregate([
                        {
                            $group: {
                                _id: "$m",
                                e: { $sum: "$e"},
                                s: { $sum: "$s"}
                            }
                        }
                    ], { allowDiskUse: true }, async function(error, allData) {
                        if (!error) {
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
                            var date = new Date();
                            var usersData = [];

                            await promisedLoadConfigs(db);

                            let domain = '';

                            try {
                                // try to extract hostname from full domain url
                                const urlObj = new URL(pluginManager.getConfig('api').domain);
                                domain = urlObj.hostname;
                            }
                            catch (_) {
                                // do nothing, domain from config will be used as is
                            }

                            usersData.push({
                                device_id: domain,
                                timestamp: Math.floor(date.getTime() / 1000),
                                hour: date.getHours(),
                                dow: date.getDay(),
                                user_details: JSON.stringify({
                                    custom: {
                                        dataPointsAll: data.all,
                                        dataPointsMonthlyAvg: data.avg,
                                        dataPointsLast3Months: data.month3
                                    }
                                })
                            });

                            var formData = {
                                app_key: "e70ec21cbe19e799472dfaee0adb9223516d238f",
                                requests: JSON.stringify(usersData)
                            };

                            request.post({
                                url: 'https://stats.count.ly/i/bulk',
                                body: formData
                            }, function(a) {
                                log.d('Done running stats job: %j', a);
                                done();
                            });

                            if (tracker.isEnabled()) {
                                utcMoment = moment.utc();
                                data = {};
                                var ids = {};
                                var ids6 = {};
                                var ids0 = {};
                                var order = [];
                                var Countly = tracker.getSDK();
                                for (let i = 0; i < 12; i++) {
                                    order.push(utcMoment.format("MMM YYYY"));
                                    ids[utcMoment.format("YYYY:M")] = utcMoment.format("MMM YYYY");
                                    if (i < 7) {
                                        ids6[utcMoment.format("YYYY:M")] = utcMoment.format("MMM YYYY");
                                    }
                                    if (i === 0) {
                                        ids0[utcMoment.format("YYYY:M")] = utcMoment.format("MMM YYYY");
                                    }
                                    utcMoment.subtract(1, 'months');
                                }

                                var DP = {};
                                data.DP = [];
                                var avg12monthDP = 0;
                                var avg6monthDP = 0;

                                var avg12 = 0;
                                var avg6 = 0;
                                for (let i = 0; i < allData.length; i++) {
                                    if (ids[allData[i]._id]) {
                                        var val = allData[i].e + allData[i].s;
                                        DP[ids[allData[i]._id]] = val;
                                        if (!ids0[allData[i]._id]) {
                                            avg12monthDP += DP[ids[allData[i]._id]];
                                            avg12++;
                                        }
                                        if (ids6[allData[i]._id] && !ids0[allData[i]._id]) {
                                            avg6monthDP += DP[ids[allData[i]._id]];
                                            avg6++;
                                        }
                                    }
                                }

                                for (let i = 0; i < order.length; i++) {
                                    data.DP.push((i < 9 ? "0" + (i + 1) : i + 1) + ". " + order[i] + ": " + ((DP[order[i]] || 0).toLocaleString()));
                                }

                                if (avg12) {
                                    data["Last 12 months"] = Math.round(avg12monthDP / avg12).toLocaleString();
                                }
                                if (avg6) {
                                    data["Last 6 months"] = Math.round(avg6monthDP / avg6).toLocaleString();
                                }
                                Countly.user_details({
                                    "custom": data
                                });

                                Countly.userData.save();
                            }
                        }
                        else {
                            done();
                        }
                    });
                }
                else {
                    done();
                }
            });
        }
        else {
            db.collection('plugins').updateOne({_id: 'plugins'}, {$unset: {remoteConfig: 1}}).catch(dbe => {
                log.e('Db error', dbe);
            });
            done();
        }
    }
}

module.exports = StatsJob;