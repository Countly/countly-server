'use strict';

/* jshint ignore:start */

const EventEmitter = require('events'),
	later = require('later'),
	ipc = require('./ipc.js'),
	log = require('../../utils/log.js')('jobs:job'),
	retry = require('./retry.js'),
	ObjectID = require('mongoskin').ObjectID;

const STATUS = {
		SCHEDULED: 0,
		RUNNING: 1,
		DONE: 2,
		CANCELLED: 3,
		ABORTED: 4,
		PAUSED: 5,
		WAITING: 6
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
 */
const debounce = function (func, minWait, maxWait) {
    var timeout, first, args, context, 
        later = function() {
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
            later();
        } else {
            timeout = setTimeout(later, Math.min(minWait, maxWait - (Date.now() - first)));
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
	constructor(name, data) {
		super();
		if (typeof name === 'object') {
			this._json = name;
			if (this._json._id && typeof this._json._id === 'string') {
				this._json._id = new ObjectID(this._json._id);
			}
		} else {
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

	get id () { return this._json._id ? '' + this._json._id : undefined; }
	get _id () { return this._json._id; }
	get channel () { return (this.id || '') + (this.isInExecutor ? ':executor' : ''); }
	get name () { return this._json.name; }
	get data () { return this._json.data || {}; }
	get status () { return this._json.status; }
	get isCompleted () { return this._json.status === STATUS.DONE; }
	get isAborted () { return this._json.status === STATUS.ABORTED; }
	get canRun () { return this._json.status === STATUS.RUNNING; }
	get scheduleObj () { return this._json.schedule; }
	get strict () { return this._json.strict; }
	get next () { return this._json.next; }


	schedule (schedule, strict, nextTime) {
		this._json.schedule = schedule;
		this._json.status = STATUS.SCHEDULED;

		if (strict) {
			this._json.strict = strict;
		}

		if (nextTime) {
			this._json.next = nextTime;
		} else {
			schedule = typeof schedule === 'string' ? later.parse.text(schedule) : schedule;
			var next = later.schedule(schedule).next(1);
			if (!next) { return null; }

			this._json.next = next.getTime();
		}

		return this._save();
	}

	once (date, strict) {
		this._json.next = typeof date === 'number' ? date : date.getTime();
		if (strict) {
			this._json.strict = strict;
		}
	
		return this._save();
	}

	now () {
		this._json.next = Date.now();
		return this._save();
	}

	in (seconds) {
		this._json.next = Date.now() + seconds * 1000;
		return this._save();
	}

	replace () {
		if (this.isInExecutor) {
			throw new Error('Replace cannot be run from executor');
		}
		this._replace = true;
		return this;
	}

	static updateAtomically (db, match, update, neo=true) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').findAndModify(match, [['_id', 1]], update, {new: neo}, (err, doc) => {
				if (err) { reject(err); } 
				else if (!doc || !doc.ok || !doc.value) { reject('Not found'); }
				else { resolve(doc.value); }
			});
		});
	}

	static update (db, match, update) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').updateOne(match, update, (err, res) => {
				if (err || !res) { reject(err || 'no res'); } 
				else { resolve(res.matchedCount ? true : false); }
			});
		});
	}

	static updateMany (db, match, update) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').updateMany(match, update, (err, res) => {
				if (err || !res) { reject(err || 'no res'); } 
				else { resolve(res.matchedCount || 0); }
			});
		});
	}

	static insert (db, data) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').insertOne(data, (err, res) => {
				if (err || !res) { reject(err || 'no res'); } 
				else if (res.insertedCount) { 
					data._id = data._id || res.insertedId;
					resolve(data); 
				} else {
					resolve(null);
				}
			});
		});
	}

	static load (db, id) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').findOne({_id: typeof id === 'string' ? db.ObjectID(id) : id}, (err, job) => {
				if (err || !job) { reject(err || 'no res'); } 
				else { resolve(job); }
			});
		});
	}

	static findMany (db, match) {
		return new Promise((resolve, reject) => {
			db.collection('jobs').find(match).toArray((err, jobs) => {
				if (err) { reject(err); } 
				else { resolve(jobs || []); }
			});
		});
	}

	replaceAfter (next) {
		log.i('Replacing job %s (%j) with date %d', this.name, this.data, next);
		return new Promise((resolve, reject) => {
			let query = {status: STATUS.SCHEDULED, name: this.name, next: {$gte: next}};
			if (this.data && Object.keys(this.data).length) { query.data = this.data; }

			Job.updateAtomically(this.db(), query, {$set: {next: next}}).then(resolve, err => {
				if (err === 'Not found') {
					query.next = {$lt: next};
					Job.findMany(this.db(), query).then(existing => {
						if (existing.length) {
							resolve();
						} else {
							this._json.next = next;
							this.db().collection('jobs').save(this._json, err => err ? reject(err) : resolve());
						}
					}, reject);
				} else {
					reject(err);
				}
			});
		});
	}

	async _replaceAll () {
		
		let query = {status: STATUS.SCHEDULED, name: this.name};
		if (this.data && Object.keys(this.data).length) { query.data = this.data; }

		log.i('Replacing jobs %s (%j)', this.name, query);

		if (this._json.schedule) {
			let schedule = typeof this._json.schedule === 'string' ? later.parse.text(this._json.schedule) : this._json.schedule,
				prev = later.schedule(schedule).prev(1).getTime();

			query.next = {$lte: prev};
			let updated = await Job.updateMany(this.db(), query, {$set: {status: STATUS.CANCELLED}});
			if (updated) {
				log.i('Cancelled %d previous jobs %s (%j)', updated, this.name, query);
			}
	
			delete query.next;
		}

		let existing = await Job.findMany(this.db(), query);
		if (existing.length === 1) {
			log.i('No need for replace of %s (%j): existing job %j', this.name, this.data, existing[0]);
			this._json = existing[0];
			return existing[0];
		
		} else if (existing.length === 0) {
			log.i('No job to replace, inserting %j', this._json);
			let inserted = await Job.insert(this.db(), this._json);
			if (!inserted) {
				throw new Error('Cannot insert a job');
			}
			this._json = inserted;
			return inserted;
		} else {
			let last = existing.sort((a, b) => b.next - a.next)[0],
				others = existing.filter(a => a !== last);
			
			log.i('replacing last job %j with %j', last, this._json);
		
			if (others.length) {
				await Job.updateMany(this.db(), {_id: {$in: others.map(o => o._id)}}, {$set: {status: STATUS.CANCELLED}});
			}

			let neo = await Job.updateAtomically(this.db(), query, {$set: this._json});
			if (!neo) {
				log.w('Job was modified while rescheduling, skipping');
				return null;
			}
			this._json = neo;
			return neo;
		}
	}

	async _save (set) {
		if (set) {
			log.d('Updating job %s with %j', this.id, set);
		} else {
			log.d('Creating job %s with data %j', this.name, this.data);
		}

		if (this._replace) {
			return await this._replaceAll();
		} else if (this._id) {
			if (set) {
				Object.keys(set).forEach(k => {
					this._json[k] = set[k];
				});
			} else {
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
			} else {
				throw new Error('No such job in db');
			}
		} else {
			Object.keys(set || {}).forEach(k => {
				this._json[k] = set[k];
			});

			let inserted = await Job.insert(this.db(), this._json);
			if (inserted) {
				return inserted;
			} else {
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

	db () {
		return require('./index.js').db;
	}

	_abort (err) {
		log.d('%s: aborting', this.channel);
		return this._finish(err || 'Aborted');
		// if (this.retryPolicy().errorIsRetriable(err)) {
		// 	log.d('%s: won\'t abort since error %j is retriable', this._idIpc, err);
		// } else {
		// 	log.d('%s: aborting', this._idIpc);
		// 	return this._finish(err || 'Aborted');
		// }
	}

	_finish (err) {
		if (this.isCompleted) {
			return Promise.resolve();
		} else {
			log.d('%s: finishing', this.id);
			this._json.status = STATUS.DONE;
			this._json.finished = Date.now();
			this._json.duration = this._json.finished - this._json.started;
			this._json.error = err ? (err.message || err.code || (typeof err === 'string' ? err : JSON.stringify(err))) : null;
			this.emit(EVT.DONE, this._json);
			return this._save({status: this._json.status, finished: this._json.finished, duration: this._json.duration, error: this._json.error});
		}
	}

	_run () {
		return new Promise((resolve, reject) => {
			this._json.status = STATUS.RUNNING;
			this._json.started = Date.now();
			this._save({status: STATUS.RUNNING, started: this._json.started});

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
			} catch (e) {
				log.e('[%s] caught error when running: %j / %j', this.channel, e, e.stack);
				this._finish(e).then(reject.bind(null, e), reject.bind(null, e));
			}
		});
	}

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
	run (/*db, done*/) {
		throw new Error('Job must be overridden');
	}

	/**
	 * Override if job needs a graceful cancellation. Job is cancelled in two cases:
	 * 		1. When server is restarted and last modification of the job was too long ago to consider it not running (becauseOfRestart = true).
	 * 		2. When server was not running at the time strict job should have been run (becauseOfRestart = false).
	 */
	cancel (/*db, becauseOfRestart*/) {
		return this._save({status: STATUS.CANCELLED, error: 'Cancelled on restart', modified: Date.now(), finished: Date.now()});
	}

	/**
	 * Override if default policy isn't good enough
	 */
	retryPolicy () {
		return new retry.DefaultRetryPolicy(3);
	}

	/**
	 * Override if job needs a manager instance to run
	 */
	prepare (/*manager, db*/) {
		return Promise.resolve();
	}

	/**
	 * Override if 0 doesn't work for this job:
	 *  0 = default = run jobs of this type on any number of servers, with any number of jobs running at the same time
	 *  1 ... N = run not more than N jobs of this time at the same time
	 */
	getConcurrency () {
		return 0;
	}
}

/**
 * Job which needs some resource to run: socket, memory cache, etc.
 * Resource lives longer than a single job and reassigned from one job to another when first one is done. 
 */
class ResourcefulJob extends Job {
	createResource (/*_id, name, options */) {
		throw new Error('ResourcefulJob.createResource must be overridden to return possibly open resource instance');
	}

	releaseResource (/* resource */) {
		throw new Error('ResourcefulJob.releaseResource must be overridden to return possibly open resource instance');
	}

	resourceName () {
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
	
	get isInExecutor() { return process.argv[1].endsWith('executor.js'); }

	retryPolicy () {
		return new retry.IPCRetryPolicy(1);
	}

	releaseResource (/* resource */) {
		return Promise.resolve();
	}

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

class IPCFaçadeJob extends ResourcefulJob {
	constructor(job, getResourceFaçade) {
		super(job._json, null, null);
		this.job = job;
		this.getResourceFaçade = getResourceFaçade;
	}

	createResource () {
		log.d('[%s] IPCFaçadeJob creates a resource', this.job.channel);
		return this.getResourceFaçade();
	}

	resourceName () {
		return this.job.resourceName();
	}

	releaseResource (resource) {
		log.d('[%s] IPCFaçadeJob releases its resource', this.job.channel);
		return this.job.releaseResource(resource);
	}

	retryPolicy () {
		return this.job.retryPolicy();
	}

	_run() {
		log.d('[%s] Running in IPCFaçadeJob', this.job.channel);
		this.resourceFaçade = this.getResourceFaçade();

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
			this._finish(error || 'Aborted').catch(()=>{});
			throw error;
		});
	}

	_abort(error) {
		log.w('%s: ABORTING in IPCFaçadeJob', this.job.channel);
		this.resourceFaçade.abort(error);
	}
}

class TransientJob extends IPCJob {
	_sendAndSave(data) {
		log.d('[%s] transient _sendAndSave: %j', this.channel, data);
	}

	_save (data) {
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
	debounce: debounce
};
