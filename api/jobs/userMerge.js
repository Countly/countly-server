'use strict';

const job = require('../parts/jobs/job.js'),
    async = require('async'),
    moment = require('moment'),
    plugins = require('../../plugins/pluginManager.js'),
    log = require('../utils/log.js')('job:userMerge');

/** Class for the user mergind job **/
class UserMergeJob extends job.Job {
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
                    async.eachSeries(res, function(user, done2) {
                        if (user.merged_to) {
                            merged.push(user._id);
                            log.d('Dispatching', {
                                app_id: app._id + "",
                                oldUser: {uid: user._id},
                                newUser: {uid: user.merged_to}
                            });
                            plugins.dispatch("/i/device_id", {
                                app_id: app._id + "",
                                oldUser: {uid: user._id},
                                newUser: {uid: user.merged_to}
                            }, function() {
                                done2();
                            });
                        }
                        else {
                            done2();
                        }
                    }, function() {
                        //delete merged users if they still exist
                        if (merged.length) {
                            db.collection("app_users" + app._id).remove({uid: {$in: merged}}, function() {
                                callback();
                            });
                        }
                        else {
                            callback();
                        }
                    });
                }
                else {
                    callback();
                }
            });
        }
        db.collection('apps').find({}, {_id: 1}).toArray(function(err, apps) {
            if (!err && apps && apps.length) {
                async.eachSeries(apps, handleMerge, function() {
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