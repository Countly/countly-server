'use strict';

const cp = require('child_process'),
	  EventEmitter = require('events'),
	  ipc = require('./ipc.js'),
	  JOB = require('./job.js'),
	  log = require('../../utils/log.js')('jobs:resource');

const CMD = {
	RUN: 'resource:run',
	DONE: 'resource:done',
	OPENED: 'resource:opened',
	CLOSED: 'resource:closed',
	CRASH: 'resource:crash',
	TIMEOUT: 'resource:timeout',
	ONLINE: 'resource:online'
},
RESOURCE_PING_INTERVAL = 10000,
RESOURCE_CLOSE_TIMEOUT = 360000;

function random() { 
	var s = Math.random().toString(36).slice(2); 
	return s.length === 16 ? s : random(); 
}

class ResourceFaçade extends EventEmitter {
	constructor(job, file) {
		super();
		this._name = job.resourceName();
		this._id = 'res:' + this._name + ':' + random();
		this._open = null;
		this._job = false;
		this._file = file;
		this._worker = cp.fork(__dirname + '/executor.js', [JSON.stringify({
			_id: this._id, 
			name: this._name, 
			file: this._file,
			job: job._json
		})]);
		log.i('[jobs]: Started resource façade %j in %d for %j: %j', this._name, process.pid, this._worker.pid, this._id);

		this.channel = new ipc.IdChannel(this._id);
		this.channel.attach(this._worker);
		
		this.channel.on(CMD.DONE, (json) => {
			this._job = null;
			if (json.error) {
				log.i('[jobs]: Done running %j with error %j %j (%j) in %d (%j)', json._id, json.error, this._name, this._id, this._worker.pid, this._id);
				this.reject(json.error);
			} else {
				log.i('[jobs]: Done running %j with success %j (%j) in %d (%j)', json._id, this._name, this._id, this._worker.pid, this._id);
				this.resolve(json);
			}
		});
		
		this.channel.on(CMD.OPENED, () => {
			log.i('[jobs]: Resource %j opened in %d: %j', this._name, this._worker.pid, this._id);
			this._open = true;
			this.emit('opened');
		});
		
		this.channel.on(CMD.CLOSED, () => {
			log.i('[jobs]: Resource %j closed in %d: %j', this._name, this._worker.pid, this._id);
			this._open = false;
			if (!this._crashed) {
				if (this._job) {
					log.i('[jobs]: Resource %j closed in %d (%j) while running %s, will reject' + this._job._idIpc, this._name, this._worker.pid, this._id, this._job._idIpc);
					this._job = null;
					log.i('rejecting');
					this.reject('closed');
				} else {
					this.emit('closed');
				}
			}
		});

		this.channel.on('exit', () => {
			log.i('[jobs]: Resource %j exited in %d: %j', this._name, this._worker.pid, this._id);
			if (!this._crashed) {
				if (this._job) {
					log.i('[jobs]: Resource %j exited in %d (%j) while running %s, will reject' + this._job._idIpc, this._name, this._worker.pid, this._id, this._job._idIpc);
					this._job = null;
					log.i('rejecting');
					this.reject('Process exited');
				}
				if (this._open) {
					this._open = false;
					this.emit('closed');
				}
				this.emit('exited');
			}
		});

		this.channel.on(CMD.CRASH, (err) => {
			if (!this._crashed) {
				log.e('[jobs]: Resource %s (%s) crashed in %d: %j', this._name, this._id, this._worker.pid, err);
				this.emit('crash');
			}
		});

		this.channel.on(CMD.TIMEOUT, (err) => {
			if (!this._crashed) {
				log.e('[jobs]: Resource %s (%s) timed out in %d: %j', this._name, this._id, this._worker.pid, err);
				this.emit('timeout');
			}
		});

		this.channel.on(CMD.ONLINE, () => {
			log.d('ResourceFaçade is online');
			this.emit('online');
		});
	}

	get isBusy() { return !!this._job; }
	get isReady() { return this.open === true || this.open === null; }

	run (job) {
		try {
			if (this._job && this._job !== job) { 
				log.w('[jobs]: Resource façade %j is busy in %d: %j', this._name, this._worker.pid, this._id);
				return Promise.reject('busy'); 
			}
			if (this._open === false) { 
				log.w('[jobs]: Resource façade %j is not open in %d: %j', this._name, this._worker.pid, this._id);
				return Promise.reject('closed'); 
			}

			log.i('[jobs]: Resource façade %j in %d (%j) is going to run %j', this._name, this._worker.pid, this._id, job._json);

			this._job = job;
			this.channel.send(CMD.RUN, job._json);
		} catch (e) {
			log.e(e, e.stack);
		}

		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	invalidate () {
		if (this._job) { this._job.resource = null; }
		this._job = null;
		this._open = false;
		this._crashed = true;
	}

	detachJob (job) {
		if (this._job && this._job._id === job._id) {
			this._job.resource = null;
			this._job = null;
		}
	}

	assign (job) {
		log.d('[%d]: Resource %j (%j) is assigned to %j', process.pid, this._name, this._id, job._idIpc);
		job.resource = this;
		this._job = job;
	}

	migrate (job, file) {
		let n = new ResourceFaçade(job, file);
		log.w('[jobs] MIGRATION from current resource façade instance %s to %s', this._id, n._id);
		n.job = job;
		n.resolve = this.resolve;
		n.reject = this.reject;

		this.channel.send(CMD.CLOSED);
		this.channel.remove();

		return n;
	}

	close () {
		log.w('Closing underlying resource %s from façade', this._id);
		this.channel.send(CMD.CLOSED);
		this.channel.remove();
		this.emit('closed');
	}

	finalize () {
		log.w('Finalizing underlying resource %s from façade', this._id);
		if (this._job) {
			this._job = null;
			log.i('rejecting');
			this.reject('Process crashed');
		}
		if (this._open) {
			this._open = false;
			this.emit('closed');
		}
		return this.close();
	}

	onceOnline (clb) {
		if (this._online) {
			return Promise.resolve();
		} else {
			return new Promise((resolve) => {
				this.once('online', () => {
					this._online = true;
					resolve(true);
				});
			});
			
		}
	}
}

class Resource extends EventEmitter {
	constructor(_id, name, checkInterval, autoCloseTimeout) {
		super();
		this._id = _id;
		this._name = name;
		this._open = false;
		this._resourceChecMillis = checkInterval || RESOURCE_PING_INTERVAL;
		this._resourceAutoCloseMillis = autoCloseTimeout || RESOURCE_CLOSE_TIMEOUT;
	}

	opened () {
		this._open = true;
		log.i('[%d]: Opened resource %j (%j)', process.pid, this._name, this._id);
		this.emit('opened');
		this.channel.send(CMD.OPENED);
		this._checkInterval = setInterval(() => {
			log.i('[%d]: Checking resource %j (%j)', process.pid, this._name, this._id);
			this.checkActive().then((active) => {
				log.i('[%d]: Resource %j (%j) is ' + (active ? 'active' : 'inactive'), process.pid, this._name, this._id);
				if (!active) {
					this._open = false;
					this.close();
				}
			}, (error) => {
				log.e('[%d]: Couldn\'t check resource %j (%j): %j', process.pid, this._name, this._id, error);
				this.close();
			});
		}, this._resourceChecMillis);
	}

	checkOpen () {
		log.i('[%d]: Opening resource %j (%j)', process.pid, this._name, this._id);
		if (this.isOpen) {
			return Promise.resolve();
		} else {
			return this.open();
		}
	}
	
	closed () {
		this._open = false;
		log.i('[%d]: Closed resource %j (%j)', process.pid, this._name, this._id);
		clearInterval(this._checkInterval);
		clearTimeout(this._closeTimeout);
		this.emit('closed');
		this.channel.send(CMD.CLOSED);
		this.channel.remove();
		process.exit(0);
	}
	
	checkClosed () {
		log.i('[%d]: Closing resource %j (%j)', process.pid, this._name, this._id);
		if (!this.isOpen) {
			return Promise.resolve();
		} else {
			return this.close();
		}
	}
	
	get isOpen () { return this._open; }
	get isAssigned () { return !!this.job; }
	
	assign (job) {
		log.d('[%d]: Resource %j (%j) is assigned to %j', process.pid, this._name, this._id, job._idIpc);
		job.resource = this;
		this.job = job;
	}
	
	unassign (job) {
		log.d('[%d]: Resource %j (%j) is unassigned from %j', process.pid, this._name, this._id, this.job ? this.job._idIpc : 'nothing');
		if (this.job._id === job._id) {
			this.job.resource = null;
			this.job = null;
		}
	}

	open () {
		throw new Error('Resource.open must be overridden to return a Promise which calls Resource.opened in case of success');
	}

	close () {
		throw new Error('Resource.open must be overridden to return a Promise which calls Resource.closed in case of success');
	}

	checkActive () {
		log.i('[%d]: Checking resource %j (%j)', process.pid, this._name, this._id);
	}

	start (channel, db, Constructor) {
		this.db = db;
		this.channel = channel;
		this.channel.on(CMD.RUN, (json) => {
			if (this.job) {
				log.e('[%d]: Resource is already running a job %j', process.pid, job._idIpc);
				throw new Error('Resource is already running a job');
			}

			var job = new Constructor(json);
		
			if (!(job instanceof JOB.IPCJob)) {
				throw new Error('Only IPCJob subclasses can be run on a resource');
			}

			this.assign(job);

			clearTimeout(this._closeTimeout);

			log.i('[%d]: Running job %j (%j) in resource %j', process.pid, job.name, job._idIpc, this._id);
		
			this.checkOpen().then(() => {
				log.d('[%d]: Resource is open for %j', process.pid, job._idIpc);
				job._run(this.db, this).then(this.done.bind(this, job, null), this.done.bind(this, job));
			}, this.done.bind(this, job));
		});

		this.channel.on(CMD.CLOSED, () => {
			this.close();
		});

		process.on('uncaughtException', (err) => {
			log.e('[%d]: Crash in resource %s (%s):', process.pid, this._name, this._id, err, err.stack);
			this.job._sendSave();
			this.channel.send(CMD.CRASH, `uncaughtException: ${err}`);
			setTimeout(this.close.bind(this), 1200);
		});

		this.channel.send(CMD.ONLINE);
		log.d('Resource is online');
	}

	done (job, error) {
		if (error === JOB.ERROR.TIMEOUT) {
			log.w('[%d]: Timeout for job %s (%s) in resource %j', process.pid, job.name, job._idIpc, this._id);
			this.job._sendSave();
			this.channel.send(CMD.TIMEOUT);
			setTimeout(this.close.bind(this), 1200);
		} else {
			log.i('[%d]: Done running job %j (%j) in resource %j', process.pid, job.name, job._idIpc, this._id);
			job._json.error = job._json.error || error;
			this.channel.send(CMD.DONE, job._json);
			this.unassign(job);
			if (this._closeTimeout) {
				clearTimeout(this._closeTimeout);
			}
			this._closeTimeout = setTimeout(() => {
				this.close();
			}, this._resourceAutoCloseMillis);
		}
	}
}

module.exports = {
	CMD: CMD,
	Resource: Resource,
	ResourceFaçade: ResourceFaçade
};
