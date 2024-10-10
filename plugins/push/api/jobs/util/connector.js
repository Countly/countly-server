const { DoFinish } = require('./do_finish'),
    { Message, State, Status, Creds, pools, FRAME, PushError, SendError, ERROR, MAX_RUNS } = require('../../send');

/**
 * Stream responsible for handling sending results:
 * - buffer incoming results
 * - write them to db once in a while
 */
class Connector extends DoFinish {
    /**
     * Constructor
     * 
     * @param {Log} log logger
     * @param {MongoClient} db mongo client
     * @param {State} state state shared across the streams
     */
    constructor(log, db, state) {
        super({objectMode: true, writableHighWaterMark: state.cfg.pool.pushes * 10});
        this.log = log.sub('connector');
        this.db = db;
        this.state = state;
        this.limit = state.cfg.pool.pushes * 10;
        this.connects = [];
        this.resetErrors();
    }

    /**
     * Set app / creds / message errors to initial state
     */
    resetErrors() {
        this.noApp = new SendError('NoApp', ERROR.DATA_COUNTLY);
        this.noCreds = new SendError('NoCredentials', ERROR.DATA_COUNTLY);
        this.noProxyConnection = new SendError('NoProxyConnection', ERROR.CONNECTION_PROXY);
        this.expiredCreds = new SendError('ExpiredCreds', ERROR.CONNECTION_PROVIDER);
        this.tooLateToSend = new SendError('TooLateToSend', ERROR.DATA_COUNTLY);
        this.noMessage = {}; // {mid: [push, push, push, ...]}
        this.noMessageBytes = 0;
    }

    /**
     * Transform's transform impementation
     * 
     * @param {object} push push object
     * @param {string} encoding ignored
     * @param {function} callback callback
     */
    _transform(push, encoding, callback) {
        // this.log.d('in connector transform', FRAME_NAME[push.frame]);
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
        // this.log.d('in connector do_transform', push, FRAME_NAME[push.frame]);
        let app = this.state.app(push.a),
            message = this.state.message(push.m);

        if (!this.state.pushes[push._id]) {
            this.state.pushes[push._id] = push;
            this.state.incSending(push.m);
        }

        if (app === false) { // app or message is already ignored
            this.noApp.addAffected(push._id, 1);
            this.do_flush(callback, true);
            return;
        }
        else if (message === false) { // app or message is already ignored
            if (!this.noMessage[push.m]) {
                this.noMessage[push.m] = [];
            }
            this.noMessage[push.m].push(push);
            this.noMessageBytes++;
            this.state.decSending(push.m);
            delete this.state.pushes[push._id];
            this.do_flush(callback, true);
            return;
        }
        else if (!app) { // app is not loaded
            this.state.discardApp(push.a); // only turns to app if there's one or more credentials found
            this.db.collection('apps').findOne({_id: push.a}).then(a => {
                if (a && a.plugins && a.plugins.push) {
                    a.creds = a.creds || {};

                    let promises = [];
                    for (let p in a.plugins.push) {
                        let id = a.plugins.push[p]._id;
                        if (id) {
                            this.log.d('Loading credentials %s', id);
                            promises.push(Creds.load(id).then(cred => {
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
                        this.state.setApp(a);
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
        else if (!message) {
            let query = Message.filter(new Date(), this.state.cfg.sendAhead);
            query._id = push.m;
            this.db.collection('messages').findOne(query).then(msg => {
                if (msg) {
                    this.log.d('sending message %s, %j', push.m, msg);
                    this.state.setMessage(msg); // only turns to app if there's one or more credentials found
                }
                else {
                    this.log.e('message not found', push.m);
                    this.state.discardMessage(push.m);
                }
                this.do_transform(push, encoding, callback);
            }, callback);
        }
        else if (app.creds[push.p] === null) { // no connection
            if (this.state.cfg.proxy && this.state.cfg.proxy.host && this.state.cfg.proxy.port) {
                this.noProxyConnection.addAffected(push._id, 1);
            }
            else {
                this.expiredCreds.addAffected(push._id, 1);
            }
            this.do_flush(callback, true);
        }
        else if (!app.creds[push.p]) { // no credentials
            this.noCreds.addAffected(push._id, 1);
            this.do_flush(callback, true);
        }
        else { // all good with credentials, now let's check messages
            if (!message.is(State.Streaming)) {
                let date = new Date(),
                    update = {$set: {status: Status.Sending, 'info.startedLast': date}, $bit: {state: {or: State.Streaming}}},
                    run = message.result.startRun(new Date());
                if (!message.info.started) {
                    update.$set['info.started'] = date;
                }
                if (message.result.lastRuns.length === MAX_RUNS) {
                    update.$set['result.lastRuns'] = message.result.lastRuns;
                }
                else {
                    update.$push = {'result.lastRuns': run};
                }
                message.updateAtomically({_id: message._id, state: message.state}, update)
                    .then(ok => {
                        if (ok) {
                            this.do_transform(push, encoding, callback);
                        }
                        else {
                            callback(new PushError('Failed to mark message as streaming'));
                        }
                    }, callback);
            }
            else if (push._id.getTimestamp().getTime() < Date.now() - 3600000) {
                this.tooLateToSend.addAffected(push._id, 1);
                this.do_flush(callback, true);
                return;
            }
            else {
                let creds = app.creds[push.p],
                    pid = pools.id(creds.hash, push.p, push.f);
                if (pools.has(pid)) { // already connected
                    this.log.d('pgc', push._id); // Push Goes to Connection
                    callback(null, push);
                }
                else if (pools.isFull) { // no connection yet and we can't create it, just ignore push so it could be sent next time
                    delete this.state.pushes[push._id];
                    this.state.decSending(push.m);
                    callback();
                }
                else { // no connection yet
                    this.log.i('Connecting %s', pid);
                    let connect = pools.connect(push.a, push.p, push.f, creds, this.state, this.state.cfg).then(valid => {
                        if (valid) {
                            this.log.i('Connected %s', pid);
                        }
                        else {
                            app.creds[push.p] = null;
                        }
                        this.connects = this.connects.filter(c => c !== connect);
                        callback(null, push);
                    }, err => {
                        this.log.i('Failed to connect %s', pid, err);
                        app.creds[push.p] = null;
                        this.connects = this.connects.filter(c => c !== connect);
                        this.do_transform(push, encoding, callback);
                        // this.discardedByAppOrCreds.push(push._id);
                        // this.do_flush(callback, true);
                    });
                    this.connects.push(connect);
                }
            }
        }
    }

    /**
     * Actual flush logic (it's not allowed to call _flush() directly)
     * 
     * @param {function|undefined} callback callback
     * @param {boolean} ifNeeded true if we only need to flush `discarded` when it's length is over `limit`
     */
    do_flush(callback, ifNeeded) {
        let total = this.noMessageBytes + this.noApp.affectedBytes + this.noCreds.affectedBytes + this.noProxyConnection.affectedBytes + this.expiredCreds.affectedBytes + this.tooLateToSend.affectedBytes;
        // this.log.d('in connector do_flush, total', total);

        if (ifNeeded && !this.flushed && (!total || total < this.limit)) {
            if (callback) {
                callback();
            }
            return;
        }

        if (this.noMessageBytes) {
            Promise.all(Object.keys(this.noMessage).map(mid => {
                let pushes = this.noMessage[mid],
                    inc = {};
                delete this.noMessage[mid];
                this.noMessageBytes -= pushes.length;
                pushes.forEach(push => {
                    let la = push.pr.la || 'default';

                    if (inc.processed) {
                        inc.processed++;
                        inc.errored++;
                        inc['result.errors.Rejected']++;
                    }
                    else {
                        inc.processed = 1;
                        inc.errored = 1;
                        inc['result.errors.Rejected'] = 1;
                    }
                    if (inc[`result.subs.${push.p}.processed`]) {
                        inc[`result.subs.${push.p}.processed`]++;
                        inc[`result.subs.${push.p}.errored`]++;
                        inc[`result.subs.${push.p}.errors.Rejected`]++;
                    }
                    else {
                        inc[`result.subs.${push.p}.processed`] = 1;
                        inc[`result.subs.${push.p}.errored`] = 1;
                        inc[`result.subs.${push.p}.errors.Rejected`] = 1;
                    }
                    if (inc[`result.subs.${push.p}.subs.${la}.processed`]) {
                        inc[`result.subs.${push.p}.subs.${la}.processed`]++;
                        inc[`result.subs.${push.p}.subs.${la}.errored`]++;
                        inc[`result.subs.${push.p}.subs.${la}.errors.Rejected`]++;
                    }
                    else {
                        inc[`result.subs.${push.p}.subs.${la}.processed`] = 1;
                        inc[`result.subs.${push.p}.subs.${la}.errored`] = 1;
                        inc[`result.subs.${push.p}.subs.${la}.errors.Rejected`] = 1;
                    }
                });
                this.log.w('Message %s doesn\'t exist or is in inactive state, ignoring %d pushes', mid, pushes.length);
                return Promise.all([
                    this.db.collection('messages').updateOne({_id: this.db.ObjectID(mid)}, {$inc: inc}),
                    this.db.collection('push').deleteMany({_id: {$in: pushes.map(p => p._id)}}),
                ]);
            })).then(() => this.do_flush(callback, ifNeeded), err => {
                this.log.e('Error while setting NoMessage error', err);
                this.do_flush(callback, ifNeeded);
            });
            return;
        }

        if (this.noApp.hasAffected) {
            this.push({frame: FRAME.RESULTS | FRAME.ERROR, payload: this.noApp});
        }

        if (this.noCreds.hasAffected) {
            this.push({frame: FRAME.RESULTS | FRAME.ERROR, payload: this.noCreds});
        }

        if (this.noProxyConnection.hasAffected) {
            this.push({frame: FRAME.RESULTS | FRAME.ERROR, payload: this.noProxyConnection});
        }

        if (this.expiredCreds.hasAffected) {
            this.push({frame: FRAME.RESULTS | FRAME.ERROR, payload: this.expiredCreds});
        }

        if (this.tooLateToSend.hasAffected) {
            this.push({frame: FRAME.RESULTS | FRAME.ERROR, payload: this.tooLateToSend});
        }

        this.resetErrors();

        callback();

        // this.log.d('do_flush proceed');
        // let updates = {};

        // this.discardedByAppOrCreds.forEach(id => {
        //     let push = this.state.pushes[id],
        //         p = push.p,
        //         la = push.pr.la,
        //         inc = updates[push.m] ? updates[push.m].$inc : (updates[push.m] = {$inc: {}}).$inc;
        //     inc['result.processed'] = (inc['result.processed'] || 0) + 1;
        //     inc['result.errored'] = (inc['result.errored'] || 0) + 1;
        //     inc['result.errors.NoCredentials'] = (inc['result.errors.NoCredentials'] || 0) + 1;
        //     inc[`result.subs.${p}.processed`] = (inc[`result.subs.${p}.processed`] || 0) + 1;
        //     inc[`result.subs.${p}.errored`] = (inc[`result.subs.${p}.errored`] || 0) + 1;
        //     inc[`result.subs.${p}.errors.NoCredentials`] = (inc[`result.subs.${p}.errors.NoCredentials`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.processed`] = (inc[`result.subs.${p}.subs.${la}.processed`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.errored`] = (inc[`result.subs.${p}.subs.${la}.errored`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.errors.NoCredentials`] = (inc[`result.subs.${p}.subs.${la}.errors.NoCredentials`] || 0) + 1;
        // });

        // this.log.d('flushing', this.discardedByMessage);
        // this.discardedByMessage.forEach(id => {
        //     let push = this.state.pushes[id],
        //         p = push.p,
        //         la = push.pr.la,
        //         inc = updates[push.m] ? updates[push.m].$inc : (updates[push.m] = {$inc: {}}).$inc;
        //     inc['result.processed'] = (inc['result.processed'] || 0) + 1;
        //     inc['result.errored'] = (inc['result.errored'] || 0) + 1;
        //     inc['result.errors.NoMessage'] = (inc['result.errors.NoMessage'] || 0) + 1;
        //     inc[`result.subs.${p}.processed`] = (inc[`result.subs.${p}.processed`] || 0) + 1;
        //     inc[`result.subs.${p}.errored`] = (inc[`result.subs.${p}.errored`] || 0) + 1;
        //     inc[`result.subs.${p}.errors.NoMessage`] = (inc[`result.subs.${p}.errors.NoMessage`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.processed`] = (inc[`result.subs.${p}.subs.${la}.processed`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.errored`] = (inc[`result.subs.${p}.subs.${la}.errored`] || 0) + 1;
        //     inc[`result.subs.${p}.subs.${la}.errors.NoMessage`] = (inc[`result.subs.${p}.subs.${la}.errors.NoMessage`] || 0) + 1;
        // });

        // let ids = this.discardedByAppOrCreds.concat(this.discardedByMessage).map(this.db.ObjectID);
        // this.discardedByAppOrCreds = [];
        // this.discardedByMessage = [];

        // this.db.collection('push').deleteMany({_id: {$in: ids}}, err => {
        //     if (err) {
        //         this.log.e('Error while clearing queue for %j', ids, err);
        //     }
        // });

        // // we have to use fresh messages as they've been updated in Resultor, we only add two errors above (NoMessage, NoCredentials) in this class & update status for all messages
        // Promise.all(Object.keys(updates).map(mid => this.db.collection('messages').updateOne({_id: this.db.ObjectID(mid)}, updates[mid])))
        //     .then(async() => {
        //         let mids = this.state.messages().map(m => m.id).concat(Object.keys(updates));
        //         mids = mids.filter((mid, i) => mids.indexOf(mid) === i);

        //         await new Promise(res => setTimeout(res, 5000));
        //         let messages = await Message.findMany({_id: {$in: mids.map(this.db.ObjectID)}});
        //         for (let m of messages) {
        //             console.log('in connector', m.id, m.result.json);
        //             let state, status, error;
        //             if (m.triggerAutoOrApi()) {
        //                 if (m.result.total === m.result.errored) {
        //                     state = State.Error | State.Done;
        //                     status = Status.Stopped;
        //                     error = 'Failed to send all notifications';
        //                 }
        //                 else {
        //                     state = m.state & ~State.Streaming;
        //                     status = Status.Scheduled;
        //                 }
        //             }
        //             else {
        //                 if (m.result.total === m.result.errored) {
        //                     state = State.Error | State.Done;
        //                     status = Status.Failed;
        //                     error = 'Failed to send all notifications';
        //                 }
        //                 else if (m.result.total === m.result.processed) {
        //                     state = State.Done;
        //                     status = Status.Sent;
        //                 }
        //                 else {
        //                     state = m.state & ~State.Streaming;
        //                     status = Status.Scheduled;
        //                 }
        //             }

        //             let update = {state, status};
        //             if (error) {
        //                 update['result.error'] = new SendError(error, ERROR.EXCEPTION).serialize();
        //             }
        //             this.log.i('Message %s results: %s [%d] (%s)', m.id, status, state, error);
        //             await this.db.collection('messages').updateOne({_id: m._id}, {$set: {state, status}});
        //         }
        //     })
        //     .then(() => callback && callback(), err => callback(err));
    }

    /**
     * Flush & release resources
     * 
     * @param {function} callback callback function
     */
    do_final(callback) {
        Promise.all(this.connects).then(() => callback(), () => callback());
    }


}

module.exports = { Connector };