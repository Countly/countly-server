'use strict';

const job = require('../parts/jobs/job.js'),
    authorize = require('../utils/authorizer.js');

class CleanTokensJob extends job.Job {
    run (db, done) {
        authorize.clean({db:db, function(){
            done();
        }});
    }
}

module.exports = CleanTokensJob;