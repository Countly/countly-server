'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    tracker = require('../../../../api/parts/mgmt/tracker.js'),
    log = require('../../../../api/utils/log.js')('job:stats'),
    pluginManager = require('../../../pluginManager.js'),
    serverStats = require('../parts/stats.js'),
    common = require('../../../../api/utils/common.js'),
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

        for (let i = 0; i < 12; i++) {
            order.push(utcMoment.format('MMM YYYY'));
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
            }
        }

        for (let i = 0; i < order.length; i++) {
            data.DP.push((i < 9 ? '0' + (i + 1) : i + 1) + '. ' + order[i] + ': ' + ((DP[order[i]] || 0).toLocaleString()));
        }
        if (avg12) {
            data['Last 12 months'] = Math.round(avg12monthDP / avg12).toLocaleString();
        }
        if (avg6) {
            data['Last 6 months'] = Math.round(avg6monthDP / avg6).toLocaleString();
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

            const options = {
                monthlyBreakdown: true,
                license_hosting: license.license_hosting,
            };

            serverStats.fetchDatapoints(db, {}, options, async(allData) => {
                const dataSummary = StatsJob.generateDataSummary(allData);
                const dataMonthly = StatsJob.generateDataMonthly(allData);
                dataMonthly.dataPointsAll = dataSummary.all;
                dataMonthly.dataPointsMonthlyAvg = dataSummary.avg;
                dataMonthly.dataPointsLast3Months = dataSummary.month3;
                common.db = db; // ensure common.db is set
                tracker.enable(); // ensure tracking is enabled
                const Countly = tracker.getSDK();
                Countly.user_details({
                    'custom': dataMonthly,
                });
                Countly.userData.save();
                done();
            });
        });
    }
}

module.exports = StatsJob;
