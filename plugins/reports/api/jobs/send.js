'use strict';

// const job = require('../../../../api/parts/jobs/job.js'),
const Job = require('../../../../jobServer/Job');
const log = require('../../../../api/utils/log.js')('job:reports');
const plugins = require('../../../pluginManager.ts');
const async = require("async");
const reports = require("../reports");
/**
 * @class
 * @classdesc Class ReportsJob is report Job extend from Countly Job
 * @extends Job
 */
class ReportsJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "0 * * * *" // every hour
        };
    }

    /**
    * run task
    * @param {object} countlyDb - db object
    * @param {function} doneJob - callback function
    * @param {function} progressJob - function for reporting progress
    */
    run(countlyDb, doneJob, progressJob) {
        log.d("starting send job");
        /**
         * check job status periodically
         */
        function ping() {
            log.d('Pinging job');
            if (timeout) {
                progressJob();
                timeout = setTimeout(ping, 10000);
            }
        }
        var timeout = setTimeout(ping, 10000);

        //load configs
        plugins.loadConfigs(countlyDb, function() {
            var cache = {};
            var date = new Date();
            var hour = date.getHours();
            var dow = date.getDay();
            var dom = date.getDate();
            if (dow === 0) {
                dow = 7;
            }

            log.d(hour, dow);
            countlyDb.collection("reports").find({r_hour: hour}).toArray(function(err, res) {
                if (!res || !res.length) {
                    log.d("nothing to send");
                    clearTimeout(timeout);
                    timeout = 0;
                    return doneJob();
                }
                async.eachSeries(res, function(report, done) {
                    if (report.enabled + '' !== false + '' &&
                        (
                            (report.frequency === "daily") ||
                            ((report.frequency === "weekly") && (report.r_day + '' === dow + '')) ||
                            ((report.frequency === "monthly") && (dom === 1))
                        )) {
                        if (report.last_sent && report.last_sent.hour === hour && report.last_sent.dow === dow && report.last_sent.dom === dom) {
                            return done();
                        }
                        reports.getReport(countlyDb, report, function(err2, ob) {
                            if (!err2) {
                                reports.send(ob.report, ob.message, function() {
                                    log.d("sent to", ob.report.emails);
                                    countlyDb.collection("reports").updateOne({_id: countlyDb.ObjectID(report._id)}, {$set: {last_sent: {hour: hour, dow: dow, dom: dom}}}, function() {
                                        done(null, null);
                                    });
                                });
                            }
                            else {
                                log.d(err2, ob.report);
                                done(null, null);
                            }
                        }, cache);
                    }
                    else {
                        done(null, null);
                    }
                }, function(asyncErr, /*results*/) {
                    if (asyncErr) {
                        log.d('report job err: %j', asyncErr, asyncErr.stack);
                    }
                    log.d("all reports sent");
                    clearTimeout(timeout);
                    timeout = 0;
                    doneJob();
                });
            });
        });
    }
}

module.exports = ReportsJob;
