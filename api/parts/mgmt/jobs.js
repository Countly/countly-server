var common = require('./../../utils/common.js'),
	manager = require('../../../plugins/pluginManager.js'),
	log = common.log('jobs'),
	later = require('later'),
	_ = require('underscore'),
	fs = require('fs'),
	async = require('async');

var STATUS = {
	SCHEDULED: 0,
	RUNNING: 1,
	DONE: 2,
	CANCELLED: 3,
};

var DELAY_BETWEEN_CHECKS = 1000,
	MAXIMUM_CONCURRENT_JOBS_PER_NAME = 10000,
	MAXIMUM_IN_LINE_JOBS_PER_NAME = 40,
	MAXIMUM_JOB_TIMEOUT = 20000;

/**
 * Job scheduling library which runs jobs in a separate process. It persists jobs in mongodb so they can be run after restart.
 *
 * To start a worker (one or many per installation):
 * require('jobs.js').Worker(['optional', 'array', 'of', 'job', 'names', 'this worker can run']);
 *
 * To run a job immediately:
 * require('jobs.js').job('clean logs', {all: true}).now();
 * 
 * To run a job on a date:
 * require('jobs.js').job('send push', {app: 1123, message: {alert: 'Hey there!'}}).on(new Date());
 * 
 * To schedule a job:
 * require('jobs.js').job('make fun').schedule('at 19:00 on Saturday');
 * --- or --- (see http://bunkat.github.io/later/parsers.html for examples)
 * require('jobs.js').job('make fun').schedule(require('later').parse.recur().on(19).hour().on(6).dayOfWeek()); 
 *
 *
 * ------------------------------------------
 *
 * To start a worker:
 * require('jobs.js').Worker({
 * 		'clean logs': [1, function(job, clb){ ... clb(err); ... }],			// limit number of concurrent cleans to 1
 * 		'send push': function(job, clb){ ... clb(err); ... },				// calling clb is mandatory
 * });
 *
 *
 */

var Job = function(name, data) {
	var json = {
		name: name,
		created: Date.now(),
		status: STATUS.SCHEDULED,
		started: Date.now(),
		error: '                                                  '
	}, replace = false;

	if (data) { 
		json.data = data;
	}

	var collection = common.db.collection('jobs');

	var save = function(clb){
		if (replace) {
			var query = {status: STATUS.SCHEDULED, name: name};
			if (data) { query.data = data; }

			log.i('replacing job %j with', query, json);
			collection.findAndModify(query, [['_id', 1]], {$set: json}, {new: true}, function(err, job){
				if (err) {
					log.e('job replacement error, saving new job', err, job);
					collection.save(json, clb || function(err){
						if (err) { 
							log.w('Error while saving new job on job replacement error: %j', err);
							setTimeout(save.bind(null, clb), 1000); 
						}
					});
				} else if (!job){
					log.i('no job found to replace, saving new job', err, job);
					collection.save(json, clb || function(err){
						if (err) { 
							log.w('Error while saving job on no job to replace: %j', err);
							setTimeout(save.bind(null, clb), 1000); 
						}
					});
				} else {
					log.i('job replacing done', job.value);
					if (clb) { clb(); }
				}
			});
		} else {
			log.d('saving %j', json);
			collection.save(json, clb || function(err){
				if (err) { 
					log.w('Error while saving job: %j', err);
					setTimeout(save.bind(null, clb), 1000); 
				}
			});
		}
	};

	this.schedule = function(schedule, strict, clb, nextTime) {
		if (typeof strict === 'function') {
			clb = strict;
			strict = null;
		}
	
		json.schedule = schedule;

		json.strict = typeof strict === 'undefined' ? null : strict;

		if (nextTime) {
			json.next = nextTime;
		} else {
			schedule = typeof schedule === 'string' ? later.parse.text(schedule) : schedule;
			var next = later.schedule(schedule).next(1);
			if (!next) { return null; }

			json.next = next.getTime();
		}

		save(clb);

		return this;
	};

	this.once = function(date, strict, clb) {
		json.next = typeof date === 'number' ? date : date.getTime();

		if (typeof strict === 'function') {
			clb = strict;
			strict = null;
		}

		json.strict = typeof strict === 'undefined' ? null : strict;
	
		save(clb);
	};

	this.now = function(clb) {
		json.next = 0;
		save(clb);
	};

	this.in = function(seconds, clb) {
		json.next = Date.now() + seconds * 1000;
		save(clb);
	};

	this.replace = function() {
		replace = true;
		return this;
	};
};

var Processor = function(worker, concurrency, fun, name) {
	if (!(this instanceof Processor)) { return new Processor(fun, name); }

	this.running = [];
	this.queue = [];
	this.shuttingDown = false;

	this.canPush = function() {
		return this.queue.length < MAXIMUM_IN_LINE_JOBS_PER_NAME && !this.shuttingDown;
	};

	this.push = function(job){
		this.queue.push(job);
		this.check();
	};

	this.done = function(job, err) {
		if (err) {
			log.e('Done running %j with error %j', job._id, err);
		} else {
			log.d('Done running %j', job._id);
		}
		for (var i = this.running.length - 1; i >= 0; i--) {
			if (this.running[i]._id === job._id) {
				this.running.splice(i, 1);
				this.check();
				worker.result(err, job);
			}
		}
	};

	this.check = function(){
		log.d('Checking processor: queue %j / running %j (concurrency allowed %j)', this.queue.length, this.running.length, concurrency);
		if (this.queue.length > 0 &&
			this.running.length < MAXIMUM_CONCURRENT_JOBS_PER_NAME && 
			(typeof concurrency === 'undefined' || concurrency > this.running.length) &&
			!this.shuttingDown) {

			var job = this.queue.shift();
			this.running.push(job);
			try {
				log.d('Running job %j (%j)', job._id, typeof fun);

				var complete = false;
				
				fun(job, function(err){
					this.done(job, err);
					complete = true;
				}.bind(this));

				setTimeout(function(){
					if (!complete) {
						this.done(job, 'Aborted on timeout');
					}
				}.bind(this), MAXIMUM_JOB_TIMEOUT);

			} catch (err) {
				this.done(job, err);
			}
		}
	};

	this.shutdown = function(){
		var putBacks = [];
		while(this.queue.length) {
			var job = this.queue.pop();
			putBacks.push(worker.putBack.bind(worker, job));
		}
		return async.parallel.bind(async, putBacks);
	};
};

var JobWorker = function(processors){
	if (!(this instanceof JobWorker)) { return new JobWorker(processors); }
	
	this.types = Object.keys(processors);
	this.processors = {};
	this.types.forEach(function(name){
		var fun = processors[name], conc;
		if (_.isArray(fun) && fun.length === 2) {
			conc = fun[0];
			fun = fun[1];
		}
		if (typeof fun !== 'function') {
			log.e('Bad processor %j', processors[name]);
			throw new Error('Bad object supplied as processors. Only array of length 2 or function is supported');
		}
		this.processors[name] = new Processor(this, conc, fun, name);
	}.bind(this));
	log.d('Loaded processors %j', processors);

	var collection = common.db.collection('jobs');

	this.next = function(){
		// if (!this.stream) {			
			// var find = {status: STATUS.SCHEDULED};
			var find = {status: STATUS.SCHEDULED, next: {$lt: Date.now()}};
			if (this.types && this.types.length) {
				find.name = {$in: this.types};
			}

			log.d('Looking for jobs ...'); 
			collection.find(find).sort({next: 1}).limit(MAXIMUM_IN_LINE_JOBS_PER_NAME).toArray(function(err, jobs){
				if (err) { 
					log.e('Error while looking for jobs: %j', err); 
					this.nextAfterDelay();
				} else if (!jobs) {
					log.d('No jobs so far');
					this.nextAfterDelay();
				} else {
					for (var i = 0; i < jobs.length; i++) {
						var job = jobs[i];
						if (job.next > Date.now()) {
							// return console.log('Skipping job %j', job);
							break;
						}

						if (!this.canProcess(job)) {
							log.d('Cannot process job %j yet', job);
							break;
						}

						log.i('Got a job %j', job);
						var update = {
							$set: {status: STATUS.RUNNING, started: Date.now()}
						};

						if (job.strict !== null) {
							if ((Date.now() - job.next) > job.strict) {
								update.$set.status = STATUS.DONE;
								update.$set.error = 'Job expired';
								delete update.$set.next;
							}
						}

						collection.findAndModify({_id: job._id, status: {$in: [STATUS.RUNNING, STATUS.SCHEDULED]}}, [['_id', 1]], update, function(err, job){
                			job = job && job.ok ? job.value : null;
							if (err) {
								log.e('Couldn\'t update a job: %j', err);
							} else if (!job) {
								// ignore
							} else if (job.status === STATUS.RUNNING) {
								log.i('The job is running on another server, won\'t start it here');
							} else if (job.status === STATUS.SCHEDULED) {
								this.process(job);

								if (job.schedule) {
									var schedule = typeof job.schedule === 'string' ? later.parse.text(job.schedule) : job.schedule,
										nextFrom = new Date(job.next);
									var next = later.schedule(schedule).next(2, nextFrom);
									if (next && next.length > 1) {
										if (job.strict === null) { 
											// for strict jobs we're going to repeat all missed tasks up to current date after restart
											// for non-strict ones, we want to start from current date
											while (next[1].getTime() < Date.now()) {
												next = later.schedule(schedule).next(2, next[1]);
												if (next.length < 2) { return; }
											}
										}
										new Job(job.name, job.data, this).schedule(job.schedule, job.strict, null, next[1].getTime());
									}
								}
							}
						}.bind(this));
					}
					this.nextAfterDelay();
				}
			}.bind(this));
	};

	collection.update({status: STATUS.RUNNING, started: {$lt: Date.now() - 60 * 60 * 1000}}, {$set: {status: STATUS.CANCELLED, error: 'Cancelled on restart'}}, {multi: true}, setTimeout(this.next.bind(this), 5000));

	this.nextAfterDelay = function(){
		if (!this.nextingAlready) {
			this.nextingAlready = true;
	
			setTimeout(function(){
				this.nextingAlready = false;
				this.next();
			}.bind(this), DELAY_BETWEEN_CHECKS);
		}
	};

	this.process = function(job) {
		log.i('Processing %j', job);
		var processor = this.processors[job.name];
		if (!processor) {
			throw new Error('No job processor in a worker for job %s', job.name);
		}

		processor.push(job);
	};

	this.canProcess = function(job) {
		var processor = this.processors[job.name];
		if (!processor) {
			throw new Error('No job processor in a worker for job %s', job.name);
		}

		return processor.canPush(job);
	};

	this.result = function(err, job) {
		log.i('Done processing %j (error %j)', job, err);
		var update = {$set: {status: STATUS.DONE}};
		if (err) {
			update.$set.error = err.toString().substr(0, 50);
		}
		collection.update({_id: job._id}, update, log.callback());
	};

	this.putBack = function(job, callback) {
		log.w('Putting back', job);
		collection.update({_id: job._id, status: STATUS.RUNNING}, {$set: {status: STATUS.SCHEDULED}}, function(err){
			if (err) { log.e('Couldn\'t put back job %j because of %j, ', job, err); }
			// ignoring error here
			callback();
		});
	};

	var shutdown = function(){
		var shutdowns = [];
		for (var name in this.processors) {
			var processor = this.processors[name];
			shutdowns.push(processor.shutdown());
		}

		log.w('Got SIGTERM in jobs, shutting down all tasks for %d processors', shutdowns.length);

		async.parallel(shutdowns, function(err){
			if (err) { log.e('Error when shutting down job processors', err); }
			log.w('Done shutting down jobs with %j', err);
			process.exit(0);
		}.bind(this));
	}.bind(this);

	process.on('disconnect', shutdown);
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);

	log.i('Jobs worker created');
};

module.exports = {
	workers: [],
	startWorker: function(types, jobs, runPlugins, started) {
		manager.loadConfigs(common.db, function(){
		types = types || process.env.COUNTLY_JOBS || null;
		jobs = jobs || {};
		started = started || function(){};

		var plugins = runPlugins ? manager.getPlugins() : [];
		if (!plugins) { 
			log.e('Won\'t start jobs because no plugins.json exist');
			return;
		}

		log.i('Checking plugins %j', plugins);
		
		plugins = plugins.map(function(plugin){
			return __dirname + '/../../../plugins/' + plugin + '/api/jobs.js';
		});

		var checks = [];
		plugins.forEach(function(plugin){
			checks.push(function(clb){
				fs.exists(plugin, clb.bind(null, null));
			});
		});

		if (runPlugins) {
			log.i('Starting plugins jobs');
			async.parallel(checks, function(err, results){
				if (!err && results) {
					for (var i = results.length - 1; i >= 0; i--) {
						if (results[i]) {
							var pluginJobs = require(plugins[i]),
								pluginName = plugins[i].split('/');

							pluginName = pluginName[pluginName.length - 3];
							for (var name in pluginJobs) {
								if (!types || types.indexOf(name) !== -1) { 
									log.i('Found job %s in plugin %s', name, pluginName);
									jobs[name] = pluginJobs[name];
								} else {
									log.i('Job %s in plugin %s is disabled', name, pluginName);
								}
							}
						}
					}

					if (Object.keys(jobs).length) {
						setTimeout(function(){
							log.d('Starting worker for jobs %j', jobs);
						var worker = new JobWorker(jobs);
						module.exports.workers.push(worker);
						}, 1000);
						started(null, Object.keys(jobs));
					} else {
						started(null, null);
					}
				} else {
					log.e('Check returned errror: %j', err);
					started(err);
				}
			});
		} else if (Object.keys(jobs).length) {
			var worker = new JobWorker(jobs);
			module.exports.workers.push(worker);
			started(null, worker);
		} else {
			started(null, null);
		}
		});
	},
	job: function(name, data) {
		return new Job(name, data);
	},
};
