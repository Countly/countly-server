const { SynFlushTransform } = require('./syn'),
    { Message, Creds, pools, FRAME } = require('../../send');

/**
 * Stream responsible for handling sending results:
 * - buffer incoming results
 * - write them to db once in a while
 */
class Connector extends SynFlushTransform {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {MongoClient} db mongo client
     * @param {State} state state shared across the streams
     * @param {int} limit how much discarded ids to keep before flushing to db
     */
    constructor(log, db, state, limit) {
        super(log.sub('connector'), {objectMode: true});
        this.log = log.sub('connector');
        this.db = db;
        this.state = state;
        this.limit = limit;

        // pushe ids we have no idea how to send (no app / credentials / platform)
        this.discardedByAppOrCreds = [];
        this.discardedByMessage = [];
    }

    /**
     * Transform's transform impementation
     * 
     * @param {object} push push object
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    _transform(push, encoding, callback) {
        if (push.frame & FRAME.CMD) {
            this.push(push);
            return;
        }
        this.do_transform(push, encoding, callback);
    }

    /**
     * Actual transform logic (it's not allowed to call _transform() directly)
     * 
     * @param {object} push push object
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    do_transform(push, encoding, callback) {
        let app = this.state.app(push.a),
            message = this.state.message(push.m);

        this.state.pushes[push._id] = push;

        if (app === false) { // app or message is already ignored
            this.discardedByAppOrCreds.push(push._id);
            this.do_flush(callback, true);
            return;
        }
        else if (message === false) { // app or message is already ignored
            this.discardedByMessage.push(push._id);
            this.do_flush(callback, true);
            return;
        }
        else if (!app) { // app is not loaded
            this.state.discardApp(push.a); // only turns to app if there's one or more credentials found
            this.db.collection('apps').findOne(push.a).then(a => {
                if (a && a.plugins && a.plugins.push) {
                    a.creds = a.creds || {};

                    let promises = [];
                    for (let p in a.plugins.push) {
                        let id = a.plugins.push[p]._id;
                        if (id) {
                            this.log.d('Loading credentials %s', id);
                            promises.push(this.db.collection(Creds.collection).findOne(id).then(cred => {
                                if (cred) {
                                    a.creds[p] = cred;
                                }
                                else {
                                    this.log.e('No such credentials %s for app %s (message %s)', a.plugins.push[p]._id, push.a, push.m);
                                    a.creds[p] = false;
                                }
                            }));
                        }
                    }

                    Promise.all(promises).then(() => {
                        if (Object.values(a.creds).filter(c => !!c).length) { // only set app if there's one or more credentials found
                            this.state.setApp(a);
                        }
                        this.do_transform(push, encoding, callback);
                    }, callback);
                }
                else {
                    // app is false already
                    this.do_transform(push, encoding, callback);
                }
            }, callback);
            return;
        }
        else if (!app.creds[push.p]) { // no credentials
            this.discardedByAppOrCreds.push(push._id);
            this.do_flush(callback, true);
        }
        else { // all good with credentials, now let's check messages
            if (!message) {
                let query = Message.filter(new Date());
                query._id = push.m;
                this.db.collection('messages').findOne(query).then(msg => {
                    if (msg) {
                        this.state.setMessage(msg); // only turns to app if there's one or more credentials found
                    }
                    else {
                        this.state.discardMessage(push.m);
                    }
                    this.do_transform(push, encoding, callback);
                }, callback);
            }
            else {
                let pid = pools.id(push.a, push.p, push.f),
                    creds = app.creds[push.p];
                if (pools.has(pid)) { // already connected
                    callback(null, push);
                }
                else { // no connection yet
                    this.log.i('Connecting %s', pid);
                    pools.connect(push.a, push.p, push.f, creds.key, creds.secret, this.state.messages(), this.state.cfg.pool).then(() => {
                        this.log.i('Connected %s', pid);
                        callback(null, push);
                    }, err => {
                        this.log.i('Failed to connect %s', pid, err);
                        this.discardedByAppOrCreds.push(push._id);
                        this.do_flush(callback, true);
                    });
                }
            }
        }
    }

    /**
     * Transform's flush impementation
     * 
     * @param {function} callback callback
     */
    _flush(callback) {
        this.do_flush(callback);
        // this.do_flush(err => {
        //     if (err) {
        //         callback(err);
        //     }
        //     else {
        //         this.syn(callback);
        //     }
        // });
    }

    /**
     * Actual flush logic (it's not allowed to call _flush() directly)
     * 
     * @param {function|undefined} callback callback
     * @param {boolean} ifNeeded true if we only need to flush `discarded` when it's length is over `limit`
     */
    do_flush(callback, ifNeeded) {
        if (ifNeeded && (this.discardedByAppOrCreds.length + this.discardedByMessage.length) < this.limit) {
            if (callback) {
                callback();
            }
            return;
        }

        let creds = {},
            messages = {};

        this.discardedByAppOrCreds.forEach(id => {
            let push = this.state.pushes[id];
            creds[push.m] = (creds[push.m] || 0) + 1;
            delete this.state.pushes[id];
        });

        this.discardedByMessage.forEach(id => {
            let push = this.state.pushes[id];
            messages[push.m] = (messages[push.m] || 0) + 1;
            delete this.state.pushes[id];
        });

        let mids = Object.keys(creds).concat(Object.keys(messages)),
            promises = [];
        mids = mids.filter((mid, i) => mids.indexOf(mid) === i);

        mids.forEach(mid => {
            let q = {$inc: {}};
            if (creds[mid]) {
                q.$inc['result.errors.nocreds'] = creds[mid];
            }
            if (messages[mid]) {
                q.$inc['result.errors.nomsg'] = messages[mid];
            }
            promises.push(this.db.collection('messages').updateOne({_id: this.db.ObjectID(mid)}, q));
        });

        if (this.discardedByAppOrCreds.length || this.discardedByMessage.length) {
            promises.push(this.db.collection('push').deleteMany({_id: {$in: this.discardedByAppOrCreds.concat(this.discardedByMessage).map(this.db.ObjectID)}}));
        }

        Promise.all(promises).then(() => {
            this.discardedByAppOrCreds = [];
            this.discardedByMessage = [];
            if (callback) {
                callback();
            }
        }, callback);
    }
}

module.exports = { Connector };