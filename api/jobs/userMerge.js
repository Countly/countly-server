'use strict';

const {Job} = require('../parts/jobs/job.js'),
    async = require('async'),
    moment = require('moment'),
    plugins = require('../../plugins/pluginManager.js'),
    log = require('../utils/log.js')('job:api:userMerge');

/** Class for the user mergind job **/
class UserMergeJob extends Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        log.d('Merging users ...');
        var startTime = moment().subtract(1, 'hour').startOf('hour');
        var endTime = moment(startTime).endOf("hour");
        log.d("query from", startTime, "to", endTime);
        /**
        * read historical merges for the lest hour and process them 
        * @param {object} app - app db document
        * @param {object} callback - when procssing finished
        **/
        function handleMerge(app, callback) {
            db.collection('app_user_merges' + app._id).find({
                cd: {
                    $gte: startTime.toDate(),
                    $lte: endTime.toDate()
                }
            }).toArray(function(err, res) {
                if (!err && res && res.length) {
                    log.d('Found merges for ' + app._id + ' ', res);
                    var merged = [];
                    for (var i = 0; i < res.length; i++) {
                        if (res[i].merged_to) {
                            merged.push(res[i]._id);
                            log.d('Dispatching', {
                                app_id: app._id + "",
                                oldUser: {uid: res[i]._id},
                                newUser: {uid: res[i].merged_to}
                            });
                            plugins.dispatch("/i/device_id", {
                                app_id: app._id + "",
                                oldUser: {uid: res[i]._id},
                                newUser: {uid: res[i].merged_to}
                            });
                        }
                    }
                    //delete merged users if they still exist
                    if (merged.length) {
                        db.collection("app_users" + app._id).remove({uid: {$in: merged}}, function() {});
                    }
                }
                callback();
            });
        }
        db.collection('apps').find({}).toArray(function(err, apps) {
            if (!err && apps && apps.length) {
                async.forEach(apps, handleMerge, function() {
                    log.d('Merging users finished ...');
                    done();
                });
            }
            else {
                done(err);
            }
        });
    }
}

module.exports = UserMergeJob;