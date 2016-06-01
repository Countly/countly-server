'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:check'),
	  ConnectionResource = require('../parts/resource.js'),
	  Streamer = require('../parts/streamer.js'),
	  Divider = require('../parts/divider.js'),
	  mess = require('../parts/message.js'),
	  pushly = require('../parts/pushly.js'),
	  Message = mess.Message,
	  Pushly = pushly.Message;


class CheckJob extends job.TransientJob {
	constructor(name, data) {
		super(name, data);

		// sub
		log.d('Constructing check job: %s, %j', name, data);
		log.d('JSON: %j', this);

		this.user = [{}];
		if (this.data.pushly) {
			this.message = new Pushly(this.data.pushly);
		}
	}

	resourceName () {
		return this.data.pushly.credentials.platform + '::' + this.data.pushly.credentials.key;
	}

	createResource (_id, name) {
		return new ConnectionResource(_id, name, this.data.pushly.credentials);
	}

	divide (db) {

		log.d('[%d]: Dividing %s: %j', process.pid, this._id, this._json.data);
		return new Promise((resolve, reject) => {
			let message = new Message(this._json.data);
				message.devices = this.user;
			new Divider(message).divide(db, true).then(function(subs){
				log.d('[%d]: Finished didivding message %j for job %j: %j', process.pid, message._id, job._id, subs);
				resolve(subs);
			}, reject);
		});
	}

	_subSaved (sub) {
		log.d('In _subSaved', sub);
		return Promise.resolve();
	}

	run (db, done, progress) {
		try{
		log.d('[%d] going to run job %j: %j', process.pid, this._idIpc, this.data, typeof this.data.mid, this.data.mid);

		this.datas = [];
		this.locales = [];

		var content = this.message.compile(this.message.credentials.platform, this.user);

		if (content.default) {
			this.locales = Object.keys(content);
			this.locales.forEach((l, i) => {
				this.datas[i] = content[l];
			});
		} else {
			this.datas = [content];
		}

		log.d('[%d]: locales %j for datas %j', process.pid, this.locales, this.datas);

		let status = {
			fed: 0,
		};

		db.collection('apps').findOne({_id: db.ObjectID.createFromHexString(this.data.appId)}, (err, app) => {
			if (err) { done(err); }
			else { 
				log.d('Found app %j', app);
				this.app = app;
				this.streamer = new Streamer(this.message, app);

				log.d('[%d]: Ready to stream', process.pid);
				this.resource.send(this.datas, () => {
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

					progress(status.sent, status.done, statuses.pop()[0]);

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
			}
		});
	}catch (e) { log.e('Error', e, e.stack); }
	}

	mapUser(user) {
		var id = user._id,
			token = user[this.fieldIndex],
			locale = user.la,
			idx = locale ? this.locales.indexOf(locale) : -1;

		if (idx === -1) { idx = this.locales.indexOf('default'); }
		if (idx === -1) { idx = 0; }

		return [id, token, idx];
	}
}

module.exports = CheckJob;