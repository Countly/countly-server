'use strict';

var EventEmitter = require('events'),
    cluster = require('cluster'),
    log = require('../../utils/log.js')('jobs:ipc');

var CMD = {
    RUN: 'job:run',
    ABORT: 'job:abort',
    PAUSE: 'job:pause',
    STATUS: 'job:status',
    CRASH: 'job:crash'
};

/**
Common message structures:
{
    _id: 'job id',
    cmd: 'job:run',
    from: 1238,     from pid
    to: 3820,       to pid

    ... other job fields
}

{
    _id: 'job id',
    cmd: 'job:status',
    from: 1238,     from pid
    to: 3820,       to pid

    status: 1,
    part: 0.5,
    bookmark: 'some progress bookmark',
    ... other job fields
}
*/

/**
 * Just a set classes that incapsulate IPC stuff and pass through only messages for specific _id (IdChannel)
 * or with some pid (PidFromChannel / PidToChannel).
 */

/** Class encapsulating channel **/
class Channel extends EventEmitter {
    /**
    * Constructor accepting check function
    * @param {function} check - to check/filter message for specific channel
    **/
    constructor(check) {
        super();
        this.check = check;
    }

    /**
    * Add worker
    * @param {object} worker - worker to add to channel
    * @returns {object} self
    **/
    attach(worker) {
        this.worker = worker || process;
        this.onMessageListener = (m) => {
            // log.d('[%d]: Got message in Channel in %d: %j', process.pid, this.worker.pid, m, this._id);
            if (this.check(m)) {
                // log.d('[%d]: Channeling %j', process.pid, m);
                this.emit(m.cmd, m.data);
            }
        };
        this.worker.setMaxListeners(this.worker.getMaxListeners() + 1);
        this.worker.on('message', this.onMessageListener);
        this.worker.on('exit', this.emit.bind(this, 'exit'));
        this.worker.on('error', this.emit.bind(this, 'crash'));
        return this;
    }

    /**
    * Removing worker from channel
    **/
    remove() {
        log.d('[%d]: Removing Channel for %s', process.pid, this._id);
        try {
            if (this.onMessageListener) {
                this.worker.removeListener('message', this.onMessageListener);
                this.worker.setMaxListeners(this.worker.getMaxListeners() - 1);
                this.onMessageListener = undefined;
            }
        }
        catch (e) {
            console.log('+++++++++++++++++++++++++++++', e);
        }
    }

    /**
    * Send message to this channel
    * @param {string} _id - id of channel
    * @param {object} cmd - command
    * @param {object} data - additional data
    **/
    send(_id, cmd, data) {
        // log.d('Sending message from Channel in %d: %j', process.pid, {_id: _id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
        this.worker.send({
            _id: _id,
            cmd: cmd,
            from: process.pid,
            to: this.worker.pid,
            data: data
        });
    }
}

/** Class for channel by id **/
class IdChannel extends Channel {
    /**
    * Constructor accepting id of channel
    * @param {string} _id - id of channel
    **/
    constructor(_id) {
        super(m => m._id === _id);
        this._id = _id;
        log.d('Started IdChannel in %d', process.pid, _id);
    }

    /**
    * Send message to this channel
    * @param {object} cmd - command
    * @param {object} data - additional data
    **/
    send(cmd, data) {
        this.worker.send({
            _id: this._id,
            cmd: cmd,
            from: process.pid,
            to: this.worker.pid,
            data: data
        });
    }
}

/** Class for channel by start with id (sub channels) **/
class IdStartsWithChannel extends Channel {
    /**
    * Constructor accepting id of channel
    * @param {string} _id - id of channel
    **/
    constructor(_id) {
        super(m => m._id.indexOf(_id) === 0);
        log.d('Started IdStartsWithChannel in %d', process.pid, _id);
    }
}



/** Countly master process, just pass through messages to specific pid in `to` field of message */
class PassThrough {
    /** Constructor */
    constructor() {
        log.i('Started PassThrough in %d', process.pid);
        this.workers = {}; // map of pid: worker
    }

    /**
    * Start passing messages
    * @param {object} jobsWorker - job
    **/
    start(jobsWorker) {
        this.jobsWorker = jobsWorker;
        this.jobsWorker.on('message', this.pass.bind(this));

        cluster.on('online', (worker) => {
            log.i('Worker started: %d', worker.process.pid);
            this.workers[worker.process.pid] = worker;
            worker.on('message', (m) => {
                this.pass(m);
            });
        });

        cluster.on('exit', (worker) => {
            if (worker.process.pid in this.workers) {
                log.e('Worker crashed: %d', worker.process.pid);
                delete this.workers[worker.process.pid];
                jobsWorker.send({
                    cmd: CMD.CRASH,
                    from: worker.process.pid,
                    to: jobsWorker.pid
                });
            }
        });

        process.on('uncaughtException', (err) => {
            log.e('uncaughtException on process %d', process.pid, err.stack);
        });

        log.i('Attached to cluster in PassThrough %d', process.pid);
    }

    /**
    * Pass message
    * @param {object} m - message
    **/
    pass(m) {
        // log.d('Got message in PassThrough: %j', m);
        if (m.to && m.to in this.workers) {
            // log.d('Passing through message from %j to %j', m.from, m.to);
            this.workers[m.to].send(m);
        }
        else if (m.to && m.to === this.jobsWorker.pid) {
            // log.d('Passing through message from %j to jobs %j', m.from, m.to);
            this.jobsWorker.send(m);
        }
        else if (!m.to && m.from) {
            let pids = Object.keys(this.workers);
            var idx = Math.floor(Math.random() * pids.length);
            m.to = pids[idx];
            // log.d('Passing through message from %d to randomly selected %d (out of %d)', m.from, m.to, pids.length);
            this.workers[m.to].send(m);
        }
    }
}

/** Base class for promise-based IPC */
class CentralSuper {
    /**
     * Constructor
     *
     * @param  {string} name A parameter name used to uniquely identify a message for this Central
     * @param  {function} handler function to process incoming messages
     *                            return value of this function is sent back to the worker as a reply
     */
    constructor(name, handler) {
        this.name = name;
        this.handler = handler;
    }

    /**
     * Returns whether the message is for this channel instance
     * @param  {Object}  m message
     * @return {Boolean}   true if for this channel
     */
    isForMe(m) {
        return this.name in m;
    }

    /**
     * Create a message out of supplied params
     * @param  {Any} data  data to send
     * @param  {Long} date  date of the message
     * @param  {Boolean} reply whether this message is a reply
     * @param  {String} error if any
     * @return {Object}       message object
     */
    fromMe(data, date, reply, error) {
        return {[this.name]: data, date, reply, error};
    }
}

/** Countly master process, just pass through messages to specific pid in `to` field of message */
class CentralMaster extends CentralSuper {

    /**
     * Start handling forks and incoming IPC messages
     * @param {Function} f function to all with every new worker
     **/
    attach(f) {
        this.workers = {}; // map of pid: worker
        this.listeners = {}; // map of pid: listener
        cluster.on('online', (worker) => {
            log.i('New worker %d is online', worker.process.pid);
            this.workers[worker.process.pid] = worker;
            worker.on('message', this.listeners[worker.process.pid] = m => {
                if (this.isForMe(m)) {
                    log.d('[%d]: Got message in CentralMaster from %d: %j', process.pid, worker.process.pid, m);
                    let data = m[this.name];

                    Promise.resolve(this.handler(data, m.reply, worker.process.pid)).then(res => {
                        // log.d('about to send a reply to', worker.process.pid, this.fromMe(res, m.date, true));
                        worker.send(this.fromMe(res, m.date, true));
                    }, err => {
                        worker.send(this.fromMe(null, m.date, true, err.message || err.code || JSON.stringify(err)));
                    });
                }
            });
            if (f) {
                f(worker, worker.process.pid);
            }
        });

        cluster.on('exit', (worker) => {
            if (worker.process.pid in this.workers) {
                log.e('Worker exited: %d', worker.process.pid);
                delete this.workers[worker.process.pid];
                if (f) {
                    f(null, worker.process.pid);
                }
            }
        });

        log.i('Attached to cluster in Central %d', process.pid);
    }

    /**
     * Detach IPC request listener
     */
    detach() {
        Object.keys(this.workers).forEach(pid => {
            this.workers[pid].off('message', this.listeners[pid]);
            delete this.workers[pid];
            delete this.listeners[pid];
        });
    }

    /**
     * Send data to a single worker or multicast to all of them.
     *
     * @param  {Number|String} pid  worker process id
     * @param  {Any} data           data to send
     */
    send(pid, data) {
        let msg = this.fromMe(data, Date.now());
        if (!pid) {
            Object.values(this.workers).forEach(worker => {
                worker.send(msg);
            });
        }
        else if (pid < 0) {
            Object.keys(this.workers).filter(p => +p !== -pid).forEach(p => {
                this.workers[p].send(msg);
            });
        }
        else {
            this.workers[pid].send(msg);
        }
    }
}

/** Countly master process, just pass through messages to specific pid in `to` field of message */
class CentralWorker extends CentralSuper {
    /**
     * Constructor
     *
     * @param  {string} name A parameter name used to uniquely identify a message for this Central
     * @param  {function} handler function to process incoming messages
     *                            return value of this function is sent back to the master as a reply
     * @param  {integer} readTimeout how much ms to wait until rejecting
     */
    constructor(name, handler, readTimeout = 15000) {
        super(name, handler);
        this.readTimeout = readTimeout;
        this.promises = {};
    }

    /**
    * Start listening to IPC events
    * @returns {object} self
    **/
    attach() {
        this.onMessageListener = m => {
            log.d('[%d]: Got message in CentralWorker: %j', process.pid, m);
            if (this.isForMe(m)) {
                // log.d('handling', m);

                let data = m[this.name],
                    {resolve, reject} = m.reply ? this.promises[m.date] || {} : {};

                if (m.error) {
                    if (reject) {
                        // log.d('Rejecting a reply: %j / %j / %j', m.date, m.error, data);
                        reject(m.error);
                    }
                    else {
                        log.e('No promise for errored request: %j / %j / %j', m.date, m.error, data);
                    }
                }
                else if (m.reply) {
                    if (resolve) {
                        // log.d('Resolving a reply: %j / %j', m.date, data);
                        resolve(data);
                    }
                    else {
                        log.e('No promise for reply request: %j / %j', m, data);
                    }
                }
                else {
                    this.handler(data, m.reply);
                }

                delete this.promises[m.date];
            }
        };
        process.on('message', this.onMessageListener);
        return this;
    }

    /**
     * Detach IPC request listener
     */
    detach() {
        process.off('message', this.onMessageListener);
    }

    /**
    * Send message to the Central
    * @param {any} data - data to send to master process
    **/
    send(data) {
        process.send(this.fromMe(data, this.date()));
    }

    /**
    * Unique frame date generator
    * @param {any} date - date to use
    * @returns {string} packet date with worker pid
    **/
    date(date = Date.now()) {
        let now = `${process.pid}-${date}`,
            i = 0;
        while (this.promises[now]) {
            now = `${process.pid}-${date + ++i}`;
        }
        return now;
    }

    /**
    * Send request to the Central with a promise
    * @param {any} data - data to send to master process
    * @return {Promise} which either resolves to the value returned by Central, or rejects with error from master / timeout from current process
    **/
    request(data) {
        let now = this.date(),
            time,
            promise = new Promise((resolve, reject) => {
                // log.d('adding promise', now, typeof this.promises[now]);
                this.promises[now] = {
                    resolve: function() {
                        clearTimeout(time);
                        resolve.apply(this, arguments);
                    },
                    reject: function() {
                        clearTimeout(time);
                        reject.apply(this, arguments);
                    }
                };
                process.send(this.fromMe(data, now));
                time = setTimeout(() => {
                    delete this.promises[now];
                    reject(`IPC Timeout for ${JSON.stringify(data).substr(0, 100)}`);
                }, this.readTimeout);
            });
        return promise;
    }
}

module.exports.CentralMaster = CentralMaster;
module.exports.CentralWorker = CentralWorker;
module.exports.PassThrough = PassThrough;
module.exports.IdChannel = IdChannel;
module.exports.IdStartsWithChannel = IdStartsWithChannel;