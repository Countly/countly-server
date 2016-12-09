'use strict';
const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:generate_notif'),
    pluginManager = require('../../../pluginManager.js'),
    async = require("async"),
    Promise = require("bluebird"),
    time = require('time')(Date),
    assistant = require("../assistant.js");


class GenerateNotifJob extends job.Job {
    run(countlyDb, doneJob, progressJob) {
        log.i("starting Generate Notifications job");

        function ping() {
            log.i('Pinging job');
            if (timeout) {
                progressJob();
                setTimeout(ping, 10000);
            }
        }

        let timeout = setTimeout(ping, 10000);

        countlyDb.collection('apps').find({}, {}).toArray(function (err_apps_data, result_apps_data) {
            assistant.getAssistantConfig(countlyDb, function (returnedConfiguration) {

                //log.i("Generate Notifications job, apps DB :" + JSON.stringify(result_apps_data));

                //get current day and time
                const date = new Date();

                const providedInfo = {};
                providedInfo.appsData = result_apps_data;
                providedInfo.assistantConfiguration = returnedConfiguration;
                //set the current time info
                providedInfo.timeAndDate = {};
                providedInfo.timeAndDate.date = date;
                providedInfo.timeAndDate.hour = date.getHours();
                providedInfo.timeAndDate.dow = date.getDay();
                if (providedInfo.timeAndDate.dow === 0) providedInfo.timeAndDate.dow = 7;

                const plugins = pluginManager.getPlugins();
                const promises = [];
                for (let i = 0, l = plugins.length; i < l; i++) {
                    try {
                        //log.i('Preparing job: ' + plugins[i]);
                        promises.push(require("../../../" + plugins[i] + "/api/assistantJob").prepareNotifications(countlyDb, providedInfo));
                    } catch (ex) {
                        //log.i('Preparation FAILED [%j]', ex);
                    }
                }

                const finishIt = function () {
                    log.i("Notifications generated");
                    clearTimeout(timeout);
                    timeout = 0;
                    doneJob();
                };

                Promise.all(promises).then(finishIt, finishIt);
            });
        });
    }
}

module.exports = GenerateNotifJob;