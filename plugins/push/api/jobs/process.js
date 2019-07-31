/* jshint ignore:start */

const J = require('../../../../api/parts/jobs/job.js'),
    R = require('../../../../api/parts/jobs/retry.js'),
    Resource = require('../parts/res.js'),
    C = require('../parts/credentials.js'),
    Loader = require('../parts/store.js').Loader,
    N = require('../parts/note.js');

const FORK_WHEN_MORE_THAN = 100000,
    FORK_MAX = 5,
    SEND_AHEAD = 1 * 60000,
    DROP_BEFORE = 3600000,
    DROP_BEFORE_EVENTS = 120000,
    BATCH = 50000;
/** proces jo class */
// for tests-api-multi-pers.js
// const FORK_WHEN_MORE_THAN = 3,
//     FORK_MAX = 3,
//     SEND_AHEAD = 5 * 60000,
//     BATCH = 3;

/** Class for push processing jobs **/
class ProcessJob extends J.IPCJob {
    /** class constructr
     * @param {string} name - name
     * @param {object} data - data
     */
    constructor(name, data) {
        super(name, data);
        if (this.isFork) {
            this.log = require('../../../../api/utils/log.js')('job:push:process/' + process.pid + '/' + this.data.fork + '/' + this._id);
        }
        else {
            this.log = require('../../../../api/utils/log.js')('job:push:process/' + process.pid + '/-/' + this._id);
        }
        this.log.d('initializing ProcessJob with %j & %j', name, data);
    }

    /** gets cid
     * @returns {string} cid
     */
    get cid() {
        return this.data.cid;
    }

    /** gets aid
     * @returns {string} aid
     */
    get aid() {
        return this.data.aid;
    }

    /** gets data.field
     * @returns {object} data.field
     */
    get field() {
        return this.data.field;
    }

    /** gets platform
     * @returns {string} data.field.substr(0, 1)
     */
    get platform() {
        return this.data.field.substr(0, 1);
    }

    /** checks if is fork
     * @returns {boolean} true - if fork
     */
    get isFork() {
        return !!this.data.fork;
    }

    /** prepares job
     * @param {object} manager - manager
     * @param {object} db - db connection
     * @returns {Promise} - resolved or rejected
     */
    prepare(manager, db) {
        this.log.d('Loading credentials for %j', this.data);
        this.creds = new C.Credentials(this.data.cid);
        return new Promise((resolve, reject) => {
            this.creds.load(db).then(() => {
                let cid = typeof this.cid === 'string' ? this.cid : this.cid.toString(),
                    aid = typeof this.aid === 'string' ? db.ObjectID(this.aid) : this.aid;
                db.collection('apps').findOne({_id: aid, $or: [{'plugins.push.i._id': cid}, {'plugins.push.a._id': cid}]}, (err, app) => {
                    if (err) {
                        return reject(err);
                    }
                    else if (!app) {
                        return reject('No app or no such credentials');
                    }

                    this.loader = new Loader(this.creds, this.field, db, app);

                    db.collection('plugins').findOne({}, (error, plugins) => {
                        if (error || !plugins) {
                            return reject(error || 'no configs');
                        }

                        this.proxyhost = plugins.push && plugins.push.proxyhost || '';
                        this.proxyport = plugins.push && plugins.push.proxyport || '';
                        this.proxyuser = plugins.push && plugins.push.proxyuser || '';
                        this.proxypass = plugins.push && plugins.push.proxypass || '';

                        resolve();
                    });
                });
            }, async err => {
                this.log.e('Error while preparing process job: %j', err.stack || err);

                let loader = new Loader({_id: this.cid}, this.field, db, {_id: this.aid}),
                    counts = await loader.counts(this.now()),
                    ids = Object.keys(counts).filter(k => k !== 'total'),
                    error = err.message || err.code || JSON.stringify(err).substr(0, 30);

                if (counts.total) {
                    this.log.e('Adding resourceErrors to notes %j', ids);
                    await loader.updateNotes({_id: {$in: ids.map(db.ObjectID)}}, {$set: {error: error}, $push: {'result.resourceErrors': {$each: [{date: this.now(), field: this.field, error: error}], $slice: -5}}});
                }
            });
        });
    }

    /** gets resource name
     * @returns {string} name
     */
    resourceName() {
        return 'process:' + this.cid + ':' + this.field;
    }

    /** creates resource
     * @param {string} _id - id
     * @param {string} name - name
     * @param {object} db - db connection
     * @returns {object} Resource
     */
    createResource(_id, name, db) {
        return new Resource(_id, name, {cid: this.cid, field: this.field, proxyhost: this.proxyhost, proxyport: this.proxyport, proxyuser: this.proxyuser, proxypass: this.proxypass}, db);
    }

    /** gets new retry policy
     * @returns {object} retry policy
     */
    retryPolicy() {
        return new R.IPCRetryPolicy(3);
    }

    /** rescedule
     * @param {number} date - timestamp
     * @returns {Promise} - resolved if updated
     */
    reschedule(date) {
        return this.replaceAfter(date);
    }

    /** fork 
     *  @returns {Promise} promise
     */
    fork() {
        if (!this.maxFork) {
            this.maxFork = 0;
        }
        let data = Object.assign({}, this.data);
        data.fork = ++this.maxFork;
        return ProcessJob.insert(this.db(), {name: this.name, status: 0, data: data, next: Date.now()});
    }

    /** gets current timestamp
     * @returns {number} timestamp
     */
    now() {
        return Date.now();
    }

    /** 
     * @param {object} notes - notes
     * @param {object} msgs - messages
     * @returns {object} m
     */
    compile(notes, msgs) {
        // let pm, pn, pp, po;

        return msgs.map(m => {
            let note = notes[m.n.toString()];
            if (note) {
                m.m = note.compile(this.platform, m);
                // if (pn && pn === note && pp === m.p && po === m.o) {
                //     m.m = pm;
                // } else {
                //     pn = note;
                //     pp = m.p;
                //     po = m.o;
                //     pm = m.m = note.compile(this.platform, m);
                // }
            }
            return m;
        }).filter(m => !!m.m);
    }

    /** finish
     * @param {object} err - error message or object
     */
    async _finish(err) {
        if (err) {
            let counts = await this.loader.counts(Date.now() + SEND_AHEAD, this._id);
            if (counts.total) {
                this.log.w('Not reloaded jobbed counts %j, reloading', counts);
                let notes = await this.loader.notes(Object.keys(counts).filter(k => k !== 'total'));
                await this.handleResults(err, Object.values(notes));
                await this.loader.reload(this._id);
            }
            else {
                counts = await this.loader.counts(Date.now() + SEND_AHEAD);
                if (counts.total) {
                    this.log.w('Not reloaded not-jobbed counts %j, reloading', counts);
                    let notes = await this.loader.notes(Object.keys(counts).filter(k => k !== 'total'));
                    await this.handleResults(err, Object.values(notes));
                }
            }
        }

        return await super._finish(err);
    }

    /** run
     * @param {object} db - db connection
     * @param {function} done - callback function
     */
    async run(db, done) {
        let resourceError, affected;
        try {
            let count = await this.loader.count(this.now() + SEND_AHEAD), recheck = [], sending = new Set();

            if (count === 0) {
                return done();
            }
            else if (this.isFork && count < FORK_WHEN_MORE_THAN) {
                this.log.i('Won\'t run fork since there\'s less than forkable number of tokens');
                return done();
            }


            do {
                let date = this.now() + SEND_AHEAD,
                    discarded = await this.loader.discard(date - SEND_AHEAD - DROP_BEFORE, date - SEND_AHEAD - DROP_BEFORE_EVENTS);

                // some notifications are too late to send
                if (discarded.total) {
                    Object.keys(discarded).filter(k => k !== 'total').forEach(mid => {
                        let n = discarded[mid],
                            l = `Discarding ${n} messages for ${mid}`;
                        this.log.i(l);
                        db.collection('messages').update({_id: db.ObjectID(mid)}, {$inc: {'result.processed': discarded[mid], 'result.errors': discarded[mid], 'result.errorCodes.skiptz': discarded[mid]}}, this.log.logdb(l));
                    });
                }

                // load counts & messages
                let counts = await this.loader.counts(date),
                    notes = await this.loader.notes(Object.keys(counts).filter(k => k !== 'total'));

                this.log.d('Counts: %j', counts);

                // check for aborted or deleted messages, delete notes if needed
                if (!this.isFork) {
                    await Promise.all(Object.values(notes).filter(n => (n.result.status & (N.Status.Aborted | N.Status.Deleted)) > 0).map(note => {
                        let count1 = counts[note._id.toString()];
                        this.log.w('Note %s has been aborted, clearing %d notifications', note._id, count1);
                        return this.loader.abortNote(note._id, count1, this.now(), this.field, (note.result.status & N.Status.Aborted) ? 'Aborted' : 'Deleted');
                    }));
                }

                // load next batch
                let msgs = await this.loader.load(this._id, date, BATCH);

                // no messages left, break from the loop
                if (!msgs.length) {
                    break;
                }

                // mark messages as being sent
                await Promise.all(Object.values(notes).map(json => this.loader.updateNote(json._id, {$addToSet: {jobs: this._id}, $bit: {'result.status': {or: N.Status.Sending}}})));
                Object.values(notes).map(n => n._id.toString()).forEach(id => sending.add(id));

                // send & remove notifications from the collection
                let statuses;
                try {
                    let nts = this.compile(notes, msgs);
                    if (nts.length !== msgs.length) {
                        this.log.e('Some notifications didn\'t compile');
                    }
                    this.log.i('Sending %d', nts.length);
                    [statuses, resourceError] = await this.resource.send(nts);
                    this.log.i('Send of %d returned %d statuses', nts.length, statuses.length);

                    if (this.platform === N.Platform.IOS && statuses && statuses.length) {
                        statuses.forEach(s => {
                            if (s[2]) {
                                try {
                                    s[2] = s[1] === -200 ? undefined : JSON.parse(s[2]).reason;
                                }
                                catch (e) {
                                    this.log.e('Error parsing error from APNS: %j, %j', s[2], e.stack || e);
                                }
                            }
                        });
                    }
                }
                catch (e) {
                    this.log.e('Caught resource error %s', e && e.message || JSON.stringify(e), e.stack);
                    if (Array.isArray(e)) {
                        statuses = e[0];
                        resourceError = e[1];
                    }
                    else {
                        resourceError = e;
                        statuses = [];
                    }
                }

                let acked = await this.loader.ack(statuses.map(s => s[0]));

                // smth bad happened
                if (acked !== statuses.length) {
                    this.log.w('Acked number %d is not equal to number of statuses %d, resource error %j', acked, statuses.length, resourceError);
                }

                // array: <msg id>, <response code>[, <response error>][, <valid token>]
                // [-200,''] - Invalid token (unset)
                // [-200,'','something'] - Invalid token with valid token (replace old with new)
                // [-200,'something'] - Invalid token with error (unset + report error)
                // [200,'something'] - Some error with status 200 (don't report error)
                // [200] - Success

                let sent = {}, // {mid: 1}
                    processed = {}, // {mid: 2}
                    reset = {}, // {appid: [uid, value?]}
                    msgincs = {}, // {appid: {mid: [uid1, uid2]}}
                    errorsInc = {}; // {mid: {'result.errorCodes.400+BadToken': 123}}

                statuses.forEach((s, i) => {
                    let msg = msgs[i],
                        [_id, code, error, token] = s;

                    if (msg._id !== _id) {
                        msg = msgs.filter(m => m._id === _id)[0];
                        if (!msg) {
                            this.log.e('Didn\'t find the message with id %j', _id);
                            return;
                        }
                    }

                    let uid = msg.u,
                        mid = msg.n.toString(),
                        note = notes[mid];

                    if (!processed[mid]) {
                        processed[mid] = 0;
                    }
                    processed[mid]++;

                    if (code === 200 || (code === -200 && token)) {
                        if (!sent[mid]) {
                            sent[mid] = 0;
                        }
                        sent[mid]++;

                        note.apps.forEach(appid => {
                            let aid = appid.toString();
                            if (!msgincs[aid]) {
                                msgincs[aid] = {};
                            }
                            if (!msgincs[aid][mid]) {
                                msgincs[aid][mid] = [];
                            }
                            msgincs[aid][mid].push(uid);
                        });
                    }
                    if (code === -200) {
                        note.apps.forEach(appid => {
                            let aid = appid.toString();
                            if (!reset[aid]) {
                                reset[aid] = [];
                            }
                            reset[aid].push([uid, token]);
                        });
                    }
                    if (error) {
                        if (!errorsInc[mid]) {
                            errorsInc[mid] = {};
                        }
                        let key = `result.errorCodes.${this.creds.platform}${Math.abs(code)}` + (error ? '+' + error : '');
                        errorsInc[mid][key] = (errorsInc[mid][key] || 0) + 1;
                        key = 'result.errors';
                        errorsInc[mid][key] = (errorsInc[mid][key] || 0) + 1;
                    }
                });

                // smth bad happened
                if (Object.values(processed).reduce((a, b) => a + b, 0) !== msgs.length) {
                    this.log.w('Got %d statuses while %d is expected', Object.values(processed).reduce((a, b) => a + b, 0), msgs.length);
                }

                // update messages with processed / sent / errors
                let updates = Object.values(notes).map(note => {
                    let mid = note._id.toString();

                    // no such message in statuses, but we marked it as being sent, unmark it
                    if (!processed[mid]) {
                        return this.loader.updateNote(mid, {$bit: {'result.status': {and: ~N.Status.Sending}}});
                        // return this.loader.updateNote(mid, {$bit: {'result.status': {and: ~N.Status.Sending, or: N.Status.Error}}});
                    }

                    let update = {$inc: {'result.processed': processed[mid]}, $bit: {'result.status': {or: N.Status.Success}}},
                        errors = errorsInc[mid];

                    if (sent[mid]) {
                        update.$inc['result.sent'] = sent[mid];
                        this.loader.recordSentEvent(note, sent[mid]);
                    }

                    this.log.i('Message %s total %d, processed %d, done in this batch %d', mid, note.result.total, note.result.processed, processed[mid]);
                    if (note.result.total === note.result.processed + processed[mid]) {
                        if (note.tx || note.auto) {
                            update.$bit['result.status'].and = ~N.Status.Sending;
                            update.$bit['result.status'].or = N.Status.Success;
                        }
                        else {
                            update.$bit['result.status'].and = ~(N.Status.Sending | N.Status.Scheduled);
                            update.$bit['result.status'].or = N.Status.Success | N.Status.Done;
                        }
                        if (recheck.indexOf(mid) !== -1) {
                            recheck.splice(recheck.indexOf(mid), 1);
                        }
                    }
                    else {
                        recheck.push(mid);
                    }

                    if (errors) {
                        if (!update.$inc) {
                            update.$inc = {};
                        }
                        Object.keys(errors).forEach(k => {
                            update.$inc[k] = errors[k];
                        });
                    }

                    return this.loader.updateNote(mid, update);
                });

                // update app_users with new tokens, unset bad tokens & push sent messages
                let appids = Array.from(new Set(Object.keys(reset).concat(Object.keys(msgincs))));
                updates = updates.concat(appids.map(appid => {
                    let unsets = reset[appid] ? reset[appid].filter(arr => !arr[1]).map(arr => arr[0]) : [],
                        resets = reset[appid] ? reset[appid].filter(arr => !!arr[1]) : [],
                        msginc = msgincs[appid];

                    return Promise.all([
                        unsets.length ? this.loader.unsetTokens(unsets) : Promise.resolve(),
                        resets.length ? Promise.all(resets.map(arr => this.loader.resetToken(arr[0], arr[1]))) : Promise.resolve(),
                        msginc ? Promise.all(Object.keys(msginc).map(mid => this.loader.pushNote(mid, msginc[mid], this.now()))) : Promise.resolve()
                    ]);
                }));

                // wait for all updates to apply
                await Promise.all(updates);

                if (resourceError) {
                    await this.loader.reload(this._id);
                    this.log.e('Stopping job %s execution because of resource error %s %j', this._id, resourceError && resourceError.message || JSON.stringify(resourceError), resourceError);

                    let left = msgs.filter(msg => statuses.filter(st => st[0] === msg._id).length === 0);

                    affected = Object.values(notes).filter(note => {
                        let id = note._id.toString();
                        for (var i = left.length - 1; i >= 0; i--) {
                            let msg = left[i];
                            if (msg.n.toString() === id) {
                                return true;
                            }
                        }
                    });

                    this.log.e('Following notifications affected: %j', affected.map(n => n._id.toString()));
                    break;
                }

                // get next count
                count = await this.loader.count(this.now());

                // fork if parallel processing needed
                if (!this.maxFork && !resourceError && count > FORK_WHEN_MORE_THAN) {
                    for (let i = 0; i < Math.min(Math.floor(count / FORK_WHEN_MORE_THAN), FORK_MAX); i++) {
                        this.log.i('Forking %d since %d > %d', i, count, FORK_WHEN_MORE_THAN);
                        await this.fork();
                    }
                }

            } while (count);

            // unset sending flag if message doesn't have any jobs running
            await Promise.all([...sending].map(id => new Promise((resolve, reject) => {
                this.loader.updateNote(id, {$pull: {jobs: this._id}}).then(() => {
                    db.collection('messages').findAndModify({_id: db.ObjectID(id), jobs: {$size: 0}}, {}, {$bit: {'result.status': {and: ~N.Status.Sending}}}, {new: true}, (err, doc) => {
                        if (err) {
                            reject(err);
                        }
                        else if (!doc || !doc.ok || !doc.value) {
                            this.log.i('Message %s is still being sent', id);
                        }
                        else {
                            let note = doc.value;
                            if (!note.jobs || !note.jobs.length) {
                                this.log.i('Pulled job %s, paused message %s', this._id, id);
                            }
                        }
                        resolve();
                    });
                }, err => {
                    this.log.w('Error when pulling job from message array: %j', err);
                    resolve();
                });
            })));

            // for forked jobs it's possible that they update notifiations simultaniously and don't mark them as done
            if (recheck.length) {
                await new Promise(resolve => setTimeout(resolve, 10000));

                let notes = await this.loader.notes(recheck);
                await Promise.all(Object.values(notes).map(note => {
                    if (note.result.total === note.result.processed) {
                        let update = {$bit: {'result.status': {}}};
                        if (note.tx || note.auto) {
                            update.$bit['result.status'].and = ~N.Status.Sending;
                            update.$bit['result.status'].or = N.Status.Success;
                        }
                        else {
                            update.$bit['result.status'].and = ~(N.Status.Sending | N.Status.Scheduled);
                            update.$bit['result.status'].or = N.Status.Success | N.Status.Done;
                        }
                        return this.loader.updateNote(note._id, update);
                    }
                    else {
                        return Promise.resolve();
                    }
                }));
            }

            await this.handleResults(resourceError, affected || []);

            // once out of while loop, we're done
            done(resourceError);

        }
        catch (e) {
            this.log.e('Error when running job: %s / %j / %j', e.message || e.code, e, e.stack);
            try {
                await this.loader.reload(this._id);
            }
            catch (err) {
                this.log.e('Error when reloading for %s: %j', this._id, err);
            }
            done(e);
        }
    }

    /** result handling
     * @param {object} resourceError - error object or string 
     * @param {array} affected - list of affected
     * @returns {boolean} true or false
     */
    async handleResults(resourceError, affected) {
        // in case main job ends with resource error, record it in all messages affected
        // when too much same errors gathered in messages within retry period of 30 minutes, don't reschedule this process job
        let skip = false,
            error = resourceError ? resourceError.code || resourceError.message || (typeof resourceError === 'string' && resourceError) || JSON.stringify(resourceError) : undefined,
            date = this.now(),
            max = 0;

        if (this.isFork) {
            return false;
        }

        this.log.d('Handling results of %s: error %j, %d affected', this.id, resourceError, affected.length);

        if (affected && affected.length) {
            await Promise.all(affected.map(note => this.loader.updateNote(note._id, {
                $bit: {'result.status': {or: N.Status.Error}},
                $push: {'result.resourceErrors': {$each: [{date: date, field: this.field, error: error}], $slice: -5}}
                // $addToSet: {'result.resourceErrors': {date: date, field: this.field, error: error}}
            }).then(() => {
                let same = (note.result.resourceErrors || []).filter(r => r.field === this.field && r.error === error),
                    recent = same.filter(r => (this.now() - r.date) < 30 * 60000);

                if (recent.length) {
                    max = Math.max(max, Math.max(...recent.map(r => this.now() - r.date)));
                }

                if (recent.length >= 2) {
                    skip = note._id;
                }
            }, err => {
                this.log.e('Error while updating note %s with resourceError %s: %j', note._id, error, err);
            })));
        }

        if (skip) {
            this.log.w('Won\'t reschedule %s since resourceError repeated 3 times within 30 minutes for %s', this._id, skip);
            let counts = await this.loader.counts(),
                ids = Object.keys(counts).filter(n => n !== 'total');
            if (counts.total) {
                this.log.w('Aborting all notifications from %s collection: %j', this.loader.collectionName, ids);
                await Promise.all(ids.map(id => this.loader.abortNote(id, counts[id], date, this.field, error)));
                // await this.loader.clear();
            }
        }
        else {
            // reschedule job if needed with exponential backoff:
            // first time it's rescheduled for 1 minute later, then for 3 minutes later, then 9, totalling 13 minutes
            // when message is rescheduled from dashboard, this logic can result in big delays between attempts, but no more than 90 minutes
            let next = resourceError ? this.now() + (max ? max * 3 : 1 * 60000) : await this.loader.next();
            if (next) {
                this.log.i('Rescheduling %s to %d', this.cid, next);
                if (resourceError && affected && affected.length) {
                    this.log.i('Resetting nextbatch of %j to %d', affected.map(n => n._id), next);
                    let q = {
                        $and: [
                            {_id: {$in: affected.map(n => n._id)}},
                            {
                                $or: [
                                    {'result.nextbatch': {$exists: false}},
                                    {'result.nextbatch': {$eq: null}},
                                    {'result.nextbatch': {$lt: next}}
                                ]
                            }
                        ]
                    };
                    this.loader.updateNotes(q, {$set: {'result.nextbatch': next}}).catch(this.log.e.bind(this.log, 'Error while updating note nextbatch: %j'));
                }
                await this.reschedule(next);
                return true;
            }
        }
    }
}

module.exports = ProcessJob;