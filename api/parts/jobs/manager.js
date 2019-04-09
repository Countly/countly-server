'use strict';

/* jshint ignore:start */

const {IPCFaçadeJob, Job, IPCJob, STATUS} = require('./job.js'),
    IPC = require('./ipc.js'),
    scan = require('./scanner.js'),
    RES = require('./resource.js'),
    {Watcher} = require('./watcher.js'),
    log = require('../../utils/log.js')('jobs:manager'),
    manager = require('../../../plugins/pluginManager.js'),
    later = require('later');

/**
* Apply transformation to each array elementFromPoint
* @param {array} arr - array to transform
* @param {function} transform - transformation function
* @returns {Promise} promise
**/
const sequence = (arr, transform) => {
    return new Promise((resolve, reject) => {
        /**
        * Processing next element
        **/
        var next = () => {
            let promise = transform(arr.pop());
            if (arr.length) {
                promise.then(next, reject);
            }
            else {
                promise.then(resolve, reject);
            }
        };
        if (!arr.length) {
            resolve();
        }
        else {
            next();
        }
    });
};


/**
 * Manager obviously manages jobs running: monitors jobs collection & IPC messages, runs jobs dividing then if necessary, starts and manages 
 * corresponding resources and reports jobs statuses back to the one who started them: IPC or jobs collection.
 */
class Manager extends Watcher {
    /** Constructor **/
    constructor() {
        super(manager.singleDefaultConnection(5));

        log.i('Starting job manager in ' + process.pid);

        this.classes = {}; // {'job name': Constructor}
        this.types = []; // ['job name1', 'job name2']
        this.files = {}; // {'ping': '/usr/local/countly/api/jobs/ping.js'}
        this.processes = {}; // {job1Id: [fork1, fork2], job2Id: [fork3, fork4], job3Id: []}     job3 is small and being run on this process, job1/2 are IPC ones
        this.running = {}; // {'push:apn:connection': [resource1, resource2], 'xxx': [resource3]}
        this.next = []; // [job1, job2, job3] for the next 30 min in order of start
        this.resources = []; // {'push:apn:connection': [job1, job2]}

        this.collection = this.db.collection('jobs');

        scan(this.db, this.files, this.classes).then(() => {
            this.types = Object.keys(this.classes);

            log.i('Found %d job types: %j', this.types.length, this.types);

            this.collection.find({status: STATUS.RUNNING}).toArray((err, toCancel) => {
                if (err) {
                    log.e(err);
                }

                log.i('Cancelling %d jobs', toCancel ? toCancel.length : null);
                log.d('Cancelling %j', toCancel);

                Promise.resolve(toCancel && toCancel.length && sequence(toCancel, async j => {
                    let job = this.job(j);
                    if (job) {
                        await job.cancel(this.db).catch(log.e.bind(log));
                    }
                    else {
                        await Job.updateOne(this.db, {_id: j._id}, {
                            status: STATUS.CANCELLED,
                            error: 'cancelled on restart'
                        });
                    }
                })).catch(() => {}).then(() => {
                    this.start();
                    this.sync();
                });
            });
        }, (e) => {
            log.e('Error when loading jobs', e, e.stack);
            process.exit(1);
        });

        this.on('', this.onchange.bind(this));
    }

    /**
     * Handle mongo change stream data - keep next up list in memory & update it on changes
     * 
     * @param  {Boolean} neo whether change is for new job
     * @param  {Object} job changed job
     */
    onchange({neo, job, change}) {
        log.d('Onchange: %s / %j', neo ? 'new' : 'edit', job, 'change', change);

        if (!job || this.types.indexOf(job.name) === -1) {
            return;
        }

        // added new job
        if (neo || (change && change.status === STATUS.SCHEDULED)) {
            if (job.next < Date.now() + 10 * 60000) {
                this.push(job);
            }
        }
        else {
            // removed a job
            let existing = this.next.filter(j => j._id.toString() === job._id.toString())[0];
            if (change && existing) {
                if ([STATUS.RUNNING, STATUS.DONE, STATUS.CANCELLED, STATUS.ABORTED].indexOf(change.status) !== -1) {
                    this.next.splice(this.next.indexOf(existing), 1);
                }
            }
        }
    }

    /**
     * Load upcoming jobs from jobs collection overwriting cached schedule if any
     */
    sync() {
        log.i('Syncing ... ');
        this.next = [];
        this.collection.find({
            status: STATUS.SCHEDULED,
            next: {$lt: Date.now() + 10 * 60000},
            name: {$in: this.types}
        }).sort({next: 1}).toArray((err, jobs) => {
            if (err) {
                log.e('Error while syncing', err);
                return setTimeout(this.sync.bind(this), 10000);
            }
            log.i('Syncing ... done with %d jobs', jobs.length);
            this.next = jobs;
            this.resetShift();
        });
    }

    /**
     * Add a job to the upcoming list.
     * 
     * @param  {Object} job JSON 
     */
    push(job) {
        let found = false,
            existing = this.next.filter(j => j._id.toString() === job._id.toString())[0];

        if (existing) {
            this.next.splice(this.next.indexOf(existing), 1);
        }

        for (let i = 0; i < this.next.length; i++) {
            if (this.next[i].next > job.next) {
                this.next.splice(i, 0, job);
                found = true;
                break;
            }
        }
        if (!found) {
            this.next.push(job);
        }
    }

    /**
     * Reset next job setTimeout
     */
    resetShift() {
        if (this.shifting) {
            return;
        }
        if (this.shiftTimeout) {
            clearTimeout(this.shiftTimeout);
            this.shiftTimeout = undefined;
        }

        let time = 5 * 60 * 1000;
        if (this.next.length) {
            time = Math.max(1, this.next[0].next - Date.now());
        }
        this.shiftTimeout = setTimeout(this.shift.bind(this), time);
    }

    /**
     * Start any up-next jobs
     */
    async shift() {
        if (this.shifting) {
            return;
        }

        this.shiftTimeout = undefined;
        this.shifting = true;

        if (this.running.length) {
            log.i('Running %j', Object.keys(this.running).map(name => name + ': ' + this.running[name].length));
        }
        log.i('Up next %d jobs', this.next.length);

        let jobs = this.next.filter(j => j.next < Date.now());
        if (!jobs.length) {
            return this.resetShift();
        }

        log.i('Starting %d jobs: %j', jobs.length, jobs.map(j => j.name));

        while (jobs.length) {
            try {
                let json = jobs.shift(),
                    job = this.job(json);

                if (!job) {
                    this.next.splice(this.next.indexOf(json), 1);
                    continue;
                }

                log.i('Starting %s / %s / %j', job.name, job.id, job.data);

                if (!this.canRun(job)) {
                    log.i('Cannot run %s / %s', job.name, job.id);
                    this.next.splice(this.next.indexOf(json), 1);
                    continue;
                }

                let update = {
                    status: STATUS.RUNNING,
                    started: Date.now()
                };

                job._json.status = STATUS.RUNNING;
                job._json.started = update.started;

                if (job.strict !== null && (Date.now() - job.next) > job.strict) {
                    log.i('Won\'t run strictly scheduled job %s / %s', job.name, job.id);
                    this.next.splice(this.next.indexOf(json), 1);
                    await job.cancel(this.db, true);
                    continue;
                }

                this.next.splice(this.next.indexOf(json), 1);

                let old = await Job.updateOne(this.db, {
                    _id: job._id,
                    status: {$in: [STATUS.RUNNING, STATUS.SCHEDULED, STATUS.PAUSED]}
                }, update, false);

                if (old && (old.status === STATUS.SCHEDULED || old.status === STATUS.PAUSED)) {
                    this.start(job);
                }
                else {
                    log.w('Job %s seems to be in invalid state, skipping', job.id);
                }
            }
            catch (exc) {
                log.e('Error while starting one of the %j: %j', jobs, exc);
            }
        }

        this.shifting = false;
        this.resetShift();
    }

    /**
    * Create job instance
    * @param {string} name - job name or JSON
    * @param {object} data - data about job
    * @returns {Job} job
    **/
    job(name, data) {
        let Constructor = this.classes[name.name || name];
        if (Constructor) {
            return new Constructor(name, data);
        }
        else {
            throw new Error('Couldn\'t find job file named ' + (name.name || name));
        }
    }

    /**
    * Reschedule a job
    * @param {Job} job - job to schedule
    * @returns {Promise} promise
    **/
    schedule(job) {
        if (job.scheduleObj) {
            var schedule = typeof job.scheduleObj === 'string' ? later.parse.text(job.scheduleObj) : job.scheduleObj,
                nextFrom = new Date(job.next);
            var next = later.schedule(schedule).next(2, nextFrom);
            if (next && next.length > 1) {
                if (job.strict !== null) {
                    // for strict jobs we're going to repeat all missed tasks up to current date after restart
                    // for non-strict ones, we want to start from current date
                    while (next[1].getTime() < Date.now()) {
                        next = later.schedule(schedule).next(2, next[1]);
                        if (next.length < 2) {
                            return;
                        }
                    }
                }
                return job.schedule(job.scheduleObj, job.strict, next[1].getTime());
            }
        }
        return Promise.resolve();
    }

    /**
    * Start job execution, catching all errors
    * 
    * @param {Job} job - job to run
    **/
    start(job) {
        if (!this.running[job.name]) {
            this.running[job.name] = [];
        }
        this.running[job.name].push(job.id);

        job.prepare(this, this.db).then(() => {
            log.d('prepared %j', job.id);
            this.run(job).then((upd) => {
                log.i('done running %s / %s: %j', job.name, job.id, upd);

                let idx = this.running[job.name].indexOf('' + job._id);
                if (idx !== -1) {
                    this.running[job.name].splice(idx, 1);
                }
                log.d('running in start: %j', this.running[job.name]);

                this.schedule(job).catch(err => {
                    log.e('Error while scheduling job after success: %j', err);
                });
            }, (error) => {
                log.d('error in start, %j', error.message || error.code || error.stack || error);

                let idx = this.running[job.name].indexOf('' + job._id);
                if (idx !== -1) {
                    this.running[job.name].splice(idx, 1);
                }

                this.schedule(job).catch(err => {
                    log.e('Error while scheduling job after error %j: %j', error, err);
                });
            });
        }, e => {
            log.e('Error during preparation of %s: %j', job._id, e.stack || e);

            let idx = this.running[job.name].indexOf('' + job._id);
            if (idx !== -1) {
                this.running[job.name].splice(idx, 1);
            }

            job._finish(e).catch(err => {
                log.e('Error while finishing job after error %j: %j', e, err);
            });
        });
    }

    /**
     * Run job by creating IPCFaçadeJob with actual job: instantiate or pick free resource, run it there. Returns a promise.
     * @param {IPCJob} job - job to run
     * @returns {Promise} promise
     */
    runIPC(job) {
        let façade = new IPCFaçadeJob(job, this.getResource.bind(this, job), this._watchId.bind(this));
        return façade._run();
    }

    /**
     * Run instantiated Job locally. Returns a promise.
     * @param {Job} job - job to run
     * @returns {Promise} promise
     */
    runLocally(job) {
        log.d('%s runLocally', job.id);
        return job._runWithRetries().catch((error) => {
            if (job.status !== STATUS.DONE) {
                log.e('Job is not done on error after _runWithRetries', error);
                job._json.duration = Date.now() - job._json.started;
                job._json.error = '' + (error.message || error);
                job._json.status = STATUS.DONE;
                job._save(job._json);
            }
            throw error;
        });
    }

    /**
     * Run any job with handling retries if necessary. Returns a promise.
     * @param {Job} job - job to run
     * @returns {Promise} promise
     */
    run(job) {
        if (job instanceof IPCJob) {
            return this.runIPC(job);
        }
        else {
            return this.runLocally(job);
        }
    }

    /**
     * Check if can run the job
     * @param {Job} job - job to run
     * @param {number} count - number of times to run
     * @returns {boolean} if can run job
     */
    canRun(job, count) {
        count = typeof count === 'undefined' ? 1 : count;
        let c = job.getConcurrency(),
            n = (this.running[job.name] || []).length,
            can = c === 0 || (n + count) <= c;
        if (!can) {
            log.i('Hit concurrency limit on %j: %d is running out of limit %d, requested to run %d', job._id, n, c, count);
        }
        return can;
    }

    /**
     * Get resource pool for job
     * @param {Job} job - job
     * @returns {object} resource pool
     */
    getPool(job) {
        if (!this.resources[job.resourceName()]) {
            this.resources[job.resourceName()] = new RES.ResourcePool(() => {
                return new RES.ResourceFaçade(job, this.files[job.name]);
            }, 10);
            this.resources[job.resourceName()].on(RES.EVT.CLOSED, () => {
                log.w('all pool resources done');
                delete this.resources[job.resourceName()];
            });
        }

        return this.resources[job.resourceName()];
    }

    /**
     * Get resource for job
     * @param {Job} job - job
     * @returns {object} resource
     */
    getResource(job) {
        return this.getPool(job).getResource();
    }

    /**
     * Check resource for running job
     * @param {Job} job - job
     * @returns {boolean} if can has resource
     */
    hasResources(job) {
        return this.getPool(job).canRun();
    }

    /**
    * get ipc
    * @returns {ipc} ipc
    **/
    get ipc() {
        return IPC;
    }
}

if (!Manager.instance) {
    Manager.instance = new Manager();

    // Close all resources on main process exit
    process.on('exit', () => {
        for (let k in Manager.instance.resources) {
            if (Manager.instance.resources[k].canBeTerminated()) {
                Manager.instance.resources[k].close();
            }
        }
    });
}

module.exports = Manager.instance;