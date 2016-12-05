'use strict';

const cp = require('child_process'),
	  EventEmitter = require('events'),
	  ipc = require('./ipc.js'),
	  JOB = require('./job.js'),
	  log = require('../../utils/log.js')('jobs:resource');

const CMD = {
	RUN: 'resource:run',
	ABORT: 'resource:abort',
	DONE: 'resource:done',
	OPENED: 'resource:opened',
	CLOSED: 'resource:closed',
	CRASH: 'resource:crash',
	TIMEOUT: 'resource:timeout',
	ONLINE: 'resource:online'
},
EVT = {
	ONLINE: 'online',
	OPENED: 'opened',
	CLOSED: 'closed',
	ABORT: 'abort',
	EXIT: 'exit',
	TIMEOUT: 'timeout',
	CRASH: 'crash',
},
RESOURCE_PING_INTERVAL = 10000,
RESOURCE_CLOSE_TIMEOUT = 360000,
RESOURCE_CMD_TIMEOUT = 15 * 60000;

function random() { 
	var s = Math.random().toString(36).slice(2); 
	return s; 
	// return s.length === 16 ? s : random(); 
}

/**
 * Base class for both: Resource & ResourceFaçade which implements interface for talking to Job / JobFaçade & Manager.
 */
class ResourceInterface extends EventEmitter {
	constructor(id, name) {
		super();
		this._online = false;
		this._open = null;
		this._job = null;
		this._id = id;
		this._name = name;
	}

	get isBusy() { return !!this._job; }
	get isOpen() { return !!this._open; }
	get id() { return this._id; }
	get name() { return this._name; }
	get job() { return this._job; }
	set job(job) { this._job = job; }

	run (/*job*/) {
		throw new Error('Resource.run must be overridden to return promise');
	}

	abort (/*job*/) {
		throw new Error('Resource.run must be overridden to return promise');
	}

	onceOnline () {
		if (this._online) {
			return Promise.resolve();
		} else {
			return new Promise((resolve) => {
				setTimeout(resolve.bind(null, false), 30000);
				this.once(EVT.ONLINE, () => {
					this._online = true;
					resolve(true);
				});
			});
		}
	}

	onceOpened () {
		if (this._open) {
			return Promise.resolve();
		} else if (!this._online) {
			return new Promise((resolve, reject) => {
				return this.onceOnline().then(() => {
					this.onceOpened().then(resolve, reject);
				}, reject);
			});
		} else {
			this.once(EVT.OPENED, () => {
				this._open = true;
			});
			return this.open();
		}
	}

	onceClosed () {
		if (!this._open) {
			return Promise.resolve();
		} else {
			this.once(EVT.CLOSED, () => {
				this._open = false;
			});
			return this.close();
		}
	}
}

/**
 * ResourceFaçade is a thin IPC façade for actual resource running in a separate process.
 * Constructor requires actual job instance just to instantiate a resource from its createResource call, separate run call is required to start it.
 */
class ResourceFaçade extends ResourceInterface {
	constructor(job, file) {
		super('res:' + job.resourceName() + ':' + random(), 'res:' + job.resourceName());
		this._file = file;
		this._worker = cp.fork(__dirname + '/executor.js', [JSON.stringify({
			_id: this.id, 
			name: this.name, 
			file: this._file,
			job: job._json
		})]);
		log.i('[façade]: Started resource %j in %d for %j: %j', this.name, process.pid, this._worker.pid, this.id);

		this.channel = new ipc.IdChannel(this.id);
		this.channel.attach(this._worker);
		
		this.channel.on(CMD.DONE, (json) => {
			if (json.error) {
				log.i('[façade]: Done running %s with error %j %j (%j) in %d', json._id, json.error, this.name, this.id, this._worker.pid);
				this.reject(json.error);
			} else {
				log.i('[façade]: Done running %s with success %j (%j) in %d', json._id, this.name, this.id, this._worker.pid);
				this.resolve(json);
			}
		});
		
		this.channel.on(CMD.ABORT, () => {
			this.reject(EVT.ABORT);
		});
		
		this.channel.on(CMD.OPENED, () => {
			log.i('[façade]: Resource %j opened in %d: %j', this.name, this._worker.pid, this.id);
			this._open = true;
			this.emit(EVT.OPENED);
		});
		
		this.channel.on(CMD.CLOSED, (err) => {
			log.i('[façade]: Resource %j closed in %d: %j', this.name, this._worker.pid, this.id, err);
			this._open = false;
			if (!this._crashed) {
				if (this._job) {
					log.i('[façade]: Resource %j closed in %d (%j) while running %s, will reject', this.name, this._worker.pid, this.id, this._job._idIpc, err);
					this.reject(err || EVT.CLOSED);
				}
				this.emit(EVT.CLOSED, err);
			}
		});

		this.channel.on('exit', () => {
			log.i('[façade]: Resource %j exited in %d: %j', this.name, this._worker.pid, this.id);
			if (!this._crashed) {
				if (this._job) {
					log.i('[façade]: Resource %j exited in %d (%j) while running %s, will reject', this.name, this._worker.pid, this.id, this._job._idIpc);
					this.reject('Process exited');
				}
				if (this._open) {
					this._open = false;
					this.emit(EVT.CLOSED);
				}
				this.emit(EVT.EXIT);
			}
		});

		this.channel.on(CMD.CRASH, (err) => {
			if (!this._crashed) {
				log.e('[façade]: Resource %s (%s) crashed in %d: %j', this.name, this.id, this._worker.pid, err);
				if (this.job) {
					this.reject([JOB.ERROR.CRASH, err]);
				} else {
					this.emit(EVT.CRASH);
				}
				this.close();
			}
		});

		this.channel.on(CMD.TIMEOUT, (err) => {
			if (!this._crashed) {
				log.e('[façade]: Resource %s (%s) timed out in %d: %j', this.name, this.id, this._worker.pid, err);
				if (this.job) {
					this.reject([JOB.ERROR.TIMEOUT, err]);
				} else {
					this.emit(EVT.TIMEOUT);
				}
				this.close();
			}
		});

		this.channel.on(CMD.ONLINE, () => {
			log.d('ResourceFaçade %s is online', this.id);
			this.emit(EVT.ONLINE);
		});
	}

	get isBusy() { return !!this._job; }
	get isReady() { return this.open === true || this.open === null; }

	run (job) {
		if (this.isBusy) { 
			log.w('[façade]: Resource façade %j is busy in %d: %j', this.name, this._worker.pid, this.id);
			return Promise.reject('busy'); 
		}
		this.job = job;
		log.i('[façade]: Resource façade %j in %d (%j) is going to run %s', this.name, this._worker.pid, this.id, job._idIpc);
		return new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;

			this.onceOpened().then(this.channel.send.bind(this.channel, CMD.RUN, job._json), (e) => {
				log.e('Error in job resource façade .run() promise ', e, e.stack);
				this.close();
				reject(e);
			});
		});
	}

	close () {
		if (this.isOpen) {
			log.w('Closing underlying resource %s from façade', this.id);
			return new Promise((resolve, reject) => {
				setTimeout(reject.bind(null, JOB.ERROR.TIMEOUT), RESOURCE_CMD_TIMEOUT);
				this.channel.once(CMD.CLOSED, () => {
					this.channel.remove();
					resolve();
				});
				this.channel.send(CMD.CLOSED);
			});
 		} else {
 			return Promise.resolve();
 		}
	}

	open () {
		if (this.isOpen) {
			return Promise.resolve();
		} else {
			log.w('Opening underlying resource %s from façade', this.id);
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					reject(JOB.ERROR.TIMEOUT);
					this.close();
				}, RESOURCE_CMD_TIMEOUT);
				this.channel.once(CMD.OPENED, resolve);
				this.channel.once(CMD.CLOSED, reject);
				this.channel.send(CMD.OPENED);
			});
		}
	}

	abort (job) {
		if (!this.job) {
			log.w('[façade]: Resource façade %j is not open in %d: %j', this.name, this._worker.pid, this.id);
			return Promise.reject('no job is running to abort'); 
		}

		if (this.job._id !== job._id) {
			log.w('[façade]: Resource façade %j is not open in %d: %j', this.name, this._worker.pid, this.id);
			return Promise.reject('busy with job other than requested to abort'); 
		}

		this.channel.send(CMD.ABORT, job._json);
	}

	resolve () {
		if (this._resolve) {
			log.w('[façade]: Resolving %s', this.job._idIpc);
			this._resolve.apply(this, arguments);
			this.job.releaseResource(this).then(() => {
				log.i('[façade]: Released resource for %s', this.job._idIpc);
				this.job = null;
			}, err => {
				log.e('[façade]: Resource release returned error for %s: %j', this.job._idIpc, err);
				this.job = null;
			});
			this._resolve = this._reject = this.job.resource = null;
		} else {
			log.w('ResourceFaçade %s already returned, nothing to resolve', this.id);
		}
	}

	reject (error) {
		if (this._reject) {
			log.w('[façade]: Rejecting %s', this.job._idIpc);
			this._reject.apply(this, arguments);
			this.job.releaseResource(this).then(() => {
				log.i('[façade]: Released resource for %s', this.job._idIpc);
				this.job = null;
			}, err => {
				log.e('[façade]: Resource release returned error for %s: %j', this.job._idIpc, err);
				this.job = null;
			});
			this._resolve = this._reject = this.job.resource = null;
		} else {
			log.w('ResourceFaçade %s already returned, nothing to reject with %j', this.id, error);
		}
	}
}

class ResourcePool extends EventEmitter {
	constructor(construct, maxResources) {
		super();
		this.construct = construct;
		this.maxResources = maxResources;
		this.pool = [];
	}

	canRun () {
		for (let i = 0; i < this.pool.length; i++) {
			if (!this.pool[i].isBusy) {
				return true;
			}
		}
		return this.pool.length < this.maxResources;
	}

	getResource () {
		for (let i = 0; i < this.pool.length; i++) {
			if (!this.pool[i].isBusy) {
				return this.pool[i];
			}
		}

		if (this.pool.length < this.maxResources) {
			let resource = this.construct();
			resource.on(EVT.CLOSED, () => {
				let idx = this.pool.indexOf(resource);
				if (idx !== -1) { 
					log.d('[jobs]: Resource %j is closed, removing from pool', resource._id);
					this.pool.splice(idx, 1); 
					if (this.pool.length === 0) {
						this.emit(EVT.CLOSED);
					}
				}
			});
			this.pool.push(resource);
			return resource;
		}

		throw new Error('ResourcePool should be checked with canRun() before calling getResource()');
	}

	close () {
		return Promise.all(this.pool.map(r => r.close())).catch((error) => {
			log.w('Error while closing pooled resources', error);
		});
	}
}

/**
 * Main class for custom resources to override.
 */
class Resource extends ResourceInterface {
	constructor(_id, name, checkInterval, autoCloseTimeout) {
		super(_id, name);
		this._resourceCheckMillis = checkInterval || RESOURCE_PING_INTERVAL;
		this._resourceAutoCloseMillis = autoCloseTimeout || RESOURCE_CLOSE_TIMEOUT;
	}

	opened () {
		this._open = true;
		log.i('[%d]: Opened resource %j (%j)', process.pid, this.name, this.id);
		this.emit(EVT.OPENED);
		this.channel.send(CMD.OPENED);
		this._checkInterval = setInterval(() => {
			log.i('[%d]: Checking resource %j (%j)', process.pid, this.name, this.id);
			this.checkActive().then((active) => {
				log.i('[%d]: Resource %j (%j) is ' + (active ? 'active' : 'inactive'), process.pid, this.name, this.id);
				if (!active) {
					this._open = false;
					this.close();
				}
			}, (error) => {
				log.e('[%d]: Couldn\'t check resource %j (%j): %j', process.pid, this.name, this.id, error);
				this.close();
			});
		}, this._resourceCheckMillis);
	}

	closed () {
		this._open = false;
		clearInterval(this._checkInterval);
		clearTimeout(this._closeTimeout);
		this.emit(EVT.CLOSED);
		this.channel.send(CMD.CLOSED);
		this.channel.remove();
		log.i('[%d]: Closed resource %j (%j), exiting', process.pid, this.name, this.id);
	}
	
	open () {
		throw new Error('Resource.open must be overridden to return a Promise which calls Resource.opened in case of success');
	}

	close () {
		throw new Error('Resource.open must be overridden to return a Promise which calls Resource.closed in case of success');
	}

	checkActive () {
		log.i('[%d]: Checking resource %j (%j)', process.pid, this.name, this.id);
	}

	start (channel, db, Constructor) {
		this.db = db;
		this.channel = channel;
		this.channel.on(CMD.RUN, (json) => {
			if (this.job) {
				log.e('[%d]: Resource is already running a job %j', process.pid, this.job._idIpc);
				throw new Error('Resource is already running a job');
			}

			this.job = new Constructor(json);
			this.job.resource = this;
		
			if (!(this.job instanceof JOB.IPCJob)) {
				throw new Error('Only IPCJob subclasses can be run on a resource');
			}

			clearTimeout(this._closeTimeout);

			log.i('[%d]: Running job %j (%j) in resource %j', process.pid, this.job.name, this.job._idIpc, this.id);
		
			this.onceOpened().then(() => {
				log.d('[%d]: Resource is open for %j', process.pid, this.job._idIpc);
				this.job._run(this.db, this).then(this.done.bind(this, this.job, null), this.done.bind(this, this.job));
			}, this.done.bind(this, this.job));
		});

		this.channel.on(CMD.CLOSED, () => {
			this.close();
		});

		this.channel.on(CMD.OPENED, () => {
			log.d('[%d]: Opening %s by command of façade', process.pid, this.id);
			this.open().then(() => {}, (err) => {
				this.channel.send(CMD.CLOSED, err);
				this.close();
			});
		});

		process.on('uncaughtException', (err) => {
			log.e('[%d]: Crash in resource %s (%s):', process.pid, this.name, this.id, err, err.stack);
			this.job._sendSave();
			this.channel.send(CMD.CRASH, `uncaughtException: ${err}`);
			setTimeout(this.close.bind(this), 1200);
		});

		this.channel.send(CMD.ONLINE);
		log.d('Resource is online');
	}

	done (job, error) {
		if (error === JOB.ERROR.TIMEOUT) {
			log.w('[%d]: Timeout for job %s (%s) in resource %s', process.pid, job.name, job._idIpc, this.id);
			this.job._sendSave();
			this.channel.send(CMD.TIMEOUT);
			setTimeout(this.close.bind(this), 1200);
		} else {
			log.i('[%d]: Done running job %j (%j) in resource %s', process.pid, job.name, job._idIpc, this.id);
			job._json.error = job._json.error || error;
			this.job.resource = this.job = null;
			this.channel.send(CMD.DONE, job._json);
			if (this._closeTimeout) {
				clearTimeout(this._closeTimeout);
			}
			this._closeTimeout = setTimeout(() => {
				log.i('[%d]: Auto-closing resource %s after %dms', process.pid, this.id, this._resourceAutoCloseMillis);
				this.close();
			}, this._resourceAutoCloseMillis);
		}
	}
}

module.exports = {
	CMD: CMD,
	EVT: EVT,
	Resource: Resource,
	ResourceFaçade: ResourceFaçade,
	ResourcePool: ResourcePool
};
