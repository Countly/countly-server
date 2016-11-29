'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:generate_notif');
var pluginManager = require('../../../pluginManager.js'),
    async = require("async");
var Promise = require("bluebird");

class GenerateNotifJob extends job.Job {
    run (countlyDb, doneJob, progressJob) {
        log.i("starting Generate Notifications job");

        function ping() {
            log.i('Pinging job');
            if (timeout) {
                progressJob();
                setTimeout(ping, 10000);
            }
        }
        var timeout = setTimeout(ping, 10000);

        var plugins = pluginManager.getPlugins();
        var promises = [];
        for(var i = 0, l = plugins.length; i < l; i++){
            try{
                log.i('Preparing job: ' + plugins[i]);
                promises.push(require("../../../"+plugins[i]+"/api/assistantJob").prepareNotifications(countlyDb));
            } catch (ex) {
            }
        }
        
        var finishIt = function () {
            log.i("Notifications generated");
            clearTimeout(timeout);
            timeout = 0;
            doneJob();
        };

        Promise.all(promises).then(finishIt, finishIt);

        /* Job types and subtypes
            1 - quick tips
                1 - Crash integration
                2 - Push integration
                3 - star rating integration
                4 - custom event integration
                5 - share dashboard
                6 - use funnels
                7 - use drills
                8 - use attribution
                9 - use dashboard localization
             2 - Insight
                1 - active users bow
                2 - active users eow
                3 - page view summary
                4 - top install sources
                5 - top referrals
                6 - session duration bow
             3 - announcments
                1 - blog page
                2 - ios sdk
                3 - android sdk
         */
    }
}

module.exports = GenerateNotifJob;