'use strict';

const JOB = require('./job.js'),
	  IPC = require('./ipc.js'),
	  scan = require('./scanner.js'),
	  RES = require('./resource.js'),
	  STATUS = JOB.STATUS,
	  log = require('../../utils/log.js')('jobs:manager'),
	  manager = require('../../../plugins/pluginManager.js'),
	  later = require('later');

const DELAY_BETWEEN_CHECKS = 1000,
	  MAXIMUM_IN_LINE_JOBS_PER_NAME = 10;

/**
 * Manager obviously manages jobs running: monitors jobs collection & IPC messages, runs jobs dividing then if necessary, starts and manages 
 * corresponding resources and reports jobs statuses back to the one who started them: IPC or jobs collection.
 */
class Manager {
	constructor() {
		log.i('Starting job manager');

		this.classes = {};		// {'job name': Constructor}
		this.files = {};		// {'ping': '/usr/local/countly/api/jobs/ping.js'}
		this.processes = {};	// {job1Id: [fork1, fork2], job2Id: [fork3, fork4], job3Id: []}     job3 is small and being run on this process, job1/2 are IPC ones
		this.running = {};		// {'push:apn:connection': [resource1, resource2], 'xxx': [resource3]}
		this.resources = [];	// {'push:apn:connection': [job1, job2]}
		// Once job is done running (goes out of running), if it's resourceful job, it goes into resources until resource is closed or another job of this type is being run

		this.db = manager.singleDefaultConnection();
		// JOB.setDB(this.db);
		this.collection = this.db.collection('jobs');
		// this.collection.update({status: STATUS.RUNNING, started: {$lt: Date.now() - 60 * 60 * 1000}}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart', done: Date.now()}}, {multi: true}, log.logdb('resetting interrupted jobs'));

		// setTimeout(() => {
		// 	let Constructor = this.classes['api:ipcTest'];
		// 	new Constructor('api:ipcTest', {root: true}).now();
		// }, 3000)

		scan(this.db, this.files, this.classes).then(() => {
			this.types = Object.keys(this.classes);
			log.i('Found %d job types, starting monitoring: %j', this.types.length, this.types);
			// cancel jobs star
			// this.collection.update({status: STATUS.RUNNING, $or: [{modified: {$lt: Date.now() - 60000}}, {modified: null}, {modified: {$exists: false}}]}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart', done: Date.now()}}, {multi: true}, () => {
			this.collection.find({status: STATUS.RUNNING, $or: [{modified: {$lt: Date.now() - 60000}}, {modified: null}, {modified: {$exists: false}}]}).toArray((err, toCancel) => {
				if (err) {
					log.e(err);
				}

				let promise = toCancel && toCancel.length ? Promise.all(toCancel.map(j => this.create(j).cancel())) : Promise.resolve(),
					resume = () => {
						this.collection.find({status: STATUS.PAUSED}).toArray((err, array) => {
							if (!err && array && array.length) {
								log.i('Going to resume following jobs: %j', array.map(j => {
									return {_id: j._id, name: j.name};
								}));
								this.process(array.filter(j => this.types.indexOf(j.name) !== -1));
							} else {
								this.checkAfterDelay();
							}
						});
					};
				promise.then(resume, resume);
			});
		}, (e) => {
			log.e('Error when loading jobs', e, e.stack);
		});

		// Listen for transient jobs
		require('cluster').on('online', worker => {
			let channel = new IPC.IdChannel(JOB.EVT.TRANSIENT_CHANNEL).attach(worker).on(JOB.EVT.TRANSIENT_RUN, (json) => {
				log.d('[%d]: Got transient job request %j', process.pid, json);
				this.start(this.create(json)).then(() => {
					log.d('[%d]: Success running transient job %j', process.pid, json);
					channel.send(JOB.EVT.TRANSIENT_DONE, json);
				}, (error) => {
					log.d('[%d]: Error when running transient job %j: ', process.pid, json, error);
					json.error = error || 'Unknown push error';
					channel.send(JOB.EVT.TRANSIENT_DONE, json);
				});
			});
		});
	}

	job (name, data) {
		let Constructor = this.classes[name];
		if (Constructor) {
			return new Constructor(name, data);
		} else { 
			throw new Error('Couldn\'t find job file named ' + name);
		}
	}

	checkAfterDelay () {
		if (this.checkingAfterDelay) { return; }
		this.checkingAfterDelay = true;
		setTimeout(() => {
			this.checkingAfterDelay = false;
			this.check();
		}, DELAY_BETWEEN_CHECKS);
	}

	check () {
		var find = {status: STATUS.SCHEDULED, next: {$lt: Date.now()}, name: {$in: this.types}};

		log.d('Looking for jobs ...'); 
		this.collection.find(find).sort({next: 1}).limit(MAXIMUM_IN_LINE_JOBS_PER_NAME).toArray((err, jobs) => {
			if (err) { 
				log.e('Error while looking for jobs: %j', err); 
				this.checkAfterDelay();
			} else if (!jobs) {
				log.d('No jobs so far');
				this.checkAfterDelay();
			} else {
				this.process(jobs);
			}
		});
	}

	process (jobs) {
		var promises = [];
		jobs.forEach(json => {
			var job = this.create(json);

			if (job.next > Date.now()) {
				// return console.log('Skipping job %j', job);
				return;
			}

			if (!this.classes[job.name]) {
				log.d('Cannot process job %j - no processor', job);
				return;
			}

			if (!this.canRun(job)) {
				log.d('Cannot process job %j - concurrency limit', job);
				return;
			}

			log.i('Trying to start job %j', json);
			let update = {
				$set: {status: STATUS.RUNNING, started: Date.now()}
			};

			job._json.status = STATUS.RUNNING;
			job._json.started = update.$set.started;

			if (job.strict !== null) {
				if ((Date.now() - job.next) > job.strict) {
					update.$set.status = job._json.status = STATUS.DONE;
					update.$set.done = job._json.done =  Date.now();
					update.$set.error = job._json.error = 'Job expired';
					delete update.$set.next;
					delete job._json.next;
					promises.push(job._save(update.$set));
					promises.push(this.schedule(job));
					return;
				}
			}

			promises.push(new Promise((resolve) => {
				this.collection.findAndModify({_id: job._json._id, status: {$in: [STATUS.RUNNING, STATUS.SCHEDULED, STATUS.PAUSED]}}, [['_id', 1]], update, (err, res) => {
					if (err) {
						log.e('Couldn\'t update a job: %j', err);
						resolve();
					} else if (!res || !res.value) {
						// ignore
						resolve();
					} else if (res.value.status === STATUS.RUNNING) {
						log.i('Job %s is running on another server, won\'t start it here', job._id);
						resolve();
					} else if (res.value.status === STATUS.SCHEDULED || res.value.status === STATUS.PAUSED) {
						if (!this.start(job)) {
							this.collection.findAndModify({_id: job._json._id, status: STATUS.RUNNING}, [['_id', 1]], {$set: {status: STATUS.SCHEDULED}}, log.logDb('resetting job', resolve));
						} else {
							resolve();
						}
					}
				});
			}));
		});
		Promise.all(promises).then(this.checkAfterDelay.bind(this), this.checkAfterDelay.bind(this));
	}

	schedule (job) {
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
						if (next.length < 2) { return; }
					}
				}
				return job.schedule(job.scheduleObj, job.strict, next[1].getTime());
			}
		}
		return Promise.resolve();
	} 

	/*
	 * Runs job & returns a promise
	 */
	start (job) {

		if (this.canRun(job)) {
			if (!this.running[job.name]) { this.running[job.name] = []; }
			this.running[job.name].push(job);

			return this.run(job).then(() => {
				this.schedule(job);
			}, (error) => {
				this.schedule(job);
				throw error;
			} );
		}
	}

	/**
	 * Run job by creating IPCFaçadeJob with actual job: instantiate or pick free resource, run it there. Returns a promise.
	 */
	runIPC (job) {
		log.d('%s: runIPC', job._idIpc);

		if (job.isSub) {
			let façade = job._transient ? new JOB.TransientFaçadeJob(job, this.getResource.bind(this, job)) : new JOB.IPCFaçadeJob(job, this.getResource.bind(this, job));
			return this.runLocally(façade);
		} else {
			return new Promise((resolve, reject) => {
				log.d('%s: dividing', job._idIpc);
				job.divide(this.db).then((obj) => {						// runs user code to divide job
					var subs = obj.subs,
						workersCount = obj.workers;
					log.d('%s: divided into %d sub(s) in %d worker(s)', job._idIpc, subs.length, workersCount);
					if (subs.length === 0) {							// no subs, run in local process
						log.d('%s: no subs, running locally', job._idIpc);
						job._run(this.db).then(resolve, reject);
					} else {											// one and more subs, run through IPC
						job._divide(subs).then(() => {					// set sub idx & _id, save in DB
							try {
								subs = job._json.subs.map(sub => this.create(sub));
								job._json.size = job._json.subs.reduce((p, c) => {
									return {size: p.size + c.size};
								}).size;
								job._json.done = 0;
								job._save({size: job._json.size, done: 0});

								var running = [],
									rejected = false,
									remove = (sub) => {
										let idx = running.indexOf(sub);
										if (idx !== -1) {
											running.splice(idx, 1);
										} else {
											log.w('%s: -1 indexOf %j in %j', job._idIpc, sub, running);
										}
									},
									next = () => {
										if (!rejected && running.length < workersCount && subs.length > 0 && this.getPool(subs[0]).canRun()) {
											let sub = subs.shift();
											sub.parent = job;
											log.d('%s: running next sub %s', job._idIpc, sub._idIpc);
											this.runIPC(sub).then(() => {
												log.d('%s: succeeded', sub._idIpc);
												remove(sub);
												next();
											}, (error) => {
												log.d('%s: failed with %s', sub._idIpc, error, error.stack);
												remove(sub);
												rejected = true;
												reject(error);
												throw error;
											});
											running.push(sub);
											next();
										} else if (running.length === 0 && subs.length === 0) {
											try {
												log.d('%s: all subs done, resolving', job._idIpc);
												resolve();
											} catch(e) {
												log.e(e, e.stack);
											}
										} else {
											log.d('%s: waiting for all subs to resolve (%d running, %d left to run)', job._idIpc, running.length, subs.length);
										}
									};

								log.d('%s: starting first sub', job._idIpc);
								next();
							} catch (e) {
								log.e(e, e.stack);
								reject(e);
							}
						});
					}
				});
			});
		}
	}

	/**
	 * Run instantiated Job locally. Returns a promise.
	 */
	runLocally (job) {
		log.d('%s runLocally', job._idIpc);
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
	 */
	run (job) {
		if (job instanceof JOB.IPCJob) {
			return this.runIPC(job);
		} else {
			return this.runLocally(job);
		}
	}

	create (json) {
		let Constructor = this.classes[json.name];
		return new Constructor(json);
	}

	canRun (job, count) {
		count = typeof count === 'undefined' ? 1 : count;
		let c = job.getConcurrency(),
			n = (this.running[job.name] || []).length;
		return c === 0 || (n.length + count) <= c;
	}

	getPool (job) {
		if (!this.resources[job.resourceName()]) {
			this.resources[job.resourceName()] = new RES.ResourcePool(() => {
				return new RES.ResourceFaçade(job, this.files[job.name]);
			}, 5);
		}

		return this.resources[job.resourceName()];
	}

	getResource (job) {
		return this.getPool(job).getResource();
	}

	hasResources (job) {
		return this.getPool(job).canRun();
	}

	get ipc () {
		return IPC;
	}
}

if (!Manager.instance) {
	Manager.instance = new Manager();
}

module.exports = Manager.instance;
