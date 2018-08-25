'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:clear'),
    N = require('../parts/note.js'),
    retry = require('../../../../api/parts/jobs/retry.js');

class ClearJob extends job.Job {
    constructor(name, data) {
        super(name, data);
        log.d('Preparing to clear %j', this.data);
    }

    retryPolicy () {
        return new retry.NoRetryPolicy();
    }

    run (db, done) {
        log.d('Clearing %j', this.data);
        
        if (this.data.mid) {
            db.collection('messages').findOne({_id: db.ObjectID(this.data.mid)}, (err, msg) => {
                if (err) { done(err); }
                else if (!msg) {
                    log.d('Nothing to clear - no message %j', this.data.mid);
                    done();
                } else if ((msg.result.status & N.Status.Created) === 0) {
                    db.collection('messages').deleteOne({_id: db.ObjectID(this.data.mid)}, () => {
                        done();
                    });
                } else {
                    log.d('Nothing to clear for message %j', this.data.mid);
                    done();
                }
            });
        } else if (this.data.cid) {
            db.collection('apps').find({$or: [{'plugins.push.a._id': this.data.cid.toString()}, {'plugins.push.i._id': this.data.cid.toString()}]}).toArray((err, ok) => {
                if (err) { done(err); }
                else {
                    if (ok && ok.length) {
                        log.i('Won\'t clear credentials %j since they\'re in app %j already', this.data.cid, ok[0]._id);
                        done();
                    } else {
                        db.collection('credentials').remove({_id: db.ObjectID(this.data.cid)}, (err, ok) => {
                            if (err) { done(err); }
                            else { 
                                log.d('Cleared credentials %j: %j', this.data.cid, ok);
                                done(); 
                            }
                        });
                    }
                }
            });
        } else {
            log.e('dunno what to clear: %j', this.data);
            done('dunno what to clear: ', JSON.stringify(this.data));
        }
    }
}

module.exports = ClearJob;
