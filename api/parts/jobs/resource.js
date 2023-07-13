'use strict';

const cp = require('child_process'),
    EventEmitter = require('events'),
    ipc = require('./ipc.js'),
    JOB = require('./job.js'),
    log = require('../../utils/log.js')('jobs:resource');

const CMD = {
        RUN: 'resource:run',
        ABORT: 'resource:abort',
        DONE: 'resource:done',
        OPENED: 'resource:opened',
        CLOSED: 'resource:closed',
        CRASH: 'resource:crash',
        TIMEOUT: 'resource:timeout',
        ONLINE: 'resource:online'
    },
    EVT = {
        ONLINE: 'online',
        OPENED: 'opened',
        CLOSED: 'closed',
        ABORT: 'abort',
        EXIT: 'exit',
        TIMEOUT: 'timeout',
        CRASH: 'crash',
    },
    RESOURCE_PING_INTERVAL = 10000,
    RESOURCE_CLOSE_TIMEOUT = 360000,
    RESOURCE_CMD_TIMEOUT = 15 * 60000;

/**
* Return random string
* @returns {string} random string
**/
function random() {
    var s = Math.random().toString(36).slice(2);
    return s;
    // return s.length === 16 ? s : random(); 
}

/**
 * Base class for both: Resource & ResourceFaçade which implements interface for talking to Job / JobFaçade & Manager.
 */
class ResourceInterface extends EventEmitter {
    /**
    * Constructor
    * @param {string} id - id of resource
    * @param {string} name - name of the resource
    **/
    constructor(id, name) {
        super();
        this._online = false;
        this._open = null;
        this._job = null;
        this._id = id;
        this._name = name;
    }

    /**
    * Check if resource is busy
    * @returns {boolean} if resource is busy
    **/
    get isBusy() {
        return !!this._job;
    }

    /**
    * Check if resource is open
    * @returns {boolean} if resource is open
    **/
    get isOpen() {
        return !!this._open;
    }

    /**
    * Get id of resource
    * @returns {string} resource id
    **/
    get id() {
        return this._id;
    }

    /**
    * Get name of resource
    * @returns {string} resource name
    **/
    get name() {
        return this._name;
    }

    /**
    * Get resource job
    * @returns {Job} resource job
    **/
    get job() {
        return this._job;
    }

    /**
    * Set resource job
    * @param {Job} job - resource job
    **/
    set job(job) {
        this._job = job;
    }

    /**
    * Run job
    **/
    run(/*job*/) {
        throw new Error('Resource.run must be overridden to return promise');
    }

    /**
    * Abort job
    **/
    abort(/*job*/) {
        throw new Error('Resource.run must be overridden to return promise');
    }

    /**
     * Whether manager is allowed to terminate process on master exit
     * @return {boolean} true if manager can;
     */
    canBeTerminated() {
        return true;
    }

    /**
    * Resolved returned promise, once resource is online
    * @returns {Promise} promise
    **/
    onceOnline() {
        if (this._online) {
            return Promise.resolve();
        }
        else {
            return new Promise((resolve) => {
                setTimeout(resolve.bind(null, false), 30000);
                this.once(EVT.ONLINE, () => {
                    this._online = true;
                    resolve(true);
                });
            });
        }
    }

    /**
    * Resolved returned promise, once resource is opened
    * @returns {Promise} promise
    **/
    onceOpened() {
        if (this._open) {
            return Promise.resolve();
        }
        else if (!this._online) {
            return new Promise((resolve, reject) => {
                return this.onceOnline().then(() => {
                    this.onceOpened().then(resolve, reject);
                }, reject);
            });
        }
        else {
            this.once(EVT.OPENED, () => {
                this._open = true;
            });
            return this.open();
        }
    }

    /**
    * Resolved returned promise, once resource is closed
    * @returns {Promise} promise
    **/
    onceClosed() {
        if (!this._open) {
            return Promise.resolve();
        }
        else {
            this.once(EVT.CLOSED, () => {
                this._open = false;
            });
            return this.close().catch(e => log.w('[%d]: Error in onceClosed of resource %s', process.pid, this.id, e.stack || e));
        }
    }
}

/**
 * ResourceFaçade is a thin IPC façade for actual resource running in a separate process.
 * Constructor requires actual job instance just to instantiate a resource from its createResource call, separate run call is required to start it.
 */
class ResourceFaçade extends ResourceInterface {
    /**
    * Constructor
    * @param {Job} job for resource
    * @param {string} file
    **/
    constructor(job, file) {
        super('res:' + job.resourceName() + ':' + random(), 'res:' + job.resourceName());
        this._file = file;
        this._worker = cp.fork(__dirname + '/executor.js', [JSON.stringify({
            _id: this.id,
            name: this.name,
            file: this._file,
            job: job._json
        })]);
        log.i('[façade]: Started resource %j in %d for %j: %j', this.name, process.pid, this._worker.pid, this.id);

        this.channel = new ipc.IdChannel(this.id);
        this.channel.attach(this._worker);

        this.channel.on(CMD.DONE, (json) => {
            if (json.error) {
                log.i('[façade]: Done running %s with error %j %j (%j) in %d', json._id, json.error, this.name, this.id, this._worker.pid);
                this.reject(json.error);
            }
            else {
                log.i('[façade]: Done running %s with success %j (%j) in %d', json._id, this.name, this.id, this._worker.pid);
                this.resolve(json);
            }
        });

        this.channel.on(CMD.ABORT, () => {
            this.reject(EVT.ABORT);
        });

        this.channel.on(CMD.OPENED, (json) => {
            log.i('[façade]: Resource %j opened in %d: %j, %j', this.name, this._worker.pid, this.id, json);
            this._open = true;
            this._canBeTerminated = json.canBeTerminated;
            this.emit(EVT.OPENED, json);
        });

        this.channel.on(CMD.CLOSED, (err) => {
            log.i('[façade]: Resource %j closed in %d: %j', this.name, this._worker.pid, this.id, err);
            this._open = false;
            if (!this._crashed) {
                if (this._job) {
                    log.i('[façade]: Resource %j closed in %d (%j) while running %s, will reject', this.name, this._worker.pid, this.id, this._job.channel, err);
                    this.reject(err || EVT.CLOSED);
                }
                this.emit(EVT.CLOSED, err);
            }
        });

        this.channel.on('exit', () => {
            log.i('[façade]: Resource %j exited in %d: %j', this.name, this._worker.pid, this.id);
            if (!this._crashed) {
                this.emit(EVT.CLOSED);
                if (this._job) {
                    log.i('[façade]: Resource %j exited in %d (%j) while running %s, will reject', this.name, this._worker.pid, this.id, this._job.channel);
                    this.reject('Process exited');
                }
                this.emit(EVT.EXIT);
            }
        });

        this.channel.on(CMD.CRASH, (err) => {
            if (!this._crashed) {
                log.e('[façade]: Resource %s (%s) crashed in %d: %j', this.name, this.id, this._worker.pid, err);
                if (this.job) {
                    this.reject([JOB.ERROR.CRASH, err]);
                }
                else {
                    this.emit(EVT.CRASH);
                }
                this.close().catch(e => log.w('[%d]: Error in .on(CMD.CRASH) of resource %s', process.pid, this.id, e.stack || e));
            }
        });

        this.channel.on(CMD.TIMEOUT, (err) => {
            if (!this._crashed) {
                log.e('[façade]: Resource %s (%s) timed out in %d: %j', this.name, this.id, this._worker.pid, err);
                if (this.job) {
                    this.reject([JOB.ERROR.TIMEOUT, err]);
                }
                else {
                    this.emit(EVT.TIMEOUT);
                }
                this.close().catch(e => log.w('[%d]: Error in .on(CMD.TIMEOUT) of resource %s', process.pid, this.id, e.stack || e));
            }
        });

        this.channel.on(CMD.ONLINE, () => {
            log.d('ResourceFaçade %s is online', this.id);
            this.emit(EVT.ONLINE);
        });
    }

    /**
    * Check if resource is busy
    * @returns {boolean} if resource is busy
    **/
    get isBusy() {
        return !!this._job;
    }

    /**
    * Check if resource is ready
    * @returns {boolean} if resource is ready
    **/
    get isReady() {
        return this.open === true || this.open === null;
    }

    /**
     * Whether manager is allowed to terminate process on master exit
     * Uses opened event data to know if underlying resource can be terminated
     * @return {boolean} true if manager can;
     */
    canBeTerminated() {
        return !!this._canBeTerminated;
    }

    /**
    * Run job
    * @param {Job} job to run
    * @returns {Promise} promise
    **/
    run(job) {
        if (this.isBusy) {
            log.w('[façade]: Resource façade %j is busy in %d: %j', this.name, this._worker.pid, this.id);
            return Promise.reject('busy');
        }
        this.job = job;
        log.i('[façade]: Resource façade %j in %d (%j) is going to run %s', this.name, this._worker.pid, this.id, job.channel);
        return new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;

            this.onceOpened().then(this.channel.send.bind(this.channel, CMD.RUN, job._json), (e) => {
                log.e('Error in job resource façade .run() promise ', e, e.stack);
                this.close().catch(err => log.w('[%d]: Error in onceOpened of resource %s', process.pid, this.id, err.stack || err));
                reject(e);
            });
        });
    }

    /**
    * Close resource
    * @returns {Promise} promise
    **/
    close() {
        if (this.isOpen) {
            log.i('Closing underlying resource %s from façade', this.id);
            log.i('Stack %j', new Error().stack);
            return new Promise((resolve, reject) => {
                setTimeout(reject.bind(null, JOB.ERROR.TIMEOUT), RESOURCE_CMD_TIMEOUT);
                this.channel.once(CMD.CLOSED, () => {
                    this.channel.remove();
                    resolve();
                });
                this.channel.send(CMD.CLOSED);
            });
        }
        else {
            return Promise.resolve();
        }
    }

    /**
    * Kill resource
    * @returns {Promise} promise
    **/
    kill() {
        return new Promise((resolve) => {
            this._worker.kill();
            this._open = false;
            this._job = null;
            resolve();
        });
    }

    /**
    * Open resource
    * @returns {Promise} promise
    **/
    open() {
        if (this.isOpen) {
            return Promise.resolve();
        }
        else {
            log.i('Opening underlying resource %s from façade', this.id);
            return new Promise((resolve, reject) => {
                let to = setTimeout(() => {
                    reject(JOB.ERROR.TIMEOUT);
                    this.close().catch(e => log.w('[%d]: Error in .open() of resource %s', process.pid, this.id, e.stack || e));
                }, RESOURCE_CMD_TIMEOUT);
                this.channel.send(CMD.OPENED);
                this.channel.once(CMD.OPENED, arg => {
                    clearTimeout(to);
                    resolve(arg);
                });
                this.channel.once(CMD.CLOSED, arg => {
                    clearTimeout(to);
                    reject(arg);
                });
            });
        }
    }

    /**
    * Abort job
    * @param {Job} job to abort
    * @returns {Promise} promise
    **/
    abort(job) {
        if (!this.job) {
            log.w('[façade]: Resource façade %j is not open in %d: %j', this.name, this._worker.pid, this.id);
            return Promise.reject('no job is running to abort');
        }

        if (this.job._id !== job._id) {
            log.w('[façade]: Resource façade %j is not open in %d: %j', this.name, this._worker.pid, this.id);
            return Promise.reject('busy with job other than requested to abort');
        }

        this.channel.send(CMD.ABORT, job._json);
    }

    /**
    * Resolve job
    **/
    resolve() {
        if (this._resolve) {
            log.i('[façade]: Resolving %s', this.job.channel);
            this._resolve.apply(this, arguments);
            this.job.releaseResource(this).then(() => {
                log.i('[façade]: Released resource for %s', this.job.channel);
                this.job = null;
            }, err => {
                log.e('[façade]: Resource release returned error for %s: %j', this.job.channel, err);
                this.job = null;
            });
            this._resolve = this._reject = this.job.resource = null;
        }
        else {
            log.i('ResourceFaçade %s already returned, nothing to resolve', this.id);
        }
    }

    /**
    * Reject job
    * @param {Error} error with which to reject
    **/
    reject(error) {
        if (this._reject) {
            log.i('[façade]: Rejecting %s', this.job.channel);
            this._reject.apply(this, arguments);
            this.job.releaseResource(this).then(() => {
                log.i('[façade]: Released resource for %s', this.job.channel);
                this.job = null;
            }, err => {
                log.e('[façade]: Resource release returned error for %s: %j', this.job.channel, err);
                this.job = null;
            });
            this._resolve = this._reject = this.job.resource = null;
        }
        else {
            log.i('ResourceFaçade %s already returned, nothing to reject with %j', this.id, error);
        }
    }
}

/** Class for resource pool **/
class ResourcePool extends EventEmitter {
    /**
    * Constructor
    * @param {function} construct - resource constructor
    * @param {number} maxResources - maximal amount of resources
    **/
    constructor(construct, maxResources) {
        super();
        this.construct = construct;
        this.maxResources = maxResources;
        this.pool = [];
    }

    /**
    * Check if there are any resources in the pool available
    * @returns {boolean} if any available
    **/
    canRun() {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isBusy) {
                return true;
            }
        }
        return this.pool.length < this.maxResources;
    }

    /**
    * Get a free resource
    * @returns {object} resource to use
    **/
    getResource() {
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isBusy) {
                return this.pool[i];
            }
        }

        if (this.pool.length < this.maxResources) {
            let resource = this.construct();
            resource.on(EVT.CLOSED, () => {
                let idx = this.pool.indexOf(resource);
                if (idx !== -1) {
                    log.d('[jobs]: Resource %j is closed, removing from pool', resource._id);
                    this.pool.splice(idx, 1);
                    if (this.pool.length === 0) {
                        this.emit(EVT.CLOSED);
                    }
                }
            });
            this.pool.push(resource);
            return resource;
        }

        throw new Error('ResourcePool should be checked with canRun() before calling getResource()');
    }

    /**
    * Close resourse
    * @returns {Promise} promise
    **/
    close() {
        return Promise.all(this.pool.map(r => r.close().catch(e => log.w('[%d]: Error in .close() of pool for resource %s', process.pid, r.id, e.stack || e)))).catch((error) => {
            log.w('Error while closing pooled resources', error);
        });
    }

    /**
    * Kill resourse
    * @returns {Promise} promise
    **/
    kill() {
        return Promise.all(this.pool.map(r => r.kill())).catch((error) => {
            log.w('Error while killing pooled resources', error);
        });
    }

    /** cann be terminated
     * @returns {boolean} true - if pool is empty or termination allowed
     */
    canBeTerminated() {
        return this.pool.length === 0 || this.pool[0].canBeTerminated();
    }
}

/**
 * Main class for custom resources to override.
 */
class Resource extends ResourceInterface {
    /**
    * Cosntructor
    * @param {string} _id - resource id
    * @param {string} name - resource name
    * @param {number} checkInterval - resource ping interval in miliseconds
    * @param {number} autoCloseTimeout - resource close timeout in miliseconds
    **/
    constructor(_id, name, checkInterval, autoCloseTimeout) {
        super(_id, name);
        this._resourceCheckMillis = checkInterval || RESOURCE_PING_INTERVAL;
        this._resourceAutoCloseMillis = autoCloseTimeout || RESOURCE_CLOSE_TIMEOUT;
    }

    /**
    * Called when resource opens
    **/
    opened() {
        this._open = true;
        log.i('[%d]: Opened resource %j (%j)', process.pid, this.name, this.id);
        this.emit(EVT.OPENED, {canBeTerminated: this.canBeTerminated()});
        this.channel.send(CMD.OPENED, {canBeTerminated: this.canBeTerminated()});
        this._checkInterval = setInterval(() => {
            log.i('[%d]: Checking resource %j (%j)', process.pid, this.name, this.id);
            this.checkActive().then((active) => {
                log.i('[%d]: Resource %j (%j) is ' + (active ? 'active' : 'inactive'), process.pid, this.name, this.id);
                if (!active) {
                    this._open = false;
                    this.close().catch(e => log.w('[%d]: Error in .opened() of resource %s', process.pid, this.id, e.stack || e));
                }
            }, (error) => {
                log.e('[%d]: Couldn\'t check resource %j (%j): %j', process.pid, this.name, this.id, error);
                this.close().catch(e => log.w('[%d]: Error in onceClosed of resource %s', process.pid, this.id, e.stack || e));
            });
        }, this._resourceCheckMillis);
    }

    /**
    * Called when resource closes
    **/
    closed() {
        this._open = false;
        clearInterval(this._checkInterval);
        clearTimeout(this._closeTimeout);
        this.emit(EVT.CLOSED);
        this.channel.send(CMD.CLOSED);
        this.channel.remove();
        log.i('[%d]: Closed resource %j (%j), exiting', process.pid, this.name, this.id);
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }

    /**
    * Open resource
    **/
    open() {
        throw new Error('Resource.open must be overridden to return a Promise which calls Resource.opened in case of success');
    }

    /**
    * Close resource
    **/
    close() {
        throw new Error('Resource.open must be overridden to return a Promise which calls Resource.closed in case of success');
    }

    /**
    * Kill resource
    **/
    kill() {
        throw new Error('Resource.kill should not be ever called');
    }

    /**
    * Check if resource is active
    **/
    checkActive() {
        log.i('[%d]: Checking resource %j (%j)', process.pid, this.name, this.id);
    }

    /**
    * Start channel communication
    * @param {object} channel - channel to use
    * @param {object} db - database connection
    * @param {function} Constructor - cosntructor for job
    **/
    start(channel, db, Constructor) {
        this.db = db;
        this.channel = channel;
        this.channel.on(CMD.RUN, (json) => {
            if (this.job) {
                log.e('[%d]: Resource is already running a job %j', process.pid, this.job.channel);
                throw new Error('Resource is already running a job');
            }

            this.job = new Constructor(json);
            this.job.resource = this;

            if (!(this.job instanceof JOB.IPCJob)) {
                throw new Error('Only IPCJob subclasses can be run on a resource');
            }

            clearTimeout(this._closeTimeout);

            log.i('[%d]: Running job %j (%j) in resource %j', process.pid, this.job.name, this.job.channel, this.id);

            this.onceOpened().then(() => {
                log.d('[%d]: Resource is open for %j', process.pid, this.job.channel);
                this.job.prepare(null, db).then(() => {
                    this.job._run(this.db, this).then(this.done.bind(this, this.job, null), this.done.bind(this, this.job));
                }, this.done.bind(this, this.job));
            }, this.done.bind(this, this.job));
        });

        this.channel.on(CMD.CLOSED, () => {
            this.close().catch(e => log.w('[%d]: Error in CMD.CLOSED of resource %s', process.pid, this.id, e.stack || e));
        });

        this.channel.on(CMD.OPENED, () => {
            log.d('[%d]: Opening %s by command of façade', process.pid, this.id);
            this.open().then(() => {}, (err) => {
                log.w('[%d]: Error while opening %s by command of façade: %j', process.pid, this.id, err);
                this.channel.send(CMD.CLOSED, err);
                setTimeout(() => {
                    this.close().catch(e => log.w('[%d]: Error in CMD.OPENED of resource %s', process.pid, this.id, e.stack || e));
                }, 1000);
            });
        });

        process.on('uncaughtException', (err) => {
            log.e('[%d]: Crash in resource %s (%s):', process.pid, this.name, this.id, err, err.stack);
            this.job._sendSave();
            this.channel.send(CMD.CRASH, `uncaughtException: ${err}`);
            setTimeout(this.close.bind(this), 1200);
        });

        this.channel.send(CMD.ONLINE);
        log.d('Resource is online');
    }

    /**
    * Job done
    * @param {Job} job that is completed
    * @param {Error} error - error if any happened
    **/
    done(job, error) {
        if (error === JOB.ERROR.TIMEOUT) {
            log.w('[%d]: Timeout for job %s (%s) in resource %s', process.pid, job.name, job.channel, this.id);
            this.job._sendSave();
            this.channel.send(CMD.TIMEOUT);
            setTimeout(this.close.bind(this), 1200);
        }
        else {
            log.i('[%d]: Done running job %j (%j) in resource %s', process.pid, job.name, job.channel, this.id);
            job._json.error = job._json.error || error;
            this.job.resource = this.job = null;
            this.channel.send(CMD.DONE, job._json);
            if (this._closeTimeout) {
                clearTimeout(this._closeTimeout);
            }
            this._closeTimeout = setTimeout(() => {
                log.i('[%d]: Auto-closing resource %s after %dms', process.pid, this.id, this._resourceAutoCloseMillis);
                this.close().catch(e => log.w('[%d]: Error when closing resource %s for job %s', process.pid, this.id, job.channel, e.stack || e));
            }, this._resourceAutoCloseMillis);
        }
    }
}

module.exports = {
    CMD: CMD,
    EVT: EVT,
    Resource: Resource,
    ResourceFaçade: ResourceFaçade,
    ResourcePool: ResourcePool
};