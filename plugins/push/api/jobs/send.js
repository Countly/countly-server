'use strict';

const job = require('../../../../api/parts/jobs/job.js'),
	  log = require('../../../../api/utils/log.js')('job:push:send'),
	  retry = require('../../../../api/parts/jobs/retry.js'),
	  STATUS = job.STATUS,
	  ConnectionResource = require('../parts/resource.js'),
	  creds = require('../parts/credentials.js'),
	  Streamer = require('../parts/streamer.js'),
	  Divider = require('../parts/divider.js'),
	  N = require('../parts/note.js');


class PushJob extends job.IPCJob {
	constructor(name, data) {
		super(name, data);
		log.d('initializing PushJob with %j & %j', name, data);
	}

	prepare (manager, db) {
		if (this.data.appsub) {
			log.d('[%d]: Preparing subjob %j (data %j, content %j)', process.pid, this._idIpc, this.data);
			this.anote = new N.AppSubNote(this.data.appsub);
			this.aoid = db.ObjectID(this.anote._id);
			log.d('[%d]: Preparing subjob creds %j', process.pid, this._idIpc, this.anote.creds);
			this.anote.creds = new creds.AppSubCredentials(this.anote.creds);
			this.fieldToken = creds.DB_USER_MAP.tokens + '.' + this.anote.creds.field;
			this.fieldIndex = creds.DB_USER_MAP.tokens + this.anote.creds.field;
			log.d('[%d]: Loading subjob creds %j', process.pid, this._idIpc, this.anote.creds);
			return this.anote.creds.load(db);
		} else {
			log.d('[%d]: Preparing parent job %j (data %j)', process.pid, this._idIpc, this.data);
			return N.Note.load(db, db.ObjectID(this.data.mid)).then((note) => {
				this.note = note;
			});
		}
	}

	resourceName () {
		return 'send:' + this.anote.creds.id;
	}

	createResource (_id, name) {
		return new ConnectionResource(_id, name, this.anote.creds);
	}

	retryPolicy () {
		return new retry.IPCRetryPolicy(3);
	}

	divide (db) {
		if (this.failed) {
			return Promise.reject(this.failed);
		}
		
		log.d('[%s:%d]: Dividing in %s (%j)', this.note.id, process.pid, this._id, this.note);
		return new Divider(this.note).divide(db, true).then((obj) => {
			log.d('[%s: %d]: Finished didivding message for job %j: %d in %d', this.note.id, process.pid, this._id, obj.subs.length, obj.workers);
			return obj;
		});
	}

	_subSaved () {
		log.d('[%s:%d]: In _subSaved', this.note ? this.note.id : this.anote.id, process.pid);
		return super._subSaved().then((set) => {
			log.d('[%s:%d]: super._subSaved %j for %s', this.note ? this.note.id : this.anote.id, process.pid, set, this.data.mid);
			this.db().collection('messages').findOne(this.data.mid, (/*err, message*/) => {
				let quer = {_id: this.data.mid},
					upda = {$set: {'result.status': this._json.status === STATUS.DONE ? N.Status.Done : N.Status.InProcessing, sent: new Date()}};

				if (this.isCompleted && this._json.error) {
					upda.$set['result.error'] = this._json.error;
					upda.$set['result.status'] = N.Status.Error;
				}

				this.db().collection('messages').updateOne(quer, upda, (err, res) => {
					if (err) {
						log.e('[%s:%d]: Couldn\'t update message %j', this.note ? this.note.id : this.anote.id, process.pid, err);
					} else if (res.result.nModified === 0) {
						log.w('[%s:%d]: Couldn\'t update message %j: %j', this.note ? this.note.id : this.anote.id, process.pid, this.data.mid, quer);
					}
				});
			});
		});
	}

	run (db, done, progress) {
		log.d('[%s:%d] going to run subjob %j: %j', this.anote.id, process.pid, this._idIpc, this._json);
		if (this.idx === 0) {
			log.d('[%s:%d] marking message as started from %j', this.anote.id, process.pid, this._idIpc);

			let query = {_id: this.anote._id, 'deleted': {$exists: false}},
				update = {$set: {'result.status': N.Status.InProcessing, 'result.delivered': 0}};

			if (this.failed) {
				update.$set['result.status'] = N.Status.Error;
				update.$set['result.error'] = this.failed;
				log.d('[%s:%d] Won\'t run %s because it has been failed in constructor: %j', this.anote.id, process.pid, this._idIpc, this.failed);
			}

			db.collection('messages').findAndModify(query, [['date', 1]], update, {'new': true}, (err, data) => {
				if (err || this.failed) {
					done(err || this.failed);
					this.abort();
				} else if (!data || !data.ok) {
					done('already running');
				} else {
					log.d('[%s:%d] message marked as started from %j', this.anote.id, process.pid, this._idIpc);
				}
			});
		}
		
		log.d('[%s:%d] Processing message %j', this.anote.id, process.pid, this.note);

		this.datas = [];
		this.locales = Object.keys(this.anote.content);
		this.locales.forEach((l, i) => {
			this.datas[i] = this.anote.content[l];
		});
		log.d('[%s:%d]: locales %j for datas %j', this.anote.id, process.pid, this.locales, this.datas);

		var status = {
			size: this.size,
			done: this.done,
			bookmark: this.bookmark
		};

		this.streamer = new Streamer(this.anote);

		log.d('[%s:%d]: Ready to stream with bookmark %s, first %s', this.anote.id, process.pid, status.bookmark, this.data.first);
		if (status.bookmark) {
			this._json.data.first = status.bookmark;
		}

		this.resource.send(this.datas, (count) => {
			this.streamer.load(db, this.data.first, this.data.last, Math.max(count, 10)).then((users) => {
				log.d('users %j', users);
				// bookmark is not first of next batch, but rather last status from previous
				// so it must be removed from array
				if (users.length && users[0]._id === status.bookmark) {
					users.shift();
				}
				var fed, lst;
				if (!users || users.length === 0) {
					log.d('[%s:%d]: Nothing to feed anymore', this.anote.id, process.pid);
					this.resource.feed([]);
				} else if (users.length === 1) {
					log.d('[%s:%d]: Feeding last user', this.anote.id, process.pid);
					fed = this.resource.feed(users.map(this.mapUser.bind(this)));

					status.size += fed;

					if (fed === 1) {
						log.d('[%s:%d]: Fed last user', this.anote.id, process.pid);
						this._json.data.first += ' final ';
					} else {
						log.w('[%s:%d]: Cannot feed last user', this.anote.id, process.pid);
					}
				} else {
					lst = users.pop();
					log.d('[%s:%d]: Going to feed %d users while %d is requested: %j / %j', this.anote.id, process.pid, users.length, count, users, lst);
					fed = this.resource.feed(users.map(this.mapUser.bind(this)));
				
					status.size += fed;

					log.d('[%s:%d]: Fed %j users out of %d', this.anote.id, process.pid, fed, users.length);
					if (fed === users.length) {
						log.d('[%s:%d]: Fed all %d users, next batch will start with %s', this.anote.id, process.pid, fed, lst._id);
						this._json.data.first = lst._id;
					} else if (fed < users.length && fed > 0) {
						log.d('[%s:%d]: Fed only %d users, next batch will start with %s', this.anote.id, process.pid, fed, users[fed]._id);
						this._json.data.first = users[fed]._id;
					}
				}
			}, (err) => {
				done(err || 'Error while loading users');
			});
		}, (statuses) => {
			var sent = statuses.filter(s => s[1] === 200  || (s[1] === -200 && s[3])).map(s => s[0]);
			var reset = statuses.filter(s => s[1] === -200 && s[3]);
			var unset = statuses.filter(s => s[1] === -200 && !s[3]).map(s => s[0]);
			var errors = statuses.filter(s => !!s[2]);

			log.d('[%s:%d]: Got %d statuses: %d sent, %d unset, %d reset, %d errors', this.anote.id, process.pid, statuses.length, sent.length, unset.length, reset.length, errors.length);
			log.d('[%s:%d]: statuses %j', this.anote.id, process.pid, statuses);

			status.done += statuses.length;
			this.streamer.unload(db, statuses.map(s => s[0])).then(() => {}, log.e);

			if (unset.length) {
				let q = {_id: {$in: unset}},
					$unset = {
						[this.fieldToken]: 1,
						[this.fieldIndex]: 1,
					};

				log.d('[%s:%d]: Unsetting %d tokens in %j: %j / %j', this.anote.id, process.pid, unset.length, 'app_users' + this.anote.creds.app_id, q, $unset);
				db.collection('app_users' + this.anote.creds.app_id).update(q, {$unset: $unset}, {multi: true}, log.logdb('unsetting tokens'));
			}

			if (reset.length) {
				reset.forEach(status => {
					db.collection('app_users' + this.anote.creds.app_id).updateOne({_id: status[0]}, {$set: {[this.fieldToken]: status[3]}}, log.logdb('updating push token'));
				});
			}

			if (statuses.length) {
				db.collection('messages').update({_id: this.aoid}, {$inc: {'result.sent': sent.length, 'result.processed': statuses.length, 'result.errors': errors.length}}, log.logdb('updating message with sent'));
			}

			if (sent.length) {
				db.collection('app_users' + this.anote.creds.app_id).update({_id: {$in: sent}}, {$push: {msgs: this.aoid}}, {multi: true}, log.logdb('adding message to app_users'));

				var params = {
					qstring: {
						events: [
							{ key: '[CLY]_push_sent', count: sent.length, segmentation: {i: this.anote._id } }
						]
					},
					app_id: this.anote.creds.app_id,
					appTimezone: this.anote.creds.app_timezone.tz,
					time: require('../../../../api/utils/common.js').initTimeObj(this.anote.creds.app_timezone.tz)
				};

				require('../../../../api/parts/data/events.js').processEvents(params);
			}

			if (errors.length) {
				let errorsInc = {};
				errors.forEach(status => {
					let key = 'result.errorCodes.' + this.anote.creds.platform + Math.abs(status[1]) + (status[2] ? '+' + status[2] : '');
					if (errorsInc[key]) {
						errorsInc[key]++;
					} else {
						errorsInc[key] = 1;
					}
				});
				log.d('[%s:%d]: setting error codes for %s: %j', this.anote.id, process.pid, this.anote._id, {$inc: errorsInc});
				db.collection('messages').update({_id: this.aoid}, {$inc: errorsInc}, log.logdb('updating message with error codes'));
			}

			var max = statuses.shift()[0];
			statuses.forEach(s => {
				if (s[0] > max) { max = s[0]; }
			});

			progress(status.size, status.done, max);

		}).then(() => {
			log.d('[%d]: Send promise returned success in %s', process.pid, this._idIpc);
			if (!this.completed) {
				done();
				this.streamer.clear(db);
			}
		}, (err) => {
			log.d('[%d]: Send promise returned error %j in %s', process.pid, err, this._idIpc);
			if (!this.completed) {
				this._json.data.bookmark = this.json.data.first;
				done(err || 'Unknown APN error');
				this.streamer.clear(db);
			}
		});
	}

	cancel (db) {
		return new Promise((resolve, reject) => {
			super.cancel().then(() => {
				let mid = this.note ? this.note._id : this.anote ? this.anote._id : this.data.mid;

				if (mid) {
					mid = typeof mid === 'string' ? db.ObjectID(mid) : mid;
	
					let query = {_id: mid},
						update = {$set: {'result.status': N.Status.Aborted, 'result.error': 'Cancelled'}};

					db.collection('messages').update(query, update, log.logdb('cancelling message', resolve, reject));
				}
			});
		});
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

module.exports = PushJob;
