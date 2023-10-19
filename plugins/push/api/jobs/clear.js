'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
    log = require('../../../../api/utils/log.js')('job:push:clear'),
    { State } = require('../send/data'),
    retry = require('../../../../api/parts/jobs/retry.js');
/** clear job class */
class ClearJob extends job.Job {
    /** constructs clear job  
     * @param {string} name - name
     * @param {object} data  - data
     */
    constructor(name, data) {
        super(name, data);
        log.d('Preparing to clear %j', this.data);
    }

    /** function returns NoretryPolicy
        @returns {object} retrypolicy
    */
    retryPolicy() {
        return new retry.NoRetryPolicy();
    }

    /** function runs clearing job
     * @param {object} db - db connection
     * @param {function} done - callback function, having error as first returned parameter
     */
    run(db, done) {
        log.d('Clearing %j', this.data);

        if (this.data.mid) {
            db.collection('messages').findOne({_id: db.ObjectID(this.data.mid)}, (err, msg) => {
                if (err) {
                    done(err);
                }
                else if (!msg) {
                    log.d('Nothing to clear - no message %j', this.data.mid);
                    done();
                }
                else if ((msg.result.state & State.Created) === 0) {
                    db.collection('messages').deleteOne({_id: db.ObjectID(this.data.mid)}, () => {
                        done();
                    });
                }
                else {
                    log.d('Nothing to clear for message %j', this.data.mid);
                    done();
                }
            });
        }
        else if (this.data.cid) {
            db.collection('apps').find({$or: [{'plugins.push.a._id': this.data.cid.toString()}, {'plugins.push.i._id': this.data.cid.toString()}, {'plugins.push.h._id': this.data.cid.toString()}]}).toArray((err, ok) => {
                if (err) {
                    done(err);
                }
                else {
                    if (ok && ok.length) {
                        log.i('Won\'t clear credentials %j since they\'re in app %j already', this.data.cid, ok[0]._id);
                        done();
                    }
                    else {
                        db.collection('credentials').remove({_id: db.ObjectID(this.data.cid)}, (err1, ok1) => {
                            if (err1) {
                                done(err1);
                            }
                            else {
                                log.d('Cleared credentials %j: %j', this.data.cid, ok1);
                                done();
                            }
                        });
                    }
                }
            });
        }
        else if (this.data.ghosts) {
            db.collection('plugins').findOne({_id: 'plugins'}, (err, plugins) => {
                if (err) {
                    log.w('Failed to load config when clearing ghosts', err);
                    done(err);
                }
                else if (!plugins || !plugins.push || !plugins.push.deduplicate) {
                    done();
                }
                else {
                    db.collection('apps').find({}, {_id: 1}).toArray((err2, apps) => {
                        if (err2) {
                            log.w('Failed to load apps when clearing ghosts', err2);
                            done(err2);
                        }
                        else {
                            this.nextApp(db, apps || []).then(() => {
                                log.i('Done clearing ghosts');
                                done();
                            }, e => done(e));
                        }
                    });
                }
            });
        }
        else {
            log.e('dunno what to clear: %j', this.data);
            done('dunno what to clear: ', JSON.stringify(this.data));
        }
    }

    /**
     * Process next app when clearing ghost push users
     * 
     * @param {Db} db mongo db
     * @param {Object[]} apps apps array
     * @param {function} done callback
     */
    async nextApp(db, apps) {
        if (!apps.length) {
            return;
        }

        let app = apps.pop(),
            push_count = await db.collection(`push_${app._id}`).countDocuments();

        if (push_count === 0) {
            await this.nextApp(db, apps);
            return;
        }

        let uids_count = await db.collection(`app_users${app._id}`).countDocuments();
        if (uids_count === push_count) {
            await this.nextApp(db, apps);
            return;
        }


        let push_cursor = db.collection(`push_${app._id}`).find({}, {_id: 1}),
            uids = await db.collection(`app_users${app._id}`).find({}, {uid: 1}).toArray(),
            to_remove = [];

        uids = new Set(uids.map(u => u.uid));

        for await (const doc of push_cursor) {
            if (!uids.has(doc._id)) {
                to_remove.push(doc._id);
            }
        }

        if (to_remove.length) {
            log.d('found %d ghost push users for %s, removing', to_remove.length, app._id);
            await db.collection(`push_${app._id}`).deleteMany({_id: {$in: to_remove}});
        }

        await this.nextApp(db, apps);
    }

    // /**
    //  * Process next app when clearing ghost push users
    //  * 
    //  * @param {Db} db mongo db
    //  * @param {Object[]} apps apps array
    //  * @param {function} done callback
    //  */
    // nextApp(db, apps, done) {
    //     if (!apps.length) {
    //         done();
    //         return;
    //     }

    //     let app = apps.pop();

    //     db.collection(`push_${app._id}`).aggregate([
    //         {$project: {_id: 1}},
    //         {$lookup: {from: `app_users${app._id}`, localField: '_id', foreignField: 'uid', as: 'app_user'}},
    //         {$match: {app_user: {$size: 0}}}
    //     ]).toArray((err, docs) => {
    //         if (err) {
    //             log.w('Failed to run clear aggregation for %s', app._id, err);
    //             done(err);
    //         }
    //         else {
    //             docs = (docs || []).map(d => d._id);

    //             log.d('Found %d ghost push users for %s', docs.length, app._id);
    //             if (docs.length) {
    //                 db.collection(`push_${app._id}`).deleteMany({_id: {$in: docs}}, (e2, res) => {
    //                     if (e2) {
    //                         log.w('Failed to delete ghost users for %s', app._id, e2);
    //                         done(e2);
    //                     }
    //                     else {
    //                         log.d('Deleted %d ghost push users for %s', res && res.deletedCount || 0, app._id);
    //                         this.nextApp(db, apps, done);
    //                     }
    //                 });
    //             }
    //             else {
    //                 this.nextApp(db, apps, done);
    //             }
    //         }
    //     });
    // }
}

module.exports = ClearJob;