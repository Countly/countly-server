'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:validate'),
	  creds = require('../parts/credentials.js'),
	  ConnectionResource = require('../parts/resource.js'),
	  retry = require('../../../../api/parts/jobs/retry.js');


class ValidateJob extends job.TransientJob {
	constructor(name, data) {
		super(name, data);
	}

	prepare (manager, db) {
		log.d('[%d]: Preparing job %j (data %j)', process.pid, this._idIpc, this.data);
		this.credentials = new creds.Credentials(db.ObjectID(this.data.cid));
		return this.credentials.load(db).then(() => {
			if (this.data.field) {
				this.credentials = this.credentials.sub(this.data.field, this.data.test);
			}
		});
	}

	resourceName () {
		return 'validate:' + this.data.platform + ':' + this.data.cid + (typeof this.data.test === 'undefined' ? '' : ':' + (this.data.test ? 'test' : 'prod'));
	}

	createResource (_id, name) {
		return new ConnectionResource(_id, name, this.credentials);
	}

	releaseResource (resource) {
		return resource.close();
	}

	retryPolicy () {
		return new retry.NoRetryPolicy();
	}

	divide () {
		log.d('[%d]: Dividing %s: %j', process.pid, this._id, this._json.data);
		return new Promise(resolve => {
			resolve({subs: this.credentials.divide(false).map(sc => {
				log.d('[%d]: Sub %j', process.pid, {name: this.name, data: {cid: this.data.cid, platform: this.data.platform, field: sc.field, test: sc.test}});
				return {name: this.name, data: {cid: this.data.cid, platform: this.data.platform, field: sc.field, test: sc.test}};
			}), workers: 1});
		});
	}

	_subSaved (sub) {
		log.d('In _subSaved', sub);
		return Promise.resolve();
	}

	run (db, done) {
		try {
			log.d('[%d] going to run job %j: %j', process.pid, this._idIpc, this.data, typeof this.data.cid, this.data.cid);

			try {
				var content = [{test: true}], 
					status = {fed: 0, code: 0, error: ''};

				this.resource.send(content, () => {
					if (status.fed) {
						this.resource.feed([]);
					} else {
						status.fed += this.resource.feed([[new db.ObjectID() + '', 'c980bd69ea8c2e9e301ef0396c247290c2b8b5306b8686018c75d7dd2e7aa2de', 0]]);
					}
				}, (statuses) => {
					var sent = statuses.filter(s => s[1] === 200  || (s[1] === -200 && s[3])).map(s => s[0]);
					var reset = statuses.filter(s => s[1] === -200 && s[3]);
					var unset = statuses.filter(s => s[1] === -200 && !s[3]).map(s => s[0]);
					var errors = statuses.filter(s => !!s[2]);

					log.d('Got %d statuses: %d sent, %d unset, %d reset, %d errors', statuses.length, sent.length, unset.length, reset.length, errors.length);
					log.d('statuses %j', statuses);

					status.done += statuses.length;
					status.sent += sent;

					log.d('errors %j', errors);
					if (errors.length === 1) {
						status.code = errors[0][1];
						status.error = errors[0][2];
						try {
							status.error = JSON.parse(status.error);
							status.error = status.error.reason || status.error;
						} catch (e) {
							log.d(e);
						}
					}

				}).then(() => {
					log.d('[%d]: Send promise returned success in %s with status %j', process.pid, this._idIpc, status);
					if (!this.completed) {
						if (status.code === 400 && status.error === 'BadDeviceToken') {
							done();
						} else if (status.code >= 400 && status.code < 500) {
							done(status.error ? this.credentials.platform + status.code + '+' + status.error : 'Error code ' + status.code);
						} else {
							done();
						}
					}
				}, (err) => {
					log.d('[%d]: Send promise returned error %j in %s', process.pid, err, this._idIpc);
					if (!this.completed) {
						done(err || 'Unknown APN error');
					}
				});
			} catch (e) { 
				log.e('Error', e, e.stack); 
				done(e);
			}

		} catch (e) { 
			log.e('Error', e, e.stack); 
			done(e);
		}
	}

	timeout () {
		return 30000; // 60 seconds
	}
}

module.exports = ValidateJob;