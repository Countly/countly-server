'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('job:ping'),
    countlyConfig = require("../../frontend/express/config.js"),
    versionInfo = require('../../frontend/express/version.info'),
    request = require('request'),
    plugins = require('../../plugins/pluginManager.js');

/** Class for the job of pinging servers **/
class PingJob extends job.Job {
    /**
     * Run the ping job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        request({strictSSL: false, uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + "/configs"}, function() {});
        var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));
        var url = "https://count.ly/configurations/ce/tracking";
        if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
            url = "https://count.ly/configurations/ee/tracking";
        }
        plugins.loadConfigs(db, function() {
            const offlineMode = plugins.getConfig("api").offline_mode;
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
                    if (countlyConfig.web.track !== "none") {
                        db.collection("members").findOne({global_admin: true}, function(err2, member) {
                            if (!err2 && member) {
                                var date = new Date();
                                request({
                                    uri: "https://stats.count.ly/i",
                                    method: "GET",
                                    timeout: 4E3,
                                    qs: {
                                        device_id: member.email,
                                        app_key: "386012020c7bf7fcb2f1edf215f1801d6146913f",
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
