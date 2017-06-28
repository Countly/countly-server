'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:stats'),
    config = require("../../../../frontend/express/config.js"),
    moment = require('moment-timezone'),
    request = require('request');

class StatsJob extends job.Job {
    constructor(name, data) {
        super(name, data);
    }

    run (db, done) {
        if(config.web.track != "none"){
            db.collection("members").findOne({global_admin:true}, function(err, member){
                if(!err && member){
                    db.collection("server_stats_data_points").aggregate([
                        {
                            $group: {
                                _id: "$m",
                                e: { $sum: "$e"},
                                s: { $sum: "$s"}
                            }
                        }
                    ], { allowDiskUse:true }, function(error, allData) {
                        if(!error){
                            var data = {};
                            data.all = 0;
                            data.month3 = [];
                            var utcMoment = moment.utc();
                            var months = {};
                            for(var i = 0; i < 3; i++){
                                months[utcMoment.format("YYYY:M")] = true;
                                utcMoment.subtract(1, 'months');
                            }
                            for(var i = 0; i < allData.length; i++){
                                data.all += allData[i].e + allData[i].s;
                                if(months[allData[i]._id]){
                                    data.month3.push(allData[i]._id + " - " + (allData[i].e + allData[i].s));
                                }
                            }
                            data.avg = Math.round((data.all/allData.length)*100)/100;
                            var date = new Date();
                            request({
                                uri:"https://stats.count.ly/i",
                                method:"GET",
                                timeout:4E3,
                                qs:{
                                    device_id:member.email,
                                    app_key:"386012020c7bf7fcb2f1edf215f1801d6146913f",
                                    timestamp: Math.floor(date.getTime()/1000),
                                    hour: date.getHours(),
                                    dow: date.getDay(),
                                    user_details:JSON.stringify({
                                        custom: {
                                            dataPointsAll: data.all,
                                            dataPointsMonthlyAvg: data.avg,
                                            dataPointsLast3Months: data.month3
                                        }
                                    })
                                }
                            }, function(a, c, b) {
                                log.d('Done running stats job: %j', a);
                                done();
                            });
                        }
                        else{
                            done();
                        }
                    });
                }
                else{
                    done();
                }
            });
        }
        else{
            done();
        }
    }
}

module.exports = StatsJob;
