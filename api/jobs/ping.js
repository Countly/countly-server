'use strict';

// const job = require('../parts/jobs/job.js');
const log = require('../utils/log.js')('job:ping');
const countlyConfig = require("../../frontend/express/config.js");
const versionInfo = require('../../frontend/express/version.info');
const plugins = require('../../plugins/pluginManager.js');


const Job = require("../../jobServer/Job");


/** Class for the job of pinging servers **/
class PingJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns {GetScheduleConfig} schedule configuration
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "0 1 * * *" // Every day at 1:00 AM
        };
    }

    /**
     * Run the ping job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {

        plugins.loadConfigs(db, function() {
            const request = require('countly-request')(plugins.getConfig("security"));
            request({strictSSL: false, uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + "/configs"}, function() {});
            var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));
            var url = "https://count.ly/configurations/ce/tracking";
            if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
                url = "https://count.ly/configurations/ee/tracking";
            }

            const offlineMode = plugins.getConfig("api").offline_mode;
            const { countly_tracking } = plugins.getConfig('frontend');
            if (!offlineMode) {
                request(url, function(err, response, body) {
                    if (typeof body === "string") {
                        try {
                            body = JSON.parse(body);
                        }
                        catch (ex) {
                            body = null;
                        }
                    }
                    if (body) {
                        if (countlyConfigOrig.web.use_intercom && typeof body.intercom !== "undefined") {
                            countlyConfig.web.use_intercom = body.intercom;
                        }
                        if (typeof countlyConfigOrig.web.track === "undefined" && typeof body.stats !== "undefined") {
                            if (body.stats) {
                                countlyConfig.web.track = null;
                            }
                            else {
                                countlyConfig.web.track = "none";
                            }
                        }
                    }
                    log.d(err, body, countlyConfigOrig, countlyConfig);
                    if (countly_tracking) {
                        db.collection("members").findOne({global_admin: true}, function(err2, member) {
                            if (!err2 && member) {
                                var date = new Date();
                                let domain = plugins.getConfig('api').domain;

                                try {
                                // try to extract hostname from full domain url
                                    const urlObj = new URL(domain);
                                    domain = urlObj.hostname;
                                }
                                catch (_) {
                                // do nothing, domain from config will be used as is
                                }

                                request({
                                    uri: "https://stats.count.ly/i",
                                    method: "GET",
                                    timeout: 4E3,
                                    qs: {
                                        device_id: domain,
                                        app_key: "e70ec21cbe19e799472dfaee0adb9223516d238f",
                                        timestamp: Math.floor(date.getTime() / 1000),
                                        hour: date.getHours(),
                                        dow: date.getDay(),
                                        no_meta: true,
                                        events: JSON.stringify([
                                            {
                                                key: "PING",
                                                count: 1
                                            }
                                        ])
                                    }
                                }, function(a/*, c, b*/) {
                                    log.d('Done running ping job: %j', a);
                                    done();
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
                });
            }
            else {
                done();
            }
        });
    }
}

module.exports = PingJob;
