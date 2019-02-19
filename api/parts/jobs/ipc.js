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
        log.d('Got message in PassThrough: %j', m);
        if (m.to && m.to in this.workers) {
            log.d('Passing through message from %j to %j', m.from, m.to);
            this.workers[m.to].send(m);
        }
        else if (m.to && m.to === this.jobsWorker.pid) {
            log.d('Passing through message from %j to jobs %j', m.from, m.to);
            this.jobsWorker.send(m);
        }
        else if (!m.to && m.from) {
            let pids = Object.keys(this.workers);
            var idx = Math.floor(Math.random() * pids.length);
            m.to = pids[idx];
            log.d('Passing through message from %d to randomly selected %d (out of %d)', m.from, m.to, pids.length);
            this.workers[m.to].send(m);
        }
    }
}


/**
 * Make a read flag out of name of Central
 * @param  {string} name name of Central
 * @return {string}      read flag name
 */
const READ = name => '<' + name;

/**
 * Check if message is related to Central with the name passed
 * @param  {string} name name of Central
 * @param  {object} m    message to check
 * @return {boolean}     true if it's a message for this Central
 */
const isCentral = (name, m) => (name in m);

/**
 * Check if message is a read / read reply
 * @param  {string} name name of Central
 * @param  {object} m    message to check
 * @return {boolean}     true if a read
 */
const isRead = (name, m) => (READ(name) in m);

/** Countly master process, just pass through messages to specific pid in `to` field of message */
class Central {
    /** 
     * Constructor
     * 
     * @param  {string} name A parameter name used to uniquely identify a message for this Central
     * @param  {function} handler function to process incoming messages
     *                            return value of this function is sent back to the worker as a reply
     */
    constructor(name, handler) {
        log.i('Started Central in %d', process.pid);
        this.name = name;
        this.handler = handler;
        this.workers = {}; // map of pid: worker
        this.attach();
    }

    /**
    * Start handling messages
    **/
    attach() {
        cluster.on('online', (worker) => {
            log.i('Worker started: %d', worker.process.pid);
            this.workers[worker.process.pid] = worker;
            worker.on('message', m => {
                if (isCentral(this.name, m)) {
                    let result = this.handler(m[this.name], isRead(this.name, m));
                    if (result !== undefined || isRead(this.name, m)) {
                        let reply = {[this.name]: result === undefined ? null : result};

                        if (isRead(this.name, m)) {
                            reply[READ(this.name)] = m[READ(this.name)];
                        }

                        worker.send(reply);
                    }
                }
            });
        });

        cluster.on('exit', (worker) => {
            if (worker.process.pid in this.workers) {
                log.e('Worker exited: %d', worker.process.pid);
                delete this.workers[worker.process.pid];
            }
        });

        log.i('Attached to cluster in Central %d', process.pid);
    }
}

/** Countly master process, just pass through messages to specific pid in `to` field of message */
class CentralWorker extends EventEmitter {
    /** 
     * Constructor
     * 
     * @param  {string} name A parameter name used to uniquely identify a message for this Central
     * @param  {function} handler function to process incoming messages
     *                            return value of this function is sent back to the master as a reply
     * @param  {integer} readTimeout how much ms to wait until rejecting 
     */
    constructor(name, handler, readTimeout = 5000) {
        super();
        this.name = name;
        this.handler = handler;
        this.readTimeout = readTimeout;
        this.promises = {};
        this.attach(process);
    }
    
    isRead (m) {
        return READ(this.name) in m;
    }

    readName(m) {
        return m[READ(this.name)];
    }

    isMine (m) {
        return this.name in m;
    }

    data(m) {
        return m[this.name];
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
            if (this.isRead(m)) {
                if (this.readName(m)) {
                    this.promises[this.readName(m)].forEach(res => res(this.data(m)));
                    this.promises[this.readName(m)] = [];
                } else {
                    log.w('No promises for a read: %j', m);
                } 
            }
            else if (this.isMine(m)) {
                let result = this.handler(this.data(m));
                if (result) {
                    this.send(result);
                }
            }
        };
        this.worker.setMaxListeners(this.worker.getMaxListeners() + 1);
        this.worker.on('message', this.onMessageListener);
        this.worker.on('exit', this.emit.bind(this, 'exit'));
        this.worker.on('error', this.emit.bind(this, 'error'));
        return this;
    }

    /**
    * Removing worker from channel
    **/
    remove() {
        log.d('[%d]: Removing CentralWorker for %s', process.pid, this.name);
        if (this.onMessageListener) {
            this.worker.removeListener('message', this.onMessageListener);
            this.worker.setMaxListeners(this.worker.getMaxListeners() - 1);
            this.onMessageListener = undefined;
        }
    }

    /**
    * Send message to the Central
    * @param {any} data - data to send to master process
    **/
    send(data) {
        this.worker.send({[this.name]: data});
    }

    /**
    * Send read request to the Central
    * @param {any} data - data to send to master process
    * @return {Promise} which either resolves to the value returned by Central, or rejects on timeout
    **/
    read(name, data) {
        if (typeof name !== 'string') {
            throw new Error('Read request name must be string');
        }
        if (data === undefined) {
            data = name;
        }
        return new Promise((resolve, reject) => {
            if (!(name in this.promises)) {
                this.promises[name] = [];
            }
            this.promises[name].push(resolve);
            this.worker.send({[this.name]: data, [READ(this.name)]: name});
            setTimeout(() => {
                let idx = this.promises[name].indexOf(resolve);
                if (idx !== -1) {
                    this.promises[name].splice(idx, 1);
                }
                reject('Timeout');
            }, 10000);
        });
    }
}

module.exports.Central = Central;
module.exports.CentralWorker = CentralWorker;
module.exports.PassThrough = PassThrough;
module.exports.IdChannel = IdChannel;
module.exports.IdStartsWithChannel = IdStartsWithChannel;