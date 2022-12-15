'use strict';

/* jshint ignore:start */

const JOB = require('./job.js'),
    IPC = require('./ipc.js'),
    scan = require('./scanner.js'),
    RES = require('./resource.js'),
    STATUS = JOB.STATUS,
    log = require('../../utils/log.js')('jobs:manager'),
    manager = require('../../../plugins/pluginManager.js'),
    later = require('later');

const DELAY_BETWEEN_CHECKS = 1000,
    MAXIMUM_IN_LINE_JOBS_PER_NAME = 10,
    THE_VERY_TOP_TIMEOUT = 1000 * 60 * 55; // 55min

/**
 * Manager obviously manages jobs running: monitors jobs collection & IPC messages, runs jobs dividing then if necessary, starts and manages 
 * corresponding resources and reports jobs statuses back to the one who started them: IPC or jobs collection.
 */
class Manager {
    /** Constructor **/
    constructor() {
        log.i('Starting job manager in ' + process.pid);

        this.classes = {}; // {'job name': Constructor}
        this.types = []; // ['job name1', 'job name2']
        this.files = {}; // {'ping': '/usr/local/countly/api/jobs/ping.js'}
        this.processes = {}; // {job1Id: [fork1, fork2], job2Id: [fork3, fork4], job3Id: []}     job3 is small and being run on this process, job1/2 are IPC ones
        this.running = {}; // {'push:apn:connection': [resource1, resource2], 'xxx': [resource3]}
        this.resources = []; // {'push:apn:connection': [job1, job2]}
        // Once job is done running (goes out of running), if it's resourceful job, it goes into resources until resource is closed or another job of this type is being run

        manager.connectToAllDatabases().then(([db]) => {
            this.db = db;
            // JOB.setDB(this.db);
            this.collection = this.db.collection('jobs');
            // this.collection.update({status: STATUS.RUNNING, started: {$lt: Date.now() - 60 * 60 * 1000}}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart', done: Date.now()}}, {multi: true}, log.logdb('resetting interrupted jobs'));

            // setTimeout(() => {
            //  let Constructor = this.classes['api:ipcTest'];
            //  new Constructor('api:ipcTest', {root: true}).now();
            // }, 3000)

            // Listen for transient jobs
            require('cluster').on('online', worker => {
                let channel = new IPC.IdChannel(JOB.EVT.TRANSIENT_CHANNEL).attach(worker).on(JOB.EVT.TRANSIENT_RUN, (json) => {
                    log.d('[%d]: Got transient job request %j', process.pid, json);
                    this.start(this.create(json)).then((data) => {
                        log.d('[%d]: Success running transient job %j', process.pid, json, data);
                        if (data) {
                            json.result = data;
                        }
                        channel.send(JOB.EVT.TRANSIENT_DONE, json);
                    }, (error) => {
                        log.d('[%d]: Error when running transient job %j: ', process.pid, json, error);
                        if (error && error.toString()) {
                            json.error = error.toString().replace('Error: ', '');
                        }
                        else {
                            json.error = 'Unknown push error';
                        }
                        if (!json.error) {
                            json.error = 'Unknown push error';
                        }
                        channel.send(JOB.EVT.TRANSIENT_DONE, json);
                    });
                });
            });

            // Close all resources on main process exit
            process.on('exit', () => {
                for (let k in this.resources) {
                    if (this.resources[k].canBeTerminated()) {
                        this.resources[k].close();
                    }
                }
            });

            // don't scan for tests
            if (process.argv[1].indexOf('mocha') !== -1) {
                this.types.push('test');
                this.classes.test = require('../../jobs/test.js');
                this.files.test = '../../jobs/test.js';
                return this.checkAfterDelay();
            }

            scan(this.db, this.files, this.classes).then(() => {
                this.types = Object.keys(this.classes);
                log.i('Found %d job types, starting monitoring: %j', this.types.length, this.types);
                // cancel jobs star
                // this.collection.update({status: STATUS.RUNNING, $or: [{modified: {$lt: Date.now() - 60000}}, {modified: null}, {modified: {$exists: false}}]}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart', done: Date.now()}}, {multi: true}, () => {
                this.collection.find({status: STATUS.RUNNING}).toArray((err, toCancel) => {
                    if (err) {
                        log.e(err);
                    }

                    log.i('Cancelling %d jobs', toCancel ? toCancel.length : null);
                    log.d('Cancelling %j', toCancel);
                    try {
                        /**
                        * Apply transformation to each array elementFromPoint
                        * @param {array} arr - array to transform
                        * @param {function} transform - transformation function
                        * @returns {Promise} promise
                        **/
                        let sequence = (arr, transform) => {
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
                        let promise = toCancel && toCancel.length ? sequence(toCancel, async j => {
                                let job = this.create(j);
                                if (job) {
                                    await job.cancel(this.db).catch(() => log.e.bind(log));
                                }
                                else {
                                    await JOB.Job.update(this.db, {_id: j._id}, {
                                        $set: {
                                            status: JOB.STATUS.CANCELLED,
                                            error: 'cancelled on restart'
                                        }
                                    });
                                }
                            }) : Promise.resolve(),
                            /** Resume processing job **/
                            resume = () => {
                                log.d('Resuming after cancellation');
                                this.collection.find({status: STATUS.PAUSED}).toArray((err2, array) => {
                                    if (!err2 && array && array.length) {
                                        log.i('Going to resume following jobs: %j', array.map(j => {
                                            return {
                                                _id: j._id,
                                                name: j.name
                                            };
                                        }));
                                        this.process(array.filter(j => this.types.indexOf(j.name) !== -1)).catch(e => {
                                            log.e('Error during job resuming', e);
                                            resume();
                                        });
                                    }
                                    else {
                                        this.checkAfterDelay(DELAY_BETWEEN_CHECKS * 5);
                                    }
                                });
                                // this.checkAfterDelay(DELAY_BETWEEN_CHECKS * 5);
                            };
                        promise.then(resume, resume);
                    }
                    catch (e) {
                        log.e(e, e.stack);
                        this.checkAfterDelay(DELAY_BETWEEN_CHECKS * 5);
                    }
                });
            }, (e) => {
                log.e('Error when loading jobs', e, e.stack);
                this.checkAfterDelay();
            });
        });

    }

    /**
    * create job instance
    * @param {string} name - job name
    * @param {object} data - data about job
    * @returns {Job} job
    **/
    job(name, data) {
        let Constructor = this.classes[name];
        if (Constructor) {
            return new Constructor(name, data);
        }
        else {
            throw new Error('Couldn\'t find job file named ' + name);
        }
    }

    /**
    * Check if job is scheduled after delay
    * @param {number} delay - delay to wait before checking
    **/
    checkAfterDelay(delay) {
        if (this.checkingAfterDelay) {
            return;
        }
        this.checkingAfterDelay = true;
        setTimeout(() => {
            this.checkingAfterDelay = false;
            this.check();
        }, delay || DELAY_BETWEEN_CHECKS);
    }

    /**
    * Check if job is scheduled
    **/
    check() {
        var find = {
            status: STATUS.SCHEDULED,
            next: {$lt: Date.now()},
            name: {$in: this.types}
        };

        log.d('Looking for jobs ...');
        this.collection.find(find).sort({next: 1}).limit(MAXIMUM_IN_LINE_JOBS_PER_NAME).toArray((err, jobs) => {
            if (err) {
                log.e('Error while looking for jobs: %j', err);
                this.checkAfterDelay();
            }
            else if (!jobs) {
                log.d('No jobs so far');
                this.checkAfterDelay();
            }
            else {
                this.process(jobs).catch(e => {
                    log.e('Error during job processing', e);
                    this.checkAfterDelay();
                });
            }
        });
    }

    /**
    * Process jobs
    * @param {array} jobs = array with jobs
    **/
    async process(jobs) {
        try {
            while (jobs.length) {
                let json = jobs.shift(),
                    job = this.create(json);

                if (!job) {
                    continue;
                }

                if (job.next > Date.now()) {
                    // return console.log('Skipping job %j', job);
                    continue;
                }

                if (!this.classes[job.name]) {
                    jobs = jobs.filter(j => j.name !== job.name);
                    log.d('Cannot process job %s - no such class', job.name);
                    continue;
                }

                if (!this.canRun(job)) {
                    jobs = jobs.filter(j => j.name !== job.name);
                    log.d('Cannot run %s:%s:%s, skipping for now', json.name, json._id, new Date(json.next));
                    continue;
                }

                if (job instanceof JOB.IPCJob) {
                    if (!this.hasResources(job)) {
                        log.i('All resources are busy for %s:%s:%s, skipping for now', json.name, json._id, new Date(json.next));
                        continue;
                    }
                }

                log.i('Trying to start job %j', json);
                let update = {
                    $set: {
                        status: STATUS.RUNNING,
                        started: Date.now()
                    }
                };

                job._json.status = STATUS.RUNNING;
                job._json.started = update.$set.started;

                if ((job.strict !== null && job.strict !== undefined) && (Date.now() - job.next) > job.strict) {
                    update.$set.status = job._json.status = STATUS.DONE;
                    update.$set.done = job._json.done = Date.now();
                    update.$set.error = job._json.error = 'Job expired';
                    delete update.$set.next;
                    delete job._json.next;
                    await JOB.Job.update(this.db, {_id: job._id}, update);
                    continue;
                }

                let old;
                try {
                    old = await JOB.Job.updateAtomically(this.db, {
                        _id: job._id,
                        status: {$in: [STATUS.RUNNING, STATUS.SCHEDULED, STATUS.PAUSED]}
                    }, update, false);
                }
                catch (e) {
                    log.i('Job %s:%s wasn\'t found: %j', job._id, job.name, e);
                }

                if (old) {
                    if (old.status === STATUS.RUNNING) {
                        log.i('Job %s is running on another server, won\'t start it here', job.id);
                    }
                    else if (old.status === STATUS.SCHEDULED || old.status === STATUS.PAUSED) {
                        if (job instanceof JOB.IPCJob || job instanceof JOB.IPCFaçadeJob) {
                            if (!this.hasResources(job)) {
                                log.i('Started the job, but all resources are busy for %j, putting it back to SCHEDULED', json);
                                await JOB.Job.updateAtomically(this.db, {
                                    _id: job._id,
                                    status: STATUS.RUNNING
                                }, {$set: {status: STATUS.SCHEDULED}}, false);
                                return;
                            }
                        }

                        let p = this.start(job);
                        if (!p) {
                            await JOB.Job.updateAtomically(this.db, {
                                _id: job._json._id,
                                status: STATUS.RUNNING
                            }, {$set: {status: STATUS.SCHEDULED}});
                        }
                        else {
                            p.catch(e => {
                                log.e('Error during job start of %s %j', job._id, e.stack || e.message || e);
                            });
                        }
                    }
                }
                else {
                    log.w('Job %s seems to be in invalid state, skipping', job.id);
                }
            }
        }
        catch (e) {
            log.e('Caught error in process: %j', e.stack || e.message || e);
        }
        this.checkAfterDelay();
    }

    /**
    * Schedule job
    * @param {Job} job - job to schedule
    * @returns {Promise} promise
    **/
    schedule(job) {
        if (job.scheduleObj) {
            let strict = job.strict !== null && job.strict !== undefined && job.strict !== false,
                schedule = typeof job.scheduleObj === 'string' ? later.parse.text(job.scheduleObj) : job.scheduleObj,
                now = new Date(),
                // for strict jobs we're going to repeat all missed tasks (100 tasks max) up to current date after restart
                // for non-strict ones, we want to start from current date
                next = later.schedule(schedule).next(3, strict ? new Date(job.next || now.getTime()) : now);

            next = next.filter(d => d.getTime() !== job.next && (!job.next || d.getTime() > job.next) && d.getTime() !== now.getTime());
            if (typeof job.strict === 'number' && job.next) {
                let s = next.filter(d => Math.abs(d.getTime() - job.next) > job.strict);
                next = s.length ? s : next;
            }
            return job.schedule(job.scheduleObj, job.strict, next.shift().getTime());
        }
        return Promise.resolve();
    }

    /**
    * Run job
    * @param {Job} job - job to run
    * @returns {Promise} promise
    **/
    start(job) {

        if (this.canRun(job)) {
            if (!this.running[job.name]) {
                this.running[job.name] = [];
            }
            this.running[job.name].push(job.id);

            return new Promise((resolve, reject) => {
                job.prepare(this, this.db).then(() => {
                    log.d('prepared %j', job.id);

                    /**
                     * Remove job from master queue allowing other jobs to step in
                     */
                    let clear = () => {
                            let idx = this.running[job.name].indexOf('' + job._id);
                            if (idx !== -1) {
                                this.running[job.name].splice(idx, 1);
                            }
                            log.d('cleared manager from job, %s:%s, still running %j', job.name, job.id, this.running[job.name]);
                            this.schedule(job).catch(e => log.e.bind(log, 'Error when clearing job: %j', e));
                        },
                        timeout = setTimeout(clear, THE_VERY_TOP_TIMEOUT);

                    this.run(job).then((upd) => {
                        log.d('result in start, %j', upd);
                        clearTimeout(timeout);
                        clear();
                        resolve(upd ? upd.result : undefined);
                    }, (error) => {
                        log.d('error in start, %j', error.message || error.code || error.stack || error);
                        clearTimeout(timeout);
                        clear();
                        reject(error);
                    });
                }, e => {
                    log.e('Error during preparation of %s: %j', job._id, e.stack || e);

                    let idx = this.running[job.name].indexOf('' + job._id);
                    if (idx !== -1) {
                        this.running[job.name].splice(idx, 1);
                    }

                    job._finish(e).then(reject.bind(null, e), reject.bind(null, e));
                });
            });
        }
    }

    /**
     * Run job by creating IPCFaçadeJob with actual job: instantiate or pick free resource, run it there. Returns a promise.
     * @param {IPCJob} job - job to run
     * @returns {Promise} promise
     */
    runIPC(job) {
        let façade = new JOB.IPCFaçadeJob(job, this.getResource.bind(this, job));
        return façade._run();
    }

    /**
     * Run job by creating IPCFaçadeJob with actual job: instantiate or pick free resource, run it there. Returns a promise.
     */
    // runIPC (job) {
    //  log.d('%s: runIPC', job.id);

    //  if (job.isSub) {
    //      let façade = job._transient ? new JOB.TransientFaçadeJob(job, this.getResource.bind(this, job)) : new JOB.IPCFaçadeJob(job, this.getResource.bind(this, job));
    //      return this.runLocally(façade);
    //  } else {
    //      return new Promise((resolve, reject) => {
    //          log.d('%s: dividing', job.id);
    //          job.divide(this.db).then((obj) => {                     // runs user code to divide job
    //              var subs = obj.subs,
    //                  workersCount = obj.workers;
    //              log.d('%s: divided into %d sub(s) in %d worker(s)', job.id, subs.length, workersCount);
    //              if (subs.length === 0) {                            // no subs, run in local process
    //                  log.d('%s: no subs, running locally', job.id);
    //                  this.runLocally(job).then(upd => {
    //                      log.d('%s: done running locally with %j', job.id, upd);
    //                      job._save(upd);
    //                      resolve(upd);
    //                  }, reject);
    //              } else {                                            // one and more subs, run through IPC
    //                  job._divide(subs).then(() => {                  // set sub idx & _id, save in DB
    //                      try {
    //                          subs = job._json.subs.map(sub => this.create(sub));
    //                          job._json.size = job._json.subs.reduce((p, c) => {
    //                              return {size: p.size + c.size};
    //                          }).size;
    //                          job._json.done = 0;
    //                          job._save({size: job._json.size, done: 0});

    //                          var running = [],
    //                              rejected = false,
    //                              remove = (sub) => {
    //                                  let idx = running.indexOf(sub);
    //                                  if (idx !== -1) {
    //                                      running.splice(idx, 1);
    //                                  } else {
    //                                      log.w('%s: -1 indexOf %j in %j', job.id, sub, running);
    //                                  }
    //                              },
    //                              next = () => {
    //                                  if (!rejected && running.length < workersCount && subs.length > 0 && this.getPool(subs[0]).canRun()) {
    //                                      let sub = subs.shift();
    //                                      sub.parent = job;
    //                                      log.d('%s: running next sub %s', job.id, sub.id);
    //                                      this.runIPC(sub).then(() => {
    //                                          log.d('%s: succeeded', sub.id);
    //                                          remove(sub);
    //                                          next();
    //                                      }, (error) => {
    //                                          log.d('%s: failed with %s', sub.id, error, error.stack);
    //                                          remove(sub);
    //                                          rejected = true;
    //                                          reject(error);
    //                                          throw error;
    //                                      });
    //                                      running.push(sub);
    //                                      next();
    //                                  } else if (!rejected && running.length < workersCount && subs.length > 0 && !this.getPool(subs[0]).canRun()) {
    //                                      log.d('%s: not ready to run yet', job.id);
    //                                      setTimeout(next, 5000);
    //                                  } else if (running.length === 0 && subs.length === 0) {
    //                                      try {
    //                                          log.d('%s: all subs done, resolving', job.id);
    //                                          resolve();
    //                                      } catch(e) {
    //                                          log.e(e, e.stack);
    //                                      }
    //                                  } else {
    //                                      log.d('%s: waiting for all subs to resolve (%d running, %d left to run)', job.id, running.length, subs.length);
    //                                  }
    //                              };

    //                          log.d('[%s]: prepaing subs', job.id);
    //                          Promise.all(subs.map(s => s.prepare(this, this.db))).then(() => {
    //                              log.d('[%s]: starting first sub', job.id);
    //                              next();
    //                          }, reject);

    //                      } catch (e) {
    //                          log.e(e, e.stack);
    //                          reject(e);
    //                      }
    //                  }, reject);
    //              }
    //          }, reject);
    //      });
    //  }
    // }

    /**
     * Run instantiated Job locally. Returns a promise.
     * @param {Job} job - job to run
     * @returns {Promise} promise
     */
    runLocally(job) {
        log.d('%s runLocally', job.id);
        return job._runWithRetries().catch((error) => {
            if (job.status !== STATUS.DONE) {
                log.w('Job is not done on error after _runWithRetries', error);
                job._json.duration = Date.now() - job._json.started;
                job._json.error = '' + error;
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
        if (job instanceof JOB.IPCJob) {
            return this.runIPC(job);
        }
        else {
            return this.runLocally(job);
        }
    }

    /**
     * Create job from json
     * @param {object} json - json object defining job
     * @returns {Job} job
     */
    create(json) {
        try {
            let Constructor = this.classes[json.name];
            return new Constructor(json);
        }
        catch (e) {
            log.e('Error when instantiating %j: %j', json, e.stack || e);
            return null;
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
            log.i('Hit concurrency limit on %j: %d is running out of limit %d, requested to run %d, running %j', job._id, n, c, count, this.running[job.name]);
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
}

module.exports = Manager.instance;