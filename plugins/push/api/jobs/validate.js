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
					status = {fed: 0};

				this.resource.send(content, () => {
					if (status.fed) {
						this.resource.feed([]);
					} else {
						status.fed += this.resource.feed([[new db.ObjectID() + '', 'test_token_which_we_don\'t_care_about', 0]]);
					}
				}, (statuses) => {
					var error = statuses.filter(s => s[1] < 0).length;
					var unset = statuses.filter(s => s[1] === 0).map(s => s[0]);
					var sent = statuses.length - error - unset.length;

					log.d('Got %d statuses: %d sent, %d unset, %d error', statuses.length, sent, unset.length, error);

					status.done += statuses.length;
					status.sent += sent;

				}).then(() => {
					log.d('[%d]: Send promise returned success in %s', process.pid, this._idIpc);
					if (!this.completed) {
						done();
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