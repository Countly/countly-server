'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:reports');
var plugins = require('../../../pluginManager.js'),
    async = require("async"),
    reports = require("../reports");

class ReportsJob extends job.Job {
    run (countlyDb, doneJob, progressJob) {
        log.d("starting send job");

        function ping() {
            log.d('Pinging job');
            if (timeout) {
                progressJob();
                setTimeout(ping, 10000);
            }
        }
        var timeout = setTimeout(ping, 10000);

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
                }, function(/*err, results*/) {
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
