'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    tracker = require('../../../../api/parts/mgmt/tracker.js'),
    log = require('../../../../api/utils/log.js')('job:stats'),
    config = require("../../../../frontend/express/config.js"),
    moment = require('moment-timezone'),
    request = require('request');

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
                    ], { allowDiskUse: true }, function(error, allData) {
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
                            members.forEach((member) => {
                                usersData.push({
                                    device_id: member.email,
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
                            });
                            var formData = {
                                app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
                                requests: JSON.stringify(usersData)
                            };

                            request.post({
                                url: 'https://stats.count.ly/i/bulk',
                                formData: formData
                            }, function(a) {
                                log.d('Done running stats job: %j', a);
                                done();
                            });

                            if (tracker.isEnabled()) {
                                utcMoment = moment.utc();
                                months = {};
                                data = {};
                                var Countly = tracker.getSDK();
                                for (let i = 0; i < 6; i++) {
                                    months[utcMoment.format("YYYY:M")] = "DP " + (i + 1) + " - " + utcMoment.format("MMM YYYY");
                                    Countly.userData.unset("DP " + i + " - " + utcMoment.format("MMM YYYY"));
                                    utcMoment.subtract(1, 'months');
                                }

                                Countly.userData.unset("DP 6 - " + utcMoment.format("MMM YYYY"));

                                for (let i = 0; i < allData.length; i++) {
                                    if (months[allData[i]._id]) {
                                        data[months[allData[i]._id]] = allData[i].e + allData[i].s;
                                    }
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
            done();
        }
    }
}

module.exports = StatsJob;