'use strict';

const logger = require('../../utils/log.js'),
	  log = logger('jobs:handle'),
	  ipc = require('./ipc.js'),
	  job = require('./job.js'),
	  scan = require('./scanner.js'),
	  manager = require('../../../plugins/pluginManager.js');

const TRANSIENT_JOB_TIMEOUT = 15000;

class Handle {
	constructor() {
		log.i('Starting job handle in %d', process.pid);
		this.db = manager.singleDefaultConnection();
		this.classes = {};		// {'job name': Constructor}
		this.files = {};		// {'ping': '/usr/local/countly/api/jobs/ping.js'}
		scan(this.db, this.files, this.classes);

	}

	job (name, data) {
		let Constructor = this.classes[name];
		if (Constructor) {
			return new Constructor(name, data);
		} else { 
			throw new Error('Couldn\'t find job file named ' + name);
		}
	}

	runTransient(name, data) {
		data._id = data.id = '' + this.db.ObjectID();

		let Constructor = this.classes[name];
		if (Constructor) {
			return new Promise((resolve, reject) => {

				let timeout = setTimeout(() => {
					if (channel !== null) {
						channel.remove();
						channel = null;
						reject('Timeout');
					}
				}, TRANSIENT_JOB_TIMEOUT),

				j = new Constructor(name, data),

				channel = new ipc.IdChannel(job.EVT.TRANSIENT_CHANNEL).attach(process).on(job.EVT.TRANSIENT_DONE, (json) => {
					log.d('[%d]: Got transient job response %j', process.pid, j._json);
					if (json._id === data._id) {
						if (channel == null) { 
							return;
						} else {
							channel.remove();
							channel = null;
							if (json.error) { 
								reject(json);
							} else {
								resolve(json);
							}
						}
					}
				});

				j._json._id = data._id;

				log.d('[%d]: Sending transient job %j', process.pid, j._json);
				channel.send(job.EVT.TRANSIENT_RUN, j._json);
			});

		} else { 
			throw new Error('Couldn\'t find job file named ' + name);
		}
	}

	get ipc () {
		return ipc;
	}

}

if (!Handle.instance) {
	Handle.instance = new Handle();
}

module.exports = Handle.instance;