const job = require('../../../../api/parts/jobs/job.js');
const log = require('../../../../api/utils/log.js')('job:views:cleanup_meta');
var Promise = require("bluebird");


const viewsUtils = require("../parts/viewsUtils.js");

/**
 * Class for running job
 */
class CleanupMetaJob extends job.Job {
    /**
     * Get's called to run the job
     * @param {mongoDatabase} countlyDb ref to countlyDb
     * @param {function} doneJob callback
     * @param {function} progressJob progress callback
     * @return {void} just for exit
     */
    run(countlyDb, doneJob, progressJob) {
        log.i("Starting Views meta recheck job");
        /***
         * Ping function so that the job does not timeout
         */
        function ping() {
            log.i('Pinging cleanup views meta job');
            if (timeout) {
                progressJob();
                timeout = setTimeout(ping, 10000);
            }
        }

        let timeout = setTimeout(ping, 10000);

        //this shall be called when all notifications are generated
        const finishItCallback = function() {
            log.i("Cleanup views meta, finishing job");
            clearTimeout(timeout);
            timeout = 0;
            doneJob();
        };

        countlyDb.collection('apps').find({}).toArray(function(err0, apps) {
            if (err0) {
                log.e(err0);
            }
            apps = apps || [];
            Promise.each(apps, function(app) {
                return new Promise((resolve) => {
                    countlyDb.collection("views").findOne({_id: app._id}, function(err1, view) {
                        if (err1) {
                            log.e("Error while cleaning up views meta", err1);
                            resolve();

                        }
                        else {
                            let listToOmit = [];

                            if (view && view.segments) {
                                var omittedList = view.omit || [];
                                for (var key in view.segments) {
                                    //console.log(key+" "+Object.keys(listed[z].segments[key]).length);
                                    if (omittedList.indexOf(key) !== -1) {
                                        listToOmit.push(key);
                                    }
                                }

                            }
                            if (listToOmit.length > 0) {
                                viewsUtils.ommit_segments({extend: true, db: countlyDb, omit: listToOmit, appId: app._id, params: {"qstring": {}, "user": {"_id": "SYSTEM", "username": "SYSTEM"}}}, function(err5) {
                                    if (err5) {
                                        log.e(err5);
                                    }
                                    resolve();
                                });
                            }
                            else {
                                resolve();
                            }
                        }

                    });
                });
            }).then(() => {
                finishItCallback();
            }).catch((err) => {
                log.e('Error while cleaning up views meta', err);
                finishItCallback();
            });
        });

    }
}

module.exports = CleanupMetaJob;