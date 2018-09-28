'use strict';

const job = require('../parts/jobs/job.js'),
    authorize = require('../utils/authorizer.js');

/** Class for job of clearing tokens **/
class CleanTokensJob extends job.Job {
    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        authorize.clean({
            db: db,
            callback: function() {
                done();
            }
        });
    }
}

module.exports = CleanTokensJob;