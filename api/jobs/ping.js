'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('job:ping'),
    request = require('request');

class PingJob extends job.Job {
    run (db, done) {
        db.collection("members").findOne({global_admin:true}, function(err, member){
            if(!err && member){
                var date = new Date();
                request({
                    uri:"https://stats.count.ly/i",
                    method:"GET",
                    timeout:4E3,
                    qs:{
                        device_id:member.email,
                        app_key:"386012020c7bf7fcb2f1edf215f1801d6146913f",
                        timestamp: Math.round(date.getMilliseconds()/1000),
                        hour: date.getHours(),
                        dow: date.getDay(),
                        events:JSON.stringify([
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
        });
    }
}

module.exports = PingJob;