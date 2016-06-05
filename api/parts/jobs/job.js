'use strict';

const EventEmitter = require('events'),
	  later = require('later'),
	  ipc = require('./ipc.js'),
	  log = require('../../utils/log.js')('jobs:job'),
	  ObjectID = require('mongoskin').ObjectID;

const STATUS = {
	SCHEDULED: 0,
	RUNNING: 1,
	DONE: 2,
	CANCELLED: 3,
	PAUSED: 4,
	WAITING: 5
}, 
ERROR = {
	CRASH: 'crash',
	TIMEOUT: 'job:timeout'
},
EVT = {
	PROGRESS: 'job:progress',
	SAVE: 'job:save',
	SAVED: 'job:saved',
	DONE: 'job:done',
	TRANSIENT_CHANNEL: 'jobs:transient',
	TRANSIENT_RUN: 'jobs:transient:run',
	TRANSIENT_DONE: 'jobs:transient:done'
},
MAXIMUM_SAVE_ERRORS = 5,
MAXIMUM_ERRORS = 1,
MAXIMUM_JOB_TIMEOUT = 30000;

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

		if (data) { 
			this._json.data = data;
		}
	}

	get _id () { return '' + this._json._id; }
	get _idIpc () { return this._id + (this._isSub() ? '|' + this._json.idx : ''); }
	get idx () { return this._json.idx; }
	get name () { return this._json.name; }
	get data () { return this._json.data; }
	get size () { return this._json.size; }
	get done () { return this._json.done; }
	get bookmark () { return this._json.bookmark; }
	get status () { return this._json.status; }
	get completed () { return this._json.status === STATUS.DONE; }
	get running () { return this._json.status === STATUS.RUNNING; }
	get scheduleObj () { return this._json.schedule; }
	get strict () { return this._json.strict; }
	get next () { return this._json.next; }
	get isSub () { return typeof this._json.idx !== 'undefined'; }

	schedule (schedule, strict, nextTime) {
		this._json.schedule = schedule;

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
		this._json.next = 0;
		return this._save();
	}

	in (seconds) {
		this._json.next = Date.now() + seconds * 1000;
		return this._save();
	}

	replace () {
		if (typeof this._json.idx !== 'undefined') {
			throw new Error('Replace cannot be run on a subjob');
		}
		this._replace = true;
		return this;
	}

	_save (set) {
		return new Promise((resolve, reject) => {
			try {
			var query, update, clb = (err, res) => {
				if (err) { 
					if (this._errorCount++ < MAXIMUM_SAVE_ERRORS) {
						log.w('Error while saving job: %j', err);
						setTimeout(() => {
							this._save(set).then(resolve.bind(null, set), reject);
						}, 1000); 
					} else {
						log.e('Error while saving job: %j', err);
						reject(err);
					}
				} else if (res.result.nModified === 0) {
					log.e('Job %s has been changed while doing _save: %j / setting %j', this._id, this._json, set);
					reject('Job cannot be found while doing _save');
				} else {
					resolve(set);
				}
			};

			if (this._replace) {
				query = {status: STATUS.SCHEDULED, name: name};
				if (this.data) { query.data = this.data; }

				log.i('replacing job %j with', query, this._json);
				this.db().collection('jobs').findAndModify(query, [['_id', 1]], {$set: this._json}, {new: true}, function(err, job){
					if (err) {
						log.e('job replacement error, saving new job', err, job);
						this.db().collection('jobs').save(this._json, clb);
					} else if (!job){
						log.i('no job found to replace, saving new job', err, job);
						this.db().collection('jobs').save(this._json, clb);
					} else {
						log.i('job replacing done', job.value);
						resolve(set);
					}
				});
			} else if (this._json._id) {
				if (set) {
					for (let k in set) {
						if (k !== '_id') {
							this._json[k] = set[k];
						}
					}
				}
				if (this._isSub()) {
					query = {_id: this._json._id, 'subs.idx': this._json.idx};
					if (set) {
						update = {$set: {}};
						for (let k in set) {
							update.$set['subs.$.' + k] = set[k];
						}
					} else {
						update = {$set: {'subs.$': this._json}};
					}
				} else {
					query = {_id: this._json._id};
					update = {$set: set || this._json};
				}
				delete update.$set._id;
				log.d('saving %j: %j', query, update);
				this.db().collection('jobs').updateOne(query, update, clb);
			} else {
				log.d('saving %j', this._json);
				this.db().collection('jobs').save(this._json, clb);
			}
		}catch(e) {
			log.e(e, e.stack);
			throw e;
		}
		}).then(() => { this._replace = false; return set; });
	}

	_subSaved () {
		let set = [{size: 0, done: 0}].concat(this._json.subs).reduce((p, c) => { 
			return {size: p.size + c.size || 0, done: p.done + c.done || 0}; 
		});

		set.error = this._json.error || (this._json.subs.find(s => !!s.error) || {}).error || null;
		set.status = !set.error && this._json.subs.filter(s => s.status !== STATUS.DONE).length ? STATUS.RUNNING : STATUS.DONE;
		set.duration = Date.now() - this._json.started;

		if (set.status === STATUS.DONE && !set.finished) {
			set.finished = Date.now();
		}

		log.d('Updating main job after sub update: %j', set);
		return this._save(set);
	}

	db () {
		return require('./index.js').db;
	}

	_isSub () {
		return typeof this._json.idx !== 'undefined';
	}

	_divide (subs) {
		if (this._isSub()) {
			throw new Error('Sub cannot have subs');
		}
		if (!this._json._id) {
			throw new Error('Not saved job cannot be divided');
		}
		
		this._json.subs = subs.map((s, i) => {
			let sub = s;
			sub._id = this._json._id;		// ObjectId
			sub.status = STATUS.SCHEDULED;
			sub.name = this.name;
			sub.created = Date.now();
			sub.started = null;
			sub.finished = null;
			sub.duration = 0;
			sub.size = s.size || 0;
			sub.done = s.done || 0;
			sub.idx = i;
			delete sub.data.size;
			delete sub.data.done;
			return sub;
		});
		log.d('divided %j', this._json);
		return this._save({subs: this._json.subs});
	}

	_abort (err) {
		log.d('aborting %j', this._id);
		return this._finish(err || 'Aborted');
	}

	_pause () {
		if (this.status === STATUS.RUNNING || this.status === STATUS.SCHEDULED) {
			this._json.status = STATUS.PAUSED;
			this._json.duration = Date.now() - this._json.started;
			log.w('pausing %j', this._id);
			return this._save();
		} else {
			log.e('cannot pause %j', this._id);
			return Promise.reject('Job is not running to pause');
		}
	}

	_resume () {
		if (this.status !== STATUS.DONE) {
			this._json.status = STATUS.RUNNING;
			log.e('resuming %j', this._id);
			return this._save();
			// return new Promise((resolve, reject) => {
			// 	this._save().then(() => {
			// 		this._run().then(resolve, reject);
			// 	}, reject);
			// });
		} else {
			log.e('cannot resume %j', this._id);
			return Promise.reject('Job is done, cannot resume');
		}
	}

	_finish (err, save) {
		save = typeof save === 'undefined' ? true : save;
		if (!this.completed) {
			this._json.status = STATUS.DONE;
			this._json.finished = Date.now();
			this._json.duration = this._json.finished - this._json.started;
			this._json.error = err;
			this.emit(EVT.DONE, this._json);

			var upd = {status: this._json.status, finished: this._json.finished, duration: this._json.duration, error: this._json.error};
			if (save) {
				return this._save(upd);
			} else {
				return Promise.resolve(upd);
			}
		} else {
			return Promise.reject('Job has been already finished');
		}
	}

	_progress (size, done, bookmark, save) {
		save = typeof save === 'undefined' ? true : save;
		if (!this.completed) {
			this._json.duration = Date.now() - this._json.started;
			if (size) { this._json.size = size; }
			if (done) { this._json.done = done; }
			if (bookmark) { this._json.bookmark = bookmark; }
			var upd = {duration: this._json.duration, size: size, done: done, bookmark: bookmark};
			if (save) {
				return this._save(upd);
			} else {
				return Promise.resolve(upd);
			}
		} else {
			return Promise.reject('Job has been already finished');
		}
	}

	_run (db) {
		return new Promise((resolve, reject) => {
			var timeout = setTimeout(() => {
					log.d('First timeout called in %s', this.this._id);
					if (!this.completed) {
						this._abort().then(reject, reject);
					}
				}, MAXIMUM_JOB_TIMEOUT),
				// debounce save to once in 500 - 10000 ms
				debouncedProgress = debounce(this._progress.bind(this), 500, 10000),
				progressSave = (size, done, bookmark) => {
					if (size) { this._json.size = size; }
					if (done) { this._json.done = done; }
					if (bookmark) { this._json.bookmark = bookmark; }
					debouncedProgress(size, done, bookmark);
				};

			this._json.status = STATUS.RUNNING;

			this.run(
				db,
				(err) => {
					log.d('Job %j is done running: error %j', this._id, err);
					clearTimeout(timeout);
					if (!this.completed) {
						this._finish(err).then(
							err ? reject.bind(null, err) : resolve,
							err ? reject.bind(null, err) : reject
						);
					}
				},
				(size, done, bookmark) => {
					log.d('Progress of running %j: %j / %j / %j', this._id, size, done, bookmark);
					clearTimeout(timeout);
					timeout = setTimeout(() => {
						log.d('Progress timeout called in %s', this._id);
						if (!this.completed) {
							this._abort();
						}
					}, MAXIMUM_JOB_TIMEOUT);

					if (!this.completed) {
						progressSave(size, done, bookmark);
					}
				});
		});
	}

	_retry () {
		return new Promise((resolve, reject) => {
			if (!this._retrying && this._errorCount < MAXIMUM_ERRORS) {
				log.w('Retrying %s %d time(s), waiting %dms', this._idIpc, this._errorCount + 1, (this._errorCount + 1) * 1000);
				this._retrying = true;
				setTimeout(() => {
					this._retrying = false;
					this._errorCount++;
					log.w('Retry %s %d time(s) waiting done, reconnecting', this._idIpc, this._errorCount + 1);
					resolve();
				}, (this._errorCount + 1) * 1000);
			} else {
				log.e('Already retrying %s or too much retries: %j, %d >? %d', this._idIpc, this._retrying, this._errorCount, MAXIMUM_ERRORS);
				reject(this._retrying);
			}
		});
	}

	// Override in actual job class
	// Takes 2 parameters omitted for the sake of JSHint:
	// 		- db - db connection which must be used for this job
	// 		- done - function which must be called when job processing is done with either no arguments or error string
	//		- progress - optional progress callback which takes 2 params: part (0..1) & bookmark (any object). Bookmark allows job to be resumed after server restart (this.bookmark)
	// 					IMPORTANT! When progress returns true, job can continue to run. In case it's false, job has to finish itself immediately. 
	run () {
		throw new Error("Job must be overridden");
	}

	/**
	 * Required concurrency for this job:
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

	resourceName () {
		throw new Error('ResourcefulJob.resourceName must be overridden to return non-unique string which identifies type of a resource');
	}
}

/**
 * Job which runs in 2 processes:
 * - Initiator process (Countly master) creates subprocess (fork of executor.js) and processes IPC messages from subprocess persisting them in DB.
 * - Subprocess actually runs the job, but sends state updates through IPC instead of saving it into DB.
 *
 * This complex structure gives following advantages:
 * - Subprocess can safely crash, initiator process will be able to just restart the job in a new subprocess from the point it stopped.
 * - The job can be divided across multiple subprocesses while progress updates will be run in a single master process, 
 *   removing race conditions and excess DB load.
 * - Subprocess can run without any DB at all (see TransientJob below) removing unnecessary persistence in DB between job 
 *   creator and actual job running. Unnecessary persistence substantially increases latency and substantially increases complexity of interactions.
 * 
 * Extends ResourcefulJob, meaning job resource can live longer than job and reassigned to other job after current job is done.
 *
 * Works in combination with IPCFaçadeJob which listens for IPC status messages from subprocess and persists them in DB.
 */
class IPCJob extends ResourcefulJob {

	_sendSave(data) {
		log.d('[%d]: Sending progress update %j', process.pid, {
			_id: this._idIpc,
			cmd: EVT.SAVE,
			from: process.pid,
			data: data || this._json
		});
		process.send({
			_id: this._idIpc,
			cmd: EVT.SAVE,
			from: process.pid,
			data: data || this._json
		});
	}

	_run(db/* , resource */) {
		log.d('Entering IPCJob promise');

		return new Promise((resolve, reject) => {
			var timeout = setTimeout(() => {
					log.d('First timeout called in IPCJob %s', this._id);
					if (!this.completed) {
						this._sendSave();
						reject(ERROR.TIMEOUT);
					}
				}, MAXIMUM_JOB_TIMEOUT),
				// debounce save to once in 500 - 10000 ms
				progressSave = debounce((size, done, bookmark) => {
					if (size) { this._json.size = size; }
					if (done) { this._json.done = done; }
					if (bookmark) { this._json.bookmark = bookmark; }
					this._sendSave({size: size, done: done, bookmark: bookmark});
				}, 500, 10000);

			this._json.status = STATUS.RUNNING;
			this._json.started = Date.now();
			this._sendSave({status: this._json.status, started: this._json.started});

			this.run(
				db,
				(err) => {
					log.d('IPCJob %j is done running, status %d' + (err ? ' with error ' + err : ''), this._id, this._json.status);
					clearTimeout(timeout);
					if (!this.completed) {
						log.d('finishing'); 
			
						this._json.status = STATUS.DONE;
						this._json.finished = Date.now();
						this._json.duration = this._json.finished - this._json.started;
						this._json.error = err;

						let upd = {status: this._json.status, finished: this._json.finished, duration: this._json.duration, error: this._json.error};

						if (err) {
							reject(err);
						} else {
							resolve(upd);
						}
					}
				},
				(size, done, bookmark) => {
					clearTimeout(timeout);
					timeout = setTimeout(() => {
						log.d('Progress timeout called in IPCJob %s', this._id);
						if (!this.completed) {
							this._sendSave();
							reject(ERROR.TIMEOUT);
						}
					}, MAXIMUM_JOB_TIMEOUT);

					if (!this.completed) {
						progressSave(size, done, bookmark);
					}
				}
			);
		});
	}

	// _save() {
	// 	throw new Error('IPCJob._save should not be called');
	// }
}

class IPCFaçadeJob extends Job {
	constructor(job, resourceFaçade) {
		super(job._json, null, null);
		this.job = job;
		this.resourceFaçade = resourceFaçade;
	}

	createResource (_id, name, options) {
		return this.job.createResource(_id, name, options);
	}

	resourceName () {
		return this.job.resourceName();
	}

	_run(parent) {
		try {

			this._parent = parent;
			log.d('[jobs]: Running IPCFaçadeJob for %s', this.job._idIpc);
			this.channel = new ipc.IdChannel(this.job._idIpc).attach(this.resourceFaçade._worker);
			this.channel.on(EVT.SAVE, (json) => {
				this.job._json.duration = json.duration = Date.now() - this.job._json.started;
				this.job._save(json);
				parent._subSaved(this.job);
			});

			if (!this.promise) {
				this.promise = new Promise((resolve, reject) => {
					this.resolve = (json) => {
						log.d('[jobs]: Done running %s in IPCFaçadeJob with success', this.job._idIpc);
						this.channel.remove();
						this.job._save(json);
						parent._subSaved(this.job);
						resolve(json);
					};
					this.reject = (error) => {
						log.d('[jobs]: Done running %s in IPCFaçadeJob with error', this.job._idIpc);
						this.job._finish(error);
						parent._subSaved(this.job);
						this.channel.remove();
						reject(error);
					};
				});
			}

			this.resourceFaçade.run(this).then(this.resolve.bind(this), this.reject.bind(this));

		} catch (e) {
			log.e(e, e.stack);
		}

		return this.promise;
	}

	_migrate(resourceFaçade) {
		log.w('[jobs]: MIGRATION of IPCFaçadeJob %s to new resourceFaçade %s', this.job._idIpc, resourceFaçade._id);
		this.channel.remove();
		this.resourceFaçade = resourceFaçade;
		return this._run(this._parent);
	}

	_abort(error) {
		log.w('[jobs]: ABORTING %s in IPCFaçadeJob', this.job._idIpc);
		this.reject(error);
	}
}

class TransientJob extends IPCJob {
	_save (set) {
		if (set) {
			for (let k in set) {
				if (k !== '_id') {
					this._json[k] = set[k];
				}
			}
		}
		return Promise.resolve(set);
	}
}

// class TransientJob extends Job {
// 	_save (set) {
// 		if (set) {
// 			for (let k in set) {
// 				if (k !== '_id') {
// 					this._json[k] = set[k];
// 				}
// 			}
// 		}
// 		return Promise.resolve(set);
// 	}
// }

class TransientFaçadeJob extends IPCFaçadeJob {
	_run(parent) {
		this._parent = parent;
		log.d('[jobs]: Running TransientJob for %s', this.job._idIpc);
		this.channel = new ipc.IdChannel(this.job._idIpc).attach(this.resourceFaçade._worker);
		this.channel.on(EVT.SAVE, (json) => {
			this.job._json.duration = json.duration = Date.now() - this.job._json.started;
		});

		if (!this.promise) {
			this.promise = new Promise((resolve, reject) => {
				this.resolve = (json) => {
					log.d('[jobs]: Done running %s in IPCFaçadeJob with success', this.job._idIpc);
					this.channel.remove();
					resolve(json);
				};
				this.reject = (error) => {
					log.d('[jobs]: Done running %s in IPCFaçadeJob with error', this.job._idIpc);
					this.channel.remove();
					reject(error);
				};
			});
		}

		this.resourceFaçade.run(this).then(this.resolve.bind(this), this.reject.bind(this));

		return this.promise;
	}
}

module.exports = {
	EVT: EVT,
	ERROR: ERROR,
	Job: Job,
	IPCJob: IPCJob,
	IPCFaçadeJob: IPCFaçadeJob,
	TransientJob: TransientJob,
	TransientFaçadeJob: TransientFaçadeJob,
	STATUS: STATUS,
	debounce: debounce
};
