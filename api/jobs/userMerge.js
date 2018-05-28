'use strict';

const job = require('../parts/jobs/job.js'),
    async = require('async'),
    moment = require('moment'),
    plugins = require('../../plugins/pluginManager.js'),
    log = require('../utils/log.js')('job:userMerge');

class UserMergeJob extends job.Job {
    run (db, done) {
        log.d('Merging users ...');
        var startTime = moment().subtract(1, 'hour').startOf('hour');
        var endTime = moment(startTime).endOf("hour");
        log.d("query from", startTime, "to", endTime);
        function handleMerge(app, done){
            db.collection('app_user_merges' + app._id).find({cd:{$gte: startTime.toDate(), $lte: endTime.toDate()}}).toArray(function(err, res){
                if(!err && res && res.length){
                    log.d('Found merges for '+app._id+' ', res);
                    for(var i = 0; i < res.length; i++){
                        if(res[i].merged_to){
                            log.d('Dispatching', {app_id:app._id+"", oldUser:{uid:res[i]._id}, newUser:{uid:res[i].merged_to}});
                            plugins.dispatch("/i/device_id", {app_id:app._id+"", oldUser:{uid:res[i]._id}, newUser:{uid:res[i].merged_to}});
                        }
                    }
                }
                done();
            });
        }
        db.collection('apps').find({}).toArray(function (err, apps) {
            if(!err && apps && apps.length){
                async.forEach(apps, handleMerge, function(){
                    log.d('Merging users finished ...');
                    done();
                });
            }
            else{
                done(err);
            }
        });
    }
}

module.exports = UserMergeJob;