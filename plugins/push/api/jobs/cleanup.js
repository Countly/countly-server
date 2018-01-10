'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
      log = require('../../../../api/utils/log.js')('job:push:cleanup'),
      retry = require('../../../../api/parts/jobs/retry.js'),
      creds = require('../parts/credentials.js'),
      Streamer = require('../parts/streamer.js'),
      N = require('../parts/note.js');


class CleanupJob extends job.Job {
    retryPolicy () {
        return new retry.NoRetryPolicy();
    }

    run (db, done, progress) {
        log.d('Cleaning push collections');
        return done();

        let query = {
            $and: [
                {'data.mid': {$exists: true}},
                {'subs.data.appsub.data.auto': {$exists: false}},
                {status: {$in: [job.STATUS.DONE, job.STATUS.CANCELLED]}},
                {$or: [
                    {finished: {$exists: false}},
                    // {finished: {$lt: Date.now() - 60 * 1000}},
                    {finished: {$lt: Date.now() - 60 * 60 * 1000}},
                    {finished: null}
                ]}
            ]
        };
        
        db.collection('jobs').find(query).toArray((err, jobs) => {
            if (err) {
                log.e('Error while cleaning push collections: ', err);
            } else {
                let size = jobs.length,
                    removing = [];
                log.d('Checking %d jobs', jobs.length);

                let next = () => {
                    if (jobs.length === 0) {
                        log.d('Cleaned %d: %j', removing.length, removing);
                        done();
                    } else {
                        if (jobs.length % 10 === 0) {
                            progress(size, size - jobs.length);
                        }

                        let job = jobs.pop();

                        if (job.subs) {
                            Promise.all(job.subs.map(sub => {
                                let appsub = sub.data.appsub,
                                    anote = new N.AppSubNote(appsub);
                                
                                anote.nobuild = true;
                                anote.creds = new creds.AppSubCredentials(anote.creds);

                                let streamer = new Streamer(anote);
                                removing.push(streamer.collection());
                                return streamer.clear(db);
                            })).then(next, done);
                        } else {
                            next();
                        }
                    }
                };
                next();
            }
        });
    }
}

module.exports = CleanupJob;
