'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    tracker = require('../../../../api/parts/mgmt/tracker.js'),
    log = require('../../../../api/utils/log.js')('job:stats'),
    pluginManager = require('../../../pluginManager.js'),
    serverStats = require('../parts/stats.js'),
    moment = require('moment-timezone');

let drill;
try {
    drill = require('../../../drill/api/parts/data/drill.js');
}
catch (ex) {
    log.e(ex);
    drill = null;
}

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
    * @param {Object} allData - All server stats data from the beginning of time
    * @returns {Object} Sum of all data, average data per month, and last three month data
    */
    static generateDataSummary(allData) {
        const data = {};
        data.all = 0;
        data.month3 = [];
        const utcMoment = moment.utc();
        const months = {};
        for (let i = 0; i < 3; i++) {
            months[utcMoment.format('YYYY:M')] = true;
            utcMoment.subtract(1, 'months');
        }
        for (const [key, value] of Object.entries(allData)) {
            data.all += value;
            if (months[key]) {
                data.month3.push(key + ' - ' + (value));
            }
        }
        data.avg = Math.round((data.all / Object.keys(allData).length) * 100) / 100;

        return data;
    }

    /**
    * @param {Object} allData - All server stats data from the beginning of time
    * @returns {Object} Monthly data
    */
    static generateDataMonthly(allData) {
        const data = {};
        const utcMoment = moment.utc();
        const ids = {};
        const ids6 = {};
        const ids0 = {};
        const order = [];
        var thisMonth = "";
        var lastMonth = "";
        var thisMonthDP = 0;
        var lastMonthDP = 0;

        for (let i = 0; i < 12; i++) {
            order.push(utcMoment.format('MMM YYYY'));
            if (i === 0) {
                thisMonth = utcMoment.format('YYYY:M');
            }
            if (i === 1) {
                lastMonth = utcMoment.format('YYYY:M');
            }
            ids[utcMoment.format('YYYY:M')] = utcMoment.format('MMM YYYY');
            if (i < 7) {
                ids6[utcMoment.format('YYYY:M')] = utcMoment.format('MMM YYYY');
            }
            if (i === 0) {
                ids0[utcMoment.format('YYYY:M')] = utcMoment.format('MMM YYYY');
            }
            utcMoment.subtract(1, 'months');
        }

        const DP = {};
        data.DP = [];
        let avg12monthDP = 0;
        let avg6monthDP = 0;

        let avg12 = 0;
        let avg6 = 0;
        for (const [key, value] of Object.entries(allData)) {
            if (ids[key]) {
                DP[ids[key]] = value;

                if (!ids0[key]) {
                    avg12monthDP += DP[ids[key]];
                    avg12++;
                }
                if (ids6[key] && !ids0[key]) {
                    avg6monthDP += DP[ids[key]];
                    avg6++;
                }
                if (key === thisMonth) {
                    thisMonthDP = value;
                }
                if (key === lastMonth) {
                    lastMonthDP = value;
                }
            }
        }

        for (let i = 0; i < order.length; i++) {
            data.DP.push((i < 9 ? '0' + (i + 1) : i + 1) + '. ' + order[i] + ': ' + ((DP[order[i]] || 0).toLocaleString()));
        }
        if (avg12) {
            data.DPAvg12months = Math.round(avg12monthDP / avg12);
        }
        if (avg6) {
            data.DPAvg6months = Math.round(avg6monthDP / avg6);
        }
        if (lastMonthDP) {
            data.DPLastMonth = lastMonthDP;
        }
        if (thisMonthDP) {
            data.DPThisMonth = thisMonthDP;
        }

        return data;
    }

    /**
    * Returns a human readable name given application id.
    * @param {Object} db - Database object, used for querying
    * @param {function} done - Completion callback
    * @returns {undefined} Returns nothing, only callback
    **/
    run(db, done) {
        pluginManager.loadConfigs(db, async function() {
            let license = {};
            if (drill) {
                try {
                    license = await drill.loadLicense(undefined, db);
                }
                catch (error) {
                    log.e(error);
                    // do nothing, most likely there is no license
                }
            }

            var server = tracker.getBulkServer();
            var user = tracker.getBulkUser(server);
            if (!user) {
                return done();
            }
            var days = 30;
            var current_sync = Date.now();

            //generate dates in YYYY:M:D format for dates from "days" variable back up to today
            const specificDates = [];
            const utcMoment = moment.utc();
            for (let i = 0; i < days; i++) {
                specificDates.push(utcMoment.format('YYYY:M:D'));
                utcMoment.subtract(1, 'days');
            }

            const options = {
                dailyDates: specificDates,
                monthlyBreakdown: true,
                license_hosting: license?.license_hosting,
            };

            // Atomically retrieve old last_sync value and set new one
            var syncResult = await db.collection("plugins").findOneAndUpdate(
                {_id: "version"},
                {$set: {last_dp_sync: current_sync}},
                {
                    upsert: true,
                    returnDocument: 'before',
                    projection: {last_dp_sync: 1}
                }
            );

            var last_dp_sync = syncResult.value ? syncResult.value.last_dp_sync : null;
            if (last_dp_sync) {
                days = Math.floor((new Date().getTime() - last_dp_sync) / (1000 * 60 * 60 * 24));
            }

            if (days > 0) {
                serverStats.fetchDatapoints(db, {}, options, async(allData) => {
                    const dataMonthly = StatsJob.generateDataMonthly(allData);

                    if (allData.daily) {
                        for (const key in allData.daily) {
                            var parts = key.split(':');
                            //convert date in YYYY:M:D format to timestamp for noon (12:00:00) of that day in UTC
                            const timestamp = moment.tz(parts[0] + '-' + parts[1] + '-' + parts[2] + ' 12:00:00', 'YYYY-M-D HH:mm:ss', 'UTC').valueOf();
                            //send datapoint event with timestamp for noon of that day
                            user.add_event({key: "DP", count: allData.daily[key], timestamp: timestamp});
                        }
                    }
                    user.user_details({'custom': dataMonthly});
                    server.start(function() {
                        server.stop();
                        done();
                    });
                });
            }
            else {
                done();
            }
        });
    }
}

module.exports = StatsJob;
