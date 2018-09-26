'use strict';

const job = require('../parts/jobs/job.js'),
    log = require('../utils/log.js')('job:clear');

/** Class for job of clearing old jobs **/
class ClearJob extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        log.d('Clearing jobs ...');
        var query = {
            $and: [
                {status: {$in: [job.STATUS.DONE, job.STATUS.CANCELLED]}},
                {
                    $or: [
                        {finished: {$exists: false}},
                        {finished: {$lt: Date.now() - 60 * 60 * 24 * 1000}},
                        {finished: null}
                    ]
                }
            ]
        };

        db.collection('jobs').deleteMany(query, (err, result) => {
            if (err) {
                log.e('Error while clearing jobs: ', err);
            }
            else {
                log.d('Done clearing old jobs done before %j:', query.$and[1].$or[1].finished.$lt, result.deletedCount);
            }
            done(err);
        });
    }
}

module.exports = ClearJob;