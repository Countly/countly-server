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
	  MAXIMUM_IN_LINE_JOBS_PER_NAME = 40;

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
		this.collection.update({status: STATUS.RUNNING, started: {$lt: Date.now() - 60 * 60 * 1000}}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart', done: Date.now()}}, {multi: true});

		// setTimeout(() => {
		// 	let Constructor = this.classes['api:ipcTest'];
		// 	new Constructor('api:ipcTest', {root: true}).now();
		// }, 3000)

		scan(this.db, this.files, this.classes).then(() => {
			this.types = Object.keys(this.classes);
			log.i('Found %d job types, starting monitoring: %j', this.types.length, this.types);
			this.checkAfterDelay();
		}, (e) => {
			log.e('Error when loading jobs', e, e.stack);
		});

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
				for (let i = 0; i < jobs.length; i++) {
					let job = this.create(jobs[i]);
					if (job.next > Date.now()) {
						// return console.log('Skipping job %j', job);
						continue;
					}

					if (!this.classes[job.name]) {
						log.d('Cannot process job %j - no processor', job);
						continue;
					}

					if (!this.canRun(job)) {
						log.d('Cannot process job %j - concurrency limit', job);
						continue;
					}

					log.i('Trying to start job %j', jobs[i]);
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
						}
					}

					this.collection.findAndModify({_id: job._json._id, status: {$in: [STATUS.RUNNING, STATUS.SCHEDULED]}}, [['_id', 1]], update, (err, res) => {
						if (err) {
							log.e('Couldn\'t update a job: %j', err);
						} else if (!res || !res.value) {
							// ignore
						} else if (res.value.status === STATUS.RUNNING) {
							log.i('The job is running on another server, won\'t start it here');
						} else if (res.value.status === STATUS.SCHEDULED) {
							this.start(job);

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
									job.schedule(job.scheduleObj, job.strict, next[1].getTime());
								}
							}
						}
					});
				}
				this.checkAfterDelay();
			}
		});
	}

	/*
	 * Runs job & returns a promise
	 */
	start (job) {

		if (!this.running[job.name]) { this.running[job.name] = []; }
		this.running[job.name].push(job);

		if (job instanceof JOB.IPCJob) {
			return new Promise((resolve, reject) => {
				job.divide(this.db).then((subs) => {					// runs user code to divide job
					if (subs.length === 0) {							// no subs, run in local process
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
								
								if (this.canRun(subs[0], subs.length)) {
									var promises = subs.map(sub => {
										log.d('[jobs]: Starting a sub %j', sub);

										let resourceFaçade = this.getResource(sub),
											jobFaçade = job._transient ? new JOB.TransientFaçadeJob(sub, resourceFaçade) : new JOB.IPCFaçadeJob(sub, resourceFaçade);

										resourceFaçade.assign(jobFaçade);

										let restart = (action) => {
											log.w('[jobs]: Resource %s %s, going to retry job %s', resourceFaçade._id, action, jobFaçade._id);

											resourceFaçade.detachJob();
											
											jobFaçade._pause().catch(log.d).then(() => {
												jobFaçade._retry().then(() => {
													try {
														let name = resourceFaçade._name,
															idx = this.resources[name].indexOf(resourceFaçade);
														log.w('[jobs]: Migrating, removing resource %s(%d)', resourceFaçade._id, idx);
														if (idx !== -1) {
																resourceFaçade.removeAllListeners('crash');
																resourceFaçade.removeAllListeners('timeout');
																this.resources[name][idx] = resourceFaçade = resourceFaçade.migrate(jobFaçade, this.files[job.name]);
																this.bindToResource(resourceFaçade);
																resourceFaçade.on('crash', restart.bind(this, 'crashed'));
																resourceFaçade.on('timeout', restart.bind(this, 'timed out'));
																jobFaçade._migrate(resourceFaçade);
														} else {
															jobFaçade._abort('Couldn\'t do migration');
															resourceFaçade.finalize();
														}
													} catch (e) {
														log.e(e, e.stack);
													}
												}, (already) => {
													if (!already) {
														jobFaçade._abort('Too much retries');
														resourceFaçade.finalize();
													}
												});
											});
										};

										resourceFaçade.on('crash', restart.bind(this, 'crashed'));
										resourceFaçade.on('timeout', restart.bind(this, 'timedout'));

										return new Promise((resolve, reject) => {
											resourceFaçade.onceOnline(() => {
												log.d('[jobs] Resource %d is online', resourceFaçade._worker.pid);
												jobFaçade._run(job).then(() => {
													console.log('+++++++++++++++++');
													resolve();
												}, (e) => {
													console.log('-----------------');
													reject(e);
												}).then(() => {
													resourceFaçade.removeAllListeners('crash');
													resourceFaçade.removeAllListeners('timeout');
												});
											});
										});
										// TODO: handle case when resource is closed / exited resources in the middle of job starting
									});

									log.d('Running promises for %j', job._id);
									Promise.all(promises).then(() => {
										log.d('All promises for job %j completed', job._id);
										resolve();
									}).catch((err) => {
										log.d('All promises for job %j completed with error', job._id, err);
										reject(err);
									}).then(() => {
										let idx = this.running[job.name].indexOf(job);
										if (idx !== -1) { this.running[job.name].splice(); }
									});
								}
							} catch (e) {
								log.e('Error while preparing a job', e);
								reject(e);
							}
						}, reject);
					}
				}, reject);
			});
		} else {
			return job._run(this.db);
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

	getResource (job) {
		if (!this.resources[job.resourceName()]) {
			this.resources[job.resourceName()] = [];
		}

		let res = this.resources[job.resourceName()];

		for (let i = 0; i < res.length; i++) {
			let r = res[i];
			if (!r.isBusy) {
				log.d('Reusing %j', r._id);
				return r;
			}
		}

		var r = new RES.ResourceFaçade(job, this.files[job.name]);
		log.d('Created new resource of type %j: %j', job.resourceName(), r._id);
		this.bindToResource(r);
		res.push(r);

		return r;
	}

	migrate () {
	}

	bindToResource (r) {
		let res = this.resources[r._name];
		r.on('closed', () => {
			let idx = res.indexOf(r);
			if (idx !== -1) { 
				log.d('[jobs]: Resource %j is closed, removing from array', r._id);
				res.splice(idx, 1); 
			}
		});
	}
}

if (!Manager.instance) {
	Manager.instance = new Manager();
}

module.exports = Manager.instance;
