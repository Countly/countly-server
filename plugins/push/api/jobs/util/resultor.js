const { FRAME } = require('../../send/proto'),
    { SynFlushTransform } = require('./syn'),
    { ERROR, Message } = require('../../send/data');

/**
 * Stream responsible for handling sending results:
 * - buffer incoming results
 * - write them to db once in a while
 */
class Resultor extends SynFlushTransform {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {MongoClient} db mongo client
     * @param {object} data map of {_id: {a, m, u, t, f}} (app id, uid, token, field) of the messages currently being sent
     * @param {int} limit how much results to buffer before flushing to db
     * @param {function} check function which returns boolean in case no more data is expected and the stream can be closed
     */
    constructor(log, db, data, limit, check) {
        super(log.sub('resultor'), {objectMode: true});
        this.log = log.sub('resultor');
        this.data = data;
        this.db = db;
        this.limit = limit;
        this.check = check;

        // temporary storage to decrease number of database updates
        this.changed = {}; // {aid: {field: {uid: new token}}}
        this.sent = {}; // {mid: int}
        this.processed = {}; // {mid: int}
        this.sentUsers = {}; // {aid: {mid: [uid, uid, uid]}}
        this.removeTokens = {}; // {aid: {field: [uid, uid, uid]}}
        this.errors = {}; // {mid: {platform: {InvalidToken: 0}}}
        this.fatalErrors = {}; // {mid: []}
        this.toDelete = []; // [push id, push id, ...]
        this.count = 0; // number of results cached
        this.last = null; // time of last data from 
        this.messages = {}; // {_id: Message}

        this.data.on('app', app => {
            this.changed[app._id] = {};
            this.sentUsers[app._id] = {};
            this.removeTokens[app._id] = {};

            let { PLATFORM } = require('../../send/platforms');
            for (let p in PLATFORM) {
                Object.values(PLATFORM[p].FIELDS).forEach(f => {
                    this.changed[app._id][p + f] = {};
                    this.removeTokens[app._id][p + f] = [];
                });
            }
        });

        this.data.on('message', message => {
            this.messages[message._id] = new Message(message);
            this.sent[message._id] = 0;
            this.processed[message._id] = 0;
            this.fatalErrors[message._id] = [];
            this.sentUsers[message.app][message._id] = [];

            this.errors[message._id] = {};
            let { PLATFORM } = require('../../send/platforms');
            for (let p in PLATFORM) {
                this.errors[message._id][p] = {};
            }
        });
    }

    /**
     * Transform's transform impementation
     * 
     * @param {object[]} chunk array of results [push id|[push id, new token]]
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    _transform(chunk, encoding, callback) {
        let {frame, payload: results} = chunk;
        if (frame & FRAME.CMD) {
            if (frame & (FRAME.FLUSH | FRAME.SYN)) {
                this.do_flush(() => {
                    this.push(chunk);
                    callback();
                });
            }
            else {
                callback();
            }
            return;
        }
        else if (frame & FRAME.RESULTS) {
            if (frame & FRAME.ERROR) {
                [results.affected, results.left].forEach(arr => {
                    if (results.type & (ERROR.DATA_TOKEN_EXPIRED | ERROR.DATA_TOKEN_INVALID)) {
                        arr.forEach(id => {
                            let {a, p, f, u} = this.data.pushes[id];
                            this.removeTokens[a][p + f].push(u);
                        });
                    }
                    arr.forEach(id => {
                        let {p, m} = this.data.pushes[id],
                            msg = this.messages[m];
                        msg.results.processed++;
                        msg.results.response(p, results.message, 1);
                        delete this.data.pushes[id];
                        this.toDelete.push(id);
                    });
                    this.count += arr.length;
                });
            }
            else {
                results.forEach(res => {
                    let id, token;
                    if (typeof res === 'string') {
                        id = res;
                    }
                    else {
                        id = res[0];
                        token = res[1];
                    }

                    let p = this.data.pushes[id];
                    if (!p) { // 2 or more resultors on one pool
                        return;
                    }

                    let m = this.messages[p.m];
                    m.results.sent++;
                    m.results.processed++;

                    this.toDelete.push(id);
                    delete this.data.pushes[id];

                    this.sentUsers[p.a][p.m].push(p.u);
                    if (token) {
                        this.changed[p.a][p.p + p.f][p.u] = token;
                    }

                    this.count++;
                });
                this.log.d('Added %d results', results.length);
            }

            // // in case no more data is expected, we can safely close the stream
            // if (this.check()) {
            //     for (let _ in this.state.pushes) {
            //         return;
            //     }
            //     this.do_flush(() => this.end());
            // }
        }
        else if (frame & FRAME.ERROR) {
            let error = results.messageError(),
                mids = {};

            [results.affected, results.left].forEach(arr => {
                arr.forEach(id => {
                    let {m} = this.data.pushes[id];
                    mids[m] = (mids[m] || 0) + 1;
                    delete this.data.pushes[id];
                    this.toDelete.push(id);
                });

                this.count += arr.length;
            });

            for (let mid in mids) {
                let m = this.messages[mid];
                m.results.processed[m]++;
                m.results.pushError(error);
            }
        }

        if (this.count > this.limit) {
            this.do_flush(callback);
        }
        else {
            callback();
        }
    }

    /**
     * Actual flush function
     * 
     * @param {function} callback callback
     */
    do_flush(callback) {
        this.log.d('Flushing');
        this.count = 0;

        let updates = {},
            promises = Object.values(this.messages).map(m => m.save());

        if (this.toDelete.length) {
            promises.push(this.db.collection('push').deleteMany({_id: {$in: this.toDelete.map(this.db.ObjectID)}}));
            this.toDelete = [];
        }

        // changed tokens - set new ones
        for (let aid in this.changed) {
            let collection = 'push_' + aid;
            if (!updates[collection]) {
                updates[collection] = [];
            }
            for (let field in this.changed[aid]) {
                for (let uid in this.changed[aid][field]) {
                    updates[collection].push({
                        updateOne: {
                            filter: {_id: uid},
                            update: {
                                $set: {
                                    ['tk.' + field]: this.changed[aid][field][uid]
                                }
                            }
                        }
                    });
                }
                this.changed[aid][field] = {};
            }
        }

        // expired tokens - unset
        for (let aid in this.removeTokens) {
            let collection = 'push_' + aid;
            if (!updates[collection]) {
                updates[collection] = [];
            }
            for (let field in this.removeTokens[aid]) {
                if (this.removeTokens[aid][field].length) {
                    updates[collection].push({
                        updateMany: {
                            filter: {_id: {$in: this.removeTokens[aid][field]}},
                            update: {
                                $unset: {
                                    ['tk.' + field]: 1
                                }
                            }
                        }
                    });
                    this.removeTokens[aid][field] = [];
                }
            }
        }

        let now = Date.now();
        for (let aid in this.sentUsers) {
            let collection = 'push_' + aid;
            if (!updates[collection]) {
                updates[collection] = [];
            }
            for (let mid in this.sentUsers[aid]) {
                if (this.sentUsers[aid][mid].length) {
                    updates[collection].push({
                        updateMany: {
                            filter: {_id: {$in: this.sentUsers[aid][mid]}},
                            update: {
                                $set: {
                                    ['msgs.' + mid]: now
                                }
                            }
                        }
                    });
                    this.sentUsers[aid][mid] = [];
                }
                // this.sentUsers[aid][mid].forEach(uid => {
                //     updates[collection].push({
                //         updateOne: {
                //             filter: {_id: uid},
                //             update: {
                //                 $set: {
                //                     ['msgs.' + mid]: now
                //                 }
                //             }
                //         }
                //     });
                // });
            }
        }

        for (let c in updates) {
            if (updates[c].length) {
                this.log.d('Running batch of %d updates for %s', updates[c].length, c);
                promises.push(this.db.collection(c).bulkWrite(updates[c]));
            }
        }

        Promise.all(promises).then(() => {
            this.log.d('Flushed');
            if (callback) {
                callback();
            }
        }, err => {
            this.log.e('Flushing error', err);
            if (callback) {
                callback(err);
            }
        });
    }


    // /**
    //  * Actual flush function
    //  * 
    //  * @param {function} callback callback
    //  */
    // do_flush(callback) {
    //     this.log.d('Flushing');
    //     this.count = 0;

    //     let updates = {},
    //         promises = [];

    //     // changed tokens - set new ones
    //     for (let aid in this.changed) {
    //         let collection = 'push_' + aid;
    //         if (!updates[collection]) {
    //             updates[collection] = [];
    //         }
    //         for (let field in this.changed[aid]) {
    //             for (let uid in this.changed[aid][field]) {
    //                 updates[collection].push({
    //                     updateOne: {
    //                         filter: {_id: uid},
    //                         update: {
    //                             $set: {
    //                                 ['tk.' + field]: this.changed[aid][field][uid]
    //                             }
    //                         }
    //                     }
    //                 });
    //             }
    //             this.changed[aid][field] = {};
    //         }
    //     }

    //     // expired tokens - unset
    //     for (let aid in this.removeTokens) {
    //         let collection = 'push_' + aid;
    //         if (!updates[collection]) {
    //             updates[collection] = [];
    //         }
    //         for (let field in this.removeTokens[aid]) {
    //             if (this.removeTokens[aid][field].length) {
    //                 updates[collection].push({
    //                     updateMany: {
    //                         filter: {_id: {$in: this.removeTokens[aid][field]}},
    //                         update: {
    //                             $unset: {
    //                                 ['tk.' + field]: 1
    //                             }
    //                         }
    //                     }
    //                 });
    //                 this.removeTokens[aid][field] = [];
    //             }
    //         }
    //     }

    //     // sent & processed counters
    //     for (let mid in this.processed) {
    //         if (this.processed[mid]) {
    //             promises.push(this.messages[mid].updateAtomically({
    //                 $inc: {
    //                     'results.processed': this.processed[mid],
    //                     'results.sent': this.sent[mid],
    //                 }
    //             }));
    //             this.processed[mid] = 0;
    //             this.sent[mid] = 0;
    //         }
    //     }

    //     // error details
    //     for (let mid in this.errors) {
    //         let inc = {};
    //         for (let p in this.errors[mid]) {
    //             for (let k in this.errors[mid][p]) {
    //                 inc[`results.errors.${p}+${k.replace(/\./g, ' ')}`] = this.errors[mid][p][k];
    //             }
    //             this.errors[mid][p] = {};
    //         }
    //         // eslint-disable-next-line no-unused-vars
    //         for (let _ignoered in inc) {
    //             promises.push(this.messages[mid].updateAtomically({
    //                 $inc: inc
    //             }));
    //             break;
    //         }
    //     }

    //     this.fatalErrors = {}; // {mid: []}
    //     for (let mid in this.fatalErrors) {
    //         this.fatalErrors[mid].forEach(e => {
    //             this.messages[mid].results.pushError(e.messageError());
    //         });
    //     }

    //     let now = Date.now();
    //     for (let aid in this.sentUsers) {
    //         let collection = 'push_' + aid;
    //         if (!updates[collection]) {
    //             updates[collection] = [];
    //         }
    //         for (let mid in this.sentUsers[aid]) {
    //             this.sentUsers[aid][mid].forEach(uid => {
    //                 updates[collection].push({
    //                     updateOne: {
    //                         filter: {_id: uid},
    //                         update: {
    //                             $set: {
    //                                 ['msgs.' + mid]: now
    //                             }
    //                         }
    //                     }
    //                 });
    //             });
    //             this.sentUsers[aid][mid] = [];
    //         }
    //     }

    //     for (let c in updates) {
    //         if (updates[c].length) {
    //             this.log.d('Running batch of %d updates for %s', updates[c].length, c);
    //             promises.push(this.db.collection(c).bulkWrite(updates[c]));
    //         }
    //     }

    //     if (this.toDelete.length) {
    //         promises.push(this.db.collection('push').deleteMany({_id: {$in: this.toDelete.map(this.db.ObjectID)}}));
    //         this.toDelete = [];
    //     }

    //     if (promises.length) {
    //         Promise.all(promises).then(() => {
    //             this.log.d('Done flushing');
    //             callback && callback();
    //         }, err => {
    //             this.log.e('Error while flushing', err);
    //             throw PushError.deserialize(err);
    //         });
    //     }
    //     else {
    //         this.log.d('Nothing to flush');
    //         callback && callback();
    //     }
    // }

    // /**
    //  * Transform's transform impementation
    //  * 
    //  * @param {object[]} chunk array of results [push id|[push id, new token]]
    //  * @param {string} encoding ignored
    //  * @param {function} callback callback
    //  */
    // _transform(chunk, encoding, callback) {
    //     let {frame, payload: results} = chunk;
    //     if (frame & FRAME.CMD) {
    //         if (frame & FRAME.FLUSH) {
    //             this.do_flush(() => {
    //                 this.push(results);
    //                 callback();
    //             });
    //         }
    //         else {
    //             callback();
    //         }
    //     }
    //     else if (frame & FRAME.RESULTS) {
    //         if (frame & FRAME.ERROR) {
    //             [results.affected, results.left].forEach(arr => {
    //                 if (results.type & (ERROR.DATA_TOKEN_EXPIRED | ERROR.DATA_TOKEN_INVALID)) {
    //                     arr.forEach(id => {
    //                         let {a, p, f} = this.data.pushes[id];
    //                         this.removeTokens[a][p + f].push(id);
    //                     });
    //                 }
    //                 arr.forEach(id => {
    //                     let {p, m} = this.data.pushes[id];
    //                     this.processed[m]++;
    //                     this.errors[m][p][results.message] = (this.errors[m][p][results.message] || 0) + 1;
    //                     delete this.data.pushes[id];
    //                     this.toDelete.push(id);
    //                 });
    //                 this.count += arr.length;
    //             });

    //             if (this.count > this.limit) {
    //                 this.do_flush(callback);
    //             }
    //             else {
    //                 callback();
    //             }
    //         }
    //         else {
    //             this.log.d('Processing %d results', results.length);
    //             results.forEach(res => {
    //                 let id, token;
    //                 if (typeof res === 'string') {
    //                     id = res;
    //                 }
    //                 else {
    //                     id = res[0];
    //                     token = res[1];
    //                 }

    //                 let p = this.data.pushes[id];
    //                 if (!p) { // 2 or more resultors on one pool
    //                     return;
    //                 }

    //                 this.toDelete.push(id);
    //                 delete this.data.pushes[id];

    //                 this.sent[p.m] += 1;
    //                 this.processed[p.m] += 1;
    //                 this.sentUsers[p.a] = true;

    //                 if (token) {
    //                     this.changed[p.a][p.p + p.f][p.uid] = token;
    //                 }
    //             });

    //             if (++this.count > this.limit) {
    //                 this.do_flush(callback);
    //             }
    //             else {
    //                 this.log.d('Done processing %d results', results.length);
    //                 callback();
    //             }
    //         }

    //         // // in case no more data is expected, we can safely close the stream
    //         // if (this.check()) {
    //         //     for (let _ in this.state.pushes) {
    //         //         return;
    //         //     }
    //         //     this.do_flush(() => this.end());
    //         // }
    //     }
    //     else if (frame & FRAME.ERROR) {
    //         [results.affected, results.left].forEach(arr => {
    //             let error = results.messageError();
    //             arr.forEach(id => {
    //                 let {p, m} = this.data.pushes[id];
    //                 this.processed[m]++;
    //                 this.errors[m][p][results.message] = (this.errors[m][p][results.message] || 0) + 1;
    //                 this.fatalErrors[m].push(error);
    //                 delete this.data.pushes[id];
    //                 this.toDelete.push(id);
    //             });
    //             this.count += arr.length;
    //         });
    //     }
    // }

    /**
     * Transform's flush impementation
     * 
     * @param {function} callback callback
     */
    _flush(callback) {
        this.log.d('_flush');
        this.do_flush(err => {
            if (err) {
                callback(err);
            }
            else {
                this.syn(callback);
            }
        });
    }

}

module.exports = { Resultor };