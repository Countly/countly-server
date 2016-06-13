'use strict';

var EventEmitter = require('events'),
	cluster = require('cluster'),
	JOB = require('./job.js'),
	log = require('../../utils/log.js')('jobs:ipc');

var CMD = {
	RUN: 'job:run',
	ABORT: 'job:abort',
	PAUSE: 'job:pause',
	STATUS: 'job:status',
	CRASH: 'job:crash'
}, STATUS = JOB.STATUS;

/**
Common message structures: 
{
	_id: 'job id',
	cmd: 'job:run',
	from: 1238,		from pid
	to: 3820,		to pid
	
	... other job fields
}

{
	_id: 'job id',
	cmd: 'job:status',
	from: 1238,		from pid
	to: 3820,		to pid

	status: 1,
	part: 0.5,
	bookmark: 'some progress bookmark',
	... other job fields
}
*/

/**
 * Delegate - a faćade for a specific job running on some other process.
 * Captures all events for this job & updates DB with status & progress.
 * Returns abortable Promise to be notified when job is done and to have some control over it.
 */
class Delegate {
	constructor(job, progress) {
		this.job = job;
		this.progress = progress;
		log.d('Started delegate in %d for %j', process.pid, job._idIpc);
	}

	run (pid) {
		var promise = new Promise((resolve, reject) => {
			var channel = new IdChannel(this.job._idIpc).attach(), crashChannel;
			channel.on(CMD.STATUS, (m) => {
				pid = m.from;
				if (!crashChannel && pid) {
					// Listen for crash of specific worker and pause the job in that case
					crashChannel = new PidFromChannel(m.from).attach();
					crashChannel.on(CMD.CRASH, (m) => {
						if (m._id === this.job._idIpc) {
							this.job.pause().then(() => {
								channel.remove();
								crashChannel.remove();
								reject('crash');
							});
						}
					});
				}
				if (m.status === STATUS.RUNNING) {
					log.d('Delegate got running status update: %j', m);
					this.job._status(m);
					if (this.progress) { this.progress(m); }
				} else if (m.status === STATUS.DONE) {
					log.d('Delegate got done update: %j', m);
					this.job._finish(m.error).then(
						m.error ? reject.bind(null, m.error) : resolve,
						m.error ? reject.bind(null, m.error) : reject
					);
					channel.remove();
					if (crashChannel) { crashChannel.remove(); }
				}
			});

			channel.on(CMD.ABORT, (m) => {
				log.d('Delegate got abort update: %j', m);
				this.job._finish(m.error).then(resolve, reject);
				channel.remove();
				if (crashChannel) { crashChannel.remove(); }
			});


			var cmd = {
				_id: this.job._idIpc,
				cmd: CMD.RUN,
				data: this.job,
				from: process.pid
			};

			if (pid) { cmd.to = pid; }

			log.d('Starting IPC job from delegate: %j', cmd);
			process.send(cmd);
		});

		promise.abort = () => {
			log.d('Abort request in delegate for %j', this.job._idIpc);
			return new Promise((resolve, reject) => {
				var channel = new IdChannel(this.job._idIpc).attach();
				channel.on(CMD.ABORT, resolve.bind(null, null));

				setTimeout(reject.bind(null, 'Timed out message abort'), 3000);

				process.send({
					_id: this.job._id,
					cmd: CMD.ABORT,
					from: process.pid
				});
			});
		};

		return promise;
	}
}

/**
 * Just a set classes that incapsulate IPC stuff and pass through only messages for specific _id (IdChannel) 
 * or with some pid (PidFromChannel / PidToChannel).
 */
class Channel extends EventEmitter {
	constructor (check) {
		super();
		this.check = check;
	}

	attach (worker) {
		this.worker = worker || process;
		this.listener = (m) => {
			// log.d('[%d]: Got message in Channel in %d: %j', process.pid, this.worker.pid, m, this._id);
			if (this.check(m)) {
				// log.d('[%d]: Channeling %j', process.pid, m);
				this.emit(m.cmd, m.data);
			}
		};
		this.worker.setMaxListeners(this.worker.getMaxListeners() + 1);
		this.worker.on('message', this.listener.bind(this));
		this.worker.on('exit', this.emit.bind(this, 'exit'));
		this.worker.on('error', this.emit.bind(this, 'crash'));
		return this;
	}

	remove () {
		log.d('[%d]: Removing Channel for %s', process.pid, this._id);
		if (this.listener) {
			this.worker.removeListener('message', this.listener);
			this.worker.setMaxListeners(this.worker.getMaxListeners() - 1);
			this.listener = undefined;
		}
	}

	send (_id, cmd, data) {
		// log.d('Sending message from Channel in %d: %j', process.pid, {_id: _id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
		this.worker.send({_id: _id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
	}
}

class IdChannel extends Channel {
	constructor (_id) {
		super (m => m._id === _id);
		this._id = _id;
		log.d('Started IdChannel in %d', process.pid, _id);
	}

	send (cmd, data) {
		this.worker.send({_id: this._id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
	}
}

class IdStartsWithChannel extends Channel {
	constructor (_id) {
		super (m => m._id.indexOf(_id) === 0);
		log.d('Started IdStartsWithChannel in %d', process.pid, _id);
	}
}

class PidFromChannel extends Channel {
	constructor (pid) {
		super (m => m.from === pid.toString());
	}
}

class PidToChannel extends Channel {
	constructor (pid) {
		super (m => m.to === pid.toString());
	}
}

class WorkerChannel extends Channel {
	constructor (pid) {
		super (m => m.to === pid.toString());
	}
	send (cmd, data) {
		this.worker.send({_id: this._id, cmd: cmd, from: process.pid, data: data});
	}
}

class MasterChannel extends Channel {
	constructor (pid) {
		super (m => !m.to);
		
		this.workers = {};

		cluster.on('online', (worker) => {
			log.i('Worker started: %d', worker.process.pid);
			this.workers[worker.process.pid] = worker;
			worker.on('message', (m) => {
				this.workers[worker.process.pid] = worker;

				worker._channelListener = (m) => {
					// log.d('[%d]: Got message in Channel in %d: %j', process.pid, this.worker.pid, m, this._id);
					if (this.check(m)) {
						// log.d('[%d]: Channeling %j', process.pid, m);
						this.emit(m.cmd, m.data);
					}
				};

				worker.setMaxListeners(worker.getMaxListeners() + 1);
				worker.on('message', worker._channelListener.bind(worker));
				worker.on('exit', this.emit.bind(this, 'exit'));
				worker.on('error', this.emit.bind(this, 'crash'));
			});
		});

		cluster.on('exit', (worker) => {
			if (worker.process.pid in this.workers) {
				log.e('Worker exited: %d', worker.process.pid);
				delete this.workers[worker.process.pid];
			}
		});

	}

	remove () {
		log.d('[%d]: Removing MasterChannel');
		for (var pid in this.workers) {
			this.workers[pid].removeListener('message', this.workers[pid]._channelListener);
			this.workers[pid].setMaxListeners(this.workers[pid].getMaxListeners() - 1);
			this.workers[pid]._channelListener = undefined;
		}
	}

	send (_id, cmd, data) {
		// log.d('Sending message from Channel in %d: %j', process.pid, {_id: _id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
		this.worker.send({_id: _id, cmd: cmd, from: process.pid, to: this.worker.pid, data: data});
	}
}


// Countly master process, just pass through messages to specific pid in `to` field of message.
class PassThrough {
	constructor() {
		log.i('Started PassThrough in %d', process.pid);
		this.workers = {};	// map of pid: worker
	}

	start (jobsWorker) {
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

	pass (m) {
		log.d('Got message in PassThrough: %j', m);
		if (m.to && m.to in this.workers) {
			log.d('Passing through message from %j to %j', m.from, m.to);
			this.workers[m.to].send(m);
		} else if (m.to && m.to === this.jobsWorker.pid) {
			log.d('Passing through message from %j to jobs %j', m.from, m.to);
			this.jobsWorker.send(m);
		} else if (!m.to && m.from) {
			let pids = Object.keys(this.workers);
			var idx = Math.floor(Math.random() * pids.length);
			m.to = pids[idx];
			log.d('Passing through message from %d to randomly selected %d (out of %d)', m.from, m.to, pids.length);
			this.workers[m.to].send(m);
		}
	}
}

// Countly jobs process, allows to run jobs on other processes
class Master {
	constructor() {
		log.i('Started Master in %d', process.pid);
	}

	// Run job on worker with pid (optional, random worker is picked if no pid specified)
	// Returns promise
	run (job, progress, pid) {
		job = job._instantiate(job);
		log.d('Going to run job through IPC: %j', job);
		// Wrapping in one another promise to catch worker crashes on this level rather than passing them up
		return new Promise((resolve, reject) => {
			var delegate = new Delegate(job, progress);
			delegate.run(pid).then(resolve, err => {
				if (err === 'crash') {
					JOB.master.run(job).then(resolve, reject);
				} else {
					reject(err);
				}
			});
		});
	}
}

// Countly worker process, runs IPC jobs and reports about their status back through IPC
class Worker {

	constructor() {
		log.i('Started Worker in %d', process.pid);
		JOB.scanPlugins({}, null, (err, jobs) => {
			log.d('Got plugins jobs in IPC jobs worker %d: %j', process.pid, Object.keys(jobs));
			this.jobs = jobs;
		});

		// job ids for aborted jobs
		this.aborts = [];

		this.channel = new PidToChannel(process.pid).attach();
		this.channel.on(CMD.RUN, (m) => {
			if (m.data && m.data.name in this.jobs) {
				log.d('Worker got request to start a %j job: %j', m.data.name, m.data);
				var job = m.data;
				job.result = { status: STATUS.RUNNING };
				this.jobs[m.data.name](job, (err, progress) => {
					log.d('Worker got job callback: err %j / progress %j', err, progress);

					if (err) {
						job.result.status = STATUS.DONE;
						job.result.error = err;
						process.send({
							_id: job._id,
							cmd: CMD.STATUS,
							from: process.pid,
							to: m.from,
							result: job.result
						});
					} else if (progress !== undefined) {
						job.result.progress = progress;
						process.send({
							_id: m._id,
							cmd: CMD.STATUS,
							from: process.pid,
							to: m.from,
							result: job.result
						});
					} else {
						job.result.status = STATUS.DONE;
						process.send({
							_id: m._id,
							cmd: CMD.STATUS,
							from: process.pid,
							to: m.from,
							result: job.result
						});
					}
					if (this.aborts.indexOf(job._id) !== -1) {
						log.d('Job appears to be in abort list: %j', job._id);
						this.aborts.splice(this.aborts.indexOf(job._id), 1);

						job.result.status = STATUS.DONE;
						job.result.error = 'aborted';

						setImmediate(() => {
							process.send({
								_id: job._id.toString(),
								cmd: CMD.ABORT,
								from: process.pid,
								to: m.from,
								result: job.result
							});
						});

						return false;
					}
					return true;
				});
			}
		});

		this.channel.on(CMD.ABORT, (m) => {
			log.d('Worker got abort request: %j', job._id);
			this.aborts.push(m._id);
		});
	}
}

module.exports.PassThrough = PassThrough;
module.exports.IdChannel = IdChannel;
module.exports.IdStartsWithChannel = IdStartsWithChannel;
module.exports.Master = Master;
module.exports.Worker = Worker;
