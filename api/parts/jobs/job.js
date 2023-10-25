'use strict';

/* jshint ignore:start */

const EventEmitter = require('events'),
    later = require('later'),
    ipc = require('./ipc.js'),
    log = require('../../utils/log.js')('jobs:job'),
    retry = require('./retry.js'),
    ObjectID = require('mongodb').ObjectID;

const STATUS = {
        SCHEDULED: 0,
        RUNNING: 1,
        DONE: 2,
        CANCELLED: 3,
        ABORTED: 4,
        PAUSED: 5,
        WAITING: 6
    },
    STATUS_MAP = {
        0: "SCHEDULED",
        1: "RUNNING",
        2: "DONE",
        3: "CANCELLED",
        4: "ABORTED",
        5: "PAUSED",
        6: "WAITING"
    },
    ERROR = {
        CRASH: 'crash',
        TIMEOUT: 'timeout'
    },
    EVT = {
        UPDATE: 'job:update',
        DONE: 'job:done',
        TRANSIENT_CHANNEL: 'jobs:transient',
        TRANSIENT_RUN: 'jobs:transient:run',
        TRANSIENT_DONE: 'jobs:transient:done'
    };

/**
 * Debounce function which decreases number of calls to func to be once in minWait ... maxWait.
 * @param {function} func - function to debounce
 * @param {number} minWait - minimal waiting time
 * @param {number} maxWait - maximal waiting time
 * @returns {function} debounced function
 */
const debounce = function(func, minWait, maxWait) {
    var timeout, first, args, context,
        delater = function() {
            func.apply(context, args);
            timeout = first = args = context = null;
        };
    return function() {
        context = this;
        args = arguments;
        if (!first) {
            first = Date.now();
        }

        clearTimeout(timeout);

        if (maxWait < (Date.now() - first)) {
            delater();
        }
        else {
            timeout = setTimeout(delater, Math.min(minWait, maxWait - (Date.now() - first)));
        }
    };
};

/**
 * Job superclass for all jobs. To add new job type you need to:
 * 1. Define job class which has to be single export from a node.js module. This module can be either in api/jobs folder (API job), 
 *    or in a plugins/plugin/api/jobs folder (plugin job). Job name is assigned automatically to have the form of "[API or plugin name]:[job file name]".
 * 2. Schedule a job by running any of the following (replace 'api:clear' with your Job name from point 1 above):
 *    - require('api/parts/jobs').job('api:clear', {some: 'data'}).now() - to run the job ASAP.
 *    - require('api/parts/jobs').job('api:clear', {some: 'data'}).in(5) - to run the job in 5 seconds from now.
 *    - require('api/parts/jobs').job('api:clear', {some: 'data'}).once(new Date() or Date.now()) - to run the job on specified date.
 *    - require('api/parts/jobs').job('api:clear', {some: 'data'}).schedule("once in 2 hours") - to run the job on specified schedule, see https://bunkat.github.io/later/parsers.html#text for examples.
 *    NOTE! For most jobs, scheduling must be done either from master process, or from plugins.register("/master", ...) to eliminate multiple replacing on app start.
 * 3. Optionally set allowed concurrency (maximum running jobs of this type at any point in time) of the job by overriding getConcurrency method in your job class.
 * 4. Optionally allow the job to be divided by overriding divide in your job class. Resulted subjobs (or subs) will be run as separte jobs in parallel to improve performance.
 *
 * There are 3 useful Job subclasses already implemented:
 * ResourcefulJob is used when job requires some persistent resource to run on. Read - network connection, memory cache, etc.
 * IPCJob which extends ResourcefulJob is used when resource needs to live in a separate from Countly master process. Example - push which runs a 
 * TransientJob which extends IPCJob is used when job shouldn't be saved in jobs collection with all status updates being run through IPC.
 */
class Job extends EventEmitter {
    /**
    * Create job instance
    * @param {string} name - name of the job
    * @param {object} data - data about the job
    **/
    constructor(name, data) {
        super();
        if (typeof name === 'object') {
            this._json = name;
            if (this._json._id && typeof this._json._id === 'string') {
                this._json._id = new ObjectID(this._json._id);
            }
        }
        else {
            this._json = {
                //	_id: ObjectId
                name: name,
                created: Date.now(),
                status: STATUS.SCHEDULED,
                started: null,	// timestamp
                finished: null,	// timestamp
                duration: 0,	// seconds
                data: data || {}
                //	size: 0,
                //	done: 0,
                //	bookmark: null,	// anything
                //	error: ''
                //  data: {},
                //  subs: [
                //  	{_id: same ObjectId, idx: 0, name: 'same or other name', created, status, started, finished, duration, size, done, bookmark, error, data},
                //  	{_id: same ObjectId, idx: 1, name: 'same or other name', created, status, started, finished, duration, size, done, bookmark, error, data}
                //	],
            };
        }
        this._replace = false;
        this._errorCount = 0;

    }

    /**
    * Get job id with fallback
    * @returns {string} job id
    **/
    get id() {
        return this._json._id ? '' + this._json._id : undefined;
    }

    /**
    * Get job id
    * @returns {string} job id
    **/
    get _id() {
        return this._json._id;
    }

    /**
    * Get job channel
    * @returns {string} job channel id
    **/
    get channel() {
        return (this.id || '') + (this.isInExecutor ? ':executor' : '');
    }

    /**
    * Get job name
    * @returns {string} job name
    **/
    get name() {
        return this._json.name;
    }

    /**
    * Get job data
    * @returns {object} job data
    **/
    get data() {
        return this._json.data || {};
    }

    /**
    * Get job status
    * @returns {number} job status
    **/
    get status() {
        return this._json.status;
    }

    /**
    * Check if job is completed
    * @returns {boolean} if job was completed
    **/
    get isCompleted() {
        return this._json.status === STATUS.DONE;
    }

    /**
    * Check if job was aborted
    * @returns {boolean} if job was aborted
    **/
    get isAborted() {
        return this._json.status === STATUS.ABORTED;
    }

    /**
    * Check if job is running
    * @returns {boolean} if job is running
    **/
    get canRun() {
        return this._json.status === STATUS.RUNNING;
    }

    /**
    * Get schedule object
    * @returns {object} schedule object from later js
    **/
    get scheduleObj() {
        return this._json.schedule;
    }

    /**
    * Get strict schedule value
    * @returns {boolean} strict
    **/
    get strict() {
        return this._json.strict;
    }

    /**
    * Get next run time
    * @returns {object} next run
    **/
    get next() {
        return this._json.next;
    }


    /**
    * Schedule job
    * @param {object} schedule - schedule object from later js
    * @param {number} strict (optional) - maximum time in ms after each schedule occurrence date the job must be run, otherwise it'd be discarded
    * @param {object} nextTime (optional) - next run time
    * @returns {object} result of saving job
    **/
    schedule(schedule, strict, nextTime) {
        this._json.schedule = schedule;
        this._json.status = STATUS.SCHEDULED;

        if (strict !== undefined) {
            this._json.strict = strict;
        }

        if (nextTime) {
            this._json.next = nextTime;
        }
        else {
            schedule = typeof schedule === 'string' ? later.parse.text(schedule) : schedule;
            var next = later.schedule(schedule).next(1);
            if (!next) {
                return null;
            }

            this._json.next = next.getTime();
        }

        return this._save();
    }

    /**
    * Run job once
    * @param {number|Date} date - date when to run
    * @param {number} strict (optional) - maximum time in ms after scheduled date the job must be run, otherwise it'd be discarded
    * @returns {object} result of saving job
    **/
    once(date, strict) {
        this._json.next = typeof date === 'number' ? date : date.getTime();
        if (strict !== undefined) {
            this._json.strict = strict;
        }

        return this._save();
    }

    /**
    * Run job now
    * @returns {object} result of saving job
    **/
    now() {
        this._json.next = Date.now();
        return this._save();
    }

    /**
    * Run job in providd amount of seconds
    * @param {number} seconds - after how many seconds to run the job
    * @returns {object} result of saving job
    **/
    in(seconds) {
        this._json.next = Date.now() + seconds * 1000;
        return this._save();
    }

    /**
    * Replace existing job if, it exists
    * @returns {object} self
    **/
    replace() {
        if (this.isInExecutor) {
            throw new Error('Replace cannot be run from executor');
        }
        this._replace = true;
        return this;
    }

    /**
    * Update job atomically
    * @param {object} db - database connection
    * @param {object} match - query for job
    * @param {object} update - update query for job
    * @param {boolean=} neo - should return new document
    * @returns {Promise} promise
    **/
    static updateAtomically(db, match, update, neo = true) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').findAndModify(match, [['_id', 1]], update, {new: neo}, (err, doc) => {
                if (err) {
                    reject(err);
                }
                else if (!doc || !doc.ok || !doc.value) {
                    reject('Job not found');
                }
                else {
                    resolve(doc.value);
                }
            });
        });
    }

    /**
    * Update job
    * @param {object} db - database connection
    * @param {object} match - query for job
    * @param {object} update - update query for job
    * @returns {Promise} promise
    **/
    static update(db, match, update) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').updateOne(match, update, (err, res) => {
                if (err || !res) {
                    reject(err || 'no res');
                }
                else {
                    resolve(res.matchedCount ? true : false);
                }
            });
        });
    }

    /**
    * Update multiple jobs
    * @param {object} db - database connection
    * @param {object} match - query for job
    * @param {object} update - update query for job
    * @returns {Promise} promise
    **/
    static updateMany(db, match, update) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').updateMany(match, update, (err, res) => {
                if (err || !res) {
                    reject(err || 'no res');
                }
                else {
                    resolve(res.matchedCount || 0);
                }
            });
        });
    }

    /**
    * Insert new job
    * @param {object} db - database connection
    * @param {object} data - job document to insert
    * @returns {Promise} promise
    **/
    static insert(db, data) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').insertOne(data, (err, res) => {
                if (err || !res) {
                    reject(err || 'no res');
                }
                else if (res.insertedCount) {
                    data._id = data._id || res.insertedId;
                    resolve(data);
                }
                else {
                    resolve(null);
                }
            });
        });
    }

    /**
    * Read job
    * @param {object} db - database connection
    * @param {string} id - id of the job
    * @returns {Promise} promise
    **/
    static load(db, id) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').findOne({_id: typeof id === 'string' ? db.ObjectID(id) : id}, (err, job) => {
                if (err || !job) {
                    reject(err || 'no res');
                }
                else {
                    resolve(job);
                }
            });
        });
    }

    /**
    * Read multiple jobs
    * @param {object} db - database connection
    * @param {object} match - query for jobs
    * @returns {Promise} promise
    **/
    static findMany(db, match) {
        return new Promise((resolve, reject) => {
            db.collection('jobs').find(match).toArray((err, jobs) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(jobs || []);
                }
            });
        });
    }

    /**
    * Replace jobs that will run after provided timestamp
    * @param {number} next - timestamp
    * @param {function} queror - function which modifies query request
    * @returns {Promise} promise
    **/
    replaceAfter(next, queror) {
        log.d('[!!!!!!!!] %s: replaceAfter %d (%d %j)', this._id, next, this.next, this.data);
        return new Promise((resolve, reject) => {
            let query = {
                status: STATUS.SCHEDULED,
                name: this.name,
                next: {$gte: next}
            };
            if (this._id) {
                query._id = {$ne: this._id};
            }
            if (this.data && Object.keys(this.data).length) {
                query.data = this.data;
            }
            if (queror) {
                queror(query);
            }

            log.d('[!!!!!!!!] %s: replaceAfter %d query', this._id, next, query);

            Job.updateAtomically(this.db(), query, {$set: {next: next}}).then(arg => {
                log.d('[!!!!!!!!] %s: replaceAfter %d RESOLVE UPDATED: %j', this._id, next, arg);
                resolve(arg);
            }, err => {
                log.d('[!!!!!!!!] %s: replaceAfter %d ERROR %j', this._id, next, err);
                if (err === 'Job not found') {
                    query.next = {$lt: next};
                    Job.findMany(this.db(), query).then(existing => {
                        log.d('[!!!!!!!!] %s: replaceAfter %d EXISTING %j', this._id, next, existing);
                        if (existing && existing.length) {
                            log.d('[!!!!!!!!] %s: replaceAfter %d RESOLVE EXISTING', this._id, next);
                            resolve(existing[0]);
                        }
                        else {
                            log.d('[!!!!!!!!] %s: replaceAfter %d NEW JOB', this._id, next);
                            new Job(this.name, this.data).once(next).then((arg) => {
                                log.d('[!!!!!!!!] %s: replaceAfter %d NEW JOB CREATED %j', this._id, next, arg);
                                resolve(arg);
                            }, (e2) => {
                                log.d('[!!!!!!!!] %s: replaceAfter %d NEW JOB ERROR %j', this._id, next, e2);
                                reject(e2);
                            });
                        }
                    }, reject);
                }
                else {
                    reject(err);
                }
            });
        });
    }

    /**
    * Replace all jobs
    * @param {number} next - timestamp
    * @returns {object} job data
    **/
    async _replaceAll() {

        let query = {
            status: STATUS.SCHEDULED,
            name: this.name
        };
        if (this.data && Object.keys(this.data).length) {
            query.data = this.data;
        }

        log.i('Replacing jobs %s (%j)', this.name, query);

        if (this._json.schedule) {
            // query.next = {$lte: Date.now() + 30000};
            let updated = await Job.updateMany(this.db(), query, {$set: {status: STATUS.CANCELLED}});
            if (updated) {
                log.i('Cancelled %d previous jobs %s (%j)', updated, this.name, query);
            }

            // delete query.next;
        }

        let existing = await Job.findMany(this.db(), query);
        if (existing.length === 1 && (existing[0].schedule && existing[0].schedule === this._json.schedule)) {
            log.i('No need for replace of %s (%j): existing job %j', this.name, this.data, existing[0]);
            this._json = existing[0];
            return existing[0];

        }
        else if (existing.length === 0) {
            log.i('No job to replace, inserting %j', this._json);
            let inserted = await Job.insert(this.db(), this._json);
            if (!inserted) {
                throw new Error('Cannot insert a job');
            }
            this._json = inserted;
            return inserted;
        }
        else {
            let last = existing.sort((a, b) => b.next - a.next)[0],
                others = existing.filter(a => a !== last);

            log.i('replacing last job %j with %j', last, this._json);

            if (others.length) {
                await Job.updateMany(this.db(), {_id: {$in: others.map(o => o._id)}}, {$set: {status: STATUS.CANCELLED}});
            }

            let neo;
            try {
                neo = await Job.updateAtomically(this.db(), query, {$set: this._json});
            }
            catch (e) {
                log.w('Job was modified while rescheduling, skipping', e);
            }

            if (!neo) {
                log.w('Job was modified while rescheduling, skipping');
                return null;
            }
            this._json = neo;
            return neo;
        }
    }

    /**
    * Save job
    * @param {boolean} set - if should update instead of creating
    * @returns {object} job data
    **/
    async _save(set) {
        if (set) {
            log.d('Updating job %s with %j', this.id, set);
        }
        else {
            log.d('Creating job %s with data %j', this.name, this.data);
        }

        if (this._replace) {
            return await this._replaceAll();
        }
        else if (this._id) {
            if (set) {
                Object.keys(set).forEach(k => {
                    this._json[k] = set[k];
                });
            }
            else {
                set = Object.assign({}, this._json);
                delete set._id;
            }

            set.modified = Date.now();
            if (this._json.started || set.started) {
                set.duration = set.modified - (this._json.started || set.started);
            }

            let updated = await Job.update(this.db(), {_id: this._id}, {$set: set});
            if (updated) {
                return set;
            }
            else {
                throw new Error('No such job in db');
            }
        }
        else {
            Object.keys(set || {}).forEach(k => {
                this._json[k] = set[k];
            });

            let inserted = await Job.insert(this.db(), this._json);
            if (inserted) {
                return inserted;
            }
            else {
                throw new Error('Cannot insert a job');
            }
        }
    }

    // _save (set) {
    // 	return new Promise((resolve, reject) => {
    // 		try {
    // 			this._json.modified = Date.now();
    // 			var query, update, clb = (err, res) => {
    // 				if (err) { 
    // 					if (this._errorCount++ < MAXIMUM_SAVE_ERRORS) {
    // 						log.w('Error while saving job: %j', err);
    // 						setTimeout(() => {
    // 							this._save(set).then(resolve.bind(null, set), reject);
    // 						}, 1000); 
    // 					} else {
    // 						log.e('Error while saving job: %j', err);
    // 						reject(err);
    // 					}
    // 				} else if (res.result.nModified === 0) {
    // 					log.e('Job %s has been changed while doing _save: %j / setting %j for query %j', this._id, this._json, update, query);
    // 					reject('Job cannot be found while doing _save');
    // 				} else {
    // 					resolve(set || this._json);
    // 				}
    // 			};

    // 			if (this._replace) {
    // 				query = {status: STATUS.SCHEDULED, name: this.name};
    // 				if (this.data) { query.data = this.data; }

    // 				if (this._json.schedule) {
    // 					let schedule = typeof this._json.schedule === 'string' ? later.parse.text(this._json.schedule) : this._json.schedule,
    // 						prev = later.schedule(schedule).prev(1);

    // 					log.i('replacing job %j with', query, this._json);
    // 					this.db().collection('jobs').find(query).toArray((err, jobs) => {
    // 						if (err) {
    // 							log.e('job replacement error when looking for existing jobs to replace', err);
    // 							this.db().collection('jobs').save(this._json, clb);
    // 						} else if (jobs && jobs.length) {
    // 							try {
    // 							let last = jobs.sort((a, b) => b.next - a.next)[0];
    // 							let others = jobs.filter(a => a !== last);
    // 							if (others.length) {
    // 								log.i('found %d jobs with %j, going to cancel %j', jobs.length, query, others.map(j => j._id));
    // 								Promise.all(others.map(j => {
    // 									return require('./index.js').create(j).cancel(this.db(), false);
    // 								}));
    // 								// this.db().collection('jobs').update({_id: {$in: others.map(j => j._id)}}, {$set: {status: STATUS.CANCELLED}}, {multi: true}, log.logdb(''));
    // 							}

    // 							if (last.schedule === this._json.schedule && last.next > prev.getTime()) {
    // 								// just do nothing
    // 								log.i('last job is scheduled correctly, won\'t replace anything for %j: current %j, won\'t replace to %j', query, new Date(last.next), new Date(this.next));
    // 								resolve(set);
    // 							} else {
    // 								log.i('replacing last job %j with %j', last, this._json);
    // 								this.db().collection('jobs').findAndModify(query, [['_id', 1]], {$set: this._json}, {new: true}, (err, job) => {
    // 									if (err) {
    // 										log.e('job replacement error, saving new job', err, job);
    // 										this.db().collection('jobs').save(this._json, clb);
    // 									} else if (job && !job.value){
    // 										log.i('no job found to replace, saving new job', err, job);
    // 										this.db().collection('jobs').save(this._json, clb);
    // 									} else {
    // 										log.i('job replacing done', job.value);
    // 										resolve(set);
    // 									}
    // 								});
    // 							}
    // 						}catch(e) { log.e(e, e.stack); }
    // 						} else {
    // 							log.i('no jobs found to replace for %j, saving new one', query);
    // 							this.db().collection('jobs').save(this._json, clb);
    // 						}
    // 					});
    // 				} else {
    // 					this.db().collection('jobs').findAndModify(query, [['_id', 1]], {$set: this._json}, {new: true}, (err, job) => {
    // 						if (err) {
    // 							log.e('job replacement error, saving new job', err, job);
    // 							this.db().collection('jobs').save(this._json, clb);
    // 						} else if (job && !job.value){
    // 							log.i('no job found to replace, saving new job', err, job);
    // 							this.db().collection('jobs').save(this._json, clb);
    // 						} else {
    // 							log.i('job replacing done', job.value);
    // 							resolve(set);
    // 						}
    // 					});
    // 				}


    // 			} else if (this._json._id) {
    // 				if (set) {
    // 					for (let k in set) {
    // 						if (k !== '_id') {
    // 							this._json[k] = set[k];
    // 						}
    // 					}
    // 				}
    // 				query = {_id: this._json._id};
    // 				update = {$set: set || this._json};
    // 				update.$set.modified = this._json.modified;
    // 				delete update.$set._id;
    // 				log.d('saving %j: %j', query, update);
    // 				this.db().collection('jobs').updateOne(query, update, clb);
    // 			} else {
    // 				log.d('saving %j', this._json);
    // 				this._json._id = this.db().ObjectID();
    // 				this.db().collection('jobs').save(this._json, clb);
    // 			}
    // 		} catch(e) {
    // 			log.e(e, e.stack);
    // 			throw e;
    // 		}
    // 	}).then(() => { this._replace = false; return set; });
    // }

    /**
    * Get database connection
    * @returns {object} db
    **/
    db() {
        return require('./index.js').db;
    }

    /**
    * Abort job
    * @param {Error} err - error with which to abort
    * @returns {Promise} promise
    **/
    _abort(err) {
        log.d('%s: aborting', this.channel);
        return this._finish(err || 'Aborted');
        // if (this.retryPolicy().errorIsRetriable(err)) {
        // 	log.d('%s: won\'t abort since error %j is retriable', this._idIpc, err);
        // } else {
        // 	log.d('%s: aborting', this._idIpc);
        // 	return this._finish(err || 'Aborted');
        // }
    }

    /**
    * Finish job
    * @param {Error=} err - error with which to finish
    * @returns {Promise} promise
    **/
    _finish(err) {
        if (this.isCompleted) {
            return Promise.resolve();
        }
        else {
            log.d('%s: finishing', this.id);
            this._json.status = STATUS.DONE;
            this._json.finished = Date.now();
            this._json.duration = this._json.finished - this._json.started;
            this._json.error = err ? (err.message || err.code || (typeof err === 'string' ? err : JSON.stringify(err))) : null;
            this.emit(EVT.DONE, this._json);
            return this._save({
                status: this._json.status,
                finished: this._json.finished,
                duration: this._json.duration,
                error: this._json.error
            });
        }
    }

    /**
    * Internal run function for managing states
    * @returns {Promise} promise
    **/
    _run() {
        return new Promise((resolve, reject) => {
            this._json.status = STATUS.RUNNING;
            this._json.started = Date.now();
            this._save({
                status: STATUS.RUNNING,
                started: this._json.started
            }).then(() => {
                try {
                    let promise = this.run(
                        this.db(),
                        (err) => {
                            log.d('%s: done running: error %j', this.id, err);
                            if (!this.isCompleted) {
                                this._finish(err).then(
                                    err ? reject.bind(null, err) : resolve,
                                    err ? reject.bind(null, err) : reject
                                );
                            }
                        },
                        () => {});

                    if (promise && promise instanceof Promise) {
                        promise.then(() => {
                            log.d('%s: done running', this.id);
                            this._finish().then(resolve, resolve);
                        }, (err) => {
                            log.d('%s: done running: error %j', this.id, err);
                            if (!this.isCompleted) {
                                this._finish(err).then(reject.bind(null, err), reject.bind(null, err));
                            }
                        });
                    }
                }
                catch (e) {
                    log.e('[%s] caught error when running: %j / %j', this.channel, e, e.stack);
                    this._finish(e).then(reject.bind(null, e), reject.bind(null, e));
                }
            }, reject);
        });
    }

    /**
    * Run job with retry policy applied
    * @returns {Promise} promise
    **/
    _runWithRetries() {
        return this.retryPolicy().run(this._run.bind(this));
    }

    /**
	 * Override in actual job class
	 * Takes 2 parameters omitted for the sake of ESLint:
	 * 		- db - db connection which must be used for this job in most cases, otherwise you're responsible for opening / closing an appropriate connection
	 * 		- done - function which must be called (when promise is not returned) when job processing is done with either no arguments or error string
	 * 		
	 */
    run(/*db, done*/) {
        throw new Error('Job must be overridden');
    }

    /**
	 * Override if job needs a graceful cancellation. Job is cancelled in two cases:
	 * 		1. When server is restarted and last modification of the job was too long ago to consider it not running (becauseOfRestart = true).
	 * 		2. When server was not running at the time strict job should have been run (becauseOfRestart = false).
     * @returns {Promise} promise
	 */
    cancel(/*db, becauseOfRestart*/) {
        return this._save({
            status: STATUS.CANCELLED,
            error: 'Cancelled on restart',
            modified: Date.now(),
            finished: Date.now()
        });
    }

    /**
	 * Override if default policy isn't good enough
     * @returns {RetryPolicy} retry policy
	 */
    retryPolicy() {
        return new retry.DefaultRetryPolicy(3);
    }

    /**
	 * Override if job needs a manager instance to run
     * @returns {Promise} promise
	 */
    prepare(/*manager, db*/) {
        return Promise.resolve();
    }

    /**
	 * Override if 0 doesn't work for this job:
	 *  0 = default = run jobs of this type on any number of servers, with any number of jobs running at the same time
	 *  1 ... N = run not more than N jobs of this time at the same time
     * @returns {number} concurrency
	 */
    getConcurrency() {
        return 0;
    }
}

/**
 * Job which needs some resource to run: socket, memory cache, etc.
 * Resource lives longer than a single job and reassigned from one job to another when first one is done. 
 */
class ResourcefulJob extends Job {
    /** Create resource **/
    createResource(/*_id, name, options */) {
        throw new Error('ResourcefulJob.createResource must be overridden to return possibly open resource instance');
    }

    /** Release resource **/
    releaseResource(/* resource */) {
        throw new Error('ResourcefulJob.releaseResource must be overridden to return possibly open resource instance');
    }

    /** Get resource name **/
    resourceName() {
        throw new Error('ResourcefulJob.resourceName must be overridden to return non-unique string which identifies type of a resource');
    }
}

/**
 * Job which runs in 2 processes:
 * - Initiator process (Countly master) creates subprocess (fork of executor.js) and processes IPC messages from subprocess
 * - Subprocess actually runs the job, but sends state updates through IPC, keeping all listeners aware of its lifecycle
 *
 * This complex structure gives following advantage:
 * - Subprocess can safely crash, initiator process will be able to just restart the job in a new subprocess from the point it stopped.
 * 
 * Extends ResourcefulJob, meaning job resource can live longer than job and reassigned to other job after current job is done.
 *
 * Works in combination with IPCFaçadeJob which listens for IPC status messages from subprocess and persists them in DB.
 */
class IPCJob extends ResourcefulJob {

    /**
    * Check if job is run in executor
    * @returns {boolean} if job is run in executor
    **/
    get isInExecutor() {
        return process.argv[1].endsWith('executor.js');
    }

    /**
    * Get retry policy
    * @returns {RetryPolicy} retry policy
    **/
    retryPolicy() {
        return new retry.IPCRetryPolicy(1);
    }

    /**
    * Release resource
    * @returns {Promise} promise
    **/
    releaseResource(/* resource */) {
        return Promise.resolve();
    }

    /**
    * Save resource data
    * @param {object} data - resource data
    * @returns {Promise} promise
    **/
    _save(data) {
        if (process.send) {
            log.d('[%d]: Sending progress update %j', process.pid, {
                _id: this.channel,
                cmd: EVT.UPDATE,
                from: process.pid,
                data: data
            });
            process.send({
                _id: this.channel,
                cmd: EVT.UPDATE,
                from: process.pid,
                data: data
            });
        }
        return super._save.apply(this, arguments);
    }
}
/** Listens for IPC status messages from subprocess and persists them in DB **/
class IPCFaçadeJob extends ResourcefulJob {
    /**
    * Constructor
    * @param {Job} job - job
    * @param {function} getResourceFaçade - function to get resource
    **/
    constructor(job, getResourceFaçade) {
        super(job._json, null, null);
        this.job = job;
        this.getResourceFaçade = getResourceFaçade;
    }

    /**
    * Create resource
    * @returns {object} resource
    **/
    createResource() {
        log.d('[%s] IPCFaçadeJob creates a resource', this.job.channel);
        return this.getResourceFaçade();
    }

    /**
    * Get resource name
    * @returns {string} resource name
    **/
    resourceName() {
        return this.job.resourceName();
    }

    /**
    * Release resource
    * @param {object} resource to release
    * @returns {Promise} promise
    **/
    releaseResource(resource) {
        log.d('[%s] IPCFaçadeJob releases its resource', this.job.channel);
        return this.job.releaseResource(resource);
    }

    /**
    * Get retry policy
    * @returns {RetryPolicy} retry policy
    **/
    retryPolicy() {
        return this.job.retryPolicy();
    }

    /**
    * Run the job
    * @returns {Promise} promise
    **/
    _run() {
        log.d('[%s] Running in IPCFaçadeJob', this.job.channel);
        try {
            this.resourceFaçade = this.getResourceFaçade();
        }
        catch (e) {
            log.d('[%s] Caught Façade error: %j', this.job.channel, e);
            return Promise.reject(e);
        }

        this.ipcChannel = new ipc.IdChannel(this.job.channel).attach(this.resourceFaçade._worker);
        this.ipcChannel.on(EVT.UPDATE, (json) => {
            log.d('[%s] UPDATE in IPCFaçadeJob: %j', this.job.channel, json);
            for (var k in json) {
                this.job._json[k] = json[k];
            }
            if (json.status) {
                this.emit(EVT.UPDATE, json);
            }
        });

        return this.resourceFaçade.run(this).then(() => {
            this.ipcChannel.remove();
        }, (error) => {
            this.ipcChannel.remove();
            log.e('[%s] Error in IPCFaçadeJob %s: %j / %j', this.job.channel, this.resourceFaçade._id, error, error.stack);
            this.job._finish(error || 'Aborted').catch(()=>{});
            throw error;
        });
    }

    /**
    * Abort the job
    * @param {Error} error - error with which to abort
    **/
    _abort(error) {
        log.w('%s: ABORTING in IPCFaçadeJob', this.job.channel);
        this.resourceFaçade.abort(error);
    }
}

/** Class for transiend jobs **/
class TransientJob extends IPCJob {
    /**
    * Send data for current channel
    * @param {object} data - data to send
    **/
    _sendAndSave(data) {
        log.d('[%s] transient _sendAndSave: %j', this.channel, data);
    }

    /**
    * Save data
    * @param {object} data - data to save
    * @returns {Promise} promise
    **/
    _save(data) {
        if (process.send) {
            log.d('[%d]: Sending progress update %j', process.pid, {
                _id: this.channel,
                cmd: EVT.UPDATE,
                from: process.pid,
                data: data
            });
            process.send({
                _id: this.channel,
                cmd: EVT.UPDATE,
                from: process.pid,
                data: data
            });
        }
        if (data) {
            for (let k in data) {
                if (k !== '_id') {
                    this._json[k] = data[k];
                }
            }
        }
        return Promise.resolve(data);
    }
}

module.exports = {
    EVT: EVT,
    ERROR: ERROR,
    Job: Job,
    IPCJob: IPCJob,
    IPCFaçadeJob: IPCFaçadeJob,
    TransientJob: TransientJob,
    STATUS: STATUS,
    STATUS_MAP: STATUS_MAP,
    debounce: debounce
};