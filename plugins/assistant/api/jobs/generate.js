'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:generate_notif');
var plugins = require('../../../pluginManager.js'),
    async = require("async");

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

        log.i("Notifications generated");
        clearTimeout(timeout);
        timeout = 0;
        doneJob();
/*
        var app_id_list;
        //go through all apps

        //get app config


        var app_time;
        var app_day
*/
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

        /*
        //load configs
        plugins.loadConfigs(countlyDb, function(){
            var cache = {};
            var date = new Date();
            var hour = date.getHours();
            var dow = date.getDay();
            if(dow === 0)
                dow = 7;

            log.d(hour, dow);
            countlyDb.collection("reports").find({r_hour:hour}).toArray(function(err, res){
                if (!res || !res.length) {
                    log.d("nothing to send");
                    clearTimeout(timeout);
                    timeout = 0;
                    return doneJob();
                }
                async.eachSeries(res, function(report, done){
                    if(report.frequency == "daily" || (report.frequency == "weekly" && report.r_day == dow)){
                        reports.getReport(countlyDb, report, function(err, ob){
                            if(!err){
                                reports.send(ob.report, ob.message, function(){
                                    log.d("sent to", ob.report.emails[0]);
                                    done(null, null);
                                });
                            }
                            else{
                                log.d(err, ob.report.emails[0]);
                                done(null, null);
                            }
                        }, cache);
                    }
                    else{
                        done(null, null);
                    }
                }, function(*//*err, results*//*) {
                    log.d("all reports sent");
                    clearTimeout(timeout);
                    timeout = 0;
                    doneJob();
                });
            });
        });*/
    }
}

module.exports = GenerateNotifJob;